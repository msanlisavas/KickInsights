const KI_Calibration = {
  computeWeightedRate(censusHistory, defaultRate) {
    if (censusHistory.length === 0) return defaultRate;
    if (censusHistory.length === 1) return censusHistory[0].derivedRate;

    const sorted = [...censusHistory].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    let totalWeight = 0;
    let weightedSum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const weight = Math.pow(2, i);
      weightedSum += sorted[i].derivedRate * weight;
      totalWeight += weight;
    }

    return weightedSum / totalWeight;
  },

  deriveCensusRate(censusUniqueChatters, passiveUniqueChatters, kickDisplayedCount) {
    if (censusUniqueChatters <= 0) return 0.05;
    const rate = passiveUniqueChatters / censusUniqueChatters;
    return Math.max(0.01, Math.min(0.5, rate));
  },

  getTrend(censusHistory) {
    if (censusHistory.length <= 1) return 'stable';

    const mid = Math.floor(censusHistory.length / 2);
    const firstHalf = censusHistory.slice(0, mid);
    const secondHalf = censusHistory.slice(mid);

    const avgFirst = firstHalf.reduce((s, c) => s + c.derivedRate, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, c) => s + c.derivedRate, 0) / secondHalf.length;

    const changePct = (avgSecond - avgFirst) / avgFirst;

    if (changePct > 0.1) return 'trending up';
    if (changePct < -0.1) return 'trending down';
    return 'stable';
  },
};

if (typeof module !== 'undefined') module.exports = { KI_Calibration };
