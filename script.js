/* MARGO — script.js
   Brand Identity System 4.0 integrated

   CHANGES FROM ORIGINAL:
   ─────────────────────────────────────────────────────────
   1. POSTER_DESIGNS['midnight-gold'].primary updated to #E8C547
   2. FONT_FAMILIES: added 'dm-serif' entry using brand kit font
   3. drawPosterToCtx: MARGO mark uses Space Mono (brand kit utility)
   4. drawPosterToCtx: domain watermark uses Space Mono
   5. All other studio logic identical to original
   ─────────────────────────────────────────────────────────

   v4.1 CHANGES (surgical — zero behavior change to existing features):
   ─────────────────────────────────────────────────────────
   A. post.community now saves selectedEmotion instead of "general"
      (was: community: "general" — now: community: selectedEmotion)
      This is a one-line fix. Existing posts are unaffected.

   B. activeRoom state variable added (default: "all")
      Controls which emotion room is currently filtered.

   C. initRoomTabs() — wires up the room tab buttons in the HTML.
      Clicking a tab sets activeRoom and calls renderFeed().
      "All" tab shows everything. Emotion tabs filter by post.emotion.

   D. getFilteredPosts() updated: room filter is applied BEFORE
      the search query filter, so both can work together.

   E. initRoomTabs() called in the INIT block at the bottom.
   ─────────────────────────────────────────────────────────
*/

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
const APP_DOMAIN   = "trymargo.com";

let isFirebaseEnabled = false;
let postsRef = null;
let analyticsRef = null;
let firebaseAuth = null;

try {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  postsRef     = database.ref('posts');
  analyticsRef = database.ref('analytics');
  firebaseAuth = firebase.auth();
  isFirebaseEnabled = true;
  console.log('Firebase OK');
} catch (e) {
  console.warn('Firebase failed:', e.message);
}

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let currentPost = null;
let currentGuessAttempts = 0;
const MAX_GUESS_ATTEMPTS = 2;
let posts = [];
let postAnalytics = {};
let postsLoaded = false;
let savedScrollPosition = 0;
let newPostsAvailable = false;
let searchQuery = "";

// v4.1: active emotion room — "all" shows everything
let activeRoom = "all";

// ===== STUDIO STATE =====
const FONT_FAMILIES = {
  'playfair':    { family: "'Playfair Display', serif",   style: 'italic', label: 'Playfair'    },
  'cormorant':   { family: "'Cormorant Garamond', serif", style: 'italic', label: 'Cormorant'   },
  'lora':        { family: "'Lora', serif",               style: 'italic', label: 'Lora'        },
  'merriweather':{ family: "'Merriweather', serif",       style: 'normal', label: 'Merriweather'},
  'josefin':     { family: "'Josefin Sans', sans-serif",  style: 'normal', label: 'Josefin'     },
  'bebas':       { family: "'Bebas Neue', sans-serif",    style: 'normal', label: 'Bebas'       },
  'oswald':      { family: "'Oswald', sans-serif",        style: 'normal', label: 'Oswald'      },
  'dancing':     { family: "'Dancing Script', cursive",   style: 'normal', label: 'Dancing'     },
};

// Brand kit §01 colour system — all gold values exact
const POSTER_DESIGNS = {
  'midnight-gold':   { bg:['#0B0B0D','#1a1410','#0B0B0D'], primary:'#E8C547',  text:'#F0F0F0', light:false },
  'royal-purple':    { bg:['#1a0033','#2d1b4e','#1a0033'], primary:'#c77dff',  text:'#F0F0F0', light:false },
  'neon-cyan':       { bg:['#0a1420','#142838','#0a1420'], primary:'#00e5ff',  text:'#F0F0F0', light:false },
  'sunset-coral':    { bg:['#1a0a0a','#2d1416','#1a0a0a'], primary:'#ff8080', text:'#F0F0F0', light:false },
  'emerald-night':   { bg:['#051a0d','#0d2e1a','#051a0d'], primary:'#50fa7b', text:'#F0F0F0', light:false },
  'rose-gold':       { bg:['#1a0d0f','#2d1a1f','#1a0d0f'], primary:'#f4a4c0', text:'#F0F0F0', light:false },
  'cream-editorial': { bg:['#f5f1e8','#ebe3d5','#f5f1e8'], primary:'#2a2520',  text:'#2a2520', light:true  },
  'monochrome':      { bg:['#000000','#111111','#000000'], primary:'#ffffff',  text:'#ffffff', light:false },
  'vaporwave':       { bg:['#2d0a3d','#6b1fa8','#1a0d3d'], primary:'#ff71ce',  text:'#ffffff', light:false },
  'neon-dark':       { bg:['#0a0a0a','#0f0f0f','#0a0a0a'], primary:'#ff00ff', text:'#00ffff', light:false },
  'y2k-chrome':      { bg:['#000033','#1a1a4d','#000033'], primary:'#00ffff',  text:'#ffffff', light:false },
  'brutalist':       { bg:['#ffffff','#f0f0f0','#ffffff'],  primary:'#000000', text:'#000000', light:true  },
};

const EMOTION_DESIGN_MAP = {
  Love:'rose-gold', Heartbreak:'sunset-coral', Hope:'emerald-night',
  Nostalgia:'midnight-gold', Healing:'cream-editorial', Joy:'vaporwave',
  Rage:'neon-dark', Loneliness:'royal-purple'
};

const POSTER_SIZES = {
  'instagram-square': { w:1080, h:1080  },
  'instagram-story':  { w:1080, h:1920  },
  'reddit':           { w:1200, h:1200  },
  'twitter':          { w:1200, h:675   },
  'pinterest':        { w:1000, h:1500  },
};

let studioFont      = 'playfair';
let studioDesign    = 'midnight-gold';
let studioBgImage   = null;
let studioBrightness= 100;
let studioBlur      = 0;
let studioDim       = 50;
let studioFilter    = 'none';
let generatedBlob   = null;
let selectedSize    = null;

// ===== USER ID =====
let userId = localStorage.getItem("margoUserId");
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  localStorage.setItem("margoUserId", userId);
}

// ===== ELEMENTS =====
const landing           = document.getElementById("landing");
const feed              = document.getElementById("feed");
const composer          = document.getElementById("composer");
const guessModal        = document.getElementById("guessModal");
const discoverModal     = document.getElementById("discoverModal");
const postcardModal     = document.getElementById("postcardModal");
const listenModal       = document.getElementById("listenModal");
const analyticsModal    = document.getElementById("analyticsModal");

const enterBtn          = document.getElementById("enterBtn");
const backBtn           = document.getElementById("backBtn");
const openComposerBtn   = document.getElementById("openComposer");
const closeComposerBtn  = document.getElementById("closeComposer");
const postBtn           = document.getElementById("postBtn");
const textInput         = document.getElementById("textInput");
const charCount         = document.getElementById("charCount");
const feedList          = document.getElementById("feedList");
const newPostsIndicator = document.getElementById("newPostsIndicator");
const scrollToTopBtn    = document.getElementById("scrollToTopBtn");

const modeBtns          = document.querySelectorAll(".mode-btn");
const shareInputs       = document.getElementById("shareInputs");
const guessInputs       = document.getElementById("guessInputs");
const discoverInputs    = document.getElementById("discoverInputs");
const streamingSection  = document.getElementById("streamingSection");

const songInput         = document.getElementById("songInput");
const artistInput       = document.getElementById("artistInput");
const guessSongCheck    = document.getElementById("guessSongCheck");
const guessArtistCheck  = document.getElementById("guessArtistCheck");
const guessSongAnswer   = document.getElementById("guessSongAnswer");
const guessArtistAnswer = document.getElementById("guessArtistAnswer");
const discoverSongInput = document.getElementById("discoverSongInput");
const discoverArtistInput = document.getElementById("discoverArtistInput");

const spotifyLink       = document.getElementById("spotifyLink");
const appleLink         = document.getElementById("appleLink");
const youtubeLink       = document.getElementById("youtubeLink");
const soundcloudLink    = document.getElementById("soundcloudLink");

const sharePosterBtn    = document.getElementById("sharePosterBtn");
const listenPostcard    = document.getElementById("listenPostcard");
const analyticsBtn      = document.getElementById("analyticsBtn");

const studioOverlay     = document.getElementById("studioOverlay");
const studioCanvas      = document.getElementById("studioCanvas");
const closeStudio       = document.getElementById("closeStudio");
const studioExportBtn   = document.getElementById("studioExportBtn");
const sizePicker        = document.getElementById("sizePicker");
const sizeCancelBtn     = document.getElementById("sizeCancelBtn");
const ceremonyOverlay   = document.getElementById("ceremonyOverlay");
const ceremonyThumb     = document.getElementById("ceremonyThumb");
const cerDownload       = document.getElementById("cerDownload");
const cerShare          = document.getElementById("cerShare");
const ceremonyBack      = document.getElementById("ceremonyBack");
const photoDropText     = document.getElementById("photoDropText");
const photoDropZone     = document.getElementById("photoUploadZone");
const studioPhotoInput  = document.getElementById("studioPhotoInput");
const photoControls     = document.getElementById("photoControls");

