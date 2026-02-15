/* MARGO - Community Edition - Firebase Real-Time Sync + Community Features + TikTok Export */

// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
  apiKey: "AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM",
  authDomain: "margo-f6da4.firebaseapp.com",
  databaseURL: "https://margo-f6da4-default-rtdb.firebaseio.com",
  projectId: "margo-f6da4",
  storageBucket: "margo-f6da4.firebasestorage.app",
  messagingSenderId: "150183564620",
  appId: "1:150183564620:web:a42de7fef39740b551ebe9"
};

const APP_BASE_URL = window.location.origin;

let isFirebaseEnabled = false;
let postsRef = null;
let analyticsRef = null;
let earlyAccessRef = null;

try {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  postsRef = database.ref('posts');
  analyticsRef = database.ref('analytics');
  earlyAccessRef = database.ref('earlyAccess');
  isFirebaseEnabled = true;
  console.log('✓ Firebase initialized successfully');
} catch (error) {
  console.warn('⚠ Firebase not configured. Using localStorage only.', error.message);
  isFirebaseEnabled = false;
}

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

const newPostsIndicator = document.getElementById("newPostsIndicator");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

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
const postcardCommunity = document.getElementById("postcardCommunity");
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
const shareStep = document.getElementById("shareStep");
const nextToPlatform = document.getElementById("nextToPlatform");
const backToDesign = document.getElementById("backToDesign");
const backToPlatform = document.getElementById("backToPlatform");
const posterCanvas = document.getElementById("posterCanvas");
const posterPreviewCanvas = document.getElementById("posterPreviewCanvas");
const shareableLink = document.getElementById("shareableLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const shareNativeBtn = document.getElementById("shareNativeBtn");
const downloadManualBtn = document.getElementById("downloadManualBtn");

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let selectedCommunity = "general";
let currentPost = null;
let currentGuessAttempts = 0;
const MAX_GUESS_ATTEMPTS = 2;

let selectedDesign = "midnight-gold";
let selectedPosterSize = null;
let generatedPosterBlob = null;

let posts = [];
let postAnalytics = {};

let savedScrollPosition = 0;
let lastPostCount = 0;
let newPostsAvailable = false;

// NEW: Active community filter
let activeCommunityFilter = "all";

// ===== COMMUNITY CONFIG =====
const COMMUNITY_CONFIG = {
  artist:  { label: "Artist",  icon: "🎤", color: "#ff6b6b" },
  fandom:  { label: "Fandom",  icon: "💜", color: "#c77dff" },
  student: { label: "Student", icon: "📚", color: "#50fa7b" },
  general: { label: "General", icon: "🌐", color: "#d4af37" }
};

// ===== PER-USER TRACKING =====
let userId = localStorage.getItem("margoUserId");
if (!userId) {
  userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("margoUserId", userId);
}

// ===== FIREBASE REAL-TIME SYNC =====
let postsLoaded = false;

if (isFirebaseEnabled) {
  postsRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
    const previousPostCount = posts.length;
    posts = [];
    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val();
      post.id = childSnapshot.key;
      posts.unshift(post);
    });
    posts.sort((a, b) => b.timestamp - a.timestamp);
    console.log('📡 Posts synced from Firebase:', posts.length);

    if (postsLoaded && posts.length > previousPostCount && feed.classList.contains('active')) {
      const newPostsCount = posts.length - previousPostCount;
      showNewPostsIndicator(newPostsCount);
      newPostsAvailable = true;
    }

    postsLoaded = true;
    updateLandingCount();

    if (feed.classList.contains('active') && !newPostsAvailable) {
      renderFeed();
    }
  });

  analyticsRef.on('value', (snapshot) => {
    postAnalytics = snapshot.val() || {};
    console.log('📊 Analytics synced from Firebase');
  });
} else {
  posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
  postAnalytics = JSON.parse(localStorage.getItem("margoAnalytics") || "{}");
  postsLoaded = true;
  updateLandingCount();
  posts.forEach(post => {
    if (!postAnalytics[post.id]) {
      postAnalytics[post.id] = { views: 0, guesses: [], helps: [] };
    }
  });
}

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

// ===== UPDATE LANDING STATS =====
function updateLandingCount() {
  const el = document.getElementById("landingPostCount");
  if (el) el.textContent = posts.length || "—";
}

// ===== COMMUNITY CHIP SELECTION ON LANDING =====
document.querySelectorAll(".community-chip").forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll(".community-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    selectedCommunity = chip.dataset.community;

    // Bounce straight to feed filtered by community
    landing.classList.remove("active");
    feed.classList.add("active");

    // Set filter
    activeCommunityFilter = chip.dataset.community;
    document.querySelectorAll(".filter-pill").forEach(p => {
      p.classList.toggle("active", p.dataset.filter === activeCommunityFilter);
    });

    renderFeed();
  };
});

// ===== COMMUNITY FILTER BAR =====
document.querySelectorAll(".filter-pill").forEach(pill => {
  pill.onclick = () => {
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    activeCommunityFilter = pill.dataset.filter;
    savedScrollPosition = 0;
    renderFeed();
  };
});

// ===== COMMUNITY SELECTOR IN COMPOSER =====
document.querySelectorAll(".community-select-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".community-select-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedCommunity = btn.dataset.community;
  };
});

// ===== SCROLL POSITION MANAGEMENT =====
function saveScrollPosition() {
  if (feedList) {
    savedScrollPosition = feedList.scrollTop || window.pageYOffset;
  }
}

function restoreScrollPosition() {
  if (feedList && savedScrollPosition > 0) {
    feedList.scrollTop = savedScrollPosition;
    window.scrollTo(0, savedScrollPosition);
  }
}

// ===== SCROLL TO TOP =====
function setupScrollToTop() {
  if (!feedList || !scrollToTopBtn) return;

  const checkScrollPosition = () => {
    const scrollTop = feedList.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 300) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible');
    }
  };

  feedList.addEventListener('scroll', checkScrollPosition);
  window.addEventListener('scroll', checkScrollPosition);

  scrollToTopBtn.onclick = () => {
    feedList.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    savedScrollPosition = 0;
    setTimeout(() => { scrollToTopBtn.classList.remove('visible'); }, 600);
  };
}

