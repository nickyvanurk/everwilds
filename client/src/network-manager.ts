import type { Game } from './game';
import { NetworkSimulator } from './network-simulator';
import { Socket } from './socket';
import * as Packet from '../../shared/src/packets';

export class NetworkManager {
  socket: Socket;
  netsim = new NetworkSimulator();

  constructor(game: Game, host: string, port: number) {
    this.socket = new Socket(host, port, this.netsim);

    for (const [name, handler] of Object.entries(Packet.clientHandlers)) {
      this.socket.on(name, handler.bind(game));
    }
  }

  connect(requestedPlayerName: string) {
    this.socket.connect();

    this.socket.on('connected', () => {
      log.debug('Starting client/server handshake');
      this.socket.send(Packet.Hello.serialize(requestedPlayerName));
    });

    this.socket.on('disconnected', () => {
      log.debug('Disconnected from server');
    });
  }

  update(dt: number) {
    this.netsim.update(dt);
  }
}