// ===== FONT PRELOAD =====
function preloadStudioFonts() {
  const fonts = [
    "700 16px 'Playfair Display'", "italic 16px 'Playfair Display'",
    "600 16px 'Cormorant Garamond'", "italic 16px 'Cormorant Garamond'",
    "600 16px 'Lora'", "italic 16px 'Lora'",
    "700 16px 'Merriweather'", "700 16px 'Josefin Sans'",
    "400 16px 'Bebas Neue'", "600 16px 'Oswald'",
    "700 16px 'Dancing Script'",
    "800 16px 'Syne'",
    "700 16px 'Space Mono'",
    "italic 16px 'DM Serif Display'",
    "700 16px 'DM Sans'",
  ];
  fonts.forEach(f => document.fonts.load(f).catch(() => {}));
}

// ===== LYRIC STREAM SAMPLES =====
const STREAM_SAMPLES = [
  { text: "I gave you all I had and still you left",              emotion: "Heartbreak" },
  { text: "Some nights I still hear your voice in the quiet",     emotion: "Nostalgia"  },
  { text: "Dancing alone was better than lying beside you",       emotion: "Healing"    },
  { text: "The city never sleeps but I always dream of you",      emotion: "Love"       },
  { text: "Rage is just grief that forgot how to cry",            emotion: "Rage"       },
  { text: "Every sunrise is a permission to start over",          emotion: "Hope"       },
  { text: "I carry your memory like a song I can't name",         emotion: "Loneliness" },
  { text: "Nothing gold can stay but gold can glow forever",      emotion: "Nostalgia"  },
  { text: "You were thunder and I was the calm after",            emotion: "Love"       },
  { text: "Joy is not the absence of pain, it's dancing anyway",  emotion: "Joy"        },
  { text: "Missing someone is just love with nowhere to go",      emotion: "Loneliness" },
  { text: "I built a home in your chest and you moved out",       emotion: "Heartbreak" },
];

function buildLyricStream() {
  const track1 = document.getElementById("track1");
  const track2 = document.getElementById("track2");
  if (!track1 || !track2) return;
  track1.innerHTML = '';
  track2.innerHTML = '';
  const source = getTickerPosts();
  const fill   = [...source, ...source, ...source];

  const buildCard = (item) => {
    const emotion = item.emotion || 'Nostalgia';
    const eClass  = 'emotion-' + emotion.toLowerCase();
    const text    = item.text || '';
    const display = text.length > 44 ? text.substring(0, 44) + '…' : text;
    const card    = document.createElement('div');
    card.className = 'lyric-card' + (Math.random() > 0.65 ? ' featured' : '');
    card.innerHTML = `<div class="lyric-card-text">${display}</div>
      <div class="lyric-card-meta"><span class="lyric-card-emotion ${eClass}">${emotion}</span></div>`;
    return card;
  };

  const offset = Math.floor(source.length / 2);
  fill.forEach(item => track1.appendChild(buildCard(item)));
  [...source.slice(offset), ...source, ...source, ...source.slice(0, offset)]
    .forEach(item => track2.appendChild(buildCard(item)));
}

function getTickerPosts() {
  if (posts.length < 6) return STREAM_SAMPLES;
  const recent  = posts.slice(0, 4);
  const byViews = posts.filter(p => !recent.includes(p))
    .sort((a,b) => (postAnalytics[b.id]?.views||0) - (postAnalytics[a.id]?.views||0))
    .slice(0, 4);
  const rest   = posts.filter(p => !recent.includes(p) && !byViews.includes(p));
  const random = rest.sort(() => Math.random() - 0.5).slice(0, 4);
  return [...recent, ...byViews, ...random];
}

// ===== FEATURED STATS =====
function calcFeatured() {
  const artistCounts = {}, songCounts = {}, emotionCounts = {};
  posts.forEach(p => {
    const artist  = p.knowledge?.artist;
    const song    = p.knowledge?.song;
    const emotion = p.emotion || 'Nostalgia';
    if (artist && artist !== 'Unknown Artist') { const k = artist.trim(); artistCounts[k] = (artistCounts[k]||0)+1; }
    if (song   && song   !== 'Unknown Song')   { const k = song.trim();   songCounts[k]   = (songCounts[k]  ||0)+1; }
    emotionCounts[emotion] = (emotionCounts[emotion]||0)+1;
  });
  const artistEntries = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]);
  const songEntries   = Object.entries(songCounts).sort((a,b)=>b[1]-a[1]);
  const topEmotion    = Object.entries(emotionCounts).sort((a,b)=>b[1]-a[1])[0];
  return {
    uniqueArtistCount: Object.keys(artistCounts).length,
    uniqueSongCount:   Object.keys(songCounts).length,
    topArtist: (artistEntries[0]?.[1] >= 2) ? artistEntries[0][0] : null,
    topSong:   (songEntries[0]?.[1]   >= 2) ? songEntries[0][0]   : null,
    topEmotion
  };
}

function updateLandingStats() {
  const n = posts.length || 0;
  const $ = id => document.getElementById(id);
  if ($("liveCount"))  $("liveCount").textContent  = n;
  if ($("statTotal"))  $("statTotal").textContent  = n || '—';
  if ($("postCount"))  $("postCount").textContent  = n;
  if (!n) {
    ["featuredArtistCount","featuredSongCount","topArtistName","topSongName","topEmotion"]
      .forEach(id => { if ($(id)) $(id).textContent = '—'; });
    return;
  }
  const { uniqueArtistCount, uniqueSongCount, topArtist, topSong, topEmotion } = calcFeatured();
  if ($("featuredArtistCount")) $("featuredArtistCount").textContent = uniqueArtistCount || '—';
  if ($("featuredSongCount"))   $("featuredSongCount").textContent   = uniqueSongCount   || '—';
  if ($("topArtistName"))       $("topArtistName").textContent       = topArtist         || '—';
  if ($("topSongName"))         $("topSongName").textContent         = topSong           || '—';
  if ($("topEmotion"))          $("topEmotion").textContent          = topEmotion        ? topEmotion[0] : '—';
}

// ===== FIREBASE SYNC =====
if (isFirebaseEnabled) {
  postsRef.orderByChild('timestamp').limitToLast(200).on('value', snapshot => {
    const prevCount = posts.length;
    posts = [];
    snapshot.forEach(child => { const p = child.val(); p.id = child.key; posts.unshift(p); });
    posts.sort((a,b) => b.timestamp - a.timestamp);
    updateLandingStats();
    buildLyricStream();
    if (postsLoaded && posts.length > prevCount && feed.classList.contains('active')) {
      showNewPostsIndicator(posts.length - prevCount);
      newPostsAvailable = true;
    }
    postsLoaded = true;
    if (feed.classList.contains('active') && !newPostsAvailable) renderFeed();
  });
  analyticsRef.on('value', snapshot => {
    postAnalytics = snapshot.val() || {};
    buildLyricStream();
  });
} else {
  postsLoaded = true;
  updateLandingStats();
  buildLyricStream();
}

// ===== MODAL HELPERS =====
function openModal(modal) {
  savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  document.body.style.top = `-${savedScrollPosition}px`;
}
function closeModal(modal) {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  document.body.style.top = '';
  window.scrollTo(0, savedScrollPosition);
}

// ===== SWIPE =====
let tSX = 0, tSY = 0;
[landing, feed].forEach(s => {
  s.addEventListener('touchstart', e => { tSX = e.touches[0].clientX; tSY = e.touches[0].clientY; });
  s.addEventListener('touchend', e => {
    const dx = tSX - e.changedTouches[0].clientX;
    const dy = Math.abs(tSY - e.changedTouches[0].clientY);
    if (Math.abs(dx) > dy && Math.abs(dx) > 100) {
      if (dx > 0 && landing.classList.contains("active")) goToFeed();
      if (dx < 0 && feed.classList.contains("active"))   goToLanding();
    }
  });
});

// ===== NAVIGATION =====
function goToFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
  renderFeed();
}
function goToLanding() {
  feed.classList.remove("active");
  landing.classList.add("active");
}

enterBtn.onclick = () => {
  goToFeed();
  setTimeout(() => { openModal(composer); setTimeout(() => textInput.focus(), 200); }, 100);
};
const efb1 = document.getElementById("enterFeedBtn");
const efb2 = document.getElementById("enterFeedBtn2");
if (efb1) efb1.onclick = () => { goToFeed(); setTimeout(() => feedList?.scrollIntoView({ behavior:'smooth' }), 150); };
if (efb2) efb2.onclick = () => { goToFeed(); setTimeout(() => feedList?.scrollIntoView({ behavior:'smooth' }), 150); };
backBtn.onclick = goToLanding;
openComposerBtn.onclick = () => { openModal(composer); setTimeout(() => textInput.focus(), 200); };
closeComposerBtn.onclick = () => { closeModal(composer); resetComposer(); };

