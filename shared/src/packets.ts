export enum Opcode {
  Hello,
  Welcome,
  Spawn,
  Despawn,
  Move,
  TimeSync,
  TimeSyncResponse,
  MoveUpdate,
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
    timestamp: number,
    id: number,
    flags: number,
    name: string,
    x: number,
    y: number,
    z: number,
    orientation: number,
  ) {
    return [Opcode.Welcome, timestamp, id, flags, name, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      timestamp: data[i++] as number,
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

export const Spawn = {
  serialize(
    timestamp: number,
    id: number,
    flags: number,
    name: string,
    x: number,
    y: number,
    z: number,
    orientation: number,
  ) {
    return [Opcode.Spawn, timestamp, id, flags, name, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      timestamp: data[i++] as number,
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
    timestamp: number,
    id: number,
    flags: number,
    x: number,
    y: number,
    z: number,
    orientation: number,
  ) {
    return [Opcode.MoveUpdate, timestamp, id, flags, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      timestamp: data[i++] as number,
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
    timestamp: number,
    flags: number,
    x: number,
    y: number,
    z: number,
    orientation: number,
  ) {
    return [Opcode.Move, timestamp, flags, x, y, z, orientation];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      timestamp: data[i++] as number,
      flags: data[i++] as number,
      x: data[i++] as number,
      y: data[i++] as number,
      z: data[i++] as number,
      orientation: data[i++] as number,
    };
  },
};

export const TimeSync = {
  serialize(sequenceIndex: number) {
    return [Opcode.TimeSync, sequenceIndex];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      sequenceIndex: data[i++] as number,
    };
  },
};

export const TimeSyncResponse = {
  serialize(sequenceIndex: number, timestamp: number) {
    return [Opcode.TimeSyncResponse, sequenceIndex, timestamp];
  },

  deserialize(data: Serialized) {
    let i = 0;
    return {
      opcode: data[i++] as number,
      sequenceIndex: data[i++] as number,
      timestamp: data[i++] as number,
    };
  },
};
