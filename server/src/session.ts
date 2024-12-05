import { Player } from './player';
import type { World } from './world';
import type { Socket } from './socket';
import { getMSTime } from '../../shared/src/time';
import * as Packet from '../../shared/src/packets';

export class Session {
   private player: Player | null = null;

   private pendingTimeSyncRequests = new Map<number, number>();
   private timeSyncTimer = 0;
   private timeSyncNextCounter = 0;
   private timeSyncClockDeltaQueue: { clockDelta: number, roundTripDuration: number }[] = [];
   timeSyncClockDelta = 0;

   private helloCallback = (_name: string) => {};

   constructor(
      public id: number,
      public socket: Socket,
      private world: World,
   ) {
      socket.onPacket(this.handlePacket.bind(this));
      socket.onClose(this.handleSocketClose.bind(this));
      socket.initiateHandshake();
   }

   update(dt: number) {
      if (this.timeSyncTimer > 0) {
         if (dt >= this.timeSyncTimer) {
            this.sendTimeSync();
         } else {
            this.timeSyncTimer -= dt;
         }
      }
   }

   handlePacket(opcode: number, data: (string | number)[]) {
      const handlers = {
         [Packet.PacketOpcode.Hello]: this.handleHelloOpcode,
         [Packet.PacketOpcode.Move]: this.handleMoveOpcode,
         [Packet.PacketOpcode.TimeSyncResponse]: this.handleTimeSyncResponseOpcode,
      };

      // @ts-ignore
      const handler = handlers[opcode];
      if (!handler) {
         console.log(`No handler found for opcode: ${opcode}`);
         return;
      }

      handler.call(this, ...data);
   }

   handleSocketClose() {
      if (!this.player) return;

      this.world.removePlayer(this.player);
      this.player = null;
   }

   handleHelloOpcode(clientTime: number, name: string) {
      this.player = new Player(this, name);
      this.world.addPlayer(this.player);

      this.socket.send(Packet.Welcome.serialize(getMSTime(), this.player.id, this.player.flag, name, this.player.x, this.player.y, this.player.z, this.player.orientation));

      const serverTime = this.adjustClientMovementTime(clientTime);
      this.player.serverTime = serverTime;

      this.world.pushEntitiesToPlayer(this.player!);
      this.world.broadcast(Packet.Spawn.serialize(this.player!.serverTime, this.player!.id, this.player!.flag, name, this.player!.x, this.player!.y, this.player!.z, this.player!.orientation), this.player!.id);

      this.sendTimeSync();

      this.helloCallback(name);
   }

   onHello(callback: (name: string) => void) {
      this.helloCallback = callback
   };

   handleMoveOpcode(clientTime: number, flag: number, x: number, y: number, z: number, orientation: number) {
      if (!this.player) return;

      this.player.flag = flag;
      this.player.x = x;
      this.player.y = y;
      this.player.z = z;
      this.player.orientation = orientation;

      const serverTime = this.adjustClientMovementTime(clientTime);
      this.player.serverTime = serverTime;

      this.world.broadcast(Packet.MoveUpdate.serialize(serverTime, this.player.id, flag, x, y, z, orientation), this.player.id);
   }

   resetTimeSync() {
      this.pendingTimeSyncRequests.clear();
      this.timeSyncNextCounter = 0;
   }

   sendTimeSync() {
      this.socket.send(Packet.TimeSync.serialize(this.timeSyncNextCounter));

      this.pendingTimeSyncRequests.set(this.timeSyncNextCounter, getMSTime());

      // Schedule next sync in 10 sec (except for the 5 first packets, which are spaced by 2s)
      this.timeSyncTimer = this.timeSyncNextCounter < 4 ? 2000 : 10000;
      this.timeSyncNextCounter++;
   }

   adjustClientMovementTime(timeOfMovementInClientTime: number) {
      const timeOfMovementInServerTime = timeOfMovementInClientTime + this.timeSyncClockDelta;
      if (this.timeSyncClockDelta === 0 || timeOfMovementInServerTime < 0 || timeOfMovementInServerTime > 0xFFFFFFFF) {
         console.error('The computed movement time using clockDelta is erronous. Using fallback instead');
         return getMSTime();
      } else {
         return timeOfMovementInServerTime;
      }
   }

   handleTimeSyncResponseOpcode(sequenceIndex: number, clientTime: number) {
      if (!this.pendingTimeSyncRequests.has(sequenceIndex))
         return;

      const serverTimeAtSent = this.pendingTimeSyncRequests.get(sequenceIndex)!;
      this.pendingTimeSyncRequests.delete(sequenceIndex);

      const serverTimeAtReceived = getMSTime();
      const roundTripDuration = serverTimeAtReceived - serverTimeAtSent;
      const lagDelay = roundTripDuration / 2;

      const clockDelta = serverTimeAtSent + lagDelay - clientTime;
      this.timeSyncClockDeltaQueue[(this.timeSyncNextCounter - 1) % 6] = ({ clockDelta, roundTripDuration });

      // Implementation of the technique described here: https://web.archive.org/web/20180430214420/http://www.mine-control.com/zack/timesync/timesync.html
      // to reduce the skew induced by dropped TCP packets that get resent.

      const latencyAccumulator = this.timeSyncClockDeltaQueue.map(({ roundTripDuration }) => roundTripDuration);
      latencyAccumulator.sort((a, b) => a - b);

      const latencyMedian = latencyAccumulator[Math.floor(latencyAccumulator.length / 2)];
      const latencyStandardDeviation = Math.sqrt(latencyAccumulator.reduce((acc, latency) => acc + (latency - latencyMedian) ** 2, 0) / latencyAccumulator.length);

      const filteredClockDeltaQueue = this.timeSyncClockDeltaQueue.filter(({ roundTripDuration }) => roundTripDuration < latencyMedian + latencyStandardDeviation);

      if (filteredClockDeltaQueue.length) {
         const meanClockDelta = filteredClockDeltaQueue.reduce((acc, { clockDelta }) => acc + clockDelta, 0) / filteredClockDeltaQueue.length;
         this.timeSyncClockDelta = meanClockDelta;
      } else {
         this.timeSyncClockDelta = this.timeSyncClockDeltaQueue[this.timeSyncClockDeltaQueue.length - 1].clockDelta;
      }
   }
}