/* MARGO - Improved with Per-User Tracking & Partial Correct Feedback */

// ===== ELEMENTS =====
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");
const guessModal = document.getElementById("guessModal");
const discoverModal = document.getElementById("discoverModal");
const postcardModal = document.getElementById("postcardModal");
const listenModal = document.getElementById("listenModal");
const analyticsModal = document.getElementById("analyticsModal");
const sharePosterModal = document.getElementById("sharePosterModal");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

// Mode
const modeBtns = document.querySelectorAll(".mode-btn");
const shareInputs = document.getElementById("shareInputs");
const guessInputs = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");
const streamingSection = document.getElementById("streamingSection");

// Share mode inputs
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

// Guess mode inputs
const guessSongCheck = document.getElementById("guessSongCheck");
const guessArtistCheck = document.getElementById("guessArtistCheck");
const guessSongAnswer = document.getElementById("guessSongAnswer");
const guessArtistAnswer = document.getElementById("guessArtistAnswer");

// Discover mode inputs
const discoverSongInput = document.getElementById("discoverSongInput");
const discoverArtistInput = document.getElementById("discoverArtistInput");

// Streaming links
const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

// Guess modal
const closeGuess = document.getElementById("closeGuess");
const guessLyric = document.getElementById("guessLyric");
const guessHint = document.getElementById("guessHint");
const guessSongInput = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const submitGuess = document.getElementById("submitGuess");
const revealAnswer = document.getElementById("revealAnswer");
const guessResult = document.getElementById("guessResult");
const guessInputFields = document.getElementById("guessInputFields");
const guessLinksSection = document.getElementById("guessLinksSection");

// Discover modal
const closeDiscover = document.getElementById("closeDiscover");
const discoverLyric = document.getElementById("discoverLyric");
const discoverSongAnswer = document.getElementById("discoverSongAnswer");
const discoverArtistAnswer = document.getElementById("discoverArtistAnswer");
const submitDiscover = document.getElementById("submitDiscover");
const discoverSpotifyLink = document.getElementById("discoverSpotifyLink");
const discoverAppleLink = document.getElementById("discoverAppleLink");
const discoverYoutubeLink = document.getElementById("discoverYoutubeLink");
const discoverSoundcloudLink = document.getElementById("discoverSoundcloudLink");

// Listen modal
const closeListen = document.getElementById("closeListen");
const listenLinks = document.getElementById("listenLinks");

// Postcard modal
const closePostcard = document.getElementById("closePostcard");
const postcardLyric = document.getElementById("postcardLyric");
const postcardEmotion = document.getElementById("postcardEmotion");
const postcardSong = document.getElementById("postcardSong");
const sharePosterBtn = document.getElementById("sharePosterBtn");
const listenPostcard = document.getElementById("listenPostcard");
const analyticsBtn = document.getElementById("analyticsBtn");

// Analytics modal
const closeAnalytics = document.getElementById("closeAnalytics");
const statViews = document.getElementById("statViews");
const statGuesses = document.getElementById("statGuesses");
const statHelps = document.getElementById("statHelps");
const guessesSection = document.getElementById("guessesSection");
const helpsSection = document.getElementById("helpsSection");
const guessesList = document.getElementById("guessesList");
const helpsList = document.getElementById("helpsList");

// Share Poster modal
const closeSharePoster = document.getElementById("closeSharePoster");
const designStep = document.getElementById("designStep");
const platformStep = document.getElementById("platformStep");
const previewStep = document.getElementById("previewStep");
const nextToPlatform = document.getElementById("nextToPlatform");
const backToDesign = document.getElementById("backToDesign");
const posterCanvas = document.getElementById("posterCanvas");
const posterPreviewCanvas = document.getElementById("posterPreviewCanvas");
const downloadPoster = document.getElementById("downloadPoster");

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let currentPost = null;
let currentGuessAttempts = 0;
const MAX_GUESS_ATTEMPTS = 2;

let selectedDesign = "midnight-gold";
let selectedPosterSize = null;

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let postAnalytics = JSON.parse(localStorage.getItem("margoAnalytics") || "{}");

// ===== PER-USER TRACKING =====
// Generate unique user ID if not exists
let userId = localStorage.getItem("margoUserId");
if (!userId) {
  userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("margoUserId", userId);
}

// Track per-user guess states: { postId: { attempts: number, revealed: boolean, correct: boolean } }
let userGuessStates = JSON.parse(localStorage.getItem("margoUserGuessStates") || "{}");

// Initialize analytics for existing posts
posts.forEach(post => {
  if (!postAnalytics[post.id]) {
    postAnalytics[post.id] = {
      views: 0,
      guesses: [],
      helps: []
    };
  }
});

