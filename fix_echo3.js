const fs = require('fs');
let c = fs.readFileSync('js/features/echoes.js', 'utf8');

// 1. Fix expandEchoCompose — focus smart search not lyric textarea
c = c.replace(
  "  document.getElementById('echoLyricInput')?.focus();",
  "  setTimeout(() => { const si = document.getElementById('echoSmartInput'); if (si) si.focus(); }, 80);"
);

// 2. Fix clearEchoForm — add reset for new elements
c = c.replace(
  "function clearEchoForm() {\n  ['echoLyricInput','echoSongInput','echoArtistInput'].forEach(id => {\n    const el = document.getElementById(id);\n    if (el) el.value = '';\n  });",
  "function clearEchoForm() {\n  ['echoLyricInput','echoSongInput','echoArtistInput'].forEach(id => {\n    const el = document.getElementById(id);\n    if (el) el.value = '';\n  });\n  const si = document.getElementById('echoSmartInput'); if (si) si.value = '';\n  const sp = document.getElementById('echoSongPill'); if (sp) sp.style.display = 'none';\n  const lw = document.getElementById('echoLyricWrap'); if (lw) lw.style.display = 'none';\n  const sw = document.getElementById('echoSmartSearchWrap'); if (sw) sw.style.display = '';\n  const sr = document.getElementById('echoSearchResults'); if (sr) { sr.style.display = 'none'; sr.innerHTML = ''; }\n  const cs = document.getElementById('echoClearSearch'); if (cs) cs.style.display = 'none';\n  const ss = document.getElementById('echoSearchSpinner'); if (ss) ss.style.display = 'none';"
);

// 3. Replace old runEchoGeniusSearch with new runEchoSmartSearch
const oldSearch = `let _echoLastQuery = '';

async function runEchoGeniusSearch(query) {
  if (query === _echoLastQuery) return;
  _echoLastQuery = query;

  const btn      = document.getElementById('echoIdentifyBtn');
  const liveHint = document.getElementById('echoLiveHint');
  if (btn) { btn.innerHTML = '<span class="echo-spinner"></span> Searching\u2026'; btn.disabled = true; }
  if (liveHint) liveHint.style.display = 'none';
  const resultsEl = document.getElementById('echoGeniusResults');
  if (resultsEl) resultsEl.innerHTML = '';

  try {
    const res  = await fetch(\`/api/genius?lyric=\${encodeURIComponent(query)}\`);
    const data = await res.json();
    if (btn) { btn.textContent = 'Identify Song'; btn.disabled = false; }
    if (!res.ok || !data.results?.length) return;
    renderEchoGeniusResults(data.results);
  } catch (_) {
    if (btn) { btn.textContent = 'Identify Song'; btn.disabled = false; }
  }
}`;

const newSearch = `let _echoLastQuery = '';

async function runEchoSmartSearch(query) {
  if (query === _echoLastQuery) return;
  _echoLastQuery = query;
  const spinner = document.getElementById('echoSearchSpinner');
  const resultsEl = document.getElementById('echoSearchResults');
  if (spinner) spinner.style.display = '';
  if (resultsEl) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; }
  try {
    const res  = await fetch('/api/genius?lyric=' + encodeURIComponent(query));
    const data = await res.json();
    if (spinner) spinner.style.display = 'none';
    if (!res.ok || !data.results || !data.results.length) {
      if (resultsEl) { resultsEl.innerHTML = '<div style="padding:10px 12px;font-family:Space Mono,monospace;font-size:0.5rem;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:2px">No results found</div>'; resultsEl.style.display = 'block'; }
      return;
    }
    renderEchoSmartResults(data.results);
  } catch (_) {
    if (spinner) spinner.style.display = 'none';
  }
}

function selectEchoResult(r) {
  const songInput   = document.getElementById('echoSongInput');
  const artistInput = document.getElementById('echoArtistInput');
  if (songInput)   songInput.value   = r.song;
  if (artistInput) artistInput.value = r.artist;

  const pillName   = document.getElementById('echoSongPillName');
  const pillArtist = document.getElementById('echoSongPillArtist');
  const pillArt    = document.getElementById('echoSongPillArt');
  const pill       = document.getElementById('echoSongPill');
  if (pillName)   pillName.textContent   = r.song;
  if (pillArtist) pillArtist.textContent = r.artist;
  if (pillArt && r.artwork) { pillArt.src = r.artwork; pillArt.style.display = ''; }
  if (pill) pill.style.display = 'flex';

  const sw = document.getElementById('echoSmartSearchWrap');
  if (sw) sw.style.display = 'none';

  const lyricWrap = document.getElementById('echoLyricWrap');
  const lyricInput = document.getElementById('echoLyricInput');
  if (lyricWrap) lyricWrap.style.display = 'block';
  if (lyricInput) {
    lyricInput.placeholder = r.source === 'itunes'
      ? 'Type the lyric from ' + r.song + ' you want to share\u2026'
      : 'The lyric that answers this one\u2026';
    setTimeout(() => lyricInput.focus(), 80);
  }

  const resultsEl = document.getElementById('echoSearchResults');
  if (resultsEl) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; }
  _echoLastQuery = '';
}`;

