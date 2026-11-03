import test from 'node:test';
import assert from 'node:assert/strict';
import { CrosspointMatrixModel } from '../js/crosspointApp.js';

test('CrosspointMatrixModel toggles crosspoint ties and tracks connections', () => {
  const m = new CrosspointMatrixModel(4, 4);
  assert.equal(m.isConnected(0, 0), true);

  // Toggle off
  const turnedOff = m.toggle(0, 0);
  assert.equal(turnedOff, false);
  assert.equal(m.isConnected(0, 0), false);

  // Toggle on
  const turnedOn = m.toggle(0, 0);
  assert.equal(turnedOn, true);
  assert.equal(m.isConnected(0, 0), true);
});
