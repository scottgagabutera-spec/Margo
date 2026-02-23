/* ============================================================
   MARGO — js/composer.js
   v5.1 — Auto Genius ID + YouTube autocomplete + premium UX
   ============================================================ */

/* ── MODERATION ENGINE ── */
const BANNED_PATTERNS = [
  "fuck","shit","bitch","asshole","nigger","cunt",
  "whore","slut","pussy","dick","cock","bastard","piss","damn","ass"
];
const BANNED_VARIATIONS = {
  fuck:["fuk","fck","fuq","phuck","fux"],shit:["sh1t","sht"],
  bitch:["biatch","b1tch"],pussy:["pus5y","puss1","pussi"],
  dick:["d1ck","dik","dic"],cock:["c0ck","cok"],
  bastard:["b4stard"],ass:["a55","@ss"],nigger:["n1gger","nigg3r","nig"],
};
function normalizeText(s){return s.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/(.)\1+/g,'$1');}
function containsBannedWord(text){
  const n=normalizeText(text);
  return BANNED_PATTERNS.some(w=>{
    if(n.includes(normalizeText(w)))return true;
    return(BANNED_VARIATIONS[w]||[]).some(v=>n.includes(normalizeText(v)));
  });
}
function censorText(text){
  let r=text;
  BANNED_PATTERNS.forEach(w=>{
    const c=w[0]+'*'.repeat(w.length-2)+w[w.length-1];
    r=r.replace(new RegExp(w,'gi'),c);
    (BANNED_VARIATIONS[w]||[]).forEach(v=>{r=r.replace(new RegExp(v,'gi'),c);});
  });
  return r;
}

