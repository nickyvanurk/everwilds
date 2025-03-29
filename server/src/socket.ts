import EventEmitter from 'eventemitter3';
import type { WebSocket } from 'ws';
import * as Packet from '../../shared/src/packets';

export class Socket extends EventEmitter {
  id: number;

  static assignedIds = new Set<number>();
  static nextId = 1;

  constructor(public ws: WebSocket) {
    super();

    this.id = Socket.getNextId();

    ws.on('message', (message: (string | number)[]) => {
      const data = JSON.parse(message.toString());
      const opcode = +data[0];

      switch (opcode) {
        case Packet.Opcode.Hello:
          this.emit('hello', Packet.Hello.deserialize(data));
          break;
        case Packet.Opcode.Move:
          this.emit('move', Packet.Move.deserialize(data));
          break;
        case Packet.Opcode.ChatMessage:
          this.emit('chatMessage', Packet.ChatMessage.deserialize(data));
          break;
        case Packet.Opcode.AttackStart:
          this.emit('attackStart', Packet.AttackStart.deserialize(data));
          break;
        case Packet.Opcode.AttackStop:
          this.emit('attackStop', Packet.AttackStop.deserialize(data));
          break;
        default:
          log.error(`No handler found for opcode: ${opcode}`);
      }
    });

    ws.on('error', error => {
      log.error(`Error: ${error}`);
    });

    ws.on('close', () => {
      this.emit('close');
    });
  }

  isOpen() {
    return this.ws.readyState === this.ws.OPEN;
  }

  initiateHandshake() {
    if (!this.isOpen()) return;

    this.ws.send('go');
  }

  send(message: Packet.Serialized) {
    if (!this.isOpen()) return;

    this.ws.send(JSON.stringify(message));
  }

  static getNextId() {
    while (Socket.assignedIds.has(Socket.nextId)) {
      Socket.nextId++;
    }

    Socket.assignedIds.add(Socket.nextId);
    return Socket.nextId;
  }

  static releaseId(id: number) {
    Socket.assignedIds.delete(id);

    if (id < Socket.nextId) {
      Socket.nextId = id;
    }
  }
}
