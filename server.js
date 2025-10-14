require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
});
const { createServer } = require('http');
const next = require('next');
const socketIo = require('socket.io');
const { setIoInstance } = require(__dirname + '/src/lib/socketUtils');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory map to track active judges
const activeJudges = new Map();

// Global reference to io instance for API routes
let ioInstance = null;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = socketIo(server, {
    path: '/tabulation/ws',
    cors: { 
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true,
    transports: ['polling', 'websocket'],
    pingTimeout: 30000,      // Reduced from 60s to 30s for faster detection
    pingInterval: 10000,     // Reduced from 25s to 10s for more frequent checks
    upgradeTimeout: 30000,   // Timeout for transport upgrades
    maxHttpBufferSize: 1e6,  // Limit buffer size
    allowUpgrades: true,     // Allow transport upgrades
    cookie: false            // Don't use cookies for session persistence
  });

  // Store io instance globally for API routes
  ioInstance = io;

  // Set io instance in socket utils
  setIoInstance(io);
  console.log('Socket.IO instance set in socketUtils');

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id, 'Transport:', socket.conn.transport.name);
    
    // Expect judge to send their ID on connect
    socket.on('judge-online', (judgeId) => {
      console.log('Judge online:', judgeId, 'Socket:', socket.id);
      activeJudges.set(judgeId, socket.id);
      io.emit('judges-status', Array.from(activeJudges.keys()));
      console.log('Active judges:', Array.from(activeJudges.keys()));
    });

    // Allow judges to join event-specific rooms for real-time updates
    socket.on('join-event', (eventId) => {
      console.log('Judge joining event room:', eventId);
      socket.join(`event-${eventId}`);
      console.log('Current rooms for socket:', Array.from(socket.rooms));
    });

    // Handle heartbeat/ping from judge clients
    socket.on('judge-heartbeat', (judgeId) => {
      // Update last seen timestamp for the judge
      console.log(`Heartbeat received from judge ${judgeId}`);
      // Socket.io handles ping/pong automatically, but this gives us explicit confirmation
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.log('Socket connection error:', socket.id, error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, 'Reason:', reason);
      for (const [judgeId, id] of activeJudges.entries()) {
        if (id === socket.id) {
          console.log('Removing judge from active list:', judgeId);
          activeJudges.delete(judgeId);
          break;
        }
      }
      io.emit('judges-status', Array.from(activeJudges.keys()));
      console.log('Active judges after disconnect:', Array.from(activeJudges.keys()));
    });
  });

  // Periodic cleanup of stale connections (every 30 seconds)
  setInterval(() => {
    let cleanupCount = 0;
    const currentTime = Date.now();
    
    // Check each active judge's socket connection
    for (const [judgeId, socketId] of activeJudges.entries()) {
      const socket = io.sockets.sockets.get(socketId);
      
      // If socket doesn't exist or is disconnected, remove from active list
      if (!socket || !socket.connected) {
        console.log(`Cleanup: Removing disconnected judge ${judgeId} with socket ${socketId}`);
        activeJudges.delete(judgeId);
        cleanupCount++;
      }
    }
    
    // If we cleaned up any judges, emit updated status
    if (cleanupCount > 0) {
      console.log(`Cleanup: Removed ${cleanupCount} stale judge connections`);
      io.emit('judges-status', Array.from(activeJudges.keys()));
      console.log('Active judges after cleanup:', Array.from(activeJudges.keys()));
    }
  }, 30000); // Run every 30 seconds

  // Expose endpoint for admin to get active judges
  server.on('request', (req, res) => {
    if (req.url === '/api/active-judges' || req.url === '/tabulation/api/active-judges') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ activeJudges: Array.from(activeJudges.keys()) }));
    }

    // Handle phase change emissions from API routes
    if (req.url?.startsWith('/api/emit-phase-change/') || req.url?.startsWith('/tabulation/api/emit-phase-change/')) {
      const urlParts = req.url.split('/');
      // Adjust indices based on whether base path is present
      const isBasePath = req.url?.startsWith('/tabulation/');
      const eventId = urlParts[isBasePath ? 4 : 3];
      const currentPhase = urlParts[isBasePath ? 5 : 4];

      if (eventId && currentPhase) {
        console.log(`Emitting phase change from HTTP: eventId=${eventId}, phase=${currentPhase}`);
        const room = `event-${eventId}`;
        const socketsInRoom = io.sockets.adapter.rooms.get(room);
        console.log(`Sockets in room ${room}:`, socketsInRoom ? Array.from(socketsInRoom) : 'none');
        io.to(room).emit('phase-changed', { currentPhase });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid parameters' }));
      }
    }

    // Handle judge lock change emissions from API routes
    if (req.url?.startsWith('/api/emit-judge-lock-change/') || req.url?.startsWith('/tabulation/api/emit-judge-lock-change/')) {
      const urlParts = req.url.split('/');
      // Adjust indices based on whether base path is present
      const isBasePath = req.url?.startsWith('/tabulation/');
      const eventId = urlParts[isBasePath ? 4 : 3];
      const judgeId = urlParts[isBasePath ? 5 : 4];
      const phase = urlParts[isBasePath ? 6 : 5];
      const locked = urlParts[isBasePath ? 7 : 6] === 'true';

      if (eventId && judgeId && phase) {
        console.log(`Emitting judge lock change from HTTP: eventId=${eventId}, judgeId=${judgeId}, phase=${phase}, locked=${locked}`);
        io.to(`event-${eventId}`).emit('judge-lock-changed', { judgeId: parseInt(judgeId), phase, locked });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid parameters' }));
      }
    }

    // Handle judge logout from API routes
    if (req.url?.startsWith('/api/judge-logout/') || req.url?.startsWith('/tabulation/api/judge-logout/')) {
      if (req.method === 'POST') {
        const urlParts = req.url.split('/');
        // Adjust indices based on whether base path is present
        const isBasePath = req.url?.startsWith('/tabulation/');
        const judgeId = urlParts[isBasePath ? 4 : 3];

        if (judgeId) {
          console.log(`Force logout judge from HTTP: judgeId=${judgeId}`);
          
          // Find and disconnect the socket for this judge
          const socketId = activeJudges.get(parseInt(judgeId));
          if (socketId) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              console.log(`Disconnecting socket for judge ${judgeId}: ${socketId}`);
              socket.disconnect(true);
            }
            // Remove from active judges map
            activeJudges.delete(parseInt(judgeId));
            // Emit updated judges status
            io.emit('judges-status', Array.from(activeJudges.keys()));
            console.log('Active judges after forced logout:', Array.from(activeJudges.keys()));
          }
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } else {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid judge ID' }));
        }
      } else {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});

// Export io instance for API routes
module.exports.io = ioInstance;