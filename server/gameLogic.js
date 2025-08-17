/*
 * gameLogic.js
 *
 * Contains the core mechanics for running a game round in Prompt Battle.
 * The exported functions are consumed by the server to start the game
 * loop and handle prompt submissions. This implementation is
 * intentionally simplified: it sequentially runs through each phase of
 * a round and uses timeouts to simulate timers. For a production
 * environment you would want more robust state management and error
 * handling.
 */

const roomManager = require('./roomManager');
const imageGenerator = require('./imageGenerator');
const { GAME_STATES, CATEGORIES } = require('../shared/constants');

// Helper to pause execution for a given number of milliseconds. Used to
// simulate timers between phases without blocking the event loop.
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Start the game loop for a given room. This function iterates through
 * each round and emits events to clients at the appropriate times.
 *
 * @param {Object} room The room object returned by roomManager.getRoom().
 * @param {Server} io The Socket.IO server instance for emitting events.
 */
async function startGame(room, io) {
  if (!room) throw new Error('Cannot start game: room is undefined');
  room.state = GAME_STATES.STARTING;
  io.in(room.code).emit('game-state', { state: room.state });
  console.log(`Starting game in room ${room.code}`);

  // Iterate through the configured number of rounds.
  for (let round = 1; round <= room.config.rounds; round++) {
    room.currentRound = round;
    room.roundData = {
      originalPrompt: null,
      originalImage: null,
      prompts: {},
      images: {},
      scores: {}
    };

    // PHASE 1: Generate original image and prompt based on category.
    room.state = GAME_STATES.SHOWING_IMAGE;
    io.in(room.code).emit('game-state', { state: room.state, round });

    // Choose a category. If 'random' is specified we pick one at random
    // from the full category list. Otherwise choose randomly among
    // provided categories.
    let category;
    const categories = room.config.categories;
    if (!categories || categories.length === 0 || categories.includes('random')) {
      category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    } else {
      category = categories[Math.floor(Math.random() * categories.length)];
    }

    // Generate the original image and prompt. If the OpenAI key is
    // missing the generator will provide a placeholder response.
    const { prompt: originalPrompt, image: originalImage } =
      await imageGenerator.generateOriginalImage(category);
    room.roundData.originalPrompt = originalPrompt;
    room.roundData.originalImage = originalImage;
    io.in(room.code).emit('original-image', { prompt: originalPrompt, image: originalImage, category });

    // Give players time to view the image. This could be configured
    // depending on difficulty but here we wait a fixed 10 seconds.
    await delay(10000);

    // PHASE 2: Prompt writing. We change state and notify clients. The
    // difficulty influences the amount of time players have to submit
    // their prompts.
    room.state = GAME_STATES.WRITING_PROMPT;
    io.in(room.code).emit('game-state', { state: room.state, round });

    const writeDuration = getWriteDuration(room.config.difficulty);
    // Start a promise that resolves when all prompts are submitted or
    // when the timer expires. The handlePromptSubmission method below
    // will resolve the promise early if everyone submits.
    await waitForPrompts(room, io, writeDuration);

    // PHASE 3: Generate images for each submitted prompt. If a player
    // failed to submit we skip generation for that player.
    room.state = GAME_STATES.GENERATING_IMAGES;
    io.in(room.code).emit('game-state', { state: room.state, round });

    const playerIds = Array.from(room.players.keys());
    for (const playerId of playerIds) {
      const p = room.players.get(playerId);
      const prompt = room.roundData.prompts[playerId];
      if (prompt) {
        try {
          const { image } = await imageGenerator.generateImageFromPrompt(prompt);
          room.roundData.images[playerId] = image;
        } catch (err) {
          console.error('Error generating image for prompt:', err);
          room.roundData.images[playerId] = null;
        }
      } else {
        room.roundData.images[playerId] = null;
      }
    }
    // Broadcast all generated images to clients. The client side will
    // handle displaying them in a gallery and disallow voting for
    // yourself.
    io.in(room.code).emit('generated-images', {
      images: room.roundData.images
    });

    // PHASE 4: Voting. In this simplified implementation we assign
    // random similarity scores and count votes. In a full
    // implementation you would collect votes via sockets.
    room.state = GAME_STATES.VOTING;
    io.in(room.code).emit('game-state', { state: room.state, round });
    // Generate similarity scores based on string comparison between
    // original prompt and player prompt. This naive implementation
    // counts overlapping words. Replace with a proper AI based metric.
    for (const playerId of playerIds) {
      const prompt = room.roundData.prompts[playerId];
      const similarity = prompt ? calculateSimilarity(originalPrompt, prompt) : 0;
      room.roundData.scores[playerId] = similarity;
    }
    // Update player scores and broadcast round results.
    for (const playerId of playerIds) {
      const player = room.players.get(playerId);
      const roundScore = room.roundData.scores[playerId];
      player.score += roundScore;
    }
    io.in(room.code).emit('round-results', {
      scores: room.roundData.scores,
      totalScores: Object.fromEntries(playerIds.map(id => [id, room.players.get(id).score]))
    });

    // Brief pause before next round.
    await delay(5000);
  }

  // Game over. Emit final scores and change state.
  room.state = GAME_STATES.GAME_OVER;
  io.in(room.code).emit('game-state', { state: room.state });
  io.in(room.code).emit('game-over', {
    finalScores: Object.fromEntries(Array.from(room.players.keys()).map(id => [id, room.players.get(id).score]))
  });
  console.log(`Game over in room ${room.code}`);
}

