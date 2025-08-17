/*
 * roomManager.js
 *
 * This module manages the lifecycle of game rooms, including
 * creation, joining, departure and general bookkeeping of players.
 * It exposes methods that are consumed by the main server entry
 * point as well as the game logic module. Keeping room state in
 * memory is sufficient for small games; for a production system you
 * might back this with a database or external cache.
 */

const { v4: uuidv4 } = require('uuid');
const { GAME_STATES } = require('../shared/constants');

// Utility for generating a random 6‑character alphanumeric room code.
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// In‑memory collection of rooms keyed by their room code. Each room
// maintains its own configuration, player list, state and any timers.
const rooms = new Map();

/**
 * Creates a new room and stores it in the in‑memory collection.
 *
 * @param {Object} config Configuration supplied by the room creator.
 * @param {Socket} socket The socket of the player who is creating the room.
 * @returns {string} The generated room code.
 */
function createRoom(config, socket) {
  let code;
  // Generate a unique room code. In the unlikely event of a collision,
  // regenerate until an unused code is produced.
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  // The player who creates the room becomes the host. We'll use their
  // socket ID as the key in the players map. Additional metadata such
  // as name, score and ready state can be stored here.
  const hostPlayer = {
    id: socket.id,
    name: config?.playerName || 'Host',
    score: 0,
    ready: false,
    prompt: null,
    image: null
  };

  const room = {
    code,
    host: socket.id,
    config: {
      rounds: config.rounds || 3,
      difficulty: config.difficulty || 'medium',
      categories: config.categories || ['random'],
      mode: config.mode || 'classic'
    },
    players: new Map([[socket.id, hostPlayer]]),
    state: GAME_STATES.WAITING,
    currentRound: 0,
    timers: {},
    // Additional state such as the current original image, prompts
    // submitted this round and generated images can be stored here.
    roundData: {}
  };

  // Save the room and join the socket to the Socket.IO room so that
  // broadcast operations can be targeted to this room.
  rooms.set(code, room);
  socket.join(code);

  console.log(`Created room ${code} with host ${socket.id}`);
  return code;
}

/**
 * Joins an existing room if possible. Validates that the room exists
 * and that it has not reached its player capacity. Adds the player to
 * the room's player list and joins the Socket.IO room.
 *
 * @param {string} roomCode The code of the room to join.
 * @param {Socket} socket The socket representing the connecting player.
 * @param {string} playerName Name chosen by the connecting player.
 * @returns {Object} Result object containing success flag and optional message.
 */
function joinRoom(roomCode, socket, playerName) {
  const room = rooms.get(roomCode);
  if (!room) {
    return { success: false, message: 'Room does not exist.' };
  }

  // Enforce maximum players per room. This limit could be sourced from
  // an environment variable or config file. For now it's hard coded.
  const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '6', 10);
  if (room.players.size >= MAX_PLAYERS) {
    return { success: false, message: 'Room is full.' };
  }

  // Add the new player to the room. Each player entry tracks their
  // name, score, whether they've submitted a prompt and other stats.
  room.players.set(socket.id, {
    id: socket.id,
    name: playerName || 'Player',
    score: 0,
    ready: false,
    prompt: null,
    image: null
  });

  socket.join(roomCode);
  console.log(`Player ${socket.id} joined room ${roomCode}`);

  // Notify existing players of the updated player list. Because the
  // server does not keep track of the Socket.IO server instance here,
  // the caller (index.js) will be responsible for broadcasting.
  return { success: true, message: 'Joined room successfully.' };
}

/**
 * Remove a player from whichever room they are currently in. If the
 * player is the host we elect a new host or close the room if empty.
 *
 * @param {string} socketId The ID of the socket that disconnected.
 */
function removePlayer(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.players.has(socketId)) {
      room.players.delete(socketId);
      console.log(`Removed player ${socketId} from room ${code}`);

      // If the removed player was the host and there are still
      // participants, promote the next player to host. Otherwise if
      // everyone has left, delete the room entirely.
      if (room.host === socketId) {
        const nextPlayer = room.players.keys().next().value;
        if (nextPlayer) {
          room.host = nextPlayer;
        } else {
          rooms.delete(code);
          console.log(`Deleted empty room ${code}`);
          break;
        }
      }
    }
  }
}

/**
 * Retrieve a room by its code.
 *
 * @param {string} roomCode
 * @returns {Object|null} The room object or null if not found.
 */
function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

/**
 * Determine which room a socket belongs to by scanning all rooms. In a
 * production system you would likely maintain a reverse index to
 * improve lookup performance.
 *
 * @param {string} socketId
 * @returns {Object|null} The room the player belongs to or null.
 */
function getRoomByPlayer(socketId) {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
}

module.exports = {
  createRoom,
  joinRoom,
  removePlayer,
  getRoom,
  getRoomByPlayer,
  rooms
};