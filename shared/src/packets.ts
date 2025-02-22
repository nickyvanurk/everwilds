import * as handlers from '../../client/src/packet-handler';

export enum Opcode {
  Hello,
  Welcome,
  Spawn,
  Despawn,
  Move,
  MoveUpdate,
  ChatMessage,
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

export type Welcome = {
  opcode: Opcode;
  id: number;
  flags: number;
  name: string;
  x: number;
  y: number;
  z: number;
  orientation: number;
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
  ) {
    return [Opcode.Welcome, id, flags, name, x, y, z, orientation];
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
    };
  },
};

export type Spawn = {
  opcode: Opcode;
  id: number;
  flags: number;
  name: string;
  x: number;
  y: number;
  z: number;
  orientation: number;
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
  ) {
    return [Opcode.Spawn, id, flags, name, x, y, z, orientation];
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
    };
  },
};

export type Despawn = {
  opcode: Opcode;
  id: number;
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

export type MoveUpdate = {
  opcode: Opcode;
  id: number;
  flags: number;
  x: number;
  y: number;
  z: number;
  orientation: number;
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

export type Move = {
  opcode: Opcode;
  flags: number;
  x: number;
  y: number;
  z: number;
  orientation: number;
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

export type ChatMessage = {
  opcode: Opcode;
  playerName: string;
  message: string;
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

export const clientHandlers = {
  welcome: handlers.handleWelcome,
  spawn: handlers.handleSpawn,
  despawn: handlers.handleDespawn,
  move: handlers.handleMove,
  chatMessage: handlers.handleChatMessage,
};
