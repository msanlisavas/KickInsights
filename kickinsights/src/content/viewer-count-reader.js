if (typeof KI_ViewerCountReader !== 'undefined') { /* already loaded */ } else
var KI_ViewerCountReader = {
  _containerEl: null,

  /**
   * Read Kick's displayed viewer count.
   * Kick uses a CSS odometer (translateY-based digit roller), not plain text.
   */
  read() {
    const container = this._findContainer();
    if (!container) return null;

    // Try the odometer approach first (Kick's current implementation)
    const odometerValue = this._readOdometer(container);
    if (odometerValue !== null) return odometerValue;

    // Fallback: try plain text parsing
    const text = container.textContent.trim();
    return this._parseCount(text);
  },

  /**
   * Get the parent element that contains the viewer count display,
   * so we can inject our estimate next to it.
   */
  getElement() {
    const container = this._findContainer();
    if (!container) return null;
    // Return the parent that holds both the count and the "İzleyici"/"Viewers" label
    return container.parentElement;
  },

  _findContainer() {
    if (this._containerEl && document.contains(this._containerEl)) {
      return this._containerEl;
    }

    // Strategy 1: Find the tabular-nums span (Kick's odometer container)
    const numSpan = document.querySelector('span.tabular-nums');
    if (numSpan) {
      this._containerEl = numSpan;
      return numSpan;
    }

    // Strategy 2: Find element next to "İzleyici" / "Viewers" label
    const labels = document.querySelectorAll('span');
    for (const label of labels) {
      const text = label.textContent.trim();
      if (text === 'İzleyici' || text === 'Viewers' || text === 'viewers' || text === 'Watching') {
        const sibling = label.previousElementSibling;
        if (sibling) {
          this._containerEl = sibling;
          return sibling;
        }
      }
    }

    return null;
  },

  /**
   * Decode the CSS odometer digits.
   * Each digit column is a div with child divs (0-9 repeated).
   * The translateY on each child determines which digit is visible.
   */
  _readOdometer(container) {
    const flexContainer = container.querySelector('div.flex.overflow-hidden') || container.querySelector('div');
    if (!flexContainer) return null;

    const columns = flexContainer.children;
    if (!columns || columns.length === 0) return null;

    let numberStr = '';
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const children = col.children;

      if (!children || children.length === 0) {
        // Separator (e.g., ".")
        numberStr += col.textContent;
        continue;
      }

      // Digit column — decode from translateY
      const firstChild = children[0];
      const style = firstChild.style.transform;
      const match = style.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
      if (!match) continue;

      const translateY = Math.abs(parseFloat(match[1]));
      const height = firstChild.getBoundingClientRect().height || 20;
      const position = Math.round(translateY / height);
      const digit = position % 10;
      numberStr += String(digit);
    }

    if (numberStr.length === 0) return null;

    return this._parseCount(numberStr);
  },

  _parseCount(text) {
    const cleaned = text.replace(/,/g, '').trim().toUpperCase();
    if (cleaned.endsWith('K')) {
      return Math.round(parseFloat(cleaned) * 1000);
    }
    if (cleaned.endsWith('M')) {
      return Math.round(parseFloat(cleaned) * 1000000);
    }
    // Handle "2.031" format (dot as thousands separator in some locales)
    // If the string has dots and looks like "X.XXX", treat dot as thousands sep
    if (/^\d+\.\d{3}$/.test(cleaned)) {
      return parseInt(cleaned.replace('.', ''), 10);
    }
    return parseInt(cleaned, 10) || null;
  },
};

if (typeof module !== 'undefined') module.exports = { KI_ViewerCountReader };