// ===== MODERN COLOR DESIGNS =====
const POSTER_DESIGNS = {
  'midnight-gold': {
    name: 'Midnight Gold',
    bg: ['#0d0d0d', '#1a1410', '#0d0d0d'],
    primary: '#d4af37',
    secondary: 'rgba(212, 175, 55, 0.7)',
    text: '#f8f8f8'
  },
  'royal-purple': {
    name: 'Royal Purple',
    bg: ['#1a0033', '#2d1b4e', '#1a0033'],
    primary: '#c77dff',
    secondary: 'rgba(199, 125, 255, 0.7)',
    text: '#f8f8f8'
  },
  'neon-cyan': {
    name: 'Neon Cyan',
    bg: ['#0a1420', '#142838', '#0a1420'],
    primary: '#00e5ff',
    secondary: 'rgba(0, 229, 255, 0.7)',
    text: '#f8f8f8'
  },
  'sunset-coral': {
    name: 'Sunset Coral',
    bg: ['#1a0a0a', '#2d1416', '#1a0a0a'],
    primary: '#ff6b6b',
    secondary: 'rgba(255, 107, 107, 0.7)',
    text: '#f8f8f8'
  },
  'emerald-night': {
    name: 'Emerald Night',
    bg: ['#051a0d', '#0d2e1a', '#051a0d'],
    primary: '#50fa7b',
    secondary: 'rgba(80, 250, 123, 0.7)',
    text: '#f8f8f8'
  },
  'rose-gold': {
    name: 'Rose Gold',
    bg: ['#1a0d0f', '#2d1a1f', '#1a0d0f'],
    primary: '#f4a4c0',
    secondary: 'rgba(244, 164, 192, 0.7)',
    text: '#f8f8f8'
  }
};

// ===== MODAL SCROLL FIX =====
function openModal(modal) {
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
}

function closeModal(modal) {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
}

// ===== SWIPE NAVIGATION =====
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const handleSwipe = () => {
  const diffX = touchStartX - touchEndX;
  const diffY = Math.abs(touchStartY - touchEndY);
  
  if (Math.abs(diffX) > diffY && Math.abs(diffX) > 100) {
    if (diffX > 0 && landing.classList.contains("active")) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
    } else if (diffX < 0 && feed.classList.contains("active")) {
      feed.classList.remove("active");
      landing.classList.add("active");
    }
  }
};

landing.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

landing.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].clientX;
  touchEndY = e.changedTouches[0].clientY;
  handleSwipe();
});

feed.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

feed.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].clientX;
  touchEndY = e.changedTouches[0].clientY;
  handleSwipe();
});

// ===== NAVIGATION =====
enterBtn.onclick = () => {
  landing.classList.remove("active");
  openModal(composer);
  textInput.focus();
};

backBtn.onclick = () => {
  feed.classList.remove("active");
  landing.classList.add("active");
};

openComposer.onclick = () => {
  openModal(composer);
  textInput.focus();
};

closeComposer.onclick = () => {
  closeModal(composer);
  resetComposer();
  if (!feed.classList.contains("active")) {
    landing.classList.add("active");
  }
};

closeGuess.onclick = () => {
  closeModal(guessModal);
  currentGuessAttempts = 0;
};

closeDiscover.onclick = () => {
  closeModal(discoverModal);
};

closePostcard.onclick = () => {
  closeModal(postcardModal);
};

closeListen.onclick = () => {
  closeModal(listenModal);
};

closeAnalytics.onclick = () => {
  closeModal(analyticsModal);
};

closeSharePoster.onclick = () => {
  closeModal(sharePosterModal);
  resetPosterModal();
};

// ===== CHARACTER COUNTER =====
textInput.oninput = () => {
  charCount.textContent = textInput.value.length;
};

// ===== MODE SELECTION =====
modeBtns.forEach(btn => {
  btn.onclick = () => {
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    shareInputs.classList.remove("active");
    guessInputs.classList.remove("active");
    discoverInputs.classList.remove("active");

    if (currentMode === "discover") {
      streamingSection.style.display = "none";
    } else {
      streamingSection.style.display = "block";
    }

    if (currentMode === "share") shareInputs.classList.add("active");
    if (currentMode === "guess") guessInputs.classList.add("active");
    if (currentMode === "discover") discoverInputs.classList.add("active");
  };
});

// ===== EMOTION SELECTION =====
document.querySelectorAll(".emotion-pill").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".emotion-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion = btn.dataset.emotion;
  };
});

