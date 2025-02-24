import * as THREE from 'three';

export class Character {
  id = -1;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  object3d: THREE.Object3D;
  orientation = 0;
  speed = 6;
  jumpHeight = 1;
  gravity = -9.81;
  remoteControlled = false;
  targeted = false;

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

  constructor(public name: string) {
    const root = new THREE.Object3D();

    // Body
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 1, 0);
    geometry.computeBoundingBox();
    const material = new THREE.MeshBasicMaterial();
    material.color.setHSL(Math.random(), 0.9, 0.5);
    const body = new THREE.Mesh(geometry, material);
    body.userData.id = this.id;
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

    alternateInterval(
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
    this.feetRoot.add(leftFoot);
    this.meshLeftFoot = leftFoot;
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0.5, 0.15, 0);
    this.feetRoot.add(rightFoot);
    this.meshRightFoot = rightFoot;
    root.add(this.feetRoot);

    this.object3d = root;
  }

  update(dt: number) {
    this.velocity.y += this.gravity * dt;

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

    if (this.position.y < 0) {
      this.position.y = 0;
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
      this.elapsedWalkTime += dt;
      this.elapsedIdleTime = 0;

      // Rotate feet in walking direction
      const moveX = this.isStrafeLeft ? -1 : this.isStrafeRight ? 1 : 0;
      const moveZ = this.isForward ? -1 : this.isBackward ? 1 : 0;
      const moveDirAngle = Math.atan2(moveZ, moveX);
      const isMoving = moveX !== 0 || moveZ !== 0;
      this.feetRoot.rotation.y = isMoving ? -(moveDirAngle + Math.PI / 2) : 0;


      const stepSpeed = (this.speed / this.stepLength) * Math.PI;

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
    this.meshBody.userData.id = id;
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

  setPosition(x: number, y: number, z: number) {
    if (this.remoteControlled) {
      this.deadReckoningPosition.set(x, y, z);

      this.positionError.set(
        this.object3d.position.x - x,
        this.object3d.position.y - y,
        this.object3d.position.z - z,
      );

      const len = this.positionError.length();
      const t = len < 0.25 ? 0 : len > 1 ? 1 : len - 0.25 / 0.75;
      this.errorCorrectionFactor = lerp(0.85, 0.2, t);
    } else {
      this.position.set(x, y, z);
    }
  }

  setOrientation(orientation: number) {
    this.orientation = orientation;
  }

  isGrounded() {
    return this.position.y === 0;
  }

  move(x: number, z: number) {
    this.velocity.x = this.speed * x;
    this.velocity.z = this.speed * z;
  }

  jump() {
    if (this.isGrounded() && this.velocity.y < 0) {
      this.velocity.y = 0;
    }

    this.velocity.y = Math.sqrt(this.jumpHeight * -2 * this.gravity);
  }

  isWalking() {
    return this.velocity.x !== 0 || this.velocity.z !== 0;
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function alternateInterval(
  intervalA: { interval?: number; randomness?: number },
  intervalB: { interval?: number; randomness?: number },
  cb: (eyesClosed: boolean) => void,
) {
  let isIntervalB = false;

  function tick() {
    cb(isIntervalB);
    const delay = isIntervalB
      ? (intervalB.interval ?? 0) + Math.random() * (intervalB.randomness ?? 0)
      : (intervalA.interval ?? 0) + Math.random() * (intervalA.randomness ?? 0); // seconds
    isIntervalB = !isIntervalB;
    setTimeout(tick, delay * 1000);
  }

  tick();
}
