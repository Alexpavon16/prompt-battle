/*
 * imageGenerator.js
 *
 * Encapsulates all calls to the OpenAI API for image generation. It
 * abstracts away API setup and error handling. If no API key is
 * present, the functions return placeholder data so that the rest of
 * the game can still run without crashing. To generate real images
 * replace the placeholder logic with proper API calls.
 */

const { Configuration, OpenAIApi } = require('openai');

// Initialise the OpenAI client if an API key is provided. Without a
// valid API key the client remains undefined and placeholder images
// will be returned instead of making remote API calls.
let openai;
if (process.env.OPENAI_API_KEY) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  });
  openai = new OpenAIApi(configuration);
}

// Timeout for image generation requests. If an API call takes longer
// than this value (in milliseconds) it will be aborted. Defaults to
// 30 seconds but can be overridden via IMAGE_GENERATION_TIMEOUT.
const IMAGE_GENERATION_TIMEOUT = parseInt(process.env.IMAGE_GENERATION_TIMEOUT || '30000', 10);

/**
 * Generate an original image and its hidden prompt based on a category.
 * The prompt is intentionally descriptive to aid similarity scoring.
 *
 * @param {string} category The category selected for the round.
 * @returns {Promise<{prompt: string, image: string}>}
 */
async function generateOriginalImage(category) {
  // Construct a simple descriptive prompt. You can enhance this
  // function to build more imaginative prompts based on sub‑categories
  // or difficulty settings.
  const prompt = `A detailed ${category} scene generated for a prompt battle game.`;

  if (!openai) {
    // No API key: return placeholder data. The image is a transparent
    // 1x1 PNG encoded in base64, which avoids broken image icons on the client.
    return {
      prompt,
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT);
    const response = await openai.images.generate({
      prompt,
      model: 'dall-e-3',
      n: 1,
      size: '512x512'
    }, { signal: controller.signal });
    clearTimeout(timeout);
    const imageUrl = response?.data?.data?.[0]?.url;
    return { prompt, image: imageUrl };
  } catch (error) {
    console.error('Error generating original image:', error);
    // Fallback to placeholder image on error
    return {
      prompt,
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    };
  }
}

/**
 * Generate an image based on the player's prompt. Uses the OpenAI API if
 * available otherwise returns a placeholder. The image is not stored
 * anywhere else; the caller should maintain state in room.roundData.
 *
 * @param {string} prompt The player's submitted prompt.
 * @returns {Promise<{image: string}>}
 */
async function generateImageFromPrompt(prompt) {
  if (!openai) {
    return {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT);
    const response = await openai.images.generate({
      prompt,
      model: 'dall-e-3',
      n: 1,
      size: '512x512'
    }, { signal: controller.signal });
    clearTimeout(timeout);
    const imageUrl = response?.data?.data?.[0]?.url;
    return { image: imageUrl };
  } catch (error) {
    console.error('Error generating image from prompt:', error);
    return {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='
    };
  }
}

module.exports = {
  generateOriginalImage,
  generateImageFromPrompt
};