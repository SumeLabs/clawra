/**
 * Stability AI provider implementation
 */

import { BaseProvider } from './base.js';

export class StabilityProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.stability.ai/v1';
    this.model = config.model || 'sdxl-v1-0';
  }

  getName() {
    return 'stability';
  }

  async generate(prompt, options = {}) {
    const {
      size = '1024x1024',
      numImages = 1,
      steps = 30,
      cfgScale = 7
    } = options;

    const [width, height] = size.split('x').map(Number);

    const response = await fetch(`${this.baseUrl}/generation/${this.model}/text-to-image`, {
      method: 'POST',
      headers: {
        'Authorization': `${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        width,
        height,
        samples: Math.min(numImages, 4),
        steps,
        cfg_scale: cfgScale
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stability API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.artifacts || data.artifacts.length === 0) {
      throw new Error('No images generated');
    }

    // Stability returns base64
    const artifact = data.artifacts[0];
    
    // Convert base64 to data URL
    const base64 = artifact.base64;
    const contentType = 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;

    return {
      url: dataUrl,
      width,
      height,
      contentType,
      base64: base64  // Include raw base64 for flexibility
    };
  }

  /**
   * Get available engines/models
   */
  async listEngines() {
    const response = await fetch(`${this.baseUrl}/engines`, {
      headers: {
        'Authorization': `${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to list engines');
    }

    return await response.json();
  }
}

export default StabilityProvider;