// ===== CHAR COUNTER =====
textInput.oninput = () => { charCount.textContent = textInput.value.length; };

// ===== MODE SELECTOR =====
modeBtns.forEach(btn => {
  btn.onclick = () => {
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    shareInputs.classList.remove("show");
    guessInputs.classList.remove("show");
    discoverInputs.classList.remove("show");
    streamingSection.style.display = currentMode === "discover" ? "none" : "block";
    if (currentMode === "share")    shareInputs.classList.add("show");
    if (currentMode === "guess")    guessInputs.classList.add("show");
    if (currentMode === "discover") discoverInputs.classList.add("show");
  };
});

// ===== EMOTION PILLS =====
document.querySelectorAll(".emotion-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".emotion-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion = btn.dataset.emotion;
  };
});

// ===== POST =====
postBtn.onclick = async () => {
  if (postBtn.disabled) return;
  const text = textInput.value.trim();
  if (!text)          { showToast("Please enter a lyric"); return; }
  if (!selectedEmotion) { showToast("Please select an emotion"); return; }

  let post = {
    text, emotion: selectedEmotion, mode: currentMode,
    community: selectedEmotion,
    status: 'active', // admin moderation field — 'active' | 'hidden' | 'flagged'
    flagCount: 0,
    knowledge: { song: "Unknown Song", artist: "Unknown Artist" },
    guessConfig: null,
    links: currentMode !== "discover" ? {
      spotify:    spotifyLink.value.trim()    || null,
      apple:      appleLink.value.trim()      || null,
      youtube:    youtubeLink.value.trim()    || null,
      soundcloud: soundcloudLink.value.trim() || null
    } : null,
    authorId: userId,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now()
  };

  try {
    if (currentMode === "share") {
      if (!songInput.value.trim() || !artistInput.value.trim()) throw new Error("Please enter song and artist");
      post.knowledge = { song: songInput.value.trim(), artist: artistInput.value.trim() };
    }
    if (currentMode === "guess") {
      const doSong   = guessSongCheck.checked;
      const doArtist = guessArtistCheck.checked;
      if (!doSong && !doArtist) throw new Error("Select at least one thing to guess");
      if (doSong   && !guessSongAnswer.value.trim())   throw new Error("Enter the correct song title");
      if (doArtist && !guessArtistAnswer.value.trim()) throw new Error("Enter the correct artist");
      post.knowledge   = { song: guessSongAnswer.value.trim(), artist: guessArtistAnswer.value.trim(), hidden: true };
      post.guessConfig = { guessSong: doSong, guessArtist: doArtist };
    }
    if (currentMode === "discover") {
      post.knowledge = {
        song:   discoverSongInput.value.trim()   || "Unknown Song",
        artist: discoverArtistInput.value.trim() || "Unknown Artist"
      };
    }
  } catch(err) { showToast(err.message); return; }

  postBtn.disabled = true;
  postBtn.textContent = "Posting…";
  try {
    if (isFirebaseEnabled) {
      const ref = await postsRef.push(post);
      await analyticsRef.child(ref.key).set({ views: 0, guesses: [], helps: [] });
    }
    showToast("Posted!");
    newPostsAvailable = false;
    renderFeed();
    resetComposer();
    closeModal(composer);
  } catch(err) {
    console.error(err);
    showToast(err.message || "Error posting.");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
};

function resetComposer() {
  textInput.value = ""; songInput.value = ""; artistInput.value = "";
  guessSongAnswer.value = ""; guessArtistAnswer.value = "";
  discoverSongInput.value = ""; discoverArtistInput.value = "";
  if (spotifyLink)    spotifyLink.value = "";
  if (appleLink)      appleLink.value   = "";
  if (youtubeLink)    youtubeLink.value = "";
  if (soundcloudLink) soundcloudLink.value = "";
  charCount.textContent = "0";
  selectedEmotion = null;
  document.querySelectorAll(".emotion-btn").forEach(b => b.classList.remove("active"));
  modeBtns.forEach((b,i) => b.classList.toggle("active", i === 0));
  currentMode = "share";
  shareInputs.classList.add("show");
  guessInputs.classList.remove("show");
  discoverInputs.classList.remove("show");
  streamingSection.style.display = "block";
  guessSongCheck.checked = true;
  guessArtistCheck.checked = true;
}

// ===== SEARCH =====
// v4.1 UPDATE: room filter applied first, then search query
// This means tabs + search work together (e.g. "Love" room + search "tonight")
function getFilteredPosts() {
  // Step 0: never show hidden posts in public feed
  const visible = posts.filter(p => p.status !== 'hidden');

  // Step 1: filter by active emotion room
  let filtered = activeRoom === "all"
    ? visible
    : visible.filter(p => (p.emotion || '').toLowerCase() === activeRoom.toLowerCase());

  // Step 2: filter by search query within the room result
  if (!searchQuery) return filtered;
  const q = searchQuery.toLowerCase();
  return filtered.filter(p =>
    (p.text           || "").toLowerCase().includes(q)
    || (p.knowledge?.song   || "").toLowerCase().includes(q)
    || (p.knowledge?.artist || "").toLowerCase().includes(q)
    || (p.emotion        || "").toLowerCase().includes(q)
  );
}

function highlightMatch(text, query) {
  if (!query || !text) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function clearSearch() {
  const input    = document.getElementById("feedSearchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  searchQuery = "";
  if (input)    input.value = "";
  if (clearBtn) clearBtn.style.display = 'none';
  renderFeed();
}

function initSearch() {
  const input    = document.getElementById("feedSearchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  if (!input) return;
  input.oninput = () => {
    searchQuery = input.value.trim();
    if (clearBtn) clearBtn.style.display = searchQuery ? 'flex' : 'none';
    renderFeed();
  };
  input.onkeydown = (e) => {
    if (e.key === 'Escape') { clearSearch(); input.blur(); }
  };
  if (clearBtn) {
    clearBtn.onclick = () => { clearSearch(); input.focus(); };
  }
}

// ===== FEED RANKING =====
function calculatePostScore(post) {
  const now = Date.now();
  const ageInHours = post.timestamp
    ? (now - post.timestamp) / (1000 * 60 * 60)
    : 999; // defensive: missing timestamp treated as very old

  const recencyScore = Math.max(0, 48 - ageInHours);

  const analytics = postAnalytics[post.id] || {};
  const views   = analytics.views || 0;
  const guesses = Object.keys(analytics.guesses || {}).length;
  const helps   = Object.keys(analytics.helps   || {}).length;

  return (
    (recencyScore * 0.4) +
    (views        * 0.2) +
    (guesses      * 0.25) +
    (helps        * 0.15)
  );
}

function getRankedPosts() {
  return getFilteredPosts().sort((a, b) =>
    calculatePostScore(b) - calculatePostScore(a)
  );
}

// ===== v4.1: ROOM TABS =====
// Wires up the .room-tab buttons rendered in index.html.
// Clicking a tab: sets activeRoom, updates active class, re-renders feed.
// "all" tab resets to showing everything.
function initRoomTabs() {
  const tabs = document.querySelectorAll('.room-tab');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.onclick = () => {
      // Update active state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Set room and re-render
      activeRoom = tab.dataset.room;
      renderFeed();
    };
  });
}

// ===== RENDER FEED =====
function getDynamicFontSize(len) {
  return '0.95rem';
}

const EMOTION_COLORS = {
  Love:'rgba(255,107,157,0.12)', Heartbreak:'rgba(255,80,80,0.1)',
  Hope:'rgba(107,140,255,0.12)', Nostalgia:'rgba(232,197,71,0.1)',
  Healing:'rgba(74,222,128,0.12)', Joy:'rgba(255,200,71,0.1)',
  Rage:'rgba(255,100,100,0.12)', Loneliness:'rgba(160,160,255,0.1)'
};
const EMOTION_TEXT = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6464', Loneliness:'#a0a0ff'
};

function renderFeed() {
  feedList.innerHTML = "";
  updateLandingStats();

  const filtered      = getRankedPosts();
  const resultCountEl = document.getElementById("searchResultCount");

  if (!postsLoaded) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gold)">Loading…</div>';
    return;
  }
  if (!posts.length) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">No lyrics yet — be the first to drop one.</div>';
    if (resultCountEl) resultCountEl.textContent = '';
    return;
  }
  if (!filtered.length) {
    // Empty state message adapts to whether a room or search is active
    const roomMsg = activeRoom !== "all" ? ` in ${activeRoom}` : '';
    const searchMsg = searchQuery ? ` matching "${searchQuery}"` : '';
    feedList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">
      No lyrics${roomMsg}${searchMsg} yet.<br>
      <span style="font-size:0.8rem;opacity:0.6">Be the first to drop one here.</span></div>`;
    if (resultCountEl) resultCountEl.textContent = searchQuery ? '0 results' : '';
    return;
  }

  if (resultCountEl) {
    resultCountEl.textContent = searchQuery
      ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
      : '';
  }

  filtered.forEach((post, i) => {
    const card    = document.createElement("div");
    card.className = "feed-card";
    card.style.animationDelay = `${i * 0.03}s`;

    const k       = post.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
    const emotion = post.emotion || "Nostalgia";
    const eBg     = EMOTION_COLORS[emotion] || 'rgba(232,197,71,0.1)';
    const eColor  = EMOTION_TEXT[emotion]   || 'var(--gold)';
    const hasLinks= post.links && (post.links.spotify||post.links.apple||post.links.youtube||post.links.soundcloud);

    const idx = posts.findIndex(p => p.id === post.id);

    const modeBadge = post.mode === 'guess'
      ? '<span class="card-mode-badge mode-guess">Guess</span>'
      : post.mode === 'discover'
      ? '<span class="card-mode-badge mode-discover">Discover</span>'
      : '<span class="card-mode-badge mode-share">Share</span>';

    const lyricHTML = highlightMatch(post.text, searchQuery);

    let songSection = '', actionsSection = '';

    if (post.mode === "share") {
      songSection = `<div class="card-song">
        <div class="card-song-title">${highlightMatch(k.song, searchQuery)}</div>
        <div class="card-song-artist">${highlightMatch(k.artist, searchQuery)}</div>
      </div>`;
      actionsSection = `<div class="card-actions">
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
        ${hasLinks ? `<button class="card-btn" onclick="window.openListen(${idx})">Listen</button>` : ''}
      </div>`;
    } else if (post.mode === "guess") {
      const what = [];
      if (post.guessConfig?.guessSong)   what.push("song");
      if (post.guessConfig?.guessArtist) what.push("artist");
      if (!what.length) what.push("song","artist");
      songSection = `<div class="card-mystery">Guess the ${what.join(" & ")} →</div>`;
      actionsSection = `<div class="card-actions">
        <button class="card-btn" onclick="window.openGuess(${idx})">Guess</button>
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
      </div>`;
    } else {
      const hasClue = k.song !== "Unknown Song" || k.artist !== "Unknown Artist";
      const clue    = hasClue
        ? `Maybe: ${highlightMatch(k.song, searchQuery)} — ${highlightMatch(k.artist, searchQuery)}`
        : 'Help discover this song';
      songSection = `<div class="card-discover">${clue}</div>`;
      actionsSection = `<div class="card-actions">
        <button class="card-btn" onclick="window.openDiscover(${idx})">Help</button>
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="card-time">${timeAgo(post.timestamp)}</span>
        ${modeBadge}
      </div>
      <div class="card-lyric" style="font-size:${getDynamicFontSize(post.text.length)}">${lyricHTML}</div>
      <span class="card-emotion-tag" style="background:${eBg};color:${eColor}">${highlightMatch(emotion, searchQuery)}</span>
      ${songSection}
      ${actionsSection}
    `;
    feedList.appendChild(card);
  });
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

function trackView(postId) {
  if (isFirebaseEnabled && postId)
    analyticsRef.child(postId).child('views').transaction(v => (v || 0) + 1);
}

// ===== VIEW / GUESS / DISCOVER / LISTEN =====
window.viewPost = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  document.getElementById("postcardLyric").textContent   = currentPost.text;
  document.getElementById("postcardEmotion").textContent = currentPost.emotion || "Nostalgia";
  const k      = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
  const songEl = document.getElementById("postcardSong");
  if (currentPost.mode === "guess") {
    songEl.innerHTML = `<div style="font-style:italic;color:var(--text-2)">Guess correctly to reveal</div>`;
  } else {
    songEl.innerHTML = `<div>${k.song}</div><div>${k.artist}</div>`;
  }
  document.getElementById("postcardCommunity").innerHTML = '';
  const hasLinks = currentPost.links && (currentPost.links.spotify||currentPost.links.apple||currentPost.links.youtube||currentPost.links.soundcloud);
  listenPostcard.style.display = (hasLinks && currentPost.mode !== "guess") ? 'block' : 'none';
  openModal(postcardModal);
};

window.openListen = function(index) {
  currentPost = posts[index];
  if (!currentPost?.links) { showToast("No streaming links"); return; }
  const ll = document.getElementById("listenLinks");
  ll.innerHTML = "";
  let has = false;
  [['Spotify','spotify'],['Apple Music','apple'],['YouTube','youtube'],['SoundCloud','soundcloud']].forEach(([name,key]) => {
    if (currentPost.links[key]) {
      has = true;
      const a = document.createElement("a");
      a.className = "listen-link";
      a.href = currentPost.links[key];
      a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = name;
      ll.appendChild(a);
    }
  });
  if (!has) { showToast("No streaming links available"); return; }
  openModal(listenModal);
};

window.openGuess = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  currentGuessAttempts = 0;
  document.getElementById("guessLyric").textContent   = currentPost.text;
  document.getElementById("guessSongInput").value     = "";
  document.getElementById("guessArtistInput").value   = "";
  document.getElementById("guessResult").className    = "result-msg hidden";
  document.getElementById("guessLinksSection").className = "guess-links hidden";
  document.getElementById("guessInputFields").style.display = "";
  document.getElementById("submitGuess").style.display     = "";
  document.getElementById("revealAnswer").style.display    = "none";
  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  document.getElementById("guessSongInput").style.display   = doSong   ? 'block' : 'none';
  document.getElementById("guessArtistInput").style.display = doArtist ? 'block' : 'none';
  const what = [];
  if (doSong)   what.push("song");
  if (doArtist) what.push("artist");
  document.getElementById("guessHint").textContent = `${MAX_GUESS_ATTEMPTS} attempts to guess the ${what.join(" and ")}.`;
  openModal(guessModal);
};

window.openDiscover = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  ['discoverLyric','discoverSongAnswer','discoverArtistAnswer',
   'discoverSpotifyLink','discoverAppleLink','discoverYoutubeLink','discoverSoundcloudLink']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { if (id === 'discoverLyric') el.textContent = currentPost.text; else el.value = ''; }
    });
  openModal(discoverModal);
};

// ===== GUESS SUBMISSION =====
document.getElementById("submitGuess").onclick = () => {
  if (!currentPost) return;
  currentGuessAttempts++;
  const k        = currentPost.knowledge || {};
  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  const gs  = document.getElementById("guessSongInput").value.trim().toLowerCase();
  const ga  = document.getElementById("guessArtistInput").value.trim().toLowerCase();
  const as  = (k.song   || '').toLowerCase();
  const aa  = (k.artist || '').toLowerCase();
  const songOk   = !doSong   || (gs && (gs === as || gs.includes(as) || as.includes(gs)));
  const artistOk = !doArtist || (ga && (ga === aa || ga.includes(aa) || aa.includes(ga)));
  const correct  = songOk && artistOk;
  if (isFirebaseEnabled) analyticsRef.child(currentPost.id).child('guesses').push({ song:gs||null, artist:ga||null, correct, timestamp:Date.now() });
  const resultEl = document.getElementById("guessResult");
  resultEl.classList.remove("hidden","result-success","result-error","result-partial");
  if (correct) {
    resultEl.className = "result-msg result-success";
    resultEl.innerHTML = `Correct! 🎉<br><span style="font-size:0.8rem">"${k.song}" by ${k.artist}</span>`;
    document.getElementById("submitGuess").style.display      = "none";
    document.getElementById("guessInputFields").style.display = "none";
    if (currentPost.links) {
      const ll   = document.getElementById("guessLinksSection");
      let html   = '<div class="guess-links-title">Listen</div>';
      if (currentPost.links.spotify)    html += `<a href="${currentPost.links.spotify}"    target="_blank" class="guess-link">Spotify</a>`;
      if (currentPost.links.apple)      html += `<a href="${currentPost.links.apple}"      target="_blank" class="guess-link">Apple Music</a>`;
      if (currentPost.links.youtube)    html += `<a href="${currentPost.links.youtube}"    target="_blank" class="guess-link">YouTube</a>`;
      if (currentPost.links.soundcloud) html += `<a href="${currentPost.links.soundcloud}" target="_blank" class="guess-link">SoundCloud</a>`;
      ll.innerHTML = html; ll.classList.remove("hidden");
    }
    return;
  }
  const left = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
  if (left <= 0) {
    resultEl.className = "result-msg result-error";
    resultEl.innerHTML = `Out of attempts<br><span style="font-size:0.8rem">It was: "${k.song}" by ${k.artist}</span>`;
    document.getElementById("submitGuess").style.display      = "none";
    document.getElementById("guessInputFields").style.display = "none";
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
  document.getElementById("guessSongInput").value   = "";
  document.getElementById("guessArtistInput").value = "";
};

// ===== DISCOVER SUBMISSION =====
document.getElementById("submitDiscover").onclick = () => {
  const song   = document.getElementById("discoverSongAnswer").value.trim();
  const artist = document.getElementById("discoverArtistAnswer").value.trim();
  if (!song || !artist) { showToast("Please enter both song and artist"); return; }
  const helpData = {
    song, artist,
    links: {
      spotify:    document.getElementById("discoverSpotifyLink").value.trim()    || null,
      apple:      document.getElementById("discoverAppleLink").value.trim()      || null,
      youtube:    document.getElementById("discoverYoutubeLink").value.trim()    || null,
      soundcloud: document.getElementById("discoverSoundcloudLink").value.trim() || null
    },
    timestamp: Date.now()
  };
  if (isFirebaseEnabled) analyticsRef.child(currentPost.id).child('helps').push(helpData);
  showToast("Thanks for helping!");
  closeModal(discoverModal);
};

// ===== ANALYTICS =====
analyticsBtn.onclick = () => {
  if (!currentPost) return;
  const an      = postAnalytics[currentPost.id] || { views: 0 };
  const guesses = Object.values(an.guesses || {});
  const helps   = Object.values(an.helps   || {});
  const body    = document.getElementById("analyticsBody");

  let html = `<div class="analytics-grid">
    <div class="stat-card"><div class="stat-num">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if (currentPost.mode === 'guess')    html += `<div class="stat-card"><div class="stat-num">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if (currentPost.mode === 'discover') html += `<div class="stat-card"><div class="stat-num">${helps.length}</div><div class="stat-label">Identifications</div></div>`;
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
};

document.getElementById("closeAnalytics").onclick = () => {
  closeModal(analyticsModal);
  openModal(postcardModal);
};

listenPostcard.onclick = () => {
  const idx = posts.findIndex(p => p.id === currentPost?.id);
  if (idx !== -1) { closeModal(postcardModal); window.openListen(idx); }
};

// ===== SCROLL =====
window.addEventListener('scroll', () => {
  scrollToTopBtn?.classList.toggle('visible', window.pageYOffset > 300);
});
if (scrollToTopBtn) {
  scrollToTopBtn.onclick = () => window.scrollTo({ top:0, behavior:'smooth' });
}
if (newPostsIndicator) {
  newPostsIndicator.onclick = () => {
    newPostsAvailable = false;
    renderFeed();
    newPostsIndicator.classList.remove('visible');
    window.scrollTo({ top:0, behavior:'smooth' });
  };
}
function showNewPostsIndicator(count) {
  const c = document.getElementById("newPostsCount");
  if (c) c.textContent = count;
  newPostsIndicator?.classList.add('visible');
}

// ═══════════════════════════════════
//   MARGO STUDIO
// ═══════════════════════════════════
function getPhotoFilter() {
  let f = `brightness(${studioBrightness}%)`;
  const filters = {
    warm:     ' sepia(0.3) saturate(1.3) hue-rotate(-10deg)',
    cool:     ' saturate(0.85) hue-rotate(15deg)',
    dramatic: ' contrast(1.5) saturate(1.2) brightness(0.9)',
    vintage:  ' sepia(0.5) contrast(1.2)',
  };
  if (filters[studioFilter]) f += filters[studioFilter];
  return f;
}

function drawPosterToCtx(ctx, W, H) {
  const c  = POSTER_DESIGNS[studioDesign] || POSTER_DESIGNS['midnight-gold'];
  const fd = FONT_FAMILIES[studioFont]    || FONT_FAMILIES['playfair'];
  const scale = W / 1080;

  ctx.filter = 'none';

  // ── Background ──
  if (studioBgImage) {
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tc = tmp.getContext('2d');
    const iw = studioBgImage.naturalWidth  || studioBgImage.width;
    const ih = studioBgImage.naturalHeight || studioBgImage.height;
    const imgScale = Math.max(W / iw, H / ih);
    tc.filter = getPhotoFilter();
    tc.drawImage(studioBgImage, (W - iw * imgScale) / 2, (H - ih * imgScale) / 2, iw * imgScale, ih * imgScale);
    tc.filter = 'none';
    if (studioBlur > 0) {
      const tmp2 = document.createElement('canvas');
      tmp2.width = W; tmp2.height = H;
      const tc2 = tmp2.getContext('2d');
      tc2.filter = `blur(${Math.max(1, studioBlur) * 2}px)`;
      tc2.drawImage(tmp, 0, 0);
      tc2.filter = 'none';
      ctx.filter = 'none';
      ctx.drawImage(tmp2, 0, 0);
    } else {
      ctx.filter = 'none';
      ctx.drawImage(tmp, 0, 0);
    }
    ctx.filter = 'none';
    ctx.fillStyle = `rgba(0,0,0,${studioDim / 100})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.filter = 'none';
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c.bg[0]);
    g.addColorStop(0.5, c.bg[1]);
    g.addColorStop(1, c.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (studioBrightness !== 100) {
      const bDelta = (studioBrightness - 100) / 100;
      if (bDelta < 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.abs(bDelta) * 0.9})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${bDelta * 0.6})`;
      }
      ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.filter = 'none';
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  const textColor = studioBgImage ? '#ffffff' : c.text;

  if (studioBgImage) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur  = 14 * scale;
    ctx.shadowOffsetY = 2 * scale;
  }

  // ── MARGO wordmark — brand kit: Space Mono 700 ──
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.fillStyle = studioBgImage ? 'rgba(255,255,255,0.32)' : (c.primary + '88');
  ctx.font = `700 ${22 * scale}px 'Space Mono', monospace`;
  ctx.fillText('MARGO', 52 * scale, 58 * scale);

  ctx.textAlign = 'center';

  // ── Lyric ──
  const lyricText = currentPost.text.length > 100
    ? currentPost.text.substring(0, 97) + '…'
    : currentPost.text;

  if (studioBgImage) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 18 * scale; }
  ctx.fillStyle = textColor;

  const lyricLen  = lyricText.length;
  const lyricSize = lyricLen < 40 ? 82 * scale
    : lyricLen < 65 ? 64 * scale
    : lyricLen < 90 ? 52 * scale
    : 42 * scale;

  const isBold = ['bebas','josefin','oswald'].includes(studioFont);
  ctx.font = `${fd.style === 'italic' ? 'italic ' : ''}${isBold ? '700' : '600'} ${lyricSize}px ${fd.family}`;
  wrapTextCenter(ctx, lyricText, W / 2, H * 0.46, W * 0.82, lyricSize * 1.18);

  // ── Song & Artist ──
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.filter = 'none'; ctx.textAlign = 'center';

  const k        = currentPost.knowledge || { song:'Unknown Song', artist:'Unknown Artist' };
  const songSize  = Math.max(Math.round(lyricSize * 0.42), 28 * scale);
  const artSize   = Math.max(Math.round(lyricSize * 0.30), 20 * scale);
  const songY     = H * 0.76;
  const artistY   = songY + songSize + 16 * scale;

  let songColor, artistColor;
  if (studioBgImage) {
    songColor = '#ffffff'; artistColor = 'rgba(255,255,255,0.82)';
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 14 * scale; ctx.shadowOffsetY = 1 * scale;
  } else if (c.light) {
    songColor = c.primary; artistColor = 'rgba(42,37,32,0.7)';
  } else {
    songColor = c.primary; artistColor = 'rgba(255,255,255,0.72)';
  }

  ctx.fillStyle = songColor;
  ctx.font = `700 ${songSize}px ${fd.family}`;
  ctx.fillText(k.song.length > 32 ? k.song.substring(0, 32) + '…' : k.song, W / 2, songY);

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = artistColor;
  ctx.font = `700 ${artSize}px 'Space Mono', monospace`;
  ctx.fillText(k.artist.length > 40 ? k.artist.substring(0, 40) + '…' : k.artist, W / 2, artistY);

  // ── Domain watermark — brand kit: Space Mono ──
  const markSize  = Math.max(Math.round(18 * scale), 14);
  let markColor;
  if (studioBgImage) {
    markColor = 'rgba(255,255,255,0.75)';
  } else if (c.light) {
    markColor = 'rgba(42,37,32,0.6)';
  } else {
    markColor = c.primary + 'cc';
  }
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = markColor;
  ctx.font = `700 ${markSize}px 'Space Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(APP_DOMAIN, W / 2, H * 0.94);
}