// ===== NEW POSTS INDICATOR =====
function showNewPostsIndicator(count) {
  if (!newPostsIndicator) return;
  newPostsIndicator.querySelector('.new-posts-count').textContent = count;
  newPostsIndicator.classList.add('visible');
}

function hideNewPostsIndicator() {
  if (!newPostsIndicator) return;
  newPostsIndicator.classList.remove('visible');
}

if (newPostsIndicator) {
  newPostsIndicator.onclick = () => {
    newPostsAvailable = false;
    savedScrollPosition = 0;
    renderFeed();
    hideNewPostsIndicator();
    feedList.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// ===== MODAL HELPERS =====
function openModal(modal) {
  saveScrollPosition();
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  requestAnimationFrame(() => {
    modal.classList.remove("hidden");
    modal.style.opacity = '';
    document.body.classList.add("modal-open");
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${savedScrollPosition}px`;
  });
}

function closeModal(modal) {
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.style.display = '';
    modal.style.opacity = '';
    document.body.classList.remove("modal-open");
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    if (feedList && savedScrollPosition > 0) {
      feedList.scrollTop = savedScrollPosition;
      window.scrollTo(0, savedScrollPosition);
    }
  }, 200);
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
  feed.classList.add("active");
  renderFeed();
};

backBtn.onclick = () => {
  feed.classList.remove("active");
  landing.classList.add("active");
};

openComposer.onclick = () => {
  openModal(composer);
  setTimeout(() => { textInput.focus(); }, 300);
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
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  guessInputFields.classList.remove("hidden");
  submitGuess.classList.remove("hidden");
  revealAnswer.classList.add("hidden");
  if (guessLinksSection) guessLinksSection.classList.add("hidden");
};

closeDiscover.onclick = () => closeModal(discoverModal);
closePostcard.onclick = () => closeModal(postcardModal);
closeListen.onclick = () => closeModal(listenModal);
closeAnalytics.onclick = () => closeModal(analyticsModal);
closeSharePoster.onclick = () => {
  closeModal(sharePosterModal);
  resetPosterModal();
};

// ===== DISCORD MODAL =====
const discordModal = document.getElementById("discordModal");
document.getElementById("openDiscordInfo").onclick = () => openModal(discordModal);
document.getElementById("closeDiscordModal").onclick = () => closeModal(discordModal);

// NEW: Discord early access form
const discordNotifyBtn = document.getElementById("discordNotifyBtn");
if (discordNotifyBtn) {
  discordNotifyBtn.onclick = () => {
    const serverInput = document.getElementById("discordServerInput");
    const serverName = serverInput ? serverInput.value.trim() : "";

    if (!serverName) {
      showToast("Please enter your server name or link");
      return;
    }

    const earlyAccessData = {
      server: serverName,
      userId,
      timestamp: Date.now()
    };

    if (isFirebaseEnabled && earlyAccessRef) {
      earlyAccessRef.push(earlyAccessData).then(() => {
        showToast("🎉 You're on the early access list!");
        if (serverInput) serverInput.value = "";
      }).catch(() => {
        showToast("🎉 You're on the early access list!");
        if (serverInput) serverInput.value = "";
      });
    } else {
      showToast("🎉 You're on the early access list!");
      if (serverInput) serverInput.value = "";
    }
  };
}

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
    streamingSection.style.display = currentMode === "discover" ? "none" : "block";
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
  if (!text) { showToast("Please enter a lyric"); return; }
  if (!selectedEmotion) { showToast("Please select an emotion"); return; }

  let post = {
    text,
    emotion: selectedEmotion,
    mode: currentMode,
    community: selectedCommunity || "general",
    knowledge: { song: "Unknown Song", artist: "Unknown Artist" },
    guessConfig: null,
    links: currentMode !== "discover" ? {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    } : null,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  try {
    if (currentMode === "share") {
      const song = songInput.value.trim();
      const artist = artistInput.value.trim();
      if (!song || !artist) throw new Error("Please enter song and artist");
      post.knowledge = { song, artist };
    }

    if (currentMode === "guess") {
      const songAnswer = guessSongAnswer.value.trim();
      const artistAnswer = guessArtistAnswer.value.trim();
      const allowSong = guessSongCheck.checked;
      const allowArtist = guessArtistCheck.checked;
      if (!allowSong && !allowArtist) throw new Error("Select at least one thing to guess");
      if (allowSong && !songAnswer) throw new Error("Enter the correct song title");
      if (allowArtist && !artistAnswer) throw new Error("Enter the correct artist");
      post.knowledge = { song: songAnswer, artist: artistAnswer, hidden: true };
      post.guessConfig = { guessSong: allowSong, guessArtist: allowArtist };
    }

    if (currentMode === "discover") {
      post.knowledge = {
        song: discoverSongInput.value.trim() || "Unknown Song",
        artist: discoverArtistInput.value.trim() || "Unknown Artist"
      };
    }
  } catch (err) {
    showToast(err.message);
    return;
  }

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    if (isFirebaseEnabled) {
      const newPostRef = await postsRef.push(post);
      await analyticsRef.child(newPostRef.key).set({ views: 0, guesses: [], helps: [] });
      console.log('✓ Posted to Firebase:', newPostRef.key);
    } else {
      const newPost = { ...post, id: Date.now(), timestamp: Date.now() };
      posts.unshift(newPost);
      postAnalytics[newPost.id] = { views: 0, guesses: [], helps: [] };
      if (posts.length > 50) posts = posts.slice(0, 50);
      try {
        localStorage.setItem("margoPosts", JSON.stringify(posts));
        localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
      } catch (storageErr) {
        posts = posts.slice(0, 10);
        localStorage.setItem("margoPosts", JSON.stringify(posts));
      }
    }

    showToast("Posted successfully!");
    feed.classList.add("active");
    landing.classList.remove("active");
    savedScrollPosition = 0;
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
  selectedCommunity = "general";

  document.querySelectorAll(".emotion-pill").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".community-select-btn").forEach(b => b.classList.remove("active"));

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

// ===== DYNAMIC FONT SIZING =====
function getDynamicFontSize(text) {
  const length = text.length;
  if (length < 50) return '1.15rem';
  if (length < 80) return '1.05rem';
  if (length < 110) return '0.95rem';
  if (length < 140) return '0.85rem';
  return '0.75rem';
}

// ===== RENDER FEED =====
function renderFeed() {
  if (feedList) feedList.classList.add('transitioning');
  feedList.innerHTML = "";

  if (!postsLoaded) {
    postCount.textContent = "...";
    feedList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:var(--gold);"><div style="font-size: 1.5rem; margin-bottom: 10px;">⏳</div><div>Loading posts...</div></div>';
    return;
  }

  // Filter by community
  let filteredPosts = posts;
  if (activeCommunityFilter !== "all") {
    filteredPosts = posts.filter(p => (p.community || "general") === activeCommunityFilter);
  }

  if (filteredPosts.length === 0) {
    const filterLabel = activeCommunityFilter !== "all"
      ? `No ${COMMUNITY_CONFIG[activeCommunityFilter]?.label || activeCommunityFilter} posts yet. Be the first!`
      : "No posts yet. Be the first!";
    postCount.textContent = "0";
    feedList.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">${filterLabel}</div>`;
    return;
  }

  postCount.textContent = filteredPosts.length;

  filteredPosts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.style.animationDelay = `${index * 0.03}s`;

    const timeText = timeAgo(post.timestamp);
    const emotion = post.emotion || "Nostalgia";
    const communityKey = post.community || "general";
    const communityInfo = COMMUNITY_CONFIG[communityKey] || COMMUNITY_CONFIG.general;

    let songSection = '';
    let actionsSection = '';

    const hasLinks = post.links && (post.links.spotify || post.links.apple || post.links.youtube || post.links.soundcloud);
    const knowledge = post.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };

    if (post.mode === "share") {
      songSection = `
        <div class="feed-song">
          <div class="feed-song-title">${knowledge.song}</div>
          <div class="feed-song-artist">${knowledge.artist}</div>
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="viewPost(${posts.indexOf(post)})">View</button>
          ${hasLinks ? `<button class="feed-action" onclick="openListen(${posts.indexOf(post)})">Listen</button>` : ''}
        </div>
      `;
    } else if (post.mode === "guess") {
      const guessWhat = [];
      if (post.guessConfig?.guessSong) guessWhat.push("song");
      if (post.guessConfig?.guessArtist) guessWhat.push("artist");
      if (guessWhat.length === 0) { guessWhat.push("song", "artist"); }
      songSection = `<div class="mystery-badge">Guess the ${guessWhat.join(" & ")}</div>`;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openGuess(${posts.indexOf(post)})">Guess</button>
          <button class="feed-action" onclick="viewPost(${posts.indexOf(post)})">View</button>
        </div>
      `;
    } else if (post.mode === "discover") {
      const hasClues = knowledge.song !== "Unknown Song" || knowledge.artist !== "Unknown Artist";
      songSection = `
        <div class="discover-badge">
          ${hasClues ? 'Maybe: ' + knowledge.song + ' — ' + knowledge.artist : 'Help discover this song!'}
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openDiscover(${posts.indexOf(post)})">Help Discover</button>
          <button class="feed-action" onclick="viewPost(${posts.indexOf(post)})">View</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="feed-card-top">
        <div class="feed-community-tag" style="background: ${communityInfo.color}22; color: ${communityInfo.color}; border-color: ${communityInfo.color}44;">
          ${communityInfo.icon} ${communityInfo.label}
        </div>
        <div class="feed-time">${timeText}</div>
      </div>
      <div class="feed-text" style="font-size: ${getDynamicFontSize(post.text)}">${post.text}</div>
      <div class="feed-emotion">${emotion}</div>
      ${songSection}
      ${actionsSection}
    `;

    feedList.appendChild(card);
  });

  setTimeout(() => {
    if (feedList) feedList.classList.remove('transitioning');
  }, 100);
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
  if (isFirebaseEnabled) {
    analyticsRef.child(postId).child('views').transaction((currentViews) => (currentViews || 0) + 1);
  } else {
    if (!postAnalytics[postId]) postAnalytics[postId] = { views: 0, guesses: [], helps: [] };
    postAnalytics[postId].views++;
    localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  }
}

// ===== OPEN GUESS MODAL =====
function openGuess(index) {
  currentPost = posts[index];
  trackView(currentPost.id);
  currentGuessAttempts = 0;
  guessLyric.textContent = currentPost.text;
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");

  const songField = document.querySelector('#guessSongInput');
  const artistField = document.querySelector('#guessArtistInput');
  const guessSong = currentPost.guessConfig?.guessSong ?? true;
  const guessArtist = currentPost.guessConfig?.guessArtist ?? true;
  songField.style.display = guessSong ? 'block' : 'none';
  artistField.style.display = guessArtist ? 'block' : 'none';

  guessInputFields.classList.remove("hidden");
  submitGuess.classList.remove("hidden");
  revealAnswer.classList.add("hidden");

  const guessWhat = [];
  if (guessSong) guessWhat.push("song");
  if (guessArtist) guessWhat.push("artist");
  guessHint.textContent = `You have ${MAX_GUESS_ATTEMPTS} attempts to guess the ${guessWhat.join(" and ")}!`;

  if (guessLinksSection) guessLinksSection.classList.add("hidden");
  openModal(guessModal);
}

// ===== SHOW LINKS IN GUESS MODAL =====
function showGuessLinks(permanent = false) {
  if (!currentPost || !currentPost.links || !guessLinksSection) return;
  const hasLinks = currentPost.links.spotify || currentPost.links.apple || currentPost.links.youtube || currentPost.links.soundcloud;
  if (!hasLinks) return;

  const linksHTML = [];
  if (currentPost.links.spotify) linksHTML.push(`<a href="${currentPost.links.spotify}" target="_blank" class="guess-link">🎵 Spotify</a>`);
  if (currentPost.links.apple) linksHTML.push(`<a href="${currentPost.links.apple}" target="_blank" class="guess-link">🍎 Apple Music</a>`);
  if (currentPost.links.youtube) linksHTML.push(`<a href="${currentPost.links.youtube}" target="_blank" class="guess-link">▶️ YouTube</a>`);
  if (currentPost.links.soundcloud) linksHTML.push(`<a href="${currentPost.links.soundcloud}" target="_blank" class="guess-link">☁️ SoundCloud</a>`);

  guessLinksSection.innerHTML = `
    <div class="guess-links-title">Listen to the song:</div>
    <div class="guess-links-container">${linksHTML.join('')}</div>
  `;
  guessLinksSection.classList.remove("hidden");
  if (!permanent) {
    setTimeout(() => { if (guessLinksSection && !permanent) guessLinksSection.classList.add("hidden"); }, 5000);
  }
}

// ===== SUBMIT GUESS =====
submitGuess.onclick = () => {
  if (!currentPost) return;
  currentGuessAttempts++;

  const guessedSong = guessSongInput.value.trim().toLowerCase();
  const guessedArtist = guessArtistInput.value.trim().toLowerCase();
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  const actualSong = knowledge.song.toLowerCase();
  const actualArtist = knowledge.artist.toLowerCase();
  const guessSong = currentPost.guessConfig?.guessSong ?? true;
  const guessArtist = currentPost.guessConfig?.guessArtist ?? true;

  let songMatch = !guessSong;
  let artistMatch = !guessArtist;
  let songCorrect = false;
  let artistCorrect = false;

  if (guessSong) {
    songCorrect = guessedSong && (guessedSong === actualSong || guessedSong.includes(actualSong) || actualSong.includes(guessedSong));
    songMatch = songCorrect;
  }
  if (guessArtist) {
    artistCorrect = guessedArtist && (guessedArtist === actualArtist || guessedArtist.includes(actualArtist) || actualArtist.includes(guessedArtist));
    artistMatch = artistCorrect;
  }

  const guessData = { song: guessedSong || null, artist: guessedArtist || null, correct: songMatch && artistMatch, timestamp: Date.now() };

  if (isFirebaseEnabled) {
    analyticsRef.child(currentPost.id).child('guesses').push(guessData);
  } else {
    if (!postAnalytics[currentPost.id]) postAnalytics[currentPost.id] = { views: 0, guesses: [], helps: [] };
    postAnalytics[currentPost.id].guesses.push(guessData);
    localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  }

  guessResult.classList.remove("hidden");

  if (songMatch && artistMatch) {
    guessResult.className = "result-message success";
    guessResult.innerHTML = `<div style="margin-bottom: 8px; font-size: 1rem;">✓ Correct!</div><div style="font-size: 0.85rem;">"${knowledge.song}" by ${knowledge.artist}</div>`;
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.add("hidden");
    showGuessLinks(true);
  } else if (currentGuessAttempts >= MAX_GUESS_ATTEMPTS) {
    guessResult.className = "result-message error";
    guessResult.innerHTML = `<div style="margin-bottom: 8px; font-size: 1rem;">✗ Out of attempts</div><div style="font-size: 0.85rem; margin-top: 8px;"><strong>Answer:</strong></div><div style="font-size: 0.85rem;">Song: ${knowledge.song}</div><div style="font-size: 0.85rem;">Artist: ${knowledge.artist}</div>`;
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.add("hidden");
    showGuessLinks(true);
  } else if (songCorrect || artistCorrect) {
    guessResult.className = "result-message partial";
    let feedbackHTML = '<div style="margin-bottom: 8px; font-size: 1rem;">Partial Correct</div>';
    if (guessSong) feedbackHTML += `<div style="font-size: 0.8rem;">${songCorrect ? '✓' : '✗'} Song: ${guessedSong || '(empty)'}</div>`;
    if (guessArtist) feedbackHTML += `<div style="font-size: 0.8rem;">${artistCorrect ? '✓' : '✗'} Artist: ${guessedArtist || '(empty)'}</div>`;
    const attemptsLeft = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
    feedbackHTML += `<div style="margin-top: 8px; font-size: 0.75rem;">${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining</div>`;
    guessResult.innerHTML = feedbackHTML;
    guessSongInput.value = "";
    guessArtistInput.value = "";
  } else {
    guessResult.className = "result-message error";
    let feedbackHTML = '<div style="margin-bottom: 8px; font-size: 1rem;">✗ Incorrect</div>';
    if (guessSong && guessedSong) feedbackHTML += `<div style="font-size: 0.8rem;">✗ Song: ${guessedSong}</div>`;
    if (guessArtist && guessedArtist) feedbackHTML += `<div style="font-size: 0.8rem;">✗ Artist: ${guessedArtist}</div>`;
    const attemptsLeft = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
    feedbackHTML += `<div style="margin-top: 8px; font-size: 0.75rem;">${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining</div>`;
    guessResult.innerHTML = feedbackHTML;
    guessSongInput.value = "";
    guessArtistInput.value = "";
  }
};

// ===== REVEAL ANSWER =====
revealAnswer.onclick = () => {
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  guessInputFields.classList.add("hidden");
  submitGuess.classList.add("hidden");
  revealAnswer.classList.add("hidden");
  guessResult.className = "result-message success";
  guessResult.innerHTML = `<div style="margin-bottom: 8px; font-size: 1rem;">✓ Answer</div><div style="font-size: 0.85rem;"><strong>Song:</strong> ${knowledge.song}</div><div style="font-size: 0.85rem;"><strong>Artist:</strong> ${knowledge.artist}</div>`;
  guessResult.classList.remove("hidden");
  showGuessLinks(true);
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
  if (!song || !artist) { showToast("Please enter both song and artist"); return; }

  const helpData = {
    song, artist,
    links: {
      spotify: discoverSpotifyLink.value.trim() || null,
      apple: discoverAppleLink.value.trim() || null,
      youtube: discoverYoutubeLink.value.trim() || null,
      soundcloud: discoverSoundcloudLink.value.trim() || null
    },
    timestamp: Date.now()
  };

  if (isFirebaseEnabled) {
    analyticsRef.child(currentPost.id).child('helps').push(helpData);
  } else {
    if (!postAnalytics[currentPost.id]) postAnalytics[currentPost.id] = { views: 0, guesses: [], helps: [] };
    postAnalytics[currentPost.id].helps.push(helpData);
    localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  }

  showToast("Thanks for helping!");
  closeModal(discoverModal);
};

// ===== OPEN LISTEN MODAL =====
function openListen(index) {
  currentPost = posts[index];
  if (!currentPost.links) { showToast("No streaming links available"); return; }
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

  if (!hasAnyLink) listenLinks.innerHTML = '<p class="hint">No streaming links available</p>';
  openModal(listenModal);
}

// ===== VIEW POST (POSTCARD) =====
function viewPost(index) {
  currentPost = posts[index];
  trackView(currentPost.id);

  postcardLyric.textContent = currentPost.text;
  postcardEmotion.textContent = currentPost.emotion || "Nostalgia";

  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };

  if (currentPost.mode === "guess") {
    postcardSong.innerHTML = `<div style="font-style: italic; color: var(--text-secondary);">Guess correctly to reveal</div>`;
  } else {
    postcardSong.innerHTML = `<div>${knowledge.song}</div><div>${knowledge.artist}</div>`;
  }

  // NEW: Show community badge in postcard
  if (postcardCommunity) {
    const communityKey = currentPost.community || "general";
    const communityInfo = COMMUNITY_CONFIG[communityKey] || COMMUNITY_CONFIG.general;
    postcardCommunity.innerHTML = `<span style="background: ${communityInfo.color}22; color: ${communityInfo.color}; border: 1px solid ${communityInfo.color}44; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">${communityInfo.icon} ${communityInfo.label}</span>`;
  }

  const hasLinks = currentPost.links && (currentPost.links.spotify || currentPost.links.apple || currentPost.links.youtube || currentPost.links.soundcloud);
  listenPostcard.style.display = (hasLinks && currentPost.mode !== "guess") ? 'block' : 'none';

  openModal(postcardModal);
}

listenPostcard.onclick = () => {
  const postIndex = posts.findIndex(p => p.id === currentPost.id);
  if (postIndex !== -1) { closeModal(postcardModal); openListen(postIndex); }
};

// ===== ANALYTICS =====
analyticsBtn.onclick = () => {
  if (!currentPost || !postAnalytics[currentPost.id]) return;
  const analytics = postAnalytics[currentPost.id];
  const guesses = analytics.guesses ? (Array.isArray(analytics.guesses) ? analytics.guesses : Object.values(analytics.guesses)) : [];
  const helps = analytics.helps ? (Array.isArray(analytics.helps) ? analytics.helps : Object.values(analytics.helps)) : [];
  const modalBody = document.querySelector('#analyticsModal .modal-body');

  if (currentPost.mode === 'guess') {
    modalBody.innerHTML = `
      <div class="analytics-stats">
        <div class="stat-card"><div class="stat-number">${analytics.views || 0}</div><div class="stat-label">Views</div></div>
        <div class="stat-card"><div class="stat-number">${guesses.length}</div><div class="stat-label">Guess Attempts</div></div>
      </div>
      ${guesses.length > 0 ? `<div class="activity-section"><h4>Guess Attempts</h4><div class="activity-list" id="guessesList"></div></div>` : ''}
    `;
    if (guesses.length > 0) {
      const newGuessesList = document.getElementById('guessesList');
      guesses.forEach(guess => {
        const item = document.createElement("div");
        item.className = `activity-item ${guess.correct ? 'correct' : 'incorrect'}`;
        item.innerHTML = `<div class="activity-guess">${guess.song ? `Song: ${guess.song}` : ''}${guess.artist ? `<br>Artist: ${guess.artist}` : ''}</div><div class="activity-result ${guess.correct ? 'correct' : 'incorrect'}">${guess.correct ? 'Correct' : 'Incorrect'}</div><div class="activity-time">${timeAgo(guess.timestamp)}</div>`;
        newGuessesList.appendChild(item);
      });
    }
  } else if (currentPost.mode === 'discover') {
    modalBody.innerHTML = `
      <div class="analytics-stats">
        <div class="stat-card"><div class="stat-number">${analytics.views || 0}</div><div class="stat-label">Views</div></div>
        <div class="stat-card"><div class="stat-number">${helps.length}</div><div class="stat-label">Discovery Helps</div></div>
      </div>
      ${helps.length > 0 ? `<div class="activity-section"><h4>Discovery Suggestions</h4><div class="activity-list" id="helpsList"></div></div>` : ''}
    `;
    if (helps.length > 0) {
      const newHelpsList = document.getElementById('helpsList');
      helps.forEach(help => {
        const item = document.createElement("div");
        item.className = "activity-item";
        let linksHTML = '';
        if (help.links) {
          const linksList = [];
          if (help.links.spotify) linksList.push(`<a href="${help.links.spotify}" target="_blank" class="activity-link">Spotify</a>`);
          if (help.links.apple) linksList.push(`<a href="${help.links.apple}" target="_blank" class="activity-link">Apple Music</a>`);
          if (help.links.youtube) linksList.push(`<a href="${help.links.youtube}" target="_blank" class="activity-link">YouTube</a>`);
          if (help.links.soundcloud) linksList.push(`<a href="${help.links.soundcloud}" target="_blank" class="activity-link">SoundCloud</a>`);
          if (linksList.length > 0) linksHTML = `<div class="activity-links">${linksList.join('')}</div>`;
        }
        item.innerHTML = `<div class="activity-guess"><strong>Song:</strong> ${help.song}<br><strong>Artist:</strong> ${help.artist}</div>${linksHTML}<div class="activity-time">${timeAgo(help.timestamp)}</div>`;
        newHelpsList.appendChild(item);
      });
    }
  } else {
    modalBody.innerHTML = `<div class="analytics-stats"><div class="stat-card"><div class="stat-number">${analytics.views || 0}</div><div class="stat-label">Views</div></div></div>`;
  }

  closeModal(postcardModal);
  openModal(analyticsModal);
};

// ===== COLOR DOT SELECTION =====
document.querySelectorAll(".color-dot").forEach(dot => {
  dot.onclick = () => {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
    dot.classList.add("active");
    selectedDesign = dot.dataset.design;
    updateLivePreview();
  };
});

// ===== LIVE PREVIEW =====
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
  const baseFontSize = 13;
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.3}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', previewWidth / 2, 40);
  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 0.95}px serif`;
  const lyricPreview = currentPost.text.length > 80 ? currentPost.text.substring(0, 80) + '...' : currentPost.text;
  wrapText(ctx, lyricPreview, previewWidth / 2, previewHeight / 2 - 30, previewWidth * 0.85, baseFontSize * 1.3);
  const emotion = currentPost.emotion || "Nostalgia";
  ctx.fillStyle = colors.primary;
  ctx.font = `600 ${baseFontSize * 0.75}px sans-serif`;
  ctx.fillText(`#${emotion}`, previewWidth / 2, previewHeight / 2 + 35);
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(previewWidth * 0.3, previewHeight / 2 + 50);
  ctx.lineTo(previewWidth * 0.7, previewHeight / 2 + 50);
  ctx.stroke();
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 0.9}px serif`;
  const songTitle = knowledge.song.length > 25 ? knowledge.song.substring(0, 25) + '...' : knowledge.song;
  ctx.fillText(songTitle, previewWidth / 2, previewHeight / 2 + 75);
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize * 0.75}px sans-serif`;
  const artistName = knowledge.artist.length > 30 ? knowledge.artist.substring(0, 30) + '...' : knowledge.artist;
  ctx.fillText(artistName, previewWidth / 2, previewHeight / 2 + 92);

  // Community tag on preview
  const communityKey = currentPost.community || "general";
  const communityInfo = COMMUNITY_CONFIG[communityKey] || COMMUNITY_CONFIG.general;
  ctx.fillStyle = colors.secondary;
  ctx.font = `600 ${baseFontSize * 0.65}px sans-serif`;
  ctx.fillText(`${communityInfo.icon} ${communityInfo.label}`, previewWidth / 2, previewHeight - 20);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineArray = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
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

backToPlatform.onclick = () => {
  shareStep.classList.remove("active");
  platformStep.classList.add("active");
};

// ===== PLATFORM SELECTION & POSTER GENERATION =====
document.querySelectorAll(".platform-btn").forEach(btn => {
  btn.onclick = async () => {
    selectedPosterSize = btn.dataset.size;

    if (selectedPosterSize === "tiktok") {
      await generateTikTokPoster();
    } else {
      await generatePoster(selectedPosterSize, selectedDesign);
    }

    const shareLink = `${APP_BASE_URL}?post=${currentPost.id}`;
    shareableLink.value = shareLink;

    // NEW: Platform-specific hints
    const hint = document.getElementById("platformShareHint");
    if (hint) {
      const hints = {
        "instagram-square": "📸 Save and share to Instagram feed or as a post",
        "instagram-story": "📱 Save and upload to Instagram Stories",
        "twitter": "🐦 Save and attach to your tweet",
        "facebook": "📘 Save and upload to Facebook",
        "pinterest": "📌 Save and pin to your board",
        "tiktok": "🎬 Save and upload as TikTok/Reels background"
      };
      hint.textContent = hints[selectedPosterSize] || "";
    }

    platformStep.classList.remove("active");
    shareStep.classList.add("active");
  };
});

// ===== POSTER GENERATION =====
async function generatePoster(size, design) {
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

  const baseFontSize = dims.width * 0.032;

  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.4}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', dims.width / 2, dims.height * 0.11);

  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 1.15}px serif`;
  wrapText(ctx, currentPost.text, dims.width / 2, dims.height * 0.38, dims.width * 0.85, baseFontSize * 1.7);

  const emotion = currentPost.emotion || "Nostalgia";
  ctx.fillStyle = colors.primary;
  ctx.font = `600 ${baseFontSize * 0.85}px sans-serif`;
  ctx.fillText(`#${emotion}`, dims.width / 2, dims.height * 0.62);

  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(dims.width * 0.3, dims.height * 0.68);
  ctx.lineTo(dims.width * 0.7, dims.height * 0.68);
  ctx.stroke();

  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.1}px serif`;
  ctx.fillText(knowledge.song, dims.width / 2, dims.height * 0.78);
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize * 0.9}px sans-serif`;
  ctx.fillText(knowledge.artist, dims.width / 2, dims.height * 0.85);

  // Community tag on poster
  const communityKey = currentPost.community || "general";
  const communityInfo = COMMUNITY_CONFIG[communityKey] || COMMUNITY_CONFIG.general;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `600 ${baseFontSize * 0.7}px sans-serif`;
  ctx.fillText(`${communityInfo.icon} ${communityInfo.label} community`, dims.width / 2, dims.height * 0.92);

  // Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = `500 ${baseFontSize * 0.6}px sans-serif`;
  const domain = APP_BASE_URL.replace(/^https?:\/\//, '');
  ctx.fillText(domain, dims.width / 2, dims.height * 0.97);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => { generatedPosterBlob = blob; resolve(); }, 'image/png');
  });
}

