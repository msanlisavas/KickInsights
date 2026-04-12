const KI_Storage = {
  async _get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  async _set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async getSessions() {
    return (await this._get(KI_CONSTANTS.STORAGE_KEYS.SESSIONS)) || [];
  },

  async saveSession(session) {
    const sessions = await this.getSessions();
    const idx = sessions.findIndex(s => s.sessionId === session.sessionId);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    await this._set(KI_CONSTANTS.STORAGE_KEYS.SESSIONS, sessions);
  },

  async pruneOldSessions(now) {
    const cutoff = new Date(now.getTime() - KI_CONSTANTS.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const sessions = await this.getSessions();
    const pruned = sessions.map(session => {
      if (new Date(session.endTime) < cutoff) {
        return { ...session, snapshots: [], censuses: [] };
      }
      return session;
    });
    await this._set(KI_CONSTANTS.STORAGE_KEYS.SESSIONS, pruned);
  },

  async getActiveSession() {
    return await this._get(KI_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION);
  },

  async saveActiveSession(session) {
    await this._set(KI_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION, session);
  },

  async clearActiveSession() {
    await chrome.storage.local.remove(KI_CONSTANTS.STORAGE_KEYS.ACTIVE_SESSION);
  },

  async getCalibrationProfile(channelName) {
    const profiles = (await this._get(KI_CONSTANTS.STORAGE_KEYS.CALIBRATION_PROFILES)) || {};
    return profiles[channelName] || {
      channelName,
      learnedParticipationRate: KI_CONSTANTS.DEFAULT_PARTICIPATION_RATE,
      censusHistory: [],
      lastUpdated: null,
    };
  },

  async saveCalibrationProfile(profile) {
    const profiles = (await this._get(KI_CONSTANTS.STORAGE_KEYS.CALIBRATION_PROFILES)) || {};
    profiles[profile.channelName] = profile;
    await this._set(KI_CONSTANTS.STORAGE_KEYS.CALIBRATION_PROFILES, profiles);
  },

  async getSettings() {
    return (await this._get(KI_CONSTANTS.STORAGE_KEYS.SETTINGS)) || {
      participationRate: KI_CONSTANTS.DEFAULT_PARTICIPATION_RATE,
      rollingWindowMs: KI_CONSTANTS.ROLLING_WINDOW_MS,
      showOverlayGraph: true,
    };
  },

  async saveSettings(settings) {
    await this._set(KI_CONSTANTS.STORAGE_KEYS.SETTINGS, settings);
  },
};

if (typeof module !== 'undefined') module.exports = { KI_Storage };
