const fs = require('fs');

/* ── Append premium composer modal styles ── */
let css = fs.readFileSync('assets/css/modals.css', 'utf8');

// Remove old composer-topbar styles
const cutAt = css.indexOf('/* Composer topbar - minimal floating close */');
if(cutAt > -1) css = css.slice(0, cutAt).trimEnd();

css += `

/* ══════════════════════════════════════════════
   MARGO COMPOSER — Premium Modal v10
   ══════════════════════════════════════════════ */

/* Override modal-sheet for composer specifically */
#composer .modal-sheet {
  background: #0F0E14;
  border: none;
  border-radius: 28px 28px 0 0;
  /* Gold spotlight top border */
  box-shadow:
    0 -1px 0 0 rgba(232,197,71,0.55),
    0 -4px 32px rgba(232,197,71,0.08),
    0 -24px 80px rgba(0,0,0,0.8),
    inset 0 1px 0 rgba(232,197,71,0.12);
  overflow: hidden;
}

@media(min-width:520px){
  #composer .modal-sheet {
    border-radius: 24px;
    box-shadow:
      0 0 0 1px rgba(232,197,71,0.18),
      0 0 0 0px rgba(232,197,71,0.06),
      0 32px 80px rgba(0,0,0,0.85),
      inset 0 1px 0 rgba(232,197,71,0.1);
  }
}

/* Gold gradient line at very top */
#composer .modal-sheet::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(232,197,71,0.3) 20%,
    #E8C547 50%,
    rgba(232,197,71,0.3) 80%,
    transparent 100%
  );
  z-index: 1;
}

/* Topbar — close button right, MARGO watermark label left */
.composer-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px 8px;
  flex-shrink: 0;
  position: relative;
}

.composer-topbar-label {
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #E8C547 0%, rgba(232,197,71,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0.6;
  user-select: none;
}

.composer-topbar .modal-close {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s;
}
.composer-topbar .modal-close:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
  border-color: rgba(255,255,255,0.2);
}

/* Modal body — better spacing, lighter feel */
#composer .modal-body {
  padding: 10px 20px 16px;
  gap: 12px;
}

/* Search field — more open, readable */
#composer .smart-search-field {
  border: none !important;
  border-bottom: 1.5px solid rgba(232,197,71,0.2) !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 6px 0 14px !important;
}
#composer .smart-search-field:focus-within {
  border-bottom-color: rgba(232,197,71,0.6) !important;
}
#composer .smart-search-input {
  font-size: 1.05rem !important;
  font-family: var(--font-ui) !important;
  color: #F4F1ED !important;
  letter-spacing: 0.01em;
}
#composer .smart-search-input::placeholder {
  color: rgba(232,197,71,0.32) !important;
  font-style: italic;
}
#composer .smart-search-icon svg {
  stroke: rgba(232,197,71,0.45) !important;
}

/* Song pill — more premium */
#composer .song-pill {
  background: rgba(232,197,71,0.06);
  border: 1px solid rgba(232,197,71,0.22);
  border-radius: 16px;
  padding: 11px 14px;
}
#composer .song-pill-name {
  font-size: 0.9rem;
  font-family: var(--font-ui);
  font-weight: 700;
  color: #F4F1ED;
  letter-spacing: 0.01em;
}
#composer .song-pill-artist {
  font-size: 0.72rem;
  color: rgba(244,241,237,0.5);
  letter-spacing: 0.02em;
}

/* Song confirm inputs — readable */
#composer .song-confirm-input {
  font-size: 0.88rem !important;
  color: #F4F1ED !important;
  background: rgba(255,255,255,0.04) !important;
  border: 1px solid rgba(232,197,71,0.18) !important;
  letter-spacing: 0.01em;
}
#composer .song-confirm-input:focus {
  background: rgba(232,197,71,0.06) !important;
  border-color: rgba(232,197,71,0.5) !important;
}
#composer .song-confirm-label {
  color: rgba(232,197,71,0.65) !important;
  font-size: 0.52rem !important;
  letter-spacing: 2.5px !important;
}

/* Lyric chip — readable, italic, instrument serif */
#composer .lyric-chip {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px;
  padding: 14px 14px;
}
#composer .lyric-chip:focus-within {
  border-color: rgba(232,197,71,0.4);
  box-shadow: 0 0 0 3px rgba(232,197,71,0.07);
}
#composer .lyric-chip-text {
  font-family: var(--font-lyric) !important;
  font-size: 1.05rem !important;
  line-height: 1.55 !important;
  color: #F4F1ED !important;
  opacity: 1 !important;
  letter-spacing: 0.01em;
}

/* Vibe label */
#composer .field-label {
  font-size: 0.58rem !important;
  letter-spacing: 3px !important;
  color: rgba(244,241,237,0.45) !important;
}

/* Emotion buttons — more readable */
#composer .emotion-btn {
  font-size: 0.75rem !important;
  padding: 7px 13px !important;
  color: rgba(244,241,237,0.65) !important;
  border-color: rgba(255,255,255,0.1) !important;
  letter-spacing: 0.02em;
}
#composer .emotion-btn:hover {
  color: #F4F1ED !important;
  border-color: rgba(255,255,255,0.2) !important;
}
#composer .emotion-btn.active {
  color: #0B0B0D !important;
}

/* Footer — glass effect */
#composer .modal-footer {
  background: linear-gradient(0deg, rgba(15,14,20,0.98) 0%, rgba(15,14,20,0.85) 100%);
  border-top: 1px solid rgba(232,197,71,0.1);
  padding: 14px 20px 28px;
  gap: 10px;
}

/* Drop It button — unmissable */
#composer .composer-btn-primary {
  font-family: var(--font-display) !important;
  font-size: 1.1rem !important;
  letter-spacing: 3px !important;
  padding: 16px !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg, #f5d878 0%, #E8C547 50%, #D4A832 100%) !important;
  color: #07060A !important;
  box-shadow: 0 4px 24px rgba(232,197,71,0.35), 0 1px 0 rgba(255,255,255,0.2) inset !important;
  transition: all 0.2s var(--ease-out) !important;
  border: none !important;
}
#composer .composer-btn-primary:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 32px rgba(232,197,71,0.5) !important;
}
#composer .composer-btn-primary:active {
  transform: translateY(0) !important;
  box-shadow: 0 2px 12px rgba(232,197,71,0.3) !important;
}

/* Secondary buttons */
#composer .composer-btn-secondary {
  font-family: var(--font-mono) !important;
  font-size: 0.6rem !important;
  letter-spacing: 1.5px !important;
  color: rgba(244,241,237,0.55) !important;
  border-color: rgba(255,255,255,0.1) !important;
  border-radius: 12px !important;
  padding: 12px !important;
  transition: all 0.18s !important;
}
#composer .composer-btn-secondary:hover {
  color: #F4F1ED !important;
  border-color: rgba(232,197,71,0.3) !important;
  background: rgba(232,197,71,0.05) !important;
}

/* Search result sheet — premium */
#composer .search-sheet {
  background: #141218;
  border: 1px solid rgba(232,197,71,0.12);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.7);
}
#composer .search-result-song {
  font-size: 0.88rem !important;
  color: #F4F1ED !important;
  font-weight: 700 !important;
}
#composer .search-result-artist {
  font-size: 0.72rem !important;
  color: rgba(244,241,237,0.45) !important;
}

/* YouTube card */
#composer .yt-card {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
}
#composer .yt-title {
  font-size: 0.82rem !important;
  color: #F4F1ED !important;
  font-weight: 600 !important;
}
#composer .yt-channel {
  color: rgba(244,241,237,0.45) !important;
  font-size: 0.68rem !important;
}
`;

fs.writeFileSync('assets/css/modals.css', css);
console.log('modals.css premium composer styles added');

/* ── Update index.html composer-topbar to add MARGO label ── */
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  '<div class="composer-topbar"><button class="modal-close" id="closeComposer">\u00d7</button></div>',
  '<div class="composer-topbar"><span class="composer-topbar-label">MARGO</span><button class="modal-close" id="closeComposer">\u00d7</button></div>'
);
fs.writeFileSync('index.html', html);
console.log('index.html topbar updated with MARGO label');

console.log('\nAll done. Commit and push.');
