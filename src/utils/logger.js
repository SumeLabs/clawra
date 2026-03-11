/**
 * Simple logger utility
 */

export class Logger {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.prefix = options.prefix || '[Clawra]';
  }

  log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const output = `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`;
    
    if (args.length > 0) {
      console.log(output, ...args);
    } else {
      console.log(output);
    }
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  debug(message, ...args) {
    if (this.debug) {
      this.log('debug', message, ...args);
    }
  }
}

export default Logger;