// ===== CREATE POST =====
postBtn.onclick = async () => {
  if (postBtn.disabled) return;

  const text = textInput.value.trim();

  if (!text) {
    showToast("Please enter a lyric");
    return;
  }

  if (!selectedEmotion) {
    showToast("Please select an emotion");
    return;
  }

  let post = {
    text,
    emotion: selectedEmotion,
    mode: currentMode,
    knowledge: {},
    guessConfig: null,
    links: currentMode !== "discover" ? {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    } : null
  };

  try {
    if (currentMode === "share") {
      const song = songInput.value.trim();
      const artist = artistInput.value.trim();
      
      if (!song || !artist) {
        throw new Error("Please enter song and artist");
      }
      
      post.knowledge = { song, artist };
    }

    if (currentMode === "guess") {
      const songAnswer = guessSongAnswer.value.trim();
      const artistAnswer = guessArtistAnswer.value.trim();
      const allowSong = guessSongCheck.checked;
      const allowArtist = guessArtistCheck.checked;
      
      if (!allowSong && !allowArtist) {
        throw new Error("Select at least one thing to guess");
      }
      
      if (allowSong && !songAnswer) {
        throw new Error("Enter the correct song title");
      }
      
      if (allowArtist && !artistAnswer) {
        throw new Error("Enter the correct artist");
      }
      
      post.knowledge = {
        song: songAnswer,
        artist: artistAnswer,
        hidden: true
      };
      post.guessConfig = {
        guessSong: allowSong,
        guessArtist: allowArtist
      };
    }

    if (currentMode === "discover") {
      post.knowledge = {
        song: discoverSongInput.value.trim() || null,
        artist: discoverArtistInput.value.trim() || null
      };
    }
  } catch (err) {
    showToast(err.message);
    return;
  }

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    const newPost = {
      ...post,
      id: Date.now(),
      timestamp: Date.now()
    };
    
    posts.unshift(newPost);
    
    postAnalytics[newPost.id] = {
      views: 0,
      guesses: [],
      helps: []
    };
    
    if (posts.length > 50) {
      posts = posts.slice(0, 50);
    }
    
    try {
      localStorage.setItem("margoPosts", JSON.stringify(posts));
      localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
    } catch (storageErr) {
      console.warn("LocalStorage full:", storageErr);
      posts = posts.slice(0, 10);
      localStorage.setItem("margoPosts", JSON.stringify(posts));
    }

    showToast("Posted successfully!");
    feed.classList.add("active");
    landing.classList.remove("active");
    renderFeed();

    resetComposer();
    closeModal(composer);

  } catch (err) {
    console.error("Posting failed:", err);
    showToast(err.message || "Error posting. Please try again.");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
};

// ===== RESET COMPOSER =====
function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  guessSongAnswer.value = "";
  guessArtistAnswer.value = "";
  discoverSongInput.value = "";
  discoverArtistInput.value = "";
  spotifyLink.value = "";
  appleLink.value = "";
  youtubeLink.value = "";
  soundcloudLink.value = "";
  charCount.textContent = "0";
  selectedEmotion = null;
  
  document.querySelectorAll(".emotion-pill").forEach(b => b.classList.remove("active"));
  
  currentMode = "share";
  modeBtns.forEach(b => b.classList.remove("active"));
  modeBtns[0].classList.add("active");
  shareInputs.classList.add("active");
  guessInputs.classList.remove("active");
  discoverInputs.classList.remove("active");
  streamingSection.style.display = "block";
  
  guessSongCheck.checked = true;
  guessArtistCheck.checked = true;
}

// ===== RENDER FEED =====
function renderFeed() {
  feedList.innerHTML = "";
  
  if (posts.length === 0) {
    postCount.textContent = "0";
    feedList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">No posts yet. Be the first!</div>';
    return;
  }
  
  postCount.textContent = posts.length;

  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    
    const timeText = timeAgo(post.timestamp);
    
    let songSection = '';
    let actionsSection = '';
    
    const hasLinks = post.links && (
      post.links.spotify || 
      post.links.apple || 
      post.links.youtube || 
      post.links.soundcloud
    );
    
    if (post.mode === "share") {
      songSection = `
        <div class="feed-song">
          <div class="feed-song-title">${post.knowledge.song}</div>
          <div class="feed-song-artist">${post.knowledge.artist}</div>
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="viewPost(${index})">View</button>
          ${hasLinks ? '<button class="feed-action" onclick="openListen(' + index + ')">Listen</button>' : ''}
        </div>
      `;
    } 
    else if (post.mode === "guess") {
      const guessWhat = [];
      if (post.guessConfig?.guessSong) guessWhat.push("song");
      if (post.guessConfig?.guessArtist) guessWhat.push("artist");
      if (guessWhat.length === 0) {
        guessWhat.push("song", "artist");
      }
      const guessText = guessWhat.join(" & ");
      
      songSection = `
        <div class="mystery-badge">
          Guess the ${guessText}
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openGuess(${index})">Guess</button>
          <button class="feed-action" onclick="viewPost(${index})">View</button>
        </div>
      `;
    } 
    else if (post.mode === "discover") {
      songSection = `
        <div class="discover-badge">
          ${post.knowledge.song || post.knowledge.artist ? 
            'Maybe: ' + (post.knowledge.song || '?') + ' — ' + (post.knowledge.artist || '?') :
            'Help discover this song!'}
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openDiscover(${index})">Help Discover</button>
          <button class="feed-action" onclick="viewPost(${index})">View</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="feed-text">${post.text}</div>
      <div class="feed-emotion">${post.emotion}</div>
      ${songSection}
      <div class="feed-time">${timeText}</div>
      ${actionsSection}
    `;

    feedList.appendChild(card);
  });
}

