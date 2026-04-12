(() => {
  // State
  let active = false;
  let chatParser = null;
  let census = null;
  let channelName = null;
  let sessionStartTime = null;
  let snapshotTimer = null;
  let updateTimer = null;
  let scanTimer = null;
  let pruneTimer = null;
  let participationRate = KI_CONSTANTS.DEFAULT_PARTICIPATION_RATE;
  let settings = null;
  let observer = null;
  let _seenIndices = new Set();

  // --- Bootstrap: always run, but don't start tracking ---

  async function bootstrap() {
    channelName = extractChannelName();
    if (!channelName) return;

    settings = await KI_Storage.getSettings();

    // Always listen for messages from popup (even when inactive)
    chrome.runtime.onMessage.addListener(handleMessage);

    // Listen for WS chat messages (buffered until activated)
    window.addEventListener('message', (event) => {
      if (active && event.data && event.data.type === 'KI_CHAT_MESSAGE') {
        recordChatUser(event.data.username);
      }
    });

    // Census keyboard shortcut (only works when active)
    document.addEventListener('keydown', (e) => {
      if (!active) return;
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (census.isActive()) finishCensus();
        else startCensus();
      }
    });

    // Census quick-trigger from overlay
    window.addEventListener('ki-census-toggle', () => {
      if (!active) return;
      if (census.isActive()) finishCensus();
      else startCensus();
    });

    // Detect SPA navigation (Kick doesn't reload the page between channels)
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        const oldUrl = lastUrl;
        lastUrl = window.location.href;
        onUrlChange(oldUrl, lastUrl);
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // Also listen for popstate (back/forward)
    window.addEventListener('popstate', () => {
      if (window.location.href !== lastUrl) {
        const oldUrl = lastUrl;
        lastUrl = window.location.href;
        onUrlChange(oldUrl, lastUrl);
      }
    });

    console.log(`[KickInsights] Ready for channel: ${channelName} (inactive — click Start to begin)`);
  }

  async function onUrlChange(oldUrl, newUrl) {
    const newChannel = extractChannelName();
    if (newChannel === channelName) return; // Same channel, ignore

    console.log(`[KickInsights] Channel changed: ${channelName} → ${newChannel}`);

    // Auto-deactivate if tracking was active
    if (active) {
      await deactivate();
    }

    channelName = newChannel;
  }

  // --- Activation / Deactivation ---

  async function activate() {
    if (active) return;
    active = true;

    // Re-read channel in case of SPA navigation
    channelName = extractChannelName();
    if (!channelName) { active = false; return; }

    settings = await KI_Storage.getSettings();
    chatParser = new KI_ChatParser();
    census = new KI_Census(KI_CONSTANTS.CENSUS_DURATION_MS);
    _seenIndices = new Set();

    // Load per-channel calibration
    const profile = await KI_Storage.getCalibrationProfile(channelName);
    if (profile.censusHistory.length > 0) {
      participationRate = KI_Calibration.computeWeightedRate(
        profile.censusHistory, settings.participationRate
      );
    } else {
      participationRate = settings.participationRate;
    }

    sessionStartTime = Date.now();

    await KI_Storage.saveActiveSession({
      channelName,
      sessionId: new Date(sessionStartTime).toISOString(),
      startTime: new Date(sessionStartTime).toISOString(),
      endTime: null,
      duration: 0,
      snapshots: [],
      censuses: [],
      summary: { avgKickCount: 0, avgEstimatedCount: 0, peakEstimated: 0, totalUniqueChatters: 0 },
    });

    // Start observers and timers
    observeChat();
    KI_OverlayGraph.init();
    KI_OverlayGraph.show();
    updateTimer = setInterval(updateEstimate, 5000);
    snapshotTimer = setInterval(takeSnapshot, KI_CONSTANTS.SNAPSHOT_INTERVAL_MS);
    pruneTimer = setInterval(() => {
      chatParser.pruneOldEvents(Date.now(), settings.rollingWindowMs * 2);
    }, 60000);

    console.log(`[KickInsights] Activated for channel: ${channelName}`);
  }

  async function deactivate() {
    if (!active) return;
    active = false;

    // Stop timers
    if (updateTimer) { clearInterval(updateTimer); updateTimer = null; }
    if (snapshotTimer) { clearInterval(snapshotTimer); snapshotTimer = null; }
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    if (pruneTimer) { clearInterval(pruneTimer); pruneTimer = null; }

    // Disconnect observer
    if (observer) { observer.disconnect(); observer = null; }

    // Finalize and save session
    const session = await KI_Storage.getActiveSession();
    if (session && sessionStartTime) {
      session.endTime = new Date().toISOString();
      session.duration = Math.round((Date.now() - sessionStartTime) / 1000);
      await KI_Storage.saveSession(session);
      await KI_Storage.clearActiveSession();
    }

    // Clean up UI
    KI_DomInjector.remove();
    KI_OverlayGraph.hide();

    // Reset state
    chatParser = null;
    census = null;
    sessionStartTime = null;
    _seenIndices = new Set();

    console.log(`[KickInsights] Deactivated for channel: ${channelName}`);
  }

  // --- Channel detection ---

  function extractChannelName() {
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    if (match && match[1] && !['following', 'categories', 'search'].includes(match[1])) {
      return match[1];
    }
    return null;
  }

  // --- Chat observation ---

  function observeChat() {
    const chatContainer = document.querySelector(KI_CONSTANTS.SELECTORS.CHAT_CONTAINER);
    if (!chatContainer) {
      if (active) setTimeout(observeChat, 2000);
      return;
    }

    observer = new MutationObserver((mutations) => {
      if (!active) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          processNewChatNode(node);
        }
      }
    });

    observer.observe(chatContainer, { childList: true, subtree: true });

    // Periodic scan fallback for virtualized chat
    scanTimer = setInterval(() => {
      if (active) scanVisibleMessages(chatContainer);
    }, 2000);

    console.log('[KickInsights] Chat observer started');
  }

  function processNewChatNode(node) {
    const msgNodes = [];
    if (node.hasAttribute && node.hasAttribute('data-index')) {
      msgNodes.push(node);
    }
    if (node.querySelectorAll) {
      msgNodes.push(...node.querySelectorAll('[data-index]'));
    }

    for (const msgNode of msgNodes) {
      const idx = msgNode.getAttribute('data-index');
      if (_seenIndices.has(idx)) continue;
      _seenIndices.add(idx);
      const username = KI_ChatParser.extractUsernameFromNode(msgNode);
      if (username) recordChatUser(username);
    }

    if (msgNodes.length === 0) {
      const username = KI_ChatParser.extractUsernameFromNode(node);
      if (username) recordChatUser(username);
    }
  }

  function scanVisibleMessages(chatContainer) {
    const msgNodes = chatContainer.querySelectorAll('[data-index]');
    for (const msgNode of msgNodes) {
      const idx = msgNode.getAttribute('data-index');
      if (_seenIndices.has(idx)) continue;
      _seenIndices.add(idx);
      const username = KI_ChatParser.extractUsernameFromNode(msgNode);
      if (username) recordChatUser(username);
    }

    if (_seenIndices.size > 5000) {
      const arr = [..._seenIndices];
      _seenIndices = new Set(arr.slice(arr.length - 2000));
    }
  }

  function recordChatUser(username) {
    if (!active || !chatParser) return;
    const now = Date.now();
    chatParser.processMessage(username, now);

    if (census && census.isActive()) {
      census.recordUser(username, now);
      if (census.getRemainingMs(now) === 0) {
        finishCensus();
      }
    }
  }

  // --- Estimation ---

  function updateEstimate() {
    if (!active || !chatParser) return;
    const now = Date.now();
    const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;
    const uniqueChatters = chatParser.getUniqueChatterCount(now, windowMs);
    const chatRate = chatParser.getChatRate(now, windowMs);
    const kickCount = KI_ViewerCountReader.read();

    const result = KI_EstimationEngine.estimate(uniqueChatters, participationRate);

    KI_DomInjector.updateViewerCount(result.low, result.high, result.confidence);

    // Update overlay status
    const kickStr = kickCount ? KI_Format.compactNumber(kickCount) : '?';
    const elapsed = Math.round((now - sessionStartTime) / 1000);
    const censusStatus = census && census.isActive()
      ? ` | Census: ${census.getUniqueUserCount()} (${Math.ceil(census.getRemainingMs(now) / 1000)}s)`
      : '';

    if (uniqueChatters < 5) {
      // Not enough data yet
      KI_OverlayGraph.updateStatus(
        `Kick: ${kickStr} | Warming up... ${uniqueChatters} chatters seen (${elapsed}s)${censusStatus}`
      );
    } else {
      const estStr = `${KI_Format.compactNumber(result.low)}–${KI_Format.compactNumber(result.high)}`;
      KI_OverlayGraph.updateStatus(
        `Kick: ${kickStr} | Est: ${estStr} | Chatters: ${uniqueChatters} | ${chatRate}/min${censusStatus}`
      );
    }
  }

  // --- Snapshots ---

  async function takeSnapshot() {
    if (!active || !chatParser) return;
    const now = Date.now();
    const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;

    const kickCount = KI_ViewerCountReader.read();
    const uniqueChatters = chatParser.getUniqueChatterCount(now, windowMs);
    const chatRate = chatParser.getChatRate(now, windowMs);
    const { estimatedViewers } = KI_EstimationEngine.estimate(uniqueChatters, participationRate);

    const snapshot = {
      time: new Date(now).toISOString(),
      kickCount: kickCount || 0,
      estimatedCount: estimatedViewers,
      uniqueChatters,
      chatRate,
    };

    KI_OverlayGraph.addSnapshot(snapshot);

    const session = await KI_Storage.getActiveSession();
    if (session) {
      session.snapshots.push(snapshot);
      session.endTime = new Date(now).toISOString();
      session.duration = Math.round((now - sessionStartTime) / 1000);

      const snaps = session.snapshots;
      session.summary = {
        avgKickCount: Math.round(snaps.reduce((s, sn) => s + sn.kickCount, 0) / snaps.length),
        avgEstimatedCount: Math.round(snaps.reduce((s, sn) => s + sn.estimatedCount, 0) / snaps.length),
        peakEstimated: Math.max(...snaps.map(sn => sn.estimatedCount)),
        totalUniqueChatters: chatParser.getUniqueChatterCount(now, now - sessionStartTime),
      };

      await KI_Storage.saveActiveSession(session);
    }
  }

  // --- Census ---

  async function startCensus() {
    if (!active || !census) return;
    const now = Date.now();
    census.start(now);
    console.log('[KickInsights] Census started');
  }

  // Last census result, pending user confirmation before calibration
  let _pendingCensus = null;

  async function finishCensus() {
    if (!census) return;
    census.stop();
    const result = census.getResult();
    if (!result) return;

    const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;
    const passiveUniqueChatters = chatParser.getUniqueChatterCount(result.startTime, windowMs);
    const kickCount = KI_ViewerCountReader.read() || 0;

    const derivedRate = KI_Calibration.deriveCensusRate(
      result.uniqueUsers, passiveUniqueChatters, kickCount
    );

    _pendingCensus = {
      time: new Date(result.startTime).toISOString(),
      uniqueUsers: result.uniqueUsers,
      kickCountAtTime: kickCount,
      passiveUniqueChatters,
      derivedRate,
    };

    // Save to session (for history) but do NOT auto-calibrate
    const session = await KI_Storage.getActiveSession();
    if (session) {
      session.censuses.push({
        time: _pendingCensus.time,
        uniqueUsers: _pendingCensus.uniqueUsers,
        kickCountAtTime: kickCount,
        derivedRate,
      });
      await KI_Storage.saveActiveSession(session);
    }

    console.log(`[KickInsights] Census complete: ${result.uniqueUsers} unique users, derived rate: ${derivedRate.toFixed(4)} (pending confirmation)`);
  }

  async function applyCensusCalibration() {
    if (!_pendingCensus) return { ok: false, error: 'No pending census' };

    const census = _pendingCensus;
    _pendingCensus = null;

    // Sanity check: reject rates above 20% (means census didn't get enough
    // extra chatters vs passive — streamer probably didn't ask chat to type)
    if (census.derivedRate > 0.20) {
      console.log(`[KickInsights] Census rate ${(census.derivedRate * 100).toFixed(1)}% is too high — rejected. Ask viewers to type in chat during census.`);
      return {
        ok: false,
        error: `Rate ${(census.derivedRate * 100).toFixed(1)}% is too high. Census works best when the streamer asks everyone to type.`,
      };
    }

    // Apply calibration
    const profile = await KI_Storage.getCalibrationProfile(channelName);
    profile.censusHistory.push({
      timestamp: census.time,
      derivedRate: census.derivedRate,
      uniqueUsers: census.uniqueUsers,
      kickCountAtTime: census.kickCountAtTime,
    });
    profile.learnedParticipationRate = KI_Calibration.computeWeightedRate(
      profile.censusHistory, settings.participationRate
    );
    profile.lastUpdated = new Date().toISOString();
    await KI_Storage.saveCalibrationProfile(profile);

    participationRate = profile.learnedParticipationRate;

    console.log(`[KickInsights] Census calibration applied. New rate: ${(participationRate * 100).toFixed(2)}%`);
    return { ok: true, newRate: participationRate };
  }

  // --- Message handling from popup ---

  function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_STATUS': {
        if (!active || !chatParser) {
          sendResponse({
            active: false,
            channelName: channelName || extractChannelName(),
          });
          return true;
        }
        const now = Date.now();
        const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;
        const uniqueChatters = chatParser.getUniqueChatterCount(now, windowMs);
        const result = KI_EstimationEngine.estimate(uniqueChatters, participationRate);
        sendResponse({
          active: true,
          channelName,
          kickCount: KI_ViewerCountReader.read(),
          estimatedCount: result.estimatedViewers,
          estimatedLow: result.low,
          estimatedHigh: result.high,
          confidence: result.confidence,
          uniqueChatters,
          chatRate: chatParser.getChatRate(now, windowMs),
          participationRate,
          censusActive: census ? census.isActive() : false,
          censusRemainingMs: census && census.isActive() ? census.getRemainingMs(now) : 0,
          censusUserCount: census && census.isActive() ? census.getUniqueUserCount() : 0,
          pendingCensus: _pendingCensus,
        });
        return true;
      }
      case 'ACTIVATE':
        activate().then(() => sendResponse({ ok: true, channelName }));
        return true;
      case 'DEACTIVATE':
        deactivate().then(() => sendResponse({ ok: true }));
        return true;
      case 'START_CENSUS':
        startCensus();
        sendResponse({ ok: true });
        return true;
      case 'STOP_CENSUS':
        finishCensus();
        sendResponse({ ok: true });
        return true;
      case 'APPLY_CENSUS':
        applyCensusCalibration().then(result => sendResponse(result));
        return true;
      case 'DISMISS_CENSUS':
        _pendingCensus = null;
        sendResponse({ ok: true });
        return true;
      case 'UPDATE_SETTINGS':
        settings = message.settings;
        if (!settings.useLearnedRate) {
          participationRate = settings.participationRate;
        }
        sendResponse({ ok: true });
        return true;
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (active) deactivate();
  });

  // Run bootstrap
  bootstrap();
})();
