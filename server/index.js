/*
 * Entry point for the Prompt Battle backend. This file initializes an
 * Express web server, configures Socket.IO for real‑time communication and
 * exposes the necessary events for creating rooms, joining rooms and
 * coordinating game play. Environment variables are loaded via dotenv.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file if present. These might
// include your OpenAI API key, session secret, port number, etc.
dotenv.config();

// Application level constants. See shared/constants.js for
// additional game state definitions. You could require() it here if needed.
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Import local modules responsible for room management, game logic and
// image generation. Keeping these in separate files helps organise the
// codebase and makes it easier to test individual parts in isolation.
const roomManager = require('./roomManager');
const gameLogic = require('./gameLogic');

// Basic endpoint to verify that the server is running. When deploying
// to Replit or any other hosting provider you can use this to check
// connectivity without having to establish a socket connection.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Prompt Battle server is running.' });
});

// Socket.IO connection handler. Each connected client will have a
// dedicated socket which we use to listen for events emitted from the
// client side. We also emit events back to the clients to update
// game state, broadcast messages, etc.
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // When a client creates a room they send configuration data such as
  // number of rounds, difficulty, categories and game mode. The server
  // responds with a unique room code and adds the creator to that room.
  socket.on('create-room', (config, callback) => {
    try {
      const roomCode = roomManager.createRoom(config, socket);
      // Provide the caller with the generated room code via callback.
      if (typeof callback === 'function') callback({ success: true, roomCode });
      // Broadcast current player list to this room (only host so far)
      const room = roomManager.getRoom(roomCode);
      if (room) {
        const players = Array.from(room.players.values()).map(({ id, name, score }) => ({ id, name, score }));
        io.in(roomCode).emit('player-list', { players, host: room.host });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      if (typeof callback === 'function') callback({ success: false, message: error.message });
    }
  });

  // When a client wants to join an existing room they provide the room
  // code. The room manager validates whether the room exists and has
  // capacity. If successful the player is added and other players in
  // the room are notified.
  socket.on('join-room', ({ roomCode, playerName }, callback) => {
    try {
      const { success, message } = roomManager.joinRoom(roomCode, socket, playerName);
      if (typeof callback === 'function') callback({ success, message });
      if (success) {
        const room = roomManager.getRoom(roomCode);
        if (room) {
          // Broadcast updated player list to room participants
          const players = Array.from(room.players.values()).map(({ id, name, score }) => ({ id, name, score }));
          io.in(roomCode).emit('player-list', { players, host: room.host });
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
      if (typeof callback === 'function') callback({ success: false, message: error.message });
    }
  });

  // When the host starts the game we initiate the game loop. The
  // configuration for the room is retrieved from the room manager. The
  // game logic module takes care of handling each round: displaying
  // the original image, collecting prompts, generating images and
  // calculating scores. We wrap this call in a try/catch to avoid
  // crashing the server on unexpected errors.
  socket.on('start-game', async ({ roomCode }, callback) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) throw new Error('Room not found');
      await gameLogic.startGame(room, io);
      if (typeof callback === 'function') callback({ success: true });
    } catch (error) {
      console.error('Error starting game:', error);
      if (typeof callback === 'function') callback({ success: false, message: error.message });
    }
  });

  // Players submit prompts during the writing prompt phase. The
  // game logic module collects these prompts and waits for all players
  // or the timer to expire. We delegate to roomManager/gameLogic to
  // handle the specifics. For now we simply forward the prompt to
  // whatever handler is registered for the room.
  socket.on('submit-prompt', ({ roomCode, prompt }, callback) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) throw new Error('Room not found');
      gameLogic.handlePromptSubmission(room, socket.id, prompt);
      if (typeof callback === 'function') callback({ success: true });
    } catch (error) {
      console.error('Error submitting prompt:', error);
      if (typeof callback === 'function') callback({ success: false, message: error.message });
    }
  });

  // Clean up when a player disconnects. They may have an entry in a
  // room's player list which we need to remove. The room manager
  // handles removing the player and broadcasting the updated list.
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Find the room before removing so we know which room to broadcast to.
    const room = roomManager.getRoomByPlayer(socket.id);
    roomManager.removePlayer(socket.id);
    if (room) {
      const updatedRoom = roomManager.getRoom(room.code);
      if (updatedRoom) {
        const players = Array.from(updatedRoom.players.values()).map(({ id, name, score }) => ({ id, name, score }));
        io.in(updatedRoom.code).emit('player-list', { players, host: updatedRoom.host });
      }
    }
  });
});

// Start the HTTP server. When running on Replit you should listen on
// process.env.PORT which the platform sets automatically. Local
// development defaults to 3000.
server.listen(PORT, () => {
  console.log(`Prompt Battle server listening on port ${PORT}`);
});