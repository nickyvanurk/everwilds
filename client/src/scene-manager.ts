import * as THREE from 'three';
import EventEmitter from 'eventemitter3';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { Character } from './character';

export class SceneManager extends EventEmitter {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;

  private scene: THREE.Scene;
  private clock: THREE.Clock;
  private controls: OrbitControls;
  private cameraTarget: Character | null = null;
  private raycaster = new THREE.Raycaster();

  constructor() {
    super();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      stencil: true, // so masks work in pixijs
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 12, 12);

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.controls = new OrbitControls(this.camera, document.body);
    this.controls.enablePan = false;
    this.controls.mouseButtons.LEFT = undefined;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.camera.userData.prevAzimuthAngle = this.controls.getAzimuthalAngle();

    addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    });

    this.setupTestScene();
  }

  private setupTestScene() {
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
  }

  startRenderLoop(updateCallback: () => void) {
    const loop = () => {
      updateCallback();
      requestAnimationFrame(loop);
    };
    loop();
  }

  getDeltaTime() {
    return this.clock.getDelta();
  }

  prePlayerMoveUpdate(_dt: number) {
    const currentAzimuthAngle = this.controls.getAzimuthalAngle();
    if (currentAzimuthAngle !== this.camera.userData.prevAzimuthAngle) {
      this.emit('cameraYawChanged', currentAzimuthAngle);
    }
  }

  postPlayerMoveUpdate(_dt: number) {
    if (this.cameraTarget) {
      const target = this.controls.target;
      const diff = this.camera.position.sub(target);
      target.x = this.cameraTarget.position.x;
      target.z = this.cameraTarget.position.z;
      this.camera.position.set(
        target.x + diff.x,
        target.y + diff.y,
        target.z + diff.z,
      );
    }

    this.controls.update();

    this.camera.userData.prevAzimuthAngle = this.controls.getAzimuthalAngle();
  }

  render() {
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }

  addObject(object: THREE.Object3D) {
    this.scene.add(object);
  }

  removeObject(object: THREE.Object3D) {
    this.scene.remove(object);
  }

  setCameraTarget(target: Character) {
    this.cameraTarget = target;
  }

  getTargetEntityFromMouse(x: number, y: number) {
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      false,
    );
    if (!intersects.length) return;

    const entities = intersects.filter(
      ({ object }) => object.userData.id !== undefined,
    );
    if (!entities.length) return;

    const { object: entity, point } = entities[0];

    return {
      id: entity.userData.id,
      position: { x: point.x, y: point.y, z: point.z },
    };
  }
}
