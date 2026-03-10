/* ============================================================
   MARGO — js/composer.js
   v5.7 — concept-v2: postcardModal removed.
          All postcard/closePostcard/listenPostcard references
          are null-guarded so initComposer() no longer crashes
          and app.js reaches startFirebaseSync().
   ============================================================ */

/* ══════════════════════════════════════════════════════════════
   MODERATION ENGINE — v2.0
   ══════════════════════════════════════════════════════════════ */

const SAFE_WORDS = new Set([
  'night','nights','midnight','knight','knights','tonight','fortnight',
  'bass','bassist','classic','classics','classical','classy','glass','glasses',
  'grass','mass','masses','massive','class','classes','classic','passage',
  'passion','passionate','compass','compass','harass','embarrass','assassin',
  'assumption','assistant','assemble','asset','assets','assess','assign',
  'associate','assist','assistance','association','assist',
  'pass','passes','passing','passenger','passion','passive',
  'mass','massage','ambassador',
  'cock','cocktail','cockatoo','peacock','hancock','woodcock','haycock',
  'rooster','weathercock',
  'piss','dismiss','bliss','kiss','kissing','missy','mississippi',
  'bastard','dastardly',
  'damn','damning','adamant','madam',
  'pitch','ditch','hitch','switch','witch','kitchen','itch',
  'dig','digit','digital','digs','dignity','digging',
  'asset','assets',
]);

const BANNED_PATTERNS = [
  'fuck','shit','bitch','asshole','nigger','cunt',
  'whore','slut','pussy','dick','cock','bastard',
];

const BANNED_VARIATIONS = {
  fuck:    ['fuk','fck','fuq','phuck','fux','f u c k','f*ck'],
  shit:    ['sh1t','sht','5hit'],
  bitch:   ['biatch','b1tch','bytch'],
  pussy:   ['pus5y','puss1','pussi','pus5i'],
  dick:    ['d1ck','dik','d!ck'],
  cock:    ['c0ck','cok','c0k'],
  bastard: ['b4stard','baztard'],
  asshole: ['a55hole','@sshole','ahole'],
  nigger:  ['n1gger','nigg3r'],
  cunt:    ['c*nt','kunt'],
  whore:   ['wh0re','h0re'],
  slut:    ['5lut','sl*t'],
};

