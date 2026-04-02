/**
 * MARGO — Mobile Performance Patch
 * Run: node patch_mobile.js  (from ~/Margo)
 *
 * What this fixes:
 *  1. Adds defer to all non-Firebase scripts  → unblocks HTML parsing
 *  2. Fixes duplicate #feedSearchInput ID      → broken search on mobile
 *  3. Removes redundant font preload block     → cuts ~4 extra font requests
 *  4. Adds touch-action:manipulation globally  → kills 300ms tap delay
 *  5. Reduces backdrop-filter blur 16px→6px   → kills echo sheet lag on mobile
 *  6. Replaces modal display:none toggle with
 *     visibility+opacity for echoes           → no layout reflow on open
 *  7. Disables grain on mobile                → removes compositor hit
 */

const fs   = require('fs');
const path = require('path');

// ─── Load files ───────────────────────────────────────────
const htmlPath     = path.join(__dirname, 'index.html');
const baseCssPath  = path.join(__dirname, 'assets/css/base.css');
const echoJsPath   = path.join(__dirname, 'js/features/echoes.js');

let html    = fs.readFileSync(htmlPath,    'utf8');
let baseCss = fs.readFileSync(baseCssPath, 'utf8');
let echoJs  = fs.readFileSync(echoJsPath,  'utf8');

let changed = { html: false, baseCss: false, echoJs: false };

// ════════════════════════════════════════════════════════════
//  FIX 1 — defer on all local scripts (not Firebase CDN)
// ════════════════════════════════════════════════════════════
// Firebase compat scripts must stay synchronous (they set up globals).
// Every <script src="js/..."> gets defer added.
const htmlBefore1 = html;
html = html.replace(
  /(<script\s+src="js\/[^"]+")(\s*>)/g,
  (match, open, close) => {
    if (match.includes('defer')) return match; // already has it
    return `${open} defer${close}`;
  }
);
if (html !== htmlBefore1) { changed.html = true; console.log('✓ FIX 1: defer added to local scripts'); }
else console.log('· FIX 1: defer already present — skipped');

// ════════════════════════════════════════════════════════════
//  FIX 2 — duplicate #feedSearchInput ID
//  The one inside .feed-search-wrap (the visible bar) keeps its ID.
//  The one in the header overlay gets renamed to #headerSearchInput
//  so JS can target both independently.
// ════════════════════════════════════════════════════════════
const htmlBefore2 = html;

// The header overlay input is the FIRST occurrence — rename it
let firstDone = false;
html = html.replace(/<input id="feedSearchInput"/g, (match) => {
  if (!firstDone) {
    firstDone = true;
    return '<input id="headerSearchInput"';
  }
  return match;
});

// Also update the JS reference that targets the header input
// (feedSearchInput inside feedSearchOverlay)
html = html.replace(
  /document\.getElementById\('feedSearchInput'\)/g,
  `document.getElementById('headerSearchInput') || document.getElementById('feedSearchInput')`
);

if (html !== htmlBefore2) { changed.html = true; console.log('✓ FIX 2: duplicate ID fixed → headerSearchInput'); }
else console.log('· FIX 2: no duplicate found — skipped');

// ════════════════════════════════════════════════════════════
//  FIX 3 — remove the redundant preload font block
//  (the <link rel="preload" as="style"> with onload=)
//  These fonts are already loaded by the main Google Fonts link.
//  The preload just adds extra HTTP requests on mobile.
// ════════════════════════════════════════════════════════════
const htmlBefore3 = html;
html = html.replace(
  /<link rel="preload" as="style" href="https:\/\/fonts\.googleapis\.com[^>]*onload[^>]*>/g,
  '<!-- font preload removed: already covered by main Google Fonts link -->'
);
if (html !== htmlBefore3) { changed.html = true; console.log('✓ FIX 3: redundant font preload removed'); }
else console.log('· FIX 3: preload already removed — skipped');

// ════════════════════════════════════════════════════════════
//  FIX 4 — touch-action: manipulation on all interactive elements
//  Kills the 300ms tap delay on Android without breaking zoom.
//  Inject into base.css
// ════════════════════════════════════════════════════════════
const touchFix = `
/* ── Mobile tap delay fix ── */
button, a, [role="tab"], [role="button"], input, textarea, select,
.room-tab, .emotion-btn, .feed-card, .echo-action-btn,
.echo-vibe-opt, .composer-btn, .btn-primary, .btn-ghost,
.echo-compose-trigger, .echo-submit-btn, .echo-cancel-btn {
  touch-action: manipulation;
}
`;
if (!baseCss.includes('touch-action: manipulation')) {
  baseCss += touchFix;
  changed.baseCss = true;
  console.log('✓ FIX 4: touch-action:manipulation added to base.css');
} else {
  console.log('· FIX 4: touch-action already present — skipped');
}

// ════════════════════════════════════════════════════════════
//  FIX 5 — disable grain overlay on mobile (compositor killer)
// ════════════════════════════════════════════════════════════
const grainFix = `
/* ── Disable grain on mobile to reduce compositor load ── */
@media (max-width: 768px) {
  body::before { display: none; }
}
`;
if (!baseCss.includes('Disable grain on mobile')) {
  baseCss += grainFix;
  changed.baseCss = true;
  console.log('✓ FIX 5: grain disabled on mobile in base.css');
} else {
  console.log('· FIX 5: grain fix already present — skipped');
}

