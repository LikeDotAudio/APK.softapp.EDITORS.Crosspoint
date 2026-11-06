// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* crosspointIfc.js — THE MATRIX BLOCK'S .IFC TWIN (ROAD-3583). Save Model writes the native matrix block
   (toBlock) AND this IFC4X3_ADD2 file through APKSoftapp.saveModel; Open Model reads it back to the same
   block. Written with the contracts STEP codec (vendor/apk-contracts/apk-ifc.js, scripts/vendor-ifc.mjs),
   no IfcOpenShell in the page. Byte-deterministic: the same matrix writes the same file.

     IfcProject ─ IfcSite ─ IfcBuilding ─ IfcBuildingStorey 'Routing'                     units: mm
     the router     IfcAudioVisualAppliance SWITCHER (Tag = the file stem), typed by an
                    IfcAudioVisualApplianceType SWITCHER (one per size, 'Crosspoint matrix 8×8'), declared
                    by the project; contained in the storey
     a source       IfcDistributionPort CABLE AUDIOVISUAL, FlowDirection SINK (it goes INTO the router),
                    Name = the source's name; Pset_DistributionPortCommon.PortNumber n;
                    APK_Terminal {TerminalId I<n>, Side input, Group sources}
     a destination  IfcDistributionPort, FlowDirection SOURCE (it comes OUT of the router), Name = its name;
                    PortNumber n; APK_Terminal {TerminalId O<n>, Side output, Group destinations}
     a crosspoint   APK_CrosspointRoute.RoutedFrom on the destination port: the TerminalIds of the sources
                    the saved matrix routes to it, in source order (none written: no route).
   WHY A CROSSPOINT IS NOT AN IfcRelConnectsPorts: IfcRelConnectsPorts is a physical link between two ports
   (a cable, a patch). A crosspoint is a state inside the one switcher, which a router changes many times a
   second; IFC has no word for it (IFC-CORE-DELTAS-DETAIL: "no IFC entity for an audio patch bay or
   crosspoint matrix"). This editor never routes a real router, so what it saves is a planned salvo: the
   routes go in an APK_ set (declared in DATABASE.server.BIM SRC/tools/ifc/apk_psets_editors.py), never
   as a connection, and a live router's state is the bus's, never the file's. */

import { entitiesByType, enumv, getPsets, ifcGuid, parseStep, ports, real, ref, typed, writeStep } from '../vendor/apk-contracts/apk-ifc.js';
import { CROSSPOINT_BLOCK_TYPE } from './crosspointModel.js';

export const CROSSPOINT_IFC_SCHEMA = 'IFC4X3_ADD2';
const STAMP = '1970-01-01T00:00:00';   // fixed: the file is a function of the matrix, never of the clock

const str = (v) => (v == null ? '' : String(v));
const label = (s) => typed('IFCLABEL', String(s));
const ident = (s) => typed('IFCIDENTIFIER', String(s));
const int = (n) => typed('IFCINTEGER', Math.trunc(n));
const stemOf = (name) => String(name || 'matrix').replace(/\.(ifc|json)$/i, '') || 'matrix';

class Writer {
  constructor() { this.entities = []; }
  add(type, ...args) {
    const id = this.entities.length + 1;
    this.entities.push({ id, type, args });
    return ref(id);
  }
}

/** The matrix block (toBlock) as IFC4X3_ADD2 STEP text. `name` is the file stem; every GlobalId is uuid5 of
    crosspoint/<stem>/..., so the same matrix saved again under the same name keeps every GlobalId. */
export function crosspointToIfc(block, { name } = {}) {
  const b = block || {};
  const sources = Array.isArray(b.sources) ? b.sources.map(str) : [];
  const dests = Array.isArray(b.destinations) ? b.destinations.map(str) : [];
  const m = Array.isArray(b.matrix) ? b.matrix : [];
  const on = (s, d) => !!(m[s] && m[s][d]);
  const stem = stemOf(name);
  const size = `${sources.length}×${dests.length}`;
  const W = new Writer();
  const P = ifcGuid('crosspoint', stem);
  const g = (...roles) => ifcGuid('crosspoint', stem, ...roles);

  // ---- owner, units (mm), context, the spine
  const person = W.add('IFCPERSON', null, 'APK.audio', null, null, null, null, null, null);
  const org = W.add('IFCORGANIZATION', null, 'APK.audio', 'Crosspoint editor', null, null);
  const po = W.add('IFCPERSONANDORGANIZATION', person, org, null);
  const app = W.add('IFCAPPLICATION', org, '1', 'APK.audio crosspoint editor', 'EDITORS.Crosspoint');
  const oh = W.add('IFCOWNERHISTORY', po, app, null, null, null, null, null, 0);
  const mm = W.add('IFCSIUNIT', { kind: 'derived' }, enumv('LENGTHUNIT'), enumv('MILLI'), enumv('METRE'));
  const units = W.add('IFCUNITASSIGNMENT', [mm]);
  const origin = W.add('IFCAXIS2PLACEMENT3D', W.add('IFCCARTESIANPOINT', [real(0), real(0), real(0)]), null, null);
  const ctx = W.add('IFCGEOMETRICREPRESENTATIONCONTEXT', null, 'Model', 3, real(1e-5), origin, null);
  const project = W.add('IFCPROJECT', P, oh, stem, 'Crosspoint editor: one router matrix', null, null, null, [ctx], units);
  const sitePl = W.add('IFCLOCALPLACEMENT', null, origin);
  const buildingPl = W.add('IFCLOCALPLACEMENT', sitePl, origin);
  const storeyPl = W.add('IFCLOCALPLACEMENT', buildingPl, origin);
  const site = W.add('IFCSITE', g('site'), oh, 'Site', null, null, sitePl, null, null, enumv('ELEMENT'), null, null, null, null, null);
  const building = W.add('IFCBUILDING', g('building'), oh, 'Building', null, null, buildingPl, null, null, enumv('ELEMENT'), null, null, null);
  const storey = W.add('IFCBUILDINGSTOREY', g('storey'), oh, 'Routing', null, null, storeyPl, null, null, enumv('ELEMENT'), real(0));
  W.add('IFCRELAGGREGATES', g('aggregates', 'project'), oh, null, null, project, [site]);
  W.add('IFCRELAGGREGATES', g('aggregates', 'site'), oh, null, null, site, [building]);
  W.add('IFCRELAGGREGATES', g('aggregates', 'building'), oh, null, null, building, [storey]);

  const rels = [];
  const prop = (n, v) => (v == null || v === '' ? null : W.add('IFCPROPERTYSINGLEVALUE', n, null, v, null));
  const listProp = (n, vs) => (vs.length ? W.add('IFCPROPERTYLISTVALUE', n, null, vs, null) : null);
  const pset = (setName, ownerGid, props, owner) => {
    const list = props.filter(Boolean);
    if (!list.length) return;
    const ps = W.add('IFCPROPERTYSET', ifcGuid('crosspoint', stem, 'pset', ownerGid, setName), oh, setName, null, list);
    rels.push({ ps, owner, gid: ifcGuid('crosspoint', stem, 'props', ownerGid, setName) });
  };

  // ---- the router and its type
  const type = W.add('IFCAUDIOVISUALAPPLIANCETYPE', ifcGuid('crosspoint-type', size), oh, `Crosspoint matrix ${size}`, null, null, null, null, null, null, enumv('SWITCHER'));
  W.add('IFCRELDECLARES', g('declares'), oh, null, null, project, [type]);
  const routerGid = g('router');
  const router = W.add('IFCAUDIOVISUALAPPLIANCE', routerGid, oh, `Matrix ${size}`,
    'Crosspoint matrix as the editor saved it: the routes are a planned salvo (APK_CrosspointRoute), never a live router state',
    null, W.add('IFCLOCALPLACEMENT', storeyPl, origin), null, stem, enumv('SWITCHER'));
  W.add('IFCRELDEFINESBYTYPE', g('typed'), oh, null, null, [router], type);

  // ---- its ports: the sources in, the destinations out
  const nested = [];
  const port = (kind, i, nameText) => {
    const input = kind === 'I';
    const gid = g('port', `${kind}${i + 1}`);
    const p = W.add('IFCDISTRIBUTIONPORT', gid, oh, nameText || `${input ? 'SRC' : 'DST'} ${i + 1}`, null, null, null, null,
      enumv(input ? 'SINK' : 'SOURCE'), enumv('CABLE'), enumv('AUDIOVISUAL'));
    nested.push(p);
    pset('Pset_DistributionPortCommon', gid, [prop('PortNumber', int(i + 1))], p);
    pset('APK_Terminal', gid, [
      prop('TerminalId', ident(`${kind}${i + 1}`)),
      prop('Side', label(input ? 'input' : 'output')),
      prop('Group', label(input ? 'sources' : 'destinations')),
    ], p);
    return { p, gid };
  };
  sources.forEach((s, i) => port('I', i, s));
  dests.forEach((d, j) => {
    const { p, gid } = port('O', j, d);
    const from = sources.map((_, s) => (on(s, j) ? ident(`I${s + 1}`) : null)).filter(Boolean);
    pset('APK_CrosspointRoute', gid, [listProp('RoutedFrom', from)], p);
  });
  if (nested.length) W.add('IFCRELNESTS', g('nests'), oh, null, null, router, nested);
  W.add('IFCRELCONTAINEDINSPATIALSTRUCTURE', g('contains'), oh, null, null, [router], storey);
  for (const { ps, owner, gid } of rels) W.add('IFCRELDEFINESBYPROPERTIES', gid, oh, null, null, [owner], ps);

  return writeStep({
    header: [
      { type: 'FILE_DESCRIPTION', args: [['ViewDefinition [ReferenceView]'], '2;1'] },
      { type: 'FILE_NAME', args: [`${stem}.ifc`, STAMP, ['APK.audio'], ['APK.audio'], 'APK.audio crosspoint editor', 'EDITORS.Crosspoint', ''] },
      { type: 'FILE_SCHEMA', args: [[CROSSPOINT_IFC_SCHEMA]] },
    ],
    entities: W.entities,
  });
}

/* ───────────────────────── reading it back ───────────────────────── */

const flat = (v) => (v && typeof v === 'object' && 'value' in v ? v.value : v);
const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]).map((x) => str(flat(x)));
const order = (ps) => (e) => Number(flat(ps(e).Pset_DistributionPortCommon?.PortNumber)) || 0;