// ===== NEW: TIKTOK / VIDEO STYLE POSTER =====
async function generateTikTokPoster() {
  if (!currentPost) return;

  const canvas = posterCanvas;
  const ctx = canvas.getContext('2d');
  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const colors = POSTER_DESIGNS[selectedDesign];

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.bg[0]);
  gradient.addColorStop(0.4, colors.bg[1]);
  gradient.addColorStop(1, colors.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.2, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.75, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Top bar
  ctx.fillStyle = colors.primary;
  ctx.fillRect(0, 0, width, 12);

  // MARGO wordmark
  const baseFontSize = width * 0.07;
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', width / 2, height * 0.12);

  // Tagline
  ctx.fillStyle = colors.secondary;
  ctx.font = `italic ${baseFontSize * 0.3}px sans-serif`;
  ctx.fillText('when words fail, drop a lyric.', width / 2, height * 0.16);

  // Divider
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.2, height * 0.2);
  ctx.lineTo(width * 0.8, height * 0.2);
  ctx.stroke();

  // Lyric text — large, centred
  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 0.72}px serif`;
  wrapText(ctx, currentPost.text, width / 2, height * 0.42, width * 0.82, baseFontSize * 1.1);

  // Emotion hashtag
  const emotion = currentPost.emotion || "Nostalgia";
  ctx.fillStyle = colors.primary;
  ctx.font = `700 ${baseFontSize * 0.38}px sans-serif`;
  ctx.fillText(`#${emotion}`, width / 2, height * 0.65);

  // Divider 2
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.7);
  ctx.lineTo(width * 0.7, height * 0.7);
  ctx.stroke();

  // Song & artist
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 0.5}px serif`;
  ctx.fillText(knowledge.song, width / 2, height * 0.76);
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize * 0.38}px sans-serif`;
  ctx.fillText(knowledge.artist, width / 2, height * 0.81);

  // Community badge
  const communityKey = currentPost.community || "general";
  const communityInfo = COMMUNITY_CONFIG[communityKey] || COMMUNITY_CONFIG.general;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `600 ${baseFontSize * 0.3}px sans-serif`;
  ctx.fillText(`${communityInfo.icon} ${communityInfo.label}`, width / 2, height * 0.87);

  // Bottom bar
  ctx.fillStyle = colors.primary;
  ctx.fillRect(0, height - 12, width, 12);

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = `500 ${baseFontSize * 0.26}px sans-serif`;
  const domain = APP_BASE_URL.replace(/^https?:\/\//, '');
  ctx.fillText(domain, width / 2, height * 0.95);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => { generatedPosterBlob = blob; resolve(); }, 'image/png');
  });
}

