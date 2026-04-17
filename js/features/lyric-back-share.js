/* ============================================================
   MARGO — js/features/lyric-back-share.js
   Lyric Back share sheet — Save Card · Copy Text · Copy Link
   Wired to echo-share-btn in echoes.js via openLyricBackShare()
   ============================================================ */

/* ── INJECT STYLES (once) ── */
(function _lbInjectStyles() {
  if (document.getElementById('lb-share-styles')) return;
  const s = document.createElement('style');
  s.id = 'lb-share-styles';
  s.textContent = `
    #lbBackdrop {
      position: fixed;
      inset: 0;
      z-index: 600;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: lbBackdropIn 220ms ease;
      padding: 0;
    }
    #lbBackdrop.lb-hidden { display: none !important; }
    @keyframes lbBackdropIn { from { opacity:0; } to { opacity:1; } }
    @media (min-width: 560px) {
      #lbBackdrop { align-items: center; padding: 24px; }
    }

    #lbSheet {
      width: 100%;
      max-width: 480px;
      background: #0F0E13;
      border: 1px solid rgba(255,255,255,0.07);
      border-bottom: none;
      border-radius: 24px 24px 0 0;
      overflow: hidden;
      animation: lbSheetUp 380ms cubic-bezier(0.16,1,0.3,1);
      max-height: 92dvh;
      overflow-y: auto;
      font-family: 'Lora', serif;
      color: #F4F1ED;
    }
    @media (min-width: 560px) {
      #lbSheet {
        border-radius: 24px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        animation: lbSheetFade 320ms cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes lbSheetUp   { from { transform:translateY(60px); opacity:0; } to { transform:translateY(0); opacity:1; } }
    @keyframes lbSheetFade { from { transform:translateY(16px) scale(0.98); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
    #lbSheet.lb-exit { animation: lbSheetDown 260ms cubic-bezier(0.4,0,1,1) forwards; }
    @keyframes lbSheetDown { to { transform:translateY(80px); opacity:0; } }

    .lb-handle {
      width: 36px; height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      margin: 12px auto 0;
      cursor: grab;
    }

    /* ── HEADER with top-left ghost logo ── */
    .lb-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 14px 16px 0;
    }
    .lb-header-left { display: flex; flex-direction: column; gap: 6px; }

    .lb-logo-lockup {
      display: flex;
      align-items: center;
      gap: 7px;
      opacity: 0.28;
    }
    .lb-logo-mark {
      width: 22px; height: 22px;
      flex-shrink: 0;
    }
    .lb-logo-wordmark {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 0.62rem;
      letter-spacing: 4px;
      color: #E8C547;
      text-transform: uppercase;
      line-height: 1;
    }

    .lb-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.58rem;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 50px;
      background: rgba(232,197,71,0.08);
      border: 1px solid rgba(232,197,71,0.28);
      color: #E8C547;
    }
    .lb-badge-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: #E8C547;
      opacity: 0.8;
    }

    .lb-close {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      color: #9A98A4;
      width: 32px; height: 32px;
      border-radius: 50%;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 150ms;
      flex-shrink: 0;
    }
    .lb-close:hover { background: rgba(255,255,255,0.1); color: #F4F1ED; }

    /* ── PREVIEW STRIP ── */
    .lb-preview-strip {
      margin: 14px 16px 0;
      background: #161420;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 14px;
    }
    .lb-preview-row { display: flex; flex-direction: column; gap: 8px; }
    .lb-preview-original, .lb-preview-reply { display: flex; flex-direction: column; gap: 2px; }
    .lb-preview-lyric { font-size: 0.82rem; font-style: italic; color: #F4F1ED; line-height: 1.4; }
    .lb-preview-song { font-size: 0.68rem; color: #9A98A4; }
    .lb-preview-arrow {
      font-size: 0.58rem; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; color: #E8C547; opacity: 0.7;
    }

    /* ── TABS ── */
    .lb-tabs { display: flex; gap: 8px; padding: 14px 16px 0; }
    .lb-tab {
      flex: 1; padding: 10px 8px;
      background: #161420;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      color: #555360;
      font-family: 'Lora', serif;
      font-size: 0.58rem; font-weight: 600;
      letter-spacing: 0.5px; text-transform: uppercase; text-align: center;
      cursor: pointer; transition: all 150ms;
      min-height: 44px;
      display: flex; align-items: center; justify-content: center;
    }
    .lb-tab:hover { color: #9A98A4; border-color: rgba(255,255,255,0.12); }
    .lb-tab.lb-active {
      background: rgba(232,197,71,0.08);
      border-color: rgba(232,197,71,0.28);
      color: #E8C547;
    }

    /* ── SCREENS ── */
    .lb-screen { display: none; padding: 16px; }
    .lb-screen.lb-visible { display: block; }

    .lb-size-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; margin-bottom: 16px;
    }
    .lb-size-option {
      background: #161420;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 14px 12px;
      display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: all 150ms; min-height: 44px;
    }
    .lb-size-option:hover { border-color: rgba(255,255,255,0.12); }
    .lb-size-option.lb-selected {
      background: rgba(232,197,71,0.08);
      border-color: rgba(232,197,71,0.28);
    }
    .lb-size-thumb {
      background: #1E1B2A; border-radius: 4px; flex-shrink: 0;
    }
    .lb-size-thumb.lb-vertical { width: 16px; height: 26px; }
    .lb-size-thumb.lb-square  { width: 22px; height: 22px; }
    .lb-size-thumb.lb-landscape { width: 28px; height: 16px; }
    .lb-size-info { flex: 1; }
    .lb-size-name { font-size: 0.82rem; font-weight: 600; color: #F4F1ED; }
    .lb-size-desc { font-size: 0.6rem; color: #555360; margin-top: 2px; }
    .lb-size-dot {
      width: 8px; height: 8px; border-radius: 50%;
      border: 1.5px solid #555360; flex-shrink: 0; transition: all 150ms;
    }
    .lb-size-dot.lb-on { background: #E8C547; border-color: #E8C547; }

    .lb-copy-preview {
      background: #161420;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 14px;
      margin-bottom: 16px;
      font-size: 0.82rem; line-height: 1.6; color: #9A98A4;
    }
    .lb-copy-preview .lbcp-orig  { color: #F4F1ED; font-style: italic; }
    .lb-copy-preview .lbcp-arrow { color: #E8C547; font-size: 0.7rem; font-weight: 600; margin: 6px 0; }
    .lb-copy-preview .lbcp-reply { color: #F4F1ED; font-style: italic; }
    .lb-copy-preview .lbcp-foot  { color: #555360; font-size: 0.7rem; margin-top: 8px; }

    .lb-link-box {
      background: #161420;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 14px; margin-bottom: 16px;
    }
    .lb-link-label { font-size: 0.58rem; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #555360; margin-bottom: 8px; }
    .lb-link-url   { font-size: 0.82rem; color: #E8C547; font-weight: 600; word-break: break-all; }
    .lb-link-note  { font-size: 0.68rem; color: #555360; margin-top: 8px; }

    .lb-cta {
      width: 100%; padding: 15px;
      background: #E8C547; border: none; border-radius: 16px;
      color: #07060A;
      font-family: 'Lora', serif;
      font-size: 0.7rem; font-weight: 700;
      letter-spacing: 1px; text-transform: uppercase;
      cursor: pointer; transition: all 220ms cubic-bezier(0.16,1,0.3,1);
      min-height: 52px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .lb-cta:hover   { background: #F5D46A; transform: translateY(-1px); }
    .lb-cta:active  { transform: scale(0.98); }
    .lb-cta:disabled { opacity: 0.5; cursor: wait; transform: none; }

    .lb-bottom-spacer { height: 24px; }
    #lbCardCanvas { display: none; }

    /* ── CARD STYLE SELECTOR ── */
    .lb-style-label {
      font-size: 0.58rem; font-weight: 600; letter-spacing: 2px;
      text-transform: uppercase; color: #555360; padding: 14px 16px 8px;
    }
    .lb-style-row {
      display: flex; gap: 8px; padding: 0 16px; margin-bottom: 14px;
    }
    .lb-style-btn {
      flex: 1; min-height: 52px; border-radius: 12px;
      border: 1.5px solid rgba(255,255,255,0.07);
      cursor: pointer; transition: all 150ms;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; padding: 10px 8px; font-family: 'Lora', serif;
    }
    .lb-style-dark  { background: #07060A; }
    .lb-style-convo { background: #0F0E13; }
    .lb-style-name {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
    }
    .lb-style-sub {
      font-size: 0.55rem; font-weight: 500; letter-spacing: 0.5px; opacity: 0.55;
    }
    .lb-style-dark  .lb-style-name { color: #E8C547; }
    .lb-style-dark  .lb-style-sub  { color: #E8C547; }
    .lb-style-convo .lb-style-name { color: #9A98A4; }
    .lb-style-convo .lb-style-sub  { color: #9A98A4; }
    .lb-style-btn.lb-style-selected { border-color: #E8C547; box-shadow: 0 0 0 1px #E8C547; }

    #lbToast {
      position: fixed;
      bottom: 32px; left: 50%;
      transform: translateX(-50%);
      background: #1E1B2A;
      border: 1px solid rgba(232,197,71,0.28);
      color: #E8C547;
      font-family: 'Lora', serif;
      font-size: 0.7rem; font-weight: 600;
      padding: 10px 20px; border-radius: 50px;
      letter-spacing: 0.5px;
      z-index: 9999; pointer-events: none;
      opacity: 0; transition: opacity 220ms;
    }
    #lbToast.lb-show { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration:1ms !important; transition-duration:1ms !important; }
    }
  `;
  document.head.appendChild(s);
})();

