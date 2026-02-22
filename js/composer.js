/* ============================================================
   MARGO — js/composer.js
   Composer modal, post submission, guess, discover,
   listen, postcard, and analytics interactions.
   Depends on: state.js, firebase.js, feed.js (renderFeed, timeAgo)
   v4.7
   ============================================================ */

/* ==============================
   MODERATION ENGINE v4
   Normalized profanity auto-replace
   + phonetic variation detection
   ============================== */

const BANNED_PATTERNS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "cunt",
  "whore",
  "slut",
  "pussy",
  "dick",
  "cock",
  "bastard",
  "piss",
  "damn",
  "ass"
];

// Phonetic and common bypass variations per word
const BANNED_VARIATIONS = {
  fuck:    ["fuk", "fck", "fuq", "phuck", "fux"],
  shit:    ["sh1t", "sht"],
  bitch:   ["biatch", "b1tch"],
  pussy:   ["pus5y", "puss1", "pussi"],
  dick:    ["d1ck", "dik", "dic"],
  cock:    ["c0ck", "cok"],
  bastard: ["b4stard"],
  ass:     ["a55", "@ss"],
  nigger:  ["n1gger", "nigg3r", "nig"],
};

// Normalize text: lowercase → strip non-alpha → collapse repeated letters
// Catches: f*ck, f.u.c.k, fuuuuck, FUCK, FuCk, etc.
function normalizeText(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')   // remove symbols, spaces, punctuation
    .replace(/(.)\1+/g, '$1');   // collapse repeated letters (fuuuck → fuck)
}

// Returns true if the text contains any banned word or variation after normalization
function containsBannedWord(text) {
  const normalized = normalizeText(text);

  return BANNED_PATTERNS.some(word => {
    // Check the core word
    if (normalized.includes(normalizeText(word))) return true;

    // Check phonetic/bypass variations
    const variations = BANNED_VARIATIONS[word];
    if (variations) {
      return variations.some(v => normalized.includes(normalizeText(v)));
    }

    return false;
  });
}

// Auto-replace banned words and their variations with censored versions
// e.g. fuck → f**k, shit → s**t, bitch → b***h
function censorText(text) {
  let result = text;

  BANNED_PATTERNS.forEach(word => {
    // Build censor mask: first + last letter, stars in between
    const censored = word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];

    // 1. Plain literal match (case-insensitive)
    const literalRegex = new RegExp(word, 'gi');
    result = result.replace(literalRegex, censored);

    // 2. Symbol-separated variants: f*ck, f.u.c.k, f_u_c_k etc.
    const fuzzyRegex = new RegExp(
      word.split('').join('[^a-zA-Z]*'),
      'gi'
    );
    result = result.replace(fuzzyRegex, censored);

    // 3. Phonetic/bypass variations: fuk, fuq, phuck, d1ck etc.
    if (BANNED_VARIATIONS[word]) {
      BANNED_VARIATIONS[word].forEach(variant => {
        const variantRegex = new RegExp(variant, 'gi');
        result = result.replace(variantRegex, censored);
      });
    }
  });

  return result;
}

/* ============================================================
   END MODERATION ENGINE
   ============================================================ */


function initComposer() {
  // ── Char counter ──
  textInput.oninput = () => { charCount.textContent = textInput.value.length; };

  // ── Mode selector ──
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
    };
  });

  // ── Emotion/vibe pills ──
  document.querySelectorAll('.emotion-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEmotion = btn.dataset.emotion;
    };
  });

  // ── Post button ──
  postBtn.onclick = submitPost;

  // ── Guess submission ──
  document.getElementById('submitGuess').onclick = submitGuess;

  // ── Discover submission ──
  document.getElementById('submitDiscover').onclick = submitDiscover;

  // ── Analytics ──
  analyticsBtn.onclick = openAnalytics;
  document.getElementById('closeAnalytics').onclick = () => {
    closeModal(analyticsModal);
    openModal(postcardModal);
  };

  // ── Listen from postcard ──
  listenPostcard.onclick = () => {
    const idx = posts.findIndex(p => p.id === currentPost?.id);
    if (idx !== -1) { closeModal(postcardModal); window.openListen(idx); }
  };

  // ── Modal close buttons ──
  document.getElementById('closeGuess').onclick    = () => { closeModal(guessModal); currentGuessAttempts = 0; };
  document.getElementById('closeDiscover').onclick = () => closeModal(discoverModal);
  document.getElementById('closePostcard').onclick = () => closeModal(postcardModal);
  document.getElementById('closeListen').onclick   = () => closeModal(listenModal);
}