// ===== COPY LINK =====
copyLinkBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(shareableLink.value);
    copyLinkBtn.textContent = "Copied!";
    copyLinkBtn.style.background = "var(--success)";
    setTimeout(() => { copyLinkBtn.textContent = "Copy"; copyLinkBtn.style.background = ""; }, 2000);
    showToast("Link copied to clipboard!");
  } catch (err) {
    shareableLink.select();
    showToast("Please copy the link manually");
  }
};

// ===== WEB SHARE =====
shareNativeBtn.onclick = async () => {
  if (!generatedPosterBlob) { showToast("Please wait, generating poster..."); return; }
  const shareData = {
    title: `MARGO - ${currentPost.text.substring(0, 50)}...`,
    text: `Check out this lyric on MARGO!\n\n"${currentPost.text}"\n\n${shareableLink.value}`,
    files: [new File([generatedPosterBlob], `margo-poster-${Date.now()}.png`, { type: 'image/png' })]
  };
  try {
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      showToast("Shared successfully!");
    } else {
      downloadPosterFile();
      showToast("Poster downloaded! Share it manually.");
    }
  } catch (err) {
    if (err.name !== 'AbortError') { downloadPosterFile(); showToast("Sharing not supported. Poster downloaded instead."); }
  }
};

downloadManualBtn.onclick = () => downloadPosterFile();

