import EventEmitter from 'eventemitter3';
import '../../shared/src/globals';
import { GameServer } from './game-server';
import express from 'express';
import { WebSocketServer } from 'ws';

declare global {
  var eventBus: EventEmitter;
}

globalThis.eventBus = new EventEmitter();

const app = express();
app.use(express.static('dist'));

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
