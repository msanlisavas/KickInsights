(() => {
  let chatParser = null;
  let census = null;
  let channelName = null;
  let sessionStartTime = null;
  let snapshotTimer = null;
  let updateTimer = null;
  let participationRate = KI_CONSTANTS.DEFAULT_PARTICIPATION_RATE;
  let settings = null;
  let observer = null;

  async function init() {
    channelName = extractChannelName();
    if (!channelName) return;

    settings = await KI_Storage.getSettings();
    chatParser = new KI_ChatParser();
    census = new KI_Census(KI_CONSTANTS.CENSUS_DURATION_MS);

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

    observeChat();
    KI_OverlayGraph.init();
    updateTimer = setInterval(updateEstimate, 5000);
    snapshotTimer = setInterval(takeSnapshot, KI_CONSTANTS.SNAPSHOT_INTERVAL_MS);
    chrome.runtime.onMessage.addListener(handleMessage);

    setInterval(() => {
      chatParser.pruneOldEvents(Date.now(), settings.rollingWindowMs * 2);
    }, 60000);

    console.log(`[KickInsights] Initialized for channel: ${channelName}`);
  }

  function extractChannelName() {
    const match = window.location.pathname.match(/^\/([^\/]+)/);
    if (match && match[1] && !['following', 'categories', 'search'].includes(match[1])) {
      return match[1];
    }
    return null;
  }

  // Track which data-index values we've already processed
  let _seenIndices = new Set();

  function observeChat() {
    const chatContainer = document.querySelector(KI_CONSTANTS.SELECTORS.CHAT_CONTAINER);
    if (!chatContainer) {
      setTimeout(observeChat, 2000);
      return;
    }

    // MutationObserver for real-time catching of newly added nodes
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          processNewChatNode(node);
        }
      }
    });

    observer.observe(chatContainer, { childList: true, subtree: true });

    // Periodic scan to catch messages missed by MutationObserver.
    // Kick's virtualized chat recycles DOM nodes, so many messages
    // are content updates rather than new node additions.
    setInterval(() => scanVisibleMessages(chatContainer), 2000);

    console.log('[KickInsights] Chat observer started');
  }

  function processNewChatNode(node) {
    // Check if this node (or its children) contain data-index messages
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
      if (username) {
        recordChatUser(username);
      }
    }

    // Fallback: try extracting directly from the node if no data-index found
    if (msgNodes.length === 0) {
      const username = KI_ChatParser.extractUsernameFromNode(node);
      if (username) {
        recordChatUser(username);
      }
    }
  }

  function scanVisibleMessages(chatContainer) {
    const msgNodes = chatContainer.querySelectorAll('[data-index]');
    for (const msgNode of msgNodes) {
      const idx = msgNode.getAttribute('data-index');
      if (_seenIndices.has(idx)) continue;
      _seenIndices.add(idx);

      const username = KI_ChatParser.extractUsernameFromNode(msgNode);
      if (username) {
        recordChatUser(username);
      }
    }

    // Keep the seen set from growing unbounded
    if (_seenIndices.size > 5000) {
      const arr = [..._seenIndices];
      _seenIndices = new Set(arr.slice(arr.length - 2000));
    }
  }

  function recordChatUser(username) {
    const now = Date.now();
    chatParser.processMessage(username, now);

    if (census.isActive()) {
      census.recordUser(username, now);
      if (census.getRemainingMs(now) === 0) {
        finishCensus();
      }
    }
  }

  function updateEstimate() {
    const now = Date.now();
    const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;
    const uniqueChatters = chatParser.getUniqueChatterCount(now, windowMs);

    const { estimatedViewers, confidence } = KI_EstimationEngine.estimate(
      uniqueChatters, participationRate
    );

    KI_DomInjector.updateViewerCount(estimatedViewers, confidence);
  }

  async function takeSnapshot() {
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

  async function startCensus() {
    const now = Date.now();
    census.start(now);
    console.log('[KickInsights] Census started');
  }

  async function finishCensus() {
    census.stop();
    const result = census.getResult();
    if (!result) return;

    const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;
    const passiveUniqueChatters = chatParser.getUniqueChatterCount(
      result.startTime, windowMs
    );
    const kickCount = KI_ViewerCountReader.read() || 0;

    const derivedRate = KI_Calibration.deriveCensusRate(
      result.uniqueUsers, passiveUniqueChatters, kickCount
    );

    const censusRecord = {
      time: new Date(result.startTime).toISOString(),
      uniqueUsers: result.uniqueUsers,
      kickCountAtTime: kickCount,
      derivedRate,
    };

    const profile = await KI_Storage.getCalibrationProfile(channelName);
    profile.censusHistory.push({
      timestamp: censusRecord.time,
      derivedRate,
      uniqueUsers: result.uniqueUsers,
      kickCountAtTime: kickCount,
    });
    profile.learnedParticipationRate = KI_Calibration.computeWeightedRate(
      profile.censusHistory, settings.participationRate
    );
    profile.lastUpdated = new Date().toISOString();
    await KI_Storage.saveCalibrationProfile(profile);

    participationRate = profile.learnedParticipationRate;

    const session = await KI_Storage.getActiveSession();
    if (session) {
      session.censuses.push(censusRecord);
      await KI_Storage.saveActiveSession(session);
    }

    console.log(`[KickInsights] Census complete: ${result.uniqueUsers} unique users, derived rate: ${derivedRate.toFixed(4)}`);
  }

  function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_STATUS': {
        const now = Date.now();
        const windowMs = settings ? settings.rollingWindowMs : KI_CONSTANTS.ROLLING_WINDOW_MS;
        const uniqueChatters = chatParser.getUniqueChatterCount(now, windowMs);
        const { estimatedViewers, confidence } = KI_EstimationEngine.estimate(uniqueChatters, participationRate);
        sendResponse({
          channelName,
          kickCount: KI_ViewerCountReader.read(),
          estimatedCount: estimatedViewers,
          confidence,
          uniqueChatters,
          chatRate: chatParser.getChatRate(now, windowMs),
          participationRate,
          censusActive: census.isActive(),
          censusRemainingMs: census.isActive() ? census.getRemainingMs(now) : 0,
          censusUserCount: census.isActive() ? census.getUniqueUserCount() : 0,
        });
        return true;
      }
      case 'START_CENSUS':
        startCensus();
        sendResponse({ ok: true });
        return true;
      case 'STOP_CENSUS':
        finishCensus();
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

  window.addEventListener('beforeunload', async () => {
    if (observer) observer.disconnect();
    if (snapshotTimer) clearInterval(snapshotTimer);
    if (updateTimer) clearInterval(updateTimer);

    const session = await KI_Storage.getActiveSession();
    if (session) {
      session.endTime = new Date().toISOString();
      session.duration = Math.round((Date.now() - sessionStartTime) / 1000);
      await KI_Storage.saveSession(session);
      await KI_Storage.clearActiveSession();
    }

    KI_DomInjector.remove();
    KI_OverlayGraph.destroy();
  });

  init();
})();
