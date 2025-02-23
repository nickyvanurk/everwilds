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
  private meshBody: THREE.Mesh;
  private meshLeftEye: THREE.Mesh;
  private meshRightEye: THREE.Mesh;

  constructor(public name: string) {
    const root = new THREE.Object3D();

    // Body
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);
    geometry.computeBoundingBox();
    const material = new THREE.MeshNormalMaterial();
    const body = new THREE.Mesh(geometry, material);
    body.userData.id = this.id;
    this.meshBody = body;
    root.add(body);

    // Eyes
    const eyeGeometry = new THREE.PlaneGeometry(0.15, 0.3);
    eyeGeometry.rotateX(Math.PI);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 0.5, -0.501);
    root.add(leftEye);
    this.meshLeftEye = leftEye;
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 0.5, -0.501);
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
  }

  getHeight() {
    return this.meshBody.geometry.boundingBox!.max.y;
  }

  setId(id: number) {
    this.id = id;
    this.meshBody.userData.id = id;
  }

  setFlags(flags: number) {
    const isStrafeLeft = flags & 4;
    const isStrafeRight = flags & 8;
    const isForward = flags & 1;
    const isBackward = flags & 2;
    const isJumping = flags & 16;

    const input = new THREE.Vector3();
    input.x = isStrafeLeft ? -1 : isStrafeRight ? 1 : 0;
    input.z = isForward ? -1 : isBackward ? 1 : 0;
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
