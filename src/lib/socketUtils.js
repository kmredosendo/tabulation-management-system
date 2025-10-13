// Socket utility for emitting events
let ioInstance = null;

function setIoInstance(io) {
  ioInstance = io;
  console.log('setIoInstance called with io:', !!io);
}

function emitPhaseChange(eventId, currentPhase) {
  console.log("Emitting phase change:", { eventId, currentPhase, ioInstance: !!ioInstance });
  if (ioInstance) {
    ioInstance.to(`event-${eventId}`).emit('phase-changed', { currentPhase });
    console.log("Phase change emitted to room:", `event-${eventId}`);
  } else {
    console.error("Cannot emit phase change: ioInstance not set");
  }
}

module.exports = { setIoInstance, emitPhaseChange };