/* ── HTML entity decoder ── */
function decodeHTML(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

/* ── STYLES (injected once) ── */
function injectComposerStyles() {
  if (document.getElementById('composerV5Styles')) return;
  const s = document.createElement('style');
  s.id = 'composerV5Styles';
  s.textContent = `
    /* ── Spinner ── */
    .m-spinner {
      width:13px;height:13px;border-radius:50%;
      border:2px solid rgba(232,197,71,0.25);
      border-top-color:#E8C547;
      animation:mspin 0.65s linear infinite;
      display:inline-block;flex-shrink:0;
    }
    @keyframes mspin{to{transform:rotate(360deg)}}

    /* ── Identify button ── */
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
      background:rgba(232,197,71,0.09);
      border-color:rgba(232,197,71,0.55);
      color:#E8C547;
    }
    #geniusIdentifyBtn.active {
      border-color:#E8C547;color:#E8C547;
      background:rgba(232,197,71,0.08);
    }
    #geniusIdentifyBtn:disabled { opacity:0.5;cursor:default; }

    /* ── Genius results ── */
    .genius-section-label {
      font-size:0.58rem;color:rgba(255,255,255,0.35);
      letter-spacing:2px;text-transform:uppercase;
      font-family:'Space Mono',monospace;
      margin:10px 0 6px;
    }
    .genius-results-list { display:flex;flex-direction:column;gap:6px; }
    .genius-result-card {
      display:flex;align-items:center;gap:10px;
      padding:10px 12px;border-radius:12px;
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:all 0.18s;
    }
    .genius-result-card:hover {
      background:rgba(232,197,71,0.07);
      border-color:rgba(232,197,71,0.25);
      transform:translateX(2px);
    }
    .genius-result-card.selected {
      background:rgba(232,197,71,0.1);
      border-color:rgba(232,197,71,0.5);
    }
    .genius-art {
      width:42px;height:42px;border-radius:8px;
      object-fit:cover;flex-shrink:0;
      background:rgba(255,255,255,0.05);
    }
    .genius-info { flex:1;min-width:0; }
    .genius-song {
      font-size:0.82rem;font-weight:700;color:#fff;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .genius-artist {
      font-size:0.7rem;color:rgba(255,255,255,0.45);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      margin-top:1px;
    }
    .genius-use-tag {
      flex-shrink:0;font-size:0.58rem;font-family:'Space Mono',monospace;
      letter-spacing:1px;text-transform:uppercase;
      padding:4px 9px;border-radius:6px;
      background:rgba(232,197,71,0.08);
      color:rgba(232,197,71,0.7);
      border:1px solid rgba(232,197,71,0.2);
      transition:all 0.15s;
    }
    .genius-result-card:hover .genius-use-tag {
      background:rgba(232,197,71,0.15);
      color:#E8C547;border-color:rgba(232,197,71,0.4);
    }
    .genius-result-card.selected .genius-use-tag {
      background:#E8C547;color:#0B0B0D;border-color:#E8C547;
    }

    /* ── YouTube preview card ── */
    .yt-card {
      margin-top:8px;border-radius:12px;overflow:hidden;
      border:1px solid rgba(255,255,255,0.08);
      background:rgba(255,255,255,0.03);
      animation:fadeUp 0.25s ease;
    }
    @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .yt-card-inner {
      display:flex;align-items:center;gap:10px;padding:10px 12px;
    }
    .yt-thumb {
      width:68px;height:48px;border-radius:7px;
      object-fit:cover;flex-shrink:0;background:#111;
    }
    .yt-info { flex:1;min-width:0; }
    .yt-title {
      font-size:0.75rem;font-weight:700;color:#fff;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      line-height:1.3;
    }
    .yt-channel {
      font-size:0.65rem;color:rgba(255,255,255,0.4);
      margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .yt-use-btn {
      flex-shrink:0;padding:7px 13px;border-radius:8px;
      background:#E8C547;color:#0B0B0D;
      font-family:'Space Mono',monospace;font-size:0.58rem;
      font-weight:700;letter-spacing:1px;text-transform:uppercase;
      border:none;cursor:pointer;transition:all 0.18s;white-space:nowrap;
    }
    .yt-use-btn:hover:not(:disabled){background:#f5d454;transform:scale(1.04);}
    .yt-use-btn.confirmed{background:#4ade80;color:#0B0B0D;cursor:default;}
    .yt-loading {
      display:flex;align-items:center;gap:9px;
      padding:13px 14px;
      font-size:0.72rem;color:rgba(255,255,255,0.35);
      font-family:'Space Mono',monospace;letter-spacing:0.5px;
    }

    /* ── Autocomplete dropdown ── */
    .yt-autocomplete {
      position:absolute;left:0;right:0;top:calc(100% + 4px);
      z-index:1000;
      background:#18181c;
      border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;overflow:hidden;
      box-shadow:0 16px 48px rgba(0,0,0,0.6);
      animation:fadeUp 0.18s ease;
    }
    .yt-ac-item {
      display:flex;align-items:center;gap:10px;
      padding:9px 13px;cursor:pointer;
      border-bottom:1px solid rgba(255,255,255,0.04);
      transition:background 0.12s;
    }
    .yt-ac-item:last-child{border-bottom:none;}
    .yt-ac-item:hover{background:rgba(232,197,71,0.07);}
    .yt-ac-thumb {
      width:38px;height:27px;border-radius:5px;
      object-fit:cover;flex-shrink:0;background:#222;
    }
    .yt-ac-song {
      font-size:0.78rem;font-weight:600;color:#fff;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .yt-ac-artist {
      font-size:0.65rem;color:rgba(255,255,255,0.4);
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }

    /* ── Song input wrapper ── */
    .song-input-wrap { position:relative; }
  `;
  document.head.appendChild(s);
}

/* ── SEARCH STATE ── */
let youtubeData    = null;
let ytConfirmed    = false;
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

  // Create identify button below textarea
  const textArea = document.getElementById('textInput');
  if (!textArea || document.getElementById('geniusIdentifyBtn')) return;

  const btn = document.createElement('button');
  btn.id    = 'geniusIdentifyBtn';
  btn.type  = 'button';
  btn.innerHTML = `<span>✦</span> Identify Song`;
  textArea.parentNode.insertBefore(btn, textArea.nextSibling);

  // Manual button click
  btn.onclick = () => {
    const lyric = textArea.value.trim();
    if (lyric.length < 5) { showToast('Type a lyric first'); return; }
    runGeniusSearch(lyric);
  };

  // Auto-trigger: 20+ chars AND stopped typing for 1.2s
  textArea.addEventListener('input', () => {
    clearTimeout(geniusTimer);
    const val = textArea.value.trim();

    // Only auto-search if song fields are empty (don't override manual entry)
    const songFilled = document.getElementById('songInput')?.value.trim();
    if (val.length >= 20 && !songFilled) {
      // Show button as active hint
      btn.classList.add('active');
      geniusTimer = setTimeout(() => {
        if (val === lastGeniusQuery) return; // don't repeat same search
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

  // Loading state
  if (btn) {
    btn.innerHTML = `<span class="m-spinner"></span> Searching…`;
    btn.disabled  = true;
  }

  // Remove old results
  document.getElementById('geniusResultsList')?.remove();

  try {
    const res  = await fetch(`/api/genius?lyric=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (btn) { btn.innerHTML = `<span>✦</span> Identify Song`; btn.disabled = false; }

    if (!res.ok || !data.results?.length) {
      if (query.length > 20) showToast('No song found — try a different line');
      return;
    }
    renderGeniusResults(data.results);

  } catch (err) {
    if (btn) { btn.innerHTML = `<span>✦</span> Identify Song`; btn.disabled = false; }
  }
}

function renderGeniusResults(results) {
  document.getElementById('geniusResultsList')?.remove();

  const wrap = document.createElement('div');
  wrap.id    = 'geniusResultsList';

  const label = document.createElement('div');
  label.className   = 'genius-section-label';
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
      ${r.artwork
        ? `<img src="${r.artwork}" class="genius-art" alt=""/>`
        : `<div class="genius-art"></div>`}
      <div class="genius-info">
        <div class="genius-song">${songName}</div>
        <div class="genius-artist">${artistName}</div>
      </div>
      <span class="genius-use-tag">Use →</span>
    `;
    card.onclick = () => selectGeniusResult({ ...r, song: songName, artist: artistName }, card);
    list.appendChild(card);
  });

  wrap.appendChild(list);

  // Insert after identify button
  const btn = document.getElementById('geniusIdentifyBtn');
  btn?.parentNode?.insertBefore(wrap, btn.nextSibling);
}

function selectGeniusResult(result, card) {
  document.querySelectorAll('.genius-result-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  card.querySelector('.genius-use-tag').textContent = '✓';

  geniusResult = result;

  // Auto-fill song + artist
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   songEl.value   = result.song;
  if (artistEl) artistEl.value = result.artist;

  // Switch to share mode
  if (currentMode !== 'share') document.querySelector('[data-mode="share"]')?.click();

  // Fetch YouTube
  clearYoutubePreview();
  fetchYoutubeData(result.song, result.artist);

  // Collapse after 1s
  setTimeout(() => { document.getElementById('geniusResultsList')?.remove(); }, 1000);
}

/* ============================================================
   YOUTUBE ENGINE
   ============================================================ */
function initYoutubeAutofetch() {
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (!songEl || !artistEl) return;

  // Wrap song input for dropdown positioning
  if (!songEl.parentElement.classList.contains('song-input-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'song-input-wrap';
    songEl.parentNode.insertBefore(wrap, songEl);
    wrap.appendChild(songEl);
  }

  // Song field: autocomplete suggestions
  songEl.addEventListener('input', () => {
    clearTimeout(ytSuggestTimer);
    clearTimeout(ytFetchTimer);
    closeAutocomplete();
    const val = songEl.value.trim();
    if (val.length < 2) { clearYoutubePreview(); return; }
    ytSuggestTimer = setTimeout(() => fetchYoutubeSuggestions(val), 350);
  });

  songEl.addEventListener('blur', () => setTimeout(closeAutocomplete, 180));

  // Artist field: trigger full video fetch
  artistEl.addEventListener('input', () => {
    clearTimeout(ytFetchTimer);
    const song   = songEl.value.trim();
    const artist = artistEl.value.trim();
    if (song.length > 1 && artist.length > 1 && !ytConfirmed) {
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
  drop.id    = 'ytAutocomplete';
  drop.className = 'yt-autocomplete';

  suggestions.slice(0, 4).forEach(s => {
    const item = document.createElement('div');
    item.className = 'yt-ac-item';
    item.innerHTML = `
      ${s.thumbnail
        ? `<img src="${s.thumbnail}" class="yt-ac-thumb" alt=""/>`
        : `<div class="yt-ac-thumb"></div>`}
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
  showYtLoading();
  youtubeData = null; ytConfirmed = false;
  try {
    const res  = await fetch(`/api/youtube?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`);
    const data = await res.json();
    if (!res.ok || data.error) { clearYoutubePreview(); return; }
    youtubeData = data;
    renderYtCard(data);
  } catch (_) { clearYoutubePreview(); }
}

function showYtLoading() {
  clearYoutubePreview();
  const card = document.createElement('div');
  card.id = 'youtubePreview';
  card.className = 'yt-card';
  card.innerHTML = `<div class="yt-loading"><span class="m-spinner"></span>Finding video…</div>`;
  insertAfterArtist(card);
}

function renderYtCard(data) {
  clearYoutubePreview();
  const card = document.createElement('div');
  card.id = 'youtubePreview';
  card.className = 'yt-card';
  card.innerHTML = `
    <div class="yt-card-inner">
      ${data.thumbnailSm || data.thumbnail
        ? `<img src="${data.thumbnailSm||data.thumbnail}" class="yt-thumb" alt=""/>`
        : ''}
      <div class="yt-info">
        <div class="yt-title">${decodeHTML(data.title)}</div>
        <div class="yt-channel">${decodeHTML(data.channel)}</div>
      </div>
      <button class="yt-use-btn" id="ytUseBtn" type="button">Use this ✓</button>
    </div>
  `;
  insertAfterArtist(card);
  document.getElementById('ytUseBtn').onclick = () => confirmYt(data);
}

function confirmYt(data) {
  ytConfirmed = true; youtubeData = data;
  const btn = document.getElementById('ytUseBtn');
  if (btn) { btn.textContent = '✓ Confirmed'; btn.classList.add('confirmed'); btn.disabled = true; }
  const ytLink = document.getElementById('youtubeLink');
  if (ytLink && !ytLink.value && data.youtubeUrl) ytLink.value = data.youtubeUrl;
  showToast('Video confirmed ✓');
}

function insertAfterArtist(el) {
  const artistEl = document.getElementById('artistInput');
  artistEl?.parentNode?.insertBefore(el, artistEl.nextSibling);
}

function clearYoutubePreview() {
  youtubeData = null; ytConfirmed = false;
  document.getElementById('youtubePreview')?.remove();
}

/* ============================================================
   COMPOSER INIT
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

  postBtn.onclick = submitPost;
  initGeniusIdentify();
  initYoutubeAutofetch();

  document.getElementById('submitGuess').onclick    = submitGuess;
  document.getElementById('submitDiscover').onclick = submitDiscover;
  analyticsBtn.onclick = openAnalytics;
  document.getElementById('closeAnalytics').onclick = () => { closeModal(analyticsModal); openModal(postcardModal); };
  listenPostcard.onclick = () => {
    const idx = posts.findIndex(p => p.id === currentPost?.id);
    if (idx !== -1) { closeModal(postcardModal); window.openListen(idx); }
  };
  document.getElementById('closeGuess').onclick    = () => { closeModal(guessModal); currentGuessAttempts = 0; };
  document.getElementById('closeDiscover').onclick = () => closeModal(discoverModal);
  document.getElementById('closePostcard').onclick = () => closeModal(postcardModal);
  document.getElementById('closeListen').onclick   = () => closeModal(listenModal);
}

/* ── Post submission ── */
async function submitPost() {
  if (postBtn.disabled) return;
  let text = textInput.value.trim();
  if (!text)            { showToast('Please enter a lyric'); return; }
  if (!selectedEmotion) { showToast('Please select a vibe'); return; }

  if (containsBannedWord(text)) {
    text = censorText(text);
    textInput.value = text;
    charCount.textContent = text.length;
    showToast('Some words were adjusted for community guidelines 🎵');
  }

  let post = {
    text, emotion: selectedEmotion, mode: currentMode,
    community: selectedEmotion, status: 'active', flagCount: 0,
    knowledge: { song: 'Unknown Song', artist: 'Unknown Artist' },
    guessConfig: null,
    youtubeMeta: (youtubeData && ytConfirmed) ? {
      videoId:    youtubeData.videoId    || null,
      title:      decodeHTML(youtubeData.title || ''),
      thumbnail:  youtubeData.thumbnail  || null,
      channel:    decodeHTML(youtubeData.channel || ''),
      youtubeUrl: youtubeData.youtubeUrl || null,
      embedUrl:   youtubeData.embedUrl   || null,
    } : null,
    links: currentMode !== 'discover' ? {
      spotify:    spotifyLink?.value.trim()                               || null,
      apple:      appleLink?.value.trim()                                 || null,
      youtube:    (ytConfirmed && youtubeData?.youtubeUrl) || youtubeLink?.value.trim() || null,
      soundcloud: soundcloudLink?.value.trim()                            || null,
    } : null,
    authorId:  userId,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now()
  };

  try {
    if (currentMode === 'share') {
      if (!songInput.value.trim() || !artistInput.value.trim())
        throw new Error('Please enter song and artist');
      post.knowledge = {
        song:   decodeHTML(songInput.value.trim()),
        artist: decodeHTML(artistInput.value.trim())
      };
    }
    if (currentMode === 'guess') {
      const doSong = guessSongCheck.checked, doArtist = guessArtistCheck.checked;
      if (!doSong && !doArtist) throw new Error('Select at least one thing to guess');
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

  postBtn.disabled = true; postBtn.textContent = 'Posting…';
  try {
    if (isFirebaseEnabled) {
      const ref = await postsRef.push(post);
      await analyticsRef.child(ref.key).set({ views: 0, guesses: [], helps: [] });
    }
    showToast('Posted!');
    newPostsAvailable = false;
    renderFeed(); resetComposer(); closeModal(composer);
  } catch (err) {
    console.error(err); showToast(err.message || 'Error posting.');
  } finally {
    postBtn.disabled = false; postBtn.textContent = 'Post';
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

/* ── View post (postcard) ── */
window.viewPost = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  document.getElementById('postcardLyric').textContent   = currentPost.text;
  document.getElementById('postcardEmotion').textContent = currentPost.emotion || 'Nostalgia';

  const k      = currentPost.knowledge || { song:'Unknown Song', artist:'Unknown Artist' };
  const songEl = document.getElementById('postcardSong');
  const meta   = currentPost.youtubeMeta;

  if (currentPost.mode === 'guess') {
    songEl.innerHTML = `<div style="font-style:italic;color:var(--text-2)">Guess correctly to reveal</div>`;
  } else {
    const thumbHtml = meta?.thumbnail
      ? `<img src="${meta.thumbnail}" style="width:80px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0" alt=""/>`
      : '';
    songEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        ${thumbHtml}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${k.song}</div>
          <div style="font-size:0.8rem;color:var(--text-2)">${k.artist}</div>
          ${meta?.channel ? `<div style="font-size:0.7rem;color:rgba(255,255,255,0.35)">${meta.channel}</div>` : ''}
        </div>
      </div>
      ${meta?.youtubeUrl ? `
        <a href="${meta.youtubeUrl}" target="_blank" rel="noopener noreferrer"
          style="display:block;margin-top:8px;width:100%;padding:9px;border-radius:8px;
          background:rgba(255,0,0,0.07);border:1px solid rgba(255,0,0,0.18);
          color:#ff5555;text-align:center;font-size:0.78rem;
          text-decoration:none;font-family:inherit;transition:background 0.2s;"
          onmouseover="this.style.background='rgba(255,0,0,0.12)'"
          onmouseout="this.style.background='rgba(255,0,0,0.07)'">
          ▶ Watch on YouTube
        </a>` : ''}
    `;
  }

  document.getElementById('postcardCommunity').innerHTML = '';
  const hasLinks = currentPost.links &&
    (currentPost.links.spotify||currentPost.links.apple||currentPost.links.youtube||currentPost.links.soundcloud);
  listenPostcard.style.display = (hasLinks && currentPost.mode !== 'guess') ? 'block' : 'none';
  openModal(postcardModal);
};

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
  document.getElementById('guessHint').textContent = `${MAX_GUESS_ATTEMPTS} attempts to guess the ${what.join(' and ')}.`;
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
    resultEl.innerHTML=`Correct! 🎉<br><span style="font-size:0.8rem">"${k.song}" by ${k.artist}</span>`;
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
    resultEl.innerHTML=`Out of attempts<br><span style="font-size:0.8rem">It was: "${k.song}" by ${k.artist}</span>`;
    document.getElementById('submitGuess').style.display='none';
    document.getElementById('guessInputFields').style.display='none';
    return;
  }
  const ps=doSong&&gs&&(gs===as||gs.includes(as)||as.includes(gs));
  const pa=doArtist&&ga&&(ga===aa||ga.includes(aa)||aa.includes(ga));
  resultEl.className=`result-msg ${(ps||pa)?'result-partial':'result-error'}`;
  let msg=(ps||pa)?'Partially correct — ':'Incorrect — ';
  if(doSong)  msg+=`Song: ${ps?'✓':'✗'} `;
  if(doArtist)msg+=`Artist: ${pa?'✓':'✗'} `;
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
  if(!song||!artist){showToast('Please enter both song and artist');return;}
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
  showToast('Thanks for helping!'); closeModal(discoverModal);
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
        <div class="activity-result ${g.correct?'correct':'incorrect'}">${g.correct?'✓ Correct':'✗ Incorrect'}</div>
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
  closeModal(postcardModal); openModal(analyticsModal);
}
