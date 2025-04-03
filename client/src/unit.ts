import * as THREE from 'three';
import * as Utils from './utils';

const boxSize = 1.5;
const modelHitboxGeometry = new THREE.BoxGeometry(boxSize, 2, boxSize);
modelHitboxGeometry.translate(0, 1, 0);
modelHitboxGeometry.computeBoundingBox();

export class Unit {
  id = -1;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  object3d: THREE.Object3D;
  orientation = 0;
  speed = 8;
  jumpHeight = 2.25;
  gravity = -9.81;
  targeted = false;
  health = { current: 100, max: 100, min: 0 };
  hasGravity = true;
  level = 1;
  maxLevel = 10;
  xp = 0;

  modelHitbox: THREE.Mesh;

  private deadReckoningPosition = new THREE.Vector3();
  private positionError = new THREE.Vector3();
  private errorCorrectionFactor = 0.9;

  meshBody: THREE.Mesh;
  private meshLeftEye: THREE.Mesh;
  private meshRightEye: THREE.Mesh;

  private feetRoot = new THREE.Object3D();
  private meshLeftFoot: THREE.Mesh;
  private meshRightFoot: THREE.Mesh;

  private elapsedWalkTime = 0;
  private elapsedIdleTime = 0;
  private stepAmplitude = 0.25;
  private stepLength = 1;

  isStrafeLeft = false;
  isStrafeRight = false;
  isForward = false;
  isBackward = false;

  private floorHeight = 0;

  private prejump?: THREE.PositionalAudio;

  constructor(
    public name: string,
    public color: number,
    public remoteControlled = false,
  ) {
    const root = new THREE.Object3D();

    // Create bounding box for raycast collision detection
    const modelHitbox = new THREE.Mesh(modelHitboxGeometry);
    this.modelHitbox = modelHitbox;
    this.modelHitbox.visible = false;
    root.add(modelHitbox);

    // Body
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 1, 0);
    geometry.computeBoundingBox();
    const material = new THREE.MeshPhongMaterial();
    material.color.setHex(color);
    material.emissive.setHex(color);
    material.emissiveIntensity = 1;
    const body = new THREE.Mesh(geometry, material);
    body.castShadow = true;
    body.receiveShadow = true;
    this.meshBody = body;
    root.add(body);

