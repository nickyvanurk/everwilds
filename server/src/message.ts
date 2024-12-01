import { MessageType } from '../../shared/src/gametypes';
import type { Entity } from './entity';

export type Message = {
   serialize(): (string | number)[];
};

export class Spawn {
   constructor(private entity: Entity) {}

   serialize() {
      return [MessageType.Spawn, ...this.entity.getState()];
   }
}

export class Despawn {
   constructor(private entityId: number) {}

   serialize() {
      return [MessageType.Despawn, this.entityId];
   }
}

export class List {
   constructor(private ids: number[]) {}

   serialize() {
      return [MessageType.List, ...this.ids];
   }
}

export class Move {
   constructor(private entity: Entity) {}

   serialize() {
      return [
         MessageType.Move,
         this.entity.id,
         this.entity.x,
         this.entity.y,
         this.entity.z,
      ];
   }
}
