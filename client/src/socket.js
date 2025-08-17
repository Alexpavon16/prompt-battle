import { io } from 'socket.io-client';

// Determine the Socket.IO server URL. When running locally the
// backend is typically served on port 3000. In a deployed environment
// you may need to update this to match your server configuration.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

// Establish a persistent connection. Automatic reconnection is
// enabled by default. See Socket.IO docs for additional options.
const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket']
});

export default socket;