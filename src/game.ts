import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { setKeyBindings } from './input';
import { Player } from './player';

export class Game {
   private prevTime = 0;

   private renderer: THREE.WebGLRenderer;
   private camera: THREE.PerspectiveCamera;
   private controls: OrbitControls;
   private scene: THREE.Scene;

   private player: Player;

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
         { action: 'right', key: 'KeyD' },
         { action: 'jump', key: 'Space' },
      ]);

      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);

      const player = new Player(6);
      scene.add(player.mesh);
      this.player = player;
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
   }

   update(time: number) {
      const dt = (time - this.prevTime) / 1000;
      this.prevTime = time;

      this.player.update(dt);

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

      this.renderer.render(this.scene, this.camera);
   }
}
