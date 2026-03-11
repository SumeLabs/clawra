/**
 * OpenAI DALL-E provider implementation
 */

import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'dall-e-3';
  }

  getName() {
    return 'openai';
  }

  async generate(prompt, options = {}) {
    const {
      size = '1024x1024',
      quality = 'standard',
      numImages = 1
    } = options;

    // DALL-E only supports n=1 for DALL-E 3
    const n = this.model === 'dall-e-3' ? 1 : Math.min(numImages, 4);

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
        quality,
        n,
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
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
      contentType: 'image/png',
      revisedPrompt: image.revised_prompt
    };
  }

  /**
   * Get available sizes for current model
   */
  getAvailableSizes() {
    if (this.model === 'dall-e-3') {
      return ['1024x1024', '1792x1024', '1024x1792'];
    }
    return ['256x256', '512x512', '1024x1024'];
  }
}

export default OpenAIProvider;
