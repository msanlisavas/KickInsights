/**
 * Generate KickInsights icons as SVG, then convert to simple PNG.
 * Since we can't use canvas on Windows without native deps,
 * we generate SVG files and an HTML file that can render them to PNG.
 *
 * Usage: Open scripts/icon-renderer.html in a browser,
 * right-click each icon → Save Image As → icons/iconN.png
 */

const fs = require('fs');
const path = require('path');

// KickInsights icon SVG — eye with chart line inside, Kick green accent
function generateSVG(size) {
  const s = size;
  const pad = s * 0.1;
  const cx = s / 2;
  const cy = s / 2;
  const r = (s - pad * 2) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0e0e10"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${s * 0.18}" fill="url(#bg)"/>
  <!-- Eye shape (outer) -->
  <path d="M ${pad} ${cy} Q ${cx} ${pad * 1.5} ${s - pad} ${cy} Q ${cx} ${s - pad * 1.5} ${pad} ${cy}"
        fill="none" stroke="#53fc18" stroke-width="${Math.max(1.5, s * 0.03)}" stroke-linejoin="round"/>
  <!-- Pupil -->
  <circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="#53fc18" opacity="0.3"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="#53fc18"/>
  <!-- Chart line inside eye -->
  <polyline points="${cx - r * 0.45},${cy + r * 0.1} ${cx - r * 0.15},${cy - r * 0.2} ${cx + r * 0.1},${cy + r * 0.05} ${cx + r * 0.4},${cy - r * 0.3}"
            fill="none" stroke="#53fc18" stroke-width="${Math.max(1, s * 0.025)}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

// Generate SVGs
const iconsDir = path.join(__dirname, '..', 'icons');
[16, 48, 128].forEach(size => {
  const svg = generateSVG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
});

// Generate an HTML page to render SVGs to PNG (open in browser to save)
const html = `<!DOCTYPE html>
<html>
<head><title>KickInsights Icon Renderer</title></head>
<body style="background:#333; padding:20px; font-family:system-ui; color:#fff">
<h2>Right-click each icon → Save Image As → save to icons/ folder</h2>
${[16, 48, 128].map(size => {
  const svg = generateSVG(size);
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  return `
<div style="margin:20px 0">
  <p>icon${size}.png (${size}x${size})</p>
  <img src="${dataUrl}" width="${size}" height="${size}" style="background:#0e0e10; border:1px solid #555">
  <canvas id="c${size}" width="${size}" height="${size}" style="display:none"></canvas>
  <a id="dl${size}" style="margin-left:10px; color:#53fc18; cursor:pointer">Download PNG</a>
</div>`;
}).join('')}
<script>
${[16, 48, 128].map(size => `
(function() {
  const img = document.querySelector('img[width="${size}"]');
  const canvas = document.getElementById('c${size}');
  const link = document.getElementById('dl${size}');
  img.onload = function() {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, ${size}, ${size});
    link.onclick = function() {
      const a = document.createElement('a');
      a.download = 'icon${size}.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
  };
  if (img.complete) img.onload();
})();
`).join('')}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'icon-renderer.html'), html);

console.log('Generated:');
console.log('  icons/icon16.svg');
console.log('  icons/icon48.svg');
console.log('  icons/icon128.svg');
console.log('  scripts/icon-renderer.html');
console.log('');
console.log('To get PNGs: open scripts/icon-renderer.html in Chrome and click Download on each.');