// ── Post submission ──
async function submitPost() {
  if (postBtn.disabled) return;
  let text = textInput.value.trim();
  if (!text)            { showToast('Please enter a lyric'); return; }
  if (!selectedEmotion) { showToast('Please select a vibe'); return; }

  // ── Moderation: auto-replace banned words, notify user transparently ──
  if (containsBannedWord(text)) {
    text = censorText(text);
    textInput.value = text;              // show the user exactly what changed
    charCount.textContent = text.length;
    showToast('Some words were adjusted for community guidelines 🎵');
  }

  let post = {
    text,
    emotion:    selectedEmotion,
    mode:       currentMode,
    community:  selectedEmotion,
    status:     'active',
    flagCount:  0,
    knowledge:  { song: 'Unknown Song', artist: 'Unknown Artist' },
    guessConfig: null,
    links: currentMode !== 'discover' ? {
      spotify:    spotifyLink.value.trim()    || null,
      apple:      appleLink.value.trim()      || null,
      youtube:    youtubeLink.value.trim()    || null,
      soundcloud: soundcloudLink.value.trim() || null
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
      const doSong   = guessSongCheck.checked;
      const doArtist = guessArtistCheck.checked;
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

  postBtn.disabled    = true;
  postBtn.textContent = 'Posting…';
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
    postBtn.disabled    = false;
    postBtn.textContent = 'Post';
  }
}

function resetComposer() {
  textInput.value = '';
  songInput.value = '';
  artistInput.value = '';
  guessSongAnswer.value   = '';
  guessArtistAnswer.value = '';
  discoverSongInput.value   = '';
  discoverArtistInput.value = '';
  if (spotifyLink)    spotifyLink.value    = '';
  if (appleLink)      appleLink.value      = '';
  if (youtubeLink)    youtubeLink.value    = '';
  if (soundcloudLink) soundcloudLink.value = '';
  charCount.textContent = '0';
  selectedEmotion = null;
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
  modeBtns.forEach((b, i) => b.classList.toggle('active', i === 0));
  currentMode = 'share';
  shareInputs.classList.add('show');
  guessInputs.classList.remove('show');
  discoverInputs.classList.remove('show');
  streamingSection.style.display = 'block';
  guessSongCheck.checked   = true;
  guessArtistCheck.checked = true;
  // Reset inspire wrap (v4.3 — dormant until Gemini key added)
  const inspireWrap        = document.getElementById('inspireWrap');
  const inspireSuggestions = document.getElementById('inspireSuggestions');
  if (inspireWrap)        inspireWrap.style.display = 'none';
  if (inspireSuggestions) { inspireSuggestions.innerHTML = ''; inspireSuggestions.style.display = 'none'; }
}

// ── View post (postcard) ──
window.viewPost = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  document.getElementById('postcardLyric').textContent   = currentPost.text;
  document.getElementById('postcardEmotion').textContent = currentPost.emotion || 'Nostalgia';
  const k      = currentPost.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
  const songEl = document.getElementById('postcardSong');
  if (currentPost.mode === 'guess') {
    songEl.innerHTML = `<div style="font-style:italic;color:var(--text-2)">Guess correctly to reveal</div>`;
  } else {
    songEl.innerHTML = `<div>${k.song}</div><div>${k.artist}</div>`;
  }
  document.getElementById('postcardCommunity').innerHTML = '';
  const hasLinks = currentPost.links &&
    (currentPost.links.spotify || currentPost.links.apple ||
     currentPost.links.youtube || currentPost.links.soundcloud);
  listenPostcard.style.display = (hasLinks && currentPost.mode !== 'guess') ? 'block' : 'none';
  openModal(postcardModal);
};

