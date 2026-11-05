// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

export const CROSSPOINT_BLOCK_TYPE = 'crosspoint_matrix';

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

  activeRoutes() {
    return this.matrix.reduce((n, row) => n + row.filter(Boolean).length, 0);
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

  renameSource(i, name) { if (i >= 0 && i < this.sources.length) this.sources[i] = String(name); }

  renameDestination(j, name) { if (j >= 0 && j < this.destinations.length) this.destinations[j] = String(name); }

  /** One row per source for the matrix table: { src, d0: bool, d1: bool, … }. */
  rows() {
    return this.sources.map((src, s) => {
      const row = { src };
      this.destinations.forEach((_, d) => { row[`d${d}`] = this.isConnected(s, d); });
      return row;
    });
  }

  toBlock() {
    return {
      type: CROSSPOINT_BLOCK_TYPE,
      sources: [...this.sources],
      destinations: [...this.destinations],
      matrix: this.matrix.map((row) => row.map(Boolean)),
    };
  }

  fromBlock(block) {
    if (!block || !Array.isArray(block.sources) || !Array.isArray(block.destinations)) return false;
    this.sources = block.sources.map(String);
    this.destinations = block.destinations.map(String);
    const m = Array.isArray(block.matrix) ? block.matrix : [];
    this.matrix = this.sources.map((_, s) => this.destinations.map((__, d) => !!(m[s] && m[s][d])));
    return true;
  }
}
