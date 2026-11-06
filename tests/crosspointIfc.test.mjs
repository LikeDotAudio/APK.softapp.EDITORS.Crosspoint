// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3583: the matrix block's .ifc twin (js/crosspointIfc.js) — written byte-deterministically, read back to
// the same block, saved beside the .json by the vendored APKSoftapp.saveModel. IFC_OUT=<dir> npm test also
// writes the file there, for IfcOpenShell validate + the BIM oracle (DATABASE.server.BIM editors_census.py).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CrosspointMatrixModel } from '../js/crosspointModel.js';
import { crosspointToIfc, crosspointFromIfc } from '../js/crosspointIfc.js';
import { getPsets, ifcGuid, parseStep, ports, schemaOf } from '../vendor/apk-contracts/apk-ifc.js';
import { buildBundle, BUNDLE } from '../scripts/vendor-ifc.mjs';
import { world } from './softapp-harness.mjs';

function out(name, text) {
  if (!process.env.IFC_OUT) return;
  mkdirSync(process.env.IFC_OUT, { recursive: true });
  writeFileSync(join(process.env.IFC_OUT, name), text);
}

const fixture = () => {
  const m = new CrosspointMatrixModel(4, 3);
  m.renameSource(0, 'Mic 1');
  m.renameDestination(2, 'Stream L');
  m.toggle(2, 0);          // SRC 3 also feeds DST 1: a summed destination
  m.toggle(1, 1);          // DST 2 has no route
  return m.toBlock();
};
const of = (f, type) => f.entities.filter((e) => e.type === type);

test('the vendored STEP codec is what contracts/src/ifc builds to today', async () => {
  const now = await buildBundle();
  if (now == null) return;
  assert.equal(readFileSync(BUNDLE, 'utf8'), now, 'run node scripts/vendor-ifc.mjs');
});

test('a 4×3 matrix: one SWITCHER, sources SINK, destinations SOURCE, the routes on the destinations', () => {
  const text = crosspointToIfc(fixture(), { name: 'matrix' });
  out('crosspoint-matrix.ifc', text);
  const f = parseStep(text);
  assert.equal(schemaOf(f), 'IFC4X3_ADD2');
  const [router] = of(f, 'IFCAUDIOVISUALAPPLIANCE');
  assert.equal(router.args[8].value, 'SWITCHER');
  assert.equal(router.args[0], ifcGuid('crosspoint', 'matrix', 'router'));
  assert.equal(of(f, 'IFCAUDIOVISUALAPPLIANCETYPE')[0].args[9].value, 'SWITCHER');
  const ps = ports(f, router);
  assert.deepEqual(ps.map((p) => [p.args[2], p.args[7].value]), [
    ['Mic 1', 'SINK'], ['SRC 2', 'SINK'], ['SRC 3', 'SINK'], ['SRC 4', 'SINK'],
    ['DST 1', 'SOURCE'], ['DST 2', 'SOURCE'], ['Stream L', 'SOURCE'],
  ]);
  const routed = ps.slice(4).map((p) => getPsets(f, p).APK_CrosspointRoute?.RoutedFrom ?? null);
  assert.deepEqual(routed, [['I1', 'I3'], null, ['I3']]);
  assert.deepEqual(getPsets(f, ps[0]).APK_Terminal, { TerminalId: 'I1', Side: 'input', Group: 'sources' });
  assert.equal(getPsets(f, ps[6]).Pset_DistributionPortCommon.PortNumber, 3);
  assert.equal(of(f, 'IFCRELCONNECTSPORTS').length, 0, 'a crosspoint is a state inside the switcher, never a connection');
});

test('read back: the same block; written again: the same bytes', () => {
  const block = fixture();
  const text = crosspointToIfc(block, { name: 'matrix' });
  assert.equal(text, crosspointToIfc(JSON.parse(JSON.stringify(block)), { name: 'matrix' }));
  const back = crosspointFromIfc(text);
  assert.deepEqual(back, block);
  assert.equal(crosspointToIfc(back, { name: 'matrix' }), text);
  const m = new CrosspointMatrixModel(2, 2);
  assert.ok(m.fromBlock(back));
  assert.equal(m.activeRoutes(), 3);
});

test('not a matrix: a sentence, never a half-read block', () => {
  const text = crosspointToIfc(fixture(), { name: 'matrix' }).replace(/\.SWITCHER\./g, '.AMPLIFIER.');
  assert.throws(() => crosspointFromIfc(text), /no crosspoint matrix in this IFC/);
});

test('Save Model writes matrix.ifc then matrix.json; the .ifc is the block\'s twin', async () => {
  const w = world({ framed: false });
  const block = fixture();
  const r = await w.S.saveModel(block, { name: 'matrix', toIfc: (b) => crosspointToIfc(b, { name: 'matrix' }) });
  assert.equal(r.ok, true);
  assert.deepEqual(w.downloads.map((d) => d.name), ['matrix.ifc', 'matrix.json']);
  assert.match(w.downloads[0].text, /^ISO-10303-21;/);
  assert.deepEqual(JSON.parse(w.downloads[1].text), block);
});