c = c.replace(oldSearch, newSearch);

// 4. Replace renderEchoGeniusResults with renderEchoSmartResults
const oldRender = `function renderEchoGeniusResults(results) {
  const el = document.getElementById('echoGeniusResults');
  if (!el) return;
  el.innerHTML = '';

  const label = document.createElement('div');
  label.style.cssText = \`font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;\`;
  label.textContent = 'Select the right song';
  el.appendChild(label);

  results.slice(0, 3).forEach(r => {
    const card = document.createElement('div');
    card.style.cssText = \`display:flex;align-items:center;gap:10px;padding:9px 12px;
      border-radius:11px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:all 0.18s;margin-bottom:5px;\`;
    card.innerHTML = \`
      \${r.artwork ? \`<img src="\${r.artwork}" style="width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0;" alt=""/>\` : ''}
      <div style="flex:1;min-width:0">`;

const newRender = `function renderEchoSmartResults(results) {
  const el = document.getElementById('echoSearchResults');
  if (!el) return;
  el.innerHTML = '';
  el.style.display = 'block';

  const label = document.createElement('div');
  label.style.cssText = "font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;padding:8px 12px 0;";
  label.textContent = 'Select the right song';
  el.appendChild(label);

  results.forEach(r => {
    const card = document.createElement('div');
    card.style.cssText = "display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid rgba(255,255,255,0.04);";
    card.innerHTML =
      (r.artwork ? '<img src="' + r.artwork + '" style="width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0;" alt=""/>' : '<div style="width:36px;height:36px;border-radius:7px;background:rgba(255,255,255,0.05);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem;opacity:0.4">♪</div>') +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:0.78rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.song + '</div>' +
        '<div style="font-size:0.62rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.artist + '</div>' +
      '</div>' +
      '<span style="font-family:Space Mono,monospace;font-size:0.48rem;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(232,197,71,0.08);color:rgba(232,197,71,0.7);border:1px solid rgba(232,197,71,0.2);flex-shrink:0">' + (r.source === 'itunes' ? 'iTunes' : 'Genius') + '</span>';
    card.onmouseenter = () => { card.style.background = 'rgba(232,197,71,0.06)'; };
    card.onmouseleave = () => { card.style.background = ''; };
    card.onclick = () => selectEchoResult(r);
    el.appendChild(card);
  });`;

c = c.replace(oldRender, newRender);

// 5. Add CSS for new elements before the closing style tag
const newCSS = `
    .echo-smart-search-wrap{position:relative;margin-bottom:2px}
    .echo-smart-search-field{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.10);transition:border-color 0.2s}
    .echo-smart-search-field:focus-within{border-color:rgba(232,197,71,0.35)}
    .echo-smart-input{flex:1;background:none;border:none;outline:none;color:#fff;font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:500;min-width:0;caret-color:#E8C547}
    .echo-smart-input::placeholder{color:rgba(255,255,255,0.22)}
    .echo-search-spinner{width:12px;height:12px;border-radius:50%;border:2px solid rgba(232,197,71,0.2);border-top-color:#E8C547;animation:echoSpin 0.7s linear infinite;flex-shrink:0}
    .echo-clear-search{background:none;border:none;color:rgba(255,255,255,0.3);font-size:1rem;cursor:pointer;padding:0 2px;flex-shrink:0;transition:color 0.15s;line-height:1}
    .echo-clear-search:hover{color:rgba(255,255,255,0.7)}
    .echo-search-results{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:50;border-radius:12px;background:#141318;border:1px solid rgba(255,255,255,0.08);box-shadow:0 12px 40px rgba(0,0,0,0.6);overflow:hidden;max-height:220px;overflow-y:auto}
    .echo-song-pill{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(232,197,71,0.06);border:1px solid rgba(232,197,71,0.22)}
    .echo-song-pill-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
    .echo-song-pill-name{font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .echo-song-pill-artist{font-family:'Space Mono',monospace;font-size:0.55rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .echo-song-pill-change{background:none;border:1px solid rgba(232,197,71,0.3);color:rgba(232,197,71,0.7);font-family:'Space Mono',monospace;font-size:0.46rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 9px;border-radius:8px;cursor:pointer;flex-shrink:0;transition:all 0.18s}
    .echo-song-pill-change:hover{background:rgba(232,197,71,0.1);color:#E8C547;border-color:rgba(232,197,71,0.6)}
`;

c = c.replace('  `;\n  document.head.appendChild(s);\n}', newCSS + '  `;\n  document.head.appendChild(s);\n}');

fs.writeFileSync('js/features/echoes.js', c, 'utf8');
console.log('Done');
