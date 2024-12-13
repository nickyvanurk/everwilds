export function isDebug() {
  return location.hash === '#debug';
}

export function range(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
