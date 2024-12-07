import EventEmitter from 'eventemitter3';
import { getMSTime } from '../../shared/src/time';
import * as Packet from '../../shared/src/packets';

export class Socket extends EventEmitter {
   clockDelta = 0;

   private connection: WebSocket | null = null;
   private serverTime = 0;
   private timeAtGo = 0;

   constructor(
      private host: string,
      private port: number,
   ) {
      super();
   }

   connect() {
      const url = `ws://${this.host}:${this.port}`;
      console.log(`Connecting to ${url}`);
      this.connection = new WebSocket(url);

      this.connection.onopen = () => {
         console.log('Connected to server');
      };

      this.connection.onmessage = ev => {
         if (ev.data === 'go') {
            this.timeAtGo = getMSTime();
            this.emit('connected');
            return;
         }

         this.receiveMessage(ev.data);
      };

      this.connection.onerror = ev => {
         console.error(`Error: ${ev}`);
      };

      this.connection.onclose = () => {
         this.emit('disconnected');
      };
   }

   send(message: (string | number)[]) {
      if (this.connection?.readyState !== WebSocket.OPEN) {
         return;
      }

      this.connection.send(JSON.stringify(message));
   }

   receiveMessage(message: string) {
      const data = JSON.parse(message);

      if (Array.isArray(data)) {
         if (Array.isArray(data[0])) {
            this.receiveActionBatch(data);
         } else {
            this.receiveAction(data);
         }
      }
   }

   receiveActionBatch(data: (string | number)[][]) {
      for (const action of data) {
         this.receiveAction(action);
      }
   }

   receiveAction(data: (string | number)[]) {
      const opcode = +data[0];

      switch(opcode) {
         case Packet.PacketOpcode.Welcome: {
            const welcomeData = Packet.Welcome.deserialize(data);
            const timeSinceGo = getMSTime() - this.timeAtGo;
            const oneWayLatency = timeSinceGo / 2;
            this.serverTime = welcomeData.timestamp + oneWayLatency;
            this.clockDelta = this.serverTime - getMSTime();

            this.emit('welcome', welcomeData);
         } break;
         case Packet.PacketOpcode.Spawn:
            this.emit('spawn', Packet.Spawn.deserialize(data));
            break;
         case Packet.PacketOpcode.Despawn:
            this.emit('despawn', Packet.Despawn.deserialize(data));
            break;
         case Packet.PacketOpcode.MoveUpdate:
            this.emit('move', Packet.MoveUpdate.deserialize(data));
            break;
         case Packet.PacketOpcode.TimeSync:
            this.emit('timesync', Packet.TimeSync.deserialize(data));
            break;
         default:
            console.log(`No handler found for opcode: ${opcode}`);
      }
   }
}