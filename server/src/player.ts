import { Entity } from './entity';
import { Socket } from './socket';

export class Player extends Entity {
   flag = 0;

   constructor(public socket: Socket, public name: string) {
      super(Number.parseInt(`5${Math.floor(Math.random() * 1000)}`));
   }

   getState(): (string | number)[] {
      return [this.id, this.flag, this.name, this.x, this.y, this.z, this.orientation];
   }
}
