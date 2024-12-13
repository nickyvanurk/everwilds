import { range } from './utils';

export type PresetKey =
  | 'broadband'
  | 'fiber'
  | 'cable'
  | 'dsl'
  | 'satellite'
  | 'congested'
  | 'mobile2g'
  | 'mobile2_5g'
  | 'mobile2_75g'
  | 'mobile3g'
  | 'mobile3_5g'
  | 'mobile3_75g'
  | 'mobile4g'
  | 'mobile4_5g'
  | 'mobile5g';

export class NetworkSimulator {
  // From: https://docs-multiplayer.unity3d.com/tools/current/tools-network-simulator/#home-broadband
  private presets = {
    // The Home Broadband network simulation preset simulates a typical
    // generic home broadband connection.
    broadband: {
      label: 'Home Broadband [WIFI, Cable, Console, PC]',
      latency: 32,
      jitter: 12,
      packetLoss: 2,
    },
    // The Home Fiber network simulation preset simulates the best case
    // network connection scenario for desktop and console platforms.
    // Excellent network connection type for multiplayer games.
    fiber: {
      label: 'Home Fiber [Best real-world scenario]',
      latency: 10,
      jitter: 1,
      packetLoss: 0,
    },
    // The Home Cable network simulation preset simulates an optimal network
    // connection scenario for desktop and console platforms. Optimal network
    // connection type for multiplayer games.
    cable: {
      label: 'Home Cable [Optimal real-world scenario]',
      latency: 25,
      jitter: 5,
      packetLoss: 2,
    },
    // The Home DSL network simulation preset simulates an average network
    // connection scenario for desktop and console platforms.
    dsl: {
      label: 'Home DSL [ADSL or VDSL]',
      latency: 30,
      jitter: 10,
      packetLoss: 0,
    },
    // The Home Satellite network simulation preset simulates a Low Earth
    // orbit satellite network connection scenario for desktop and console
    // platforms. Good quality broadband network connection, but with a
    // constant higher ping.
    satellite: {
      label: 'Home Satellite [low Earth orbit]',
      latency: 100,
      jitter: 10,
      packetLoss: 0,
    },
    // The Home Broadband with Congested Network simulation preset simulates
    // desktop and console platforms trough congested networks, where other
    // users already using the network's maximum capacity. The otherwise
    // decent network connection is affected by very bad jitter.
    congested: {
      label: 'Home Broadband with Congested Network',
      latency: 50,
      jitter: 50,
      packetLoss: 1,
    },
    mobile2g: {
      label: "Mobile 2G [CDMA & GSM, '00]",
      latency: 520,
      jitter: 50,
      packetLoss: 7,
    },
    mobile2_5g: {
      label: "Mobile 2.5G [GPRS, G, '00]",
      latency: 480,
      jitter: 40,
      packetLoss: 7,
    },
    mobile2_75g: {
      label: "Mobile 2.75G [Edge, E, '06]",
      latency: 440,
      jitter: 40,
      packetLoss: 7,
    },
    mobile3g: {
      label: "Mobile 3G [WCDMA & UMTS, '03]",
      latency: 360,
      jitter: 30,
      packetLoss: 7,
    },
    mobile3_5g: {
      label: "Mobile 3.5G [HSDPA, H, '06]",
      latency: 160,
      jitter: 30,
      packetLoss: 6,
    },
    mobile3_75g: {
      label: "Mobile 3.75G [HDSDPA+, H+, '11]",
      latency: 130,
      jitter: 30,
      packetLoss: 6,
    },
    mobile4g: {
      label: "Mobile 4G [4G, LTE, '13]",
      latency: 100,
      jitter: 20,
      packetLoss: 4,
    },
    mobile4_5g: {
      label: "Mobile 4.5G [4G+, LTE-A, '16]",
      latency: 80,
      jitter: 20,
      packetLoss: 4,
    },
    mobile5g: {
      label: "Mobile 5G ['20]",
      latency: 30,
      jitter: 20,
      packetLoss: 4,
    },
  };
  config = {
    latency: this.presets.fiber.latency, // ms
    jitter: this.presets.fiber.jitter, // max +/- ms variance
    packetLoss: this.presets.fiber.packetLoss, // percentage
    preset: 'fiber',
  };
  private elapsed = 0;
  private queue: { timestamp: number; callback: () => void }[] = [];

  enqueue(callback: () => void) {
    this.queue.push({ timestamp: this.elapsed, callback });
  }

  update(dt: number) {
    while (this.queue.length > 0) {
      const { timestamp, callback } = this.queue[0];

      // Slight jitter due to network conditions or processing time
      const jitter = range(-this.config.jitter, this.config.jitter);
      const latency = this.config.latency + jitter;

      if (timestamp + latency <= this.elapsed) {
        // Simulate packet loss over a TCP connection
        if (Math.random() * 100 < this.config.packetLoss) {
          const retransmissionJitter = range(
            -this.config.jitter,
            this.config.jitter,
          );
          this.queue[0].timestamp += this.config.latency + retransmissionJitter;
          break;
        }

        callback();
        this.queue.shift();
      } else {
        break;
      }
    }

    this.elapsed += dt * 1000;
  }

  setPreset(presetKey: PresetKey) {
    if (this.presets[presetKey]) {
      this.config.latency = this.presets[presetKey].latency;
      this.config.jitter = this.presets[presetKey].jitter;
      this.config.packetLoss = this.presets[presetKey].packetLoss;
    }
  }
}
