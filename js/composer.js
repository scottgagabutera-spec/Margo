/* ============================================================
   MARGO — js/composer.js
   v5.0 — Genius lyric ID + YouTube autocomplete + premium UX
   ============================================================ */

/* ── MODERATION ENGINE ── */
const BANNED_PATTERNS = [
  "fuck","shit","bitch","asshole","nigger","cunt",
  "whore","slut","pussy","dick","cock","bastard","piss","damn","ass"
];
const BANNED_VARIATIONS = {
  fuck:["fuk","fck","fuq","phuck","fux"], shit:["sh1t","sht"],
  bitch:["biatch","b1tch"], pussy:["pus5y","puss1","pussi"],
  dick:["d1ck","dik","dic"], cock:["c0ck","cok"],
  bastard:["b4stard"], ass:["a55","@ss"], nigger:["n1gger","nigg3r","nig"],
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
    (BANNED_VARIATIONS[w]||[]).forEach(v=>{ r=r.replace(new RegExp(v,'gi'),c); });
  });
  return r;
}

/* ── SEARCH STATE ── */
let youtubeData       = null;  // confirmed YouTube result
let geniusResult      = null;  // confirmed Genius result
let ytSuggestTimer    = null;
let geniusTimer       = null;
let ytConfirmed       = false; // true once user clicks "Use this"

/* ============================================================
   GENIUS ENGINE — identify song from lyric text
   ============================================================ */
function initGeniusIdentify() {
  // Add identify button below lyric textarea
  const textArea = document.getElementById('textInput');
  if (!textArea) return;

  let btn = document.getElementById('geniusIdentifyBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id   = 'geniusIdentifyBtn';
    btn.type = 'button';
    btn.innerHTML = `<span class="genius-btn-icon">✦</span> Identify Song`;
    btn.style.cssText = `
      width:100%;margin-top:6px;padding:11px 16px;
      border-radius:12px;border:1px dashed rgba(232,197,71,0.35);
      background:rgba(232,197,71,0.05);
      color:#E8C547;font-family:'Space Mono',monospace;
      font-size:0.6rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;
      cursor:pointer;transition:all 0.25s;display:flex;align-items:center;
      justify-content:center;gap:8px;
    `;
    btn.onmouseenter = () => { btn.style.background='rgba(232,197,71,0.1)'; btn.style.borderColor='rgba(232,197,71,0.6)'; };
    btn.onmouseleave = () => { btn.style.background='rgba(232,197,71,0.05)'; btn.style.borderColor='rgba(232,197,71,0.35)'; };
    textArea.parentNode.insertBefore(btn, textArea.nextSibling);
  }

  btn.onclick = async () => {
    const lyric = document.getElementById('textInput').value.trim();
    if (!lyric || lyric.length < 5) { showToast('Type a lyric first'); return; }
    await runGeniusSearch(lyric, btn);
  };
}