// ===== TIME AGO =====
function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  
  if (mins < 1) return 'now';
  if (mins < 60) return mins + 'm';
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h';
  
  const days = Math.floor(hours / 24);
  return days + 'd';
}

// ===== TRACK VIEW =====
function trackView(postId) {
  if (!postAnalytics[postId]) {
    postAnalytics[postId] = { views: 0, guesses: [], helps: [] };
  }
  postAnalytics[postId].views++;
  localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
}

// ===== GET USER GUESS STATE =====
function getUserGuessState(postId) {
  if (!userGuessStates[postId]) {
    userGuessStates[postId] = {
      attempts: 0,
      revealed: false,
      correct: false
    };
  }
  return userGuessStates[postId];
}

// ===== SAVE USER GUESS STATE =====
function saveUserGuessState(postId, state) {
  userGuessStates[postId] = state;
  localStorage.setItem("margoUserGuessStates", JSON.stringify(userGuessStates));
}

// ===== OPEN GUESS MODAL =====
function openGuess(index) {
  currentPost = posts[index];
  
  trackView(currentPost.id);
  
  const userState = getUserGuessState(currentPost.id);
  currentGuessAttempts = userState.attempts;
  
  guessLyric.textContent = currentPost.text;
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  
  const songField = document.querySelector('#guessSongInput');
  const artistField = document.querySelector('#guessArtistInput');
  
  const guessSong = currentPost.guessConfig?.guessSong ?? true;
  const guessArtist = currentPost.guessConfig?.guessArtist ?? true;
  
  if (guessSong) {
    songField.style.display = 'block';
  } else {
    songField.style.display = 'none';
  }
  
  if (guessArtist) {
    artistField.style.display = 'block';
  } else {
    artistField.style.display = 'none';
  }
  
  // Check if user has already revealed or guessed correctly
  if (userState.revealed || userState.correct) {
    // Show the answer immediately
    showAnswerState(userState);
  } else if (userState.attempts >= MAX_GUESS_ATTEMPTS) {
    // Out of attempts, show reveal option
    guessInputFields.classList.add("hidden");
    submitGuess.classList.add("hidden");
    revealAnswer.classList.remove("hidden");
    guessResult.className = "result-message error";
    guessResult.textContent = `You've used all ${MAX_GUESS_ATTEMPTS} attempts.`;
    guessResult.classList.remove("hidden");
    if (guessLinksSection) {
      guessLinksSection.classList.add("hidden");
    }
  } else {
    // Still has attempts
    guessInputFields.classList.remove("hidden");
    submitGuess.classList.remove("hidden");
    revealAnswer.classList.add("hidden");
    
    const guessWhat = [];
    if (guessSong) guessWhat.push("song");
    if (guessArtist) guessWhat.push("artist");
    const attemptsLeft = MAX_GUESS_ATTEMPTS - userState.attempts;
    guessHint.textContent = `You have ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left to guess the ${guessWhat.join(" and ")}!`;
    
    if (guessLinksSection) {
      guessLinksSection.classList.add("hidden");
    }
  }
  
  openModal(guessModal);
}

// ===== SHOW ANSWER STATE =====
function showAnswerState(userState) {
  guessInputFields.classList.add("hidden");
  submitGuess.classList.add("hidden");
  revealAnswer.classList.add("hidden");
  
  guessResult.className = "result-message success";
  guessResult.innerHTML = `
    <div style="margin-bottom: 10px; font-size: 1.1rem;">✓ Answer</div>
    <div style="font-size: 0.95rem;"><strong>Song:</strong> ${currentPost.knowledge.song}</div>
    <div style="font-size: 0.95rem;"><strong>Artist:</strong> ${currentPost.knowledge.artist}</div>
  `;
  guessResult.classList.remove("hidden");
  
  // Show links permanently
  showGuessLinks(true);
}

