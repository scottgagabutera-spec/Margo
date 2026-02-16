/* MARGO — Definitive Edition */

// ===== FIREBASE =====
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

try {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  postsRef       = database.ref('posts');
  analyticsRef   = database.ref('analytics');
  isFirebaseEnabled = true;
  console.log('Firebase OK');
} catch (e) {
  console.warn('Firebase failed, using localStorage', e.message);
}

// ===== ELEMENTS =====
const landing         = document.getElementById("landing");
const feed            = document.getElementById("feed");
const composer        = document.getElementById("composer");
const guessModal      = document.getElementById("guessModal");
const discoverModal   = document.getElementById("discoverModal");
const postcardModal   = document.getElementById("postcardModal");
const listenModal     = document.getElementById("listenModal");
const analyticsModal  = document.getElementById("analyticsModal");
const sharePosterModal= document.getElementById("sharePosterModal");
const cameraModal     = document.getElementById("cameraModal");

const enterBtn        = document.getElementById("enterBtn");
const backBtn         = document.getElementById("backBtn");
const openComposerBtn = document.getElementById("openComposer");
const closeComposerBtn= document.getElementById("closeComposer");
const postBtn         = document.getElementById("postBtn");

const textInput   = document.getElementById("textInput");
const charCount   = document.getElementById("charCount");
const feedList    = document.getElementById("feedList");
const postCount   = document.getElementById("postCount");

const newPostsIndicator = document.getElementById("newPostsIndicator");
const scrollToTopBtn    = document.getElementById("scrollToTopBtn");

const modeBtns       = document.querySelectorAll(".mode-btn");
const shareInputs    = document.getElementById("shareInputs");
const guessInputs    = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");
const streamingSection = document.getElementById("streamingSection");

const songInput    = document.getElementById("songInput");
const artistInput  = document.getElementById("artistInput");
const guessSongCheck   = document.getElementById("guessSongCheck");
const guessArtistCheck = document.getElementById("guessArtistCheck");
const guessSongAnswer  = document.getElementById("guessSongAnswer");
const guessArtistAnswer= document.getElementById("guessArtistAnswer");
const discoverSongInput   = document.getElementById("discoverSongInput");
const discoverArtistInput = document.getElementById("discoverArtistInput");

const spotifyLink    = document.getElementById("spotifyLink");
const appleLink      = document.getElementById("appleLink");
const youtubeLink    = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

const guessLyric       = document.getElementById("guessLyric");
const guessHint        = document.getElementById("guessHint");
const guessSongInput   = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const submitGuess      = document.getElementById("submitGuess");
const revealAnswer     = document.getElementById("revealAnswer");
const guessResult      = document.getElementById("guessResult");
const guessInputFields = document.getElementById("guessInputFields");
const guessLinksSection= document.getElementById("guessLinksSection");

const discoverLyric          = document.getElementById("discoverLyric");
const discoverSongAnswer     = document.getElementById("discoverSongAnswer");
const discoverArtistAnswer   = document.getElementById("discoverArtistAnswer");
const submitDiscover         = document.getElementById("submitDiscover");
const discoverSpotifyLink    = document.getElementById("discoverSpotifyLink");
const discoverAppleLink      = document.getElementById("discoverAppleLink");
const discoverYoutubeLink    = document.getElementById("discoverYoutubeLink");
const discoverSoundcloudLink = document.getElementById("discoverSoundcloudLink");

const listenLinks    = document.getElementById("listenLinks");
const postcardLyric  = document.getElementById("postcardLyric");
const postcardEmotion= document.getElementById("postcardEmotion");
const postcardSong   = document.getElementById("postcardSong");
const postcardCommunity = document.getElementById("postcardCommunity");
const sharePosterBtn = document.getElementById("sharePosterBtn");
const listenPostcard = document.getElementById("listenPostcard");
const analyticsBtn   = document.getElementById("analyticsBtn");

const designStep     = document.getElementById("designStep");
const platformStep   = document.getElementById("platformStep");
const shareStep      = document.getElementById("shareStep");
const nextToPlatform = document.getElementById("nextToPlatform");
const backToDesign   = document.getElementById("backToDesign");
const backToPlatform = document.getElementById("backToPlatform");
const posterCanvas        = document.getElementById("posterCanvas");
const posterPreviewCanvas = document.getElementById("posterPreviewCanvas");
const shareableLink  = document.getElementById("shareableLink");
const copyLinkBtn    = document.getElementById("copyLinkBtn");
const shareNativeBtn = document.getElementById("shareNativeBtn");
const downloadManualBtn = document.getElementById("downloadManualBtn");

// ===== STATE =====
let currentMode       = "share";
let selectedEmotion   = null;
let selectedCommunity = "general";
let currentPost       = null;
let currentGuessAttempts = 0;
const MAX_GUESS_ATTEMPTS = 2;


// ===== FONT SYSTEM =====
const FONT_FAMILIES = {
  'playfair':     { family: "'Playfair Display', serif", style: 'italic' },
  'lora':         { family: "'Lora', serif", style: 'italic' },
  'merriweather': { family: "'Merriweather', serif", style: 'normal' },
  'inter':        { family: "'Inter', sans-serif", style: 'normal' },
  'space':        { family: "'Space Grotesk', sans-serif", style: 'normal' },
  'bebas':        { family: "'Bebas Neue', sans-serif", style: 'normal' },
  'raleway':      { family: "'Raleway', sans-serif", style: 'normal' },
  'crimson':      { family: "'Crimson Text', serif", style: 'italic' }
};

let selectedFont = 'playfair';
let uploadedBgImage = null;