async function runGeniusSearch(query, btn) {
  // Loading state
  const origHTML = btn.innerHTML;
  btn.innerHTML  = `<span class="genius-spinner"></span> Searching…`;
  btn.disabled   = true;
  btn.style.opacity = '0.7';

  // Add spinner style if not present
  if (!document.getElementById('geniusSpinnerStyle')) {
    const s = document.createElement('style');
    s.id = 'geniusSpinnerStyle';
    s.textContent = `
      .genius-spinner {
        width:12px;height:12px;border-radius:50%;
        border:2px solid rgba(232,197,71,0.3);
        border-top-color:#E8C547;
        animation:gspin 0.7s linear infinite;display:inline-block;
      }
      @keyframes gspin { to { transform:rotate(360deg); } }
      .genius-results-list { display:flex;flex-direction:column;gap:8px;margin-top:10px; }
      .genius-result-card {
        display:flex;align-items:center;gap:10px;padding:10px 12px;
        border-radius:12px;background:rgba(255,255,255,0.03);
        border:1px solid rgba(255,255,255,0.08);cursor:pointer;
        transition:all 0.2s;
      }
      .genius-result-card:hover { background:rgba(232,197,71,0.08);border-color:rgba(232,197,71,0.3); }
      .genius-result-card.selected { background:rgba(232,197,71,0.12);border-color:#E8C547; }
      .genius-result-art { width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;background:#1a1a1a; }
      .genius-result-info { flex:1;min-width:0; }
      .genius-result-song { font-size:0.8rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .genius-result-artist { font-size:0.7rem;color:var(--text-2,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .genius-select-badge {
        font-size:0.6rem;font-family:'Space Mono',monospace;letter-spacing:1px;
        text-transform:uppercase;padding:4px 8px;border-radius:6px;
        background:rgba(232,197,71,0.1);color:#E8C547;border:1px solid rgba(232,197,71,0.3);
        white-space:nowrap;flex-shrink:0;
      }
      .yt-preview-card {
        border-radius:14px;overflow:hidden;margin-top:10px;
        border:1px solid rgba(255,255,255,0.08);
        background:rgba(255,255,255,0.03);
        animation:fadeSlideUp 0.3s ease;
      }
      @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .yt-preview-inner { display:flex;align-items:center;gap:12px;padding:10px 12px; }
      .yt-preview-thumb { width:72px;height:50px;border-radius:8px;object-fit:cover;flex-shrink:0; }
      .yt-preview-info { flex:1;min-width:0; }
      .yt-preview-title { font-size:0.78rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .yt-preview-channel { font-size:0.68rem;color:var(--text-2,#888); }
      .yt-use-btn {
        flex-shrink:0;padding:7px 14px;border-radius:8px;
        background:#E8C547;color:#0B0B0D;
        font-family:'Space Mono',monospace;font-size:0.6rem;
        font-weight:700;letter-spacing:1px;text-transform:uppercase;
        border:none;cursor:pointer;transition:all 0.2s;white-space:nowrap;
      }
      .yt-use-btn:hover { background:#f5d454;transform:scale(1.03); }
      .yt-use-btn.confirmed { background:#4ade80;color:#0B0B0D; }
      .yt-loading { padding:12px;text-align:center;font-size:0.72rem;color:var(--text-2,#888);display:flex;align-items:center;justify-content:center;gap:8px; }
      .song-autocomplete-dropdown {
        position:absolute;z-index:999;left:0;right:0;
        background:#1a1a1f;border:1px solid rgba(255,255,255,0.1);
        border-radius:12px;overflow:hidden;margin-top:4px;
        box-shadow:0 16px 40px rgba(0,0,0,0.5);
        animation:fadeSlideUp 0.2s ease;
      }
      .autocomplete-item {
        display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
        transition:background 0.15s;border-bottom:1px solid rgba(255,255,255,0.05);
      }
      .autocomplete-item:last-child { border-bottom:none; }
      .autocomplete-item:hover { background:rgba(232,197,71,0.08); }
      .autocomplete-thumb { width:36px;height:26px;border-radius:5px;object-fit:cover;flex-shrink:0;background:#222; }
      .autocomplete-song { font-size:0.78rem;font-weight:600;color:#fff; }
      .autocomplete-artist { font-size:0.68rem;color:var(--text-2,#888); }
    `;
    document.head.appendChild(s);
  }

  try {
    const res  = await fetch(`/api/genius?lyric=${encodeURIComponent(query)}`);
    const data = await res.json();

    btn.innerHTML = origHTML;
    btn.disabled  = false;
    btn.style.opacity = '1';

    if (!res.ok || data.error || !data.results?.length) {
      showToast('No song found — try a different line');
      return;
    }

    renderGeniusResults(data.results);

  } catch (err) {
    btn.innerHTML = origHTML;
    btn.disabled  = false;
    btn.style.opacity = '1';
    showToast('Search failed — check connection');
  }
}

