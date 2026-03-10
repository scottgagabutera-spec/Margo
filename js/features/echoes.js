/* ============================================================
   MARGO — js/echoes.js
   The Echo System — "Lyric Back" feature.
   Replaces "Reply with Lyric" entirely.

   Echoes are stored under: posts/{postId}/echoes/{echoId}
   Each echo: { lyric, song, artist, emotion, username, timestamp, resonates:{} }

   Public API:
     openEchoSheet(postIndex)   — open the echo sheet for a post
     closeEchoSheet()
   ============================================================ */

/* ── Shared state ── */
window._echoState = window._echoState || {
  post:         null,   // parent post object
  postIndex:    -1,
  echoes:       [],
  echoListener: null,   // Firebase listener cleanup
  isSubmitting: false,
};
const ES = window._echoState;

/* ────────────────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────────────────── */
function injectEchoStyles() {
  if (document.getElementById('echoStyles')) return;
  const s = document.createElement('style');
  s.id = 'echoStyles';
  s.textContent = `
    /* ── Backdrop ── */
    #echoSheetBackdrop {
      position: fixed; inset: 0; z-index: 650;
      background: rgba(0,0,0,0.82);
      backdrop-filter: blur(16px) saturate(0.7);
      -webkit-backdrop-filter: blur(16px) saturate(0.7);
      display: flex; align-items: flex-end; justify-content: center;
      animation: echoFadeIn 0.28s ease;
    }
    @keyframes echoFadeIn { from{opacity:0} to{opacity:1} }
    #echoSheetBackdrop.echo-hidden { display:none !important; }

    @media(min-width:560px) {
      #echoSheetBackdrop { align-items: center; padding: 24px; }
    }

    /* ── Sheet ── */
    #echoSheet {
      width:100%; max-width:560px;
      background:#0f0e12;
      border:1px solid rgba(255,255,255,0.07);
      border-bottom:none; border-radius:28px 28px 0 0;
      overflow:hidden; display:flex; flex-direction:column;
      max-height:92dvh;
      box-shadow:0 -8px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,197,71,0.04) inset;
      animation:echoSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    @media(min-width:560px) {
      #echoSheet {
        border-radius:24px; border-bottom:1px solid rgba(255,255,255,0.07);
        max-height:88dvh; animation:echoFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes echoSlideUp { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes echoFadeUp  { from{transform:translateY(20px) scale(0.98);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }

    /* ── Handle ── */
    .echo-handle {
      width:36px; height:4px; border-radius:2px;
      background:rgba(255,255,255,0.12); margin:12px auto 0; flex-shrink:0;
    }

    /* ── Header ── */
    .echo-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 18px 0; flex-shrink:0;
    }
    .echo-header-left { display:flex; flex-direction:column; gap:2px; }
    .echo-title {
      font-family:'Syne',sans-serif; font-weight:800; font-size:0.9rem;
      letter-spacing:2px; text-transform:uppercase;
      background:linear-gradient(90deg,#fff 20%,#E8C547 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    }
    .echo-parent-lyric {
      font-family:'DM Serif Display',serif; font-style:italic;
      font-size:0.75rem; color:rgba(255,255,255,0.32); line-height:1.4;
      max-width:240px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
    }
    .echo-close {
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.38); width:30px; height:30px; border-radius:50%;
      font-size:1.1rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      transition:all 0.18s; flex-shrink:0;
    }
    .echo-close:hover { background:rgba(255,255,255,0.12); color:#fff; }

    /* ── Original post card (compact) ── */
    .echo-og-card {
      margin:12px 18px 0; border-radius:14px;
      background:rgba(232,197,71,0.05);
      border:1px solid rgba(232,197,71,0.18);
      padding:12px 14px; flex-shrink:0;
    }
    .echo-og-lyric {
      font-family:'DM Serif Display',serif; font-style:italic;
      font-size:0.92rem; line-height:1.55; color:#F0F0F0; margin-bottom:8px;
    }
    .echo-og-meta {
      display:flex; align-items:center; justify-content:space-between; gap:8px;
    }
    .echo-og-song {
      font-family:'Space Mono',monospace; font-size:0.58rem; font-weight:700;
      color:rgba(255,255,255,0.45); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }

    /* ── Divider ── */
    .echo-divider {
      display:flex; align-items:center; gap:10px;
      padding:10px 18px; flex-shrink:0;
    }
    .echo-divider-line {
      flex:1; height:1px; background:rgba(255,255,255,0.06);
    }
    .echo-divider-label {
      font-family:'Space Mono',monospace; font-size:0.48rem; font-weight:700;
      color:rgba(255,255,255,0.22); text-transform:uppercase; letter-spacing:2px;
      white-space:nowrap;
    }

    /* ── Echo list ── */
    .echo-list-wrap {
      flex:1; overflow-y:auto; padding:0 18px 10px;
      scrollbar-width:none; display:flex; flex-direction:column; gap:10px;
    }
    .echo-list-wrap::-webkit-scrollbar { display:none; }

    /* ── Echo card ── */
    .echo-card {
      background:#161619;
      border:1px solid rgba(255,255,255,0.07);
      border-radius:16px; padding:14px;
      display:flex; flex-direction:column; gap:10px;
      animation:echoCardIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
      transition:border-color 0.2s, box-shadow 0.2s;
    }
    .echo-card:hover {
      border-color:rgba(255,255,255,0.13);
      box-shadow:0 6px 24px rgba(0,0,0,0.4);
    }
    @keyframes echoCardIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

    .echo-card-header {
      display:flex; align-items:center; justify-content:space-between;
    }
    .echo-user-row { display:flex; align-items:center; gap:8px; }
    .echo-username {
      font-family:'Space Mono',monospace; font-size:0.65rem; font-weight:700;
      letter-spacing:0.3px;
    }
    .echo-time {
      font-family:'Space Mono',monospace; font-size:0.52rem;
      color:rgba(255,255,255,0.25); font-weight:400;
    }

    .echo-lyric {
      font-family:'DM Serif Display',serif; font-style:italic;
      font-size:0.95rem; line-height:1.6; color:#F0F0F0;
    }

    .echo-song-row {
      display:flex; align-items:center; justify-content:space-between; gap:8px;
    }
    .echo-song-info { min-width:0; }
    .echo-song-name {
      font-family:'DM Sans',sans-serif; font-size:0.75rem; font-weight:600;
      color:rgba(255,255,255,0.75); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .echo-artist-name {
      font-family:'Space Mono',monospace; font-size:0.58rem;
      color:rgba(255,255,255,0.35); letter-spacing:0.3px;
    }
    .echo-emotion-tag {
      font-family:'Space Mono',monospace; font-size:0.48rem; font-weight:700;
      text-transform:uppercase; letter-spacing:0.5px; padding:3px 9px;
      border-radius:20px; flex-shrink:0;
    }

    .echo-card-actions { display:flex; gap:6px; }
    .echo-action-btn {
      flex:1; padding:8px 6px; border-radius:9px;
      background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
      color:rgba(255,255,255,0.38);
      font-family:'Space Mono',monospace; font-size:0.52rem; font-weight:700;
      text-transform:uppercase; letter-spacing:1px;
      cursor:pointer; transition:all 0.18s;
      display:flex; align-items:center; justify-content:center; gap:4px;
    }
    .echo-action-btn:hover { border-color:rgba(255,255,255,0.18); color:rgba(255,255,255,0.7); }
    .echo-resonate-btn.resonated {
      background:rgba(255,107,157,0.1); border-color:rgba(255,107,157,0.35);
      color:#FF6B9D;
    }
    .echo-share-btn:hover {
      border-color:rgba(232,197,71,0.3); color:rgba(232,197,71,0.8);
      background:rgba(232,197,71,0.05);
    }

    /* ── Empty state ── */
    .echo-empty {
      text-align:center; padding:32px 20px;
      display:flex; flex-direction:column; align-items:center; gap:12px;
    }
    .echo-empty-icon { font-size:2rem; opacity:0.35; }
    .echo-empty-title {
      font-family:'Syne',sans-serif; font-size:0.88rem; font-weight:700;
      color:rgba(255,255,255,0.45);
    }
    .echo-empty-sub {
      font-family:'DM Serif Display',serif; font-style:italic;
      font-size:0.78rem; color:rgba(255,255,255,0.25); max-width:220px; line-height:1.5;
    }

    /* ── Compose area ── */
    .echo-compose {
      padding:12px 18px 20px; flex-shrink:0;
      border-top:1px solid rgba(255,255,255,0.06);
      display:flex; flex-direction:column; gap:8px;
      background:rgba(0,0,0,0.2);
    }

    /* Collapsible form */
    .echo-compose-collapsed {
      display:flex; align-items:center; gap:10px;
    }
    .echo-compose-trigger {
      flex:1; padding:12px 16px; border-radius:50px;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.3);
      font-family:'DM Serif Display',serif; font-style:italic; font-size:0.85rem;
      text-align:left; cursor:pointer; transition:all 0.2s;
    }
    .echo-compose-trigger:hover {
      border-color:rgba(232,197,71,0.3); color:rgba(255,255,255,0.5);
      background:rgba(232,197,71,0.03);
    }
    .echo-compose-avatar { flex-shrink:0; }

    /* Expanded form */
    .echo-compose-form {
      display:none; flex-direction:column; gap:8px;
      animation:echoFadeIn 0.2s ease;
    }
    .echo-compose-form.open { display:flex; }

    .echo-form-user-row {
      display:flex; align-items:center; gap:8px; margin-bottom:2px;
    }
    .echo-form-username {
      font-family:'Space Mono',monospace; font-size:0.65rem; font-weight:700;
    }

    .echo-lyric-input {
      width:100%; min-height:70px; resize:none;
      padding:13px 15px; border-radius:14px;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
      color:#fff; font-family:'DM Serif Display',serif;
      font-style:italic; font-size:1rem; line-height:1.6;
      outline:none; transition:border-color 0.2s, box-shadow 0.2s;
    }
    .echo-lyric-input::placeholder { color:rgba(255,255,255,0.2); }
    .echo-lyric-input:focus {
      border-color:rgba(232,197,71,0.38);
      box-shadow:0 0 0 3px rgba(232,197,71,0.07);
    }

    .echo-form-row { display:flex; gap:8px; }
    .echo-form-input {
      flex:1; padding:10px 12px; border-radius:11px;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09);
      color:#fff; font-family:'DM Sans',sans-serif; font-size:0.85rem;
      outline:none; transition:border-color 0.2s;
    }
    .echo-form-input::placeholder { color:rgba(255,255,255,0.2); }
    .echo-form-input:focus {
      border-color:rgba(232,197,71,0.3);
      box-shadow:0 0 0 3px rgba(232,197,71,0.06);
    }

    .echo-emotion-row {
      display:grid; grid-template-columns:repeat(4,1fr); gap:5px;
    }
    .echo-emotion-opt {
      padding:7px 4px; border-radius:9px;
      background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
      color:rgba(255,255,255,0.38); font-family:'DM Sans',sans-serif;
      font-size:0.65rem; font-weight:600; cursor:pointer; transition:all 0.18s;
      text-align:center;
    }
    .echo-emotion-opt.active {
      background:rgba(232,197,71,0.1); border-color:rgba(232,197,71,0.4);
      color:#E8C547;
    }

    .echo-form-submit-row { display:flex; gap:8px; align-items:center; }
    .echo-cancel-btn {
      padding:12px 14px; border-radius:12px;
      background:none; border:1px solid rgba(255,255,255,0.08);
      color:rgba(255,255,255,0.28); font-family:'Space Mono',monospace;
      font-size:0.52rem; font-weight:700; text-transform:uppercase; letter-spacing:1px;
      cursor:pointer; transition:all 0.18s;
    }
    .echo-cancel-btn:hover { border-color:rgba(255,255,255,0.18); color:rgba(255,255,255,0.55); }
    .echo-submit-btn {
      flex:1; padding:13px; border-radius:12px;
      background:rgba(232,197,71,0.12); border:1px solid rgba(232,197,71,0.4);
      color:#E8C547; font-family:'Syne',sans-serif;
      font-weight:800; font-size:0.82rem; letter-spacing:1px; text-transform:uppercase;
      cursor:pointer; transition:all 0.22s cubic-bezier(0.16,1,0.3,1);
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .echo-submit-btn:hover {
      background:rgba(232,197,71,0.2); border-color:rgba(232,197,71,0.65);
      color:#fff; transform:translateY(-1px);
      box-shadow:0 8px 24px rgba(232,197,71,0.2);
    }
    .echo-submit-btn:active { transform:scale(0.97); }
    .echo-submit-btn:disabled { opacity:0.45; cursor:default; transform:none; box-shadow:none; }

    .echo-char-count {
      font-family:'Space Mono',monospace; font-size:0.5rem;
      color:rgba(255,255,255,0.2); text-align:right; font-weight:700;
    }

    /* ── Genius identify in echo ── */
    .echo-identify-btn {
      width:100%; padding:9px 12px; border-radius:10px;
      background:rgba(232,197,71,0.04); border:1px dashed rgba(232,197,71,0.25);
      color:rgba(232,197,71,0.6); font-family:'Space Mono',monospace;
      font-size:0.52rem; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;
      cursor:pointer; transition:all 0.18s;
      display:flex; align-items:center; justify-content:center; gap:6px;
    }
    .echo-identify-btn:hover:not(:disabled) {
      background:rgba(232,197,71,0.09); border-color:rgba(232,197,71,0.5); color:#E8C547;
    }
    .echo-identify-btn:disabled { opacity:0.4; cursor:default; }

    .echo-spinner {
      width:12px; height:12px; border-radius:50%;
      border:2px solid rgba(232,197,71,0.2); border-top-color:#E8C547;
      animation:echoSpin 0.7s linear infinite; display:inline-block;
    }
    @keyframes echoSpin { to{transform:rotate(360deg)} }
  `;
  document.head.appendChild(s);
}

