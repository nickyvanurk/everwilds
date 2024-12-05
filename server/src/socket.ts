import type { WebSocket } from 'ws';

export class Socket {
   constructor(public ws: WebSocket) {
      ws.on('error', error => {
         console.log(`Error: ${error}`);
      });
   }

   isOpen() {
      return this.ws.readyState === this.ws.OPEN;
   }

   initiateHandshake() {
      if (!this.isOpen()) return;

      this.ws.send('go');
   }

   send(message: any[]) {
      if (!this.isOpen()) return;

      this.ws.send(JSON.stringify(message));
   }

   sendPacket(packet: (string | number)[]) {
      if (!this.isOpen()) return;

      this.ws.send(JSON.stringify(packet));
   }

   onPacket(callback: (opcode: number, data: (string | number)[]) => void) {
      this.ws.on('message', (message: (string | number)[]) => {
         const data = JSON.parse(message.toString());
         const opcode = +data[0];
         const payload = data.slice(1);

         callback(opcode, payload);
      });
   }

   onClose(callback: () => void) {
      this.ws.on('close', callback);
   }
}
