import { Player } from './player';
import type { World } from './world';
import type { Socket } from './socket';
import * as Packet from '../../shared/src/packets';
import { getMSTime } from '../../shared/src/time';

export class Session {
   private player: Player | null = null;

   private pendingTimeSyncRequests = new Map<number, number>();
   private timeSyncTimer = 0;
   private timeSyncNextCounter = 0;
   private timeSyncClockDeltaQueue: { clockDelta: number, roundTripDuration: number }[] = [];
   private timeSyncClockDelta = 0;

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
      Packet.handlePacket(this, opcode, data);
   }

   handleSocketClose() {
      if (!this.player) return;

      this.world.removePlayer(this.player);
      this.player = null;
   }

   handleHelloOpcode(name: string) {
      this.player = new Player(this, name);
      this.world.addPlayer(this.player);

      this.socket.sendPacket([
         Packet.Type.Welcome,
         this.player.flag,
         this.player.id,
         name,
         this.player.x,
         this.player.y,
         this.player.z,
         this.player.orientation
      ]);

      this.world.pushEntitiesToPlayer(this.player);
      this.world.broadcast(new Packet.Spawn(this.player), this.player.id);

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

      this.world.broadcast(new Packet.MoveUpdate(this.player, flag, serverTime, orientation), this.player.id);
   }

   resetTimeSync() {
      this.pendingTimeSyncRequests.clear();
      this.timeSyncNextCounter = 0;
   }

   sendTimeSync() {
      this.socket.sendPacket([Packet.Type.TimeSync, this.timeSyncNextCounter]);

      this.pendingTimeSyncRequests.set(this.timeSyncNextCounter, getMSTime());

      // Schedule next sync in 10 sec (except for the 5 first packets, which are spaced by 2s)
      this.timeSyncTimer = this.timeSyncNextCounter < 4 ? 2000 : 10000;
      this.timeSyncNextCounter++;
   }

   adjustClientMovementTime(timeOfMovementInClientTime: number) {
      const timeOfMovementInServerTime = Math.floor(timeOfMovementInClientTime + this.timeSyncClockDelta);
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