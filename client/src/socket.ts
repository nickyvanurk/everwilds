import EventEmitter from 'eventemitter3';
import * as Packet from '../../shared/src/packets';
import type { NetworkSimulator } from './network-simulator';
import { isDebug } from './utils';

export class Socket extends EventEmitter {
  clockDelta = 0;

  private ws: WebSocket | null = null;

  constructor(
    private host: string,
    private port: number,
    private netsim: NetworkSimulator,
  ) {
    super();
  }

  connect() {
    const url = `ws://${this.host}:${this.port}`;
    log.debug(`Connecting to ${url}`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      log.debug('Connected to server');
    };

    this.ws.onmessage = ev => {
      if (ev.data === 'go') {
        this.emit('connected');
        return;
      }

      this.receiveMessage(ev.data);
    };

    this.ws.onerror = ev => {
      log.error(`Error: ${ev}`);
    };

    this.ws.onclose = () => {
      this.emit('disconnected');
    };
  }

  send(message: (string | number)[]) {
    const send = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      }
    };

    isDebug() ? this.netsim.enqueue(send) : send();
  }

  receiveMessage(message: string) {
    const data = JSON.parse(message);

    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        this.receiveActionBatch(data);
      } else {
        this.receiveAction(data);
      }
    }
  }

  receiveActionBatch(data: (string | number)[][]) {
    for (const action of data) {
      this.receiveAction(action);
    }
  }

  receiveAction(data: (string | number)[]) {
    const opcode = +data[0];

    switch (opcode) {
      case Packet.Opcode.Welcome: {
        const welcomeData = Packet.Welcome.deserialize(data);
        this.emit('welcome', welcomeData);
        break;
      }
      case Packet.Opcode.Spawn:
        this.emit('spawn', Packet.Spawn.deserialize(data));
        break;
      case Packet.Opcode.Despawn:
        this.emit('despawn', Packet.Despawn.deserialize(data));
        break;
      case Packet.Opcode.MoveUpdate:
        this.emit('move', Packet.MoveUpdate.deserialize(data));
        break;
      default:
        log.error(`No handler found for opcode: ${opcode}`);
    }
  }
}
