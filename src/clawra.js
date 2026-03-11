/**
 * Clawra - Main class for selfie generation
 */

import { createProvider, detectProvider } from './providers/index.js';
import { CacheManager } from './utils/cache.js';
import { Logger } from './utils/logger.js';

export class Clawra {
  constructor(options = {}) {
    this.config = {
      provider: options.provider || process.env.CLAWRA_PROVIDER || 'fal',
      apiKey: options.apiKey || this.getApiKeyForProvider(options.provider),
      baseUrl: options.baseUrl || process.env.CLAWRA_BASE_URL,
      model: options.model || process.env.CLAWRA_MODEL,
      defaultMode: options.defaultMode || process.env.CLAWRA_MODE || 'auto',
      defaultSize: options.defaultSize || parseInt(process.env.CLAWRA_DEFAULT_SIZE) || 1024,
      referenceImage: options.referenceImage || process.env.CLAWRA_REFERENCE_IMAGE,
      cacheEnabled: options.cacheEnabled === true || process.env.CLAWRA_CACHE_ENABLED === 'true',
      cacheTtl: options.cacheTtl || parseInt(process.env.CLAWRA_CACHE_TTL) || 3600,
      timeout: options.timeout || parseInt(process.env.CLAWRA_TIMEOUT) || 30000,
      debug: options.debug === true || process.env.CLAWRA_DEBUG === 'true'
    };

    this.logger = new Logger({ debug: this.config.debug });
    
    // Initialize cache if enabled
    if (this.config.cacheEnabled) {
      this.cache = new CacheManager({ ttl: this.config.cacheTtl });
    }

    // Initialize provider
    this.provider = this.initializeProvider();
  }

  /**
   * Get API key for provider from environment
   */
  getApiKeyForProvider(provider) {
    const keyMap = {
      'fal': process.env.FAL_KEY,
      'openai': process.env.OPENAI_API_KEY,
      'stability': process.env.STABILITY_KEY,
      'custom': process.env.CUSTOM_API_KEY || process.env.OPENAI_API_KEY
    };
    return keyMap[provider] || process.env.CLAWRA_API_KEY;
  }

  /**
   * Initialize the image provider
   */
  initializeProvider() {
    // Auto-detect provider if not specified
    if (!this.config.provider && this.config.apiKey) {
      this.config.provider = detectProvider(this.config.apiKey) || 'fal';
      this.logger.info(`Auto-detected provider: ${this.config.provider}`);
    }

    if (!this.config.apiKey) {
      throw new Error('No API key provided. Set FAL_KEY, OPENAI_API_KEY, or CLAWRA_API_KEY');
    }

    const providerConfig = {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      timeout: this.config.timeout
    };

    try {
      const provider = createProvider(this.config.provider, providerConfig);
      this.logger.info(`Initialized ${provider.getName()} provider`);
      return provider;
    } catch (error) {
      throw new Error(`Failed to initialize provider: ${error.message}`);
    }
  }

  /**
   * Generate selfie image
   */
  async generate(options = {}) {
    const startTime = Date.now();
    
    const {
      prompt,
      context = prompt,
      mode: modeOption,
      channel,
      caption,
      size = this.config.defaultSize,
      numImages = 1,
      outputFormat = 'jpeg'
    } = options;

    if (!context) {
      throw new Error('Prompt or context is required');
    }

    // Determine mode
    const mode = modeOption === 'auto' || !modeOption
      ? this.provider.detectMode(context)
      : modeOption;

    this.logger.info(`Mode: ${mode}, Context: ${context}`);

    // Build generation prompt
    const generationPrompt = this.provider.buildPrompt(context, mode);

    // Check cache
    if (this.cache) {
      const cacheKey = this.cache.generateKey({
        prompt: generationPrompt,
        provider: this.provider.getName(),
        mode,
        size
      });

      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Cache hit');
        return {
          ...cached,
          cached: true
        };
      }
    }

    // Generate image
    this.logger.info('Generating image...');
    
    try {
      const result = await this.provider.generate(generationPrompt, {
        referenceImage: this.config.referenceImage,
        size: `${size}x${size}`,
        numImages,
        outputFormat
      });

      const duration = Date.now() - startTime;
      this.logger.info(`Generated in ${duration}ms`);

      // Cache result
      if (this.cache) {
        await this.cache.set(cacheKey, result);
      }

      // Send to channel if specified
      if (channel) {
        await this.sendToChannel(result.url, channel, caption);
      }

      return {
        ...result,
        mode,
        prompt: generationPrompt,
        duration
      };
    } catch (error) {
      this.logger.error('Generation failed:', error);
      throw error;
    }
  }

  /**
   * Send image to OpenClaw channel
   */
  async sendToChannel(imageUrl, channel, caption = '') {
    // This would integrate with OpenClaw messaging API
    // For now, just log it
    this.logger.info(`Sending to ${channel}: ${caption || 'No caption'}`);
    
    // Example integration:
    // const { exec } = await import('child_process');
    // const { promisify } = await import('util');
    // const execAsync = promisify(exec);
    // await execAsync(`openclaw message send --channel "${channel}" --message "${caption}" --media "${imageUrl}"`);
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      name: this.provider.getName(),
      available: this.provider.isAvailable(),
      config: {
        ...this.config,
        apiKey: this.config.apiKey ? '***' : undefined
      }
    };
  }

  /**
   * Test the configuration
   */
  async test() {
    try {
      const result = await this.generate({
        context: 'wearing a red shirt',
        mode: 'mirror'
      });
      
      return {
        success: true,
        provider: this.provider.getName(),
        imageUrl: result.url,
        duration: result.duration
      };
    } catch (error) {
      return {
        success: false,
        provider: this.provider.getName(),
        error: error.message
      };
    }
  }
}

export default Clawra;
