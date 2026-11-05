// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* crosspointApp.js — the Crosspoint editor. The block goes in and out over
   cad.like.audio/host@1 (window.APKSoftapp.connectHost, vendor/apk-softapp/);
   the grid is APKTable 'crosspoint-matrix' and the destination names APKTable
   'crosspoint-destinations' (vendor/apk-table/). "Discovered" lists the routers
   the bus knows (APKSoftapp.discoveredPanel, kinds in config/discovery.json); it
   shows them as found and never invents a route. */

import { CrosspointMatrixModel, CROSSPOINT_BLOCK_TYPE } from './crosspointModel.js';

export class CrosspointApp {
  constructor() {
    this.model = new CrosspointMatrixModel(8, 8);
    const S = window.APKSoftapp;
    S.inheritTheme();

    S.describe({
      name: 'Crosspoint Matrix',
      does: 'A router crosspoint grid: which source feeds which destination, as a matrix block for the CAD. It never routes a real router.',
      inputs: [
        { name: 'Matrix block', from: 'the CAD (when opened from a drawing), or a .json file via Open', kind: 'file' },
        { name: 'Discovered routers', from: 'the bus: things scanners and agents found (kinds in config/discovery.json), shown read-only', kind: 'bus' },
      ],
      outputs: [
        { name: 'Matrix block', to: 'the CAD on Save & Return and on every edit; standalone Save downloads matrix.json', kind: 'file' },
      ],
      controls: [
        { name: 'Crosspoint buttons', how: 'click a cell to make or break that source to destination route' },
        { name: 'Size', how: 'pick the matrix dimension (starts a new empty grid)' },
        { name: '1:1 Diagonal Salvo / Clear All Routes', how: 'route source n to destination n, or clear every route' },
        { name: 'Source / destination names', how: 'edit the SRC column and the Destination table in place' },
        { name: 'Discovered / Open / Save & Return / Close', how: 'header buttons' },
      ],
      problems: ['bad_json', 'bad_input', 'file_unreadable', 'not_in_cad', 'bus_missing'],
    });

    this.initElements();
    this.host = S.connectHost({
      editor: 'Crosspoint Matrix',
      blockType: CROSSPOINT_BLOCK_TYPE,
      onLoad: (block, meta) => this.handleBlockLoaded(block, meta),
      onRequest: () => this.model.toBlock(),
    });
    // the Discovered panel is the shared client's (ROAD-3502); start() draws it once, on first show
    this.discovered = {
      start: () => (this.discoveredRun ||= window.APKSoftapp?.discoveredPanel(document.getElementById('discovered-table'), {
        id: 'crosspoint-discovered',
        status: document.getElementById('discovered-status'),
        configUrl: new URL('../config/discovery.json', import.meta.url),
      })),
    };
    this.attachEvents();
    this.render();
  }

  initElements() {
    this.btnOpen = document.getElementById('btn-open');
    this.btnSave = document.getElementById('btn-save');
    this.btnClose = document.getElementById('btn-close');
    this.btnSyncDiscovered = document.getElementById('btn-sync-discovered');
    this.discoveredPanelEl = document.getElementById('discovered-panel');
    this.matrixHost = document.getElementById('matrix-table');
    this.destHost = document.getElementById('destinations-table');
    this.btnDiagonal = document.getElementById('btn-diagonal');
    this.btnClear = document.getElementById('btn-clear');
    this.selectDim = document.getElementById('select-dimensions');
    this.activeRoutesEl = document.getElementById('active-routes');
  }

  attachEvents() {
    this.btnOpen?.addEventListener('click', () => this.promptOpen());
    this.btnSave?.addEventListener('click', () => this.saveBlock());
    this.btnClose?.addEventListener('click', () => this.host.close());
    this.btnSyncDiscovered?.addEventListener('click', () => {
      if (this.discoveredPanelEl) this.discoveredPanelEl.hidden = !this.discoveredPanelEl.hidden;
      this.discovered.start();
    });
    this.selectDim?.addEventListener('change', (e) => {
      const dim = parseInt(e.target.value, 10);
      this.model = new CrosspointMatrixModel(dim, dim);
      this.changed();
    });
    this.btnDiagonal?.addEventListener('click', () => { this.model.diagonalSalvo(); this.changed(); });
    this.btnClear?.addEventListener('click', () => { this.model.clearAll(); this.changed(); });
  }

  changed() {
    this.render();
    this.host.changed(this.model.toBlock());
  }

  handleBlockLoaded(block, meta = {}) {
    if (!this.model.fromBlock(block)) return false;
    const tag = document.getElementById('block-tag');
    if (tag && (meta.title || meta.blockName)) tag.textContent = meta.title || meta.blockName;
    this.render();
    return true;
  }

  saveBlock() {
    this.host.save(this.model.toBlock(), {
      title: `Matrix ${this.model.sources.length}×${this.model.destinations.length}`,
      filename: 'matrix',
    });
  }

  render() {
    this.renderMatrix();
    this.renderDestinations();
    this.activeRoutesEl.textContent = `${this.model.activeRoutes()} Active Routes`;
  }

  crosspointButton(s, d) {
    const on = this.model.isConnected(s, d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `matrix-btn${on ? ' active' : ''}`;
    btn.title = `${this.model.sources[s]} → ${this.model.destinations[d]}`;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '●' : '';
    btn.addEventListener('click', () => { this.model.toggle(s, d); this.changed(); });
    return btn;
  }

  renderMatrix() {
    const columns = [{ key: 'src', label: 'SRC \\ DST', mono: true }];
    this.model.destinations.forEach((name, d) => {
      columns.push({ key: `d${d}`, label: name, align: 'center', render: (_v, _row, s) => this.crosspointButton(s, d) });
    });
    this.matrixTable = window.APKTable.create(this.matrixHost, {
      id: 'crosspoint-matrix',
      sortable: false,
      columns,
      rows: this.model.rows(),
      onEdit: (s, key, value) => { if (key === 'src') { this.model.renameSource(s, value); this.host.changed(this.model.toBlock()); } },
      empty: 'No sources.',
    });
  }

  renderDestinations() {
    this.destTable = window.APKTable.create(this.destHost, {
      id: 'crosspoint-destinations',
      columns: [
        { key: 'n', label: '#', type: 'number', editable: false },
        { key: 'name', label: 'Destination' },
      ],
      rows: this.model.destinations.map((name, d) => ({ n: d + 1, name })),
      onEdit: (d, key, value) => { if (key === 'name') { this.model.renameDestination(d, value); this.changed(); } },
      empty: 'No destinations.',
    });
  }

  promptOpen() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      const retry = () => this.promptOpen();
      reader.onerror = () => window.APKSoftapp.showProblem('file_unreadable', {
        subject: file.name, detail: reader.error && reader.error.message, onRetry: retry,
      });
      reader.onload = (re) => {
        try {
          if (!this.handleBlockLoaded(JSON.parse(re.target.result), { title: file.name })) {
            throw new TypeError('no "sources" and "destinations" lists: this is not a matrix block');
          }
          this.host.changed(this.model.toBlock());
        } catch (err) {
          window.APKSoftapp.showProblem(err instanceof SyntaxError ? 'bad_json' : 'bad_input', {
            subject: file.name,
            detail: err.message,
            fix: ['Open a crosspoint matrix block .json (Save & Return outside the CAD downloads matrix.json).'],
            onRetry: retry,
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.crosspointApp = new CrosspointApp();
  });
}