let selectedDesign     = "midnight-gold";
let selectedPosterSize = null;
let generatedPosterBlob= null;
let activeCommunityFilter = "all";

let posts          = [];
let postAnalytics  = {};
let postsLoaded    = false;

let savedScrollPosition = 0;
let newPostsAvailable   = false;

// ===== USER ID =====
let userId = localStorage.getItem("margoUserId");
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2,8);
  localStorage.setItem("margoUserId", userId);
}

// ===== FIREBASE SYNC =====
if (isFirebaseEnabled) {
  postsRef.orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
    const prevCount = posts.length;
    posts = [];
    snapshot.forEach(child => {
      const p = child.val();
      p.id = child.key;
      posts.unshift(p);
    });
    posts.sort((a,b) => b.timestamp - a.timestamp);

    updateLandingCount();

    if (postsLoaded && posts.length > prevCount && feed.classList.contains('active')) {
      showNewPostsIndicator(posts.length - prevCount);
      newPostsAvailable = true;
    }
    postsLoaded = true;
    if (feed.classList.contains('active') && !newPostsAvailable) renderFeed();
  });

  analyticsRef.on('value', snapshot => {
    postAnalytics = snapshot.val() || {};
  });
} else {
  postsLoaded = true;
  updateLandingCount();
}

function updateLandingCount() {
  const el = document.getElementById("landingPostCount");
  if (el) el.textContent = posts.length || "—";
}

// ===== POSTER DESIGNS =====
const POSTER_DESIGNS = {
  'midnight-gold':    { bg:['#0d0d0d','#1a1410','#0d0d0d'], primary:'#d4af37', secondary:'rgba(212,175,55,0.65)', text:'#f8f8f8', font:'serif' },
  'royal-purple':     { bg:['#1a0033','#2d1b4e','#1a0033'], primary:'#c77dff', secondary:'rgba(199,125,255,0.65)', text:'#f8f8f8', font:'serif' },
  'neon-cyan':        { bg:['#0a1420','#142838','#0a1420'], primary:'#00e5ff', secondary:'rgba(0,229,255,0.65)', text:'#f8f8f8', font:'sans' },
  'sunset-coral':     { bg:['#1a0a0a','#2d1416','#1a0a0a'], primary:'#ff6b6b', secondary:'rgba(255,107,107,0.65)', text:'#f8f8f8', font:'serif' },
  'emerald-night':    { bg:['#051a0d','#0d2e1a','#051a0d'], primary:'#50fa7b', secondary:'rgba(80,250,123,0.65)', text:'#f8f8f8', font:'sans' },
  'rose-gold':        { bg:['#1a0d0f','#2d1a1f','#1a0d0f'], primary:'#f4a4c0', secondary:'rgba(244,164,192,0.65)', text:'#f8f8f8', font:'serif' },
  'brutalist':        { bg:['#ffffff','#f5f5f5','#ffffff'], primary:'#000000', secondary:'rgba(0,0,0,0.6)', text:'#000000', font:'sans-bold' },
  'y2k-chrome':       { bg:['#000033','#1a1a4d','#000033'], primary:'#00ffff', secondary:'rgba(255,0,255,0.65)', text:'#ffffff', font:'sans-bold' },
  'vaporwave':        { bg:['#ff71ce','#b967ff','#05ffa1'], primary:'#ffffff', secondary:'rgba(255,255,255,0.8)', text:'#ffffff', font:'sans' },
  'neon-dark':        { bg:['#0a0a0a','#0f0f0f','#0a0a0a'], primary:'#ff00ff', secondary:'rgba(0,255,255,0.7)', text:'#00ffff', font:'sans-bold' },
  'cream-editorial':  { bg:['#f5f1e8','#ebe3d5','#f5f1e8'], primary:'#2a2520', secondary:'rgba(42,37,32,0.6)', text:'#2a2520', font:'serif' },
  'monochrome':       { bg:['#000000','#000000','#000000'], primary:'#ffffff', secondary:'rgba(255,255,255,0.7)', text:'#ffffff', font:'sans' }
};

// ===== COMMUNITY CONFIG =====
const COMMUNITY_CONFIG = {
  artist:  { label:'Artist',  color:'#ff6b6b', bg:'rgba(255,107,107,0.12)' },
  fandom:  { label:'Fandom',  color:'#c77dff', bg:'rgba(199,125,255,0.12)' },
  student: { label:'Student', color:'#50fa7b', bg:'rgba(80,250,123,0.12)'  },
  general: { label:'General', color:'#d4af37', bg:'rgba(212,175,55,0.12)'  }
};

// ===== SCROLL MANAGEMENT =====
function saveScrollPosition() {
  savedScrollPosition = feedList ? (feedList.scrollTop || window.pageYOffset) : 0;
}

function restoreScrollPosition() {
  if (feedList && savedScrollPosition > 0) {
    feedList.scrollTop = savedScrollPosition;
    window.scrollTo(0, savedScrollPosition);
  }
}

function setupScrollToTop() {
  if (!feedList || !scrollToTopBtn) return;

  const check = () => {
    const top = feedList.scrollTop || window.pageYOffset;
    scrollToTopBtn.classList.toggle('visible', top > 300);
  };

  feedList.addEventListener('scroll', check);
  window.addEventListener('scroll', check);

  scrollToTopBtn.onclick = () => {
    feedList.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    savedScrollPosition = 0;
    setTimeout(() => scrollToTopBtn.classList.remove('visible'), 600);
  };
}

// ===== NEW POSTS INDICATOR =====
function showNewPostsIndicator(count) {
  if (!newPostsIndicator) return;
  newPostsIndicator.querySelector('.new-posts-count').textContent = count;
  newPostsIndicator.classList.add('visible');
}

