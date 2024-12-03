import { getMSTime } from '../../shared/src/time';
import * as Packet from '../../shared/src/packets';

export class Client {
   private connection: WebSocket | null = null;
   private connectedCallback = () => {};
   private disconnectedCallback = () => {};
   private welcomeCallback = (
      _id: number,
      _name: string,
      _x: number,
      _y: number,
      _z: number,
   ) => {};
   listCallback = (ids: number[]) => {};
   spawnEntityCallback = (
      _id: number,
      _name: string,
      _x: number,
      _y: number,
      _z: number,
   ) => {};
   despawnCallback = (_id: number) => {};
   moveCallback = (_serverTime: number, flag: number, _id: number, _x: number, _y: number, _z: number, orientation: number) => {};

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

   sendMessage(message: (string | number)[]) {
      if (this.connection?.readyState !== WebSocket.OPEN) {
         return;
      }

      this.connection.send(JSON.stringify(message));
   }

   receiveMessage(message: string) {
      const data = JSON.parse(message);

      if (Array.isArray(data)) {
         if (Array.isArray(data[0])) {
            // Multiple actions received
            this.receiveActionBatch(data);
         } else {
            // Only one action received
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
      Packet.handlePacket(this, +data[0], data.slice(1));
   }

   handleWelcomeOpcode(id: number, name: string, x: number, y: number, z: number) {
      this.welcomeCallback(id, name, x, y, z);
   }

   handleListOpcode(ids: number[]) {
      console.log(ids);
      this.listCallback(ids);
   }

   handleSpawnOpcode(id: number, name: string, x: number, y: number, z: number) {
      this.spawnEntityCallback(id, name, x, y, z);
      console.log('Spawn:', id, name, x, y, z);
   }

   handleDespawnOpcode(id: number) {
      this.despawnCallback(id);
      console.log('Despawn:', id);
   }

   handleMoveUpdateOpcode(serverTime: number, flag: number, id: number, x: number, y: number, z: number, orientation: number) {
      this.moveCallback(serverTime, flag, id, x, y, z, orientation);
   }

   handleTimeSyncOpcode(sequenceIndex: number) {
      this.sendMessage([Packet.Type.TimeSyncResponse, sequenceIndex, getMSTime()]);
   }

   onConnected(callback: () => void) {
      this.connectedCallback = callback;
   }

   onDisconnected(callback: () => void) {
      this.disconnectedCallback = callback;
   }

   onWelcome(
      callback: (
         id: number,
         name: string,
         x: number,
         y: number,
         z: number,
      ) => void,
   ) {
      this.welcomeCallback = callback;
   }

   onEntityList(callback: (ids: number[]) => void) {
      this.listCallback = callback;
   }

   onSpawnEntity(
      callback: (id: number, name: string, x: number, y: number, z: number) => void,
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
      // TODO: Replace with packet class
      this.sendMessage([Packet.Type.Hello, playername]);
   }

   sendWho(ids: number[]) {
      // TODO: Replace with packet class
      this.sendMessage([Packet.Type.Who, ...ids]);
   }

   sendMove(flag: number, x: number, y: number, z: number, orientation: number) {
      // TODO: Replace with packet class
      this.sendMessage([Packet.Type.Move, getMSTime(), flag, x, y, z, orientation]);
   }
}