// ===== SHOW LINKS IN GUESS MODAL =====
function showGuessLinks(permanent = false) {
  if (!currentPost || !currentPost.links || !guessLinksSection) return;
  
  const hasLinks = currentPost.links.spotify || 
                   currentPost.links.apple || 
                   currentPost.links.youtube || 
                   currentPost.links.soundcloud;
  
  if (!hasLinks) return;
  
  const linksHTML = [];
  
  if (currentPost.links.spotify) {
    linksHTML.push(`<a href="${currentPost.links.spotify}" target="_blank" class="guess-link">🎵 Spotify</a>`);
  }
  if (currentPost.links.apple) {
    linksHTML.push(`<a href="${currentPost.links.apple}" target="_blank" class="guess-link">🍎 Apple Music</a>`);
  }
  if (currentPost.links.youtube) {
    linksHTML.push(`<a href="${currentPost.links.youtube}" target="_blank" class="guess-link">▶️ YouTube</a>`);
  }
  if (currentPost.links.soundcloud) {
    linksHTML.push(`<a href="${currentPost.links.soundcloud}" target="_blank" class="guess-link">☁️ SoundCloud</a>`);
  }
  
  guessLinksSection.innerHTML = `
    <div class="guess-links-title">Listen to the song:</div>
    <div class="guess-links-container">
      ${linksHTML.join('')}
    </div>
  `;
  guessLinksSection.classList.remove("hidden");
  
  // Auto-hide after 5 seconds only if not permanent
  if (!permanent) {
    setTimeout(() => {
      if (guessLinksSection && !permanent) {
        guessLinksSection.classList.add("hidden");
      }
    }, 5000);
  }
}

// ===== SUBMIT GUESS WITH PARTIAL FEEDBACK =====
submitGuess.onclick = () => {
  if (!currentPost) return;
  
  const userState = getUserGuessState(currentPost.id);
  userState.attempts++;
  currentGuessAttempts = userState.attempts;
  
  const guessedSong = guessSongInput.value.trim().toLowerCase();
  const guessedArtist = guessArtistInput.value.trim().toLowerCase();
  const actualSong = currentPost.knowledge.song.toLowerCase();
  const actualArtist = currentPost.knowledge.artist.toLowerCase();
  
  const guessSong = currentPost.guessConfig?.guessSong ?? true;
  const guessArtist = currentPost.guessConfig?.guessArtist ?? true;
  
  let songMatch = false;
  let artistMatch = false;
  let songCorrect = false;
  let artistCorrect = false;
  
  if (guessSong) {
    songCorrect = guessedSong && (
      guessedSong === actualSong ||
      guessedSong.includes(actualSong) ||
      actualSong.includes(guessedSong)
    );
    songMatch = songCorrect;
  } else {
    songMatch = true;
  }
  
  if (guessArtist) {
    artistCorrect = guessedArtist && (
      guessedArtist === actualArtist ||
      guessedArtist.includes(actualArtist) ||
      actualArtist.includes(guessedArtist)
    );
    artistMatch = artistCorrect;
  } else {
    artistMatch = true;
  }
  
  // Track the guess
  if (!postAnalytics[currentPost.id]) {
    postAnalytics[currentPost.id] = { views: 0, guesses: [], helps: [] };
  }
  postAnalytics[currentPost.id].guesses.push({
    song: guessedSong || null,
    artist: guessedArtist || null,
    correct: songMatch && artistMatch,
    timestamp: Date.now()
  });
  localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  
  guessResult.classList.remove("hidden");
  
  // Both correct
  if (songMatch && artistMatch) {
    userState.correct = true;
    saveUserGuessState(currentPost.id, userState);
    
    guessResult.className = "result-message success";
    guessResult.innerHTML = `
      <div style="margin-bottom: 10px; font-size: 1.1rem;">✓ Correct!</div>
      <div style="font-size: 0.95rem;">"${currentPost.knowledge.song}" by ${currentPost.knowledge.artist}</div>
    `;
    
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    
    showGuessLinks(true);
  }
  // Partial correct
  else if (songCorrect || artistCorrect) {
    saveUserGuessState(currentPost.id, userState);
    
    guessResult.className = "result-message partial";
    
    let feedbackHTML = '<div style="margin-bottom: 10px; font-size: 1.1rem;">Partial Correct</div>';
    
    if (guessSong) {
      feedbackHTML += `<div style="font-size: 0.9rem;">${songCorrect ? '✓' : '✗'} Song: ${guessedSong || '(empty)'}</div>`;
    }
    if (guessArtist) {
      feedbackHTML += `<div style="font-size: 0.9rem;">${artistCorrect ? '✓' : '✗'} Artist: ${guessedArtist || '(empty)'}</div>`;
    }
    
    const attemptsLeft = MAX_GUESS_ATTEMPTS - userState.attempts;
    if (attemptsLeft > 0) {
      feedbackHTML += `<div style="margin-top: 10px; font-size: 0.85rem;">${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining</div>`;
    }
    
    guessResult.innerHTML = feedbackHTML;
    
    if (userState.attempts >= MAX_GUESS_ATTEMPTS) {
      submitGuess.classList.add("hidden");
      guessInputFields.classList.add("hidden");
      revealAnswer.classList.remove("hidden");
    } else {
      guessSongInput.value = "";
      guessArtistInput.value = "";
    }
  }
  // Both wrong
  else {
    saveUserGuessState(currentPost.id, userState);
    
    guessResult.className = "result-message error";
    
    let feedbackHTML = '<div style="margin-bottom: 10px; font-size: 1.1rem;">✗ Incorrect</div>';
    
    if (guessSong && guessedSong) {
      feedbackHTML += `<div style="font-size: 0.9rem;">✗ Song: ${guessedSong}</div>`;
    }
    if (guessArtist && guessedArtist) {
      feedbackHTML += `<div style="font-size: 0.9rem;">✗ Artist: ${guessedArtist}</div>`;
    }
    
    const attemptsLeft = MAX_GUESS_ATTEMPTS - userState.attempts;
    if (attemptsLeft > 0) {
      feedbackHTML += `<div style="margin-top: 10px; font-size: 0.85rem;">${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining</div>`;
      guessResult.innerHTML = feedbackHTML;
      guessSongInput.value = "";
      guessArtistInput.value = "";
    } else {
      feedbackHTML += `<div style="margin-top: 10px; font-size: 0.85rem;">Out of attempts!</div>`;
      guessResult.innerHTML = feedbackHTML;
      submitGuess.classList.add("hidden");
      guessInputFields.classList.add("hidden");
      revealAnswer.classList.remove("hidden");
    }
  }
};