/* ────────────────────────────────────────────────────────────
   EMOTION CONFIG (local copy to avoid cross-file dep)
──────────────────────────────────────────────────────────── */
const ECHO_EMOTIONS = ['Love','Heartbreak','Hope','Nostalgia','Healing','Joy','Rage','Loneliness'];
const ECHO_EMOTION_CFG = {
  Love:       { bg:'rgba(255,107,157,0.13)',text:'#FF6B9D',border:'rgba(255,107,157,0.22)'},
  Heartbreak: { bg:'rgba(255,80,80,0.11)', text:'#ff5050',border:'rgba(255,80,80,0.2)'   },
  Hope:       { bg:'rgba(107,140,255,0.13)',text:'#6B8CFF',border:'rgba(107,140,255,0.22)'},
  Nostalgia:  { bg:'rgba(232,197,71,0.11)',text:'#E8C547',border:'rgba(232,197,71,0.25)' },
  Healing:    { bg:'rgba(74,222,128,0.13)',text:'#4ade80',border:'rgba(74,222,128,0.22)' },
  Joy:        { bg:'rgba(255,200,71,0.11)',text:'#ffc847',border:'rgba(255,200,71,0.22)' },
  Rage:       { bg:'rgba(255,100,100,0.13)',text:'#FF6464',border:'rgba(255,100,100,0.22)'},
  Loneliness: { bg:'rgba(160,160,255,0.11)',text:'#a0a0ff',border:'rgba(160,160,255,0.22)'},
};

