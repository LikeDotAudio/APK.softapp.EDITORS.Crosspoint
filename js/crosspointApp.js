// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { BlockBridge } from './blockBridge.js';
import { CrosspointMatrixModel } from './crosspointModel.js';

export class CrosspointApp {
  constructor() {
    this.model = new CrosspointMatrixModel(8, 8);

    this.bridge = new BlockBridge({
      name: 'Crosspoint Matrix',
      type: 'crosspoint_matrix',
      onBlockLoaded: (block, meta) => this.handleBlockLoaded(block, meta),
      onBlockChanged: () => {},
    });

    this.initElements();
    this.attachEvents();
    this.loadInitialData();
  }

  initElements() {
    this.btnOpen = document.getElementById('btn-open');
    this.btnSave = document.getElementById('btn-save');
    this.btnClose = document.getElementById('btn-close');
    this.btnSyncDiscovered = document.getElementById('btn-sync-discovered');

    this.matrixTable = document.getElementById('matrix-table');
    this.btnDiagonal = document.getElementById('btn-diagonal');
    this.btnClear = document.getElementById('btn-clear');
    this.selectDim = document.getElementById('select-dimensions');
    this.activeRoutesEl = document.getElementById('active-routes');
  }

  attachEvents() {
    this.btnOpen?.addEventListener('click', () => this.promptOpen());
    this.btnSave?.addEventListener('click', () => this.saveBlock());
    this.btnClose?.addEventListener('click', () => this.bridge.close());
    this.btnSyncDiscovered?.addEventListener('click', () => this.loadFromDiscoveredProject());

    this.selectDim?.addEventListener('change', (e) => {
      const dim = parseInt(e.target.value, 10);
      this.model = new CrosspointMatrixModel(dim, dim);
      this.render();
      this.bridge.notifyChanged();
    });

    this.btnDiagonal?.addEventListener('click', () => {
      this.model.diagonalSalvo();
      this.render();
      this.bridge.notifyChanged();
    });

    this.btnClear?.addEventListener('click', () => {
      this.model.clearAll();
      this.render();
      this.bridge.notifyChanged();
    });
  }

  loadInitialData() {
    this.loadFromDiscoveredProject().catch(() => {
      this.render();
    });
  }

  async loadFromDiscoveredProject() {
    try {
      const data = await this.bridge.fetchDiscoveredProject();
      if (data && (data.matrix || data.crosspoint || data.routes)) {
        const raw = data.matrix || data.crosspoint || data.routes;
        this.handleBlockLoaded(raw, { title: 'Discovered Matrix' });
        return;
      }
    } catch (_) {}
    this.render();
  }

  handleBlockLoaded(block, meta = {}) {
    if (!block) return;
    if (Array.isArray(block.sources) && Array.isArray(block.destinations)) {
      this.model.sources = block.sources;
      this.model.destinations = block.destinations;
      this.model.matrix = block.matrix || Array.from({ length: block.sources.length }, () => Array(block.destinations.length).fill(false));
    }
    this.render();
  }

  saveBlock() {
    const block = {
      type: 'crosspoint_matrix',
      sources: this.model.sources,
      destinations: this.model.destinations,
      matrix: this.model.matrix,
      timestamp: new Date().toISOString(),
    };
    this.bridge.saveBlock(block, {
      title: `Matrix ${this.model.sources.length}×${this.model.destinations.length}`,
      filename: `matrix_${Date.now()}`,
    });
  }

  render() {
    this.renderMatrix();
    this.renderTelemetry();
  }

  renderTelemetry() {
    let active = 0;
    this.model.matrix.forEach(row => {
      row.forEach(cell => { if (cell) active++; });
    });
    this.activeRoutesEl.textContent = `${active} Active Routes`;
  }

  renderMatrix() {
    this.matrixTable.innerHTML = '';

    // Header row (Destinations)
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>SRC \\ DST</th>';
    this.model.destinations.forEach((d, dIdx) => {
      const th = document.createElement('th');
      th.innerHTML = `<input type="text" class="cell-input text-center" style="width:75px; font-weight:bold; color:var(--osc-accent-secondary);" data-type="dst" data-idx="${dIdx}" value="${d}">`;
      headerRow.appendChild(th);
    });
    this.matrixTable.appendChild(headerRow);

    // Source rows
    this.model.sources.forEach((s, sIdx) => {
      const tr = document.createElement('tr');
      const rowTh = document.createElement('th');
      rowTh.style.textAlign = 'left';
      rowTh.innerHTML = `<input type="text" class="cell-input" style="width:90px; font-weight:bold; color:var(--osc-accent-primary);" data-type="src" data-idx="${sIdx}" value="${s}">`;
      tr.appendChild(rowTh);

      this.model.destinations.forEach((d, dIdx) => {
        const td = document.createElement('td');
        const isConn = this.model.isConnected(sIdx, dIdx);
        const btn = document.createElement('button');
        btn.className = `matrix-btn ${isConn ? 'active' : ''}`;
        btn.style.width = '24px';
        btn.style.height = '24px';
        btn.style.borderRadius = '3px';
        btn.style.cursor = 'pointer';
        btn.style.background = isConn ? 'var(--osc-accent-primary)' : 'var(--osc-bg-input)';
        btn.style.border = `1px solid ${isConn ? 'var(--osc-accent-primary)' : 'var(--osc-border-default)'}`;
        btn.style.color = isConn ? '#000' : 'transparent';
        btn.textContent = isConn ? '●' : '';

        btn.addEventListener('click', () => {
          this.model.toggle(sIdx, dIdx);
          this.render();
          this.bridge.notifyChanged();
        });

        td.appendChild(btn);
        tr.appendChild(td);
      });

      this.matrixTable.appendChild(tr);
    });

    // Rename inputs
    this.matrixTable.querySelectorAll('.cell-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const type = e.target.dataset.type;
        if (type === 'src') {
          this.model.sources[idx] = e.target.value;
        } else {
          this.model.destinations[idx] = e.target.value;
        }
        this.bridge.notifyChanged();
      });
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
      reader.onload = (re) => {
        try {
          const parsed = JSON.parse(re.target.result);
          this.handleBlockLoaded(parsed, { title: file.name });
        } catch (err) {
          alert('Invalid JSON matrix block');
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
