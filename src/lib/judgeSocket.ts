import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectJudgeSocket(judgeId: number | string) {
  if (!socket) {
    const isProduction = window.location.protocol === 'https:';
    socket = io({
      path: "/tabulation/ws",
      transports: ["polling", "websocket"],
      secure: isProduction,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  socket.on("connect", () => {
    console.log("Judge socket connected:", judgeId, "Transport:", socket?.io.engine.transport.name);
    socket?.emit("judge-online", judgeId);
  });
  socket.on("connect_error", (error) => {
    console.error("Judge socket connection error:", error);
  });
  socket.on("disconnect", (reason) => {
    console.log("Judge socket disconnected:", reason);
  });
  socket.on("reconnect", (attemptNumber) => {
    console.log("Judge socket reconnected after", attemptNumber, "attempts");
    socket?.emit("judge-online", judgeId);
  });
  return socket;
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
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}