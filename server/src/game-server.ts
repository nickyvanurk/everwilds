import * as THREE from 'three';
import type { WebSocketServer } from 'ws';
import { World } from './world';
import { Socket } from './socket';
import * as Packet from '../../shared/src/packets';
import { Player } from './player';
import type { Unit } from './unit';

export class GameServer {
  private ups = 20;
  private server: WebSocketServer;
  private world: World;

  private sockets: { [key: number]: Socket } = {};
  private color = new THREE.Color();

  constructor(wss: WebSocketServer) {
    this.server = wss;
    this.world = new World();

    this.server.on('connection', ws => {
      log.info('New connection established');

      const socket = new Socket(ws);

      socket.initiateHandshake();

      let player: Player | null = null;

      socket.on('hello', ({ playerName }) => {
        playerName = 'Player';
        const color = this.color.setHSL(Math.random(), 0.96, 0.5).getHex();
        player = new Player(socket, playerName, color);
        player.spawn(
          (Math.random() - 0.5) * 20,
          0,
          (Math.random() - 0.5) * 20,
          Math.random() * (Math.PI * 2),
        );
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
            player.health.max,
            player.health.current,
          ),
        );

        this.world.pushUnitsToPlayer(player!);
        this.world.broadcast(
          Packet.Spawn.serialize(
            player.id,
            player.flags,
            player.name,
            player.x,
            player.y,
            player.z,
            player.orientation,
            player.color,
            player.health.max,
            player.health.current,
          ),
          player.id,
        );

        log.info(`Player ${player.name} joined the game`);
        this.sockets[socket.id] = socket;
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
        delete this.sockets[socket.id];

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

        const targetUnit = this.world.getUnitById(targetId);
        if (!targetUnit) return;

        if (player.id === targetId) return;

        player.startAttack(targetUnit);

        player.onAttack = () => {
          if (!player || !targetUnit) {
            log.error('Player or target entity is missing');
            return;
          }

          if (targetUnit.isAlive()) {
            const damage = 20;
            targetUnit.damage(damage, player);

            if (!targetUnit.isAlive()) {
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

    eventBus.on(
      'unitDamage',
      (attacker: Unit, victim: Unit, amount: number) => {
        this.world.broadcast(
          Packet.AttackSwing.serialize(
            attacker.id,
            victim.id,
            amount,
            victim.health.current,
          ),
        );
      },
    );

    eventBus.on('unitDie', (unit: Unit) => {
      this.world.broadcast(Packet.Despawn.serialize(unit.id));
    });

    eventBus.on('unitRespawn', (unit: Unit) => {
      this.world.broadcast(
        Packet.Spawn.serialize(
          unit.id,
          unit.flags,
          unit.name,
          unit.x,
          unit.y,
          unit.z,
          unit.orientation,
          unit.color,
          unit.health.max,
          unit.health.current,
        ),
      );
    });
  }

  update(dt: number) {
    this.world.update(dt);
  }

  shutdown() {
    log.info('Shutting down game server...');
    this.server.close(() => log.info('Server shut down.'));
  }
}