function wrapTextCenter(ctx, text, x, centerY, maxW, lineHeight) {
  const words = text.split(' ');
  let line = '', lines = [];
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' '; }
    else line = test;
  });
  if (line.trim()) lines.push(line.trim());
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function refreshStageCanvas() {
  if (!currentPost || !studioCanvas) return;
  const stage  = studioCanvas.parentElement;
  const dpr    = window.devicePixelRatio || 1;
  const availW = stage.clientWidth  - 40;
  const availH = stage.clientHeight - 40;
  const size   = Math.max(80, Math.min(availW, availH, 700));
  studioCanvas.style.width  = size + 'px';
  studioCanvas.style.height = size + 'px';
  const res = Math.round(size * dpr);
  studioCanvas.width  = res;
  studioCanvas.height = res;
  const ctx = studioCanvas.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size));
}

async function generateFinalPoster(sizeKey) {
  const dim = POSTER_SIZES[sizeKey];
  if (!dim || !currentPost) return null;
  const offscreen = document.createElement('canvas');
  offscreen.width = dim.w; offscreen.height = dim.h;
  const ctx = offscreen.getContext('2d');
  await document.fonts.ready;
  drawPosterToCtx(ctx, dim.w, dim.h);
  return new Promise(resolve => offscreen.toBlob(blob => resolve(blob), 'image/png'));
}

