/**
 * Base provider class for image generation
 */

export class BaseProvider {
  constructor(config) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  /**
   * Generate image from prompt
   * @param {string} prompt - Image generation prompt
   * @param {Object} options - Generation options
   * @returns {Promise<{url: string, width: number, height: number}>}
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * Build selfie prompt based on mode
   * @param {string} context - User context
   * @param {string} mode - 'mirror' or 'direct'
   * @returns {string}
   */
  buildPrompt(context, mode) {
    if (mode === 'direct') {
      return `a close-up selfie taken by herself at ${context}, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible`;
    }
    return `make a pic of this person, but ${context}. the person is taking a mirror selfie`;
  }

  /**
   * Detect mode from user context
   * @param {string} context - User input
   * @returns {'mirror'|'direct'}
   */
  detectMode(context) {
    const lower = context.toLowerCase();
    const directKeywords = /cafe|restaurant|beach|park|city|location|close-up|portrait|face|eyes|smile/i;
    const mirrorKeywords = /outfit|wearing|clothes|dress|suit|fashion|full-body|mirror/i;
    
    if (directKeywords.test(lower)) return 'direct';
    if (mirrorKeywords.test(lower)) return 'mirror';
    return 'mirror'; // default
  }

  /**
   * Check if provider is available
   * @returns {boolean}
   */
  isAvailable() {
    return !!this.config.apiKey;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return 'base';
  }
}

export default BaseProvider;
