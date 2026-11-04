// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import test from 'node:test';
import assert from 'node:assert/strict';

import { CrosspointMatrixModel } from '../js/crosspointModel.js';

test('Crosspoint Matrix Initialization and Diagonal Salvo', () => {
  const model = new CrosspointMatrixModel(8, 8);
  assert.equal(model.sources.length, 8);
  assert.equal(model.destinations.length, 8);
  assert.ok(model.isConnected(0, 0));
  assert.ok(model.isConnected(1, 1));
  assert.ok(!model.isConnected(0, 1));

  model.toggle(0, 1);
  assert.ok(model.isConnected(0, 1));

  model.clearAll();
  assert.ok(!model.isConnected(0, 0));

  model.diagonalSalvo();
  assert.ok(model.isConnected(0, 0));
});