function downloadPosterFile() {
  if (!selectedPosterSize) return;
  const link = document.createElement('a');
  link.download = `margo-poster-${selectedPosterSize}-${Date.now()}.png`;
  link.href = posterCanvas.toDataURL('image/png');
  link.click();
  showToast("Poster downloaded!");
}

// ===== SHARE POSTER BUTTON =====
sharePosterBtn.onclick = () => {
  closeModal(postcardModal);
  resetPosterModal();
  setTimeout(() => { updateLivePreview(); }, 100);
  openModal(sharePosterModal);
};

function resetPosterModal() {
  designStep.classList.add("active");
  platformStep.classList.remove("active");
  shareStep.classList.remove("active");
  selectedDesign = "midnight-gold";
  selectedPosterSize = null;
  generatedPosterBlob = null;
  document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
  document.querySelectorAll(".color-dot")[0].classList.add("active");
}

// ===== CAMERA / VIDEO RECORDING =====
const cameraModal      = document.getElementById("cameraModal");
const closeCameraModal = document.getElementById("closeCameraModal");
const cameraVideo      = document.getElementById("cameraVideo");
const cameraCanvas     = document.getElementById("cameraCanvas");
const cameraOverlay    = document.getElementById("cameraOverlayLyrics");
const cameraLyricText  = document.getElementById("cameraLyricText");
const cameraLyricMeta  = document.getElementById("cameraLyricMeta");
const cameraNoSupport  = document.getElementById("cameraNoSupport");
const recordBtn        = document.getElementById("recordBtn");
const flipCameraBtn    = document.getElementById("flipCameraBtn");
const downloadVideoBtn = document.getElementById("downloadVideoBtn");
const cameraTimer      = document.getElementById("cameraTimer");
const cameraHint       = document.getElementById("cameraHint");
const openCameraBtn    = document.getElementById("openCameraBtn");

