function initComposer() {
  injectComposerStyles();
  textInput.oninput = () => { charCount.textContent = textInput.value.length; };

  // Mode buttons hidden — always share
  currentMode = 'share';
  if (typeof shareInputs !== 'undefined' && shareInputs) shareInputs.classList.add('show');

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
    justPostBtn.id          = 'justPostLink';
    justPostBtn.type        = 'button';
    justPostBtn.textContent = 'or just post without creating';
    justPostBtn.onclick     = () => submitPost(false);

    const parent = postBtn.parentNode;
    parent.insertBefore(pacBtn, postBtn);
    parent.insertBefore(justPostBtn, postBtn);
    postBtn.style.display = 'none';
  }

  initGeniusIdentify();
  initYoutubeAutofetch();

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
  if (analyticsBtn)     analyticsBtn.onclick     = openAnalytics;
  if (closeAnalyticsEl) closeAnalyticsEl.onclick = () => closeModal(analyticsModal);

  // null-guarded — postcard removed in concept-v2
  if (typeof listenPostcard !== 'undefined' && listenPostcard) {
    listenPostcard.onclick = () => {
      const idx = posts.findIndex(p => p.id === currentPost?.id);
      if (idx !== -1) window.openListen(idx);
    };
  }
  const closePostcardEl = document.getElementById('closePostcard');
  if (closePostcardEl) {
    closePostcardEl.onclick = () => {
      if (typeof postcardModal !== 'undefined' && postcardModal) closeModal(postcardModal);
    };
  }
}

/* ============================================================
   POST SUBMISSION
   FIX 3 — loading overlay cleared explicitly
   FIX 4 — postedPost snapshot passed directly to openShareSheet
            so GIF/Poster canvas never reads stale window.currentPost
   ============================================================ */
