import EventEmitter from 'eventemitter3';
import '../../shared/src/globals';
import { GameServer } from './game-server';
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

declare global {
  var eventBus: EventEmitter;
}

globalThis.eventBus = new EventEmitter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.static(path.join(__dirname, '../../')));

const wss = new WebSocketServer({ noServer: true });

const httpServer = app.listen(3000, () => {
  log.info(`Spellforge game server started on port ${3000}`);
});

httpServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

const gameServer = new GameServer(wss);

process.on('SIGINT', () => {
  gameServer.shutdown();
  process.exit(0);
});