let cameraStream     = null;
let mediaRecorder    = null;
let recordedChunks   = [];
let isRecording      = false;
let recordingTimer   = null;
let recordingSeconds = 0;
let useFrontCamera   = true;
let activeEffect     = "gradient";

const CAMERA_EFFECTS = {
  gradient: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
  dark: (ctx, w, h) => {
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, 0, w, h);
  },
  blur: (ctx, w, h) => {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
  gold: (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
    g.addColorStop(0, "rgba(180,130,0,0)");
    g.addColorStop(1, "rgba(140,100,0,0.68)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },
  none: () => {}
};

document.querySelectorAll(".effect-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".effect-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeEffect = btn.dataset.effect;
  };
});

if (openCameraBtn) {
  openCameraBtn.onclick = () => {
    closeModal(sharePosterModal);
    setTimeout(() => { openCameraModal(); }, 280);
  };
}

async function openCameraModal() {
  if (!currentPost) { showToast("Select a post first"); return; }
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  const lyricShort = currentPost.text.length > 80 ? currentPost.text.substring(0, 77) + "..." : currentPost.text;
  if (cameraLyricText) cameraLyricText.textContent = `"${lyricShort}"`;
  if (cameraLyricMeta) {
    cameraLyricMeta.textContent = currentPost.mode !== "guess"
      ? `${knowledge.song} — ${knowledge.artist}`
      : "MARGO · margo-silk.vercel.app";
  }
  openModal(cameraModal);
  await startCamera();
}