function drawCeremonyThumb() {
  const dpr  = window.devicePixelRatio || 1;
  const size = 600;
  ceremonyThumb.width  = Math.round(size * dpr);
  ceremonyThumb.height = Math.round(size * dpr);
  ceremonyThumb.style.width = '';
  ceremonyThumb.style.height = '';
  const ctx = ceremonyThumb.getContext('2d');
  ctx.scale(dpr, dpr);
  document.fonts.ready.then(() => drawPosterToCtx(ctx, size, size));
}

sharePosterBtn.onclick = () => {
  closeModal(postcardModal);
  studioBgImage = null; studioFont = 'playfair'; studioBrightness = 100;
  studioBlur = 0; studioDim = 50; studioFilter = 'none';
  generatedBlob = null; selectedSize = null;
  studioDesign = EMOTION_DESIGN_MAP[currentPost?.emotion] || 'midnight-gold';
  studioOverlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  resetStudioUI();
  setTimeout(refreshStageCanvas, 60);
};

function resetStudioUI() {
  document.querySelectorAll('.dock-tab').forEach((t,i)  => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.dock-panel').forEach((p,i) => p.classList.toggle('active', i === 0));
  document.querySelectorAll('.scene-swatch').forEach(s  => s.classList.toggle('active', s.dataset.design === studioDesign));
  document.querySelectorAll('.font-card').forEach((fc,i) => fc.classList.toggle('active', i === 0));
  const bSlider = document.getElementById('studiobrightness');
  const bVal    = document.getElementById('studioBrightnessVal');
  if (bSlider) bSlider.value = 100;
  if (bVal)    bVal.textContent = '100%';
  if (photoDropText)   photoDropText.textContent = 'Tap to add a photo';
  if (photoDropZone)   photoDropZone.classList.remove('has-photo');
  if (photoControls)   photoControls.classList.add('hidden');
  if (studioPhotoInput) studioPhotoInput.value = '';
  const bsl = document.getElementById('studioBlur'),  bvl = document.getElementById('studioBlurVal');
  const dsl = document.getElementById('studioDim'),   dvl = document.getElementById('studioDimVal');
  if (bsl) bsl.value = 0;   if (bvl) bvl.textContent = '0';
  if (dsl) dsl.value = 50;  if (dvl) dvl.textContent = '50%';
  document.querySelectorAll('.photo-filter').forEach((f,i) => f.classList.toggle('active', i === 0));
  sizePicker.classList.add('hidden');
  ceremonyOverlay.classList.add('hidden');
}

closeStudio.onclick = () => {
  studioOverlay.classList.add('hidden');
  document.body.classList.remove('modal-open');
  openModal(postcardModal);
};

document.querySelectorAll('.dock-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.dock-tab').forEach(t  => t.classList.remove('active'));
    document.querySelectorAll('.dock-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById('panel-' + tab.dataset.tab);
    if (panel) panel.classList.add('active');
  };
});

