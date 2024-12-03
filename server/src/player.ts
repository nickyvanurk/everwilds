import { Entity } from './entity';
import type { WorldSession } from './world-session';

export class Player extends Entity {
   constructor(public session: WorldSession, public name: string) {
      super(Number.parseInt(`5${Math.floor(Math.random() * 1000)}`)); // TODO: ws wrapper + use connection id
   }

   getState(): (string | number)[] {
      return [this.id, this.name, this.x, this.y, this.z];
   }
}