function tokenize(text) {
  return text.toLowerCase().split(/[\s,\.!?;:\-"'()\[\]{}\/\\|<>]+/).filter(Boolean);
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');
}

function isWordBanned(word) {
  const norm = normalizeWord(word);
  if (SAFE_WORDS.has(word.toLowerCase())) return false;
  if (SAFE_WORDS.has(norm)) return false;
  for (const pattern of BANNED_PATTERNS) {
    const normPattern = normalizeWord(pattern);
    if (norm === normPattern) return true;
    const vars = BANNED_VARIATIONS[pattern] || [];
    if (vars.some(v => norm === normalizeWord(v))) return true;
  }
  return false;
}

function containsBannedWord(text) {
  return tokenize(text).some(word => isWordBanned(word));
}

function censorText(text) {
  let result = text;
  for (const pattern of BANNED_PATTERNS) {
    const allVariants = [pattern, ...(BANNED_VARIATIONS[pattern] || [])];
    for (const variant of allVariants) {
      if (!variant.includes(' ')) {
        try {
          const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
          const censored = pattern[0] + '*'.repeat(Math.max(pattern.length - 2, 1)) + pattern[pattern.length - 1];
          result = result.replace(regex, (match) => {
            if (SAFE_WORDS.has(match.toLowerCase())) return match;
            return censored;
          });
        } catch (_) {}
      }
    }
  }
  return result;
}

function decodeHTML(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

/* ── STYLES (injected once) ── */
function injectComposerStyles() {
  if (document.getElementById('composerV56Styles')) return;
  const s = document.createElement('style');
  s.id = 'composerV56Styles';
  s.textContent = `
    .m-spinner {
      width:14px;height:14px;border-radius:50%;
      border:2px solid rgba(232,197,71,0.2);
      border-top-color:#E8C547;
      animation:mspin 0.7s linear infinite;
      display:inline-block;flex-shrink:0;
    }
    @keyframes mspin{to{transform:rotate(360deg)}}

    #postAndCreateBtn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 18px 24px;
      border-radius: var(--radius);
      background: linear-gradient(135deg, #E8C547 0%, #D4A820 100%);
      color: #0B0B0D;
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 0.92rem;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      border: none;
      cursor: pointer;
      transition: all 0.22s var(--ease-out);
      box-shadow: 0 6px 28px rgba(232,197,71,0.30), inset 0 1px 0 rgba(255,255,255,0.25);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
    }
    #postAndCreateBtn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
      pointer-events: none;
    }
    #postAndCreateBtn:hover {
      background: linear-gradient(135deg, #F5D46A 0%, #E8C547 100%);
      box-shadow: 0 10px 36px rgba(232,197,71,0.45), inset 0 1px 0 rgba(255,255,255,0.3);
      transform: translateY(-2px);
    }
    #postAndCreateBtn:active {
      transform: scale(0.97);
      box-shadow: 0 4px 16px rgba(232,197,71,0.25);
    }
    #postAndCreateBtn:disabled {
      opacity: 0.55;
      cursor: default;
      transform: none;
      box-shadow: none;
    }

    #justPostLink {
      display: block;
      text-align: center;
      margin-top: 10px;
      font-size: 0.68rem;
      font-family: 'Space Mono', monospace;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.25);
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      padding: 4px 0;
      transition: color 0.18s;
    }
    #justPostLink:hover:not(:disabled) {
      color: rgba(255,255,255,0.5);
    }
    #justPostLink:disabled {
      opacity: 0.4;
      cursor: default;
    }

    #geniusIdentifyBtn {
      width:100%;margin-top:7px;padding:11px 16px;
      border-radius:12px;border:1px dashed rgba(232,197,71,0.3);
      background:rgba(232,197,71,0.04);
      color:rgba(232,197,71,0.7);
      font-family:'Space Mono',monospace;font-size:0.58rem;
      font-weight:700;letter-spacing:2px;text-transform:uppercase;
      cursor:pointer;transition:all 0.2s;
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    #geniusIdentifyBtn:hover:not(:disabled) {
      background:rgba(232,197,71,0.09);border-color:rgba(232,197,71,0.55);color:#E8C547;
    }
    #geniusIdentifyBtn.active { border-color:#E8C547;color:#E8C547;background:rgba(232,197,71,0.08); }
    #geniusIdentifyBtn:disabled { opacity:0.5;cursor:default; }

    .genius-section-label {
      font-size:0.58rem;color:rgba(255,255,255,0.45);letter-spacing:2px;
      text-transform:uppercase;font-family:'Space Mono',monospace;margin:10px 0 6px;
    }
    .genius-results-list { display:flex;flex-direction:column;gap:6px; }
    .genius-result-card {
      display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:all 0.18s;
    }
    .genius-result-card:hover { background:rgba(232,197,71,0.07);border-color:rgba(232,197,71,0.25);transform:translateX(2px); }
    .genius-result-card.selected { background:rgba(232,197,71,0.1);border-color:rgba(232,197,71,0.5); }
    .genius-art { width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.05); }
    .genius-info { flex:1;min-width:0; }
    .genius-song { font-size:0.82rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .genius-artist { font-size:0.7rem;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px; }
    .genius-use-tag {
      flex-shrink:0;font-size:0.58rem;font-family:'Space Mono',monospace;
      letter-spacing:1px;text-transform:uppercase;padding:4px 9px;border-radius:6px;
      background:rgba(232,197,71,0.08);color:rgba(232,197,71,0.7);border:1px solid rgba(232,197,71,0.2);transition:all 0.15s;
    }
    .genius-result-card:hover .genius-use-tag { background:rgba(232,197,71,0.15);color:#E8C547;border-color:rgba(232,197,71,0.4); }
    .genius-result-card.selected .genius-use-tag { background:#E8C547;color:#0B0B0D;border-color:#E8C547; }

    @keyframes ytSlideIn {
      from { opacity:0; transform:translateY(8px) scale(0.98); }
      to   { opacity:1; transform:translateY(0)  scale(1);    }
    }
    .yt-card {
      position:relative;margin-top:12px;border-radius:20px;overflow:hidden;
      border:1px solid rgba(232,197,71,0.22);
      background:linear-gradient(160deg,#141210 0%,#0f0e0c 100%);
      box-shadow:0 12px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(232,197,71,0.18) inset;
      animation:ytSlideIn 0.35s cubic-bezier(0.16,1,0.3,1);
    }
    .yt-card::before {
      content:'';position:absolute;top:0;left:8%;right:8%;height:1px;
      background:linear-gradient(90deg,transparent,rgba(232,197,71,0.8),transparent);
      pointer-events:none;
    }
    .yt-card::after {
      content:'';position:absolute;bottom:0;left:20%;right:20%;height:40px;
      background:radial-gradient(ellipse at center bottom,rgba(232,197,71,0.06),transparent);
      pointer-events:none;
    }
    .yt-card-inner { display:flex;align-items:flex-start;gap:14px;padding:14px 14px 12px; }
    .yt-thumb-wrap { position:relative;flex-shrink:0; }
    .yt-thumb-wrap::after {
      content:'';position:absolute;inset:-1px;border-radius:13px;
      background:linear-gradient(135deg,rgba(232,197,71,0.3),transparent 60%);
      pointer-events:none;
    }
    .yt-thumb {
      width:80px;height:80px;border-radius:12px;
      object-fit:cover;display:block;box-shadow:0 6px 20px rgba(0,0,0,0.6);
    }
    .yt-info { flex:1;min-width:0;padding-top:2px; }
    .yt-title {
      font-size:0.88rem;font-weight:700;color:#fff;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      line-height:1.3;letter-spacing:-0.02em;
    }
    .yt-channel {
      font-size:0.68rem;color:rgba(255,255,255,0.4);
      margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    .yt-links-row { display:flex;gap:5px;flex-wrap:wrap;margin-top:9px; }
    .yt-listen-link {
      display:inline-flex;align-items:center;gap:4px;
      font-size:0.56rem;font-family:'Space Mono',monospace;
      font-weight:700;letter-spacing:1px;text-transform:uppercase;
      padding:5px 11px;border-radius:20px;text-decoration:none;
      transition:all 0.2s ease;white-space:nowrap;backdrop-filter:blur(8px);
    }
    .yt-listen-link:hover { transform:translateY(-2px) scale(1.04);filter:brightness(1.25);box-shadow:0 4px 12px rgba(0,0,0,0.3); }
    .yt-link-yt  { background:rgba(255,50,50,0.14);color:#ff7070;border:1px solid rgba(255,50,50,0.32); }
    .yt-link-dz  { background:rgba(255,100,0,0.14);color:#ff8c3a;border:1px solid rgba(255,100,0,0.32); }
    .yt-link-it  { background:rgba(252,60,68,0.14);color:#fc7c82;border:1px solid rgba(252,60,68,0.32); }
    .yt-found-tag {
      flex-shrink:0;align-self:flex-start;margin-top:1px;
      padding:4px 11px;border-radius:20px;
      font-family:'Space Mono',monospace;font-size:0.5rem;
      font-weight:700;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap;
    }
    .yt-found-yt { background:rgba(255,50,50,0.12);  color:#ff7070; border:1px solid rgba(255,50,50,0.28);  }
    .yt-found-dz { background:rgba(255,100,0,0.12);  color:#ff8c3a; border:1px solid rgba(255,100,0,0.28);  }
    .yt-found-it { background:rgba(252,60,68,0.12);  color:#fc7c82; border:1px solid rgba(252,60,68,0.28);  }
    .yt-loading {
      display:flex;align-items:center;gap:10px;padding:18px 16px;
      font-size:0.65rem;color:rgba(255,255,255,0.4);
      font-family:'Space Mono',monospace;letter-spacing:0.5px;
    }

    @keyframes ytFadeUp {
      from { opacity:0; transform:translateY(4px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .yt-autocomplete {
      position:absolute;left:0;right:0;top:calc(100% + 4px);
      z-index:1000;background:#18181c;
      border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.7);animation:ytFadeUp 0.18s ease;
    }
    .yt-ac-item {
      display:flex;align-items:center;gap:10px;padding:9px 13px;cursor:pointer;
      border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.12s;
    }
    .yt-ac-item:last-child { border-bottom:none; }
    .yt-ac-item:hover { background:rgba(232,197,71,0.07); }
    .yt-ac-thumb  { width:38px;height:27px;border-radius:5px;object-fit:cover;flex-shrink:0;background:#222; }
    .yt-ac-song   { font-size:0.78rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .yt-ac-artist { font-size:0.65rem;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .song-input-wrap { position:relative; }

    @media (max-width: 768px) {
      .yt-autocomplete {
        position:fixed !important;left:0 !important;right:0 !important;
        top:auto !important;bottom:0 !important;
        border-radius:18px 18px 0 0 !important;
        max-height:50vh;overflow-y:auto;
        box-shadow:0 -8px 40px rgba(0,0,0,0.6) !important;
      }
    }
  `;
  document.head.appendChild(s);
}

/* ── STATE ── */
let youtubeData    = null;
let geniusResult   = null;
let geniusTimer    = null;
let ytSuggestTimer = null;
let ytFetchTimer   = null;
let lastGeniusQuery = '';

/* ============================================================
   GENIUS ENGINE
   ============================================================ */
function initGeniusIdentify() {
  injectComposerStyles();
  const textArea = document.getElementById('textInput');
  if (!textArea || document.getElementById('geniusIdentifyBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'geniusIdentifyBtn'; btn.type = 'button';
  btn.innerHTML = `Identify Song`;
  textArea.parentNode.insertBefore(btn, textArea.nextSibling);
  btn.onclick = () => {
    const lyric = textArea.value.trim();
    if (lyric.length < 5) { showToast('Type a lyric first'); return; }
    runGeniusSearch(lyric);
  };
  textArea.addEventListener('input', () => {
    clearTimeout(geniusTimer);
    const val = textArea.value.trim();
    const songFilled = document.getElementById('songInput')?.value.trim();
    if (val.length >= 20 && !songFilled) {
      btn.classList.add('active');
      geniusTimer = setTimeout(() => {
        if (val === lastGeniusQuery) return;
        runGeniusSearch(val);
      }, 1200);
    } else {
      btn.classList.remove('active');
    }
  });
}

async function runGeniusSearch(query) {
  const btn = document.getElementById('geniusIdentifyBtn');
  lastGeniusQuery = query;
  if (btn) { btn.innerHTML = `<span class="m-spinner"></span> Searching…`; btn.disabled = true; }
  document.getElementById('geniusResultsList')?.remove();
  try {
    const res  = await fetch(`/api/genius?lyric=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (btn) { btn.innerHTML = `Identify Song`; btn.disabled = false; }
    if (!res.ok || !data.results?.length) {
      if (query.length > 20) showToast('No song found — try a different line');
      return;
    }
    renderGeniusResults(data.results);
  } catch (err) {
    if (btn) { btn.innerHTML = `Identify Song`; btn.disabled = false; }
  }
}

function renderGeniusResults(results) {
  document.getElementById('geniusResultsList')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'geniusResultsList';
  const label = document.createElement('div');
  label.className = 'genius-section-label';
  label.textContent = 'Select the right song';
  wrap.appendChild(label);
  const list = document.createElement('div');
  list.className = 'genius-results-list';
  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'genius-result-card';
    const songName   = decodeHTML(r.song);
    const artistName = decodeHTML(r.artist);
    card.innerHTML = `
      ${r.artwork ? `<img src="${r.artwork}" class="genius-art" alt=""/>` : `<div class="genius-art"></div>`}
      <div class="genius-info">
        <div class="genius-song">${songName}</div>
        <div class="genius-artist">${artistName}</div>
      </div>
      <span class="genius-use-tag">Use</span>
    `;
    card.onclick = () => selectGeniusResult({ ...r, song: songName, artist: artistName }, card);
    list.appendChild(card);
  });
  wrap.appendChild(list);
  document.getElementById('geniusIdentifyBtn')?.parentNode?.insertBefore(
    wrap, document.getElementById('geniusIdentifyBtn').nextSibling
  );
}

function selectGeniusResult(result, card) {
  document.querySelectorAll('.genius-result-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  card.querySelector('.genius-use-tag').textContent = 'Selected';
  geniusResult = result;
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   songEl.value   = result.song;
  if (artistEl) artistEl.value = result.artist;
  if (currentMode !== 'share') document.querySelector('[data-mode="share"]')?.click();
  clearYoutubePreview();
  fetchYoutubeData(result.song, result.artist);
  setTimeout(() => { document.getElementById('geniusResultsList')?.remove(); }, 1000);
}

/* ============================================================
   YOUTUBE ENGINE
   ============================================================ */
function initYoutubeAutofetch() {
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (!songEl || !artistEl) return;

  if (!songEl.parentElement.classList.contains('song-input-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'song-input-wrap';
    songEl.parentNode.insertBefore(wrap, songEl);
    wrap.appendChild(songEl);
  }

  songEl.addEventListener('input', () => {
    clearTimeout(ytSuggestTimer);
    clearTimeout(ytFetchTimer);
    closeAutocomplete();
    const val = songEl.value.trim();
    if (val.length < 2) { clearYoutubePreview(); return; }
    ytSuggestTimer = setTimeout(() => fetchYoutubeSuggestions(val), 350);
  });

  songEl.addEventListener('blur', () => setTimeout(closeAutocomplete, 180));

  artistEl.addEventListener('input', () => {
    clearTimeout(ytFetchTimer);
    const song   = songEl.value.trim();
    const artist = artistEl.value.trim();
    if (song.length > 1 && artist.length > 1) {
      ytFetchTimer = setTimeout(() => fetchYoutubeData(song, artist), 700);
    }
  });
}

async function fetchYoutubeSuggestions(query) {
  try {
    const res  = await fetch(`/api/youtube?suggest=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok || !data.suggestions?.length) return;
    renderAutocomplete(data.suggestions);
  } catch (_) {}
}

function renderAutocomplete(suggestions) {
  closeAutocomplete();
  const songEl = document.getElementById('songInput');
  if (!songEl) return;
  const drop = document.createElement('div');
  drop.id = 'ytAutocomplete';
  drop.className = 'yt-autocomplete';
  suggestions.slice(0, 4).forEach(s => {
    const item = document.createElement('div');
    item.className = 'yt-ac-item';
    item.innerHTML = `
      ${s.thumbnail ? `<img src="${s.thumbnail}" class="yt-ac-thumb" alt=""/>` : `<div class="yt-ac-thumb"></div>`}
      <div style="flex:1;min-width:0">
        <div class="yt-ac-song">${decodeHTML(s.song)}</div>
        <div class="yt-ac-artist">${decodeHTML(s.artist)}</div>
      </div>
    `;
    item.onmousedown = (e) => { e.preventDefault(); selectAutocomplete(s); };
    drop.appendChild(item);
  });
  songEl.parentElement.appendChild(drop);
}

function selectAutocomplete(s) {
  closeAutocomplete();
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   songEl.value   = decodeHTML(s.song);
  if (artistEl) artistEl.value = decodeHTML(s.artist);
  clearYoutubePreview();
  fetchYoutubeData(s.song, s.artist);
}

function closeAutocomplete() { document.getElementById('ytAutocomplete')?.remove(); }

async function fetchYoutubeData(song, artist) {
  const cleanSong   = song.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*feat\..*$/i, '').replace(/\s*ft\..*$/i, '').trim();
  showYtLoading();
  youtubeData = null;
  try {
    const res  = await fetch(`/api/youtube?song=${encodeURIComponent(cleanSong)}&artist=${encodeURIComponent(cleanArtist)}`);
    const data = await res.json();
    if (!res.ok || data.error || (!data.videoId && !data.thumbnail)) {
      clearYoutubePreview(); return;
    }
    youtubeData = data;
    renderYtCard(data);
  } catch (_) { clearYoutubePreview(); }
}

function showYtLoading() {
  clearYoutubePreview();
  const card = document.createElement('div');
  card.id = 'youtubePreview'; card.className = 'yt-card';
  card.innerHTML = `<div class="yt-loading"><span class="m-spinner"></span>Looking up on YouTube, Deezer, Apple Music…</div>`;
  insertAfterArtist(card);
}

function renderYtCard(data) {
  clearYoutubePreview();
  const source = data.source || 'youtube';
  const links = [];
  if (data.videoId && data.youtubeUrl)
    links.push(`<a href="${data.youtubeUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-yt">YouTube</a>`);
  else if (data.youtubeUrl)
    links.push(`<a href="${data.youtubeUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-yt">YouTube</a>`);
  if (data.deezerUrl)
    links.push(`<a href="${data.deezerUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-dz">Deezer</a>`);
  if (data.itunesUrl)
    links.push(`<a href="${data.itunesUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-it">Apple Music</a>`);

  const sourceBadgeCls = source === 'youtube' ? 'yt-found-yt' : source === 'deezer' ? 'yt-found-dz' : 'yt-found-it';
  const thumb = data.thumbnail || data.thumbnailSm;

  const card = document.createElement('div');
  card.id = 'youtubePreview'; card.className = 'yt-card';
  card.innerHTML = `
    <div class="yt-card-inner">
      ${thumb ? `<div class="yt-thumb-wrap"><img src="${thumb}" class="yt-thumb" alt="${decodeHTML(data.title||'')}"/></div>` : ''}
      <div class="yt-info">
        <div class="yt-title">${decodeHTML(data.title || '')}</div>
        <div class="yt-channel">${decodeHTML(data.channel || data.collectionName || '')}</div>
        ${links.length ? `<div class="yt-links-row">${links.join('')}</div>` : ''}
      </div>
      <span class="yt-found-tag ${sourceBadgeCls}">Found</span>
    </div>
  `;
  insertAfterArtist(card);
  const ytLink = document.getElementById('youtubeLink');
  if (ytLink && !ytLink.value && data.videoId && data.youtubeUrl) ytLink.value = data.youtubeUrl;
}

function insertAfterArtist(el) {
  const artistEl = document.getElementById('artistInput');
  artistEl?.parentNode?.insertBefore(el, artistEl.nextSibling);
}

function clearYoutubePreview() {
  youtubeData = null;
  document.getElementById('youtubePreview')?.remove();
}

/* ============================================================
   COMPOSER INIT
   v5.7: All postcard/listenPostcard/closePostcard refs are
         null-guarded — postcard modal removed in concept-v2.
   ============================================================ */
function initComposer() {
  injectComposerStyles();
  textInput.oninput = () => { charCount.textContent = textInput.value.length; };

  modeBtns.forEach(btn => {
    btn.onclick = () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      shareInputs.classList.remove('show');
      guessInputs.classList.remove('show');
      discoverInputs.classList.remove('show');
      streamingSection.style.display = currentMode === 'discover' ? 'none' : 'block';
      if (currentMode === 'share')    shareInputs.classList.add('show');
      if (currentMode === 'guess')    guessInputs.classList.add('show');
      if (currentMode === 'discover') discoverInputs.classList.add('show');
      clearYoutubePreview(); closeAutocomplete();
    };
  });

  document.querySelectorAll('.emotion-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEmotion = btn.dataset.emotion;
    };
  });

  if (!document.getElementById('postAndCreateBtn')) {
    const pacBtn = document.createElement('button');
    pacBtn.id        = 'postAndCreateBtn';
    pacBtn.type      = 'button';
    pacBtn.innerHTML = 'Post &amp; Create Visual';
    pacBtn.onclick   = () => submitPost(true);

    const justPostBtn = document.createElement('button');
    justPostBtn.id        = 'justPostLink';
    justPostBtn.type      = 'button';
    justPostBtn.textContent = 'or just post without creating';
    justPostBtn.onclick   = () => submitPost(false);

    const parent = postBtn.parentNode;
    parent.insertBefore(pacBtn, postBtn);
    parent.insertBefore(justPostBtn, postBtn);
    postBtn.style.display = 'none';
  }

  initGeniusIdentify();
  initYoutubeAutofetch();

  // Guess / Discover / Listen / Analytics — these modals still exist
  const submitGuessEl    = document.getElementById('submitGuess');
  const submitDiscoverEl = document.getElementById('submitDiscover');
  const closeGuessEl     = document.getElementById('closeGuess');
  const closeDiscoverEl  = document.getElementById('closeDiscover');
  const closeListenEl    = document.getElementById('closeListen');
  const closeAnalyticsEl = document.getElementById('closeAnalytics');

  if (submitGuessEl)    submitGuessEl.onclick    = submitGuess;
  if (submitDiscoverEl) submitDiscoverEl.onclick = submitDiscover;
  if (closeGuessEl)     closeGuessEl.onclick     = () => { closeModal(guessModal); currentGuessAttempts = 0; };
  if (closeDiscoverEl)  closeDiscoverEl.onclick  = () => closeModal(discoverModal);
  if (closeListenEl)    closeListenEl.onclick    = () => closeModal(listenModal);

  // analyticsBtn and closeAnalytics — postcard is gone so just close analytics
  if (analyticsBtn)     analyticsBtn.onclick     = openAnalytics;
  if (closeAnalyticsEl) closeAnalyticsEl.onclick = () => closeModal(analyticsModal);

  // These are null in concept-v2 (postcard removed) — guarded safely
  if (listenPostcard) {
    listenPostcard.onclick = () => {
      const idx = posts.findIndex(p => p.id === currentPost?.id);
      if (idx !== -1) window.openListen(idx);
    };
  }
  const closePostcardEl = document.getElementById('closePostcard');
  if (closePostcardEl) closePostcardEl.onclick = () => closeModal(postcardModal);
}

/* ============================================================
   POST SUBMISSION
   ============================================================ */
async function submitPost(openChooser = true) {
  const pacBtn      = document.getElementById('postAndCreateBtn');
  const justPostBtn = document.getElementById('justPostLink');
  if (pacBtn?.disabled) return;

  let text = textInput.value.trim();
  if (!text)            { showToast('Add a lyric first'); return; }
  if (!selectedEmotion) { showToast('Pick an emotion'); return; }

  if (containsBannedWord(text)) {
    text = censorText(text);
    textInput.value = text;
    charCount.textContent = text.length;
    showToast('Some words were adjusted for community guidelines');
  }

  const savedYtMeta = youtubeData ? {
    videoId:     youtubeData.videoId     || null,
    title:       decodeHTML(youtubeData.title   || ''),
    thumbnail:   youtubeData.thumbnail   || null,
    thumbnailSm: youtubeData.thumbnailSm || youtubeData.thumbnail || null,
    channel:     decodeHTML(youtubeData.channel || ''),
    youtubeUrl:  youtubeData.youtubeUrl  || null,
    embedUrl:    youtubeData.embedUrl    || null,
  } : null;

  let post = {
    text, emotion: selectedEmotion, mode: currentMode,
    community: selectedEmotion, status: 'active', flagCount: 0,
    knowledge: { song: 'Unknown Song', artist: 'Unknown Artist' },
    guessConfig: null,
    youtubeMeta: savedYtMeta,
    links: currentMode !== 'discover' ? {
      spotify:    spotifyLink?.value.trim()    || null,
      apple:      appleLink?.value.trim()      || null,
      youtube:    youtubeData?.youtubeUrl      || youtubeLink?.value.trim() || null,
      soundcloud: soundcloudLink?.value.trim() || null,
    } : null,
    authorId:  userId,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now()
  };

  try {
    if (currentMode === 'share') {
      if (!songInput.value.trim() || !artistInput.value.trim())
        throw new Error('Add the song title and artist');
      post.knowledge = {
        song:   decodeHTML(songInput.value.trim()),
        artist: decodeHTML(artistInput.value.trim())
      };
    }
    if (currentMode === 'guess') {
      const doSong = guessSongCheck.checked, doArtist = guessArtistCheck.checked;
      if (!doSong && !doArtist) throw new Error('Choose at least one thing to guess');
      if (doSong   && !guessSongAnswer.value.trim())   throw new Error('Enter the correct song title');
      if (doArtist && !guessArtistAnswer.value.trim()) throw new Error('Enter the correct artist');
      post.knowledge   = { song: guessSongAnswer.value.trim(), artist: guessArtistAnswer.value.trim(), hidden: true };
      post.guessConfig = { guessSong: doSong, guessArtist: doArtist };
    }
    if (currentMode === 'discover') {
      post.knowledge = {
        song:   discoverSongInput.value.trim()   || 'Unknown Song',
        artist: discoverArtistInput.value.trim() || 'Unknown Artist'
      };
    }
  } catch (err) { showToast(err.message); return; }

  if (pacBtn)      { pacBtn.disabled = true;      pacBtn.innerHTML = '<span class="m-spinner"></span> Posting…'; }
  if (justPostBtn) { justPostBtn.disabled = true; }

  try {
    if (isFirebaseEnabled) {
      const ref = await postsRef.push(post);
      await analyticsRef.child(ref.key).set({ views: 0, guesses: [], helps: [] });

      if (!post.youtubeMeta
          && post.knowledge.song   !== 'Unknown Song'
          && post.knowledge.artist !== 'Unknown Artist'
          && typeof fetchAndSaveYoutubeMeta === 'function') {
        fetchAndSaveYoutubeMeta(ref.key, post.knowledge.song, post.knowledge.artist).catch(() => {});
      }

      if (openChooser) {
        currentPost = { ...post, id: ref.key };
      }
    }

    newPostsAvailable = false;
    renderFeed();
    resetComposer();
    closeModal(composer);

    if (openChooser) {
      setTimeout(() => {
        showToast('Posted — now make it visual');
        openStudioChooser();
      }, 120);
    } else {
      showToast('Dropped.');
    }

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong. Try again.');
  } finally {
    if (pacBtn)      { pacBtn.disabled = false;      pacBtn.innerHTML = 'Post &amp; Create Visual'; }
    if (justPostBtn) { justPostBtn.disabled = false; }
    if (postBtn)     { postBtn.disabled = false; }
  }
}

function resetComposer() {
  textInput.value = ''; songInput.value = ''; artistInput.value = '';
  guessSongAnswer.value = ''; guessArtistAnswer.value = '';
  discoverSongInput.value = ''; discoverArtistInput.value = '';
  if (spotifyLink)    spotifyLink.value    = '';
  if (appleLink)      appleLink.value      = '';
  if (youtubeLink)    youtubeLink.value    = '';
  if (soundcloudLink) soundcloudLink.value = '';
  charCount.textContent = '0';
  selectedEmotion = null; geniusResult = null; lastGeniusQuery = '';
  clearYoutubePreview(); closeAutocomplete();
  document.getElementById('geniusResultsList')?.remove();
  document.getElementById('geniusIdentifyBtn')?.classList.remove('active');
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
  modeBtns.forEach((b,i) => b.classList.toggle('active', i===0));
  currentMode = 'share';
  shareInputs.classList.add('show');
  guessInputs.classList.remove('show');
  discoverInputs.classList.remove('show');
  streamingSection.style.display = 'block';
  guessSongCheck.checked = true; guessArtistCheck.checked = true;
  const iw = document.getElementById('inspireWrap');
  const is = document.getElementById('inspireSuggestions');
  if (iw) iw.style.display = 'none';
  if (is) { is.innerHTML = ''; is.style.display = 'none'; }
}

/* ── Listen ── */
window.openListen = function(index) {
  currentPost = posts[index];
  if (!currentPost?.links) { showToast('No streaming links'); return; }
  const ll = document.getElementById('listenLinks');
  ll.innerHTML = '';
  let has = false;
  [['Spotify','spotify'],['Apple Music','apple'],['YouTube','youtube'],['SoundCloud','soundcloud']]
    .forEach(([name,key]) => {
      if (currentPost.links[key]) {
        has = true;
        const a = document.createElement('a');
        a.className='listen-link'; a.href=currentPost.links[key];
        a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=name;
        ll.appendChild(a);
      }
    });
  if (!has) { showToast('No streaming links available'); return; }
  openModal(listenModal);
};

/* ── Guess ── */
window.openGuess = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  currentGuessAttempts = 0;
  document.getElementById('guessLyric').textContent      = currentPost.text;
  document.getElementById('guessSongInput').value        = '';
  document.getElementById('guessArtistInput').value      = '';
  document.getElementById('guessResult').className       = 'result-msg hidden';
  document.getElementById('guessLinksSection').className = 'guess-links hidden';
  document.getElementById('guessInputFields').style.display = '';
  document.getElementById('submitGuess').style.display      = '';
  document.getElementById('revealAnswer').style.display     = 'none';
  const doSong=currentPost.guessConfig?.guessSong??true, doArtist=currentPost.guessConfig?.guessArtist??true;
  document.getElementById('guessSongInput').style.display   = doSong   ? 'block':'none';
  document.getElementById('guessArtistInput').style.display = doArtist ? 'block':'none';
  const what=[]; if(doSong)what.push('song'); if(doArtist)what.push('artist');
  document.getElementById('guessHint').textContent = `${MAX_GUESS_ATTEMPTS} attempts to name the ${what.join(' and ')}.`;
  openModal(guessModal);
};

