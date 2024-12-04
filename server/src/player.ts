import { Entity } from './entity';
import type { Session } from './session';

export class Player extends Entity {
   flag = 0;

   constructor(public session: Session, public name: string) {
      super(Number.parseInt(`5${Math.floor(Math.random() * 1000)}`)); // TODO: ws wrapper + use connection id
   }

   getState(): (string | number)[] {
      return [this.id, this.flag, this.name, this.x, this.y, this.z, this.orientation];
   }
}
