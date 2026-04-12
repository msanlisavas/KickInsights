const KI_EstimationEngine = {
  estimate(uniqueChatters, participationRate) {
    if (uniqueChatters === 0 || participationRate <= 0) {
      return { estimatedViewers: 0, confidence: 'low' };
    }

    const estimatedViewers = Math.round(uniqueChatters / participationRate);

    let confidence;
    if (uniqueChatters < 20) {
      confidence = 'low';
    } else if (uniqueChatters <= 100) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }

    return { estimatedViewers, confidence };
  },
};

if (typeof module !== 'undefined') module.exports = { KI_EstimationEngine };