function submitGuess() {
  if (!currentPost) return;
  currentGuessAttempts++;
  const k=currentPost.knowledge||{};
  const doSong=currentPost.guessConfig?.guessSong??true, doArtist=currentPost.guessConfig?.guessArtist??true;
  const gs=document.getElementById('guessSongInput').value.trim().toLowerCase();
  const ga=document.getElementById('guessArtistInput').value.trim().toLowerCase();
  const as=(k.song||'').toLowerCase(), aa=(k.artist||'').toLowerCase();
  const songOk  =!doSong  ||(gs&&(gs===as||gs.includes(as)||as.includes(gs)));
  const artistOk=!doArtist||(ga&&(ga===aa||ga.includes(aa)||aa.includes(ga)));
  const correct =songOk&&artistOk;
  if (isFirebaseEnabled)
    analyticsRef.child(currentPost.id).child('guesses').push({song:gs||null,artist:ga||null,correct,timestamp:Date.now()});
  const resultEl=document.getElementById('guessResult');
  resultEl.classList.remove('hidden','result-success','result-error','result-partial');
  if (correct) {
    resultEl.className='result-msg result-success';
    resultEl.innerHTML=`You got it — "${k.song}" by ${k.artist}`;
    const meta=currentPost.youtubeMeta;
    if(meta?.thumbnail) resultEl.innerHTML+=`<br><img src="${meta.thumbnail}" style="width:100%;border-radius:8px;margin-top:8px;object-fit:cover" alt=""/>`;
    document.getElementById('submitGuess').style.display='none';
    document.getElementById('guessInputFields').style.display='none';
    if (currentPost.links) {
      const ll=document.getElementById('guessLinksSection');
      let html='<div class="guess-links-title">Listen</div>';
      if(currentPost.links.spotify)   html+=`<a href="${currentPost.links.spotify}"   target="_blank" class="guess-link">Spotify</a>`;
      if(currentPost.links.apple)     html+=`<a href="${currentPost.links.apple}"     target="_blank" class="guess-link">Apple Music</a>`;
      if(currentPost.links.youtube)   html+=`<a href="${currentPost.links.youtube}"   target="_blank" class="guess-link">YouTube</a>`;
      if(currentPost.links.soundcloud)html+=`<a href="${currentPost.links.soundcloud}"target="_blank" class="guess-link">SoundCloud</a>`;
      ll.innerHTML=html; ll.classList.remove('hidden');
    }
    return;
  }
  const left=MAX_GUESS_ATTEMPTS-currentGuessAttempts;
  if (left<=0) {
    resultEl.className='result-msg result-error';
    resultEl.innerHTML=`It was: "${k.song}" by ${k.artist}`;
    document.getElementById('submitGuess').style.display='none';
    document.getElementById('guessInputFields').style.display='none';
    return;
  }
  const ps=doSong&&gs&&(gs===as||gs.includes(as)||as.includes(gs));
  const pa=doArtist&&ga&&(ga===aa||ga.includes(aa)||aa.includes(ga));
  resultEl.className=`result-msg ${(ps||pa)?'result-partial':'result-error'}`;
  let msg=(ps||pa)?'Partially right — ':'Not quite — ';
  if(doSong)  msg+=`Song: ${ps?'correct':'wrong'} `;
  if(doArtist)msg+=`Artist: ${pa?'correct':'wrong'} `;
  msg+=`(${left} left)`;
  resultEl.innerHTML=msg;
  document.getElementById('guessSongInput').value='';
  document.getElementById('guessArtistInput').value='';
}

