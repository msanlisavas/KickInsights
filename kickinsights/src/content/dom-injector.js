const KI_DomInjector = {
  _injectedEl: null,

  updateViewerCount(low, high, confidence) {
    const containerEl = KI_ViewerCountReader.getElement();
    if (!containerEl) return;

    if (!this._injectedEl) {
      this._injectedEl = document.createElement('span');
      this._injectedEl.id = 'ki-estimated-count';
      this._injectedEl.className = 'ki-estimate';
      containerEl.parentElement.insertBefore(
        this._injectedEl,
        containerEl.nextSibling
      );
    }

    const lowStr = KI_Format.compactNumber(low);
    const highStr = KI_Format.compactNumber(high);
    const confidenceClass = `ki-confidence-${confidence}`;

    this._injectedEl.className = `ki-estimate ${confidenceClass}`;
    this._injectedEl.textContent = ` (est. ${lowStr}–${highStr})`;
    this._injectedEl.title = `KickInsights range estimate (${confidence} confidence)`;
  },

  remove() {
    if (this._injectedEl) {
      this._injectedEl.remove();
      this._injectedEl = null;
    }
  },
};

if (typeof module !== 'undefined') module.exports = { KI_DomInjector };
