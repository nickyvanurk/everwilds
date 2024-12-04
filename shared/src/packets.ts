import type { Client } from '../../client/src/client';
import type { Entity } from '../../server/src/entity';
import type { Session } from '../../server/src/session';

export enum Type {
   Hello = 0,
   Welcome = 1,
   Spawn = 2,
   Despawn = 3,
   Move = 4,
   TimeSync = 5,
   TimeSyncResponse = 6,
   MoveUpdate = 7,
}

export type Packet = {
   read: (data: (string | number)[]) => (string | number | number[])[];
   write: () => (string | number)[];
};

export class Welcome {
   constructor(private id: number, private name: string, private x: number, private y: number, private z: number) {}

   read(data: (string | number)[]) {
      const id = data[0] as number;
      const name = data[1] as string;
      const x = data[2] as number;
      const y = data[3] as number;
      const z = data[4] as number;
      return [id, name, x, y, z];
   }

   write() {
      return [Type.Welcome, this.id, this.name, this.x, this.y, this.z];
   }
}

export class Spawn {
   constructor(private entity: Entity) {}

   read(data: (string | number)[]) {
      let idx = 0;
      const id = data[idx++] as number;
      const flag = data[idx++] as number;
      const name = data[idx++] as string;
      const x = data[idx++] as number;
      const y = data[idx++] as number;
      const z = data[idx++] as number;
      const orientation = data[idx++] as number;
      return [id, flag, name, x, y, z, orientation];
   }

   write() {
      return [Type.Spawn, ...this.entity.getState()];
   }
}

export class Despawn {
   constructor(private entityId: number) {}

   read(data: (string | number)[]) {
      return [data[0] as number];
   }

   write() {
      return [Type.Despawn, this.entityId];
   }
}

export class MoveUpdate {
   constructor(private entity: Entity, private startMove: number, private timestamp: number, private orientation: number) {}

   read(data: (string | number)[]) {
      const timestamp = data[0] as number;
      const flag = data[1] as number;
      const id = data[2] as number;
      const x = data[3] as number;
      const y = data[4] as number;
      const z = data[5] as number;
      const orientation = data[6] as number;
      return [timestamp, flag, id, x, y, z, orientation];
   }

   write() {
      return [
         Type.MoveUpdate,
         this.timestamp,
         this.startMove,
         this.entity.id,
         this.entity.x,
         this.entity.y,
         this.entity.z,
         this.orientation,
      ];
   }
}

export class Move {
   constructor(private entity: Entity, private startMove: number, private timestamp: number, private orientation: number) {}

   read(data: (string | number)[]) {
      const timestamp = data[0] as number;
      const flag = data[1] as number;
      const x = data[2] as number;
      const y = data[3] as number;
      const z = data[4] as number;
      const orientation = data[5] as number;
      return [timestamp, flag, x, y, z, orientation];
   }

   write() {
      return [
         Type.Move,
         this.timestamp,
         this.startMove,
         this.entity.id,
         this.entity.x,
         this.entity.y,
         this.entity.z,
         this.orientation,
      ];
   }
}

export class Null {
   write() {
      return [];
   }
}

export class Hello implements Packet {
   read(data: (string | number)[]) {
      return [data[0]];
   }

   write() {
      return [Type.Hello];
   }
}

export class TimeSync {
   constructor(private sequenceIndex: number) {}

   read(data: (string | number)[]) {
      return [data[0] as number];
   }

   write() {
      return [Type.TimeSync, this.sequenceIndex];
   }
}

export class TimeSyncResponse {
   constructor(private timestamp: number) {}

   read(data: (string | number)[]) {
      const sequenceIndex = data[0] as number;
      const clientTime = data[1] as number;
      return [sequenceIndex, clientTime];
   }

   write() {
      return [Type.TimeSyncResponse, this.timestamp];
   }
}

// Split between server and client packets
const packetLookup: { [key: number]: any } = {
   [Type.Hello]: Hello,
   [Type.Welcome]: Welcome,
   [Type.Spawn]: Spawn,
   [Type.Despawn]: Despawn,
   [Type.Move]: Move,
   [Type.MoveUpdate]: MoveUpdate,
   [Type.TimeSync]: TimeSync,
   [Type.TimeSyncResponse]: TimeSyncResponse,
};

// Have different handlers for server and client
export function handlePacket(handlerClass: Session | Client, opcode: number, data: any[]) {
   const packetClass = packetLookup[opcode];
   if (!packetClass) {
      console.log(`No packet found for opcode: ${opcode}`);
      return;
   }

   // @ts-ignore
   const handler = handlerClass[`handle${Type[opcode]}Opcode`];
   if (!handler) {
      console.log(`No handler found for opcode: ${opcode}`);
      return;
   }

   //@ts-ignore
   const packet = new packetClass();
   if (packet instanceof Null) {
      return;
   }

   //@ts-ignore
   handler.bind(handlerClass)(...packet.read(data));
}