async function submitPost(openChooser = true) {
  const pacBtn      = document.getElementById('postAndCreateBtn');
  const justPostBtn = document.getElementById('justPostLink');
  if (pacBtn?.disabled) return;

  let text = textInput.value.trim();
  if (!text)            { showToast('Add a lyric first'); return; }
  if (!selectedEmotion) { showToast('Pick a feeling'); return; }

  if (containsBannedWord(text)) {
    text = censorText(text);
    textInput.value = text;
    charCount.textContent = text.length;
    showToast('Some words were adjusted for community guidelines');
  }

  // Always share mode
  const songVal   = typeof songInput   !== 'undefined' ? (songInput?.value.trim()   || '') : '';
  const artistVal = typeof artistInput !== 'undefined' ? (artistInput?.value.trim() || '') : '';
  if (!songVal || !artistVal) { showToast('Add the song title and artist'); return; }

  const savedYtMeta = youtubeData ? {
    videoId:     youtubeData.videoId     || null,
    title:       decodeHTML(youtubeData.title   || ''),
    thumbnail:   youtubeData.thumbnail   || null,
    thumbnailSm: youtubeData.thumbnailSm || youtubeData.thumbnail || null,
    channel:     decodeHTML(youtubeData.channel || ''),
    youtubeUrl:  youtubeData.youtubeUrl  || null,
    embedUrl:    youtubeData.embedUrl    || null,
  } : null;

  const post = {
    text,
    emotion:     selectedEmotion,
    mode:        'share',
    community:   selectedEmotion,
    status:      'active',
    flagCount:   0,
    knowledge:   { song: decodeHTML(songVal), artist: decodeHTML(artistVal) },
    guessConfig: null,
    youtubeMeta: savedYtMeta,
    links: {
      spotify:    typeof spotifyLink    !== 'undefined' ? (spotifyLink?.value.trim()    || null) : null,
      apple:      typeof appleLink      !== 'undefined' ? (appleLink?.value.trim()      || null) : null,
      youtube:    youtubeData?.youtubeUrl || (typeof youtubeLink !== 'undefined' ? (youtubeLink?.value.trim() || null) : null),
      soundcloud: typeof soundcloudLink !== 'undefined' ? (soundcloudLink?.value.trim() || null) : null,
    },
    authorId:  userId,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
  };

  if (pacBtn)      { pacBtn.disabled = true;      pacBtn.innerHTML = '<span class="m-spinner"></span> Posting…'; }
  if (justPostBtn) { justPostBtn.disabled = true; }

  try {
    let savedPostId = null;

    if (isFirebaseEnabled) {
      const ref = await postsRef.push(post);
      savedPostId = ref.key;
      await analyticsRef.child(ref.key).set({ views: 0, guesses: [], helps: [] });

      if (!post.youtubeMeta
          && post.knowledge.song   !== 'Unknown Song'
          && post.knowledge.artist !== 'Unknown Artist'
          && typeof fetchAndSaveYoutubeMeta === 'function') {
        fetchAndSaveYoutubeMeta(ref.key, post.knowledge.song, post.knowledge.artist).catch(() => {});
      }
    }

    // FIX 4 — snapshot with real id, pass directly everywhere
    const postedPost = { ...post, id: savedPostId };
    window.currentPost = postedPost;

    newPostsAvailable = false;

    // FIX 3 — clear stuck loading overlay (the long circle)
    [
      document.getElementById('feedLoadingOverlay'),
      document.querySelector('.feed-loading-overlay'),
      document.querySelector('.loading-circle-overlay'),
      document.querySelector('.loading-overlay'),
      document.querySelector('[class*="loading"]'),
    ].forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.classList.add('hidden');
      }
    });

    renderFeed();
    resetComposer();
    closeModal(composer);

    if (openChooser) {
      setTimeout(() => {
        showToast('Posted — now make it visual');
        if (typeof openStudioChooser === 'function') {
          openStudioChooser();
        } else if (typeof openShareSheet === 'function') {
          // FIX 4 — pass postedPost directly, not just currentPost
          openShareSheet(postedPost);
        }
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
    if (typeof postBtn !== 'undefined' && postBtn) postBtn.disabled = false;
  }
}

function resetComposer() {
  if (typeof textInput   !== 'undefined' && textInput)   textInput.value   = '';
  if (typeof songInput   !== 'undefined' && songInput)   songInput.value   = '';
  if (typeof artistInput !== 'undefined' && artistInput) artistInput.value = '';
  if (typeof guessSongAnswer   !== 'undefined' && guessSongAnswer)   guessSongAnswer.value   = '';
  if (typeof guessArtistAnswer !== 'undefined' && guessArtistAnswer) guessArtistAnswer.value = '';
  if (typeof discoverSongInput   !== 'undefined' && discoverSongInput)   discoverSongInput.value   = '';
  if (typeof discoverArtistInput !== 'undefined' && discoverArtistInput) discoverArtistInput.value = '';
  if (typeof spotifyLink    !== 'undefined' && spotifyLink)    spotifyLink.value    = '';
  if (typeof appleLink      !== 'undefined' && appleLink)      appleLink.value      = '';
  if (typeof youtubeLink    !== 'undefined' && youtubeLink)    youtubeLink.value    = '';
  if (typeof soundcloudLink !== 'undefined' && soundcloudLink) soundcloudLink.value = '';
  if (typeof charCount      !== 'undefined' && charCount)      charCount.textContent = '0';

  selectedEmotion = null; geniusResult = null; lastGeniusQuery = '';
  currentMode = 'share';
  clearYoutubePreview(); closeAutocomplete();
  document.getElementById('geniusResultsList')?.remove();
  document.getElementById('geniusIdentifyBtn')?.classList.remove('active');
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));

  if (typeof modeBtns !== 'undefined' && modeBtns?.length) modeBtns.forEach((b,i) => b.classList.toggle('active', i===0));
  if (typeof shareInputs     !== 'undefined' && shareInputs)    shareInputs.classList.add('show');
  if (typeof guessInputs     !== 'undefined' && guessInputs)    guessInputs.classList.remove('show');
  if (typeof discoverInputs  !== 'undefined' && discoverInputs) discoverInputs.classList.remove('show');
  if (typeof streamingSection !== 'undefined' && streamingSection) streamingSection.style.display = 'block';
  if (typeof guessSongCheck   !== 'undefined' && guessSongCheck)   guessSongCheck.checked   = true;
  if (typeof guessArtistCheck !== 'undefined' && guessArtistCheck) guessArtistCheck.checked = true;

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