// ===== REVEAL ANSWER =====
revealAnswer.onclick = () => {
  const userState = getUserGuessState(currentPost.id);
  userState.revealed = true;
  saveUserGuessState(currentPost.id, userState);
  
  showAnswerState(userState);
};

// ===== OPEN DISCOVER MODAL =====
function openDiscover(index) {
  currentPost = posts[index];
  
  trackView(currentPost.id);
  
  discoverLyric.textContent = currentPost.text;
  discoverSongAnswer.value = "";
  discoverArtistAnswer.value = "";
  discoverSpotifyLink.value = "";
  discoverAppleLink.value = "";
  discoverYoutubeLink.value = "";
  discoverSoundcloudLink.value = "";
  
  openModal(discoverModal);
}

// ===== SUBMIT DISCOVER =====
submitDiscover.onclick = () => {
  const song = discoverSongAnswer.value.trim();
  const artist = discoverArtistAnswer.value.trim();
  
  if (!song || !artist) {
    showToast("Please enter both song and artist");
    return;
  }
  
  if (!postAnalytics[currentPost.id]) {
    postAnalytics[currentPost.id] = { views: 0, guesses: [], helps: [] };
  }
  postAnalytics[currentPost.id].helps.push({
    song,
    artist,
    links: {
      spotify: discoverSpotifyLink.value.trim() || null,
      apple: discoverAppleLink.value.trim() || null,
      youtube: discoverYoutubeLink.value.trim() || null,
      soundcloud: discoverSoundcloudLink.value.trim() || null
    },
    timestamp: Date.now()
  });
  localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  
  showToast("Thanks for helping!");
  closeModal(discoverModal);
};

// ===== OPEN LISTEN MODAL =====
function openListen(index) {
  currentPost = posts[index];
  
  if (!currentPost.links) {
    showToast("No streaming links available");
    return;
  }
  
  listenLinks.innerHTML = "";
  
  const platforms = [
    { name: 'Spotify', key: 'spotify' },
    { name: 'Apple Music', key: 'apple' },
    { name: 'YouTube', key: 'youtube' },
    { name: 'SoundCloud', key: 'soundcloud' }
  ];
  
  let hasAnyLink = false;
  
  platforms.forEach(platform => {
    if (currentPost.links[platform.key]) {
      hasAnyLink = true;
      const link = document.createElement("a");
      link.className = "listen-link";
      link.href = currentPost.links[platform.key];
      link.target = "_blank";
      link.innerHTML = `<span>${platform.name}</span>`;
      listenLinks.appendChild(link);
    }
  });
  
  if (!hasAnyLink) {
    listenLinks.innerHTML = '<p class="hint">No streaming links available</p>';
  }
  
  openModal(listenModal);
}

// ===== VIEW POST (POSTCARD) =====
function viewPost(index) {
  currentPost = posts[index];
  
  trackView(currentPost.id);
  
  postcardLyric.textContent = currentPost.text;
  postcardEmotion.textContent = currentPost.emotion;
  
  // Check if user has access to see the song details
  let canSeeSong = true;
  
  if (currentPost.mode === "guess") {
    const userState = getUserGuessState(currentPost.id);
    canSeeSong = userState.correct || userState.revealed;
  }
  
  if (canSeeSong) {
    postcardSong.innerHTML = `
      <div>${currentPost.knowledge.song || 'Unknown Song'}</div>
      <div>${currentPost.knowledge.artist || 'Unknown Artist'}</div>
    `;
  } else {
    postcardSong.innerHTML = `
      <div style="font-style: italic; color: var(--text-secondary);">Guess correctly to reveal</div>
    `;
  }
  
  const hasLinks = currentPost.links && (
    currentPost.links.spotify || 
    currentPost.links.apple || 
    currentPost.links.youtube || 
    currentPost.links.soundcloud
  );
  
  if (hasLinks && canSeeSong) {
    listenPostcard.style.display = 'block';
  } else {
    listenPostcard.style.display = 'none';
  }
  
  openModal(postcardModal);
}

