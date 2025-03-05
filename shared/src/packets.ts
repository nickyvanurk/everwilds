export enum Opcode {
  Hello,
  Welcome,
  Spawn,
  Despawn,
  Move,
  MoveUpdate,
  ChatMessage,
  AttackStart,
  AttackSwing,
  AttackStop,
  Respawn,
}

export type Serialized = (string | number)[];

export const Hello = {
  serialize(playerName: string) {
    return [Opcode.Hello, playerName];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      playerName: data[i++] as number,
    };
  },
};

export const Welcome = {
  serialize(
    id: number,
    flags: number,
    name: string,
    x: number,
    y: number,
    z: number,
    orientation: number,
    color: number,
  ) {
    return [Opcode.Welcome, id, flags, name, x, y, z, orientation, color];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      id: data[i++] as number,
      flags: data[i++] as number,
      name: data[i++] as string,
      x: data[i++] as number,
      y: data[i++] as number,
      z: data[i++] as number,
      orientation: data[i++] as number,
      color: data[i++] as number,
    };
  },
};

export const Spawn = {
  serialize(
    id: number,
    flags: number,
    name: string,
    x: number,
    y: number,
    z: number,
    orientation: number,
    color: number,
  ) {
    return [Opcode.Spawn, id, flags, name, x, y, z, orientation, color];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      id: data[i++] as number,
      flags: data[i++] as number,
      name: data[i++] as string,
      x: data[i++] as number,
      y: data[i++] as number,
      z: data[i++] as number,
      orientation: data[i++] as number,
      color: data[i++] as number,
    };
  },
};

export const Despawn = {
  serialize(id: number) {
    return [Opcode.Despawn, id];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      id: data[i++] as number,
    };
  },
};

export const MoveUpdate = {
  serialize(
    id: number,
    flags: number,
    x: number,
    y: number,
    z: number,
    orientation: number,
  ) {
    return [Opcode.MoveUpdate, id, flags, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      id: data[i++] as number,
      flags: data[i++] as number,
      x: data[i++] as number,
      y: data[i++] as number,
      z: data[i++] as number,
      orientation: data[i++] as number,
    };
  },
};

export const Move = {
  serialize(
    flags: number,
    x: number,
    y: number,
    z: number,
    orientation: number,
  ) {
    return [Opcode.Move, flags, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      flags: data[i++] as number,
      x: data[i++] as number,
      y: data[i++] as number,
      z: data[i++] as number,
      orientation: data[i++] as number,
    };
  },
};

export const ChatMessage = {
  serialize(playerName: string, message: string) {
    return [Opcode.ChatMessage, playerName, message];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      playerName: data[i++] as string,
      message: data[i++] as string,
    };
  },
};

export const AttackStart = {
  serialize(targetId: number) {
    return [Opcode.AttackStart, targetId];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      targetId: data[i++] as number,
    };
  },
};

export const AttackSwing = {
  serialize(
    attackerId: number,
    targetId: number,
    damage: number,
    targetHealth: number,
  ) {
    return [Opcode.AttackSwing, attackerId, targetId, damage, targetHealth];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      attackerId: data[i++] as number,
      targetId: data[i++] as number,
      damage: data[i++] as number,
      targetHealth: data[i++] as number,
    };
  },
};

export const AttackStop = {
  serialize() {
    return [Opcode.AttackStop];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
    };
  },
};

export const Respawn = {
  serialize(id: number, x: number, y: number, z: number, orientation: number) {
    return [Opcode.Respawn, id, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      id: data[i++] as number,
      x: data[i++] as number,
      y: data[i++] as number,
      z: data[i++] as number,
      orientation: data[i++] as number,
    };
  },
};