/**
 * Handle prompt submissions from clients. Called by the server when
 * receiving a 'submit-prompt' event. Stores the prompt against the
 * player's ID and resolves the pending promise returned by
 * waitForPrompts() if all players have submitted.
 *
 * @param {Object} room The room object.
 * @param {string} socketId The ID of the submitting player's socket.
 * @param {string} prompt The prompt text provided by the player.
 */
function handlePromptSubmission(room, socketId, prompt) {
  if (!room || !room.roundData) return;
  room.roundData.prompts[socketId] = prompt;
  // If all players have submitted a prompt we resolve the waiting
  // promise immediately. We store the resolver on the room object.
  if (room._resolvePromptPromise) {
    const allSubmitted = Array.from(room.players.keys()).every(
      (id) => room.roundData.prompts[id]
    );
    if (allSubmitted) {
      room._resolvePromptPromise();
      room._resolvePromptPromise = null;
    }
  }
}

/**
 * Wait for all players to submit prompts or until the allotted time
 * expires. Returns a promise that resolves when either condition is
 * met.
 *
 * @param {Object} room The room object.
 * @param {Server} io The Socket.IO server instance.
 * @param {number} ms The maximum time in milliseconds to wait.
 */
function waitForPrompts(room, io, ms) {
  return new Promise((resolve) => {
    // Save the resolver so that handlePromptSubmission can resolve early.
    room._resolvePromptPromise = resolve;
    const timer = setTimeout(() => {
      // Time expired. We simply resolve and remove the resolver.
      if (room._resolvePromptPromise) {
        room._resolvePromptPromise();
        room._resolvePromptPromise = null;
      }
    }, ms);
  });
}

/**
 * Convert difficulty strings into milliseconds for the prompt writing phase.
 * Adjust these values to change the length of the writing timer.
 *
 * @param {string} difficulty One of 'easy', 'medium', 'hard', 'extreme'.
 * @returns {number} Time in milliseconds.
 */
function getWriteDuration(difficulty) {
  switch (difficulty) {
    case 'easy':
      return 5 * 60 * 1000; // 5 minutes
    case 'medium':
      return 3 * 60 * 1000; // 3 minutes
    case 'hard':
      return 2 * 60 * 1000; // 2 minutes
    case 'extreme':
      return 1 * 60 * 1000; // 1 minute
    default:
      return 3 * 60 * 1000;
  }
}

/**
 * Simple similarity metric: counts the number of overlapping words
 * between the original prompt and the player's prompt and scales to
 * 100. This is a placeholder for something more sophisticated like
 * using cosine similarity or a machine learning model.
 *
 * @param {string} a Original prompt.
 * @param {string} b Player prompt.
 * @returns {number} Similarity score between 0 and 100.
 */
function calculateSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = a.toLowerCase().split(/\W+/);
  const wordsB = b.toLowerCase().split(/\W+/);
  const setA = new Set(wordsA);
  let overlap = 0;
  for (const word of wordsB) {
    if (setA.has(word)) overlap++;
  }
  const maxWords = Math.max(wordsA.length, wordsB.length);
  return Math.round((overlap / maxWords) * 100);
}

module.exports = {
  startGame,
  handlePromptSubmission,
  waitForPrompts,
  getWriteDuration,
  calculateSimilarity
};