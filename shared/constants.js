/*
 * constants.js
 *
 * Shared constants used across the client and server. This file
 * defines the possible game states, category names and other
 * enumerations. Using a central file like this helps avoid typos and
 * makes it easier to update values in one place.
 */

// Enumeration of game states. These values must align with the
// definitions used on the client side to ensure consistent state
// transitions.
const GAME_STATES = {
  WAITING: 'waiting',
  STARTING: 'starting',
  SHOWING_IMAGE: 'showing_image',
  WRITING_PROMPT: 'writing_prompt',
  GENERATING_IMAGES: 'generating_images',
  VOTING: 'voting',
  SHOWING_RESULTS: 'showing_results',
  GAME_OVER: 'game_over'
};

// List of supported categories. These strings are used by both the
// server and client to display category names and influence prompt
// generation. When adding new categories be sure to update the UI.
const CATEGORIES = [
  'naturaleza',    // Nature scenes
  'abstracto',     // Abstract patterns and shapes
  'objetos',       // Everyday objects
  'escenas',       // Scenes such as cityscapes or interiors
  'fantástico'    // Fantastic or imaginary scenes
];

module.exports = {
  GAME_STATES,
  CATEGORIES
};