async function startCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showCameraUnsupported(); return; }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: useFrontCamera ? "user" : "environment", width: { ideal: 1080 }, height: { ideal: 1920 } },
      audio: true
    });
    cameraVideo.srcObject = cameraStream;
    cameraVideo.style.display = "block";
    if (cameraNoSupport) cameraNoSupport.style.display = "none";
    if (cameraOverlay) cameraOverlay.style.display = "block";
    requestAnimationFrame(drawCameraOverlay);
  } catch (err) {
    console.warn("Camera error:", err);
    if (err.name === "NotAllowedError") {
      showToast("Camera permission denied. Please allow camera access.");
    } else {
      showCameraUnsupported();
    }
  }
}

function showCameraUnsupported() {
  if (cameraVideo) cameraVideo.style.display = "none";
  if (cameraNoSupport) cameraNoSupport.style.display = "flex";
  if (cameraOverlay) cameraOverlay.style.display = "none";
}

function drawCameraOverlay() {
  if (!cameraStream || !cameraCanvas || !cameraVideo) return;
  const viewport = cameraCanvas.parentElement;
  const w = viewport ? viewport.offsetWidth : 320;
  const h = viewport ? viewport.offsetHeight : 568;
  if (cameraCanvas.width !== w || cameraCanvas.height !== h) { cameraCanvas.width = w; cameraCanvas.height = h; }
  const ctx = cameraCanvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const effectFn = CAMERA_EFFECTS[activeEffect] || CAMERA_EFFECTS.gradient;
  effectFn(ctx, w, h);
  // MARGO watermark
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "bold 13px serif";
  ctx.textAlign = "center";
  ctx.fillText("MARGO", w / 2, 22);
  ctx.restore();
  if (cameraStream && cameraStream.active) requestAnimationFrame(drawCameraOverlay);
}

