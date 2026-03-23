const fs = require('fs');
let css = fs.readFileSync('assets/css/composer.css', 'utf8');

// Remove all previous lyric label / vibe fix attempts at end of file
const markers = [
  '/* Remove gap between LYRICS label and lyric chip */',
  '/* Vibe section visibility fix */',
  '/* Lyrics label style - match SONG/ARTIST labels */',
  '/* Allow search sheet to float over modal body content */',
  '/* Flash fix',
  '/* Hide composer modal-body',
  '/* Freeze landing',
  '/* Fix composer logo',
  '/* Fix vibe active',
  '/* Fix vibe'
];
let cutAt = css.length;
markers.forEach(m => {
  const idx = css.indexOf(m);
  if (idx > -1 && idx < cutAt) cutAt = idx;
});
css = css.slice(0, cutAt).trimEnd();

// Now add clean targeted fixes
css += `

/* ── LYRICS label - matches SONG/ARTIST exactly ── */
#lyricChipLabel {
  display: none;
  font-family: var(--font-mono, monospace);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(232,197,71,0.7);
  margin-top: 10px;
  margin-bottom: 4px;
}

/* ── Lyric chip wrap - no extra top margin ── */
#lyricChipWrap {
  margin-top: 0 !important;
}
.lyric-chip-wrap {
  margin-top: 0 !important;
}

/* ── Vibe section - wrap inside modal, no overflow ── */
#vibeLabel {
  display: none;
  font-family: var(--font-mono, monospace);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(232,197,71,0.7);
  margin-top: 10px;
  margin-bottom: 4px;
}

.emotion-grid {
  display: none;
  flex-wrap: wrap !important;
  gap: 6px !important;
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.emotion-btn {
  flex: 0 0 auto !important;
  white-space: nowrap;
  font-size: 0.75rem !important;
  padding: 6px 12px !important;
  border-radius: 20px !important;
}

/* ── Fix vibe active state ── */
#composer .emotion-btn.active {
  background: rgba(232,197,71,0.18) !important;
  border-color: rgba(232,197,71,0.6) !important;
  color: #E8C547 !important;
}

/* ── Allow search sheet to float over content ── */
#shareInputs {
  position: relative;
  z-index: 40;
}
#composer .modal-body {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}
`;

fs.writeFileSync('assets/css/composer.css', css);
console.log('composer.css cleaned and fixed');