    // Eyes
    const eyeGeometry = new THREE.PlaneGeometry(0.15, 0.3);
    eyeGeometry.rotateX(Math.PI);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1, -0.51);
    root.add(leftEye);
    this.meshLeftEye = leftEye;
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1, -0.51);
    root.add(rightEye);
    this.meshRightEye = rightEye;

    Utils.alternateInterval(
      { interval: 2, randomness: 10 },
      { interval: 0.1 },
      isEyesClosed => {
        this.meshLeftEye.scale.y = isEyesClosed ? 0.1 : 1;
        this.meshRightEye.scale.y = isEyesClosed ? 0.1 : 1;
      },
    );

    // Feet
    const footGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.5);
    const footMaterial = new THREE.MeshBasicMaterial({ color: 0x212222 });
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(-0.5, 0.15, 0);
    leftFoot.castShadow = true;
    this.feetRoot.add(leftFoot);
    this.meshLeftFoot = leftFoot;
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0.5, 0.15, 0);
    rightFoot.castShadow = true;
    this.feetRoot.add(rightFoot);
    this.meshRightFoot = rightFoot;
    root.add(this.feetRoot);

    this.object3d = root;

    if (this.remoteControlled) {
      gAssetManager.getSound('prejump', (buffer: AudioBuffer) => {
        const prejump = new THREE.PositionalAudio(
          game.sceneManager.audioListener,
        );
        prejump.setBuffer(buffer);
        prejump.setVolume(0.1);
        prejump.setRefDistance(1);
        prejump.setMaxDistance(40);
        prejump.setDistanceModel('linear');

        this.prejump = prejump;
        this.meshBody.add(prejump);
      });
    }
  }

  update(dt: number) {
    if (this.hasGravity) {
      this.velocity.y += this.gravity * dt;
    }

    const wasGrounded = this.isGrounded();

    if (this.remoteControlled) {
      this.deadReckoningPosition.x += this.velocity.x * dt;
      this.deadReckoningPosition.y += this.velocity.y * dt;
      this.deadReckoningPosition.z += this.velocity.z * dt;

      this.position.copy(this.deadReckoningPosition).add(this.positionError);

      this.positionError.multiplyScalar(this.errorCorrectionFactor);
      if (this.positionError.length() < 0.01) {
        this.positionError.setScalar(0);
      }
    } else {
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.position.y += this.velocity.y * dt;
    }

    if (this.position.y < this.floorHeight) {
      this.position.y = this.floorHeight;
      this.velocity.y = 0;
    }

    this.object3d.position.copy(this.position);
    this.object3d.rotation.y = this.orientation;

    if (!this.isGrounded()) {
      this.elapsedWalkTime += dt;
      this.elapsedIdleTime = 0;

      // Rotate feet in walking direction
      const moveX = this.isStrafeLeft ? -1 : this.isStrafeRight ? 1 : 0;
      const moveZ = this.isForward ? -1 : this.isBackward ? 1 : 0;
      const moveDirAngle = Math.atan2(moveZ, moveX);
      const isMoving = moveX !== 0 || moveZ !== 0;
      this.feetRoot.rotation.y = isMoving ? -(moveDirAngle + Math.PI / 2) : 0;

      const stepSpeed = 3 * Math.PI;
      const stepLength = 0.2;
      const stepAmplitude = 0.1;

      const stepOffsetY =
        Math.sin((this.elapsedWalkTime + 0.5) * stepSpeed) * stepAmplitude;
      const stepOffsetZ =
        Math.cos((this.elapsedWalkTime + 0.5) * stepSpeed) * (stepLength / 2);

      // Step
      this.meshLeftFoot.position.y =
        (stepOffsetY < 0 ? stepOffsetY : stepOffsetY) + 0.15;
      this.meshRightFoot.position.y =
        -(stepOffsetY < 0 ? stepOffsetY : stepOffsetY) + 0.15;
      this.meshLeftFoot.position.z = stepOffsetZ;
      this.meshRightFoot.position.z = -stepOffsetZ;

      // Move feet closer together when walking
      this.meshLeftFoot.position.x = -0.35;
      this.meshRightFoot.position.x = 0.35;

      // Rotate feet depending on the step offset
      const isMovingBackwards = moveDirAngle > 0 && moveDirAngle < Math.PI;
      const rotOffset = (Math.PI / 8) * (isMovingBackwards ? 1 : -1);
      this.meshLeftFoot.rotation.x = -stepOffsetZ + rotOffset;
      this.meshRightFoot.rotation.x = stepOffsetZ + rotOffset;
    } else if (this.isWalking()) {
      const prevElapsedWalkTime = this.elapsedWalkTime;
      this.elapsedWalkTime += dt;
      this.elapsedIdleTime = 0;

      // Rotate feet in walking direction
      const moveX = this.isStrafeLeft ? -1 : this.isStrafeRight ? 1 : 0;
      const moveZ = this.isForward ? -1 : this.isBackward ? 1 : 0;
      const moveDirAngle = Math.atan2(moveZ, moveX);
      const isMoving = moveX !== 0 || moveZ !== 0;
      this.feetRoot.rotation.y = isMoving ? -(moveDirAngle + Math.PI / 2) : 0;

      const stepSpeed = (this.speed / this.stepLength) * Math.PI;

      const prevStepOffsetY =
        Math.sin((prevElapsedWalkTime + 0.5) * stepSpeed) * this.stepAmplitude;

      const stepOffsetY =
        Math.sin((this.elapsedWalkTime + 0.5) * stepSpeed) * this.stepAmplitude;
      const stepOffsetZ =
        Math.cos((this.elapsedWalkTime + 0.5) * stepSpeed) *
        (this.stepLength / 2);

      // Step
      this.meshLeftFoot.position.y = (stepOffsetY < 0 ? 0 : stepOffsetY) + 0.15;
      this.meshRightFoot.position.y =
        -(stepOffsetY < 0 ? stepOffsetY : 0) + 0.15;
      this.meshLeftFoot.position.z = stepOffsetZ;
      this.meshRightFoot.position.z = -stepOffsetZ;

      // Move feet closer together when walking
      this.meshLeftFoot.position.x = -0.35;
      this.meshRightFoot.position.x = 0.35;

      // Rotate feet depending on the step offset
      this.meshLeftFoot.rotation.x = -stepOffsetZ;
      this.meshRightFoot.rotation.x = stepOffsetZ;

      // Add subtle body bounce based on step amplitude
      this.meshBody.position.y =
        Math.abs(Math.sin((this.elapsedWalkTime + 0.5) * stepSpeed)) * 0.1;
      this.meshLeftEye.position.y = 1 + this.meshBody.position.y;
      this.meshRightEye.position.y = 1 + this.meshBody.position.y;
    } else {
      this.elapsedWalkTime = 0;
      this.elapsedIdleTime += dt;

      this.meshLeftFoot.position.x = -0.5;
      this.meshLeftFoot.position.y = 0.15;
      this.meshLeftFoot.position.z = 0;
      this.meshLeftFoot.rotation.x = 0;

      this.meshRightFoot.position.x = 0.5;
      this.meshRightFoot.position.y = 0.15;
      this.meshRightFoot.position.z = 0;
      this.meshRightFoot.rotation.x = 0;

      this.feetRoot.rotation.y = 0;

      // Add subtle body bounce to simulate breathing
      const breathSpeed = 1; // seconds per bounce
      const breathdistance = 0.1;
      this.meshBody.position.y =
        Math.sin(this.elapsedIdleTime * (1 / (breathSpeed / 2))) *
        (breathdistance / 2);
      this.meshLeftEye.position.y = 1 + this.meshBody.position.y;
      this.meshRightEye.position.y = 1 + this.meshBody.position.y;
    }
  }

  getHeight() {
    return this.meshBody.geometry.boundingBox!.max.y;
  }

  setId(id: number) {
    this.id = id;
    this.modelHitbox.userData.id = id;
  }

  setFlags(flags: number) {
    this.isStrafeLeft = !!(flags & 4);
    this.isStrafeRight = !!(flags & 8);
    this.isForward = !!(flags & 1);
    this.isBackward = !!(flags & 2);
    const isJumping = !!(flags & 16);

    const input = new THREE.Vector3();
    input.x = this.isStrafeLeft ? -1 : this.isStrafeRight ? 1 : 0;
    input.z = this.isForward ? -1 : this.isBackward ? 1 : 0;
    input.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.orientation);
    input.normalize();

    this.move(input.x, input.z);

    if (isJumping) {
      this.jump();
    }
  }

  setPosition(x: number, y: number, z: number, skipDeadReckoning = false) {
    if (this.remoteControlled) {
      this.deadReckoningPosition.set(x, y, z);

      this.positionError.set(
        this.object3d.position.x - x,
        this.object3d.position.y - y,
        this.object3d.position.z - z,
      );

      const len = this.positionError.length();
      const t = len < 0.25 ? 0 : len > 1 ? 1 : len - 0.25 / 0.75;
      this.errorCorrectionFactor = Utils.lerp(0.85, 0.2, t);

      if (skipDeadReckoning) {
        this.positionError.setScalar(0);
      }
    } else {
      this.position.set(x, y, z);
    }
  }

  setOrientation(orientation: number) {
    this.orientation = orientation;
  }

  isGrounded() {
    return this.position.y === this.floorHeight;
  }

  move(x: number, z: number) {
    this.velocity.x = this.speed * x;
    this.velocity.z = this.speed * z;
  }

  jump() {
    this.velocity.y = Math.sqrt(this.jumpHeight * -2 * this.gravity);

    if (this.prejump?.isPlaying) {
      this.prejump.stop();
    }

    this.prejump?.play();
  }

  isWalking() {
    return this.velocity.x !== 0 || this.velocity.z !== 0;
  }

  get xpToLevelUp() {
    return 12.5 * this.level * this.xpPerKill; // 8 is used for wow classic
  }

  get xpPerKill() {
    return 15 + 5 * this.level; // 45 + 5 * this.level is used for wow classic
  }
}