function hideNewPostsIndicator() {
  if (newPostsIndicator) newPostsIndicator.classList.remove('visible');
}

newPostsIndicator.onclick = () => {
  newPostsAvailable = false;
  savedScrollPosition = 0;
  renderFeed();
  hideNewPostsIndicator();
  feedList.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===== MODAL OPEN / CLOSE =====
function openModal(modal) {
  saveScrollPosition();
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.body.style.top = `-${savedScrollPosition}px`;
}

function closeModal(modal) {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.body.style.top = '';
  if (feedList && savedScrollPosition > 0) {
    feedList.scrollTop = savedScrollPosition;
    window.scrollTo(0, savedScrollPosition);
  }
}

// ===== SWIPE NAVIGATION =====
let tStartX = 0, tStartY = 0, tEndX = 0, tEndY = 0;

function handleSwipe() {
  const dx = tStartX - tEndX;
  const dy = Math.abs(tStartY - tEndY);
  if (Math.abs(dx) > dy && Math.abs(dx) > 100) {
    if (dx > 0 && landing.classList.contains("active")) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
    } else if (dx < 0 && feed.classList.contains("active")) {
      feed.classList.remove("active");
      landing.classList.add("active");
    }
  }
}

[landing, feed].forEach(screen => {
  screen.addEventListener('touchstart', e => { tStartX = e.touches[0].clientX; tStartY = e.touches[0].clientY; });
  screen.addEventListener('touchend',   e => { tEndX = e.changedTouches[0].clientX; tEndY = e.changedTouches[0].clientY; handleSwipe(); });
});

// ===== NAVIGATION =====
// enterBtn → straight to composer, no delay
enterBtn.onclick = () => {
  landing.classList.remove("active");
  feed.classList.add("active");
  renderFeed();
  openModal(composer);
  setTimeout(() => textInput.focus(), 280);
};

backBtn.onclick = () => {
  feed.classList.remove("active");
  landing.classList.add("active");
};

openComposerBtn.onclick = () => {
  openModal(composer);
  setTimeout(() => textInput.focus(), 280);
};

closeComposerBtn.onclick = () => {
  closeModal(composer);
  resetComposer();
};

// ===== COMMUNITY FILTER BAR =====
document.querySelectorAll(".filter-pill").forEach(pill => {
  pill.onclick = () => {
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    activeCommunityFilter = pill.dataset.filter;
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

// ===== CHAR COUNTER =====
textInput.oninput = () => { charCount.textContent = textInput.value.length; };

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

    if (currentMode === "share")    shareInputs.classList.add("active");
    if (currentMode === "guess")    guessInputs.classList.add("active");
    if (currentMode === "discover") discoverInputs.classList.add("active");
  };
});

// ===== EMOTION PILLS =====
document.querySelectorAll(".emotion-pill").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".emotion-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion = btn.dataset.emotion;
  };
});

// ===== POST =====
postBtn.onclick = async () => {
  if (postBtn.disabled) return;

  const text = textInput.value.trim();
  if (!text)          { showToast("Please enter a lyric"); return; }
  if (!selectedEmotion){ showToast("Please select an emotion"); return; }

  let post = {
    text,
    emotion: selectedEmotion,
    mode: currentMode,
    community: selectedCommunity || "general",
    knowledge: { song: "Unknown Song", artist: "Unknown Artist" },
    guessConfig: null,
    links: currentMode !== "discover" ? {
      spotify:    spotifyLink.value.trim()    || null,
      apple:      appleLink.value.trim()      || null,
      youtube:    youtubeLink.value.trim()    || null,
      soundcloud: soundcloudLink.value.trim() || null
    } : null,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now()
  };

  try {
    if (currentMode === "share") {
      const song   = songInput.value.trim();
      const artist = artistInput.value.trim();
      if (!song || !artist) throw new Error("Please enter song and artist");
      post.knowledge = { song, artist };
    }

    if (currentMode === "guess") {
      const songA   = guessSongAnswer.value.trim();
      const artistA = guessArtistAnswer.value.trim();
      const doSong  = guessSongCheck.checked;
      const doArtist= guessArtistCheck.checked;
      if (!doSong && !doArtist) throw new Error("Select at least one thing to guess");
      if (doSong   && !songA)  throw new Error("Enter the correct song title");
      if (doArtist && !artistA)throw new Error("Enter the correct artist");
      post.knowledge   = { song: songA, artist: artistA, hidden: true };
      post.guessConfig = { guessSong: doSong, guessArtist: doArtist };
    }

    if (currentMode === "discover") {
      post.knowledge = {
        song:   discoverSongInput.value.trim()   || "Unknown Song",
        artist: discoverArtistInput.value.trim() || "Unknown Artist"
      };
    }
  } catch (err) {
    showToast(err.message);
    return;
  }

  postBtn.disabled = true;
  postBtn.textContent = "Posting…";

  try {
    if (isFirebaseEnabled) {
      const ref = await postsRef.push(post);
      await analyticsRef.child(ref.key).set({ views: 0, guesses: [], helps: [] });
    } else {
    }

    showToast("Posted!");
    savedScrollPosition = 0;
    newPostsAvailable = false;
    renderFeed();
    resetComposer();
    closeModal(composer);

  } catch (err) {
    console.error(err);
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
  modeBtns.forEach(b => b.classList.remove("active"));
  modeBtns[0].classList.add("active");
  currentMode = "share";
  shareInputs.classList.add("active");
  guessInputs.classList.remove("active");
  discoverInputs.classList.remove("active");
  streamingSection.style.display = "block";
  guessSongCheck.checked = true;
  guessArtistCheck.checked = true;

  selectedCommunity = "general";
  document.querySelectorAll(".community-select-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.community === "general");
  });
}

