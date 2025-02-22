import { WebSocketServer } from 'ws';
import { World } from './world';
import { Socket } from './socket';
import * as Packet from '../../shared/src/packets';
import { Player } from './player';

export class GameServer {
  private ups = 20;
  private server: WebSocketServer;
  private world: World;

  private sockets: { [key: number]: Socket } = {};
  private socketIdCounter = 0;

  constructor(port: number) {
    this.server = new WebSocketServer({ port });
    this.world = new World();

    log.info(`Spellforge game server started on port ${port}`);

    this.server.on('connection', ws => {
      log.info('New connection established');

      const socket = new Socket(ws);
      this.socketIdCounter++;

      socket.initiateHandshake();

      let player: Player | null = null;

      socket.on('hello', ({ playerName }) => {
        playerName = `Player${this.world.getPlayerCount() + 1}`;
        player = new Player(socket, playerName);
        this.world.addPlayer(player);

        socket.send(
          Packet.Welcome.serialize(
            player.id,
            player.flags,
            playerName,
            player.x,
            player.y,
            player.z,
            player.orientation,
          ),
        );

        this.world.pushPlayersToPlayer(player!);
        this.world.broadcast(
          Packet.Spawn.serialize(
            player!.id,
            player!.flags,
            playerName,
            player!.x,
            player!.y,
            player!.z,
            player!.orientation,
          ),
          player!.id,
        );

        log.info(`Player ${playerName} joined the game`);
        this.sockets[this.socketIdCounter] = socket;
      });

      socket.on('move', ({ flags, x, y, z, orientation }) => {
        if (!player) return;

        player.flags = flags;
        player.x = x;
        player.y = y;
        player.z = z;
        player.orientation = orientation;

        this.world.broadcast(
          Packet.MoveUpdate.serialize(player.id, flags, x, y, z, orientation),
          player.id,
        );
      });

      socket.on('close', () => {
        if (!player) return;

        this.world.removePlayer(player);
        delete this.sockets[this.socketIdCounter];

        log.info(`Player ${player.name} left the game`);
      });

      socket.on('chatMessage', ({ message }) => {
        if (!player) return;

        message = (message || '').replace(/(<([^>]+)>)/gi, '');

        this.world.broadcast(
          Packet.ChatMessage.serialize(player.name, message),
        );
      });
    });

    this.server.on('error', err =>
      console.error(`Server error: ${err.message}`),
    );

    setInterval(() => {
      this.update(1000 / this.ups);
    }, 1000 / this.ups);
  }

  update(dt: number) {
    this.world.update(dt);
  }

  shutdown() {
    log.info('Shutting down game server...');
    this.server.close(() => log.info('Server shut down.'));
  }
}
