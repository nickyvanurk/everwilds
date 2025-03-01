import * as THREE from 'three';
import type { WebSocketServer } from 'ws';
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
  private color = new THREE.Color();

  constructor(wss: WebSocketServer) {
    this.server = wss;
    this.world = new World();

    this.server.on('connection', ws => {
      log.info('New connection established');

      const socket = new Socket(ws);
      this.socketIdCounter++;

      socket.initiateHandshake();

      let player: Player | null = null;

      socket.on('hello', ({ playerName }) => {
        playerName = 'Player';
        const color = this.color.setHSL(Math.random(), 0.9, 0.5).getHex();
        player = new Player(socket, playerName, color);
        player.name += `${player.id}`;
        player.x = Math.random() * 15;
        player.y = 0;
        player.z = Math.random() * 15;
        player.orientation = Math.random() * Math.PI * 2;

        this.world.addPlayer(player);

        socket.send(
          Packet.Welcome.serialize(
            player.id,
            player.flags,
            player.name,
            player.x,
            player.y,
            player.z,
            player.orientation,
            player.color,
          ),
        );

        this.world.pushPlayersToPlayer(player!);
        this.world.broadcast(
          Packet.Spawn.serialize(
            player!.id,
            player!.flags,
            player!.name,
            player!.x,
            player!.y,
            player!.z,
            player!.orientation,
            player.color,
          ),
          player!.id,
        );

        log.info(`Player ${player.name} joined the game`);
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

        if (!message) return;

        this.world.broadcast(
          Packet.ChatMessage.serialize(player.name, message),
        );
      });

      socket.on('attackStart', ({ targetId }) => {
        if (!player) return;

        const targetEntity = this.world.getPlayerById(targetId);
        if (!targetEntity) return;

        if (player.id === targetId) return;

        player.startAttack(targetEntity);

        player.onAttack = () => {
          if (!player || !targetEntity) {
            log.error('Player or target entity is missing');
            return;
          }

          if (targetEntity.isAlive()) {
            const damage = 20;
            targetEntity.damage(damage);

            this.world.broadcast(
              Packet.AttackSwing.serialize(
                player.id,
                targetId,
                damage,
                targetEntity.health.current,
              ),
            );

            if (!targetEntity.isAlive()) {
              targetEntity.x = Math.random() * 15;
              targetEntity.y = 0;
              targetEntity.z = Math.random() * 15;
              targetEntity.health.current = targetEntity.health.max;
              targetEntity.orientation = Math.random() * Math.PI * 2;
              this.world.broadcast(
                Packet.Respawn.serialize(
                  targetEntity.id,
                  targetEntity.x,
                  targetEntity.y,
                  targetEntity.z,
                  targetEntity.orientation,
                ),
              );

              player.stopAttack();
            }
          }
        };
      });

      socket.on('attackStop', () => {
        if (!player) return;

        player.stopAttack();
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
