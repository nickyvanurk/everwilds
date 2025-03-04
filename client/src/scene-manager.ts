import * as THREE from 'three';
import EventEmitter from 'eventemitter3';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import type { Character } from './character';
import { chunkData, chunkConfig } from './chunk-data';

export class SceneManager extends EventEmitter {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  directionalLight!: THREE.DirectionalLight;
  audioListener = new THREE.AudioListener();

  private scene: THREE.Scene;
  private clock: THREE.Clock;
  private controls: OrbitControls;
  private trackballControls: TrackballControls;
  private cameraTarget: Character | null = null;
  private raycaster = new THREE.Raycaster();
  private shadowFloor!: THREE.Mesh;
  private chunks = new Map<string, THREE.Group>();

  constructor() {
    super();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      stencil: true, // so masks work in pixijs
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    document.body.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(0x3e3e3e);
    this.renderer.shadowMap.enabled = true;

    const horizontalFovToVerticalFov = (hFov: number) => {
      // NOTE(nick): Uses the aspect ratio of the screen to convert the horizontal
      // fov to vertical fov. This keeps the game looking consistent no matter the
      // size of the window when the game was loaded.
      const aspect = window.screen.width / window.screen.height;
      return (
        (2 * Math.atan(Math.tan((hFov * Math.PI) / 180 / 2) / aspect) * 180) /
        Math.PI
      );
    };

    this.camera = new THREE.PerspectiveCamera(
      horizontalFovToVerticalFov(90),
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 12, 12);

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.controls = new OrbitControls(this.camera, document.body);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.camera.userData.prevAzimuthAngle = this.controls.getAzimuthalAngle();

    this.trackballControls = new TrackballControls(this.camera, document.body);
    this.trackballControls.noRotate = true;
    this.trackballControls.noPan = true;
    this.trackballControls.noZoom = false;
    this.trackballControls.zoomSpeed = 1;
    this.trackballControls.keys = ['', '', ''];
    this.trackballControls.dynamicDampingFactor = 0.2;
    this.trackballControls.minDistance = 0.01;
    this.trackballControls.maxDistance = 60;

    this.setCameraPitch((60 * Math.PI) / 180);

    addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    });

    this.audioListener.context.suspend();
    this.camera.add(this.audioListener);

    this.setupTestScene();
  }

  private setupTestScene() {
    const gridHelper = new THREE.GridHelper(1000, 1000, 0x4e4e4e, 0x4e4e4e);
    this.scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    ambientLight.intensity = 1.5;
    this.scene.add(ambientLight);

    this.scene.fog = new THREE.Fog(0x3e3e3e, 10, 150);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(20, 100, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);
    this.directionalLight = directionalLight;

    const geometry = new THREE.PlaneGeometry(100, 100);
    geometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      geometry,
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    floor.receiveShadow = true;
    floor.visible = false;
    this.shadowFloor = floor;
    this.scene.add(floor);

    for (const [key, data] of Object.entries(chunkData)) {
      const [x, y, z] = key.split(',').map(Number);
      this.renderChunk(x, y, z, data);
    }
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
      target.y = this.cameraTarget.position.y + 1;
      target.z = this.cameraTarget.position.z;
      this.camera.position.set(
        target.x + diff.x,
        target.y + diff.y,
        target.z + diff.z,
      );
    }

    const target = this.controls.target;
    this.controls.update();
    this.trackballControls.target.set(target.x, target.y, target.z);
    this.trackballControls.update();

    this.camera.userData.prevAzimuthAngle = this.controls.getAzimuthalAngle();
  }

  render() {
    // Move shadow floor with camera
    this.shadowFloor.position.x = this.controls.target.x;
    this.shadowFloor.position.z = this.controls.target.z;
    this.directionalLight.target.position.x = this.controls.target.x;
    this.directionalLight.target.position.z = this.controls.target.z;
    this.directionalLight.position.x = this.controls.target.x + 20;
    this.directionalLight.position.y = this.controls.target.y + 100;
    this.directionalLight.position.z = this.controls.target.z + 20;

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
      true,
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

  setCameraYaw(yaw: number) {
    //@ts-ignore
    this.controls._sphericalDelta.theta = yaw - this.controls._spherical.theta;
    this.controls.update();
  }

  setCameraPitch(pitch: number) {
    //@ts-ignore
    this.controls._sphericalDelta.phi = pitch - this.controls._spherical.phi;
    this.controls.update();
  }

  renderChunk(
    x: number,
    y: number,
    z: number,
    data: { [key: number]: number },
  ) {
    const voxelSize = chunkConfig.voxelSize;
    const chunkSize = chunkConfig.chunkSize;
    const chunk = new THREE.Group();
    chunk.position.set(
      x * chunkSize * voxelSize,
      y * chunkSize * voxelSize,
      z * chunkSize * voxelSize,
    );

    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < chunkSize; y++) {
          const key = x + z * chunkSize + y * chunkSize * chunkSize;
          if (!data[key]) continue;
          const voxel = new THREE.Mesh(
            new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize),
            new THREE.MeshPhongMaterial({ color: 0xffffff }),
          );
          voxel.receiveShadow = true;
          voxel.position.set(
            x * voxelSize + voxelSize / 2,
            y * voxelSize - voxelSize / 2,
            z * voxelSize + voxelSize / 2 + 1,
          );
          chunk.add(voxel);
        }
      }
    }

    const oldChunk = this.chunks.get(`${x},${y},${z}`);
    if (oldChunk) {
      this.scene.remove(oldChunk);
    }

    this.scene.add(chunk);
    this.chunks.set(`${x},${y},${z}`, chunk);
  }
}