/** An IFC model → the matrix block. The router is the first IfcAudioVisualAppliance SWITCHER that has ports;
    its SINK ports are the sources, its SOURCE ports the destinations (each in PortNumber order). Throws a
    sentence when the file holds no switcher. */
export function crosspointFromIfc(text) {
  const file = parseStep(String(text));
  const switchers = entitiesByType(file, 'IFCAUDIOVISUALAPPLIANCE')
    .filter((e) => e.args[8] && e.args[8].value === 'SWITCHER');
  const router = switchers.find((e) => ports(file, e).length) || switchers[0];
  if (!router) throw new TypeError('no crosspoint matrix in this IFC: it has no IfcAudioVisualAppliance SWITCHER');
  const ps = (e) => getPsets(file, e);
  const all = ports(file, router);
  const byDir = (dir) => all.filter((p) => isEnum(p.args[7], dir)).sort((a, z) => order(ps)(a) - order(ps)(z));
  const ins = byDir('SINK');
  const outs = byDir('SOURCE');
  const idOf = (p, kind, i) => str(flat(ps(p).APK_Terminal?.TerminalId)) || `${kind}${i + 1}`;
  const srcIndex = new Map(ins.map((p, i) => [idOf(p, 'I', i), i]));
  const matrix = ins.map(() => outs.map(() => false));
  outs.forEach((p, d) => {
    for (const id of asList(ps(p).APK_CrosspointRoute?.RoutedFrom)) {
      const s = srcIndex.get(id);
      if (s != null) matrix[s][d] = true;
    }
  });
  return {
    type: CROSSPOINT_BLOCK_TYPE,
    sources: ins.map((p) => str(p.args[2])),
    destinations: outs.map((p) => str(p.args[2])),
    matrix,
  };
}

const isEnum = (v, word) => !!v && typeof v === 'object' && v.kind === 'enum' && v.value === word;
