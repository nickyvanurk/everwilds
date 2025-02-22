import * as TWEAK from 'tweakpane';
import type { Game } from './game';
import type { PresetKey } from './network-simulator';
import { isDebug } from './utils';
import * as Packet from '../../shared/src/packets';

export class UI {
  private maxChatMessages = 100;

  constructor(private game: Game) {
    const chatbox = document.getElementById('chatbox')!;
    chatbox.addEventListener('mousedown', e => e.stopPropagation());
    chatbox.addEventListener('touchstart', e => e.stopPropagation());
    chatbox.addEventListener('pointerdown', e => e.stopPropagation());
    chatbox.addEventListener('click', e => e.stopPropagation());
    chatbox.addEventListener('contextmenu', e => e.stopPropagation());
    chatbox.addEventListener('wheel', e => e.stopPropagation());
    chatbox.addEventListener('pointermove', e => e.stopPropagation());
    chatbox.addEventListener('keydown', e => e.stopPropagation());
    chatbox.addEventListener('keyup', e => e.stopPropagation());

    const chatlog = document.getElementById('chatlog')!;
    chatlog.scrollTop = chatlog.scrollHeight;

    const chatinput = document.getElementById('chatinput')! as HTMLInputElement;

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (chatinput.style.display === 'none') {
          chatinput.style.display = 'block';
          chatinput.focus();
        } else {
          chatinput.style.display = 'none';
        }
      }
    });

    chatbox.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        chatinput.style.display = 'none';

        if (!chatinput.value) return;

        const playerName = this.game.player.character?.name ?? 'Unknown';
        this.game.networkManager.socket.send(
          Packet.ChatMessage.serialize(playerName, chatinput.value),
        );

        chatinput.value = '';
      }
    });

    if (isDebug()) {
      const pane = new TWEAK.Pane({ title: 'Debug Settings' });
      const parent = pane.element.parentElement!;
      parent.style.top = '8px';
      parent.style.left = '8px';
      parent.style.width = '400px';
      parent.addEventListener('mousedown', e => e.stopPropagation());
      parent.addEventListener('touchstart', e => e.stopPropagation());
      parent.addEventListener('pointerdown', e => e.stopPropagation());
      parent.addEventListener('click', e => e.stopPropagation());
      parent.addEventListener('contextmenu', e => e.stopPropagation());
      parent.addEventListener('wheel', e => e.stopPropagation());
      parent.addEventListener('pointermove', e => e.stopPropagation());
      parent.addEventListener('keydown', e => e.stopPropagation());
      parent.addEventListener('keyup', e => e.stopPropagation());

      // Network folder
      const networkFolder = pane.addFolder({ title: 'Network Simulator' });
      networkFolder.addBinding(
        this.game.networkManager.netsim.config,
        'latency',
        {
          label: 'Latency (ms)',
        },
      );
      networkFolder.addBinding(
        this.game.networkManager.netsim.config,
        'jitter',
        {
          label: 'Jitter (ms)',
        },
      );
      networkFolder.addBinding(
        this.game.networkManager.netsim.config,
        'packetLoss',
        {
          label: 'Packet Loss (%)',
        },
      );
      networkFolder
        .addBinding(this.game.networkManager.netsim.config, 'preset', {
          label: 'Preset',
          options: {
            'Home Broadband [WIFI, Cable, Console, PC]': 'broadband',
            'Home Fiber [Best real-world scenario]': 'fiber',
            'Home Cable [Optimal real-world scenario]': 'cable',
            'Home DSL [ADSL or VDSL]': 'dsl',
            'Home Satellite [low Earth orbit]': 'satellite',
            'Home Broadband with Congested Network': 'congested',
            "Mobile 2G [CDMA & GSM, '00]": 'mobile2g',
            "Mobile 2.5G [GPRS, G, '00]": 'mobile2_5g',
            "Mobile 2.75G [Edge, E, '06]": 'mobile2_75g',
            "Mobile 3G [WCDMA & UMTS, '03]": 'mobile3g',
            "Mobile 3.5G [HSDPA, H, '06]": 'mobile3_5g',
            "Mobile 3.75G [HDSDPA+, H+, '11]": 'mobile3_75g',
            "Mobile 4G [4G, LTE, '13]": 'mobile4g',
            "Mobile 4.5G [4G+, LTE-A, '16]": 'mobile4_5g',
            "Mobile 5G ['20]": 'mobile5g',
          },
        })
        .on('change', ({ value }) => {
          this.game.networkManager.netsim.setPreset(value as PresetKey);
          networkFolder.refresh();
        });
    }
  }

  addChatMessage(playerName: string, message: string) {
    const chatlog = document.getElementById('chatlog')!;
    const chatMessage = document.createElement('div');
    chatMessage.innerHTML = `<span>${playerName}</span>: ${message}`;
    chatlog.appendChild(chatMessage);
    chatlog.scrollTop = chatlog.scrollHeight;

    while (chatlog.children.length > this.maxChatMessages) {
      chatlog.removeChild(chatlog.children[0]);
    }
  }
}