listenPostcard.onclick = () => {
  const postIndex = posts.findIndex(p => p.id === currentPost.id);
  if (postIndex !== -1) {
    closeModal(postcardModal);
    openListen(postIndex);
  }
};

// ===== ANALYTICS =====
analyticsBtn.onclick = () => {
  if (!currentPost || !postAnalytics[currentPost.id]) return;
  
  const analytics = postAnalytics[currentPost.id];
  
  statViews.textContent = analytics.views;
  statGuesses.textContent = analytics.guesses.length;
  statHelps.textContent = analytics.helps.length;
  
  if (analytics.guesses.length > 0) {
    guessesSection.classList.remove("hidden");
    guessesList.innerHTML = "";
    
    analytics.guesses.forEach(guess => {
      const item = document.createElement("div");
      item.className = `activity-item ${guess.correct ? 'correct' : 'incorrect'}`;
      item.innerHTML = `
        <div class="activity-guess">
          ${guess.song ? `Song: ${guess.song}` : ''}
          ${guess.artist ? `<br>Artist: ${guess.artist}` : ''}
        </div>
        <div class="activity-result ${guess.correct ? 'correct' : 'incorrect'}">
          ${guess.correct ? 'Correct' : 'Incorrect'}
        </div>
        <div class="activity-time">${timeAgo(guess.timestamp)}</div>
      `;
      guessesList.appendChild(item);
    });
  } else {
    guessesSection.classList.add("hidden");
  }
  
  if (analytics.helps.length > 0) {
    helpsSection.classList.remove("hidden");
    helpsList.innerHTML = "";
    
    analytics.helps.forEach(help => {
      const item = document.createElement("div");
      item.className = "activity-item";
      
      let linksHTML = '';
      if (help.links) {
        const linksList = [];
        if (help.links.spotify) linksList.push(`<a href="${help.links.spotify}" target="_blank" class="activity-link">Spotify</a>`);
        if (help.links.apple) linksList.push(`<a href="${help.links.apple}" target="_blank" class="activity-link">Apple Music</a>`);
        if (help.links.youtube) linksList.push(`<a href="${help.links.youtube}" target="_blank" class="activity-link">YouTube</a>`);
        if (help.links.soundcloud) linksList.push(`<a href="${help.links.soundcloud}" target="_blank" class="activity-link">SoundCloud</a>`);
        
        if (linksList.length > 0) {
          linksHTML = `<div class="activity-links">${linksList.join('')}</div>`;
        }
      }
      
      item.innerHTML = `
        <div class="activity-guess">
          <strong>Song:</strong> ${help.song}<br>
          <strong>Artist:</strong> ${help.artist}
        </div>
        ${linksHTML}
        <div class="activity-time">${timeAgo(help.timestamp)}</div>
      `;
      helpsList.appendChild(item);
    });
  } else {
    helpsSection.classList.add("hidden");
  }
  
  closeModal(postcardModal);
  openModal(analyticsModal);
};

// ===== COLOR DOT SELECTION WITH LIVE PREVIEW =====
document.querySelectorAll(".color-dot").forEach(dot => {
  dot.onclick = () => {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
    dot.classList.add("active");
    selectedDesign = dot.dataset.design;
    updateLivePreview();
  };
});

// ===== UPDATE LIVE PREVIEW =====
function updateLivePreview() {
  if (!currentPost || !posterPreviewCanvas) return;
  
  const ctx = posterPreviewCanvas.getContext('2d');
  const previewWidth = 320;
  const previewHeight = 320;
  
  posterPreviewCanvas.width = previewWidth;
  posterPreviewCanvas.height = previewHeight;
  
  const colors = POSTER_DESIGNS[selectedDesign];
  
  const gradient = ctx.createLinearGradient(0, 0, 0, previewHeight);
  gradient.addColorStop(0, colors.bg[0]);
  gradient.addColorStop(0.5, colors.bg[1]);
  gradient.addColorStop(1, colors.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, previewWidth, previewHeight);
  
  const baseFontSize = 14;
  
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.4}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', previewWidth / 2, 45);
  
  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 1.1}px serif`;
  const lyricPreview = currentPost.text.length > 35 ? currentPost.text.substring(0, 35) + '...' : currentPost.text;
  wrapText(ctx, lyricPreview, previewWidth / 2, previewHeight / 2 - 20, previewWidth * 0.8, baseFontSize * 1.6);
  
  ctx.fillStyle = colors.primary;
  ctx.font = `600 ${baseFontSize * 0.9}px sans-serif`;
  ctx.fillText(`#${currentPost.emotion}`, previewWidth / 2, previewHeight / 2 + 45);
  
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(previewWidth * 0.3, previewHeight / 2 + 65);
  ctx.lineTo(previewWidth * 0.7, previewHeight / 2 + 65);
  ctx.stroke();
  
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize}px serif`;
  const songTitle = (currentPost.knowledge.song || 'Song').length > 20 ? 
    (currentPost.knowledge.song || 'Song').substring(0, 20) + '...' : 
    (currentPost.knowledge.song || 'Song');
  ctx.fillText(songTitle, previewWidth / 2, previewHeight / 2 + 95);
  
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize * 0.85}px sans-serif`;
  const artistName = (currentPost.knowledge.artist || 'Artist').length > 25 ? 
    (currentPost.knowledge.artist || 'Artist').substring(0, 25) + '...' : 
    (currentPost.knowledge.artist || 'Artist');
  ctx.fillText(artistName, previewWidth / 2, previewHeight / 2 + 115);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let testLine = '';
  let lineArray = [];

  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lineArray.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lineArray.push(line);
  
  const startY = y - ((lineArray.length - 1) * lineHeight) / 2;
  for (let k = 0; k < lineArray.length; k++) {
    ctx.fillText(lineArray[k], x, startY + (k * lineHeight));
  }
}

