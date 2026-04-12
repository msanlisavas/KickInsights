const KI_ViewerCountReader = {
  _cachedSelector: null,

  read() {
    const el = this._findViewerCountElement();
    if (!el) return null;
    const text = el.textContent.trim();
    return this._parseCount(text);
  },

  getElement() {
    return this._findViewerCountElement();
  },

  _findViewerCountElement() {
    if (this._cachedSelector) {
      const cached = document.querySelector(this._cachedSelector);
      if (cached) return cached;
      this._cachedSelector = null;
    }

    const classPatterns = [
      '[class*="viewer-count"]',
      '[class*="viewerCount"]',
      '[class*="watching"]',
      '[class*="viewer"]',
    ];

    for (const selector of classPatterns) {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        if (this._looksLikeViewerCount(el)) {
          this._cachedSelector = this._buildUniqueSelector(el);
          return el;
        }
      }
    }

    const allElements = document.querySelectorAll('span, div, p');
    for (const el of allElements) {
      const prev = el.previousElementSibling;
      const parent = el.parentElement;
      const hasSvgNearby = (prev && prev.querySelector && prev.querySelector('svg')) ||
                           (parent && parent.querySelector && parent.querySelector('svg'));
      if (hasSvgNearby && this._looksLikeViewerCount(el)) {
        this._cachedSelector = this._buildUniqueSelector(el);
        return el;
      }
    }

    return null;
  },

  _looksLikeViewerCount(el) {
    const text = el.textContent.trim();
    return /^[\d,.]+[KkMm]?$/.test(text);
  },

  _parseCount(text) {
    const cleaned = text.replace(/,/g, '').trim().toUpperCase();
    if (cleaned.endsWith('K')) {
      return Math.round(parseFloat(cleaned) * 1000);
    }
    if (cleaned.endsWith('M')) {
      return Math.round(parseFloat(cleaned) * 1000000);
    }
    return parseInt(cleaned, 10) || null;
  },

  _buildUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\s+/).filter(c => c.length > 0);
      if (classes.length > 0) {
        return el.tagName.toLowerCase() + '.' + classes.join('.');
      }
    }
    return null;
  },
};

if (typeof module !== 'undefined') module.exports = { KI_ViewerCountReader };
