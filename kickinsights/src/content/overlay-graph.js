if (typeof KI_OverlayGraph !== 'undefined') { /* already loaded */ } else
var KI_OverlayGraph = {
  _container: null,
  _canvas: null,
  _ctx: null,
  _minimized: false,
  _snapshots: [],
  // Dragging state
  _isDragging: false,
  _dragOffsetX: 0,
  _dragOffsetY: 0,
  // Resizing state
  _isResizing: false,
  _resizeStartX: 0,
  _resizeStartY: 0,
  _resizeStartW: 0,
  _resizeStartH: 0,
  // Default dimensions
  _width: 340,
  _height: 220,
  _posX: null,
  _posY: null,

  async init() {
    if (this._container) return;

    // Load saved position/size
    await this._loadState();

    this._container = document.createElement('div');
    this._container.id = 'ki-overlay-graph';
    this._applyPosition();

    // Header with controls
    const header = document.createElement('div');
    header.className = 'ki-overlay-header';

    const title = document.createElement('span');
    title.className = 'ki-overlay-title';
    title.innerHTML = 'KickInsights <span style="color:#555;font-weight:400;font-size:9px">by Ekolsoft</span>';

    const controls = document.createElement('div');
    controls.className = 'ki-overlay-controls';

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'ki-overlay-btn';
    minimizeBtn.innerHTML = '&#x2013;'; // dash
    minimizeBtn.title = 'Minimize';
    minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMinimize(); });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ki-overlay-btn';
    closeBtn.innerHTML = '&#x2715;'; // X
    closeBtn.title = 'Hide';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.hide(); });

    controls.appendChild(minimizeBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    // Census quick-start button in header
    const censusBtn = document.createElement('button');
    censusBtn.className = 'ki-overlay-btn ki-census-quick';
    censusBtn.textContent = 'Census';
    censusBtn.title = 'Start 60s census (Ctrl+Shift+C)';
    censusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Send census start to content script via custom event
      window.dispatchEvent(new CustomEvent('ki-census-toggle'));
    });
    controls.insertBefore(censusBtn, minimizeBtn);

    // Status line
    const statusLine = document.createElement('div');
    statusLine.className = 'ki-overlay-status';
    statusLine.id = 'ki-overlay-status';
    statusLine.textContent = 'Waiting for data...';

    // Canvas
    this._canvas = document.createElement('canvas');
    this._canvas.className = 'ki-overlay-canvas';

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'ki-resize-handle';

    this._container.appendChild(header);
    this._container.appendChild(statusLine);
    this._container.appendChild(this._canvas);
    this._container.appendChild(resizeHandle);
    document.body.appendChild(this._container);

    this._updateCanvasSize();

    // Drag handlers (on header)
    header.addEventListener('mousedown', (e) => this._startDrag(e));

    // Resize handlers (on handle)
    resizeHandle.addEventListener('mousedown', (e) => this._startResize(e));

    // Global mouse handlers
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    document.addEventListener('mouseup', () => this._onMouseUp());
  },

  // --- Position & Size ---

  _applyPosition() {
    const x = this._posX ?? (window.innerWidth - this._width - 20);
    const y = this._posY ?? (window.innerHeight - this._height - 80);
    this._container.style.left = x + 'px';
    this._container.style.top = y + 'px';
    this._container.style.width = this._width + 'px';
    this._container.style.height = this._minimized ? '36px' : this._height + 'px';
  },

  _updateCanvasSize() {
    if (!this._canvas || !this._container) return;
    const w = this._width - 16; // padding
    const h = this._height - 70; // header + status + padding
    this._canvas.width = Math.max(w, 100);
    this._canvas.height = Math.max(h, 60);
    this._ctx = this._canvas.getContext('2d');
    this._draw();
  },

  async _saveState() {
    try {
      const rect = this._container.getBoundingClientRect();
      await chrome.storage.local.set({
        ki_overlay_state: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: this._width,
          height: this._height,
          minimized: this._minimized,
          hidden: this._container.style.display === 'none',
        }
      });
    } catch (e) {}
  },

  async _loadState() {
    try {
      const result = await chrome.storage.local.get('ki_overlay_state');
      const state = result.ki_overlay_state;
      if (state) {
        this._posX = state.x;
        this._posY = state.y;
        this._width = state.width || 340;
        this._height = state.height || 220;
        this._minimized = state.minimized || false;
      }
    } catch (e) {}
  },

  // --- Drag ---

  _startDrag(e) {
    if (e.target.closest('.ki-overlay-btn') || e.target.closest('.ki-overlay-controls')) return;
    this._isDragging = true;
    const rect = this._container.getBoundingClientRect();
    this._dragOffsetX = e.clientX - rect.left;
    this._dragOffsetY = e.clientY - rect.top;
    this._container.style.transition = 'none';
    e.preventDefault();
  },

  // --- Resize ---

  _startResize(e) {
    this._isResizing = true;
    this._resizeStartX = e.clientX;
    this._resizeStartY = e.clientY;
    this._resizeStartW = this._width;
    this._resizeStartH = this._height;
    this._container.style.transition = 'none';
    e.preventDefault();
    e.stopPropagation();
  },

  _onMouseMove(e) {
    if (this._isDragging) {
      const x = e.clientX - this._dragOffsetX;
      const y = e.clientY - this._dragOffsetY;
      this._container.style.left = x + 'px';
      this._container.style.top = y + 'px';
    }
    if (this._isResizing) {
      const dx = e.clientX - this._resizeStartX;
      const dy = e.clientY - this._resizeStartY;
      this._width = Math.max(200, this._resizeStartW + dx);
      this._height = Math.max(120, this._resizeStartH + dy);
      this._container.style.width = this._width + 'px';
      this._container.style.height = this._height + 'px';
      this._updateCanvasSize();
    }
  },

  _onMouseUp() {
    if (this._isDragging || this._isResizing) {
      this._isDragging = false;
      this._isResizing = false;
      this._container.style.transition = '';
      const rect = this._container.getBoundingClientRect();
      this._posX = Math.round(rect.left);
      this._posY = Math.round(rect.top);
      this._saveState();
    }
  },

  // --- Toggle ---

  toggleMinimize() {
    this._minimized = !this._minimized;
    this._container.style.height = this._minimized ? '36px' : this._height + 'px';
    this._container.classList.toggle('ki-minimized', this._minimized);
    this._saveState();
  },

  show() {
    if (this._container) {
      this._container.style.display = 'block';
      this._saveState();
    }
  },

  hide() {
    if (this._container) {
      this._container.style.display = 'none';
      this._saveState();
    }
  },

  // --- Status ---

  updateStatus(text) {
    const el = document.getElementById('ki-overlay-status');
    if (el) el.textContent = text;
  },

  // --- Data ---

  addSnapshot(snapshot) {
    this._snapshots.push(snapshot);
    if (this._snapshots.length > 180) {
      this._snapshots.shift();
    }
    this._draw();
  },

  setSnapshots(snapshots) {
    this._snapshots = snapshots.slice(-180);
    this._draw();
  },

  _draw() {
    if (!this._ctx) return;

    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Show helpful message when not enough data yet
    if (this._snapshots.length < 2) {
      ctx.fillStyle = '#1a1a1e';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#53fc18';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting data...', w / 2, h / 2 - 24);

      ctx.fillStyle = '#888';
      ctx.font = '11px system-ui';
      const lines = [
        'Chat messages are being tracked in real-time.',
        'The graph will appear after ~4 minutes.',
        this._snapshots.length === 0
          ? 'First snapshot in ~2 min.'
          : '1 snapshot collected. Next one in ~2 min.',
      ];
      lines.forEach((line, i) => {
        ctx.fillText(line, w / 2, h / 2 + i * 18);
      });

      ctx.textAlign = 'left';
      return;
    }

    const pad = { top: 18, right: 8, bottom: 4, left: 8 };
    const drawW = w - pad.left - pad.right;
    const drawH = h - pad.top - pad.bottom;

    const kickCounts = this._snapshots.map(s => s.kickCount);
    const estCounts = this._snapshots.map(s => s.estimatedCount);
    const estLow = this._snapshots.map(s => s.estimatedLow || s.estimatedCount);
    const estHigh = this._snapshots.map(s => s.estimatedHigh || s.estimatedCount);
    const allValues = [...kickCounts, ...estHigh].filter(v => v > 0);

    if (allValues.length === 0) return;

    const maxVal = Math.max(...allValues) * 1.1;
    const stepX = drawW / (this._snapshots.length - 1);

    // Draw range band (filled area between low and high)
    this._drawRangeBand(ctx, estLow, estHigh, stepX, pad, drawH, maxVal, '#10b98120');

    // Draw dashed low/high lines
    this._drawLine(ctx, estLow, stepX, pad, drawH, maxVal, '#10b98155', 1, [4, 4]);
    this._drawLine(ctx, estHigh, stepX, pad, drawH, maxVal, '#10b98155', 1, [4, 4]);

    // Draw solid lines
    this._drawLine(ctx, kickCounts, stepX, pad, drawH, maxVal, '#f97316', 1.5);
    this._drawLine(ctx, estCounts, stepX, pad, drawH, maxVal, '#10b981', 2);

    // Legend
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#f97316';
    ctx.fillText('Kick', pad.left, 12);
    ctx.fillStyle = '#10b981';
    ctx.fillText('Est.', pad.left + 40, 12);
    ctx.fillStyle = '#10b98177';
    ctx.fillText('Range', pad.left + 72, 12);

    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.fillText(KI_Format.compactNumber(Math.round(maxVal)), w - pad.right, 12);
    ctx.textAlign = 'left';
  },

  _drawLine(ctx, values, stepX, pad, drawH, maxVal, color, lineWidth, dash) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash || []);

    for (let i = 0; i < values.length; i++) {
      const x = pad.left + i * stepX;
      const y = pad.top + drawH - (values[i] / maxVal) * drawH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  },

  _drawRangeBand(ctx, lowValues, highValues, stepX, pad, drawH, maxVal, color) {
    if (lowValues.length < 2) return;
    ctx.beginPath();
    ctx.fillStyle = color;

    // Top edge (high values, left to right)
    for (let i = 0; i < highValues.length; i++) {
      const x = pad.left + i * stepX;
      const y = pad.top + drawH - (highValues[i] / maxVal) * drawH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Bottom edge (low values, right to left)
    for (let i = lowValues.length - 1; i >= 0; i--) {
      const x = pad.left + i * stepX;
      const y = pad.top + drawH - (lowValues[i] / maxVal) * drawH;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  },

  destroy() {
    if (this._container) {
      this._container.remove();
      this._container = null;
      this._canvas = null;
      this._ctx = null;
    }
    this._snapshots = [];
  },
};

if (typeof module !== 'undefined') module.exports = { KI_OverlayGraph };
