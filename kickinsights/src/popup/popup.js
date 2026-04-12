(() => {
  const els = {
    channelName: document.getElementById('ki-channel-name'),
    toggleActive: document.getElementById('ki-toggle-active'),
    activeLabel: document.getElementById('ki-active-label'),
    statusSection: document.getElementById('ki-status-section'),
    kickCount: document.getElementById('ki-kick-count'),
    estCount: document.getElementById('ki-est-count'),
    confidence: document.getElementById('ki-confidence'),
    censusIdle: document.getElementById('ki-census-idle'),
    censusActive: document.getElementById('ki-census-active'),
    censusResult: document.getElementById('ki-census-result'),
    censusStart: document.getElementById('ki-census-start'),
    censusStop: document.getElementById('ki-census-stop'),
    censusTimer: document.getElementById('ki-census-timer'),
    censusLiveCount: document.getElementById('ki-census-live-count'),
    censusResultCount: document.getElementById('ki-census-result-count'),
    censusResultKick: document.getElementById('ki-census-result-kick'),
    censusResultRate: document.getElementById('ki-census-result-rate'),
    censusApply: document.getElementById('ki-census-apply'),
    censusDismiss: document.getElementById('ki-census-dismiss'),
    censusError: document.getElementById('ki-census-error'),
    calRate: document.getElementById('ki-cal-rate'),
    calCount: document.getElementById('ki-cal-count'),
    calTrend: document.getElementById('ki-cal-trend'),
    calHistoryList: document.getElementById('ki-cal-history-list'),
    popupChart: document.getElementById('ki-popup-chart'),
    historyList: document.getElementById('ki-history-list'),
    historyEmpty: document.getElementById('ki-history-empty'),
    exportCsv: document.getElementById('ki-export-csv'),
    exportJson: document.getElementById('ki-export-json'),
    exportCard: document.getElementById('ki-export-card'),
    summaryCanvas: document.getElementById('ki-summary-card-canvas'),
    cardActions: document.getElementById('ki-card-actions'),
    cardDownload: document.getElementById('ki-card-download'),
    cardCopy: document.getElementById('ki-card-copy'),
    rateSlider: document.getElementById('ki-rate-slider'),
    rateValue: document.getElementById('ki-rate-value'),
    windowSelect: document.getElementById('ki-window-select'),
    showOverlay: document.getElementById('ki-show-overlay'),
    clearChannel: document.getElementById('ki-clear-channel'),
    clearAll: document.getElementById('ki-clear-all'),
    overlayToggleRow: document.getElementById('ki-overlay-toggle-row'),
    toggleOverlay: document.getElementById('ki-toggle-overlay'),
  };

  let statusInterval = null;
  let currentStatus = null;

  // Tab switching
  document.querySelectorAll('.ki-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ki-tab').forEach(t => t.classList.remove('ki-tab-active'));
      document.querySelectorAll('.ki-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('ki-tab-active');
      document.getElementById(`ki-panel-${tab.dataset.tab}`).style.display = 'block';

      if (tab.dataset.tab === 'history') loadHistory();
      if (tab.dataset.tab === 'calibration') loadCalibration();
      if (tab.dataset.tab === 'graph') loadGraph();
    });
  });

  // Status polling
  async function getContentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  async function sendToContent(message) {
    const tab = await getContentTab();
    if (!tab) return null;
    return chrome.tabs.sendMessage(tab.id, message);
  }

  // Overlay toggle
  els.toggleOverlay.addEventListener('click', async () => {
    const status = currentStatus;
    if (status && status.overlayVisible) {
      await sendToContent({ type: 'HIDE_OVERLAY' });
    } else {
      await sendToContent({ type: 'SHOW_OVERLAY' });
    }
    setTimeout(pollStatus, 200);
  });

  // Activation toggle
  els.toggleActive.addEventListener('click', async () => {
    const status = currentStatus;
    if (status && status.active) {
      await sendToContent({ type: 'DEACTIVATE' });
    } else {
      await sendToContent({ type: 'ACTIVATE' });
    }
    // Refresh immediately
    setTimeout(pollStatus, 300);
  });

  function updateActivationUI(isActive) {
    if (isActive) {
      els.toggleActive.textContent = 'Stop Tracking';
      els.toggleActive.classList.remove('ki-btn-primary');
      els.toggleActive.classList.add('ki-btn-secondary');
      els.activeLabel.textContent = 'Active';
      els.activeLabel.style.color = '#53fc18';
      els.statusSection.style.display = '';
      document.querySelector('.ki-tabs').style.display = '';
    } else {
      els.toggleActive.textContent = 'Start Tracking';
      els.toggleActive.classList.remove('ki-btn-secondary');
      els.toggleActive.classList.add('ki-btn-primary');
      els.activeLabel.textContent = 'Inactive';
      els.activeLabel.style.color = '#888';
      els.statusSection.style.display = 'none';
      els.overlayToggleRow.style.display = 'none';
      document.querySelector('.ki-tabs').style.display = 'none';
      // Hide all panels
      document.querySelectorAll('.ki-panel').forEach(p => p.style.display = 'none');
    }
  }

  async function pollStatus() {
    try {
      const status = await sendToContent({ type: 'GET_STATUS' });
      if (!status) return;
      currentStatus = status;

      els.channelName.textContent = status.channelName || '--';
      updateActivationUI(status.active);

      if (!status.active) return;

      // Keep the slider in sync with the actual rate being used
      if (status.participationRate && !els.rateSlider.matches(':active')) {
        const pct = status.participationRate * 100;
        els.rateSlider.value = pct;
        els.rateValue.textContent = pct.toFixed(1) + '%';
      }

      // Show overlay toggle
      els.overlayToggleRow.style.display = '';
      els.toggleOverlay.textContent = status.overlayVisible ? 'Hide Overlay' : 'Show Overlay';

      els.kickCount.textContent = status.kickCount ? KI_Format.compactNumber(status.kickCount) : '--';
      els.estCount.textContent = (status.estimatedLow && status.estimatedHigh)
        ? `${KI_Format.compactNumber(status.estimatedLow)}–${KI_Format.compactNumber(status.estimatedHigh)}`
        : '--';
      els.confidence.textContent = status.confidence || '--';

      // Only update census sub-panels if census tab is currently visible
      if (els.censusIdle.parentElement.style.display !== 'none') {
        if (status.censusActive) {
          els.censusIdle.style.display = 'none';
          els.censusActive.style.display = 'block';
          els.censusResult.style.display = 'none';
          els.censusTimer.textContent = Math.ceil(status.censusRemainingMs / 1000);
          els.censusLiveCount.textContent = status.censusUserCount;
        } else if (status.pendingCensus) {
          els.censusIdle.style.display = 'none';
          els.censusActive.style.display = 'none';
          els.censusResult.style.display = 'block';
          els.censusResultCount.textContent = status.pendingCensus.uniqueUsers;
          els.censusResultKick.textContent = KI_Format.compactNumber(status.pendingCensus.kickCountAtTime);
          els.censusResultRate.textContent = (status.pendingCensus.derivedRate * 100).toFixed(1) + '%';
        } else {
          els.censusActive.style.display = 'none';
          els.censusResult.style.display = 'none';
          els.censusIdle.style.display = 'block';
        }
      }
    } catch (e) {
      els.channelName.textContent = 'Not on a Kick stream';
      updateActivationUI(false);
    }
  }

  // Census
  els.censusStart.addEventListener('click', async () => {
    await sendToContent({ type: 'START_CENSUS' });
  });

  els.censusStop.addEventListener('click', async () => {
    await sendToContent({ type: 'STOP_CENSUS' });
  });

  els.censusApply.addEventListener('click', async () => {
    const result = await sendToContent({ type: 'APPLY_CENSUS' });
    if (result && result.ok) {
      els.censusError.style.display = 'none';
      els.censusResult.style.display = 'none';
      els.censusIdle.style.display = 'block';
      // Update the slider to reflect the new learned rate
      if (result.newRate) {
        const pct = result.newRate * 100;
        els.rateSlider.value = pct;
        els.rateValue.textContent = pct.toFixed(1) + '%';
      }
    } else {
      els.censusError.textContent = result?.error || 'Failed to apply';
      els.censusError.style.display = 'block';
    }
  });

  els.censusDismiss.addEventListener('click', async () => {
    await sendToContent({ type: 'DISMISS_CENSUS' });
    els.censusResult.style.display = 'none';
    els.censusIdle.style.display = 'block';
    els.censusError.style.display = 'none';
  });

  async function loadLastCensusResult() {
    const tab = await getContentTab();
    if (!tab) return;
    const url = new URL(tab.url || '');
    const channelName = url.pathname.split('/')[1];
    if (!channelName) return;

    const result = await chrome.storage.local.get('ki_calibration_profiles');
    const profiles = result.ki_calibration_profiles || {};
    const profile = profiles[channelName];
    if (!profile || profile.censusHistory.length === 0) return;

    const last = profile.censusHistory[profile.censusHistory.length - 1];
    els.censusResult.style.display = 'block';
    els.censusResultCount.textContent = last.uniqueUsers;
    els.censusResultKick.textContent = KI_Format.compactNumber(last.kickCountAtTime);
    els.censusResultRate.textContent = (last.derivedRate * 100).toFixed(1) + '%';
  }

  // Calibration
  async function loadCalibration() {
    const tab = await getContentTab();
    if (!tab) return;
    const url = new URL(tab.url || '');
    const channelName = url.pathname.split('/')[1];
    if (!channelName) return;

    const result = await chrome.storage.local.get('ki_calibration_profiles');
    const profiles = result.ki_calibration_profiles || {};
    const profile = profiles[channelName];

    if (!profile) {
      els.calRate.textContent = '5.0% (default)';
      els.calCount.textContent = '0';
      els.calTrend.textContent = '--';
      els.calHistoryList.innerHTML = '<p class="ki-muted">No census data yet.</p>';
      return;
    }

    els.calRate.textContent = (profile.learnedParticipationRate * 100).toFixed(1) + '%';
    els.calCount.textContent = profile.censusHistory.length;

    const trend = computeTrend(profile.censusHistory);
    els.calTrend.textContent = trend;

    els.calHistoryList.innerHTML = profile.censusHistory
      .slice()
      .reverse()
      .map(c => `
        <div class="ki-list-item">
          <span>${KI_Format.formatDate(c.timestamp)}</span>
          <span>${c.uniqueUsers} users</span>
          <span>${(c.derivedRate * 100).toFixed(1)}%</span>
        </div>
      `)
      .join('');
  }

  function computeTrend(history) {
    if (history.length <= 1) return 'stable';
    const mid = Math.floor(history.length / 2);
    const first = history.slice(0, mid);
    const second = history.slice(mid);
    const avgFirst = first.reduce((s, c) => s + c.derivedRate, 0) / first.length;
    const avgSecond = second.reduce((s, c) => s + c.derivedRate, 0) / second.length;
    const change = (avgSecond - avgFirst) / avgFirst;
    if (change > 0.1) return 'trending up';
    if (change < -0.1) return 'trending down';
    return 'stable';
  }

  // Graph
  async function loadGraph() {
    const result = await chrome.storage.local.get('ki_active_session');
    const session = result.ki_active_session;
    if (!session || !session.snapshots || session.snapshots.length < 2) return;
    KI_ChartRenderer.draw(els.popupChart, session.snapshots);
  }

  // History
  async function loadHistory() {
    const result = await chrome.storage.local.get('ki_sessions');
    const sessions = (result.ki_sessions || []).slice().reverse();

    if (sessions.length === 0) {
      els.historyEmpty.style.display = 'block';
      els.historyList.innerHTML = '';
      return;
    }

    els.historyEmpty.style.display = 'none';
    els.historyList.innerHTML = sessions.map(s => `
      <div class="ki-list-item">
        <span>${s.channelName}</span>
        <span>${KI_Format.formatDate(s.startTime)}</span>
        <span>${KI_Format.formatDuration(s.duration)}</span>
        <span>Kick: ${KI_Format.compactNumber(s.summary.avgKickCount)} | Est: ${KI_Format.compactNumber(s.summary.avgEstimatedCount)}</span>
      </div>
    `).join('');
  }

  // Export — handled in popup (not service worker) because Blob/URL.createObjectURL aren't available in MV3 workers
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  els.exportCsv.addEventListener('click', async () => {
    const result = await chrome.storage.local.get('ki_sessions');
    const sessions = result.ki_sessions || [];
    const rows = ['time,kickCount,estimatedCount,uniqueChatters,chatRate,channelName'];
    for (const session of sessions) {
      for (const snap of (session.snapshots || [])) {
        rows.push([snap.time, snap.kickCount, snap.estimatedCount, snap.uniqueChatters, snap.chatRate, session.channelName].join(','));
      }
    }
    const channelName = sessions[0]?.channelName || 'unknown';
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([rows.join('\n')], { type: 'text/csv' }), `kickinsights_${channelName}_${date}.csv`);
  });

  els.exportJson.addEventListener('click', async () => {
    const result = await chrome.storage.local.get('ki_sessions');
    const sessions = result.ki_sessions || [];
    const channelName = sessions[0]?.channelName || 'unknown';
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' }), `kickinsights_${channelName}_${date}.json`);
  });

  els.exportCard.addEventListener('click', async () => {
    const result = await chrome.storage.local.get('ki_active_session');
    const session = result.ki_active_session;
    if (!session) return;

    KI_SummaryCard.render(els.summaryCanvas, session);
    els.summaryCanvas.style.display = 'block';
    els.cardActions.style.display = 'flex';
    els.cardActions.style.gap = '8px';
    els.cardActions.style.marginTop = '8px';
  });

  els.cardDownload.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'kickinsights_summary.png';
    link.href = els.summaryCanvas.toDataURL('image/png');
    link.click();
  });

  els.cardCopy.addEventListener('click', async () => {
    els.summaryCanvas.toBlob(async (blob) => {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      els.cardCopy.textContent = 'Copied!';
      setTimeout(() => { els.cardCopy.textContent = 'Copy to Clipboard'; }, 2000);
    });
  });

  // Settings
  async function loadSettings() {
    const result = await chrome.storage.local.get('ki_settings');
    const settings = result.ki_settings || {
      participationRate: 0.05,
      rollingWindowMs: 300000,
      showOverlayGraph: true,
    };

    els.rateSlider.value = settings.participationRate * 100;
    els.rateValue.textContent = (settings.participationRate * 100).toFixed(1) + '%';
    els.windowSelect.value = String(settings.rollingWindowMs);
    els.showOverlay.checked = settings.showOverlayGraph;
  }

  els.rateSlider.addEventListener('input', () => {
    els.rateValue.textContent = parseFloat(els.rateSlider.value).toFixed(1) + '%';
  });

  els.rateSlider.addEventListener('change', saveSettings);
  els.windowSelect.addEventListener('change', saveSettings);
  els.showOverlay.addEventListener('change', saveSettings);

  async function saveSettings() {
    const settings = {
      participationRate: parseFloat(els.rateSlider.value) / 100,
      rollingWindowMs: parseInt(els.windowSelect.value, 10),
      showOverlayGraph: els.showOverlay.checked,
    };
    await chrome.storage.local.set({ ki_settings: settings });
    sendToContent({ type: 'UPDATE_SETTINGS', settings });
  }

  // Clear data
  els.clearChannel.addEventListener('click', async () => {
    const status = currentStatus;
    const channel = status?.channelName;
    if (!channel) return;
    if (!confirm(`Clear all data for "${channel}"? This removes sessions, calibration, and census history for this channel.`)) return;

    // Deactivate first if active
    if (status.active) await sendToContent({ type: 'DEACTIVATE' });

    // Remove sessions for this channel
    const sessResult = await chrome.storage.local.get('ki_sessions');
    const sessions = (sessResult.ki_sessions || []).filter(s => s.channelName !== channel);
    await chrome.storage.local.set({ ki_sessions: sessions });

    // Remove calibration profile
    const calResult = await chrome.storage.local.get('ki_calibration_profiles');
    const profiles = calResult.ki_calibration_profiles || {};
    delete profiles[channel];
    await chrome.storage.local.set({ ki_calibration_profiles: profiles });

    // Clear active session if it's this channel
    await chrome.storage.local.remove('ki_active_session');

    pollStatus();
  });

  els.clearAll.addEventListener('click', async () => {
    if (!confirm('Clear ALL KickInsights data? This removes all sessions, calibration profiles, and settings.')) return;

    if (currentStatus?.active) await sendToContent({ type: 'DEACTIVATE' });

    await chrome.storage.local.remove([
      'ki_sessions', 'ki_calibration_profiles', 'ki_settings',
      'ki_active_session', 'ki_overlay_state',
    ]);

    pollStatus();
    loadSettings();
  });

  // Init
  loadSettings();
  pollStatus();
  statusInterval = setInterval(pollStatus, 2000);
})();
