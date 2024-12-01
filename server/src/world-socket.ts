import type { WebSocket } from 'ws';

export class WorldSocket {
   private closed = false;

   constructor(public ws: WebSocket) {
      ws.on('error', error => {
         console.log(`Error: ${error}`);
      });
   }

   isOpen() {
      return !this.closed && this.ws.readyState === this.ws.OPEN;
   }

   close() {
      if (!this.isOpen) return;

      this.ws.close();
      this.closed = true;
   }

   initiateHandshake() {
      if (!this.isOpen()) return;

      this.ws.send('go');
   }

   sendPacket(packet: (string | number)[]) {
      if (!this.isOpen()) return;

      this.ws.send(JSON.stringify(packet));
   }

   onClose(callback: () => void) {
      this.ws.on('close', callback);
   }

   onPacket(callback: (opcode: number, data: (string | number)[]) => void) {
      this.ws.on('message', (message: (string | number)[]) => {
         const data = JSON.parse(message.toString());
         callback(+data[0], data.slice(1));
      });
   }
}
