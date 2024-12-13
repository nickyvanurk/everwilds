export class Logger {
  level: 'info' | 'debug' | 'error';

  constructor(level: 'info' | 'debug' | 'error') {
    this.level = level;
  }

  info(msg: string) {
    if (this.level === 'debug' || this.level === 'info') {
      console.info(msg);
    }
  }

  debug(msg: string) {
    if (this.level === 'debug') {
      console.debug(msg);
    }
  }

  warn(msg: string) {
    console.warn(msg);
  }

  error(msg: string) {
    console.error(msg);
  }
}
