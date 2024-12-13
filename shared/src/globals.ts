import { Logger } from './log';

declare global {
  var log: Logger;
}

globalThis.log = new Logger('debug');