nextToPlatform.onclick = () => {
  designStep.classList.remove("active");
  platformStep.classList.add("active");
};

backToDesign.onclick = () => {
  platformStep.classList.remove("active");
  designStep.classList.add("active");
};

// ===== PLATFORM SELECTION & POSTER GENERATION =====
document.querySelectorAll(".platform-btn").forEach(btn => {
  btn.onclick = () => {
    selectedPosterSize = btn.dataset.size;
    generatePoster(selectedPosterSize, selectedDesign);
    platformStep.classList.remove("active");
    previewStep.classList.add("active");
    downloadPoster.classList.remove("hidden");
  };
});

// ===== POSTER GENERATION =====
function generatePoster(size, design) {
  if (!currentPost) return;
  
  const sizes = {
    'instagram-square': { width: 1080, height: 1080 },
    'instagram-story': { width: 1080, height: 1920 },
    'twitter': { width: 1200, height: 675 },
    'facebook': { width: 1200, height: 630 },
    'pinterest': { width: 1000, height: 1500 }
  };
  
  const dims = sizes[size];
  const colors = POSTER_DESIGNS[design];
  const canvas = posterCanvas;
  const ctx = canvas.getContext('2d');
  
  canvas.width = dims.width;
  canvas.height = dims.height;
  
  const gradient = ctx.createLinearGradient(0, 0, 0, dims.height);
  gradient.addColorStop(0, colors.bg[0]);
  gradient.addColorStop(0.5, colors.bg[1]);
  gradient.addColorStop(1, colors.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, dims.width, dims.height);
  
  const baseFontSize = dims.width * 0.038;
  
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.5}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', dims.width / 2, dims.height * 0.12);
  
  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 1.4}px serif`;
  wrapText(ctx, currentPost.text, dims.width / 2, dims.height * 0.42, dims.width * 0.82, baseFontSize * 2.2);
  
  ctx.fillStyle = colors.primary;
  ctx.font = `600 ${baseFontSize}px sans-serif`;
  ctx.fillText(`#${currentPost.emotion}`, dims.width / 2, dims.height * 0.65);
  
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(dims.width * 0.3, dims.height * 0.7);
  ctx.lineTo(dims.width * 0.7, dims.height * 0.7);
  ctx.stroke();
  
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.2}px serif`;
  ctx.fillText(currentPost.knowledge.song || 'Unknown Song', dims.width / 2, dims.height * 0.8);
  
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize}px sans-serif`;
  ctx.fillText(currentPost.knowledge.artist || 'Unknown Artist', dims.width / 2, dims.height * 0.87);
}

downloadPoster.onclick = () => {
  if (!selectedPosterSize) return;
  
  const link = document.createElement('a');
  link.download = `margo-poster-${selectedPosterSize}-${Date.now()}.png`;
  link.href = posterCanvas.toDataURL('image/png');
  link.click();
  
  showToast("Poster downloaded!");
};

sharePosterBtn.onclick = () => {
  closeModal(postcardModal);
  resetPosterModal();
  setTimeout(() => {
    updateLivePreview();
  }, 100);
  openModal(sharePosterModal);
};

function resetPosterModal() {
  designStep.classList.add("active");
  platformStep.classList.remove("active");
  previewStep.classList.remove("active");
  downloadPoster.classList.add("hidden");
  selectedDesign = "midnight-gold";
  selectedPosterSize = null;
  
  document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
  document.querySelectorAll(".color-dot")[0].classList.add("active");
}

// ===== TOAST NOTIFICATION =====
function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== INITIALIZE =====
console.log("MARGO Improved loaded. Posts:", posts.length);

window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  
  if (postId) {
    const postIndex = posts.findIndex(p => p.id == postId);
    if (postIndex !== -1) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
      setTimeout(() => viewPost(postIndex), 500);
    }
  }
});
