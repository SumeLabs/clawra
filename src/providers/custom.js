/**
 * Custom provider for OpenAI-compatible APIs
 * Works with OneAPI, NewAPI, and other custom endpoints
 */

import { BaseProvider } from './base.js';

export class CustomProvider extends BaseProvider {
  constructor(config) {
    super(config);
    if (!config.baseUrl) {
      throw new Error('Custom provider requires baseUrl');
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.model = config.model || 'gpt-4o-image';
  }

  getName() {
    return 'custom';
  }

  async generate(prompt, options = {}) {
    const {
      size = '1024x1024',
      numImages = 1,
      quality = 'standard'
    } = options;

    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        size,
        n: Math.min(numImages, 4),
        quality,
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No images generated');
    }

    const image = data.data[0];
    const [width, height] = size.split('x').map(Number);

    return {
      url: image.url,
      width: width || 1024,
      height: height || 1024,
      contentType: 'image/png'
    };
  }

  /**
   * Test connection to custom API
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default CustomProvider;