/* ── Discover ── */
window.openDiscover = function(index) {
  currentPost=posts[index]; if(!currentPost)return;
  trackView(currentPost.id);
  ['discoverLyric','discoverSongAnswer','discoverArtistAnswer',
   'discoverSpotifyLink','discoverAppleLink','discoverYoutubeLink','discoverSoundcloudLink']
    .forEach(id=>{
      const el=document.getElementById(id);
      if(el){id==='discoverLyric'?el.textContent=currentPost.text:el.value='';}
    });
  openModal(discoverModal);
};

function submitDiscover() {
  const song  =document.getElementById('discoverSongAnswer').value.trim();
  const artist=document.getElementById('discoverArtistAnswer').value.trim();
  if(!song||!artist){showToast('Enter both song and artist');return;}
  const helpData={
    song,artist,
    links:{
      spotify:   document.getElementById('discoverSpotifyLink').value.trim()||null,
      apple:     document.getElementById('discoverAppleLink').value.trim()||null,
      youtube:   document.getElementById('discoverYoutubeLink').value.trim()||null,
      soundcloud:document.getElementById('discoverSoundcloudLink').value.trim()||null,
    },
    timestamp:Date.now()
  };
  if(isFirebaseEnabled)analyticsRef.child(currentPost.id).child('helps').push(helpData);
  showToast('Thanks for helping identify it'); closeModal(discoverModal);
}

