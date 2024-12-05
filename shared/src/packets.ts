export enum PacketOpcode {
  Hello,
  Welcome,
  Spawn,
  Despawn,
  Move,
  TimeSync,
  TimeSyncResponse,
  MoveUpdate,
};

export const Hello = {
  serialize(playerName: string) {
    return [
      PacketOpcode.Hello,
      playerName
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      playerName: data[i++]
    };
  }
};

export const Welcome = {
  serialize(timestamp: number, playerId: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.Welcome,
      timestamp,
      playerId,
      flag,
      name,
      x,
      y,
      z,
      orientation
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      timestamp: data[i++],
      playerId: data[i++],
      flag: data[i++],
      name: data[i++],
      x: data[i++],
      y: data[i++],
      z: data[i++],
      orientation: data[i++]
    };
  }
};

export const Spawn = {
  serialize(timestamp: number, entityId: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.Spawn,
      timestamp,
      entityId,
      flag,
      name,
      x,
      y,
      z,
      orientation
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      timestamp: data[i++],
      entityId: data[i++],
      flag: data[i++],
      name: data[i++],
      x: data[i++],
      y: data[i++],
      z: data[i++],
      orientation: data[i++]
    };
  }
};

export const Despawn = {
  serialize(entityId: number) {
    return [
      PacketOpcode.Despawn,
      entityId
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      entityId: data[i++]
    };
  }
};

export const MoveUpdate = {
  serialize(timestamp: number, entityId: number, flag: number, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.MoveUpdate,
      timestamp,
      entityId,
      flag,
      x,
      y,
      z,
      orientation
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      timestamp: data[i++],
      entityId: data[i++],
      flag: data[i++],
      x: data[i++],
      y: data[i++],
      z: data[i++],
      orientation: data[i++]
    };
  }
};

export const Move = {
  serialize(timestamp: number, flag: number, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.Move,
      timestamp,
      flag,
      x,
      y,
      z,
      orientation
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      timestamp: data[i++],
      flag: data[i++],
      x: data[i++],
      y: data[i++],
      z: data[i++],
      orientation: data[i++]
    };
  }
};

export const TimeSync = {
  serialize(sequenceIndex: number) {
    return [
      PacketOpcode.TimeSync,
      sequenceIndex
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      sequenceIndex: data[i++]
    };
  }
};

export const TimeSyncResponse = {
  serialize(sequenceIndex: number, timestamp: number) {
    return [
      PacketOpcode.TimeSyncResponse,
      sequenceIndex,
      timestamp
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      sequenceIndex: data[i++],
      timestamp: data[i++]
    };
  }
};