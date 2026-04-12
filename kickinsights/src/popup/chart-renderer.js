const KI_ChartRenderer = {
  draw(canvas, snapshots) {
    if (!canvas || snapshots.length < 2) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 20, right: 10, bottom: 20, left: 40 };

    const drawW = w - padding.left - padding.right;
    const drawH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(0, 0, w, h);

    const kickCounts = snapshots.map(s => s.kickCount);
    const estCounts = snapshots.map(s => s.estimatedCount);
    const estLow = snapshots.map(s => s.estimatedLow || s.estimatedCount);
    const estHigh = snapshots.map(s => s.estimatedHigh || s.estimatedCount);
    const allValues = [...kickCounts, ...estHigh].filter(v => v > 0);
    if (allValues.length === 0) return;

    const maxVal = Math.max(...allValues) * 1.1;
    const stepX = drawW / (snapshots.length - 1);

    // Grid lines
    ctx.strokeStyle = '#2a2a2e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (drawH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const val = maxVal - (maxVal / 4) * i;
      ctx.fillStyle = '#666';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(KI_Format.compactNumber(Math.round(val)), padding.left - 4, y + 4);
    }

    // Range band (filled area)
    this._drawRangeBand(ctx, estLow, estHigh, stepX, padding, drawH, maxVal, '#10b98118');

    // Dashed low/high lines
    this._drawLine(ctx, estLow, stepX, padding, drawH, maxVal, '#10b98155', 1, [4, 4]);
    this._drawLine(ctx, estHigh, stepX, padding, drawH, maxVal, '#10b98155', 1, [4, 4]);

    // Solid lines
    this._drawLine(ctx, kickCounts, stepX, padding, drawH, maxVal, '#f97316', 1.5);
    this._drawLine(ctx, estCounts, stepX, padding, drawH, maxVal, '#10b981', 2);

    // Legend
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#f97316';
    ctx.fillRect(padding.left, 6, 10, 10);
    ctx.fillText('Kick', padding.left + 14, 14);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(padding.left + 60, 6, 10, 10);
    ctx.fillText('Est.', padding.left + 74, 14);
    ctx.fillStyle = '#10b98177';
    ctx.fillText('Range', padding.left + 100, 14);
  },

  _drawLine(ctx, values, stepX, padding, drawH, maxVal, color, lineWidth, dash) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash || []);

    for (let i = 0; i < values.length; i++) {
      const x = padding.left + i * stepX;
      const y = padding.top + drawH - (values[i] / maxVal) * drawH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  },

  _drawRangeBand(ctx, lowValues, highValues, stepX, padding, drawH, maxVal, color) {
    if (lowValues.length < 2) return;
    ctx.beginPath();
    ctx.fillStyle = color;

    for (let i = 0; i < highValues.length; i++) {
      const x = padding.left + i * stepX;
      const y = padding.top + drawH - (highValues[i] / maxVal) * drawH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    for (let i = lowValues.length - 1; i >= 0; i--) {
      const x = padding.left + i * stepX;
      const y = padding.top + drawH - (lowValues[i] / maxVal) * drawH;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  },
};

if (typeof module !== 'undefined') module.exports = { KI_ChartRenderer };