document.querySelectorAll('.scene-swatch').forEach(swatch => {
  swatch.onclick = () => {
    document.querySelectorAll('.scene-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    studioDesign = swatch.dataset.design;
    refreshStageCanvas();
  };
});

const brightnessSlider = document.getElementById('studiobrightness');
const brightnessValEl  = document.getElementById('studioBrightnessVal');
if (brightnessSlider) {
  brightnessSlider.oninput = () => {
    studioBrightness = parseInt(brightnessSlider.value);
    if (brightnessValEl) brightnessValEl.textContent = studioBrightness + '%';
    refreshStageCanvas();
  };
}

document.querySelectorAll('.font-card').forEach(card => {
  card.onclick = () => {
    document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    studioFont = card.dataset.font;
    refreshStageCanvas();
  };
});

if (photoDropZone) {
  photoDropZone.onclick = () => studioPhotoInput?.click();
  photoDropZone.addEventListener('dragover', e => { e.preventDefault(); photoDropZone.classList.add('has-photo'); });
  photoDropZone.addEventListener('dragleave', e => { if (!photoDropZone.contains(e.relatedTarget)) photoDropZone.classList.remove('has-photo'); });
  photoDropZone.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleStudioPhoto(f); });
}
if (studioPhotoInput) studioPhotoInput.onchange = e => { const f = e.target.files[0]; if (f) handleStudioPhoto(f); };

function handleStudioPhoto(file) {
  if (!file.type.startsWith('image/'))    { showToast("Please upload an image"); return; }
  if (file.size > 15 * 1024 * 1024)      { showToast("File too large (max 15MB)"); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      studioBgImage = img;
      if (photoDropText) photoDropText.textContent = file.name;
      if (photoDropZone) photoDropZone.classList.add('has-photo');
      if (photoControls) photoControls.classList.remove('hidden');
      showToast("Photo added");
      refreshStageCanvas();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

const blurSlider = document.getElementById('studioBlur'), dimSlider = document.getElementById('studioDim');
const blurValEl  = document.getElementById('studioBlurVal'), dimValEl = document.getElementById('studioDimVal');
if (blurSlider) blurSlider.oninput = () => { studioBlur = parseInt(blurSlider.value); if (blurValEl) blurValEl.textContent = studioBlur; refreshStageCanvas(); };
if (dimSlider)  dimSlider.oninput  = () => { studioDim  = parseInt(dimSlider.value);  if (dimValEl)  dimValEl.textContent  = studioDim + '%'; refreshStageCanvas(); };

document.querySelectorAll('.photo-filter').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.photo-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    studioFilter = btn.dataset.filter;
    refreshStageCanvas();
  };
});

const studioRemovePhoto = document.getElementById('studioRemovePhoto');
if (studioRemovePhoto) studioRemovePhoto.onclick = () => {
  studioBgImage = null;
  if (photoDropText)    photoDropText.textContent = 'Tap to add a photo';
  if (photoDropZone)    photoDropZone.classList.remove('has-photo');
  if (photoControls)    photoControls.classList.add('hidden');
  if (studioPhotoInput) studioPhotoInput.value = '';
  refreshStageCanvas();
};

studioExportBtn.onclick = () => sizePicker.classList.remove('hidden');
sizeCancelBtn.onclick   = () => sizePicker.classList.add('hidden');

document.querySelectorAll('.size-opt').forEach(btn => {
  btn.onclick = async () => {
    selectedSize = btn.dataset.size;
    sizePicker.classList.add('hidden');
    studioCanvas.classList.add('zoom-in');
    showToast("Generating…");
    try {
      generatedBlob = await generateFinalPoster(selectedSize);
    } catch(err) {
      console.error(err);
      showToast("Error generating poster");
      studioCanvas.classList.remove('zoom-in');
      return;
    }
    setTimeout(() => {
      studioCanvas.classList.remove('zoom-in');
      drawCeremonyThumb();
      ceremonyOverlay.classList.remove('hidden');
    }, 400);
  };
});

ceremonyBack.onclick = () => ceremonyOverlay.classList.add('hidden');

cerDownload.onclick = () => {
  if (!generatedBlob) { showToast("No poster yet"); return; }
  downloadPosterBlob();
  showToast("Saved!");
};

cerShare.onclick = async () => {
  if (!generatedBlob) { showToast("Generating…"); return; }
  const file = new File([generatedBlob], `margo-poster-${Date.now()}.png`, { type:'image/png' });
  const shareData = {
    title: `MARGO — ${currentPost?.text?.substring(0,50) || 'Lyric'}`,
    text:  `"${currentPost?.text || ''}"`,
    files: [file]
  };
  let shared = false;
  try {
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      shared = true;
      showToast("Shared!");
    }
  } catch(e) { if (e.name === 'AbortError') return; }
  if (!shared) { downloadPosterBlob(); showToast("Saved to device!"); }
};