// ── Listen ──
window.openListen = function(index) {
  currentPost = posts[index];
  if (!currentPost?.links) { showToast('No streaming links'); return; }
  const ll = document.getElementById('listenLinks');
  ll.innerHTML = '';
  let has = false;
  [['Spotify','spotify'],['Apple Music','apple'],['YouTube','youtube'],['SoundCloud','soundcloud']]
    .forEach(([name, key]) => {
      if (currentPost.links[key]) {
        has = true;
        const a = document.createElement('a');
        a.className = 'listen-link';
        a.href      = currentPost.links[key];
        a.target    = '_blank';
        a.rel       = 'noopener noreferrer';
        a.textContent = name;
        ll.appendChild(a);
      }
    });
  if (!has) { showToast('No streaming links available'); return; }
  openModal(listenModal);
};

// ── Guess ──
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
  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  document.getElementById('guessSongInput').style.display   = doSong   ? 'block' : 'none';
  document.getElementById('guessArtistInput').style.display = doArtist ? 'block' : 'none';
  const what = [];
  if (doSong)   what.push('song');
  if (doArtist) what.push('artist');
  document.getElementById('guessHint').textContent = `${MAX_GUESS_ATTEMPTS} attempts to guess the ${what.join(' and ')}.`;
  openModal(guessModal);
};

function submitGuess() {
  if (!currentPost) return;
  currentGuessAttempts++;
  const k        = currentPost.knowledge || {};
  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  const gs = document.getElementById('guessSongInput').value.trim().toLowerCase();
  const ga = document.getElementById('guessArtistInput').value.trim().toLowerCase();
  const as = (k.song   || '').toLowerCase();
  const aa = (k.artist || '').toLowerCase();
  const songOk   = !doSong   || (gs && (gs === as || gs.includes(as) || as.includes(gs)));
  const artistOk = !doArtist || (ga && (ga === aa || ga.includes(aa) || aa.includes(ga)));
  const correct  = songOk && artistOk;

  if (isFirebaseEnabled)
    analyticsRef.child(currentPost.id).child('guesses')
      .push({ song: gs||null, artist: ga||null, correct, timestamp: Date.now() });

  const resultEl = document.getElementById('guessResult');
  resultEl.classList.remove('hidden','result-success','result-error','result-partial');

  if (correct) {
    resultEl.className = 'result-msg result-success';
    resultEl.innerHTML = `Correct! 🎉<br><span style="font-size:0.8rem">"${k.song}" by ${k.artist}</span>`;
    document.getElementById('submitGuess').style.display      = 'none';
    document.getElementById('guessInputFields').style.display = 'none';
    if (currentPost.links) {
      const ll  = document.getElementById('guessLinksSection');
      let html  = '<div class="guess-links-title">Listen</div>';
      if (currentPost.links.spotify)    html += `<a href="${currentPost.links.spotify}"    target="_blank" class="guess-link">Spotify</a>`;
      if (currentPost.links.apple)      html += `<a href="${currentPost.links.apple}"      target="_blank" class="guess-link">Apple Music</a>`;
      if (currentPost.links.youtube)    html += `<a href="${currentPost.links.youtube}"    target="_blank" class="guess-link">YouTube</a>`;
      if (currentPost.links.soundcloud) html += `<a href="${currentPost.links.soundcloud}" target="_blank" class="guess-link">SoundCloud</a>`;
      ll.innerHTML = html;
      ll.classList.remove('hidden');
    }
    return;
  }

  const left = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
  if (left <= 0) {
    resultEl.className = 'result-msg result-error';
    resultEl.innerHTML = `Out of attempts<br><span style="font-size:0.8rem">It was: "${k.song}" by ${k.artist}</span>`;
    document.getElementById('submitGuess').style.display      = 'none';
    document.getElementById('guessInputFields').style.display = 'none';
    return;
  }

  const ps = doSong   && gs && (gs === as || gs.includes(as) || as.includes(gs));
  const pa = doArtist && ga && (ga === aa || ga.includes(aa) || aa.includes(ga));
  resultEl.className = `result-msg ${(ps || pa) ? 'result-partial' : 'result-error'}`;
  let msg = (ps || pa) ? 'Partially correct — ' : 'Incorrect — ';
  if (doSong)   msg += `Song: ${ps ? '✓' : '✗'} `;
  if (doArtist) msg += `Artist: ${pa ? '✓' : '✗'} `;
  msg += `(${left} left)`;
  resultEl.innerHTML = msg;
  document.getElementById('guessSongInput').value   = '';
  document.getElementById('guessArtistInput').value = '';
}