function renderGeniusResults(results) {
  // Remove old results
  document.getElementById('geniusResultsList')?.remove();

  const list = document.createElement('div');
  list.id    = 'geniusResultsList';
  list.className = 'genius-results-list';

  const label = document.createElement('div');
  label.style.cssText = 'font-size:0.65rem;color:var(--text-2,#888);letter-spacing:1.5px;text-transform:uppercase;font-family:"Space Mono",monospace;margin-bottom:2px;';
  label.textContent = 'Select the right song';
  list.appendChild(label);

  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'genius-result-card';
    card.innerHTML = `
      ${r.artwork ? `<img src="${r.artwork}" class="genius-result-art" alt=""/>` : '<div class="genius-result-art"></div>'}
      <div class="genius-result-info">
        <div class="genius-result-song">${r.song}</div>
        <div class="genius-result-artist">${r.artist}</div>
      </div>
      <span class="genius-select-badge">Use →</span>
    `;
    card.onclick = () => selectGeniusResult(r, card);
    list.appendChild(card);
  });

  // Insert after identify button
  const btn = document.getElementById('geniusIdentifyBtn');
  btn.parentNode.insertBefore(list, btn.nextSibling);
}

function selectGeniusResult(result, card) {
  // Highlight selected
  document.querySelectorAll('.genius-result-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  card.querySelector('.genius-select-badge').textContent = '✓ Selected';

  geniusResult = result;

  // Auto-fill song + artist fields
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   { songEl.value   = result.song;   songEl.dispatchEvent(new Event('input')); }
  if (artistEl) { artistEl.value = result.artist; }

  // Switch to share mode if not already
  if (currentMode !== 'share') {
    document.querySelector('[data-mode="share"]')?.click();
  }

  // Trigger YouTube fetch
  clearYoutubePreview();
  ytConfirmed = false;
  fetchYoutubeData(result.song, result.artist);

  // Collapse results after short delay
  setTimeout(() => {
    document.getElementById('geniusResultsList')?.remove();
  }, 1200);
}

/* ============================================================
   YOUTUBE ENGINE — autocomplete + video fetch
   ============================================================ */

function initYoutubeAutofetch() {
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (!songEl || !artistEl) return;

  // Song field — show autocomplete dropdown
  songEl.addEventListener('input', () => {
    clearTimeout(ytSuggestTimer);
    const val = songEl.value.trim();
    closeAutocomplete();
    if (val.length < 2) { clearYoutubePreview(); return; }
    ytSuggestTimer = setTimeout(() => fetchYoutubeSuggestions(val), 400);
  });

  songEl.addEventListener('blur', () => {
    setTimeout(closeAutocomplete, 200);
  });

  // Artist field — trigger full YouTube fetch when both filled
  artistEl.addEventListener('input', () => {
    clearTimeout(ytSuggestTimer);
    const song   = songEl.value.trim();
    const artist = artistEl.value.trim();
    if (song.length > 1 && artist.length > 1 && !ytConfirmed) {
      ytSuggestTimer = setTimeout(() => fetchYoutubeData(song, artist), 800);
    }
  });

  // Make song input container relative for dropdown
  songEl.style.position = 'relative';
  const wrap = songEl.parentElement;
  if (wrap) wrap.style.position = 'relative';
}

async function fetchYoutubeSuggestions(query) {
  try {
    const res  = await fetch(`/api/youtube?suggest=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok || !data.suggestions?.length) return;
    renderAutocompleteDropdown(data.suggestions);
  } catch (err) {
    // Silent fail for autocomplete
  }
}

function renderAutocompleteDropdown(suggestions) {
  closeAutocomplete();
  const songEl = document.getElementById('songInput');
  if (!songEl) return;

  const dropdown = document.createElement('div');
  dropdown.id    = 'ytAutocomplete';
  dropdown.className = 'song-autocomplete-dropdown';

  suggestions.slice(0, 4).forEach(s => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.innerHTML = `
      ${s.thumbnail ? `<img src="${s.thumbnail}" class="autocomplete-thumb" alt=""/>` : '<div class="autocomplete-thumb"></div>'}
      <div>
        <div class="autocomplete-song">${s.song}</div>
        <div class="autocomplete-artist">${s.artist}</div>
      </div>
    `;
    item.onmousedown = (e) => {
      e.preventDefault();
      selectAutocompleteItem(s);
    };
    dropdown.appendChild(item);
  });

  // Position below song input
  const rect = songEl.getBoundingClientRect();
  const modal = document.getElementById('composer');
  const modalRect = modal?.getBoundingClientRect();

  dropdown.style.cssText += `
    position:absolute;
    top:${songEl.offsetTop + songEl.offsetHeight + 4}px;
    left:0;right:0;
  `;

  songEl.parentElement.style.position = 'relative';
  songEl.parentElement.appendChild(dropdown);
}

function selectAutocompleteItem(suggestion) {
  closeAutocomplete();
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   songEl.value   = suggestion.song;
  if (artistEl) artistEl.value = suggestion.artist;

  // Directly fetch YouTube with this video
  clearYoutubePreview();
  ytConfirmed = false;
  fetchYoutubeData(suggestion.song, suggestion.artist);
}

function closeAutocomplete() {
  document.getElementById('ytAutocomplete')?.remove();
}

async function fetchYoutubeData(song, artist) {
  showYoutubeLoading();
  youtubeData = null;
  ytConfirmed = false;

  try {
    const res  = await fetch(`/api/youtube?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`);
    const data = await res.json();

    if (!res.ok || data.error) { clearYoutubePreview(); return; }

    youtubeData = data;
    renderYoutubeCard(data);

  } catch (err) {
    clearYoutubePreview();
  }
}

function showYoutubeLoading() {
  clearYoutubePreview();
  const card = document.createElement('div');
  card.id    = 'youtubePreview';
  card.className = 'yt-preview-card';
  card.innerHTML = `<div class="yt-loading"><span class="genius-spinner"></span> Finding video…</div>`;
  insertAfterArtist(card);
}

function renderYoutubeCard(data) {
  clearYoutubePreview();
  const card = document.createElement('div');
  card.id    = 'youtubePreview';
  card.className = 'yt-preview-card';
  card.innerHTML = `
    <div class="yt-preview-inner">
      ${data.thumbnailSm || data.thumbnail
        ? `<img src="${data.thumbnailSm || data.thumbnail}" class="yt-preview-thumb" alt=""/>`
        : ''}
      <div class="yt-preview-info">
        <div class="yt-preview-title">${data.title}</div>
        <div class="yt-preview-channel">${data.channel}</div>
      </div>
      <button class="yt-use-btn" id="ytUseBtn" type="button">Use this ✓</button>
    </div>
  `;
  insertAfterArtist(card);

  document.getElementById('ytUseBtn').onclick = () => confirmYoutubeResult(data);
}

function confirmYoutubeResult(data) {
  ytConfirmed  = true;
  youtubeData  = data;

  const btn = document.getElementById('ytUseBtn');
  if (btn) {
    btn.textContent = '✓ Confirmed';
    btn.classList.add('confirmed');
    btn.disabled = true;
  }

  // Auto-fill YouTube link
  const ytLinkEl = document.getElementById('youtubeLink');
  if (ytLinkEl && !ytLinkEl.value && data.youtubeUrl) {
    ytLinkEl.value = data.youtubeUrl;
  }

  showToast('Video confirmed ✓');
}

function insertAfterArtist(el) {
  const artistEl = document.getElementById('artistInput');
  artistEl?.parentNode?.insertBefore(el, artistEl.nextSibling);
}

function clearYoutubePreview() {
  youtubeData = null;
  ytConfirmed = false;
  document.getElementById('youtubePreview')?.remove();
}

/* ============================================================
   COMPOSER INIT
   ============================================================ */
function initComposer() {
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
      clearYoutubePreview();
      closeAutocomplete();
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

  document.getElementById('submitGuess').onclick   = submitGuess;
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
    youtubeMeta: youtubeData && ytConfirmed ? {
      videoId:    youtubeData.videoId    || null,
      title:      youtubeData.title      || null,
      thumbnail:  youtubeData.thumbnail  || null,
      channel:    youtubeData.channel    || null,
      youtubeUrl: youtubeData.youtubeUrl || null,
      embedUrl:   youtubeData.embedUrl   || null,
    } : null,
    links: currentMode !== 'discover' ? {
      spotify:    spotifyLink.value.trim()                           || null,
      apple:      appleLink.value.trim()                             || null,
      youtube:    (ytConfirmed && youtubeData?.youtubeUrl) || youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim()                        || null,
    } : null,
    authorId:  userId,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now()
  };

  try {
    if (currentMode === 'share') {
      if (!songInput.value.trim() || !artistInput.value.trim())
        throw new Error('Please enter song and artist');
      post.knowledge = { song: songInput.value.trim(), artist: artistInput.value.trim() };
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
    renderFeed();
    resetComposer();
    closeModal(composer);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error posting.');
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
  selectedEmotion = null; geniusResult = null;
  clearYoutubePreview(); closeAutocomplete();
  document.getElementById('geniusResultsList')?.remove();
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
          ${meta?.channel ? `<div style="font-size:0.7rem;color:var(--text-3,#555)">${meta.channel}</div>` : ''}
        </div>
      </div>
      ${meta?.youtubeUrl ? `
        <a href="${meta.youtubeUrl}" target="_blank" rel="noopener noreferrer"
          style="display:block;margin-top:8px;width:100%;padding:9px;border-radius:8px;
          background:rgba(255,0,0,0.08);border:1px solid rgba(255,0,0,0.2);
          color:#ff4444;text-align:center;font-size:0.8rem;text-decoration:none;font-family:inherit">
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
  document.getElementById('guessLyric').textContent    = currentPost.text;
  document.getElementById('guessSongInput').value      = '';
  document.getElementById('guessArtistInput').value    = '';
  document.getElementById('guessResult').className     = 'result-msg hidden';
  document.getElementById('guessLinksSection').className = 'guess-links hidden';
  document.getElementById('guessInputFields').style.display = '';
  document.getElementById('submitGuess').style.display      = '';
  document.getElementById('revealAnswer').style.display     = 'none';
  const doSong=currentPost.guessConfig?.guessSong??true, doArtist=currentPost.guessConfig?.guessArtist??true;
  document.getElementById('guessSongInput').style.display   = doSong   ? 'block' : 'none';
  document.getElementById('guessArtistInput').style.display = doArtist ? 'block' : 'none';
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
  const songOk=!doSong||(gs&&(gs===as||gs.includes(as)||as.includes(gs)));
  const artistOk=!doArtist||(ga&&(ga===aa||ga.includes(aa)||aa.includes(ga)));
  const correct=songOk&&artistOk;

  if (isFirebaseEnabled)
    analyticsRef.child(currentPost.id).child('guesses').push({song:gs||null,artist:ga||null,correct,timestamp:Date.now()});

  const resultEl=document.getElementById('guessResult');
  resultEl.classList.remove('hidden','result-success','result-error','result-partial');

  if (correct) {
    resultEl.className='result-msg result-success';
    resultEl.innerHTML=`Correct! 🎉<br><span style="font-size:0.8rem">"${k.song}" by ${k.artist}</span>`;
    const meta=currentPost.youtubeMeta;
    if (meta?.thumbnail) resultEl.innerHTML+=`<br><img src="${meta.thumbnail}" style="width:100%;border-radius:8px;margin-top:8px;object-fit:cover" alt=""/>`;
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
  currentPost=posts[index];
  if(!currentPost)return;
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
  const song=document.getElementById('discoverSongAnswer').value.trim();
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
  showToast('Thanks for helping!');
  closeModal(discoverModal);
}

/* ── Analytics ── */
function openAnalytics() {
  if(!currentPost)return;
  const an=postAnalytics[currentPost.id]||{views:0};
  const guesses=Object.values(an.guesses||{});
  const helps=Object.values(an.helps||{});
  const body=document.getElementById('analyticsBody');
  let html=`<div class="analytics-grid"><div class="stat-card"><div class="stat-num">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if(currentPost.mode==='guess')   html+=`<div class="stat-card"><div class="stat-num">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if(currentPost.mode==='discover')html+=`<div class="stat-card"><div class="stat-num">${helps.length}</div><div class="stat-label">Identifications</div></div>`;
  html+='</div>';
  body.innerHTML=html;

  if(currentPost.mode==='guess'&&guesses.length){
    let sec='<div class="activity-section"><h4>Guesses</h4><div class="activity-list">';
    guesses.forEach(g=>{
      sec+=`<div class="activity-item ${g.correct?'correct':'incorrect'}">
        <div class="activity-guess">${g.song?'Song: '+g.song:''}${g.artist?(g.song?' · ':')+'Artist: '+g.artist':''}</div>
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

  closeModal(postcardModal);
  openModal(analyticsModal);
}