function downloadPosterBlob() {
  if (!generatedBlob) return;
  const a   = document.createElement('a');
  const url = URL.createObjectURL(generatedBlob);
  a.href = url;
  a.download = `margo-${selectedSize || 'poster'}-${Date.now()}.png`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== MODAL CLOSE BUTTONS =====
document.getElementById("closeGuess").onclick     = () => { closeModal(guessModal); currentGuessAttempts = 0; };
document.getElementById("closeDiscover").onclick  = () => closeModal(discoverModal);
document.getElementById("closePostcard").onclick  = () => closeModal(postcardModal);
document.getElementById("closeListen").onclick    = () => closeModal(listenModal);

// ===== TOAST =====
function showToast(msg) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
}

// ===== INIT =====
setupScrollToTop();
buildLyricStream();
preloadStudioFonts();
setupStatsBar();
initSearch();
initRoomTabs(); // v4.1: wire up emotion room tabs
initAdmin();    // v4.2: admin moderation system
console.log("MARGO loaded — Brand Kit 4.2. Firebase:", isFirebaseEnabled);

function setupScrollToTop() {
  window.addEventListener('scroll', () => {
    scrollToTopBtn?.classList.toggle('visible', window.pageYOffset > 350);
  });
}

function setupStatsBar() {
  const bar = document.querySelector('.stats-bar');
  if (!bar) return;
  function alignStats() {
    if (window.innerWidth >= 769) {
      bar.style.justifyContent = bar.scrollWidth <= bar.clientWidth ? 'center' : 'flex-start';
    } else {
      bar.style.justifyContent = 'flex-start';
      bar.scrollLeft = 0;
    }
  }
  alignStats();
  window.addEventListener('resize', alignStats);
}

/* ============================================================
   ADMIN SYSTEM — v4.2
   ============================================================
   ACCESS:  Ctrl + Shift + A  →  Firebase email/password login
   SECURITY: Authenticated against Firebase Auth. Your admin UID
             is stored in Firebase Realtime Database at:
             /adminConfig/allowedUid
             Nothing sensitive lives in this JS file.

   SETUP (do this once in Firebase console):
   1. Authentication → Sign-in method → Enable Email/Password
   2. Authentication → Users → Add user (your email + password)
   3. Copy the UID shown for your user
   4. Realtime Database → add this node manually:
        adminConfig: { allowedUid: "PASTE_YOUR_UID_HERE" }
   5. Database Rules: make adminConfig readable only to that UID:
        "adminConfig": { ".read": "auth != null && auth.uid === data.child('allowedUid').val()" }
   That's it. No password in JS. No DevTools exploit.
   ============================================================ */

// ── Admin state ──
let adminMode       = false;
let adminUser       = null;
let adminFilter     = 'all';   // 'all' | 'active' | 'hidden' | 'flagged'
let adminSort       = 'newest'; // 'newest' | 'mostFlagged'
let adminSearch     = '';
let adminConfigRef  = null;

if (isFirebaseEnabled) {
  adminConfigRef = firebase.database().ref('adminConfig');
}

// ── Keyboard trigger — B + G held simultaneously ──
// Chosen to avoid all browser shortcut conflicts.
// Guard prevents accidental trigger while typing in inputs.
const _adminKeysHeld = new Set();

function initAdmin() {
  document.addEventListener('keydown', e => {
    _adminKeysHeld.add(e.key.toLowerCase());

    if (_adminKeysHeld.has('b') && _adminKeysHeld.has('g')) {
      _adminKeysHeld.clear();

      // Don't fire if user is typing in a text field
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (adminMode) {
        openAdminPanel();
      } else {
        showAdminLogin();
      }
    }
  });

  document.addEventListener('keyup', e => {
    _adminKeysHeld.delete(e.key.toLowerCase());
  });

  // Keep adminMode in sync if user signs out elsewhere
  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged(user => {
      if (!user) {
        adminMode = false;
        adminUser = null;
        const panel = document.getElementById('adminModal');
        if (panel) panel.remove();
      }
    });
  }
}

// ── Login flow ──
function showAdminLogin() {
  // Remove any existing login UI
  const existing = document.getElementById('adminLoginModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'adminLoginModal';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.92);
    display:flex;align-items:center;justify-content:center;
    z-index:9000;backdrop-filter:blur(12px);
  `;

  overlay.innerHTML = `
    <div style="
      background:#141418;border:1px solid rgba(232,197,71,0.2);
      border-radius:20px;padding:32px;width:100%;max-width:380px;
      box-shadow:0 24px 60px rgba(0,0,0,0.7);
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <svg viewBox="-4 -4 88 88" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="#E8C547"/>
          <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
                fill="none" stroke="#0B0B0D" stroke-width="5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.85rem;
          letter-spacing:3px;color:#E8C547;text-transform:uppercase;">MARGO · Admin</span>
      </div>
      <p style="font-family:'Space Mono',monospace;font-size:0.55rem;color:#A0A0A8;
        text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;">
        Sign in to access moderation dashboard
      </p>
      <input id="adminEmail" type="email" placeholder="Email"
        style="width:100%;padding:11px 13px;background:#0B0B0D;border:1px solid rgba(255,255,255,0.08);
        border-radius:10px;color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.9rem;
        margin-bottom:10px;box-sizing:border-box;outline:none;"/>
      <input id="adminPassword" type="password" placeholder="Password"
        style="width:100%;padding:11px 13px;background:#0B0B0D;border:1px solid rgba(255,255,255,0.08);
        border-radius:10px;color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.9rem;
        margin-bottom:18px;box-sizing:border-box;outline:none;"/>
      <div id="adminLoginError" style="display:none;font-family:'Space Mono',monospace;
        font-size:0.55rem;color:#ff6464;text-transform:uppercase;letter-spacing:1px;
        margin-bottom:14px;"></div>
      <div style="display:flex;gap:10px;">
        <button id="adminLoginBtn" style="flex:1;padding:13px;background:#E8C547;color:#0B0B0D;
          border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;
          font-size:0.88rem;cursor:pointer;">Sign In</button>
        <button id="adminLoginCancel" style="padding:13px 18px;background:transparent;
          color:#A0A0A8;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
          font-family:'DM Sans',sans-serif;font-weight:600;font-size:0.88rem;cursor:pointer;">
          Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const emailEl    = document.getElementById('adminEmail');
  const passEl     = document.getElementById('adminPassword');
  const errorEl    = document.getElementById('adminLoginError');
  const loginBtn   = document.getElementById('adminLoginBtn');
  const cancelBtn  = document.getElementById('adminLoginCancel');

  cancelBtn.onclick = () => overlay.remove();

  // Allow Enter key to submit
  [emailEl, passEl].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
  });

  loginBtn.onclick = async () => {
    const email = emailEl.value.trim();
    const pass  = passEl.value;
    if (!email || !pass) { showAdminError(errorEl, 'Email and password required'); return; }

    loginBtn.textContent = 'Signing in…';
    loginBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
      if (!firebaseAuth) throw new Error('Firebase Auth not available');

      // Sign in with Firebase
      const cred = await firebaseAuth.signInWithEmailAndPassword(email, pass);
      const uid  = cred.user.uid;

      // Verify UID against adminConfig in Realtime Database
      const snap = await adminConfigRef.child('allowedUid').get();
      const allowedUid = snap.val();

      if (!allowedUid) {
        await firebaseAuth.signOut();
        throw new Error('Admin not configured — set adminConfig/allowedUid in Firebase');
      }
      if (uid !== allowedUid) {
        await firebaseAuth.signOut();
        throw new Error('Access denied');
      }

      // Authenticated + authorised
      adminMode = true;
      adminUser = cred.user;
      overlay.remove();
      openAdminPanel();

    } catch (err) {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
      const msg = err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
        ? 'Invalid credentials'
        : err.message;
      showAdminError(errorEl, msg);
    }
  };
}

function showAdminError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