// ===== DYNAMIC FONT SIZE =====
function getDynamicFontSize(text) {
  const l = text.length;
  if (l < 50)  return '1.12rem';
  if (l < 80)  return '1.02rem';
  if (l < 110) return '0.92rem';
  if (l < 140) return '0.83rem';
  return '0.74rem';
}

// ===== RENDER FEED =====
function renderFeed() {
  feedList.innerHTML = "";

  if (!postsLoaded) {
    postCount.textContent = "…";
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gold);">Loading…</div>';
    return;
  }

  let filtered = posts;
  if (activeCommunityFilter !== "all") {
    filtered = posts.filter(p => (p.community || "general") === activeCommunityFilter);
  }

  postCount.textContent = posts.length;
  updateLandingCount();

  if (filtered.length === 0) {
    feedList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary);">${
      activeCommunityFilter !== "all"
        ? `No ${COMMUNITY_CONFIG[activeCommunityFilter]?.label || activeCommunityFilter} posts yet. Be the first!`
        : "No posts yet. Be the first!"
    }</div>`;
    return;
  }

  filtered.forEach((post, i) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.style.animationDelay = `${i * 0.03}s`;

    const comm = post.community || "general";
    const cfg  = COMMUNITY_CONFIG[comm] || COMMUNITY_CONFIG.general;
    const k    = post.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
    const hasLinks = post.links && (post.links.spotify || post.links.apple || post.links.youtube || post.links.soundcloud);

    let songSection = '', actionsSection = '';

    if (post.mode === "share") {
      songSection = `<div class="feed-song"><div class="feed-song-title">${k.song}</div><div class="feed-song-artist">${k.artist}</div></div>`;
      actionsSection = `<div class="feed-actions">
        <button class="feed-action" onclick="viewPost(${posts.indexOf(post)})">View</button>
        ${hasLinks ? `<button class="feed-action" onclick="openListen(${posts.indexOf(post)})">Listen</button>` : ''}
      </div>`;
    } else if (post.mode === "guess") {
      const what = [];
      if (post.guessConfig?.guessSong)   what.push("song");
      if (post.guessConfig?.guessArtist) what.push("artist");
      if (!what.length) what.push("song","artist");
      songSection = `<div class="mystery-badge">Guess the ${what.join(" & ")}</div>`;
      actionsSection = `<div class="feed-actions">
        <button class="feed-action" onclick="openGuess(${posts.indexOf(post)})">Guess</button>
        <button class="feed-action" onclick="viewPost(${posts.indexOf(post)})">View</button>
      </div>`;
    } else if (post.mode === "discover") {
      const hasClue = k.song !== "Unknown Song" || k.artist !== "Unknown Artist";
      songSection = `<div class="discover-badge">${hasClue ? `Maybe: ${k.song} — ${k.artist}` : 'Help discover this song'}</div>`;
      actionsSection = `<div class="feed-actions">
        <button class="feed-action" onclick="openDiscover(${posts.indexOf(post)})">Help</button>
        <button class="feed-action" onclick="viewPost(${posts.indexOf(post)})">View</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="feed-card-top">
        <div class="feed-time">${timeAgo(post.timestamp)}</div>
        <div class="feed-community-tag" style="color:${cfg.color};background:${cfg.bg};border-color:${cfg.color}44;">${cfg.label}</div>
      </div>
      <div class="feed-text" style="font-size:${getDynamicFontSize(post.text)}">${post.text}</div>
      <div class="feed-emotion">${post.emotion || "Nostalgia"}</div>
      ${songSection}
      ${actionsSection}
    `;

    feedList.appendChild(card);
  });
}

// ===== TIME AGO =====
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

// ===== TRACK VIEW =====
function trackView(postId) {
  if (isFirebaseEnabled) {
    analyticsRef.child(postId).child('views').transaction(v => (v || 0) + 1);
  }
}

// ===== VIEW POST =====
function viewPost(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);

  postcardLyric.textContent   = currentPost.text;
  postcardEmotion.textContent = currentPost.emotion || "Nostalgia";

  const k = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };

  if (currentPost.mode === "guess") {
    postcardSong.innerHTML = `<div style="font-style:italic;color:var(--text-secondary)">Guess correctly to reveal</div>`;
  } else {
    postcardSong.innerHTML = `<div>${k.song}</div><div>${k.artist}</div>`;
  }

  const comm = currentPost.community || "general";
  const cfg  = COMMUNITY_CONFIG[comm] || COMMUNITY_CONFIG.general;
  postcardCommunity.innerHTML = `<span style="font-size:0.7rem;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:1px;">${cfg.label}</span>`;

  const hasLinks = currentPost.links && (currentPost.links.spotify || currentPost.links.apple || currentPost.links.youtube || currentPost.links.soundcloud);
  listenPostcard.style.display = (hasLinks && currentPost.mode !== "guess") ? 'block' : 'none';

  openModal(postcardModal);
}

// ===== LISTEN FROM POSTCARD =====
listenPostcard.onclick = () => {
  const idx = posts.findIndex(p => p.id === currentPost.id);
  if (idx !== -1) { closeModal(postcardModal); openListen(idx); }
};

// ===== OPEN LISTEN =====
function openListen(index) {
  currentPost = posts[index];
  if (!currentPost || !currentPost.links) { showToast("No streaming links available"); return; }

  listenLinks.innerHTML = "";
  const platforms = [
    { name:'Spotify',     key:'spotify' },
    { name:'Apple Music', key:'apple' },
    { name:'YouTube',     key:'youtube' },
    { name:'SoundCloud',  key:'soundcloud' }
  ];

  let has = false;
  platforms.forEach(p => {
    if (currentPost.links[p.key]) {
      has = true;
      const a = document.createElement("a");
      a.className = "listen-link";
      a.href = currentPost.links[p.key];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = p.name;
      listenLinks.appendChild(a);
    }
  });

  if (!has) { showToast("No streaming links available"); return; }
  openModal(listenModal);
}

// ===== OPEN GUESS =====
function openGuess(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  currentGuessAttempts = 0;

  guessLyric.textContent = currentPost.text;
  guessSongInput.value   = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  guessLinksSection.classList.add("hidden");
  guessInputFields.classList.remove("hidden");
  submitGuess.classList.remove("hidden");
  revealAnswer.classList.add("hidden");

  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  guessSongInput.style.display   = doSong   ? 'block' : 'none';
  guessArtistInput.style.display = doArtist ? 'block' : 'none';

  const what = [];
  if (doSong)   what.push("song");
  if (doArtist) what.push("artist");
  guessHint.textContent = `You have ${MAX_GUESS_ATTEMPTS} attempt${MAX_GUESS_ATTEMPTS>1?'s':''} to guess the ${what.join(" and ")}.`;

  openModal(guessModal);
}

// ===== SHOW GUESS LINKS =====
function showGuessLinks() {
  if (!currentPost || !currentPost.links) return;
  const links = currentPost.links;
  if (!links.spotify && !links.apple && !links.youtube && !links.soundcloud) return;

  let html = '<div class="guess-links-title">Listen to the song</div><div class="guess-links-container">';
  if (links.spotify)    html += `<a href="${links.spotify}"    target="_blank" rel="noopener noreferrer" class="guess-link">Spotify</a>`;
  if (links.apple)      html += `<a href="${links.apple}"      target="_blank" rel="noopener noreferrer" class="guess-link">Apple Music</a>`;
  if (links.youtube)    html += `<a href="${links.youtube}"    target="_blank" rel="noopener noreferrer" class="guess-link">YouTube</a>`;
  if (links.soundcloud) html += `<a href="${links.soundcloud}" target="_blank" rel="noopener noreferrer" class="guess-link">SoundCloud</a>`;
  html += '</div>';

  guessLinksSection.innerHTML = html;
  guessLinksSection.classList.remove("hidden");
}

// ===== SUBMIT GUESS =====
submitGuess.onclick = () => {
  if (!currentPost) return;
  currentGuessAttempts++;

  const k = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;

  const gs = guessSongInput.value.trim().toLowerCase();
  const ga = guessArtistInput.value.trim().toLowerCase();
  const as = k.song.toLowerCase();
  const aa = k.artist.toLowerCase();

  const songOk   = !doSong   || (gs && (gs === as || gs.includes(as) || as.includes(gs)));
  const artistOk = !doArtist || (ga && (ga === aa || ga.includes(aa) || aa.includes(ga)));
  const correct  = songOk && artistOk;

  const guessData = { song: gs||null, artist: ga||null, correct, timestamp: Date.now() };
  if (isFirebaseEnabled) {
    analyticsRef.child(currentPost.id).child('guesses').push(guessData);
  }

  guessResult.classList.remove("hidden");

  if (correct) {
    guessResult.className = "result-message success";
    guessResult.innerHTML = `<div style="margin-bottom:6px">Correct!</div><div style="font-size:0.83rem">"${k.song}" by ${k.artist}</div>`;
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.add("hidden");
    showGuessLinks();
    return;
  }

  if (currentGuessAttempts >= MAX_GUESS_ATTEMPTS) {
    guessResult.className = "result-message error";
    guessResult.innerHTML = `<div style="margin-bottom:6px">Out of attempts</div><div style="font-size:0.82rem">Song: ${k.song}<br>Artist: ${k.artist}</div>`;
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.add("hidden");
    showGuessLinks();
    return;
  }

  // Partial or wrong — show feedback, keep going
  const partialSong   = doSong   && gs && (gs === as || gs.includes(as) || as.includes(gs));
  const partialArtist = doArtist && ga && (ga === aa || ga.includes(aa) || aa.includes(ga));
  const left = MAX_GUESS_ATTEMPTS - currentGuessAttempts;

  if (partialSong || partialArtist) {
    guessResult.className = "result-message partial";
    let fb = '<div style="margin-bottom:6px">Partially correct</div>';
    if (doSong)   fb += `<div style="font-size:0.8rem">${partialSong   ? '✓' : '✗'} Song: ${gs || '(empty)'}</div>`;
    if (doArtist) fb += `<div style="font-size:0.8rem">${partialArtist ? '✓' : '✗'} Artist: ${ga || '(empty)'}</div>`;
    fb += `<div style="font-size:0.74rem;margin-top:6px">${left} attempt${left>1?'s':''} left</div>`;
    guessResult.innerHTML = fb;
  } else {
    guessResult.className = "result-message error";
    let fb = '<div style="margin-bottom:6px">Incorrect</div>';
    fb += `<div style="font-size:0.74rem;margin-top:6px">${left} attempt${left>1?'s':''} left</div>`;
    guessResult.innerHTML = fb;
  }

  guessSongInput.value = "";
  guessArtistInput.value = "";
};

// ===== REVEAL ANSWER =====
revealAnswer.onclick = () => {
  const k = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
  guessInputFields.classList.add("hidden");
  submitGuess.classList.add("hidden");
  revealAnswer.classList.add("hidden");
  guessResult.className = "result-message success";
  guessResult.innerHTML = `<div style="margin-bottom:6px">Answer</div><div style="font-size:0.83rem">Song: ${k.song}<br>Artist: ${k.artist}</div>`;
  guessResult.classList.remove("hidden");
  showGuessLinks();
};

// ===== OPEN DISCOVER =====
function openDiscover(index) {
  currentPost = posts[index];
  if (!currentPost) return;
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
  const song   = discoverSongAnswer.value.trim();
  const artist = discoverArtistAnswer.value.trim();
  if (!song || !artist) { showToast("Please enter both song and artist"); return; }

  const helpData = {
    song, artist,
    links: {
      spotify:    discoverSpotifyLink.value.trim()    || null,
      apple:      discoverAppleLink.value.trim()      || null,
      youtube:    discoverYoutubeLink.value.trim()    || null,
      soundcloud: discoverSoundcloudLink.value.trim() || null
    },
    timestamp: Date.now()
  };

  if (isFirebaseEnabled) {
    analyticsRef.child(currentPost.id).child('helps').push(helpData);
  }

  showToast("Thanks for helping!");
  closeModal(discoverModal);
};

// ===== ANALYTICS =====
analyticsBtn.onclick = () => {
  if (!currentPost) return;
  const an = postAnalytics[currentPost.id] || { views:0 };
  const guesses = Array.isArray(an.guesses) ? an.guesses : Object.values(an.guesses || {});
  const helps   = Array.isArray(an.helps)   ? an.helps   : Object.values(an.helps   || {});

  const body = document.querySelector('#analyticsModal .modal-body');

  let statsHTML = `<div class="analytics-stats">
    <div class="stat-card"><div class="stat-number">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if (currentPost.mode === 'guess')    statsHTML += `<div class="stat-card"><div class="stat-number">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if (currentPost.mode === 'discover') statsHTML += `<div class="stat-card"><div class="stat-number">${helps.length}</div><div class="stat-label">Helps</div></div>`;
  statsHTML += '</div>';

  body.innerHTML = statsHTML;

  if (currentPost.mode === 'guess' && guesses.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'activity-section';
    sec.innerHTML = '<h4>Guess Attempts</h4><div class="activity-list" id="guessesList2"></div>';
    body.appendChild(sec);
    const list = sec.querySelector('#guessesList2');
    guesses.forEach(g => {
      const item = document.createElement('div');
      item.className = `activity-item ${g.correct ? 'correct' : 'incorrect'}`;
      item.innerHTML = `<div class="activity-guess">${g.song ? 'Song: '+g.song : ''}${g.artist ? '<br>Artist: '+g.artist : ''}</div><div class="activity-result ${g.correct ? 'correct':'incorrect'}">${g.correct ? 'Correct' : 'Incorrect'}</div><div class="activity-time">${timeAgo(g.timestamp)}</div>`;
      list.appendChild(item);
    });
  }

  if (currentPost.mode === 'discover' && helps.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'activity-section';
    sec.innerHTML = '<h4>Community Answers</h4><div class="activity-list" id="helpsList2"></div>';
    body.appendChild(sec);
    const list = sec.querySelector('#helpsList2');
    helps.forEach(h => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      let linksHTML = '';
      if (h.links) {
        const ll = [];
        if (h.links.spotify)    ll.push(`<a href="${h.links.spotify}"    target="_blank" class="activity-link">Spotify</a>`);
        if (h.links.apple)      ll.push(`<a href="${h.links.apple}"      target="_blank" class="activity-link">Apple Music</a>`);
        if (h.links.youtube)    ll.push(`<a href="${h.links.youtube}"    target="_blank" class="activity-link">YouTube</a>`);
        if (h.links.soundcloud) ll.push(`<a href="${h.links.soundcloud}" target="_blank" class="activity-link">SoundCloud</a>`);
        if (ll.length) linksHTML = `<div class="activity-links">${ll.join('')}</div>`;
      }
      item.innerHTML = `<div class="activity-guess"><strong>Song:</strong> ${h.song}<br><strong>Artist:</strong> ${h.artist}</div>${linksHTML}<div class="activity-time">${timeAgo(h.timestamp)}</div>`;
      list.appendChild(item);
    });
  }

  closeModal(postcardModal);
  openModal(analyticsModal);
};

// ===== MODAL CLOSE BUTTONS =====
document.getElementById("closeGuess").onclick     = () => { closeModal(guessModal);      currentGuessAttempts = 0; };
document.getElementById("closeDiscover").onclick  = () => closeModal(discoverModal);
document.getElementById("closePostcard").onclick  = () => closeModal(postcardModal);
document.getElementById("closeListen").onclick    = () => closeModal(listenModal);
document.getElementById("closeAnalytics").onclick = () => closeModal(analyticsModal);
document.getElementById("closeSharePoster").onclick = () => { closeModal(sharePosterModal); resetPosterModal(); };




// ===== FONT PICKER =====
document.querySelectorAll(".font-option").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".font-option").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedFont = btn.dataset.font;
    updateLivePreview();
  };
});

// ===== POSTER: COLOR DOTS =====
document.querySelectorAll(".color-dot").forEach(dot => {
  dot.onclick = () => {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
    dot.classList.add("active");
    selectedDesign = dot.dataset.design;
    updateLivePreview();
  };
});


// ===== BACKGROUND UPLOAD =====
const uploadBgBtn = document.getElementById("uploadBgBtn");
const bgUploadInput = document.getElementById("bgUploadInput");

if (uploadBgBtn) {
  uploadBgBtn.onclick = () => bgUploadInput.click();
}

if (bgUploadInput) {
  bgUploadInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast("Please upload an image"); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("File too large. Max 10MB"); return; }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        uploadedBgImage = img;
        showToast("Background uploaded! Preview updating...");
        updateLivePreview();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
}

// ===== POSTER: LIVE PREVIEW =====
function updateLivePreview() {
  if (!currentPost || !posterPreviewCanvas) return;
  const ctx = posterPreviewCanvas.getContext('2d');
  const W = 320, H = 320;
  posterPreviewCanvas.width = W;
  posterPreviewCanvas.height = H;
  const c = POSTER_DESIGNS[selectedDesign];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c.bg[0]); g.addColorStop(0.5, c.bg[1]); g.addColorStop(1, c.bg[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fs = 13;
  ctx.fillStyle = c.primary; const headerFont = c.font === 'sans-bold' ? `900 ${fs*1.4}px sans-serif` : c.font === 'sans' ? `700 ${fs*1.3}px sans-serif` : `bold ${fs*1.3}px serif`;
  ctx.font = headerFont; ctx.textAlign = 'center';
  ctx.fillText('MARGO', W/2, 38);
  ctx.fillStyle = c.text; ctx.font = `italic ${fs*0.95}px serif`;
  const prev = currentPost.text.length > 80 ? currentPost.text.substring(0,77)+'…' : currentPost.text;
  wrapText(ctx, prev, W/2, H/2 - 28, W*0.85, fs*1.3);
  ctx.fillStyle = c.primary; ctx.font = `600 ${fs*0.74}px sans-serif`;
  ctx.fillText(`#${currentPost.emotion||'Nostalgia'}`, W/2, H/2 + 36);
  ctx.strokeStyle = c.secondary; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(W*0.3, H/2+50); ctx.lineTo(W*0.7, H/2+50); ctx.stroke();
  const k = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
  ctx.fillStyle = c.primary; ctx.font = `bold ${fs*0.9}px serif`;
  ctx.fillText(k.song.length > 26 ? k.song.substring(0,26)+'…' : k.song, W/2, H/2+72);
  ctx.fillStyle = c.secondary; ctx.font = `500 ${fs*0.74}px sans-serif`;
  ctx.fillText(k.artist.length > 30 ? k.artist.substring(0,30)+'…' : k.artist, W/2, H/2+88);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', lines = [];
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxW && n > 0) { lines.push(line); line = words[n] + ' '; }
    else line = test;
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lh));
}

