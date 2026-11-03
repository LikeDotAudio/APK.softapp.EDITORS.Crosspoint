// Part of the APK.audio project — Anthony Kuzub
// MIT Licence.

export class CrosspointMatrixModel {
  constructor(sources = 8, destinations = 8) {
    this.sources = Array.from({ length: sources }, (_, i) => `SRC ${i + 1}`);
    this.destinations = Array.from({ length: destinations }, (_, i) => `DST ${i + 1}`);
    this.crosspoints = new Set(['0-0', '1-1', '2-2', '3-3']); // 'srcIdx-dstIdx'
  }

  toggle(srcIdx, dstIdx) {
    const key = `${srcIdx}-${dstIdx}`;
    if (this.crosspoints.has(key)) {
      this.crosspoints.delete(key);
      return false;
    } else {
      this.crosspoints.add(key);
      return true;
    }
  }

  isConnected(srcIdx, dstIdx) {
    return this.crosspoints.has(`${srcIdx}-${dstIdx}`);
  }
}
