import * as THREE from 'three';

export class Character {
  id = -1;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  mesh: THREE.Mesh;
  orientation = 0;
  speed = 6;
  remoteControlled = false;

  private deadReckoningPosition = new THREE.Vector3();
  private positionError = new THREE.Vector3();
  private errorCorrectionFactor = 0.9;

  constructor(public name: string) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);
    geometry.computeBoundingBox();
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    this.mesh = cube;
  }

  update(dt: number) {
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
      this.velocity.y -= 1;

      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.position.y += this.velocity.y * dt;

      if (this.position.y < 0) {
        this.position.y = 0;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.orientation;
  }

  getHeight() {
    return this.mesh.geometry.boundingBox!.max.y;
  }

  setFlags(flags: number) {
    const isStrafeLeft = flags & 4;
    const isStrafeRight = flags & 8;
    const isForward = flags & 1;
    const isBackward = flags & 2;

    const input = new THREE.Vector3();
    input.x = isStrafeLeft ? -1 : isStrafeRight ? 1 : 0;
    input.z = isForward ? -1 : isBackward ? 1 : 0;
    input.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.orientation);
    input.normalize();

    this.velocity.x = this.speed * input.x;
    this.velocity.z = this.speed * input.z;
  }

  setPosition(x: number, y: number, z: number) {
    if (this.remoteControlled) {
      this.deadReckoningPosition.set(x, y, z);

      this.positionError.set(
        this.mesh.position.x - x,
        this.mesh.position.y - y,
        this.mesh.position.z - z,
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

  setVelocity(x: number, y: number, z: number) {
    this.velocity.set(x, y, z);
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
