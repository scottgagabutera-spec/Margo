function initComposer() {
  injectComposerStyles();
  // Wire textInput lazily — it lives inside lyricEditWrap which is injected later
  setTimeout(function(){
    var ta  = document.getElementById("textInput");
    var cc  = document.getElementById("charCount");
    if(ta && cc) ta.oninput = function(){ cc.textContent = ta.value.length; };
  }, 400);

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
  const pacBtn         = document.getElementById('postAndCreateBtn');
  const privateCardBtn = document.getElementById('privateCardBtn');
  if (pacBtn)          pacBtn.onclick        = () => submitPost('post+visual');
  if (privateCardBtn)  privateCardBtn.onclick = () => submitPost('create');

  initGeniusIdentify();
  initYoutubeAutofetch();

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
async function submitPost(mode = 'post+visual') {
  const pacBtn      = document.getElementById('postAndCreateBtn');
  const pvtBtn      = document.getElementById('privateCardBtn');
  if (pacBtn?.disabled || pvtBtn?.disabled) return;

  // Sync confirm inputs → hidden fields (fallback in case oninput was missed)
    var _sci = document.getElementById('songConfirmInput');
    var _aci = document.getElementById('artistConfirmInput');
    var _sih = getSongInput();
    var _aih = getArtistInput();
    if(_sci && _sih && _sci.value.trim()) _sih.value = _sci.value.trim();
    if(_aci && _aih && _aci.value.trim()) _aih.value = _aci.value.trim();
    let text = (getTextInput() ? getTextInput().value.trim() : '');
  if (!text)            { showToast('Add a lyric first'); return; }
  if (!selectedEmotion) { showToast('Pick a feeling'); return; }

  if (containsBannedWord(text)) {
    text = censorText(text);
    textInput.value = text;
    charCount.textContent = text.length;
    showToast('Some words were adjusted for community guidelines');
  }

  // Always share mode
  const songVal   = getSongInput()   ? (getSongInput().value.trim()   || '') : '';
  const artistVal = getArtistInput() ? (getArtistInput().value.trim() || '') : '';
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
    knowledge:   { 
      song:       decodeHTML(songVal), 
      artist:     decodeHTML(artistVal),
      artwork:    geniusResult?.artwork     || null,
      artworkFull:geniusResult?.artworkFull || null,
      geniusId:   geniusResult?.id          || null,
      album:          geniusResult?.album           || null,
      releaseDate:    geniusResult?.releaseDate      || null,
      featuredArtists:geniusResult?.featuredArtists  || [],
      writers:        geniusResult?.writers          || [],
      producers:      geniusResult?.producers        || [],
    },
    guessConfig: null,
    youtubeMeta: savedYtMeta,
    links: {
      spotify:    typeof spotifyLink    !== 'undefined' ? (spotifyLink?.value.trim()    || null) : null,
      apple:      typeof appleLink      !== 'undefined' ? (appleLink?.value.trim()      || null) : null,
      youtube:    youtubeData?.youtubeUrl || (typeof youtubeLink !== 'undefined' ? (youtubeLink?.value.trim() || null) : null),
      soundcloud: typeof soundcloudLink !== 'undefined' ? (soundcloudLink?.value.trim() || null) : null,
    },
    authorId:  userId,
    username:  typeof getUsername === 'function' ? getUsername() : null,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
    lang:    navigator.language.split("-")[0] || "en",
    country: navigator.language.split("-")[1] || null,
  };

  if (pacBtn)      { pacBtn.disabled = true;      pacBtn.innerHTML = '<span class="m-spinner"></span> Sharing…'; }
  if (pvtBtn)      { pvtBtn.disabled = true; }

  try {
    let savedPostId = null;

    if (isFirebaseEnabled && mode !== 'create') {
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

    setTimeout(() => renderFeed(), 0);
    resetComposer();
    closeModal(composer);

    if (mode === 'post+visual') {
      setTimeout(() => {
        if (typeof openShareSheet === 'function') openShareSheet(postedPost);
      }, 120);
    } else if (mode === 'post') {
      showToast('Your lyric is live.');
    } else if (mode === 'create') {
      setTimeout(() => {
        if (typeof openShareSheet === 'function') openShareSheet(postedPost);
      }, 120);
    }

  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong. Try again.');
  } finally {
    if (pacBtn)         { pacBtn.disabled = false;         pacBtn.innerHTML = 'Share Lyric'; }
    const _pvtBtn = document.getElementById('privateCardBtn');
    if (_pvtBtn)        { _pvtBtn.disabled = false; }
    if (typeof postBtn !== 'undefined' && postBtn) postBtn.disabled = false;
  }
}

function resetComposer() {
  var _ti = getTextInput(); if(_ti) _ti.value = '';
  var _si = getSongInput(); if(_si) _si.value = '';
  var _ai = getArtistInput(); if(_ai) _ai.value = '';
  if (typeof guessSongAnswer   !== 'undefined' && guessSongAnswer)   guessSongAnswer.value   = '';
  if (typeof guessArtistAnswer !== 'undefined' && guessArtistAnswer) guessArtistAnswer.value = '';
  if (typeof discoverSongInput   !== 'undefined' && discoverSongInput)   discoverSongInput.value   = '';
  if (typeof discoverArtistInput !== 'undefined' && discoverArtistInput) discoverArtistInput.value = '';
  if (typeof spotifyLink    !== 'undefined' && spotifyLink)    spotifyLink.value    = '';
  if (typeof appleLink      !== 'undefined' && appleLink)      appleLink.value      = '';
  if (typeof youtubeLink    !== 'undefined' && youtubeLink)    youtubeLink.value    = '';
  if (typeof soundcloudLink !== 'undefined' && soundcloudLink) soundcloudLink.value = '';
  var _cc = getCharCount(); if(_cc) _cc.textContent = '0';

  selectedEmotion = null; geniusResult = null; lastGeniusQuery = '';
  // Reset smart search UI
  var ssi = document.getElementById("smartSearchInput");
  if(ssi) ssi.value = "";
  var sf  = ssi && ssi.closest(".smart-search-field");
  if(sf)  sf.style.display = "";
  if(typeof clearSongSelection === "function") clearSongSelection();
  if(typeof hideLyricChip     === "function") hideLyricChip();
  if(typeof hideVibeSection   === "function") hideVibeSection();
  var lw = document.getElementById("lyricEditWrap");
  if(lw) lw.classList.add("hidden");
  currentMode = 'share';
  clearYoutubePreview(); closeAutocomplete();
  document.getElementById('geniusResultsList')?.remove();
  document.getElementById('geniusIdentifyBtn')?.classList.remove('active');
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));

  if (typeof shareInputs     !== 'undefined' && shareInputs)    shareInputs.classList.add('show');

  const is = document.getElementById('inspireSuggestions');
  
  if (is) { is.innerHTML = ''; is.style.display = 'none'; }
}
