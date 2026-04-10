/* ============================================================
   MARGO — js/echoes.js
   v1.3 — FINAL
   • EMOTION → VIBE everywhere
   • Send It / Let Out display names correct
   • Bottom action buttons fully readable
   • Live Genius search from ≥3 chars
   • Submit uses firebase.database().ref('posts') DIRECTLY
     — never relies on stale postsRef global
   ============================================================ */

window._echoState = window._echoState || {
  post:         null,
  postIndex:    -1,
  echoes:       [],
  echoListener: null,
  isSubmitting: false,
};
const ES = window._echoState;

/* ────────────────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────────────────── */
function mountEchoSheet() {
  if (document.getElementById("echoSheetBackdrop")) return;
  // Element already exists in HTML, just wire it up
  const backdrop = document.getElementById("echoSheetBackdrop");
  if (!backdrop) return;
  
  backdrop.querySelector("#echoClose").onclick = closeEchoSheet;
  backdrop.querySelector("#echoComposeTrigger").onclick = expandEchoCompose;
  backdrop.querySelector("#echoCancelBtn").onclick = collapseEchoCompose;
  backdrop.querySelector("#echoSubmitBtn").onclick = submitEcho;
  backdrop.addEventListener("click", e => { if (e.target === backdrop) closeEchoSheet(); });
  
  backdrop.querySelector("#echoLyricInput").oninput = e => {
    const n = e.target.value.length;
    backdrop.querySelector("#echoCharCount").textContent = n;
    backdrop.querySelector("#echoSubmitBtn").disabled = n < 2;
  };
}

/* ────────────────────────────────────────────────────────────
   OPEN / CLOSE
──────────────────────────────────────────────────────────── */
async function openEchoSheet(postIndex) {
  mountEchoSheet();

  const post = (typeof posts !== 'undefined' ? posts : [])[postIndex];
  if (!post) return;

  if (typeof MargoUsername !== 'undefined' && !MargoUsername.hasBeenRevealed()) {
    await MargoUsername.showReveal();
  }

  ES.post      = post;
  ES.postIndex = postIndex;
  ES.echoes    = [];

  const parentLyricEl = document.getElementById('echoParentLyric');
  if (parentLyricEl) parentLyricEl.textContent = (post.text || '').substring(0, 50) + '…';

  populateEchoOgCard(post);
  populateEchoComposeUser();
  collapseEchoCompose();
  clearEchoForm();
  renderEchoList([]);

  const backdrop = document.getElementById('echoSheetBackdrop');
  backdrop.classList.remove('echo-hidden');
  if(window.feed) window.feed.style.display = "none";
  document.body.classList.add("echo-page-open");

  subscribeEchoes(post.id);
}

function closeEchoSheet() {
  unsubscribeEchoes();
  const backdrop = document.getElementById('echoSheetBackdrop');
  if (backdrop) backdrop.classList.add('echo-hidden');
  if(window.feed) window.feed.style.display = "";
  document.body.classList.remove("echo-page-open");
  collapseEchoCompose();
  clearEchoForm();
}