// ===== POSTER: STEP NAVIGATION =====
nextToPlatform.onclick = () => { designStep.classList.remove("active"); platformStep.classList.add("active"); };
backToDesign.onclick   = () => { platformStep.classList.remove("active"); designStep.classList.add("active"); };
backToPlatform.onclick = () => { shareStep.classList.remove("active"); platformStep.classList.add("active"); };

// ===== POSTER: PLATFORM SELECTION =====
document.querySelectorAll(".platform-btn[data-size]").forEach(btn => {
  btn.onclick = async () => {
    selectedPosterSize = btn.dataset.size;
    await generatePoster(selectedPosterSize, selectedDesign);
    shareableLink.value = `${APP_BASE_URL}?post=${currentPost.id}`;
    platformStep.classList.remove("active");
    shareStep.classList.add("active");
    // For Discord: auto-highlight the copy button
    const copyDiscordBtn = document.getElementById("copyForDiscordBtn");
    if (copyDiscordBtn) {
      if (selectedPosterSize === 'discord') {
        copyDiscordBtn.style.background = 'linear-gradient(135deg,#5865f2,#404eed)';
        copyDiscordBtn.style.color = '#fff';
        copyDiscordBtn.textContent = 'Copy for Discord (Recommended)';
      } else {
        copyDiscordBtn.style.background = '';
        copyDiscordBtn.style.color = '';
        copyDiscordBtn.textContent = 'Copy for Discord';
      }
    }
  };
});

