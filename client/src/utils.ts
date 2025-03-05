export function isDebug() {
  return location.hash === '#debug';
}

export function range(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function alternateInterval(
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