/* ── INJECT HTML (once) ── */
(function _lbInjectHTML() {
  if (document.getElementById('lbBackdrop')) return;

  const logoSVG = `
    <svg class="lb-logo-mark" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- M waveform -->
      <polyline
        points="19,55 19,27 31,44 40,28 49,44 61,27 61,55"
        stroke="#E8C547" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
        fill="none"
      />
      <!-- underline accent -->
      <line x1="28" y1="63" x2="52" y2="63" stroke="#E8C547" stroke-width="5" stroke-linecap="round"/>
    </svg>
  `;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="lbBackdrop" class="lb-hidden">
      <div id="lbSheet">
        <div class="lb-handle" id="lbHandle"></div>

        <div class="lb-header">
          <div class="lb-header-left">
            <div class="lb-logo-lockup">
              ${logoSVG}
              <span class="lb-logo-wordmark">Margo</span>
            </div>
            <div class="lb-badge">
              <span class="lb-badge-dot"></span>
              Lyric Back
            </div>
          </div>
          <button class="lb-close" id="lbCloseBtn" aria-label="Close">×</button>
        </div>

        <div class="lb-preview-strip">
          <div class="lb-preview-row">
            <div class="lb-preview-original">
              <div class="lb-preview-lyric" id="lbOrigLyric"></div>
              <div class="lb-preview-song"  id="lbOrigSong"></div>
            </div>
            <div class="lb-preview-arrow">↳ Lyric back:</div>
            <div class="lb-preview-reply">
              <div class="lb-preview-lyric" id="lbReplyLyric"></div>
              <div class="lb-preview-song"  id="lbReplySong"></div>
            </div>
          </div>
        </div>

        <div class="lb-tabs" id="lbTabs">
          <button class="lb-tab lb-active" data-tab="card">Save Card</button>
          <button class="lb-tab"           data-tab="copy">Copy Text</button>
          <button class="lb-tab"           data-tab="link">Copy Link</button>
        </div>

        <div class="lb-screen lb-visible" id="lb-screen-card">
          <div class="lb-style-label">Card Style</div>
          <div class="lb-style-row" id="lbStyleRow">
            <button class="lb-style-btn lb-style-dark lb-style-selected" data-theme="dark">
              <span class="lb-style-name">Card</span>
              <span class="lb-style-sub">Dark · editorial</span>
            </button>
            <button class="lb-style-btn lb-style-convo" data-theme="convo">
              <span class="lb-style-name">Convo</span>
              <span class="lb-style-sub">Chat bubbles</span>
            </button>
          </div>
          <div class="lb-size-grid">
            <div class="lb-size-option lb-selected" data-size="vertical">
              <div class="lb-size-thumb lb-vertical"></div>
              <div class="lb-size-info">
                <div class="lb-size-name">Vertical</div>
                <div class="lb-size-desc">TikTok · IG Story · Reels</div>
              </div>
              <div class="lb-size-dot lb-on"></div>
            </div>
            <div class="lb-size-option" data-size="square">
              <div class="lb-size-thumb lb-square"></div>
              <div class="lb-size-info">
                <div class="lb-size-name">Square</div>
                <div class="lb-size-desc">Twitter · Feed · Threads</div>
              </div>
              <div class="lb-size-dot"></div>
            </div>
            <div class="lb-size-option" data-size="landscape">
              <div class="lb-size-thumb lb-landscape"></div>
              <div class="lb-size-info">
                <div class="lb-size-name">Wide</div>
                <div class="lb-size-desc">YouTube · Twitter banner</div>
              </div>
              <div class="lb-size-dot"></div>
            </div>
          </div>
          <button class="lb-cta" id="lbBtnDownload">↓ Download Card</button>
        </div>

        <div class="lb-screen" id="lb-screen-copy">
          <div class="lb-copy-preview" id="lbCopyPreview"></div>
          <button class="lb-cta" id="lbBtnCopy">⎘ Copy to clipboard</button>
        </div>

        <div class="lb-screen" id="lb-screen-link">
          <div class="lb-link-box">
            <div class="lb-link-label">Shareable link</div>
            <div class="lb-link-url"  id="lbLinkUrl"></div>
            <div class="lb-link-note">Anyone who opens this sees the Lyric Back on Margo</div>
          </div>
          <button class="lb-cta" id="lbBtnLink">⎘ Copy link</button>
        </div>

        <div class="lb-bottom-spacer"></div>
      </div>
    </div>

    <canvas id="lbCardCanvas"></canvas>
    <div id="lbToast"></div>
  `);

  _lbBindEvents();
})();

/* ── STATE ── */
const _LB = { post1: null, post2: null, size: 'vertical', theme: 'dark' };

/* ── BIND EVENTS (once) ── */
function _lbBindEvents() {
  // Close
  document.getElementById('lbCloseBtn')
    .addEventListener('click', closeLyricBackShare);
  document.getElementById('lbBackdrop')
    .addEventListener('click', e => { if (e.target.id === 'lbBackdrop') closeLyricBackShare(); });

  // Tabs
  document.getElementById('lbTabs').addEventListener('click', e => {
    const btn = e.target.closest('.lb-tab');
    if (!btn) return;
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('lb-active'));
    btn.classList.add('lb-active');
    document.querySelectorAll('.lb-screen').forEach(s => s.classList.remove('lb-visible'));
    document.getElementById('lb-screen-' + btn.dataset.tab).classList.add('lb-visible');
  });

  // Card style selection (Dark / Convo)
  document.getElementById('lbStyleRow').addEventListener('click', e => {
    const btn = e.target.closest('.lb-style-btn');
    if (!btn) return;
    _LB.theme = btn.dataset.theme;
    document.querySelectorAll('.lb-style-btn').forEach(b => b.classList.remove('lb-style-selected'));
    btn.classList.add('lb-style-selected');
  });

  // Size selection
  document.querySelector('.lb-size-grid').addEventListener('click', e => {
    const opt = e.target.closest('.lb-size-option');
    if (!opt) return;
    _LB.size = opt.dataset.size;
    document.querySelectorAll('.lb-size-option').forEach(o => {
      o.classList.remove('lb-selected');
      o.querySelector('.lb-size-dot').classList.remove('lb-on');
    });
    opt.classList.add('lb-selected');
    opt.querySelector('.lb-size-dot').classList.add('lb-on');
  });

  // CTAs
  document.getElementById('lbBtnDownload').addEventListener('click', _lbDownloadCard);
  document.getElementById('lbBtnCopy').addEventListener('click', _lbCopyText);
  document.getElementById('lbBtnLink').addEventListener('click', _lbCopyLink);

  // Swipe to close
  _lbInitSwipe();
}

/* ── OPEN — called from echoes.js ── */
function openLyricBackShare(originalPost, echoPost) {
  // Normalise data shapes:
  // originalPost  → Margo post object  (.text / .knowledge.song / .knowledge.artist / .emotion)
  // echoPost      → echo object        (.lyric / .song / .artist / .emotion / .feeling)

  _LB.post1 = {
    text    : originalPost.text     || originalPost.lyric || '',
    song    : originalPost.knowledge?.song   || originalPost.song   || '',
    artist  : originalPost.knowledge?.artist || originalPost.artist || '',
    emotion : originalPost.emotion  || originalPost.feeling || '',
    username: originalPost.username || '',
    id      : originalPost.id       || ''
  };

  _LB.post2 = {
    text    : echoPost.lyric   || echoPost.text   || '',
    song    : echoPost.song    || echoPost.knowledge?.song   || '',
    artist  : echoPost.artist  || echoPost.knowledge?.artist || '',
    emotion : echoPost.emotion || echoPost.feeling || '',
    username: echoPost.username || '',
    id      : echoPost.id      || ''
  };

  _LB.size = 'vertical';
  _LB.theme = 'dark';

  const p1 = _LB.post1, p2 = _LB.post2;

  // Preview strip
  document.getElementById('lbOrigLyric').textContent  = '\u201C' + p1.text + '\u201D';
  document.getElementById('lbOrigSong').textContent   = p1.song + (p1.artist ? ' \u2014 ' + p1.artist : '');
  document.getElementById('lbReplyLyric').textContent = '\u201C' + p2.text + '\u201D';
  document.getElementById('lbReplySong').textContent  = p2.song + (p2.artist ? ' \u2014 ' + p2.artist : '');

  // Copy preview
  _lbBuildCopyPreview();

  // Link
  const _w1 = (p1.text || '').replace(/[^a-z0-9 ]/gi,'').trim().split(/\s+/).slice(0,4).join('-').toLowerCase();
  const _w2 = (p2.text || '').replace(/[^a-z0-9 ]/gi,'').trim().split(/\s+/).slice(0,4).join('-').toLowerCase();
  const slug = _w1 + '___' + _w2 + '___' + (p1.id || '') + '___' + (p2.id || '');
  document.getElementById('lbLinkUrl').textContent = 'trymargo.com/lyricback/' + slug;

  // Reset to card tab
  document.querySelectorAll('.lb-tab').forEach((t,i) => t.classList.toggle('lb-active', i===0));
  document.querySelectorAll('.lb-screen').forEach(s => s.classList.remove('lb-visible'));
  document.getElementById('lb-screen-card').classList.add('lb-visible');

  // Reset size selection
  document.querySelectorAll('.lb-size-option').forEach(o => {
    const isV = o.dataset.size === 'vertical';
    o.classList.toggle('lb-selected', isV);
    o.querySelector('.lb-size-dot').classList.toggle('lb-on', isV);
  });

  // Reset style selection to dark
  document.querySelectorAll('.lb-style-btn').forEach(b => {
    b.classList.toggle('lb-style-selected', b.dataset.theme === 'dark');
  });

  // Hide echo sheet if open
  const _echoBackdrop = document.getElementById('echoSheetBackdrop');
  if (_echoBackdrop) _echoBackdrop.style.visibility = 'hidden';

  // Show
  const backdrop = document.getElementById('lbBackdrop');
  backdrop.classList.remove('lb-hidden');
  document.body.style.overflow = 'hidden';
}

/* ── CLOSE ── */
function closeLyricBackShare() {
  const sheet   = document.getElementById('lbSheet');
  const backdrop = document.getElementById('lbBackdrop');
  sheet.classList.add('lb-exit');
  document.body.style.overflow = '';
  setTimeout(() => {
    backdrop.classList.add('lb-hidden');
    sheet.classList.remove('lb-exit');
    const _echoBackdrop = document.getElementById('echoSheetBackdrop');
    if (_echoBackdrop) _echoBackdrop.style.visibility = '';
  }, 260);
}

/* ── COPY PREVIEW ── */
function _lbBuildCopyPreview() {
  const p1 = _LB.post1, p2 = _LB.post2;
  const s1 = p1.song + (p1.artist ? ' \u2014 ' + p1.artist : '');
  const s2 = p2.song + (p2.artist ? ' \u2014 ' + p2.artist : '');
  document.getElementById('lbCopyPreview').innerHTML = `
    <div class="lbcp-orig">\u201C${_esc(p1.text)}\u201D</div>
    <div style="color:#9A98A4;font-size:0.7rem;margin-top:2px">${_esc(s1)}</div>
    <div class="lbcp-arrow">\u21B3 Lyric back:</div>
    <div class="lbcp-reply">\u201C${_esc(p2.text)}\u201D</div>
    <div style="color:#9A98A4;font-size:0.7rem;margin-top:2px">${_esc(s2)}</div>
    <div class="lbcp-foot">via MARGO \u00B7 trymargo.com</div>
  `;
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── COPY TEXT ── */
function _lbCopyText() {
  const p1 = _LB.post1, p2 = _LB.post2;
  const s1 = p1.song + (p1.artist ? ' \u2014 ' + p1.artist : '');
  const s2 = p2.song + (p2.artist ? ' \u2014 ' + p2.artist : '');
  const text = [
    '\u201C' + p1.text + '\u201D', s1, '',
    '\u21B3 Lyric back:',
    '\u201C' + p2.text + '\u201D', s2, '',
    'via MARGO \u00B7 trymargo.com'
  ].join('\n');
  navigator.clipboard.writeText(text)
    .then(()  => _lbToast('Copied to clipboard'))
    .catch(() => _lbToast('Copy failed \u2014 try again'));
}

/* ── COPY LINK ── */
function _lbCopyLink() {
  const url = 'https://' + document.getElementById('lbLinkUrl').textContent;
  navigator.clipboard.writeText(url)
    .then(()  => _lbToast('Link copied'))
    .catch(() => _lbToast('Copy failed \u2014 try again'));
}

/* ── FONT CACHE — wait only once ── */
let _lbFontsReady = false;
async function _lbWaitFonts() {
  if (_lbFontsReady) return;
  await document.fonts.ready;
  _lbFontsReady = true;
}

/* ── DOWNLOAD CARD ── */
async function _lbDownloadCard() {
  const btn = document.getElementById('lbBtnDownload');
  btn.disabled = true;
  btn.textContent = 'Generating\u2026';

  try {
    const W = _LB.size === 'landscape' ? 1920 : 1080, H = _LB.size === 'vertical' ? 1920 : 1080;
    // Render at 2× for crisp text — canvas pixels are physical, scale then export
    const SCALE = 2;
    const canvas = document.getElementById('lbCardCanvas');
    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    if (_LB.theme === 'convo') {
      await _lbDrawConvoCard(ctx, W, H, _LB.post1, _LB.post2);
    } else {
      await _lbDrawCard(ctx, W, H, _LB.post1, _LB.post2);
    }

    canvas.toBlob(blob => {
      if (!blob) { _lbToast('Could not generate card'); return; }
      const p1 = _LB.post1, p2 = _LB.post2;
      function lyricSlug(text) {
        return (text||'')
          .replace(/[^\w\s']/g, '')
          .trim()
          .split(/\s+/)
          .slice(0, 5)
          .join(' ');
      }
      const l1Slug    = lyricSlug(p1.text);
      const l2Slug    = lyricSlug(p2.text);
      const sizeLabel = _LB.size.charAt(0).toUpperCase() + _LB.size.slice(1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Margo_'+l1Slug+'_LyricBack_x_'+l2Slug+'_'+sizeLabel+'.png';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      _lbToast('Card saved \u2714');
    }, 'image/png');

  } catch(err) {
    console.error('[LB] Card error:', err);
    _lbToast('Failed \u2014 try again');
  } finally {
    btn.disabled = false;
    btn.textContent = '\u2193 Download Card';
  }
}

/* ── DRAW CARD — Dark editorial ── */
async function _lbDrawCard(ctx, W, H, p1, p2) {
  await _lbWaitFonts();
  const isV = H > W;
  const isL = W > H;
  const mid = W / 2;
  const pad = isL ? 100 : 80;

  // Palette
  const BG     = '#07060A';
  const GOLD   = '#E8C547';
  const TEXT   = '#F4F1ED';
  const TEXT2  = '#9A98A4';
  const BORDER = 'rgba(255,255,255,0.07)';
  const ACCENT = 'rgba(232,197,71,0.30)';
  const FTRTXT = 'rgba(232,197,71,0.42)';

  // Premium gradient background
  const bgGrad = ctx.createRadialGradient(W*0.5,H*0.38,0,W*0.5,H*0.38,W*0.85);
  bgGrad.addColorStop(0,'#16131F'); bgGrad.addColorStop(1,'#07060A');
  ctx.fillStyle=bgGrad; ctx.fillRect(0,0,W,H);
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.85);
  vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.38)');
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

  // Ghost logo
  const logoX = 76, logoY = isV ? 84 : 72;
  const markSize = isV ? 40 : (isL ? 34 : 36);
  const sc = markSize / 80;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = GOLD; ctx.lineWidth = 7*sc;
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(logoX+19*sc,logoY+55*sc); ctx.lineTo(logoX+19*sc,logoY+27*sc);
  ctx.lineTo(logoX+31*sc,logoY+44*sc); ctx.lineTo(logoX+40*sc,logoY+28*sc);
  ctx.lineTo(logoX+49*sc,logoY+44*sc); ctx.lineTo(logoX+61*sc,logoY+27*sc);
  ctx.lineTo(logoX+61*sc,logoY+55*sc); ctx.stroke();
  ctx.lineWidth=5*sc;
  ctx.beginPath();
  ctx.moveTo(logoX+28*sc,logoY+63*sc); ctx.lineTo(logoX+52*sc,logoY+63*sc); ctx.stroke();
  const wFS = isV ? 28 : 22;
  ctx.font='800 '+wFS+'px Syne, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle=GOLD; ctx.letterSpacing='4px';
  ctx.fillText('MARGO', logoX+markSize+14, logoY+markSize*0.44);
  ctx.restore();

  // Layout
  const topPad    = logoY + markSize + (isV ? 48 : 36);
  const bottomPad = isV ? 80 : 64;
  const footerY   = H - bottomPad;
  const contentH  = footerY - 24 - topPad;
  const sectionH  = contentH / 2;

  _lbDrawSection(ctx, W, pad, topPad, sectionH, p1, isV, isL, TEXT, TEXT2);

  // LYRIC BACK divider pill — solid gold fill
  const divY  = topPad + sectionH;
  const lbTxt = 'LYRIC BACK';
  const lbFS  = isV ? 22 : 17;
  ctx.font = '700 '+lbFS+'px Lora, serif';
  ctx.letterSpacing = '2px';
  const lbW = ctx.measureText(lbTxt).width + 52;
  const lbH = isV ? 46 : 36;
  const lbX = mid - lbW/2;

  // hairline rule
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pad,divY); ctx.lineTo(W-pad,divY); ctx.stroke();

  // solid pill — gold on dark
  ctx.globalAlpha=1;
  ctx.fillStyle=GOLD;
  _lbRoundRect(ctx,lbX,divY-lbH/2,lbW,lbH,lbH/2); ctx.fill();
  ctx.fillStyle='#07060A';
  ctx.font='700 '+lbFS+'px Lora, serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.letterSpacing='2px';
  ctx.fillText(lbTxt, mid, divY);

  // Post 2
  const p2StartY = divY + (isV?28:22);
  _lbDrawSection(ctx, W, pad, p2StartY, sectionH-(isV?28:22), p2, isV, isL, TEXT, TEXT2);

  // Footer
  ctx.strokeStyle='rgba(232,197,71,0.09)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pad,footerY-22); ctx.lineTo(W-pad,footerY-22); ctx.stroke();
  ctx.fillStyle=FTRTXT;
  ctx.font='400 '+(isV?26:20)+'px Lora, serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.letterSpacing='3px';
  ctx.fillText('trymargo.com', mid, footerY);
}

function _lbDrawSection(ctx, W, pad, startY, sectionH, post, isV, isL, TEXT, TEXT2) {
  const mid  = W/2;
  const lFS  = isV ? 68 : (isL ? 60 : 56);
  const sFS  = isV ? 28 : (isL ? 26 : 24);
  const aFS  = isV ? 24 : (isL ? 22 : 20);
  const maxW = W - pad*2 - 16;

  ctx.letterSpacing='0px';
  ctx.font='italic '+lFS+'px Lora, serif';
  const words=(post.text||'').split(' ');
  const lines=[]; let line='';
  for(const w of words){
    const t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}
    else line=t;
  }
  if(line)lines.push(line);

  const lineH    = lFS*1.38;
  const totalLyH = lines.length*lineH;
  const blockH   = totalLyH+sFS+aFS+52;
  const lyricStart=startY+(sectionH-blockH)/2;

  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=TEXT;
  ctx.font='italic '+lFS+'px Lora, serif';
  lines.forEach((l,i)=>ctx.fillText(l,mid,lyricStart+i*lineH));

  const ruleY=lyricStart+totalLyH+22;
  const ruleW=isV?80:60;
  ctx.strokeStyle='rgba(232,197,71,0.50)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(mid-ruleW/2,ruleY); ctx.lineTo(mid+ruleW/2,ruleY); ctx.stroke();

  const metaY=ruleY+26;
  ctx.letterSpacing='0.5px';
  ctx.font='600 '+sFS+'px Lora, serif';
  ctx.fillStyle=TEXT;
  ctx.fillText(post.song||'',mid,metaY);

  ctx.letterSpacing='0px';
  ctx.font='400 '+aFS+'px Lora, serif';
  ctx.fillStyle=TEXT2;
  ctx.fillText(post.artist||'',mid,metaY+sFS+12);
  ctx.letterSpacing='0px';
}

/* ── DRAW CONVO CARD — chat bubble layout ── */
async function _lbDrawConvoCard(ctx, W, H, p1, p2) {
  await _lbWaitFonts();
  const isV=H>W, isL=W>H;
  const pad=isV?80:(isL?100:80);
  const mid=W/2;

  // Premium gradient background
  const bgGrad2 = ctx.createRadialGradient(W*0.5,H*0.35,0,W*0.5,H*0.35,W*0.9);
  bgGrad2.addColorStop(0,'#1A1628'); bgGrad2.addColorStop(1,'#06050D');
  ctx.fillStyle=bgGrad2; ctx.fillRect(0,0,W,H);
  const vig2=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.9);
  vig2.addColorStop(0,'rgba(0,0,0,0)'); vig2.addColorStop(1,'rgba(0,0,0,0.45)');
  ctx.fillStyle=vig2; ctx.fillRect(0,0,W,H);

  // Ghost logo
  const logoX=76,logoY=isV?84:72;
  const markSize=isV?38:(isL?32:34);
  const sc=markSize/80;
  ctx.save();
  ctx.globalAlpha=0.18;
  ctx.strokeStyle='#E8C547'; ctx.lineWidth=7*sc;
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(logoX+19*sc,logoY+55*sc); ctx.lineTo(logoX+19*sc,logoY+27*sc);
  ctx.lineTo(logoX+31*sc,logoY+44*sc); ctx.lineTo(logoX+40*sc,logoY+28*sc);
  ctx.lineTo(logoX+49*sc,logoY+44*sc); ctx.lineTo(logoX+61*sc,logoY+27*sc);
  ctx.lineTo(logoX+61*sc,logoY+55*sc); ctx.stroke();
  ctx.lineWidth=5*sc;
  ctx.beginPath();
  ctx.moveTo(logoX+28*sc,logoY+63*sc); ctx.lineTo(logoX+52*sc,logoY+63*sc); ctx.stroke();
  const wFS=isV?28:22;
  ctx.font='800 '+wFS+'px Syne, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle='#E8C547'; ctx.letterSpacing='4px';
  ctx.fillText('MARGO',logoX+markSize+14,logoY+markSize*0.44);
  ctx.restore();

  const areaTop=logoY+markSize+(isV?56:44);
  const areaBot=H-(isV?100:80);
  const areaH=areaBot-areaTop;
  const maxBubW=Math.round((W-pad*2)*0.92);
  const lyricFS=isV?62:(isL?54:50);
  const songFS=isV?28:(isL?25:22);
  const artistFS=isV?23:20;
  const lineH=lyricFS*1.38;
  const maxTW=maxBubW-(isV?96:80);

  function wrapText(text,font){
    ctx.font=font; ctx.letterSpacing='0px';
    const ws=text.split(' '),ls=[]; let l='';
    for(const w of ws){
      const t=l?l+' '+w:w;
      if(ctx.measureText(t).width>maxTW&&l){ls.push(l);l=w;}else l=t;
    }
    if(l)ls.push(l); return ls;
  }

  const lyricFont='italic '+lyricFS+'px Lora, serif';
  const l1Lines=wrapText(p1.text||'',lyricFont);
  const l2Lines=wrapText(p2.text||'',lyricFont);
  const bPadV=isV?56:44, bPadH=isV?48:36;
  const metaGap=32;
  const metaH=songFS+artistFS+14+metaGap;
  const b1H=l1Lines.length*lineH+metaH+bPadV*2;
  const b2H=l2Lines.length*lineH+metaH+bPadV*2;
  const gap=isV?140:100;
  const totalH=b1H+b2H+gap;
  const startY=areaTop+(areaH-totalH)/2;

  // Bubble 1 — gold, left
  const b1X=pad, b1Y=startY;
  const b1W=Math.min(maxBubW,W-pad*2);
  ctx.fillStyle='#E8C547';
  _lbRoundRect(ctx,b1X,b1Y,b1W,b1H,isV?36:28); ctx.fill();
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle='#07060A'; ctx.font=lyricFont; ctx.letterSpacing='0px';
  const l1TextX=b1X+bPadH;
  l1Lines.forEach((l,i)=>ctx.fillText(l,l1TextX,b1Y+bPadV+i*lineH+lyricFS/2));
  const l1RuleY=b1Y+bPadV+l1Lines.length*lineH+14;
  ctx.strokeStyle='rgba(7,6,10,0.35)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(l1TextX,l1RuleY); ctx.lineTo(b1X+b1W-bPadH,l1RuleY); ctx.stroke();
  const l1MetaY=l1RuleY+metaGap;
  ctx.font='600 '+songFS+'px Lora, serif'; ctx.fillStyle='rgba(7,6,10,0.75)';
  ctx.fillText(p1.song||'',l1TextX,l1MetaY);
  ctx.font='400 '+artistFS+'px Lora, serif'; ctx.fillStyle='rgba(7,6,10,0.50)';
  ctx.fillText(p1.artist||'',l1TextX,l1MetaY+songFS+10);
  // tail
  ctx.fillStyle='#E8C547';
  ctx.beginPath();
  ctx.moveTo(b1X+4,b1Y+b1H);
  ctx.lineTo(b1X-(isV?28:22),b1Y+b1H+(isV?22:16));
  ctx.lineTo(b1X+(isV?36:28),b1Y+b1H);
  ctx.fill();

  // Bubble 2 — dark, right
  const b2Y=startY+b1H+gap;
  const b2W=Math.min(maxBubW,W-pad*2);
  const b2X=W-pad-b2W;
  ctx.fillStyle='#1E1B2A';
  _lbRoundRect(ctx,b2X,b2Y,b2W,b2H,isV?36:28); ctx.fill();
  ctx.strokeStyle='rgba(232,197,71,0.22)'; ctx.lineWidth=2;
  _lbRoundRect(ctx,b2X,b2Y,b2W,b2H,isV?36:28); ctx.stroke();
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle='#F4F1ED'; ctx.font=lyricFont; ctx.letterSpacing='0px';
  const l2TextX=b2X+bPadH;
  l2Lines.forEach((l,i)=>ctx.fillText(l,l2TextX,b2Y+bPadV+i*lineH+lyricFS/2));
  const l2RuleY=b2Y+bPadV+l2Lines.length*lineH+14;
  ctx.strokeStyle='rgba(232,197,71,0.45)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(l2TextX,l2RuleY); ctx.lineTo(b2X+b2W-bPadH,l2RuleY); ctx.stroke();
  const l2MetaY=l2RuleY+metaGap;
  ctx.font='600 '+songFS+'px Lora, serif'; ctx.fillStyle='rgba(244,241,237,0.70)';
  ctx.fillText(p2.song||'',l2TextX,l2MetaY);
  ctx.font='400 '+artistFS+'px Lora, serif'; ctx.fillStyle='rgba(154,152,164,0.80)';
  ctx.fillText(p2.artist||'',l2TextX,l2MetaY+songFS+10);
  // tail
  ctx.fillStyle='#1E1B2A';
  const tailBase=b2X+b2W-4;
  ctx.beginPath();
  ctx.moveTo(tailBase,b2Y+b2H);
  ctx.lineTo(tailBase+(isV?28:22),b2Y+b2H+(isV?22:16));
  ctx.lineTo(tailBase-(isV?36:28),b2Y+b2H);
  ctx.fill();

  // Footer
  const footerY=H-(isV?90:70);
  ctx.strokeStyle='rgba(232,197,71,0.09)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pad,footerY-22); ctx.lineTo(W-pad,footerY-22); ctx.stroke();
  ctx.fillStyle='rgba(232,197,71,0.38)';
  ctx.font='400 '+(isV?24:20)+'px Lora, serif';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.letterSpacing='3px';
  ctx.fillText('trymargo.com',mid,footerY);
}
function _lbRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);   ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h);   ctx.arcTo(x,   y+h, x,   y+h-r, r);
  ctx.lineTo(x, y+r);     ctx.arcTo(x,   y,   x+r, y,     r);
  ctx.closePath();
}

/* ── SWIPE TO CLOSE ── */
function _lbInitSwipe() {
  const sheet  = document.getElementById('lbSheet');
  const handle = document.getElementById('lbHandle');
  if (!sheet || !handle) return;
  let startY = 0, dragging = false;
  handle.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY; dragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });
  handle.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dy = Math.max(0, e.touches[0].clientY - startY);
    sheet.style.transform = 'translateY(' + dy + 'px)';
    sheet.style.opacity   = String(1 - dy / 320);
  }, { passive: true });
  handle.addEventListener('touchend', e => {
    if (!dragging) return; dragging = false;
    sheet.style.transition = '';
    if (e.changedTouches[0].clientY - startY > 80) closeLyricBackShare();
    else { sheet.style.transform = ''; sheet.style.opacity = ''; }
  });
}

/* ── TOAST ── */
function _lbToast(msg) {
  const t = document.getElementById('lbToast');
  t.textContent = msg;
  t.classList.add('lb-show');
  setTimeout(() => t.classList.remove('lb-show'), 2400);
}
