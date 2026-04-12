const KI_SummaryCard = {
  buildData(session) {
    // Calculate average low/high from snapshots
    const snaps = session.snapshots || [];
    let avgLow = 0, avgHigh = 0;
    if (snaps.length > 0) {
      avgLow = Math.round(snaps.reduce((s, sn) => s + (sn.estimatedLow || sn.estimatedCount), 0) / snaps.length);
      avgHigh = Math.round(snaps.reduce((s, sn) => s + (sn.estimatedHigh || sn.estimatedCount), 0) / snaps.length);
    }

    return {
      channelName: session.channelName,
      date: KI_Format.formatDate(session.startTime),
      duration: KI_Format.formatDuration(session.duration),
      avgKick: KI_Format.compactNumber(session.summary.avgKickCount),
      avgEstimated: KI_Format.compactNumber(session.summary.avgEstimatedCount),
      avgLow: KI_Format.compactNumber(avgLow),
      avgHigh: KI_Format.compactNumber(avgHigh),
      peakEstimated: KI_Format.compactNumber(session.summary.peakEstimated),
      totalUniqueChatters: KI_Format.compactNumber(session.summary.totalUniqueChatters),
      censusCount: session.censuses ? session.censuses.length : 0,
      snapshots: snaps,
    };
  },

  render(canvas, session) {
    const data = this.buildData(session);
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#0e0e10';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = '#2a2a2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Header: channel name
    ctx.fillStyle = '#53fc18';
    ctx.font = 'bold 20px system-ui';
    ctx.fillText(data.channelName, 24, 40);

    // Subheader: date + duration
    ctx.fillStyle = '#888';
    ctx.font = '13px system-ui';
    ctx.fillText(`${data.date}  |  ${data.duration}`, 24, 62);

    // Divider
    ctx.strokeStyle = '#2a2a2e';
    ctx.beginPath();
    ctx.moveTo(24, 76);
    ctx.lineTo(w - 24, 76);
    ctx.stroke();

    const midX = w / 2;

    // Kick displayed count
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('KICK DISPLAYED', midX - 120, 100);
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 32px system-ui';
    ctx.fillText(data.avgKick, midX - 120, 136);

    // VS
    ctx.fillStyle = '#444';
    ctx.font = '14px system-ui';
    ctx.fillText('vs', midX, 120);

    // Estimated range
    ctx.fillStyle = '#888';
    ctx.font = '11px system-ui';
    ctx.fillText('ESTIMATED RANGE', midX + 120, 100);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 26px system-ui';
    ctx.fillText(`${data.avgLow}–${data.avgHigh}`, midX + 120, 136);

    // Sparkline with range bands
    if (data.snapshots.length >= 2) {
      const sparkY = 160;
      const sparkH = 80;
      const sparkW = w - 48;
      const sparkX = 24;

      const estCounts = data.snapshots.map(s => s.estimatedCount);
      const estLow = data.snapshots.map(s => s.estimatedLow || s.estimatedCount);
      const estHigh = data.snapshots.map(s => s.estimatedHigh || s.estimatedCount);
      const kickCounts = data.snapshots.map(s => s.kickCount);
      const maxVal = Math.max(...estHigh, ...kickCounts) * 1.1 || 1;
      const stepX = sparkW / (data.snapshots.length - 1);

      // Range band fill
      ctx.beginPath();
      ctx.fillStyle = '#10b98118';
      for (let i = 0; i < estHigh.length; i++) {
        const x = sparkX + i * stepX;
        const y = sparkY + sparkH - (estHigh[i] / maxVal) * sparkH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (let i = estLow.length - 1; i >= 0; i--) {
        const x = sparkX + i * stepX;
        const y = sparkY + sparkH - (estLow[i] / maxVal) * sparkH;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Dashed range lines
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#10b98144';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < estLow.length; i++) {
        const x = sparkX + i * stepX;
        const y = sparkY + sparkH - (estLow[i] / maxVal) * sparkH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < estHigh.length; i++) {
        const x = sparkX + i * stepX;
        const y = sparkY + sparkH - (estHigh[i] / maxVal) * sparkH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Kick line (orange)
      ctx.beginPath();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < kickCounts.length; i++) {
        const x = sparkX + i * stepX;
        const y = sparkY + sparkH - (kickCounts[i] / maxVal) * sparkH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Estimated line (green, solid)
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      for (let i = 0; i < estCounts.length; i++) {
        const x = sparkX + i * stepX;
        const y = sparkY + sparkH - (estCounts[i] / maxVal) * sparkH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sparkline legend
      ctx.font = '9px system-ui';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f97316';
      ctx.fillText('Kick', sparkX, sparkY - 4);
      ctx.fillStyle = '#10b981';
      ctx.fillText('Est.', sparkX + 30, sparkY - 4);
      ctx.fillStyle = '#10b98177';
      ctx.fillText('Range', sparkX + 55, sparkY - 4);
    }

    // Stats line
    ctx.textAlign = 'left';
    ctx.fillStyle = '#666';
    ctx.font = '11px system-ui';
    ctx.fillText(`Peak: ${data.peakEstimated}  |  Unique chatters: ${data.totalUniqueChatters}  |  Censuses: ${data.censusCount}`, 24, 270);

    // Divider
    ctx.strokeStyle = '#2a2a2e';
    ctx.beginPath();
    ctx.moveTo(24, 290);
    ctx.lineTo(w - 24, 290);
    ctx.stroke();

    // Watermark
    ctx.fillStyle = '#333';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by KickInsights', midX, 320);

    ctx.textAlign = 'left';
  },
};

if (typeof module !== 'undefined') module.exports = { KI_SummaryCard };
