import EventEmitter from "eventemitter3";
import type { WebSocket } from 'ws';
import * as Packet from '../../shared/src/packets';
import { getMSTime } from "../../shared/src/time";

export class Socket extends EventEmitter {
   private pendingTimeSyncRequests = new Map<number, number>();
   private timeSyncTimer = 0;
   private timeSyncNextCounter = 0;
   private timeSyncClockDeltaQueue: { clockDelta: number, roundTripDuration: number }[] = [];
   private timeSyncClockDelta = 0;

   constructor(public ws: WebSocket) {
      super();

      ws.on('message', (message: (string | number)[]) => {
         const data = JSON.parse(message.toString());
         const opcode = +data[0];

         switch (opcode) {
            case Packet.PacketOpcode.Hello:
               this.emit('hello', Packet.Hello.deserialize(data));
               break;
            case Packet.PacketOpcode.Move:
               this.emit('move', Packet.Move.deserialize(data));
               break;
            case Packet.PacketOpcode.TimeSyncResponse:
               const { sequenceIndex, timestamp } = Packet.TimeSyncResponse.deserialize(data);
               this.handleTimeSyncResponseOpcode(sequenceIndex, timestamp);
               break;
            default:
               console.log(`No handler found for opcode: ${opcode}`);
         }
      });

      ws.on('error', error => {
         console.log(`Error: ${error}`);
      });

      ws.on('close', () => {
         this.emit('close');
      });
   }

   updateTimeSync(dt: number) {
      if (this.timeSyncTimer > 0) {
         if (dt >= this.timeSyncTimer) {
            this.sendTimeSync();
         } else {
            this.timeSyncTimer -= dt;
         }
      }
   }

   isOpen() {
      return this.ws.readyState === this.ws.OPEN;
   }

   initiateHandshake() {
      if (!this.isOpen()) return;

      this.ws.send('go');
   }

   send(message: any[]) {
      if (!this.isOpen()) return;

      this.ws.send(JSON.stringify(message));
   }

   sendTimeSync() {
      this.send(Packet.TimeSync.serialize(this.timeSyncNextCounter));

      this.pendingTimeSyncRequests.set(this.timeSyncNextCounter, getMSTime());

      // Schedule next sync in 10 sec (except for the 5 first packets, which are spaced by 2s)
      this.timeSyncTimer = this.timeSyncNextCounter < 4 ? 2000 : 10000;
      this.timeSyncNextCounter++;
   }

   clientTimeToServerTime(timeOfMovementInClientTime: number) {
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
