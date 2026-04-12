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
