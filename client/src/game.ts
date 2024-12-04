import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { setKeyBindings } from './input';
import { Player } from './player';
import { HUD } from './hud';
import { assets } from './config';
import { Client } from './client';
import { Character } from './character';

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

      client.onConnected(() => {
         console.log('Starting client/server handshake');

         client.sendHello(this.playername);
      });

      client.onDisconnected(() => {
         console.log('Disconnected from server');
      });

      client.onWelcome((id, name, x, y, z) => {
         console.log('Received player ID from server:', id);

         this.player.id = id;
         this.player.name = name;
         this.player.position.set(x, y, z);
         this.player.client = client;
         this.addEntity(this.player);
      });

      client.onEntityList(ids => {
         console.log('Received entity list:', ids);

         const entityIds = Object.keys(this.entities).map(id => +id);
         const knownIds = entityIds.filter(id => ids.includes(id));
         const newIds = ids.filter(id => !knownIds.includes(id));

         if (newIds.length) {
            client.sendWho(newIds);
         }
      });

      client.onSpawnEntity((id, name, x, y, z) => {
         console.log('Received spawn entity:', id, x, y, z);

         const character = new Character(name);
         character.id = id;
         character.position.set(x, y, z);

         this.addEntity(character);
      });

      client.onDespawnEntity(id => {
         console.log('Received despawn entity:', id);

         //@ts-ignore
         const entity = this.entities[id] as Character;
         this.scene.remove(entity.mesh);
         //@ts-ignore
         delete this.entities[id];
         this.characters.splice(this.characters.indexOf(entity), 1);
      });

      client.onEntityMove((serverTime, flag, id, x, y, z, orientation) => {
         //@ts-ignore
         const entity = this.entities[id] as Character;
         if (!entity) {
            console.error(`Entity with ID ${id} not found`);
            return;
         }

         entity.time = 0;
         entity.setPosition(x, y, z);
         entity.orientation = orientation;
         const isMoving = flag & 1 || flag & 2 || flag & 4 || flag & 8;
         entity.speed = isMoving ? 6 : 0;
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
