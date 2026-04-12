const KI_DomInjector = {
  _injectedEl: null,

  updateViewerCount(estimatedCount, confidence) {
    const containerEl = KI_ViewerCountReader.getElement();
    if (!containerEl) return;

    if (!this._injectedEl) {
      this._injectedEl = document.createElement('span');
      this._injectedEl.id = 'ki-estimated-count';
      this._injectedEl.className = 'ki-estimate';
      // Insert after the viewer count container (which includes count + label)
      containerEl.parentElement.insertBefore(
        this._injectedEl,
        containerEl.nextSibling
      );
    }

    const formatted = KI_Format.compactNumber(estimatedCount);
    const confidenceClass = `ki-confidence-${confidence}`;

    this._injectedEl.className = `ki-estimate ${confidenceClass}`;
    this._injectedEl.textContent = ` (est. ~${formatted})`;
    this._injectedEl.title = `KickInsights estimate (${confidence} confidence)`;
  },

  remove() {
    if (this._injectedEl) {
      this._injectedEl.remove();
      this._injectedEl = null;
    }
  },
};

if (typeof module !== 'undefined') module.exports = { KI_DomInjector };