// ===== GENERATE POSTER =====
async function generatePoster(size, design) {
  if (!currentPost) return;
  const sizes = {
    'instagram-square': { w:1080, h:1080 },
    'instagram-story':  { w:1080, h:1920 },
    'twitter':          { w:1200, h:675  },
    'facebook':         { w:1200, h:630  },
    'pinterest':        { w:1000, h:1500 },
    'discord':          { w:1280, h:720  },
    'reddit':           { w:1200, h:1200 }
  };
  const d   = sizes[size];
  const c   = POSTER_DESIGNS[design];
  const ctx = posterCanvas.getContext('2d');
  posterCanvas.width  = d.w;
  posterCanvas.height = d.h;
  
  if (uploadedBgImage) {
    const scale = Math.max(d.w / uploadedBgImage.width, d.h / uploadedBgImage.height);
    const sw = uploadedBgImage.width * scale;
    const sh = uploadedBgImage.height * scale;
    const sx = (d.w - sw) / 2;
    const sy = (d.h - sh) / 2;
    ctx.drawImage(uploadedBgImage, sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, d.w, d.h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, d.h);
    g.addColorStop(0, c.bg[0]); g.addColorStop(0.5, c.bg[1]); g.addColorStop(1, c.bg[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, d.w, d.h);
  }
  const fs = d.w * 0.032;
  ctx.fillStyle = c.primary; const headerFont = c.font === 'sans-bold' ? `900 ${fs*1.6}px sans-serif` : c.font === 'sans' ? `700 ${fs*1.4}px sans-serif` : `bold ${fs*1.4}px serif`;
  ctx.font = headerFont; ctx.textAlign = 'center';
  ctx.fillText('MARGO', d.w/2, d.h*0.11);
  ctx.fillStyle = c.text; ctx.font = `italic ${fs*1.15}px serif`;
  wrapText(ctx, currentPost.text, d.w/2, d.h*0.38, d.w*0.85, fs*1.7);
  ctx.shadowBlur = uploadedBgImage ? 8 : 0;
  ctx.fillStyle = uploadedBgImage ? '#ffffff' : c.primary; ctx.font = `600 ${fs*0.85}px sans-serif`;
  ctx.fillText(`#${currentPost.emotion||'Nostalgia'}`, d.w/2, d.h*0.62);
  ctx.strokeStyle = uploadedBgImage ? 'rgba(255,255,255,0.6)' : c.secondary; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(d.w*0.3, d.h*0.68); ctx.lineTo(d.w*0.7, d.h*0.68); ctx.stroke();
  const k = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
  ctx.shadowBlur = uploadedBgImage ? 8 : 0;
  ctx.fillStyle = uploadedBgImage ? '#ffffff' : c.primary; ctx.font = `bold ${fs*1.1}px ${fontData.family}`;
  ctx.fillText(k.song, d.w/2, d.h*0.78);
  ctx.fillStyle = uploadedBgImage ? 'rgba(255,255,255,0.85)' : c.secondary; ctx.font = `500 ${fs*0.9}px sans-serif`;
  ctx.fillText(k.artist, d.w/2, d.h*0.85);
  ctx.shadowBlur = 0;
  ctx.fillStyle = uploadedBgImage ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.25)'; ctx.font = `500 ${fs*0.6}px sans-serif`;
  ctx.fillText(APP_BASE_URL.replace(/^https?:\/\//, ''), d.w/2, d.h*0.95);
  return new Promise(res => posterCanvas.toBlob(blob => { generatedPosterBlob = blob; res(); }, 'image/png'));
}

// ===== SHARE POSTER BUTTON =====
sharePosterBtn.onclick = () => {
  closeModal(postcardModal);
  resetPosterModal();
  setTimeout(updateLivePreview, 80);
  openModal(sharePosterModal);
};

function resetPosterModal() {
  designStep.classList.add("active");
  platformStep.classList.remove("active");
  shareStep.classList.remove("active");
  selectedDesign = "midnight-gold";
  selectedPosterSize = null;
  generatedPosterBlob = null;
  document.querySelectorAll(".color-dot").forEach((d,i) => d.classList.toggle("active", i===0));
}

// ===== COPY LINK =====
copyLinkBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(shareableLink.value);
    copyLinkBtn.textContent = "Copied!";
    setTimeout(() => { copyLinkBtn.textContent = "Copy"; }, 2000);
    showToast("Link copied!");
  } catch {
    shareableLink.select();
    showToast("Copy the link manually");
  }
};