// ── Discover ──
window.openDiscover = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  ['discoverLyric','discoverSongAnswer','discoverArtistAnswer',
   'discoverSpotifyLink','discoverAppleLink','discoverYoutubeLink','discoverSoundcloudLink']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { id === 'discoverLyric' ? el.textContent = currentPost.text : el.value = ''; }
    });
  openModal(discoverModal);
};

function submitDiscover() {
  const song   = document.getElementById('discoverSongAnswer').value.trim();
  const artist = document.getElementById('discoverArtistAnswer').value.trim();
  if (!song || !artist) { showToast('Please enter both song and artist'); return; }
  const helpData = {
    song, artist,
    links: {
      spotify:    document.getElementById('discoverSpotifyLink').value.trim()    || null,
      apple:      document.getElementById('discoverAppleLink').value.trim()      || null,
      youtube:    document.getElementById('discoverYoutubeLink').value.trim()    || null,
      soundcloud: document.getElementById('discoverSoundcloudLink').value.trim() || null
    },
    timestamp: Date.now()
  };
  if (isFirebaseEnabled) analyticsRef.child(currentPost.id).child('helps').push(helpData);
  showToast('Thanks for helping!');
  closeModal(discoverModal);
}

// ── Analytics ──
function openAnalytics() {
  if (!currentPost) return;
  const an      = postAnalytics[currentPost.id] || { views: 0 };
  const guesses = Object.values(an.guesses || {});
  const helps   = Object.values(an.helps   || {});
  const body    = document.getElementById('analyticsBody');

  let html = `<div class="analytics-grid">
    <div class="stat-card"><div class="stat-num">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if (currentPost.mode === 'guess')
    html += `<div class="stat-card"><div class="stat-num">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if (currentPost.mode === 'discover')
    html += `<div class="stat-card"><div class="stat-num">${helps.length}</div><div class="stat-label">Identifications</div></div>`;
  html += '</div>';
  body.innerHTML = html;

  if (currentPost.mode === 'guess' && guesses.length) {
    let sec = '<div class="activity-section"><h4>Guesses</h4><div class="activity-list">';
    guesses.forEach(g => {
      sec += `<div class="activity-item ${g.correct ? 'correct' : 'incorrect'}">
        <div class="activity-guess">${g.song ? 'Song: ' + g.song : ''}${g.artist ? (g.song ? ' · ' : '') + 'Artist: ' + g.artist : ''}</div>
        <div class="activity-result ${g.correct ? 'correct' : 'incorrect'}">${g.correct ? '✓ Correct' : '✗ Incorrect'}</div>
        <div class="activity-time">${timeAgo(g.timestamp)}</div>
      </div>`;
    });
    body.innerHTML += sec + '</div></div>';
  }

  if (currentPost.mode === 'discover' && helps.length) {
    let sec = '<div class="activity-section"><h4>Community Identifications</h4><div class="activity-list">';
    helps.forEach(h => {
      const linkParts = [];
      if (h.links?.spotify)    linkParts.push(`<a href="${h.links.spotify}"    target="_blank" class="help-link">Spotify</a>`);
      if (h.links?.apple)      linkParts.push(`<a href="${h.links.apple}"      target="_blank" class="help-link">Apple</a>`);
      if (h.links?.youtube)    linkParts.push(`<a href="${h.links.youtube}"    target="_blank" class="help-link">YouTube</a>`);
      if (h.links?.soundcloud) linkParts.push(`<a href="${h.links.soundcloud}" target="_blank" class="help-link">SoundCloud</a>`);
      sec += `<div class="activity-item">
        <div class="activity-guess"><strong>${h.song || '?'}</strong> — ${h.artist || '?'}</div>
        ${linkParts.length ? `<div class="help-links-row">${linkParts.join('')}</div>` : ''}
        <div class="activity-time">${timeAgo(h.timestamp)}</div>
      </div>`;
    });
    body.innerHTML += sec + '</div></div>';
  }

  closeModal(postcardModal);
  openModal(analyticsModal);
}
