chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('ki-daily-prune', { periodInMinutes: 1440 });
  pruneOldSessions();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ki-daily-prune') {
    pruneOldSessions();
  }
});

async function pruneOldSessions() {
  const result = await chrome.storage.local.get('ki_sessions');
  const sessions = result.ki_sessions || [];
  const cutoffMs = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const cutoff = new Date(cutoffMs);

  const pruned = sessions.map(session => {
    if (new Date(session.endTime) < cutoff) {
      return { ...session, snapshots: [], censuses: [] };
    }
    return session;
  });

  await chrome.storage.local.set({ ki_sessions: pruned });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXPORT_CSV') {
    exportCSV(message.sessions).then(sendResponse);
    return true;
  }
  if (message.type === 'EXPORT_JSON') {
    exportJSON(message.sessions).then(sendResponse);
    return true;
  }
});

async function exportCSV(sessions) {
  const rows = ['time,kickCount,estimatedCount,uniqueChatters,chatRate,channelName'];

  for (const session of sessions) {
    for (const snap of session.snapshots) {
      rows.push([
        snap.time,
        snap.kickCount,
        snap.estimatedCount,
        snap.uniqueChatters,
        snap.chatRate,
        session.channelName,
      ].join(','));
    }
  }

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const channelName = sessions[0]?.channelName || 'unknown';
  const date = new Date().toISOString().slice(0, 10);

  await chrome.downloads.download({
    url,
    filename: `kickinsights_${channelName}_${date}.csv`,
    saveAs: true,
  });

  return { ok: true };
}

async function exportJSON(sessions) {
  const json = JSON.stringify(sessions, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const channelName = sessions[0]?.channelName || 'unknown';
  const date = new Date().toISOString().slice(0, 10);

  await chrome.downloads.download({
    url,
    filename: `kickinsights_${channelName}_${date}.json`,
    saveAs: true,
  });

  return { ok: true };
}
