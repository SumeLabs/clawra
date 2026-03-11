/**
 * Provider exports
 */

export { BaseProvider } from './base.js';
export { FalProvider } from './fal.js';
export { OpenAIProvider } from './openai.js';
export { StabilityProvider } from './stability.js';
export { CustomProvider } from './custom.js';

import { FalProvider } from './fal.js';
import { OpenAIProvider } from './openai.js';
import { StabilityProvider } from './stability.js';
import { CustomProvider } from './custom.js';

/**
 * Create provider instance based on type
 * @param {string} provider - Provider name
 * @param {Object} config - Provider configuration
 * @returns {BaseProvider}
 */
export function createProvider(provider, config) {
  switch (provider.toLowerCase()) {
    case 'fal':
      return new FalProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'stability':
      return new StabilityProvider(config);
    case 'custom':
      return new CustomProvider(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Auto-detect provider from API key
 * @param {string} apiKey - API key
 * @returns {string|null}
 */
export function detectProvider(apiKey) {
  if (!apiKey) return null;
  
  if (apiKey.startsWith('fc-')) return 'fal';
  if (apiKey.startsWith('sk-') && apiKey.includes('openai')) return 'openai';
  if (apiKey.startsWith('sk-')) return 'openai'; // Generic sk- keys often OpenAI
  
  return 'custom';
}

/**
 * Get all available providers
 * @returns {Array<{name: string, description: string}>}
 */
export function getAvailableProviders() {
  return [
    { name: 'fal', description: 'fal.ai - xAI Grok Imagine (image editing support)' },
    { name: 'openai', description: 'OpenAI - DALL-E 3 (high quality)' },
    { name: 'stability', description: 'Stability AI - SDXL (cost-effective)' },
    { name: 'custom', description: 'Custom - Any OpenAI-compatible endpoint' }
  ];
}
