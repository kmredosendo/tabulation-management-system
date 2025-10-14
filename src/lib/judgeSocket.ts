import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

let heartbeatInterval: NodeJS.Timeout | null = null;

export function connectJudgeSocket(judgeId: number | string) {
  if (!socket) {
    const isProduction = window.location.protocol === 'https:';
    socket = io({
      path: "/tabulation/ws",
      transports: ["polling"],  // Use polling only to avoid WebSocket 400 errors
      secure: isProduction,
      timeout: 15000,          // Reduced timeout for faster detection
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 10, // Increased attempts
      reconnectionDelay: 2000,  // Increased delay between attempts
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      upgrade: false           // Disable WebSocket upgrades entirely
    });
  }

  socket.on("connect", () => {
    console.log("Judge socket connected:", judgeId, "Transport:", socket?.io.engine.transport.name);
    socket?.emit("judge-online", judgeId);
    
    // Start heartbeat
    startHeartbeat(judgeId);
  });

  socket.on("connect_error", (error) => {
    console.error("Judge socket connection error:", error);
    stopHeartbeat();
  });

  socket.on("disconnect", (reason) => {
    console.log("Judge socket disconnected:", reason);
    stopHeartbeat();
    
    // If disconnect was unexpected (not client-initiated), socket.io will handle reconnection
    if (reason === "transport close" || reason === "transport error") {
      console.log("Network-related disconnect, will attempt to reconnect...");
    } else if (reason === "io client disconnect") {
      console.log("Client-initiated disconnect, no reconnection needed");
    }
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("Judge socket reconnected after", attemptNumber, "attempts");
    socket?.emit("judge-online", judgeId);
    startHeartbeat(judgeId);
  });

  socket.on("reconnect_error", (error) => {
    console.error("Judge socket reconnection error:", error);
  });

  socket.on("reconnect_failed", () => {
    console.error("Judge socket failed to reconnect after all attempts");
    stopHeartbeat();
  });

  return socket;
}

function startHeartbeat(judgeId: number | string) {
  stopHeartbeat(); // Clear any existing heartbeat
  
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit("judge-heartbeat", judgeId);
      console.log("Heartbeat sent for judge:", judgeId);
    }
  }, 30000); // Send heartbeat every 30 seconds
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function joinEventRoom(eventId: number | string) {
  if (socket) {
    console.log("Joining event room:", eventId);
    socket.emit("join-event", eventId);
  } else {
    console.error("Cannot join event room: socket not connected");
  }
}

export function disconnectJudgeSocket() {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}