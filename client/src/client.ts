import { MessageType } from '../../shared/src/gametypes';

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
      _x: number,
      _y: number,
      _z: number,
   ) => {};
   despawnCallback = (_id: number) => {};
   moveCallback = (_id: number, _x: number, _y: number, _z: number) => {};

   // biome-ignore lint/suspicious/noExplicitAny: <explanation>
   private handlers: any[] = [];

   constructor(
      private host: string,
      private port: number,
   ) {
      this.handlers[MessageType.Welcome] = this.receiveWelcome.bind(this);
      this.handlers[MessageType.List] = this.receiveList.bind(this);
      this.handlers[MessageType.Spawn] = this.receiveSpawn.bind(this);
      this.handlers[MessageType.Despawn] = this.receiveDespawn.bind(this);
      this.handlers[MessageType.Move] = this.receiveMove.bind(this);
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

      // console.log(`Received: ${data}`);

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

   receiveAction(data: (string | number)[]) {
      const action = +data[0];

      if (this.handlers[action]) {
         this.handlers[action](data);
      } else {
         console.log(`Unknown action: ${action}`);
      }
   }

   receiveActionBatch(data: (string | number)[][]) {
      for (const action of data) {
         this.receiveAction(action);
      }
   }

   receiveWelcome(data: (string | number)[]) {
      const id = +data[1];
      const name = data[2] as string;
      const x = +data[3];
      const y = +data[4];
      const z = +data[5];

      this.welcomeCallback(id, name, x, y, z);
   }

   receiveList(data: (string | number)[]) {
      this.listCallback(data.slice(1) as number[]);
   }

   receiveSpawn(data: (string | number)[]) {
      const id = +data[1];
      const x = +data[2];
      const y = +data[3];
      const z = +data[4];

      this.spawnEntityCallback(id, x, y, z);

      console.log('Spawn:', data);
   }

   receiveDespawn(data: (string | number)[]) {
      const id = +data[1];

      this.despawnCallback(id);

      console.log('Despawn:', data);
   }

   receiveMove(data: (string | number)[]) {
      const id = +data[1];
      const x = +data[2];
      const y = +data[3];
      const z = +data[4];

      this.moveCallback(id, x, y, z);
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
      callback: (id: number, x: number, y: number, z: number) => void,
   ) {
      this.spawnEntityCallback = callback;
   }

   onEntityMove(
      callback: (id: number, x: number, y: number, z: number) => void,
   ) {
      this.moveCallback = callback;
   }

   onDespawnEntity(callback: (id: number) => void) {
      this.despawnCallback = callback;
   }

   sendHello(playername: string) {
      this.sendMessage([MessageType.Hello, playername]);
   }

   sendWho(ids: number[]) {
      this.sendMessage([MessageType.Who, ...ids]);
   }

   sendMove(x: number, y: number, z: number) {
      this.sendMessage([MessageType.Move, x, y, z]);
   }
}
