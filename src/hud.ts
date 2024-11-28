import * as THREE from 'three';
import {
   FontLoader,
   type Font,
} from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

import type { Game } from './game';
import type { Player } from './player';

export class HUD {
   private names: THREE.Mesh[] = [];

   constructor(private game: Game) {
      new FontLoader().load(
         '../assets/fonts/helvetiker_regular.typeface.json',
         (font: Font) => {
            for (const character of game.characters) {
               const geometry = new TextGeometry(character.name, {
                  font: font,
                  size: 0.2,
                  depth: 0,
                  curveSegments: 12,
               });
               geometry.computeBoundingBox();
               const bbox = geometry.boundingBox!;
               const offset = -0.5 * (bbox.max.x - bbox.min.x);
               geometry.translate(offset, 0, 0);

               const material = new THREE.MeshBasicMaterial({
                  color: 0xffffff,
               });

               const name = new THREE.Mesh(geometry, material);
               name.userData.character = character;
               game.scene.add(name);
               this.names.push(name);
            }
         },
      );
   }

   update(_dt: number) {
      for (const name of this.names) {
         const character = name.userData.character as Player;
         name.position.copy(character.position);
         name.position.y += character.getHeight() + 0.5;
         name.lookAt(this.game.camera.position);
      }
   }
}
