const fs = require('fs');

/* ── 1. Update index.html — replace composer-topbar label with full logo mark ── */
let html = fs.readFileSync('index.html', 'utf8');

const oldTopbar = '<div class="composer-topbar"><span class="composer-topbar-label">MARGO</span><button class="modal-close" id="closeComposer">\u00d7</button></div>';

// Read the SVG from the nav logo to reuse it exactly
// Find the nav-logo-mark SVG content
const navLogoStart = html.indexOf('<span class="nav-logo-mark">');
const navLogoEnd   = html.indexOf('</span>', html.indexOf('</span>', navLogoStart) + 1) + 7;
const navLogoHTML  = html.slice(navLogoStart, navLogoEnd);

// Build composer logo — same structure, different class
const composerLogo =
  '<div class="composer-topbar">'
  + '<a class="composer-logo" href="/" aria-label="Margo">'
  + navLogoHTML.replace('nav-logo-mark', 'composer-logo-mark')
  + '<span class="composer-logo-text">MARGO</span>'
  + '</a>'
  + '<button class="modal-close" id="closeComposer">\u00d7</button>'
  + '</div>';

if(html.includes(oldTopbar)){
  html = html.replace(oldTopbar, composerLogo);
  fs.writeFileSync('index.html', html);
  console.log('index.html topbar updated with logo mark');
} else {
  console.log('WARNING: topbar not found — check HTML');
}

/* ── 2. Add CSS for composer logo mark ── */
let css = fs.readFileSync('assets/css/modals.css', 'utf8');

// Remove old composer-topbar-label style
css = css.replace(
  `.composer-topbar-label {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #E8C547 0%, rgba(232,197,71,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0.6;
  user-select: none;
}`, ''
);

css += `
/* ══ COMPOSER LOGO MARK ══ */
.composer-logo {
  display: flex; align-items: center; gap: 8px;
  text-decoration: none; user-select: none;
}
.composer-logo-mark {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  width: 22px; height: 22px;
}
.composer-logo-mark .logo-circle {
  position: relative; z-index: 2;
  width: 18px; height: 18px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
  filter: drop-shadow(0 0 6px rgba(232,197,71,0.8));
  animation: core-breathe 3.4s ease-in-out infinite;
}
.composer-logo-mark .logo-circle svg { width: 100%; height: 100%; display: block; }
.composer-logo-mark .logo-ring {
  position: absolute; border-radius: 50%;
  border: 1px solid rgba(232,197,71,0.65);
  width: 18px; height: 18px;
  animation: nav-ripple 3.4s ease-out infinite;
}
.composer-logo-mark .logo-ring:nth-child(1) { animation-delay: 0s;   }
.composer-logo-mark .logo-ring:nth-child(2) { animation-delay: 1.1s; }
.composer-logo-mark .logo-ring:nth-child(3) { animation-delay: 2.2s; }
.composer-logo-text {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 4px;
  color: var(--gold);
  text-transform: uppercase;
  line-height: 1;
  opacity: 0.75;
}
`;

fs.writeFileSync('assets/css/modals.css', css);
console.log('modals.css composer logo styles added');
console.log('\nAll done. Commit and push.');
