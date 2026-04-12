const KI_CONSTANTS = {
  DEFAULT_PARTICIPATION_RATE: 0.03,
  // Range estimation: optimistic assumes fewer chat, pessimistic assumes more
  OPTIMISTIC_RATE_MULTIPLIER: 0.5,   // rate * 0.5 → higher viewer estimate
  PESSIMISTIC_RATE_MULTIPLIER: 2.0,  // rate * 2.0 → lower viewer estimate
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