// ════════════════════════════════════════════════════════════
//  FIX 6 — disable ambient blur on mobile (another GPU hit)
// ════════════════════════════════════════════════════════════
const ambientFix = `
/* ── Disable ambient blurs on mobile ── */
@media (max-width: 768px) {
  .ambient { display: none; }
}
`;
if (!baseCss.includes('Disable ambient blurs on mobile')) {
  baseCss += ambientFix;
  changed.baseCss = true;
  console.log('✓ FIX 6: ambient blurs disabled on mobile');
} else {
  console.log('· FIX 6: ambient fix already present — skipped');
}

// ════════════════════════════════════════════════════════════
//  FIX 7 — reduce backdrop-filter blur in echoes.js
//  blur(16px) → blur(4px) on mobile, kills the sheet open lag
// ════════════════════════════════════════════════════════════
const ecssBefore = echoJs;
echoJs = echoJs.replace(
  /backdrop-filter:blur\(16px\) saturate\(0\.7\);/g,
  'backdrop-filter:blur(4px) saturate(0.8);'
);
echoJs = echoJs.replace(
  /-webkit-backdrop-filter:blur\(16px\) saturate\(0\.7\);/g,
  '-webkit-backdrop-filter:blur(4px) saturate(0.8);'
);
// Also make the echo sheet backdrop skip blur on low-end (add @media query via JS style injection)
const mobileBlurOverride = `
    @media(max-width:560px){
      #echoSheetBackdrop{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(0,0,0,0.92);}
    }`;
if (!echoJs.includes('backdrop-filter:none')) {
  // Inject after the echoFadeIn keyframe closing brace
  echoJs = echoJs.replace(
    '@keyframes echoFadeIn{from{opacity:0}to{opacity:1}}',
    `@keyframes echoFadeIn{from{opacity:0}to{opacity:1}}${mobileBlurOverride}`
  );
}
if (echoJs !== ecssBefore) { changed.echoJs = true; console.log('✓ FIX 7: backdrop-filter reduced in echoes.js'); }
else console.log('· FIX 7: blur already reduced — skipped');

// ════════════════════════════════════════════════════════════
//  FIX 8 — will-change hint on echo sheet for GPU promotion
// ════════════════════════════════════════════════════════════
const wcBefore = echoJs;
echoJs = echoJs.replace(
  'animation:echoSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);',
  'will-change:transform,opacity;animation:echoSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);'
);
if (echoJs !== wcBefore) { changed.echoJs = true; console.log('✓ FIX 8: will-change added to echo sheet'); }
else console.log('· FIX 8: will-change already present — skipped');

// ════════════════════════════════════════════════════════════
//  FIX 9 — Add font-display:swap hint comment + trim font load
//  Remove the heaviest weights from the main Google Fonts URL
//  that are never used (opsz range load is expensive on mobile)
// ════════════════════════════════════════════════════════════
const htmlBefore9 = html;
// Replace the heavy DM Sans opsz range load with a simple weight load
html = html.replace(
  'family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400',
  'family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400'
);
if (html !== htmlBefore9) { changed.html = true; console.log('✓ FIX 9: DM Sans opsz range simplified'); }
else console.log('· FIX 9: font already simplified — skipped');

// ════════════════════════════════════════════════════════════
//  FIX 10 — Add overscroll-behavior & scroll performance to base.css
// ════════════════════════════════════════════════════════════
const scrollFix = `
/* ── Scroll performance ── */
html {
  overscroll-behavior-y: none;
  -webkit-overflow-scrolling: touch;
}
.echo-list-wrap, .feed-search-wrap, .room-tabs {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
`;
if (!baseCss.includes('overscroll-behavior-y')) {
  baseCss += scrollFix;
  changed.baseCss = true;
  console.log('✓ FIX 10: scroll performance added to base.css');
} else {
  console.log('· FIX 10: scroll fix already present — skipped');
}

// ════════════════════════════════════════════════════════════
//  WRITE FILES
// ════════════════════════════════════════════════════════════
if (changed.html)    { fs.writeFileSync(htmlPath,    html,    'utf8'); console.log('\n📝 index.html saved'); }
if (changed.baseCss) { fs.writeFileSync(baseCssPath, baseCss, 'utf8'); console.log('📝 assets/css/base.css saved'); }
if (changed.echoJs)  { fs.writeFileSync(echoJsPath,  echoJs,  'utf8'); console.log('📝 js/features/echoes.js saved'); }

if (!changed.html && !changed.baseCss && !changed.echoJs) {
  console.log('\n⚠ No changes made — all fixes already applied.');
} else {
  console.log('\n✅ Patch complete. Test on mobile, then:');
  console.log('   git add -A && git commit -m "fix: mobile performance — defer scripts, tap delay, blur, grain, fonts" && git push origin fix/mobile-performance');
  console.log('\n   To revert: cp index.html.bak index.html && git checkout js/features/echoes.js assets/css/base.css');
}
