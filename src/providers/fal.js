/**
 * fal.ai provider implementation
 * Supports xAI Grok Imagine with image editing
 */

import { BaseProvider } from './base.js';

export class FalProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://fal.run';
    this.model = config.model || 'xai/grok-imagine-image/edit';
  }

  getName() {
    return 'fal';
  }

  async generate(prompt, options = {}) {
    const {
      referenceImage = 'https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png',
      numImages = 1,
      outputFormat = 'jpeg',
      seed
    } = options;

    const url = `${this.baseUrl}/${this.model}`;
    
    const payload = {
      image_url: referenceImage,
      prompt,
      num_images: numImages,
      output_format: outputFormat
    };

    if (seed !== undefined) {
      payload.seed = seed;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`fal.ai API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.images || data.images.length === 0) {
      throw new Error('No images generated');
    }

    return {
      url: data.images[0].url,
      width: data.images[0].width || 1024,
      height: data.images[0].height || 1024,
      contentType: data.images[0].content_type || 'image/jpeg',
      revisedPrompt: data.revised_prompt
    };
  }

  /**
   * Generate without reference image (text-to-image only)
   */
  async generateTextToImage(prompt, options = {}) {
    const model = 'xai/grok-imagine-image'; // No /edit suffix
    const url = `${this.baseUrl}/${model}`;
    
    const payload = {
      prompt,
      num_images: options.numImages || 1,
      output_format: options.outputFormat || 'jpeg'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`fal.ai API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      url: data.images[0].url,
      width: data.images[0].width || 1024,
      height: data.images[0].height || 1024,
      contentType: data.images[0].content_type || 'image/jpeg'
    };
  }
}

export default FalProvider;
