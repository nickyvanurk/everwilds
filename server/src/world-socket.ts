import type { WebSocket } from 'ws';

export class WorldSocket {
   constructor(public ws: WebSocket) {}
}
