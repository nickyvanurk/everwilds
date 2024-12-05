import { getMSTime } from '../../shared/src/time';
import * as Packet from '../../shared/src/packets';

export class Client {
   clockDelta = 0;

   private connection: WebSocket | null = null;
   private serverTime = 0;
   private timeAtGo = 0;
   private connectedCallback = () => {};
   private disconnectedCallback = () => {};
   private welcomeCallback = (
      _timestamp: number,
      _id: number,
      _flag: number,
      _name: string,
      _x: number,
      _y: number,
      _z: number,
      _orientation: number,
   ) => {};
   spawnEntityCallback = (
      _timestamp: number,
      _id: number,
      _flag: number,
      _name: string,
      _x: number,
      _y: number,
      _z: number,
      _orientation: number,
   ) => {};
   despawnCallback = (_id: number) => {};
   moveCallback = (_timestamp: number, _id: number, _flag: number, _x: number, _y: number, _z: number, orientation: number) => {};

   constructor(
      private host: string,
      private port: number,
   ) {}

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
            this.connectedCallback();
            return;
         }

         this.receiveMessage(ev.data);
      };

      this.connection.onerror = ev => {
         console.error(`Error: ${ev}`);
      };

      this.connection.onclose = () => {
         this.disconnectedCallback();
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
      const payload = data.slice(1);

      const handlers = {
         [Packet.PacketOpcode.Welcome]: this.handleWelcomeOpcode,
         [Packet.PacketOpcode.Spawn]: this.handleSpawnOpcode,
         [Packet.PacketOpcode.Despawn]: this.handleDespawnOpcode,
         [Packet.PacketOpcode.MoveUpdate]: this.handleMoveUpdateOpcode,
         [Packet.PacketOpcode.TimeSync]: this.handleTimeSyncOpcode,
      };

      // @ts-ignore
      const handler = handlers[opcode];
      if (!handler) {
         console.log(`No handler found for opcode: ${opcode}`);
         return;
      }

      handler.call(this, ...payload);
   }

   handleWelcomeOpcode(timestamp: number, id: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) {
      const timeSinceGo = getMSTime() - this.timeAtGo;
      const oneWayLatency = timeSinceGo / 2;
      this.serverTime = timestamp + oneWayLatency;
      this.clockDelta = this.serverTime - getMSTime();

      this.welcomeCallback(timestamp, id, flag, name, x, y, z, orientation);
   }

   handleSpawnOpcode(timestamp: number, id: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) {
      this.spawnEntityCallback(timestamp, id, flag, name, x, y, z, orientation);
   }

   handleDespawnOpcode(id: number) {
      this.despawnCallback(id);
   }

   handleMoveUpdateOpcode(timestamp: number, id: number, flag: number, x: number, y: number, z: number, orientation: number) {
      this.moveCallback(timestamp, id, flag, x, y, z, orientation);
   }

   handleTimeSyncOpcode(sequenceIndex: number) {
      this.send(Packet.TimeSyncResponse.serialize(sequenceIndex, getMSTime()));
   }

   onConnected(callback: () => void) {
      this.connectedCallback = callback;
   }

   onDisconnected(callback: () => void) {
      this.disconnectedCallback = callback;
   }

   onWelcome(
      callback: (
         timestamp: number,
         id: number,
         flag: number,
         name: string,
         x: number,
         y: number,
         z: number,
         orientation: number,
      ) => void,
   ) {
      this.welcomeCallback = callback;
   }

   onSpawnEntity(
      callback: (timestamp: number, id: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) => void,
   ) {
      this.spawnEntityCallback = callback;
   }

   onEntityMove(
      callback: (serverTime: number, start: number, id: number, x: number, y: number, z: number, orientation: number) => void,
   ) {
      this.moveCallback = callback;
   }

   onDespawnEntity(callback: (id: number) => void) {
      this.despawnCallback = callback;
   }

   sendHello(playername: string) {
      this.send(Packet.Hello.serialize(getMSTime(), playername));
   }

   sendMove(flag: number, x: number, y: number, z: number, orientation: number) {
      this.send(Packet.Move.serialize(getMSTime(), flag, x, y, z, orientation));
   }
}
