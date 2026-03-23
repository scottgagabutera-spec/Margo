const fs = require('fs');
let css = fs.readFileSync('assets/css/feed.css', 'utf8');

// Remove all the appended FAB override blocks we added previously
css = css.replace(/\n\/\* FAB floating bottom-right \*\/[\s\S]*?@media\(max-width:600px\)\{#dropLyricFAB\{bottom:24px!important;right:14px!important;padding:9px 14px 9px 11px!important;font-size:0\.5rem!important;\}\}\n/g, '');
css = css.replace(/\n\/\* FAB on card - top right \*\/[\s\S]*?@media\(max-width:600px\)\{#dropLyricFAB\{top:62px!important;right:12px!important;\}\}\n/g, '');

// Also strip any stray appended FAB lines at end of file
const lines = css.split('\n');
const cleaned = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('FAB floating') || l.includes('FAB on card')) { skip = true; }
  if (skip && l.trim() === '') { skip = false; continue; }
  if (!skip) cleaned.push(l);
}
css = cleaned.join('\n');

// Now rewrite the base FAB rule — small compact fixed button, top-right, below header
css = css.replace(
  '#dropLyricFAB{position:relative;display:none;background:var(--gold);color:#07060A;border:none;border-radius:50px;padding:6px 12px 6px 9px;font-family:var(--font-mono);font-size:0.38rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0}',
  '#dropLyricFAB{position:fixed;top:68px;right:14px;z-index:400;display:none;background:var(--gold);color:#07060A;border:none;border-radius:50px;padding:7px 12px 7px 10px;font-family:var(--font-mono);font-size:0.48rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:opacity 0.2s,transform 0.2s;align-items:center;gap:5px;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,0.4)}'
);

fs.writeFileSync('assets/css/feed.css', css);
console.log('FAB CSS cleaned and rewritten');