if (flipCameraBtn) {
  flipCameraBtn.onclick = () => { useFrontCamera = !useFrontCamera; startCamera(); };
}

if (recordBtn) {
  recordBtn.onclick = () => { if (!isRecording) startRecording(); else stopRecording(); };
}

function startRecording() {
  if (!cameraStream) { showToast("Camera not ready"); return; }
  recordedChunks = [];
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
  try {
    mediaRecorder = new MediaRecorder(cameraStream, { mimeType });
  } catch (e) {
    mediaRecorder = new MediaRecorder(cameraStream);
  }
  mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "video/webm" });
    const url = URL.createObjectURL(blob);
    if (downloadVideoBtn) {
      downloadVideoBtn.style.display = "flex";
      downloadVideoBtn.onclick = () => {
        const ext = (mediaRecorder.mimeType || "video/webm").includes("mp4") ? "mp4" : "webm";
        const a = document.createElement("a");
        a.href = url; a.download = `margo-lyric-${Date.now()}.${ext}`; a.click();
        showToast("Video saved! Upload it to TikTok or Reels.");
      };
    }
    if (cameraHint) cameraHint.textContent = "Done — tap 💾 to save your video";
  };
  mediaRecorder.start(100);
  isRecording = true;
  recordingSeconds = 0;
  if (recordBtn) { recordBtn.textContent = "⏹"; recordBtn.classList.add("recording"); }
  if (cameraHint) cameraHint.textContent = "Recording… tap ⏹ to stop";
  recordingTimer = setInterval(() => {
    recordingSeconds++;
    if (cameraTimer) { cameraTimer.textContent = `● REC 0:${String(recordingSeconds).padStart(2, "0")}`; }
    if (recordingSeconds >= 30) stopRecording();
  }, 1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  isRecording = false;
  clearInterval(recordingTimer);
  if (recordBtn) { recordBtn.textContent = "⏺"; recordBtn.classList.remove("recording"); }
  if (cameraTimer) cameraTimer.textContent = "";
}

function stopCamera() {
  stopRecording();
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  if (cameraVideo) cameraVideo.srcObject = null;
  if (downloadVideoBtn) downloadVideoBtn.style.display = "none";
  if (cameraHint) cameraHint.textContent = "Tap ⏺ to start recording · up to 30s";
  if (cameraTimer) cameraTimer.textContent = "";
}

if (closeCameraModal) {
  closeCameraModal.onclick = () => { stopCamera(); closeModal(cameraModal); };
}

// ===== TOAST =====
function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 2500);
}

// ===== INITIALIZE =====
console.log("MARGO Community Edition loaded");
console.log("Firebase enabled:", isFirebaseEnabled);

setupScrollToTop();

// ===== HANDLE SHARED POST LINKS =====
function handleSharedPostLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  if (!postId) return;

  const postIndex = posts.findIndex(p => p.id == postId);
  if (postIndex !== -1) {
    landing.classList.remove("active");
    feed.classList.add("active");
    renderFeed();
    setTimeout(() => { viewPost(postIndex); }, 300);
  } else if (isFirebaseEnabled) {
    const checkInterval = setInterval(() => {
      const foundIndex = posts.findIndex(p => p.id == postId);
      if (foundIndex !== -1) {
        clearInterval(checkInterval);
        landing.classList.remove("active");
        feed.classList.add("active");
        renderFeed();
        setTimeout(() => { viewPost(foundIndex); }, 300);
      }
    }, 500);
    setTimeout(() => {
      clearInterval(checkInterval);
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
    }, 10000);
  } else {
    landing.classList.remove("active");
    feed.classList.add("active");
    renderFeed();
  }
}

window.addEventListener('load', () => { handleSharedPostLink(); });
