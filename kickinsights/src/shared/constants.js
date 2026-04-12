const KI_CONSTANTS = {
  DEFAULT_PARTICIPATION_RATE: 0.05,
  ROLLING_WINDOW_MS: 5 * 60 * 1000,
  SNAPSHOT_INTERVAL_MS: 2 * 60 * 1000,
  CENSUS_DURATION_MS: 60 * 1000,
  RETENTION_DAYS: 30,
  CONFIDENCE_LOW_THRESHOLD: 20,
  CONFIDENCE_HIGH_THRESHOLD: 100,
  STORAGE_KEYS: {
    ACTIVE_SESSION: 'ki_active_session',
    SESSIONS: 'ki_sessions',
    CALIBRATION_PROFILES: 'ki_calibration_profiles',
    SETTINGS: 'ki_settings',
  },
  SELECTORS: {
    CHAT_CONTAINER: '#chatroom-messages',
    VIEWER_COUNT: '[class*="viewer"], [class*="watching"], [data-viewer-count]',
  },
};

if (typeof module !== 'undefined') module.exports = { KI_CONSTANTS };
