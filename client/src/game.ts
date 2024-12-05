import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { setKeyBindings } from './input';
import { Player } from './player';
import { HUD } from './hud';
import { assets } from './config';
import { Client } from './client';
import { Character } from './character';
import { getMSTime } from '../../shared/src/time';
import * as Packet from '../../shared/src/packets';

export class Game {
   renderer: THREE.WebGLRenderer;
   controls: OrbitControls;
   camera: THREE.PerspectiveCamera;
   scene: THREE.Scene;
   characters: Character[] = [];

   private host = 'localhost';
   private port = 8080;
   private playername = 'player';

   private prevTime = 0;
   private hud: HUD;
   private player: Player;

   private entities = {};

   constructor() {
      const { renderer, camera, controls, scene } = this.setup();
      this.renderer = renderer;
      this.camera = camera;
      this.controls = controls;
      this.scene = scene;

      setKeyBindings([
         { action: 'forward', key: 'KeyW' },
         { action: 'backward', key: 'KeyS' },
         { action: 'left', key: 'KeyA' },
         { action: 'right', key: 'KeyD' }
      ]);

      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);

      const player = new Player(this.playername, 6);
      this.player = player;

      this.hud = new HUD(this);

      gAssetManager.load(assets);
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

   setServerOptions(host: string, port: number, playername: string) {
      this.host = host;
      this.port = port;
      this.playername = playername;
   }

   connect() {
      const client = new Client(this.host, this.port);

      client.connect();

      client.on('connected', () => {
         console.log('Starting client/server handshake');

         client.send(Packet.Hello.serialize(this.playername));
      });

      client.on('disconnected', () => {
         console.log('Disconnected from server');
      });

      client.on('welcome', ({ id, flag, name, x, y, z, orientation }) => {
         console.log('Received player ID from server:', id);

         this.player.flag = flag;
         this.player.id = id;
         this.player.name = name;
         this.player.setPosition(x, y, z);
         this.player.orientation = orientation;
         this.player.client = client;
         this.addEntity(this.player);

         this.player.time = 0;
      });

      client.on('spawn', ({ timestamp, id, flag, name, x, y, z, orientation }) => {
         console.log('Received spawn entity:', id, x, y, z);

         const isMoving = flag & 1 || flag & 2 || flag & 4 || flag & 8;
         const speed = 6;

         // Currently this only works after server/client time sync. Spawned
         // entities on join will be interpolated with a wrong delta. We can
         // probably mitigate this by using the server timestamp instead of the
         // client timestamp. The server sends his time in the welcome packet.
         // After that the client needs to keep the server time known to the
         // client in sync with the actual server time.
         if (isMoving) {
            const estimatedServerTime = (getMSTime() + client.clockDelta);
            const delta = (estimatedServerTime - timestamp) / 1000;
            x = x + Math.sin(orientation) * speed * delta;
            z = z + Math.cos(orientation) * speed * delta;
         }

         const character = new Character(name);
         character.flag = flag;
         character.id = id;
         character.setPosition(x, y, z);
         character.orientation = orientation;

         character.time = 0;
         character.speed = isMoving ? speed : 0;

         this.addEntity(character);
      });

      client.on('despawn', ({ id }) => {
         console.log('Received despawn entity:', id);

         //@ts-ignore
         const entity = this.entities[id] as Character;
         this.scene.remove(entity.mesh);
         //@ts-ignore
         delete this.entities[id];
         this.characters.splice(this.characters.indexOf(entity), 1);
      });

      client.on('move', ({ timestamp, id, flag, x, y, z, orientation }) => {
         //@ts-ignore
         const entity = this.entities[id] as Character;
         if (!entity) {
            console.error(`Entity with ID ${id} not found`);
            return;
         }

         const isMoving = flag & 1 || flag & 2 || flag & 4 || flag & 8;
         const speed = 6;

         if (isMoving) {
            const estimatedServerTime = (getMSTime() + client.clockDelta);
            const delta = (estimatedServerTime - timestamp) / 1000;
            x = x + Math.sin(orientation) * speed * delta;
            z = z + Math.cos(orientation) * speed * delta;
         }

         entity.time = 0;
         entity.setPosition(x, y, z);
         entity.orientation = orientation;
         entity.speed = isMoving ? speed : 0;
      });
   }

   addEntity(entity: Player | Character) {
      //@ts-ignore
      this.entities[entity.id] = entity;
      this.scene.add(entity.mesh);
      this.characters.push(entity);
   }

   update(time: number) {
      const dt = (time - this.prevTime) / 1000;
      this.prevTime = time;

      for (const character of this.characters) {
         character.update(dt);
      }

      const target = this.controls.target;
      const diff = this.camera.position.sub(target);
      target.x = this.player.position.x;
      target.z = this.player.position.z;
      this.camera.position.set(
         target.x + diff.x,
         target.y + diff.y,
         target.z + diff.z,
      );
      this.controls.update();

      this.hud?.update(dt);

      this.renderer.render(this.scene, this.camera);
   }
}
