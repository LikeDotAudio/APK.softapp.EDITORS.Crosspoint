// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* ROAD-3489: the Crosspoint block round trip over cad.like.audio/host@1, through
   the vendored apk-softapp.js the page loads. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { CrosspointMatrixModel, CROSSPOINT_BLOCK_TYPE } from '../js/crosspointModel.js';
import { world, roundTrip, ORIGIN, PROTOCOL } from './softapp-harness.mjs';

const connect = (model) => (S) => S.connectHost({
  editor: 'Crosspoint Matrix', blockType: CROSSPOINT_BLOCK_TYPE,
  onLoad: (b) => model.fromBlock(b), onRequest: () => model.toBlock(),
});

test('Crosspoint: the CAD loads a 2x3 block, asks for it back, gets the same routes at its own origin', () => {
  const model = new CrosspointMatrixModel(8, 8);
  const block = { type: CROSSPOINT_BLOCK_TYPE, sources: ['Mic 1', 'Mic 2'], destinations: ['A', 'B', 'C'], matrix: [[true, false, false], [false, false, true]] };
  const { w, ready, saved } = roundTrip({ connect: connect(model), block });
  assert.equal(ready.m.type, 'editorReady');
  assert.equal(ready.m.blockType, CROSSPOINT_BLOCK_TYPE);
  assert.equal(model.activeRoutes(), 2);
  assert.equal(saved.o, ORIGIN);
  assert.deepEqual(saved.m.block, block);
  assert.equal(w.downloads.length, 0, 'no download when embedded');
});

test('Crosspoint: a short or missing matrix loads as no route, never as a guess', () => {
  const model = new CrosspointMatrixModel(4, 4);
  assert.ok(model.fromBlock({ sources: ['a', 'b'], destinations: ['x', 'y'], matrix: [[true]] }));
  assert.deepEqual(model.matrix, [[true, false], [false, false]]);
  assert.equal(model.fromBlock({ matrix: [] }), false);
  const rows = model.rows();
  assert.deepEqual(rows[0], { src: 'a', d0: true, d1: false });
});

test('Crosspoint: a load without the host@1 protocol field is ignored', () => {
  const model = new CrosspointMatrixModel(8, 8);
  const w = world();
  connect(model)(w.S);
  w.fire({ type: 'load', block: { sources: ['x'], destinations: ['y'], matrix: [[true]] } });
  assert.equal(model.sources.length, 8);
});

test('Crosspoint: discovery kinds are a tunable in config/discovery.json', () => {
  const cfg = JSON.parse(fs.readFileSync(new URL('../config/discovery.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(cfg.kinds));
});