// ── Admin panel ──
function openAdminPanel() {
  const existing = document.getElementById('adminModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'adminModal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.95);
    z-index:8000;display:flex;flex-direction:column;
    backdrop-filter:blur(16px);overflow:hidden;
  `;

  modal.innerHTML = `
    <div style="
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid rgba(232,197,71,0.15);
      background:#0B0B0D;flex-shrink:0;
    ">
      <div style="display:flex;align-items:center;gap:12px;">
        <svg viewBox="-4 -4 88 88" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="#E8C547"/>
          <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
                fill="none" stroke="#0B0B0D" stroke-width="5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;
          letter-spacing:3px;color:#E8C547;text-transform:uppercase;">Admin</span>
        <span id="adminPostBadge" style="font-family:'Space Mono',monospace;font-size:0.5rem;
          color:#A0A0A8;font-weight:700;text-transform:uppercase;letter-spacing:1px;"></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-family:'Space Mono',monospace;font-size:0.5rem;color:#707078;
          text-transform:uppercase;letter-spacing:1px;">${adminUser?.email || ''}</span>
        <button id="adminSignOutBtn" style="padding:6px 12px;background:transparent;
          color:#707078;border:1px solid rgba(255,255,255,0.08);border-radius:8px;
          font-family:'DM Sans',sans-serif;font-size:0.7rem;font-weight:600;cursor:pointer;">
          Sign out</button>
        <button id="adminCloseBtn" style="width:28px;height:28px;background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);border-radius:50%;color:#A0A0A8;
          font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
    </div>

    <div style="
      display:flex;gap:8px;padding:14px 20px;
      border-bottom:1px solid rgba(255,255,255,0.05);
      flex-shrink:0;flex-wrap:wrap;align-items:center;
    ">
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button class="admin-filter-btn active" data-filter="all"
          style="${adminFilterBtnStyle(true)}">All</button>
        <button class="admin-filter-btn" data-filter="active"
          style="${adminFilterBtnStyle(false)}">Active</button>
        <button class="admin-filter-btn" data-filter="flagged"
          style="${adminFilterBtnStyle(false)}">Flagged</button>
        <button class="admin-filter-btn" data-filter="hidden"
          style="${adminFilterBtnStyle(false)}">Hidden</button>
      </div>
      <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap;">
        <button class="admin-sort-btn active" data-sort="newest"
          style="${adminFilterBtnStyle(true)}">Newest</button>
        <button class="admin-sort-btn" data-sort="mostFlagged"
          style="${adminFilterBtnStyle(false)}">Most Flagged</button>
      </div>
    </div>

    <div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
      <input id="adminSearchInput" type="text" placeholder="Search posts…"
        style="width:100%;padding:9px 13px;background:#141418;
        border:1px solid rgba(255,255,255,0.08);border-radius:10px;
        color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.85rem;
        box-sizing:border-box;outline:none;"/>
    </div>

    <div id="adminPostList" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
  `;

  document.body.appendChild(modal);

  // Wire controls
  document.getElementById('adminCloseBtn').onclick   = () => modal.remove();
  document.getElementById('adminSignOutBtn').onclick = async () => {
    await firebaseAuth?.signOut();
    adminMode = false;
    adminUser = null;
    modal.remove();
    showToast('Signed out');
  };

  document.getElementById('adminSearchInput').oninput = e => {
    adminSearch = e.target.value.trim().toLowerCase();
    renderAdminPosts();
  };

  modal.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.admin-filter-btn').forEach(b => {
        b.style.cssText = adminFilterBtnStyle(false);
        b.classList.remove('active');
      });
      btn.style.cssText = adminFilterBtnStyle(true);
      btn.classList.add('active');
      adminFilter = btn.dataset.filter;
      renderAdminPosts();
    };
  });

  modal.querySelectorAll('.admin-sort-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.admin-sort-btn').forEach(b => {
        b.style.cssText = adminFilterBtnStyle(false);
        b.classList.remove('active');
      });
      btn.style.cssText = adminFilterBtnStyle(true);
      btn.classList.add('active');
      adminSort = btn.dataset.sort;
      renderAdminPosts();
    };
  });

  renderAdminPosts();
}

function adminFilterBtnStyle(active) {
  return `padding:6px 13px;border-radius:50px;cursor:pointer;
    font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    text-transform:uppercase;letter-spacing:0.8px;transition:all 0.18s;
    ${active
      ? 'background:rgba(232,197,71,0.1);border:1px solid rgba(232,197,71,0.3);color:#E8C547;'
      : 'background:transparent;border:1px solid rgba(255,255,255,0.08);color:#707078;'}`;
}

function getAdminPosts() {
  let list = [...posts];

  // Filter by status tab
  if (adminFilter !== 'all') {
    list = list.filter(p => (p.status || 'active') === adminFilter);
  }

  // Filter by search
  if (adminSearch) {
    list = list.filter(p =>
      (p.text || '').toLowerCase().includes(adminSearch)
      || (p.knowledge?.song   || '').toLowerCase().includes(adminSearch)
      || (p.knowledge?.artist || '').toLowerCase().includes(adminSearch)
      || (p.emotion || '').toLowerCase().includes(adminSearch)
    );
  }

  // Sort
  if (adminSort === 'mostFlagged') {
    list.sort((a, b) => (b.flagCount || 0) - (a.flagCount || 0));
  } else {
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  return list;
}

function renderAdminPosts() {
  const container = document.getElementById('adminPostList');
  const badge     = document.getElementById('adminPostBadge');
  if (!container) return;

  const list = getAdminPosts();
  if (badge) badge.textContent = `${list.length} post${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;
      font-family:'Space Mono',monospace;font-size:0.6rem;color:#707078;
      text-transform:uppercase;letter-spacing:1px;">No posts found</div>`;
    return;
  }

  container.innerHTML = '';
  list.forEach(post => {
    const an      = postAnalytics[post.id] || {};
    const views   = an.views || 0;
    const guesses = Object.keys(an.guesses || {}).length;
    const helps   = Object.keys(an.helps   || {}).length;
    const status  = post.status || 'active';
    const flags   = post.flagCount || 0;
    const k       = post.knowledge || { song: 'Unknown', artist: 'Unknown' };

    const statusColor = status === 'hidden'  ? '#707078'
                      : status === 'flagged' ? '#ffc847'
                      : '#4ade80';

    const card = document.createElement('div');
    card.style.cssText = `
      background:#141418;border:1px solid rgba(255,255,255,0.06);
      border-radius:14px;padding:16px;margin-bottom:10px;
      ${status === 'hidden' ? 'opacity:0.55;' : ''}
      ${status === 'flagged' ? 'border-color:rgba(255,200,71,0.2);' : ''}
    `;

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div style="font-family:'DM Serif Display',serif;font-style:italic;
          font-size:0.95rem;color:#F0F0F0;line-height:1.5;flex:1;">
          ${post.text || ''}
        </div>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;
          padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;
          flex-shrink:0;background:${statusColor}18;color:${statusColor};
          border:1px solid ${statusColor}40;">
          ${status}
        </span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
        <span style="font-family:'Space Mono',monospace;font-size:0.5rem;color:#A0A0A8;font-weight:700;">
          ${k.song} — ${k.artist}
        </span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#707078;">
          ${post.emotion || ''}
        </span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#707078;">
          ${timeAgo(post.timestamp)}
        </span>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#A0A0A8;">
          👁 ${views}
        </span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#A0A0A8;">
          🎯 ${guesses}
        </span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#A0A0A8;">
          🔍 ${helps}
        </span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;
          color:${flags > 0 ? '#ffc847' : '#707078'};">
          🚩 ${flags}
        </span>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        ${status !== 'hidden'
          ? `<button onclick="adminHidePost('${post.id}')"
              style="${adminActionBtnStyle('#707078')}">Hide</button>`
          : `<button onclick="adminUnhidePost('${post.id}')"
              style="${adminActionBtnStyle('#4ade80')}">Unhide</button>`
        }
        ${flags > 0
          ? `<button onclick="adminClearFlags('${post.id}')"
              style="${adminActionBtnStyle('#ffc847')}">Clear Flags</button>`
          : ''
        }
        <button onclick="adminDeletePost('${post.id}')"
          style="${adminActionBtnStyle('#ff6464')}">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function adminActionBtnStyle(color) {
  return `padding:7px 14px;border-radius:8px;cursor:pointer;
    font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    text-transform:uppercase;letter-spacing:0.8px;
    background:${color}14;border:1px solid ${color}40;color:${color};
    transition:all 0.18s;`;
}

// ── Moderation actions ──
async function adminHidePost(postId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).update({ status: 'hidden' });
    showToast('Post hidden');
    renderAdminPosts();
    renderFeed();
  } catch (e) { showToast('Error: ' + e.message); }
}

async function adminUnhidePost(postId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).update({ status: 'active' });
    showToast('Post restored');
    renderAdminPosts();
    renderFeed();
  } catch (e) { showToast('Error: ' + e.message); }
}

async function adminDeletePost(postId) {
  const confirmed = window.confirm(
    'Permanently delete this post? This cannot be undone.'
  );
  if (!confirmed) return;
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).remove();
    await analyticsRef.child(postId).remove();
    showToast('Post deleted');
    renderAdminPosts();
    renderFeed();
  } catch (e) { showToast('Error: ' + e.message); }
}

async function adminClearFlags(postId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).update({ flagCount: 0, status: 'active' });
    showToast('Flags cleared');
    renderAdminPosts();
  } catch (e) { showToast('Error: ' + e.message); }
}