/* ────────────────────────────────────────────────────────────
   MOUNT (once)
──────────────────────────────────────────────────────────── */
function mountEchoSheet() {
  if (document.getElementById('echoSheetBackdrop')) return;
  injectEchoStyles();

  const backdrop = document.createElement('div');
  backdrop.id = 'echoSheetBackdrop';
  backdrop.className = 'echo-hidden';
  backdrop.innerHTML = `
    <div id="echoSheet">
      <div class="echo-handle"></div>

      <div class="echo-header">
        <div class="echo-header-left">
          <span class="echo-title">Lyric Back</span>
          <span class="echo-parent-lyric" id="echoParentLyric"></span>
        </div>
        <button class="echo-close" id="echoClose" aria-label="Close">×</button>
      </div>

      <!-- Original post compact card -->
      <div class="echo-og-card" id="echoOgCard"></div>

      <!-- Divider -->
      <div class="echo-divider">
        <div class="echo-divider-line"></div>
        <span class="echo-divider-label" id="echoCountLabel">0 echoes</span>
        <div class="echo-divider-line"></div>
      </div>

      <!-- Echo list -->
      <div class="echo-list-wrap" id="echoList"></div>

      <!-- Compose -->
      <div class="echo-compose" id="echoCompose">
        <!-- collapsed trigger -->
        <div class="echo-compose-collapsed" id="echoCollapsed">
          <div class="echo-compose-avatar" id="echoComposeAvatar"></div>
          <button class="echo-compose-trigger" id="echoComposeTrigger">
            Drop a lyric back…
          </button>
        </div>
        <!-- expanded form -->
        <div class="echo-compose-form" id="echoComposeForm">
          <div class="echo-form-user-row">
            <div id="echoFormAvatar"></div>
            <span class="echo-form-username" id="echoFormUsername"></span>
          </div>
          <textarea class="echo-lyric-input" id="echoLyricInput"
            maxlength="140" placeholder="The lyric that answers this one…"
            rows="3"></textarea>
          <div class="echo-char-count"><span id="echoCharCount">0</span>/140</div>
          <button class="echo-identify-btn" id="echoIdentifyBtn">
            Identify Song
          </button>
          <div id="echoGeniusResults"></div>
          <div class="echo-form-row">
            <input class="echo-form-input" id="echoSongInput"
              placeholder="Song title" type="text" maxlength="80"/>
            <input class="echo-form-input" id="echoArtistInput"
              placeholder="Artist" type="text" maxlength="80"/>
          </div>
          <div class="echo-emotion-row" id="echoEmotionRow">
            ${ECHO_EMOTIONS.map(e => `
              <button class="echo-emotion-opt" data-emotion="${e}">${e}</button>
            `).join('')}
          </div>
          <div class="echo-form-submit-row">
            <button class="echo-cancel-btn" id="echoCancelBtn">Cancel</button>
            <button class="echo-submit-btn" id="echoSubmitBtn" disabled>
              Drop Your Lyric Back
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // Wire events
  backdrop.querySelector('#echoClose').onclick   = closeEchoSheet;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeEchoSheet(); });

  // Trigger expand
  backdrop.querySelector('#echoComposeTrigger').onclick = expandEchoCompose;

  // Cancel collapse
  backdrop.querySelector('#echoCancelBtn').onclick = collapseEchoCompose;

  // Submit
  backdrop.querySelector('#echoSubmitBtn').onclick = submitEcho;

  // Char count
  backdrop.querySelector('#echoLyricInput').oninput = (e) => {
    const n = e.target.value.length;
    backdrop.querySelector('#echoCharCount').textContent = n;
    backdrop.querySelector('#echoSubmitBtn').disabled = n < 2;
  };

  // Emotion select
  backdrop.querySelectorAll('.echo-emotion-opt').forEach(btn => {
    btn.onclick = () => {
      backdrop.querySelectorAll('.echo-emotion-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  // Identify
  backdrop.querySelector('#echoIdentifyBtn').onclick = () => {
    const lyric = backdrop.querySelector('#echoLyricInput').value.trim();
    if (lyric.length < 5) { if (typeof showToast === 'function') showToast('Type a lyric first'); return; }
    runEchoGeniusSearch(lyric);
  };

  // Lyric input → auto-identify
  let geniusDebounce;
  backdrop.querySelector('#echoLyricInput').addEventListener('input', (e) => {
    clearTimeout(geniusDebounce);
    const val = e.target.value.trim();
    const songFilled = backdrop.querySelector('#echoSongInput').value.trim();
    if (val.length >= 20 && !songFilled) {
      geniusDebounce = setTimeout(() => runEchoGeniusSearch(val), 1400);
    }
  });

  // Song input → YouTube auto
  let ytDebounce;
  backdrop.querySelector('#echoSongInput').addEventListener('input', () => {
    clearTimeout(ytDebounce);
    const song   = backdrop.querySelector('#echoSongInput').value.trim();
    const artist = backdrop.querySelector('#echoArtistInput').value.trim();
    if (song.length > 1 && artist.length > 1) {
      ytDebounce = setTimeout(() => fillEchoSongMeta(song, artist), 700);
    }
  });
}

/* ────────────────────────────────────────────────────────────
   OPEN / CLOSE
──────────────────────────────────────────────────────────── */
async function openEchoSheet(postIndex) {
  mountEchoSheet();

  const post = (typeof posts !== 'undefined' ? posts : [])[postIndex];
  if (!post) return;

  // First-time username reveal
  if (typeof MargoUsername !== 'undefined' && !MargoUsername.hasBeenRevealed()) {
    await MargoUsername.showReveal();
  }

  ES.post      = post;
  ES.postIndex = postIndex;
  ES.echoes    = [];

  // Populate header / og card
  const parentLyricEl = document.getElementById('echoParentLyric');
  if (parentLyricEl) parentLyricEl.textContent = (post.text || '').substring(0, 50) + '…';

  populateEchoOgCard(post);
  populateEchoComposeUser();
  collapseEchoCompose();
  clearEchoForm();
  renderEchoList([]);

  // Show
  const backdrop = document.getElementById('echoSheetBackdrop');
  backdrop.classList.remove('echo-hidden');
  document.body.classList.add('modal-open');

  // Subscribe to Firebase echoes
  subscribeEchoes(post.id);
}

function closeEchoSheet() {
  unsubscribeEchoes();
  const backdrop = document.getElementById('echoSheetBackdrop');
  if (backdrop) backdrop.classList.add('echo-hidden');
  document.body.classList.remove('modal-open');
  collapseEchoCompose();
  clearEchoForm();
}

/* ────────────────────────────────────────────────────────────
   ORIGINAL POST CARD
──────────────────────────────────────────────────────────── */
function populateEchoOgCard(post) {
  const card = document.getElementById('echoOgCard');
  if (!card) return;
  const k      = post.knowledge || {};
  const emotion = post.emotion || 'Nostalgia';
  const ecfg   = ECHO_EMOTION_CFG[emotion] || ECHO_EMOTION_CFG['Nostalgia'];
  card.innerHTML = `
    <div class="echo-og-lyric">"${post.text || ''}"</div>
    <div class="echo-og-meta">
      <span class="echo-og-song">${k.song || 'Unknown Song'} — ${k.artist || ''}</span>
      <span class="echo-emotion-tag" style="background:${ecfg.bg};color:${ecfg.text};border:1px solid ${ecfg.border}">
        ${emotion}
      </span>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   COMPOSE AREA
──────────────────────────────────────────────────────────── */
function populateEchoComposeUser() {
  if (typeof MargoUsername === 'undefined') return;
  const name   = MargoUsername.get();
  const avatar = document.getElementById('echoComposeAvatar');
  const fAvatar= document.getElementById('echoFormAvatar');
  const fName  = document.getElementById('echoFormUsername');
  const { color } = MargoUsername.getColor(name);

  if (avatar) {
    avatar.innerHTML = '';
    avatar.appendChild(MargoUsername.buildAvatar(name, 28));
  }
  if (fAvatar) {
    fAvatar.innerHTML = '';
    fAvatar.appendChild(MargoUsername.buildAvatar(name, 22));
  }
  if (fName) {
    fName.textContent = name;
    fName.style.color = color;
  }
}

function expandEchoCompose() {
  document.getElementById('echoCollapsed')?.style && (document.getElementById('echoCollapsed').style.display = 'none');
  const form = document.getElementById('echoComposeForm');
  if (form) { form.classList.add('open'); form.style.display = 'flex'; }
  document.getElementById('echoLyricInput')?.focus();
}

function collapseEchoCompose() {
  const collapsed = document.getElementById('echoCollapsed');
  if (collapsed) collapsed.style.display = '';
  const form = document.getElementById('echoComposeForm');
  if (form) { form.classList.remove('open'); form.style.display = 'none'; }
}

function clearEchoForm() {
  ['echoLyricInput','echoSongInput','echoArtistInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cc = document.getElementById('echoCharCount');
  if (cc) cc.textContent = '0';
  const submitBtn = document.getElementById('echoSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;
  document.querySelectorAll('.echo-emotion-opt').forEach(b => b.classList.remove('active'));
  const gr = document.getElementById('echoGeniusResults');
  if (gr) gr.innerHTML = '';
}

/* ────────────────────────────────────────────────────────────
   FIREBASE SUBSCRIBE / UNSUBSCRIBE
──────────────────────────────────────────────────────────── */
function subscribeEchoes(postId) {
  unsubscribeEchoes();
  if (typeof isFirebaseEnabled === 'undefined' || !isFirebaseEnabled) return;
  if (typeof postsRef === 'undefined') return;

  const ref = postsRef.child(postId).child('echoes');
  const handler = (snap) => {
    ES.echoes = [];
    snap.forEach(child => {
      const echo = child.val();
      echo.id = child.key;
      ES.echoes.push(echo);
    });
    ES.echoes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    renderEchoList(ES.echoes);
  };
  ref.on('value', handler);
  ES.echoListener = () => ref.off('value', handler);
}

function unsubscribeEchoes() {
  if (ES.echoListener) { ES.echoListener(); ES.echoListener = null; }
}

/* ────────────────────────────────────────────────────────────
   RENDER ECHO LIST
──────────────────────────────────────────────────────────── */
function renderEchoList(echoes) {
  const list = document.getElementById('echoList');
  const countLabel = document.getElementById('echoCountLabel');
  if (!list) return;

  if (countLabel) {
    countLabel.textContent = `${echoes.length} echo${echoes.length !== 1 ? 's' : ''}`;
  }

  if (!echoes.length) {
    list.innerHTML = `
      <div class="echo-empty">
        <div class="echo-empty-icon">♪</div>
        <div class="echo-empty-title">No echoes yet</div>
        <div class="echo-empty-sub">Be the first to Lyric Back — drop the song that answers this one.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  echoes.forEach((echo, i) => {
    const card = buildEchoCard(echo, i);
    list.appendChild(card);
  });
}

function buildEchoCard(echo, idx) {
  const username = echo.username || 'Anonymous';
  const emotion  = echo.emotion || 'Nostalgia';
  const ecfg     = ECHO_EMOTION_CFG[emotion] || ECHO_EMOTION_CFG['Nostalgia'];
  const resonateCount = Object.keys(echo.resonates || {}).length;
  const myUserId = typeof userId !== 'undefined' ? userId : '';
  const hasResonated = !!(echo.resonates && echo.resonates[myUserId]);

  let avatarColor = '#E8C547';
  let avatarIcon  = '♪';
  if (typeof MargoUsername !== 'undefined') {
    const c = MargoUsername.getColor(username);
    avatarColor = c.color;
    const instr = MargoUsername.getInstrument(username);
    const icons = { Guitar:'♬',Piano:'♪',Violin:'🎻',Cello:'🎻',Drums:'🥁',
      Bass:'♬',Flute:'♩',Harp:'♫',Trumpet:'🎺',Sitar:'♬',Viola:'🎻',
      Banjo:'♬',Saxophone:'🎷',Clarinet:'♩',Ukulele:'♬',Organ:'♪',
      Synth:'⌨',Mandolin:'♬',Trombone:'🎺' };
    avatarIcon = icons[instr] || '♪';
  }

  const timeStr = typeof timeAgo === 'function' && echo.timestamp
    ? timeAgo(echo.timestamp) : '';

  const card = document.createElement('div');
  card.className = 'echo-card';
  card.style.animationDelay = `${idx * 0.04}s`;
  card.innerHTML = `
    <div class="echo-card-header">
      <div class="echo-user-row">
        <div style="width:22px;height:22px;border-radius:50%;
          background:${typeof MargoUsername !== 'undefined' ? MargoUsername.getColor(username).colorBg : 'rgba(232,197,71,0.1)'};
          border:1.5px solid ${avatarColor};
          display:flex;align-items:center;justify-content:center;
          font-size:0.7rem;flex-shrink:0;color:${avatarColor}">
          ${avatarIcon}
        </div>
        <span class="echo-username" style="color:${avatarColor}">${username}</span>
        <span class="echo-time">${timeStr}</span>
      </div>
    </div>

    <div class="echo-lyric">"${echo.lyric || ''}"</div>

    <div class="echo-song-row">
      <div class="echo-song-info">
        <div class="echo-song-name">${echo.song || 'Unknown Song'}</div>
        <div class="echo-artist-name">${echo.artist || ''}</div>
      </div>
      <span class="echo-emotion-tag"
        style="background:${ecfg.bg};color:${ecfg.text};border:1px solid ${ecfg.border}">
        ${emotion}
      </span>
    </div>

    <div class="echo-card-actions">
      <button class="echo-action-btn echo-resonate-btn ${hasResonated ? 'resonated' : ''}"
        data-echo-id="${echo.id}">
        ♥ ${resonateCount > 0 ? resonateCount : 'Resonate'}
      </button>
      <button class="echo-action-btn echo-share-btn" data-echo-idx="${idx}">
        ↗ Share · GIF · Poster
      </button>
    </div>
  `;

  // Resonate
  card.querySelector('.echo-resonate-btn').onclick = () => {
    resonateEcho(echo.id);
  };

  // Share (duet)
  card.querySelector('.echo-share-btn').onclick = () => {
    openDuetShareSheet(echo);
  };

  return card;
}

/* ────────────────────────────────────────────────────────────
   RESONATE
──────────────────────────────────────────────────────────── */
function resonateEcho(echoId) {
  if (!ES.post?.id || !echoId) return;
  if (typeof isFirebaseEnabled === 'undefined' || !isFirebaseEnabled) return;
  const myId = typeof userId !== 'undefined' ? userId : 'anon';
  const ref  = postsRef.child(ES.post.id).child('echoes').child(echoId).child('resonates').child(myId);
  ref.once('value').then(snap => {
    if (snap.exists()) ref.remove();
    else ref.set(true);
  });
}

/* ────────────────────────────────────────────────────────────
   DUET SHARE SHEET
──────────────────────────────────────────────────────────── */
function openDuetShareSheet(echo) {
  if (typeof openShareSheet === 'function') {
    openShareSheet(ES.post, { isDuet: true, echoPost: echo });
  }
}

/* ────────────────────────────────────────────────────────────
   SUBMIT ECHO
──────────────────────────────────────────────────────────── */
async function submitEcho() {
  if (ES.isSubmitting) return;
  const lyric   = document.getElementById('echoLyricInput')?.value.trim();
  const song    = document.getElementById('echoSongInput')?.value.trim()   || 'Unknown Song';
  const artist  = document.getElementById('echoArtistInput')?.value.trim() || 'Unknown Artist';
  const emotion = document.querySelector('.echo-emotion-opt.active')?.dataset.emotion || 'Nostalgia';

  if (!lyric || lyric.length < 2) {
    if (typeof showToast === 'function') showToast('Add a lyric first');
    return;
  }

  const username = typeof MargoUsername !== 'undefined' ? MargoUsername.get() : 'Anon';

  const echoData = {
    lyric, song, artist, emotion, username,
    timestamp: typeof firebase !== 'undefined'
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now(),
    resonates: {},
  };

  ES.isSubmitting = true;
  const submitBtn = document.getElementById('echoSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="echo-spinner"></span> Dropping…';
  }

  try {
    if (typeof isFirebaseEnabled !== 'undefined' && isFirebaseEnabled && ES.post?.id) {
      await postsRef.child(ES.post.id).child('echoes').push(echoData);
    }
    collapseEchoCompose();
    clearEchoForm();
    if (typeof showToast === 'function') showToast('Lyric dropped ♪');
  } catch (err) {
    console.error('[Echo] submit error:', err);
    if (typeof showToast === 'function') showToast('Something went wrong — try again');
  } finally {
    ES.isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Drop Your Lyric Back';
    }
  }
}

/* ────────────────────────────────────────────────────────────
   GENIUS SEARCH IN ECHO FORM
──────────────────────────────────────────────────────────── */
let _echoGeniusTimer;
let _echoLastQuery = '';

async function runEchoGeniusSearch(query) {
  if (query === _echoLastQuery) return;
  _echoLastQuery = query;
  const btn = document.getElementById('echoIdentifyBtn');
  if (btn) { btn.innerHTML = '<span class="echo-spinner"></span> Searching…'; btn.disabled = true; }
  const resultsEl = document.getElementById('echoGeniusResults');
  if (resultsEl) resultsEl.innerHTML = '';

  try {
    const res  = await fetch(`/api/genius?lyric=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (btn) { btn.textContent = 'Identify Song'; btn.disabled = false; }
    if (!res.ok || !data.results?.length) return;
    renderEchoGeniusResults(data.results);
  } catch (_) {
    if (btn) { btn.textContent = 'Identify Song'; btn.disabled = false; }
  }
}

function renderEchoGeniusResults(results) {
  const el = document.getElementById('echoGeniusResults');
  if (!el) return;
  el.innerHTML = '';

  const label = document.createElement('div');
  label.style.cssText = `font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;`;
  label.textContent = 'Select the right song';
  el.appendChild(label);

  results.slice(0, 3).forEach(r => {
    const card = document.createElement('div');
    card.style.cssText = `display:flex;align-items:center;gap:10px;padding:9px 12px;
      border-radius:11px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:all 0.18s;margin-bottom:5px;`;
    card.innerHTML = `
      ${r.artwork ? `<img src="${r.artwork}" style="width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0;" alt=""/>` : ''}
      <div style="flex:1;min-width:0">
        <div style="font-size:0.78rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.song}</div>
        <div style="font-size:0.65rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.artist}</div>
      </div>
      <span style="font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
        padding:3px 8px;border-radius:6px;background:rgba(232,197,71,0.08);
        color:rgba(232,197,71,0.7);border:1px solid rgba(232,197,71,0.2);flex-shrink:0">Use</span>
    `;
    card.onmouseenter = () => card.style.background = 'rgba(232,197,71,0.07)';
    card.onmouseleave = () => card.style.background = 'rgba(255,255,255,0.03)';
    card.onclick = () => {
      const songInput   = document.getElementById('echoSongInput');
      const artistInput = document.getElementById('echoArtistInput');
      if (songInput)   songInput.value   = r.song;
      if (artistInput) artistInput.value = r.artist;
      el.innerHTML = '';
      _echoLastQuery = '';
    };
    el.appendChild(card);
  });
}

async function fillEchoSongMeta(song, artist) {
  // Lightweight fill — just try to get YouTube meta for display
  // No-op if not needed; song/artist already set
}

/* ────────────────────────────────────────────────────────────
   GLOBAL EXPOSE
──────────────────────────────────────────────────────────── */
window.openEchoSheet  = openEchoSheet;
window.closeEchoSheet = closeEchoSheet;

// Mount on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountEchoSheet);
} else {
  mountEchoSheet();
}
