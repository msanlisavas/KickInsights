if (typeof KI_Format !== 'undefined') { /* already loaded */ } else
var KI_Format = {
  compactNumber(num) {
    if (num === 0) return '0';
    if (num < 1000) return String(num);
    if (num < 1_000_000) {
      const val = num / 1000;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')) + 'K';
    }
    const val = num / 1_000_000;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(/\.0$/, '')) + 'M';
  },

  formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  },
};

if (typeof module !== 'undefined') module.exports = { KI_Format };
