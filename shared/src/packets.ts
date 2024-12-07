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
  serialize(timestamp: number, id: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.Welcome,
      timestamp,
      id,
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
      id: data[i++],
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
  serialize(timestamp: number, id: number, flag: number, name: string, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.Spawn,
      timestamp,
      id,
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
      id: data[i++],
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
  serialize(id: number) {
    return [
      PacketOpcode.Despawn,
      id
    ];
  },

  deserialize(data: any[]) {
    let i = 0;
    return {
      opcode: data[i++],
      id: data[i++]
    };
  }
};

export const MoveUpdate = {
  serialize(timestamp: number, id: number, flag: number, x: number, y: number, z: number, orientation: number) {
    return [
      PacketOpcode.MoveUpdate,
      timestamp,
      id,
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
      id: data[i++],
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