/* ────────────────────────────────────────────────────────────
   ORIGINAL POST CARD
──────────────────────────────────────────────────────────── */
function populateEchoOgCard(post) {
  const card = document.getElementById('echoOgCard');
  if (!card) return;
  const k         = post.knowledge || {};
  const vibe      = post.emotion || post.feeling || 'Nostalgia';
  const vcfg      = ECHO_VIBE_CFG[vibe] || ECHO_VIBE_CFG['Nostalgia'];
  const vibeLabel = ECHO_VIBES.find(v => v.value === vibe)?.label || vibe;
  card.innerHTML = `
    <div class="echo-og-lyric">"${post.text || ''}"</div>
    <div class="echo-og-meta">
      <span class="echo-og-song">${k.song || 'Unknown Song'} — ${k.artist || ''}</span>
      <span class="echo-vibe-tag" style="background:${vcfg.bg};color:${vcfg.text};border:1px solid ${vcfg.border}">
        ${vibeLabel}
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
  if (avatar)  { avatar.innerHTML  = ''; avatar.appendChild(MargoUsername.buildAvatar(name, 28)); }
  if (fAvatar) { fAvatar.innerHTML = ''; fAvatar.appendChild(MargoUsername.buildAvatar(name, 22)); }
  if (fName)   { fName.textContent = name; fName.style.color = color; }
}

function expandEchoCompose() {
  const collapsed = document.getElementById('echoCollapsed');
  if (collapsed) collapsed.style.display = 'none';
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
  document.querySelectorAll('.echo-vibe-opt').forEach(b => b.classList.remove('active'));
  const gr = document.getElementById('echoGeniusResults');
  if (gr) gr.innerHTML = '';
  const lh = document.getElementById('echoLiveHint');
  if (lh) lh.style.display = 'none';
}

/* ────────────────────────────────────────────────────────────
   FIREBASE SUBSCRIBE / UNSUBSCRIBE
──────────────────────────────────────────────────────────── */
function subscribeEchoes(postId) {
  unsubscribeEchoes();
  let _subDb; try { _subDb = firebase.database(); } catch(_) { return; }
  if (!_subDb) return;

  try {
    const ref = _subDb.ref('posts').child(postId).child('echoes');
    const handler = snap => {
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
  } catch (err) {
    console.error('[Echo] subscribe error:', err);
  }
}

function unsubscribeEchoes() {
  if (ES.echoListener) { ES.echoListener(); ES.echoListener = null; }
}

/* ────────────────────────────────────────────────────────────
   RENDER ECHO LIST
──────────────────────────────────────────────────────────── */
function renderEchoList(echoes) {
  const list       = document.getElementById('echoList');
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
  const username      = echo.username || 'Anonymous';
  const vibe          = echo.emotion || echo.feeling || 'Nostalgia';
  const vcfg          = ECHO_VIBE_CFG[vibe] || ECHO_VIBE_CFG['Nostalgia'];
  const vibeLabel     = ECHO_VIBES.find(v => v.value === vibe)?.label || vibe;
  const resonateCount = Object.keys(echo.resonates || {}).length;
  const myUserId      = typeof userId !== 'undefined' ? userId : '';
  const hasResonated  = !!(echo.resonates && echo.resonates[myUserId]);

  let avatarColor = '#E8C547';
  let avatarIcon  = '♪';
  if (typeof MargoUsername !== 'undefined') {
    const c = MargoUsername.getColor(username);
    avatarColor = c.color;
    const instr = MargoUsername.getInstrument ? MargoUsername.getInstrument(username) : '';
    const icons = {
      Guitar:'♬', Piano:'♪', Violin:'🎻', Cello:'🎻', Drums:'🥁',
      Bass:'♬', Flute:'♩', Harp:'♫', Trumpet:'🎺', Sitar:'♬',
      Viola:'🎻', Banjo:'♬', Saxophone:'🎷', Clarinet:'♩',
      Ukulele:'♬', Organ:'♪', Synth:'⌨', Mandolin:'♬', Trombone:'🎺',
    };
    avatarIcon = icons[instr] || '♪';
  }

  const timeStr = typeof timeAgo === 'function' && echo.timestamp ? timeAgo(echo.timestamp) : '';
  const colorBg = typeof MargoUsername !== 'undefined' ? MargoUsername.getColor(username).colorBg : 'rgba(232,197,71,0.1)';

  const card = document.createElement('div');
  card.className = 'echo-card';
  card.style.animationDelay = `${idx * 0.04}s`;
  card.innerHTML = `
    <div class="echo-card-header">
      <div class="echo-user-row">
        <div style="width:22px;height:22px;border-radius:50%;
          background:${colorBg};border:1.5px solid ${avatarColor};
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
      <span class="echo-vibe-tag" style="background:${vcfg.bg};color:${vcfg.text};border:1px solid ${vcfg.border}">
        ${vibeLabel}
      </span>
    </div>
    <div class="echo-card-actions">
      <button class="echo-action-btn echo-resonate-btn ${hasResonated ? 'resonated' : ''}" data-echo-id="${echo.id}">
        ♥ ${resonateCount > 0 ? resonateCount : 'Resonate'}
      </button>
      <button class="echo-action-btn echo-share-btn" data-echo-idx="${idx}">
        ↗ GIF · Poster
      </button>
    </div>
  `;

  card.querySelector('.echo-resonate-btn').onclick = () => resonateEcho(echo.id);
  card.querySelector('.echo-share-btn').onclick    = () => openDuetShareSheet(echo);

  return card;
}

/* ────────────────────────────────────────────────────────────
   RESONATE ON ECHO
──────────────────────────────────────────────────────────── */
function resonateEcho(echoId) {
  if (!ES.post?.id || !echoId) return;
  let _rDb; try { _rDb = firebase.database(); } catch(_) { return; }
  if (!_rDb) return;
  const myId = typeof userId !== 'undefined' ? userId : 'anon';
  try {
    const ref = _rDb.ref('posts')
      .child(ES.post.id).child('echoes').child(echoId).child('resonates').child(myId);
    ref.once('value').then(snap => {
      if (snap.exists()) ref.remove();
      else ref.set(true);
    });
  } catch (err) {
    console.error('[Echo] resonate error:', err);
  }
}

/* ────────────────────────────────────────────────────────────
   DUET SHARE
──────────────────────────────────────────────────────────── */
function openDuetShareSheet(echo) {
  if (typeof openDuetSheet === 'function') {
    openDuetSheet(ES.post, echo);
  }
}

/* ────────────────────────────────────────────────────────────
   SUBMIT ECHO — uses firebase.database().ref('posts') DIRECTLY
   Never relies on postsRef global which can be stale
──────────────────────────────────────────────────────────── */
async function submitEcho() {
  if (ES.isSubmitting) return;

  const lyric  = document.getElementById('echoLyricInput')?.value.trim();
  const song   = document.getElementById('echoSongInput')?.value.trim()   || 'Unknown Song';
  const artist = document.getElementById('echoArtistInput')?.value.trim() || 'Unknown Artist';
  const vibe   = document.querySelector('.echo-vibe-opt.active')?.dataset.emotion || 'Nostalgia';

  if (!lyric || lyric.length < 2) {
    if (typeof showToast === 'function') showToast('Add a lyric first');
    return;
  }

  let _db;
  try { _db = firebase.database(); } catch(_) { _db = null; }
  if (!_db) {
    if (typeof showToast === 'function') showToast('Not connected — try again');
    return;
  }

  if (!ES.post?.id) {
    if (typeof showToast === 'function') showToast('Something went wrong — try again');
    return;
  }

  const username = typeof MargoUsername !== 'undefined' ? MargoUsername.get() : 'Anon';

  let ts;
  try { ts = firebase.database.ServerValue.TIMESTAMP; }
  catch (_) { ts = Date.now(); }

  const echoData = {
    lyric, song, artist,
    emotion:   vibe,
    username,
    timestamp: ts,
    resonates: {},
  };

  ES.isSubmitting = true;
  const submitBtn = document.getElementById('echoSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="echo-spinner"></span> Dropping…';
  }

  try {
    /* ── DIRECT db reference — bypasses any stale postsRef ── */
    await _db.ref('posts').child(ES.post.id).child('echoes').push(echoData);

    collapseEchoCompose();
    clearEchoForm();
    if (typeof showToast === 'function') showToast('Lyric dropped ♪');

  } catch (err) {
    console.error('[Echo] submit error:', err.code, err.message);
    const msg = err.code === 'PERMISSION_DENIED' ? 'Permission denied — check Firebase rules' : 'Something went wrong — try again';
    if (typeof showToast === 'function') showToast(msg);
  } finally {
    ES.isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Drop Your Lyric Back';
    }
  }
}

/* ────────────────────────────────────────────────────────────
   GENIUS SEARCH
──────────────────────────────────────────────────────────── */
let _echoLastQuery = '';

async function runEchoGeniusSearch(query) {
  if (query === _echoLastQuery) return;
  _echoLastQuery = query;

  const btn      = document.getElementById('echoIdentifyBtn');
  const liveHint = document.getElementById('echoLiveHint');
  if (btn) { btn.innerHTML = '<span class="echo-spinner"></span> Searching…'; btn.disabled = true; }
  if (liveHint) liveHint.style.display = 'none';
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
      const lh = document.getElementById('echoLiveHint');
      if (lh) lh.style.display = 'none';
    };
    el.appendChild(card);
  });
}

async function fillEchoSongMeta(song, artist) {
  // No-op — song/artist set from Genius or manual input
}

/* ────────────────────────────────────────────────────────────
   GLOBAL EXPOSE
──────────────────────────────────────────────────────────── */
window.openEchoSheet  = openEchoSheet;
window.closeEchoSheet = closeEchoSheet;
window.submitEcho     = submitEcho;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountEchoSheet);
} else {
  mountEchoSheet();
}
