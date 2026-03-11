/**
 * Cache manager for generated images
 */

import { createHash } from 'crypto';
import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export class CacheManager {
  constructor(options = {}) {
    this.ttl = options.ttl || 3600; // Default 1 hour
    this.cacheDir = options.cacheDir || join(homedir(), '.clawra', 'cache');
    this.ensureDirectory();
  }

  async ensureDirectory() {
    try {
      await mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  /**
   * Generate cache key from params
   */
  generateKey(params) {
    const str = JSON.stringify(params);
    return createHash('md5').update(str).digest('hex');
  }

  /**
   * Get cached data
   */
  async get(key) {
    try {
      const cachePath = join(this.cacheDir, `${key}.json`);
      const data = await readFile(cachePath, 'utf-8');
      const cached = JSON.parse(data);

      // Check TTL
      if (Date.now() - cached.timestamp > this.ttl * 1000) {
        await unlink(cachePath);
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key, data) {
    try {
      const cachePath = join(this.cacheDir, `${key}.json`);
      const cached = {
        timestamp: Date.now(),
        data
      };
      await writeFile(cachePath, JSON.stringify(cached), 'utf-8');
    } catch (error) {
      console.error('Failed to write cache:', error);
    }
  }

  /**
   * Clear all cached data
   */
  async clear() {
    try {
      const files = await readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await unlink(join(this.cacheDir, file));
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const files = await readdir(this.cacheDir);
      let totalSize = 0;
      let count = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await stat(join(this.cacheDir, file));
          totalSize += stats.size;
          count++;
        }
      }

      return {
        count,
        totalSize,
        cacheDir: this.cacheDir
      };
    } catch {
      return { count: 0, totalSize: 0, cacheDir: this.cacheDir };
    }
  }
}

export default CacheManager;
