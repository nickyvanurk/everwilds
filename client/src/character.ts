import * as THREE from 'three';

export class Character {
  id = -1;
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  mesh: THREE.Mesh;
  orientation = 0;

  private deadReckoningPosition = new THREE.Vector3();
  private positionError = new THREE.Vector3();
  private errorCorrectionFactor = 0.9;

  constructor(
    public name: string,
    public speed = 0,
  ) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);
    geometry.computeBoundingBox();
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    this.mesh = cube;
  }

  update(dt: number) {
    const dir = new THREE.Vector3();
    dir.x = Math.sin(this.orientation);
    dir.z = Math.cos(this.orientation);
    dir.normalize();
    dir.multiplyScalar(this.speed).multiplyScalar(dt);

    this.deadReckoningPosition.add(dir);
    this.position.copy(this.deadReckoningPosition).add(this.positionError);

    this.positionError.multiplyScalar(this.errorCorrectionFactor);
    if (this.positionError.length() < 0.01) {
      this.positionError.setScalar(0);
    }

    this.mesh.position.copy(this.position);
  }

  getHeight() {
    return this.mesh.geometry.boundingBox!.max.y;
  }

  setPosition(x: number, y: number, z: number) {
    this.deadReckoningPosition.set(x, y, z);

    this.positionError.set(
      this.mesh.position.x - x,
      this.mesh.position.y - y,
      this.mesh.position.z - z,
    );

    const len = this.positionError.length();
    const t = len < 0.25 ? 0 : len > 1 ? 1 : len - 0.25 / 0.75;
    this.errorCorrectionFactor = lerp(0.85, 0.2, t);
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
