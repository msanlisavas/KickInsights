const KI_OverlayGraph = {
  _container: null,
  _canvas: null,
  _ctx: null,
  _collapsed: false,
  _snapshots: [],

  init() {
    if (this._container) return;

    this._container = document.createElement('div');
    this._container.id = 'ki-overlay-graph';

    const header = document.createElement('div');
    header.className = 'ki-overlay-header';
    header.innerHTML = '<span>KickInsights</span><span class="ki-toggle">&#x25BC;</span>';
    header.addEventListener('click', () => this.toggle());

    this._canvas = document.createElement('canvas');
    this._canvas.width = 304;
    this._canvas.height = 160;
    this._ctx = this._canvas.getContext('2d');

    this._container.appendChild(header);
    this._container.appendChild(this._canvas);
    document.body.appendChild(this._container);
  },

  toggle() {
    this._collapsed = !this._collapsed;
    this._container.classList.toggle('ki-collapsed', this._collapsed);
    const toggle = this._container.querySelector('.ki-toggle');
    toggle.innerHTML = this._collapsed ? '&#x25B2;' : '&#x25BC;';
  },

  show() {
    if (this._container) this._container.style.display = 'block';
  },

  hide() {
    if (this._container) this._container.style.display = 'none';
  },

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
    if (!this._ctx || this._snapshots.length < 2) return;

    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    ctx.clearRect(0, 0, w, h);

    const kickCounts = this._snapshots.map(s => s.kickCount);
    const estCounts = this._snapshots.map(s => s.estimatedCount);
    const allValues = [...kickCounts, ...estCounts].filter(v => v > 0);

    if (allValues.length === 0) return;

    const maxVal = Math.max(...allValues) * 1.1;
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const stepX = w / (this._snapshots.length - 1);

    this._drawLine(ctx, kickCounts, stepX, h, minVal, range, '#f97316', 1.5);
    this._drawLine(ctx, estCounts, stepX, h, minVal, range, '#10b981', 2);

    ctx.font = '10px system-ui';
    ctx.fillStyle = '#f97316';
    ctx.fillText('Kick', 8, 12);
    ctx.fillStyle = '#10b981';
    ctx.fillText('Est.', 48, 12);

    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(KI_Format.compactNumber(Math.round(maxVal)), w - 4, 12);
    ctx.textAlign = 'left';
  },

  _drawLine(ctx, values, stepX, height, minVal, range, color, lineWidth) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    for (let i = 0; i < values.length; i++) {
      const x = i * stepX;
      const y = height - ((values[i] - minVal) / range) * (height - 20);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
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
