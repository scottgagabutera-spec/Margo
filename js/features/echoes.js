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
const ECHO_VIBES = [
  { value: "Nostalgia", label: "Nostalgia" },
  { value: "Heartbreak", label: "Heartbreak" },
  { value: "Hope", label: "Hope" },
  { value: "Anger", label: "Anger" },
  { value: "Joy", label: "Joy" },
  { value: "Reflection", label: "Reflection" }
];

const ECHO_VIBE_CFG = {
  "Nostalgia": { bg: "rgba(232,197,71,0.12)", text: "#E8C547", border: "rgba(232,197,71,0.25)" },
  "Heartbreak": { bg: "rgba(180,80,120,0.12)", text: "#B45078", border: "rgba(180,80,120,0.25)" },
  "Hope": { bg: "rgba(80,180,120,0.12)", text: "#50B478", border: "rgba(80,180,120,0.25)" },
  "Anger": { bg: "rgba(200,60,50,0.12)", text: "#C83C32", border: "rgba(200,60,50,0.25)" },
  "Joy": { bg: "rgba(232,197,71,0.12)", text: "#E8C547", border: "rgba(232,197,71,0.25)" },
  "Reflection": { bg: "rgba(100,120,180,0.12)", text: "#6478B4", border: "rgba(100,120,180,0.25)" }
};