// ===== SHARE NATIVE =====

// ===== COPY FOR DISCORD =====
const copyForDiscordBtn = document.getElementById("copyForDiscordBtn");
if (copyForDiscordBtn) {
  copyForDiscordBtn.onclick = async () => {
    if (!generatedPosterBlob) { showToast("Generating poster…"); return; }
    try {
      // Try Clipboard API (works in Chrome/Edge)
      const item = new ClipboardItem({ "image/png": generatedPosterBlob });
      await navigator.clipboard.write([item]);
      copyForDiscordBtn.textContent = "Copied! Now paste in Discord";
      setTimeout(() => { copyForDiscordBtn.textContent = "Copy for Discord"; }, 3000);
      showToast("Image copied — paste directly in Discord!");
    } catch (err) {
      // Fallback: download and instruct
      downloadPosterFile();
      showToast("Saved to device — drag the image into Discord");
    }
  };
}

shareNativeBtn.onclick = async () => {
  if (!generatedPosterBlob) { showToast("Generating poster…"); return; }
  const sd = {
    title: `MARGO — ${currentPost.text.substring(0,50)}`,
    text: `"${currentPost.text}"\n\n${shareableLink.value}`,
    files: [ new File([generatedPosterBlob], `margo-${Date.now()}.png`, { type:'image/png' }) ]
  };
  try {
    if (navigator.canShare && navigator.canShare(sd)) {
      await navigator.share(sd);
      showToast("Shared!");
    } else {
      downloadPosterFile();
      showToast("Poster saved. Share it manually.");
    }
  } catch (e) {
    if (e.name !== 'AbortError') { downloadPosterFile(); showToast("Sharing failed. Poster saved."); }
  }
};

// ===== DOWNLOAD POSTER =====
downloadManualBtn.onclick = downloadPosterFile;

function downloadPosterFile() {
  const a = document.createElement('a');
  a.download = `margo-poster-${selectedPosterSize||'image'}-${Date.now()}.png`;
  a.href = posterCanvas.toDataURL('image/png');
  a.click();
  showToast("Poster saved!");
}


// ===== UPLOAD MEDIA MODAL =====











// ===== TOAST =====
function showToast(msg) {
  const ex = document.querySelector(".toast");
  if (ex) ex.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
}

// ===== SHARED POST LINK =====
function handleSharedPostLink() {
  const postId = new URLSearchParams(window.location.search).get('post');
  if (!postId) return;

  const tryOpen = () => {
    const idx = posts.findIndex(p => p.id == postId);
    if (idx !== -1) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
      setTimeout(() => viewPost(idx), 300);
      return true;
    }
    return false;
  };

  if (!tryOpen() && isFirebaseEnabled) {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (tryOpen() || attempts > 20) clearInterval(check);
    }, 500);
  }
}

// ===== INIT =====
setupScrollToTop();
window.addEventListener('load', handleSharedPostLink);
console.log("MARGO loaded. Firebase:", isFirebaseEnabled);
