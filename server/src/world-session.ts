import { MessageType } from '../../shared/src/gametypes';
import { Player } from './player';
import type { World } from './world';
import type { WorldSocket } from './world-socket';
import * as Packet from './packets';
import { getMSTime } from '../../shared/src/time';

export class WorldSession {
   private player: Player | null = null;

   private pendingTimeSyncRequests = new Map<number, number>();
   private timeSyncTimer = 0;
   private timeSyncNextCounter = 0;
   private timeSyncClockDeltaQueue: { clockDelta: number, roundTripDuration: number }[] = [];
   private timeSyncClockDelta = 0;

   constructor(
      public id: number,
      public socket: WorldSocket,
      private world: World,
   ) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const handlers: any[] = [];
      handlers[MessageType.Hello] = this.handleHelloOpcode.bind(this);
      handlers[MessageType.Who] = this.handleWhoOpcode.bind(this);
      handlers[MessageType.Move] = this.handleMoveOpcode.bind(this);
      handlers[MessageType.TimeSyncResponse] = this.handleTimeSyncResponseOpcode.bind(this);

      socket.onPacket((opcode, data) => {
         const handler = handlers[opcode];
         if (!handler) {
            console.log(`Unknown opcode: ${opcode}`);
            return;
         }

         handler(data);
      });

      socket.onClose(() => {
         if (!this.player) return;

         this.world.removePlayer(this.player);
         this.player = null;
      });

      socket.initiateHandshake();
   }

   update(dt: number) {
      if (this.timeSyncTimer > 0) {
         if (dt >= this.timeSyncTimer) {
            this.sendTimeSync();
         } else {
            this.timeSyncTimer -= dt
         }
      }
   }

   // TODO: Pass parsed Hello packet as the argument
   handleHelloOpcode(data: (string | number)[]) {
      const name = data[0]; // TODO: Sanitize

      this.player = new Player(this);
      this.world.addSession(this);
      this.world.addPlayer(this.player);
      this.world.pushRelevantEntityListToPlayer(this.player);

      this.socket.sendPacket([
         MessageType.Welcome,
         this.player.id,
         name,
         this.player.x,
         this.player.y,
         this.player.z,
      ]);

      this.world.broadcast(new Packet.Spawn(this.player), this.player.id);

      this.sendTimeSync();
   }

   // TODO: Pass parsed Who packet as the argument
   handleWhoOpcode(data: (string | number)[]) {
      if (!this.player) return;

      const ids = data.map(Number);

      for (const id of ids) {
         const entity = this.world.getEntityById(id);
         if (entity) {
            this.world.pushToPlayer(this.player, new Packet.Spawn(entity));
         }
      }

      console.log(`Pushed ${ids.length} new spawns to ${this.player.id}`);
   }

   // TODO: Pass parsed Move packet as the argument
   handleMoveOpcode(data: (string | number)[]) {
      if (!this.player) return;

      const timestamp = data[0] as number;
      this.player.x = data[1] as number;
      this.player.y = data[2] as number;
      this.player.z = data[3] as number;

      this.world.broadcast(new Packet.Move(this.player, timestamp), this.player.id);
   }

   resetTimeSync() {
      this.pendingTimeSyncRequests.clear();
      this.timeSyncNextCounter = 0;
   }

   sendTimeSync() {
      this.socket.sendPacket([MessageType.TimeSync, this.timeSyncNextCounter]);

      this.pendingTimeSyncRequests.set(this.timeSyncNextCounter, getMSTime());

      // Schedule next sync in 10 sec (except for the 5 first packets, which are spaced by 2s)
      this.timeSyncTimer = this.timeSyncNextCounter < 4 ? 2000 : 10000;
      this.timeSyncNextCounter++;
   }

   handleTimeSyncResponseOpcode(data: (string | number)[]) {
      const sequenceIndex = data[0] as number;
      const clientTime = data[1] as number;

      if (!this.pendingTimeSyncRequests.has(sequenceIndex))
         return;

      const serverTimeAtSent = this.pendingTimeSyncRequests.get(sequenceIndex)!;
      this.pendingTimeSyncRequests.delete(sequenceIndex);

      const serverTimeAtReceived = getMSTime();
      const roundTripDuration = serverTimeAtReceived - serverTimeAtSent;
      const lagDelay = roundTripDuration / 2;

      const clockDelta = serverTimeAtSent + lagDelay - clientTime;
      this.timeSyncClockDeltaQueue[(this.timeSyncNextCounter - 1) % 6] = ({ clockDelta, roundTripDuration });

      this.computeNewClockDelta();
   }

   computeNewClockDelta() {
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
