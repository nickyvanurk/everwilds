import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { setKeyBindings } from './input';
import { Player } from './player';
import { HUD } from './hud';
import * as config from './config';
import { Socket } from './socket';
import { Character } from './character';
import * as Packet from '../../shared/src/packets';
import { NetworkSimulator } from './network-simulator';
import { UI } from './ui';

export class Game {
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  netsim = new NetworkSimulator();

  characters: Character[] = [];

  private host = 'localhost';
  private port = 8080;
  private playername = 'player';

  private prevTime = 0;
  private hud: HUD;
  private ui: UI;
  private player: Player;

  private entities: Record<number, Player | Character> = {};

  constructor(host: string, port: number, playername: string) {
    this.host = host;
    this.port = port;
    this.playername = playername;

    const { renderer, camera, controls, scene } = this.setup();
    this.renderer = renderer;
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;

    setKeyBindings(config.keyBindings);

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    const player = new Player(this, this.playername);
    this.player = player;

    this.hud = new HUD(this);
    this.ui = new UI(this);

    gAssetManager.load(config.assets);
  }

  async init() {
    await this.hud.init();
  }

  setup() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 12, 12);

    const controls = new OrbitControls(camera, document.body);
    controls.enablePan = false;
    controls.mouseButtons.LEFT = undefined;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    camera.userData.prevAzimuthAngle = controls.getAzimuthalAngle();

    const scene = new THREE.Scene();

    addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });

    return { renderer, camera, controls, scene };
  }

  run() {
    this.renderer.setAnimationLoop(this.update.bind(this));

    this.connect();
  }

  connect() {
    const socket = new Socket(this.host, this.port, this.netsim);

    socket.connect();

    socket.on('connected', () => {
      log.debug('Starting client/server handshake');

      socket.send(Packet.Hello.serialize(this.playername));
    });

    socket.on('disconnected', () => {
      log.debug('Disconnected from server');
    });

    socket.on('welcome', ({ id, flags, name, x, y, z, orientation }) => {
      log.debug(`Received player ID from server: ${id}`);

      this.player.setSocket(socket);

      const playerCharacter = new Character(name);
      playerCharacter.id = id;
      playerCharacter.setFlags(flags);
      playerCharacter.setPosition(x, y, z);
      playerCharacter.setOrientation(orientation);

      this.addEntity(playerCharacter);

      this.player.setCharacter(playerCharacter);
    });

    socket.on('spawn', ({ id, flags, name, x, y, z, orientation }) => {
      log.debug(`Received spawn entity: ${id} ${x} ${y} ${z}`);

      const character = new Character(name);
      character.id = id;
      character.remoteControlled = true;
      character.setFlags(flags);
      character.setPosition(x, y, z);
      character.setOrientation(orientation);

      this.addEntity(character);
    });

    socket.on('despawn', ({ id }) => {
      log.debug(`Received despawn entity: ${id}`);

      const entity = this.entities[id] as Character;
      this.scene.remove(entity.mesh);
      delete this.entities[id];
      this.characters.splice(this.characters.indexOf(entity), 1);
    });

    socket.on('move', ({ id, flags, x, y, z, orientation }) => {
      const entity = this.entities[id] as Character;
      if (!entity) {
        log.error(`Entity with ID ${id} not found`);
        return;
      }
      entity.setFlags(flags);
      entity.setPosition(x, y, z);
      entity.setOrientation(orientation);
    });
  }

  addEntity(entity: Character) {
    this.entities[entity.id] = entity;
    this.scene.add(entity.mesh);
    this.characters.push(entity);
  }

  update(time: number) {
    const dt = (time - this.prevTime) / 1000;
    this.prevTime = time;

    this.player.update(dt);

    for (const character of this.characters) {
      character.update(dt);
    }

    if (this.player.character) {
      const target = this.controls.target;
      const diff = this.camera.position.sub(target);
      target.x = this.player.character.position.x;
      target.z = this.player.character.position.z;
      this.camera.position.set(
        target.x + diff.x,
        target.y + diff.y,
        target.z + diff.z,
      );
    }

    this.controls.update();

    this.hud.update(dt);

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.hud.render();

    this.netsim.update(dt);

    this.camera.userData.prevAzimuthAngle = this.controls.getAzimuthalAngle();
  }
}