/* ────────────────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────────────────── */
function mountEchoSheet() {
  const backdrop = document.getElementById("echoSheetBackdrop");
  if (!backdrop) return;

  backdrop.querySelector("#echoClose").onclick = closeEchoSheet;
  backdrop.querySelector("#echoSubmitBtn").onclick = submitEcho;

  // Lyric chip wiring (contenteditable matching composer pattern)
  const chipText = backdrop.querySelector("#echoLyricChipText");
  const hiddenInput = backdrop.querySelector("#echoLyricInput");
  const charCount = backdrop.querySelector("#echoCharCount");
  const submitBtn = backdrop.querySelector("#echoSubmitBtn");
  if (chipText) {
    chipText.addEventListener("input", function() {
      const val = this.textContent.trim();
      if (hiddenInput) hiddenInput.value = val;
      if (charCount) charCount.textContent = val.length;
      if (submitBtn) submitBtn.disabled = val.length < 2;
    });
  }
  const chipEdit = backdrop.querySelector("#echoLyricChipEdit");
  if (chipEdit) chipEdit.onclick = () => { if (chipText) chipText.focus(); };
  backdrop.addEventListener("click", e => { if (e.target === backdrop) closeEchoSheet(); });


  // Wire vibe buttons
  backdrop.querySelectorAll('.echo-vibe-opt').forEach(btn => {
    btn.onclick = () => {
      backdrop.querySelectorAll('.echo-vibe-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  // Smart search wiring
  let echoSearchTimer = null;
  let echoLastQuery = "";
  let echoSearchCache = {};
  let echoSongSelected = false;

  const smartInput = backdrop.querySelector("#echoSmartInput");
  if (smartInput) {
    smartInput.addEventListener("input", function() {
      const val = this.value.trim();
      clearTimeout(echoSearchTimer);
      const resultsEl = backdrop.querySelector("#echoSearchResults");
      if (!val) { if(resultsEl) { resultsEl.innerHTML=""; resultsEl.style.display="none"; } return; }
      if (val.length < 2) return;
      if (echoSongSelected) return;
      echoSearchTimer = setTimeout(async function() {
        if (val === echoLastQuery) return;
        echoLastQuery = val;
        try {
          const cached = echoSearchCache[val.toLowerCase()];
          const results = cached || await fetch("/api/genius?lyric="+encodeURIComponent(val)).then(r=>r.json()).then(d=>d.results||[]);
          if (!cached) echoSearchCache[val.toLowerCase()] = results;
          if (!resultsEl) return;
          if (!results.length) { resultsEl.innerHTML="<div style='padding:10px;font-size:0.75rem;color:rgba(255,255,255,0.3)'>No results found</div>"; resultsEl.style.display="block"; return; }
          resultsEl.innerHTML = "<div style='font-family:Space Mono,monospace;font-size:0.5rem;font-weight:700;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;'>Select the right song</div>";
          results.slice(0,5).forEach(function(r) {
            const card = document.createElement("div");
            card.style.cssText = "display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:11px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.18s;margin-bottom:5px;";
            card.innerHTML = (r.artwork ? `<img src="${r.artwork}" style="width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0;"/>` : "")
              + `<div style="flex:1;min-width:0"><div style="font-size:0.78rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.song}</div><div style="font-size:0.65rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.artist}</div></div>`
              + `<span style="font-family:Space Mono,monospace;font-size:0.5rem;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(232,197,71,0.08);color:rgba(232,197,71,0.7);border:1px solid rgba(232,197,71,0.2);flex-shrink:0">USE</span>`;
            card.onmouseenter = function(){ card.style.background="rgba(232,197,71,0.07)"; };
            card.onmouseleave = function(){ card.style.background="rgba(255,255,255,0.03)"; };
            card.onclick = function() {
              const songInput = backdrop.querySelector("#echoSongInput");
              const artistInput = backdrop.querySelector("#echoArtistInput");
              if (songInput) songInput.value = r.song;
              if (artistInput) artistInput.value = r.artist;
              const pill = backdrop.querySelector("#echoSongPill");
              if (pill) {
                pill.innerHTML = `<img src="${r.artwork||''}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;"/><div style="flex:1;min-width:0"><div style="font-size:0.8rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.song}</div><div style="font-size:0.65rem;color:rgba(255,255,255,0.4)">${r.artist}</div></div><button id="echoChangeSongBtn" style="font-size:0.65rem;font-family:Space Mono,monospace;padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);cursor:pointer;">Change</button>`;
                pill.style.display = "flex";
                pill.style.alignItems = "center";
                pill.style.gap = "10px";
                pill.style.padding = "9px 12px";
                pill.style.borderRadius = "11px";
                pill.style.background = "rgba(232,197,71,0.07)";
                pill.style.border = "1px solid rgba(232,197,71,0.2)";
                pill.querySelector("#echoChangeSongBtn").onclick = function() {
                  pill.style.display = "none";
                  pill.innerHTML = "";
                  const sf = document.getElementById("echoSearchField");
                  if (sf) sf.style.display = "flex";
                  if (songInput) songInput.value = "";
                  if (artistInput) artistInput.value = "";
                  echoSongSelected = false;
                  echoLastQuery = "";
                  const si = backdrop.querySelector("#echoSmartInput");
                  if (si) { si.value = ""; si.focus(); }
                  const ls = backdrop.querySelector("#echoLyricSection");
                  if (ls) ls.style.display = "none";
                  const vl = backdrop.querySelector("#echoVibeLabel");
                  if (vl) vl.style.display = "none";
                  const vr = backdrop.querySelector("#echoVibeRow");
                  if (vr) vr.style.display = "none";
                  const sr = backdrop.querySelector("#echoSubmitRow");
                  if (sr) sr.style.display = "none";
                };
              }
              const searchField = document.getElementById("echoSearchField");
              if (searchField) searchField.style.display = "none";
              resultsEl.innerHTML = ""; resultsEl.style.display = "none";
              echoSongSelected = true;
              // Auto-open compose form when song selected
              echoLastQuery = "";
              const lyricSection = backdrop.querySelector("#echoLyricSection");
              if (lyricSection) lyricSection.style.display = "block";
              const vibeLabel = backdrop.querySelector("#echoVibeLabel");
              if (vibeLabel) vibeLabel.style.display = "block";
              const vibeRow = backdrop.querySelector("#echoVibeRow");
              if (vibeRow) vibeRow.style.display = "flex";
              const submitRow = backdrop.querySelector("#echoSubmitRow");
              if (submitRow) submitRow.style.display = "flex";
            };
            resultsEl.appendChild(card);
          });
          resultsEl.style.display = "block";
        } catch(e) { console.error(e); }
      }, 380);
    });
  }
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


  populateEchoOgCard(post);
  populateEchoComposeUser();
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
  const fAvatar= document.getElementById('echoFormAvatar');
  const fName  = document.getElementById('echoFormUsername');
  const { color } = MargoUsername.getColor(name);
  if (fAvatar) { fAvatar.innerHTML = ''; fAvatar.appendChild(MargoUsername.buildAvatar(name, 22)); }
  if (fName)   { fName.textContent = name; fName.style.color = color; }
}

function clearEchoForm() {
  ['echoLyricInput','echoSongInput','echoArtistInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  const chip = document.getElementById('echoLyricChipText');
  if (chip) chip.textContent = '';
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

  const chipEl = document.getElementById('echoLyricChipText');
  const lyric  = (document.getElementById('echoLyricInput')?.value || chipEl?.textContent || '').trim();
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
