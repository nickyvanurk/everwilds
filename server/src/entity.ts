export class Entity {
   constructor(
      public id: number,
      public x = 0,
      public y = 0,
      public z = 0,
   ) {}

   getState(): (string | number)[] {
      return [this.id, this.x, this.y, this.z];
   }
}
