if (typeof KI_EstimationEngine !== 'undefined') { /* already loaded */ } else
var KI_EstimationEngine = {
  estimate(uniqueChatters, participationRate) {
    if (uniqueChatters === 0 || participationRate <= 0) {
      return { estimatedViewers: 0, low: 0, high: 0, confidence: 'low' };
    }

    const MAX_VIEWERS = 10_000_000; // sanity cap
    const estimatedViewers = Math.min(MAX_VIEWERS, Math.round(uniqueChatters / participationRate));

    // Range: optimistic (lower rate = more viewers) and pessimistic (higher rate = fewer viewers)
    const optimisticRate = participationRate * KI_CONSTANTS.OPTIMISTIC_RATE_MULTIPLIER;
    const pessimisticRate = participationRate * KI_CONSTANTS.PESSIMISTIC_RATE_MULTIPLIER;
    const high = Math.min(MAX_VIEWERS, Math.round(uniqueChatters / optimisticRate));
    const low = Math.min(MAX_VIEWERS, Math.round(uniqueChatters / pessimisticRate));

    let confidence;
    if (uniqueChatters < 20) {
      confidence = 'low';
    } else if (uniqueChatters <= 100) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }

    return { estimatedViewers, low, high, confidence };
  },
};

if (typeof module !== 'undefined') module.exports = { KI_EstimationEngine };
