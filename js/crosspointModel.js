// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

export class CrosspointMatrixModel {
  constructor(srcCount = 8, dstCount = 8) {
    this.sources = Array.from({ length: srcCount }, (_, i) => `SRC ${i + 1}`);
    this.destinations = Array.from({ length: dstCount }, (_, i) => `DST ${i + 1}`);
    this.matrix = Array.from({ length: srcCount }, () => Array(dstCount).fill(false));

    // Connect 1:1 diagonal by default
    for (let i = 0; i < Math.min(srcCount, dstCount); i++) {
      this.matrix[i][i] = true;
    }
  }

  toggle(s, d) {
    if (this.matrix[s] !== undefined && this.matrix[s][d] !== undefined) {
      this.matrix[s][d] = !this.matrix[s][d];
    }
  }

  isConnected(s, d) {
    return !!(this.matrix[s] && this.matrix[s][d]);
  }

  clearAll() {
    this.matrix.forEach(row => row.fill(false));
  }

  diagonalSalvo() {
    this.clearAll();
    for (let i = 0; i < Math.min(this.sources.length, this.destinations.length); i++) {
      this.matrix[i][i] = true;
    }
  }
}