/* ── Analytics ── */
function openAnalytics() {
  if(!currentPost)return;
  const an=postAnalytics[currentPost.id]||{views:0};
  const guesses=Object.values(an.guesses||{});
  const helps  =Object.values(an.helps  ||{});
  const body   =document.getElementById('analyticsBody');
  let html=`<div class="analytics-grid">
    <div class="stat-card"><div class="stat-num">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if(currentPost.mode==='guess')   html+=`<div class="stat-card"><div class="stat-num">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if(currentPost.mode==='discover')html+=`<div class="stat-card"><div class="stat-num">${helps.length}</div><div class="stat-label">Identifications</div></div>`;
  html+='</div>';
  body.innerHTML=html;
  if(currentPost.mode==='guess'&&guesses.length){
    let sec='<div class="activity-section"><h4>Guesses</h4><div class="activity-list">';
    guesses.forEach(g=>{
      const gSong   = g.song   ? 'Song: '+g.song   : '';
      const gArtist = g.artist ? (g.song?' · ':'')+'Artist: '+g.artist : '';
      sec+=`<div class="activity-item ${g.correct?'correct':'incorrect'}">
        <div class="activity-guess">${gSong}${gArtist}</div>
        <div class="activity-result ${g.correct?'correct':'incorrect'}">${g.correct?'Correct':'Incorrect'}</div>
        <div class="activity-time">${timeAgo(g.timestamp)}</div>
      </div>`;
    });
    body.innerHTML+=sec+'</div></div>';
  }
  if(currentPost.mode==='discover'&&helps.length){
    let sec='<div class="activity-section"><h4>Community Identifications</h4><div class="activity-list">';
    helps.forEach(h=>{
      const lp=[];
      if(h.links?.spotify)   lp.push(`<a href="${h.links.spotify}"   target="_blank" class="help-link">Spotify</a>`);
      if(h.links?.apple)     lp.push(`<a href="${h.links.apple}"     target="_blank" class="help-link">Apple</a>`);
      if(h.links?.youtube)   lp.push(`<a href="${h.links.youtube}"   target="_blank" class="help-link">YouTube</a>`);
      if(h.links?.soundcloud)lp.push(`<a href="${h.links.soundcloud}"target="_blank" class="help-link">SoundCloud</a>`);
      sec+=`<div class="activity-item">
        <div class="activity-guess"><strong>${h.song||'?'}</strong> — ${h.artist||'?'}</div>
        ${lp.length?`<div class="help-links-row">${lp.join('')}</div>`:''}
        <div class="activity-time">${timeAgo(h.timestamp)}</div>
      </div>`;
    });
    body.innerHTML+=sec+'</div></div>';
  }
  openModal(analyticsModal);
}
