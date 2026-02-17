/* MARGO — Full working script */

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
  postsRef = database.ref('posts');
  analyticsRef = database.ref('analytics');
  isFirebaseEnabled = true;
  console.log('Firebase OK');
} catch (e) {
  console.warn('Firebase failed:', e.message);
}

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let selectedCommunity = "general";
let currentPost = null;
let currentGuessAttempts = 0;
const MAX_GUESS_ATTEMPTS = 2;
let activeCommunityFilter = "all";
let posts = [];
let postAnalytics = {};
let postsLoaded = false;
let savedScrollPosition = 0;
let newPostsAvailable = false;

// ===== POSTER STATE =====
// Extended font list with artistic fonts
const FONT_FAMILIES = {
  'playfair':    { family: "'Playfair Display', serif",     style: 'italic',  label: 'Playfair' },
  'lora':        { family: "'Lora', serif",                 style: 'italic',  label: 'Lora' },
  'crimson':     { family: "'Crimson Text', serif",         style: 'italic',  label: 'Crimson' },
  'merriweather':{ family: "'Merriweather', serif",         style: 'normal',  label: 'Merri' },
  'pacifico':    { family: "'Pacifico', cursive",           style: 'normal',  label: 'Pacifico' },
  'lobster':     { family: "'Lobster', cursive",            style: 'normal',  label: 'Lobster' },
  'raleway':     { family: "'Raleway', sans-serif",         style: 'normal',  label: 'Raleway' },
  'inter':       { family: "'Inter', sans-serif",           style: 'normal',  label: 'Inter' },
  'bebas':       { family: "'Bebas Neue', sans-serif",      style: 'normal',  label: 'Bebas' },
  'space':       { family: "'Space Grotesk', sans-serif",   style: 'normal',  label: 'Space' },
  'roboto':      { family: "'Roboto', sans-serif",          style: 'normal',  label: 'Roboto' },
  'oswald':      { family: "'Oswald', sans-serif",          style: 'normal',  label: 'Oswald' },
  'permanent':   { family: "'Permanent Marker', cursive",   style: 'normal',  label: 'Marker' },
  'dancing':     { family: "'Dancing Script', cursive",     style: 'normal',  label: 'Dancing' },
  'abril':       { family: "'Abril Fatface', cursive",      style: 'normal',  label: 'Abril' },
  'satisfy':     { family: "'Satisfy', cursive",            style: 'normal',  label: 'Satisfy' },
};

let selectedFont = 'playfair';
let uploadedBgImage = null;
let selectedDesign = "midnight-gold";
let selectedPosterSize = null;
let generatedPosterBlob = null;

let imageEffects = { brightness: 100, darkness: 50, blur: 0, contrast: 100, filter: 'none' };

const POSTER_DESIGNS = {
  'midnight-gold':   { bg:['#0d0d0d','#1a1410','#0d0d0d'], primary:'#d4af37', secondary:'rgba(212,175,55,0.65)', text:'#f8f8f8' },
  'royal-purple':    { bg:['#1a0033','#2d1b4e','#1a0033'], primary:'#c77dff', secondary:'rgba(199,125,255,0.65)', text:'#f8f8f8' },
  'neon-cyan':       { bg:['#0a1420','#142838','#0a1420'], primary:'#00e5ff', secondary:'rgba(0,229,255,0.65)',   text:'#f8f8f8' },
  'sunset-coral':    { bg:['#1a0a0a','#2d1416','#1a0a0a'], primary:'#ff6b6b', secondary:'rgba(255,107,107,0.65)',text:'#f8f8f8' },
  'emerald-night':   { bg:['#051a0d','#0d2e1a','#051a0d'], primary:'#50fa7b', secondary:'rgba(80,250,123,0.65)', text:'#f8f8f8' },
  'rose-gold':       { bg:['#1a0d0f','#2d1a1f','#1a0d0f'], primary:'#f4a4c0', secondary:'rgba(244,164,192,0.65)',text:'#f8f8f8' },
  'brutalist':       { bg:['#ffffff','#f0f0f0','#ffffff'],  primary:'#000000', secondary:'rgba(0,0,0,0.6)',       text:'#000000' },
  'y2k-chrome':      { bg:['#000033','#1a1a4d','#000033'], primary:'#00ffff', secondary:'rgba(255,0,255,0.65)',  text:'#ffffff' },
  'vaporwave':       { bg:['#ff71ce','#b967ff','#05ffa1'], primary:'#ffffff', secondary:'rgba(255,255,255,0.8)', text:'#ffffff' },
  'neon-dark':       { bg:['#0a0a0a','#0f0f0f','#0a0a0a'], primary:'#ff00ff', secondary:'rgba(0,255,255,0.7)',   text:'#00ffff' },
  'cream-editorial': { bg:['#f5f1e8','#ebe3d5','#f5f1e8'], primary:'#2a2520', secondary:'rgba(42,37,32,0.6)',    text:'#2a2520' },
  'monochrome':      { bg:['#000000','#111111','#000000'], primary:'#ffffff', secondary:'rgba(255,255,255,0.7)', text:'#ffffff' },
};

// ===== USER ID =====
let userId = localStorage.getItem("margoUserId");
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2,8);
  localStorage.setItem("margoUserId", userId);
}

// ===== ELEMENTS =====
const landing          = document.getElementById("landing");
const feed             = document.getElementById("feed");
const composer         = document.getElementById("composer");
const guessModal       = document.getElementById("guessModal");
const discoverModal    = document.getElementById("discoverModal");
const postcardModal    = document.getElementById("postcardModal");
const listenModal      = document.getElementById("listenModal");
const analyticsModal   = document.getElementById("analyticsModal");
const sharePosterModal = document.getElementById("sharePosterModal");

const enterBtn       = document.getElementById("enterBtn");
const backBtn        = document.getElementById("backBtn");
const openComposerBtn= document.getElementById("openComposer");
const closeComposerBtn=document.getElementById("closeComposer");
const postBtn        = document.getElementById("postBtn");
const textInput      = document.getElementById("textInput");
const charCount      = document.getElementById("charCount");
const feedList       = document.getElementById("feedList");
const newPostsIndicator = document.getElementById("newPostsIndicator");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

const modeBtns         = document.querySelectorAll(".mode-btn");
const shareInputs      = document.getElementById("shareInputs");
const guessInputs      = document.getElementById("guessInputs");
const discoverInputs   = document.getElementById("discoverInputs");
const streamingSection = document.getElementById("streamingSection");

const songInput        = document.getElementById("songInput");
const artistInput      = document.getElementById("artistInput");
const guessSongCheck   = document.getElementById("guessSongCheck");
const guessArtistCheck = document.getElementById("guessArtistCheck");
const guessSongAnswer  = document.getElementById("guessSongAnswer");
const guessArtistAnswer= document.getElementById("guessArtistAnswer");
const discoverSongInput= document.getElementById("discoverSongInput");
const discoverArtistInput = document.getElementById("discoverArtistInput");

const spotifyLink    = document.getElementById("spotifyLink");
const appleLink      = document.getElementById("appleLink");
const youtubeLink    = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

const sharePosterBtn   = document.getElementById("sharePosterBtn");
const listenPostcard   = document.getElementById("listenPostcard");
const analyticsBtn     = document.getElementById("analyticsBtn");
const designStep       = document.getElementById("designStep");
const platformStep     = document.getElementById("platformStep");
const shareStep        = document.getElementById("shareStep");
const nextToPlatform   = document.getElementById("nextToPlatform");
const backToDesign     = document.getElementById("backToDesign");
const backToPlatform   = document.getElementById("backToPlatform");
const posterCanvas     = document.getElementById("posterCanvas");
const posterPreviewCanvas = document.getElementById("posterPreviewCanvas");
const shareableLink    = document.getElementById("shareableLink");
const copyLinkBtn      = document.getElementById("copyLinkBtn");
const shareNativeBtn   = document.getElementById("shareNativeBtn");
const downloadManualBtn= document.getElementById("downloadManualBtn");

// ===== LYRIC STREAM SAMPLES =====
const STREAM_SAMPLES = [
  { text: "I gave you all I had and still you left",            emotion: "Heartbreak" },
  { text: "Some nights I still hear your voice in the quiet",   emotion: "Nostalgia" },
  { text: "Dancing alone was better than lying beside you",     emotion: "Healing" },
  { text: "The city never sleeps but I always dream of you",    emotion: "Love" },
  { text: "Rage is just grief that forgot how to cry",          emotion: "Rage" },
  { text: "Every sunrise is a permission to start over",        emotion: "Hope" },
  { text: "I carry your memory like a song I can't name",       emotion: "Loneliness" },
  { text: "Nothing gold can stay but gold can glow forever",    emotion: "Nostalgia" },
  { text: "You were thunder and I was the calm after",          emotion: "Love" },
  { text: "Joy is not the absence of pain, it's dancing anyway",emotion: "Joy" },
  { text: "Missing someone is just love with nowhere to go",    emotion: "Loneliness" },
  { text: "I built a home in your chest and you moved out",     emotion: "Heartbreak" },
];

function buildLyricStream() {
  const track1 = document.getElementById("track1");
  const track2 = document.getElementById("track2");
  if (!track1 || !track2) return;
  track1.innerHTML = '';
  track2.innerHTML = '';

  // Smart selection: recent + popular + random
  const source = getTickerPosts();

  // Triple for seamless infinite loop
  const fill = [...source, ...source, ...source];

  const buildCard = (item) => {
    const emotion = item.emotion || 'Nostalgia';
    const eClass  = 'emotion-' + emotion.toLowerCase();
    const text    = item.text || '';
    const display = text.length > 44 ? text.substring(0, 44) + '…' : text;
    const card    = document.createElement('div');
    card.className = 'lyric-card' + (Math.random() > 0.65 ? ' featured' : '');
    card.innerHTML = `<div class="lyric-card-text">${display}</div>
      <div class="lyric-card-meta">
        <span class="lyric-card-emotion ${eClass}">${emotion}</span>
      </div>`;
    return card;
  };

  // Track 1: left scroll, Track 2: right scroll with offset start
  const offset = Math.floor(source.length / 2);
  fill.forEach(item => track1.appendChild(buildCard(item)));
  [...source.slice(offset), ...source, ...source, ...source.slice(0, offset)]
    .forEach(item => track2.appendChild(buildCard(item)));
}

// ===== SMART TICKER SELECTION =====
// 4 most recent + 4 most viewed + 4 random = 12 for the ticker
function getTickerPosts() {
  if (posts.length < 6) return STREAM_SAMPLES;

  const sorted = [...posts];

  // 4 most recent
  const recent = sorted.slice(0, 4);

  // 4 most viewed (by analytics)
  const byViews = [...posts]
    .filter(p => !recent.includes(p))
    .sort((a, b) => (postAnalytics[b.id]?.views || 0) - (postAnalytics[a.id]?.views || 0))
    .slice(0, 4);

  // 4 random from the rest
  const rest = posts.filter(p => !recent.includes(p) && !byViews.includes(p));
  const random = rest.sort(() => Math.random() - 0.5).slice(0, 4);

  return [...recent, ...byViews, ...random];
}

// ===== FEATURED STATS =====
function calcFeatured() {
  const artistSet    = new Set();
  const songSet      = new Set();
  const emotionCounts = {};

  posts.forEach(p => {
    const artist  = p.knowledge?.artist;
    const song    = p.knowledge?.song;
    const emotion = p.emotion || 'Nostalgia';

    // Count unique artists
    if (artist && artist !== 'Unknown Artist') artistSet.add(artist.toLowerCase().trim());
    // Count unique songs
    if (song && song !== 'Unknown Song') songSet.add(song.toLowerCase().trim());
    // Count emotion frequency
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  const topEmotion = Object.entries(emotionCounts).sort((a,b) => b[1]-a[1])[0];

  return {
    uniqueArtists: artistSet.size,
    uniqueSongs:   songSet.size,
    topEmotion
  };
}

function updateLandingStats() {
  const n = posts.length || 0;

  const lc = document.getElementById("liveCount");
  const st = document.getElementById("statTotal");
  const pc = document.getElementById("postCount");
  if (lc) lc.textContent = n;
  if (st) st.textContent = n || '—';
  if (pc) pc.textContent = n;

  const artistEl  = document.getElementById("featuredArtist");
  const songEl    = document.getElementById("featuredSong");
  const emotionEl = document.getElementById("topEmotion");

  if (!n) {
    if (artistEl)  artistEl.textContent  = '—';
    if (songEl)    songEl.textContent    = '—';
    if (emotionEl) emotionEl.textContent = '—';
    return;
  }

  const { uniqueArtists, uniqueSongs, topEmotion } = calcFeatured();

  if (artistEl)  artistEl.textContent  = uniqueArtists || '—';
  if (songEl)    songEl.textContent    = uniqueSongs   || '—';
  if (emotionEl) emotionEl.textContent = topEmotion ? topEmotion[0] : '—';
}

// ===== FIREBASE SYNC =====
if (isFirebaseEnabled) {
  postsRef.orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
    const prevCount = posts.length;
    posts = [];
    snapshot.forEach(child => {
      const p = child.val(); p.id = child.key; posts.unshift(p);
    });
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
    // Rebuild ticker now that view counts are available
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
      if (dx < 0 && feed.classList.contains("active")) goToLanding();
    }
  });
});

// ===== NAVIGATION =====
function goToFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
  window.scrollTo({ top: 0 });
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
if (efb1) efb1.onclick = () => {
  goToFeed();
  // smooth scroll to feed list
  setTimeout(() => feedList?.scrollIntoView({ behavior: 'smooth' }), 150);
};
if (efb2) efb2.onclick = () => {
  goToFeed();
  setTimeout(() => feedList?.scrollIntoView({ behavior: 'smooth' }), 150);
};
backBtn.onclick = goToLanding;

openComposerBtn.onclick = () => { openModal(composer); setTimeout(() => textInput.focus(), 200); };
closeComposerBtn.onclick  = () => { closeModal(composer); resetComposer(); };

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
  if (!text) { showToast("Please enter a lyric"); return; }
  if (!selectedEmotion) { showToast("Please select an emotion"); return; }

  let post = {
    text, emotion: selectedEmotion, mode: currentMode, community: "general",
    knowledge: { song: "Unknown Song", artist: "Unknown Artist" },
    guessConfig: null,
    links: currentMode !== "discover" ? {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    } : null,
    timestamp: isFirebaseEnabled ? firebase.database.ServerValue.TIMESTAMP : Date.now()
  };

  try {
    if (currentMode === "share") {
      if (!songInput.value.trim() || !artistInput.value.trim()) throw new Error("Please enter song and artist");
      post.knowledge = { song: songInput.value.trim(), artist: artistInput.value.trim() };
    }
    if (currentMode === "guess") {
      const doSong = guessSongCheck.checked, doArtist = guessArtistCheck.checked;
      if (!doSong && !doArtist) throw new Error("Select at least one thing to guess");
      if (doSong && !guessSongAnswer.value.trim()) throw new Error("Enter the correct song title");
      if (doArtist && !guessArtistAnswer.value.trim()) throw new Error("Enter the correct artist");
      post.knowledge = { song: guessSongAnswer.value.trim(), artist: guessArtistAnswer.value.trim(), hidden: true };
      post.guessConfig = { guessSong: doSong, guessArtist: doArtist };
    }
    if (currentMode === "discover") {
      post.knowledge = {
        song:   discoverSongInput.value.trim() || "Unknown Song",
        artist: discoverArtistInput.value.trim() || "Unknown Artist"
      };
    }
  } catch(err) { showToast(err.message); return; }

  postBtn.disabled = true; postBtn.textContent = "Posting…";
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
    console.error(err); showToast(err.message || "Error posting.");
  } finally {
    postBtn.disabled = false; postBtn.textContent = "Post";
  }
};

function resetComposer() {
  textInput.value = ""; songInput.value = ""; artistInput.value = "";
  guessSongAnswer.value = ""; guessArtistAnswer.value = "";
  discoverSongInput.value = ""; discoverArtistInput.value = "";
  if (spotifyLink) spotifyLink.value = "";
  if (appleLink)   appleLink.value = "";
  if (youtubeLink) youtubeLink.value = "";
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
  guessSongCheck.checked = true; guessArtistCheck.checked = true;
}

// ===== RENDER FEED =====
function getDynamicFontSize(len) {
  if (len < 50) return '1.05rem';
  if (len < 90) return '0.95rem';
  return '0.86rem';
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
  if (!postsLoaded) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gold)">Loading…</div>';
    return;
  }
  if (!posts.length) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">No lyrics yet — be the first to drop one.</div>';
    return;
  }

  posts.forEach((post, i) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.style.animationDelay = `${i * 0.03}s`;

    const k = post.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
    const emotion = post.emotion || "Nostalgia";
    const eBg    = EMOTION_COLORS[emotion] || 'rgba(232,197,71,0.1)';
    const eColor = EMOTION_TEXT[emotion]  || 'var(--gold)';

    const modeBadge = post.mode === 'guess'
      ? '<span class="card-mode-badge mode-guess">Guess</span>'
      : post.mode === 'discover'
      ? '<span class="card-mode-badge mode-discover">Discover</span>'
      : '<span class="card-mode-badge mode-share">Share</span>';

    const hasLinks = post.links && (post.links.spotify||post.links.apple||post.links.youtube||post.links.soundcloud);
    const idx = i;

    let songSection = '', actionsSection = '';
    if (post.mode === "share") {
      songSection = `<div class="card-song"><div class="card-song-title">${k.song}</div><div class="card-song-artist">${k.artist}</div></div>`;
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
      songSection = `<div class="card-discover">${hasClue ? `Maybe: ${k.song} — ${k.artist}` : 'Help discover this song'}</div>`;
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
      <div class="card-lyric" style="font-size:${getDynamicFontSize(post.text.length)}">${post.text}</div>
      <span class="card-emotion-tag" style="background:${eBg};color:${eColor}">${emotion}</span>
      ${songSection}
      ${actionsSection}
    `;
    feedList.appendChild(card);
  });
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h';
  return Math.floor(h/24) + 'd';
}

function trackView(postId) {
  if (isFirebaseEnabled && postId) analyticsRef.child(postId).child('views').transaction(v => (v||0)+1);
}

// ===== VIEW / GUESS / DISCOVER / LISTEN =====
window.viewPost = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);

  document.getElementById("postcardLyric").textContent   = currentPost.text;
  document.getElementById("postcardEmotion").textContent = currentPost.emotion || "Nostalgia";

  const k = currentPost.knowledge || { song:"Unknown Song", artist:"Unknown Artist" };
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
      a.className = "listen-link"; a.href = currentPost.links[key];
      a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = name;
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

  document.getElementById("guessLyric").textContent = currentPost.text;
  document.getElementById("guessSongInput").value   = "";
  document.getElementById("guessArtistInput").value = "";
  document.getElementById("guessResult").className  = "result-msg hidden";
  document.getElementById("guessLinksSection").className = "guess-links hidden";
  document.getElementById("guessInputFields").style.display = "";
  document.getElementById("submitGuess").style.display    = "";
  document.getElementById("revealAnswer").style.display   = "none";

  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  document.getElementById("guessSongInput").style.display   = doSong   ? 'block' : 'none';
  document.getElementById("guessArtistInput").style.display = doArtist ? 'block' : 'none';

  const what = [];
  if (doSong) what.push("song"); if (doArtist) what.push("artist");
  document.getElementById("guessHint").textContent = `${MAX_GUESS_ATTEMPTS} attempts to guess the ${what.join(" and ")}.`;
  openModal(guessModal);
};

window.openDiscover = function(index) {
  currentPost = posts[index];
  if (!currentPost) return;
  trackView(currentPost.id);
  ['discoverLyric','discoverSongAnswer','discoverArtistAnswer','discoverSpotifyLink','discoverAppleLink','discoverYoutubeLink','discoverSoundcloudLink'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { if (id === 'discoverLyric') el.textContent = currentPost.text; else el.value = ''; }
  });
  openModal(discoverModal);
};

// ===== GUESS SUBMISSION =====
document.getElementById("submitGuess").onclick = () => {
  if (!currentPost) return;
  currentGuessAttempts++;
  const k = currentPost.knowledge || {};
  const doSong   = currentPost.guessConfig?.guessSong   ?? true;
  const doArtist = currentPost.guessConfig?.guessArtist ?? true;
  const gs  = document.getElementById("guessSongInput").value.trim().toLowerCase();
  const ga  = document.getElementById("guessArtistInput").value.trim().toLowerCase();
  const as  = (k.song   ||'').toLowerCase();
  const aa  = (k.artist ||'').toLowerCase();
  const songOk   = !doSong   || (gs && (gs===as || gs.includes(as) || as.includes(gs)));
  const artistOk = !doArtist || (ga && (ga===aa || ga.includes(aa) || aa.includes(ga)));
  const correct  = songOk && artistOk;

  if (isFirebaseEnabled) analyticsRef.child(currentPost.id).child('guesses').push({ song:gs||null, artist:ga||null, correct, timestamp:Date.now() });

  const resultEl = document.getElementById("guessResult");
  resultEl.classList.remove("hidden","result-success","result-error","result-partial");

  if (correct) {
    resultEl.className = "result-msg result-success";
    resultEl.innerHTML = `Correct! 🎉<br><span style="font-size:0.8rem">"${k.song}" by ${k.artist}</span>`;
    document.getElementById("submitGuess").style.display    = "none";
    document.getElementById("guessInputFields").style.display = "none";
    if (currentPost.links) {
      const links = currentPost.links;
      const ll = document.getElementById("guessLinksSection");
      let html = '<div class="guess-links-title">Listen</div>';
      if (links.spotify)    html += `<a href="${links.spotify}"    target="_blank" class="guess-link">Spotify</a>`;
      if (links.apple)      html += `<a href="${links.apple}"      target="_blank" class="guess-link">Apple Music</a>`;
      if (links.youtube)    html += `<a href="${links.youtube}"    target="_blank" class="guess-link">YouTube</a>`;
      if (links.soundcloud) html += `<a href="${links.soundcloud}" target="_blank" class="guess-link">SoundCloud</a>`;
      ll.innerHTML = html; ll.classList.remove("hidden");
    }
    return;
  }

  const left = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
  if (left <= 0) {
    resultEl.className = "result-msg result-error";
    resultEl.innerHTML = `Out of attempts<br><span style="font-size:0.8rem">It was: "${k.song}" by ${k.artist}</span>`;
    document.getElementById("submitGuess").style.display    = "none";
    document.getElementById("guessInputFields").style.display = "none";
    return;
  }

  const ps = doSong   && gs && (gs===as||gs.includes(as)||as.includes(gs));
  const pa = doArtist && ga && (ga===aa||ga.includes(aa)||aa.includes(ga));
  resultEl.className = `result-msg ${(ps||pa) ? 'result-partial' : 'result-error'}`;
  let msg = (ps||pa) ? 'Partially correct — ' : 'Incorrect — ';
  if (doSong)   msg += `Song: ${ps?'✓':'✗'} `;
  if (doArtist) msg += `Artist: ${pa?'✓':'✗'} `;
  msg += `(${left} left)`;
  resultEl.innerHTML = msg;
  document.getElementById("guessSongInput").value = "";
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
  const an = postAnalytics[currentPost.id] || { views:0 };
  const guesses = Object.values(an.guesses||{});
  const helps   = Object.values(an.helps  ||{});
  const body = document.getElementById("analyticsBody");

  let html = `<div class="analytics-grid">
    <div class="stat-card"><div class="stat-num">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if (currentPost.mode==='guess')    html += `<div class="stat-card"><div class="stat-num">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if (currentPost.mode==='discover') html += `<div class="stat-card"><div class="stat-num">${helps.length}</div><div class="stat-label">Helps</div></div>`;
  html += '</div>';
  body.innerHTML = html;

  if (currentPost.mode==='guess' && guesses.length) {
    let sec = '<div class="activity-section"><h4>Guesses</h4><div class="activity-list">';
    guesses.forEach(g => {
      sec += `<div class="activity-item ${g.correct?'correct':'incorrect'}">
        <div class="activity-guess">${g.song?'Song: '+g.song:''} ${g.artist?'• Artist: '+g.artist:''}</div>
        <div class="activity-result ${g.correct?'correct':'incorrect'}">${g.correct?'Correct':'Incorrect'}</div>
        <div class="activity-time">${timeAgo(g.timestamp)}</div>
      </div>`;
    });
    body.innerHTML += sec + '</div></div>';
  }

  closeModal(postcardModal);
  openModal(analyticsModal);
};

// Listen from postcard
listenPostcard.onclick = () => {
  const idx = posts.findIndex(p => p.id === currentPost?.id);
  if (idx !== -1) { closeModal(postcardModal); window.openListen(idx); }
};

// ===== SCROLL MANAGEMENT =====
window.addEventListener('scroll', () => {
  scrollToTopBtn?.classList.toggle('visible', window.pageYOffset > 300);
});
if (scrollToTopBtn) {
  scrollToTopBtn.onclick = () => { window.scrollTo({top:0,behavior:'smooth'}); };
}
if (newPostsIndicator) {
  newPostsIndicator.onclick = () => {
    newPostsAvailable = false;
    renderFeed();
    newPostsIndicator.classList.remove('visible');
    window.scrollTo({top:0,behavior:'smooth'});
  };
}
function showNewPostsIndicator(count) {
  const c = document.getElementById("newPostsCount");
  if (c) c.textContent = count;
  newPostsIndicator?.classList.add('visible');
}

// ===== POSTER: LIVE PREVIEW =====
function updateLivePreview() {
  if (!currentPost || !posterPreviewCanvas) return;
  const ctx = posterPreviewCanvas.getContext('2d');
  const W = 300, H = 300;
  posterPreviewCanvas.width = W;
  posterPreviewCanvas.height = H;
  drawPosterToCtx(ctx, W, H, 12);
}

function getImageFilter() {
  let f = `brightness(${imageEffects.brightness}%) contrast(${imageEffects.contrast}%)`;
  const map = {
    warm:     ' sepia(0.3) saturate(1.3) hue-rotate(-10deg)',
    cool:     ' saturate(0.85) hue-rotate(15deg)',
    vintage:  ' sepia(0.5) contrast(1.2)',
    dramatic: ' contrast(1.5) saturate(1.2) brightness(0.9)',
    ethereal: ' brightness(1.1) saturate(0.75)',
    sunset:   ' sepia(0.4) saturate(1.4) hue-rotate(-20deg)',
    arctic:   ' saturate(0.6) brightness(1.1) hue-rotate(190deg)',
  };
  if (map[imageEffects.filter]) f += map[imageEffects.filter];
  return f;
}

function drawPosterToCtx(ctx, W, H, baseFontSize) {
  const c = POSTER_DESIGNS[selectedDesign] || POSTER_DESIGNS['midnight-gold'];
  const fd = FONT_FAMILIES[selectedFont]   || FONT_FAMILIES['playfair'];
  const fs = baseFontSize;

  // ── Background ──
  if (uploadedBgImage) {
    const tmp = document.createElement('canvas');
    const tc  = tmp.getContext('2d');
    tmp.width = W; tmp.height = H;
    const scale = Math.max(W/uploadedBgImage.width, H/uploadedBgImage.height);
    const sw = uploadedBgImage.width*scale, sh = uploadedBgImage.height*scale;
    tc.filter = getImageFilter();
    tc.drawImage(uploadedBgImage, (W-sw)/2, (H-sh)/2, sw, sh);
    tc.filter = 'none';
    if (imageEffects.blur > 0) { ctx.filter = `blur(${imageEffects.blur}px)`; }
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = 'none';
    ctx.fillStyle = `rgba(0,0,0,${imageEffects.darkness/100})`;
    ctx.fillRect(0,0,W,H);
  } else {
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, c.bg[0]); g.addColorStop(0.5, c.bg[1]); g.addColorStop(1, c.bg[2]);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  }

  const textColor = uploadedBgImage ? '#ffffff' : c.text;
  const accentColor = uploadedBgImage ? '#ffffff' : c.primary;

  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = uploadedBgImage ? 8 : 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // MARGO header
  ctx.fillStyle = uploadedBgImage ? '#ffffff' : c.primary;
  ctx.font = `700 ${fs*1.3}px sans-serif`;
  ctx.fillText('MARGO', W/2, fs*2.2);

  // Lyric
  ctx.fillStyle = textColor;
  ctx.font = `${fd.style === 'italic' ? 'italic ' : ''}${fs*0.95}px ${fd.family}`;
  const lyricText = currentPost.text.length > 90 ? currentPost.text.substring(0,87)+'…' : currentPost.text;
  wrapText(ctx, lyricText, W/2, H*0.42, W*0.84, fs*1.4);

  // Emotion
  ctx.fillStyle = accentColor;
  ctx.font = `600 ${fs*0.72}px sans-serif`;
  ctx.fillText(`#${currentPost.emotion||'Nostalgia'}`, W/2, H*0.64);

  // Divider
  ctx.shadowBlur = 0;
  ctx.strokeStyle = uploadedBgImage ? 'rgba(255,255,255,0.5)' : c.secondary;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W*0.3, H*0.7); ctx.lineTo(W*0.7, H*0.7); ctx.stroke();

  // Song
  const k = currentPost.knowledge || { song:'Unknown Song', artist:'Unknown Artist' };
  ctx.fillStyle = accentColor;
  ctx.font = `bold ${fs*0.85}px ${fd.family}`;
  ctx.fillText(k.song.length>28 ? k.song.substring(0,28)+'…' : k.song, W/2, H*0.78);
  ctx.fillStyle = uploadedBgImage ? 'rgba(255,255,255,0.75)' : c.secondary;
  ctx.font = `500 ${fs*0.7}px sans-serif`;
  ctx.fillText(k.artist.length>32 ? k.artist.substring(0,32)+'…' : k.artist, W/2, H*0.85);

  // Footer
  ctx.fillStyle = uploadedBgImage ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)';
  ctx.font = `400 ${fs*0.55}px sans-serif`;
  ctx.fillText(APP_BASE_URL.replace(/^https?:\/\//,''), W/2, H*0.94);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', lines = [];
  words.forEach(word => {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' '; }
    else line = test;
  });
  if (line.trim()) lines.push(line.trim());
  const startY = y - ((lines.length-1)*lh)/2;
  lines.forEach((l,i) => ctx.fillText(l, x, startY + i*lh));
}

// ===== POSTER: WIRE CONTROLS =====
function wirePosterControls() {
  // Color dots — class is "clr-dot"
  document.querySelectorAll(".clr-dot").forEach(dot => {
    dot.onclick = () => {
      document.querySelectorAll(".clr-dot").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      selectedDesign = dot.dataset.design;
      updateLivePreview();
    };
  });

  // Font chips — class is "font-chip"
  document.querySelectorAll(".font-chip").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".font-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedFont = btn.dataset.font;
      updateLivePreview();
    };
  });

  // Filter chips — class is "filter-chip"
  document.querySelectorAll(".filter-chip").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      imageEffects.filter = btn.dataset.filter;
      updateLivePreview();
    };
  });

  // Effect sliders
  const sliderDefs = [
    ['brightnessSlider','brightnessValue','brightness','%'],
    ['darknessSlider',  'darknessValue',  'darkness',  '%'],
    ['blurSlider',      'blurValue',      'blur',      ''],
    ['contrastSlider',  'contrastValue',  'contrast',  '%'],
  ];
  sliderDefs.forEach(([sliderId, valId, key, unit]) => {
    const slider = document.getElementById(sliderId);
    const valEl  = document.getElementById(valId);
    if (!slider) return;
    slider.oninput = () => {
      imageEffects[key] = parseInt(slider.value);
      if (valEl) valEl.textContent = slider.value + unit;
      updateLivePreview();
    };
  });

  // Reset effects
  const resetBtn = document.getElementById("resetEffectsBtn");
  if (resetBtn) resetBtn.onclick = () => {
    imageEffects = { brightness:100, darkness:50, blur:0, contrast:100, filter:'none' };
    const resets = {brightnessSlider:100, darknessSlider:50, blurSlider:0, contrastSlider:100};
    Object.entries(resets).forEach(([id,val]) => { const el=document.getElementById(id); if(el) el.value=val; });
    const labels = {brightnessValue:'100%', darknessValue:'50%', blurValue:'0', contrastValue:'100%'};
    Object.entries(labels).forEach(([id,val]) => { const el=document.getElementById(id); if(el) el.textContent=val; });
    document.querySelectorAll(".filter-chip").forEach((b,i) => b.classList.toggle("active", i===0));
    updateLivePreview();
  };

  // Upload bg
  const uploadBtn = document.getElementById("uploadBgBtn");
  const uploadInput = document.getElementById("bgUploadInput");
  if (uploadBtn && uploadInput) {
    uploadBtn.onclick = () => uploadInput.click();
    uploadInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast("Please upload an image"); return; }
      if (file.size > 10*1024*1024) { showToast("File too large (max 10MB)"); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          uploadedBgImage = img;
          const sec = document.getElementById("imageControlsSection");
          const stat = document.getElementById("uploadStatus");
          if (sec) sec.style.display = 'block';
          if (stat) stat.textContent = file.name;
          showToast("Photo uploaded!");
          updateLivePreview();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  }

  // Remove bg
  const removeBtn = document.getElementById("removeBgBtn");
  if (removeBtn) removeBtn.onclick = () => {
    uploadedBgImage = null;
    const sec  = document.getElementById("imageControlsSection");
    const stat = document.getElementById("uploadStatus");
    const inp  = document.getElementById("bgUploadInput");
    if (sec)  sec.style.display = 'none';
    if (stat) stat.textContent  = 'Tap to add your image';
    if (inp)  inp.value = '';
    updateLivePreview();
  };
}

// ===== POSTER MODAL =====
const EMOTION_DESIGN_MAP = {
  Love:'rose-gold', Heartbreak:'sunset-coral', Hope:'emerald-night',
  Nostalgia:'midnight-gold', Healing:'cream-editorial', Joy:'vaporwave',
  Rage:'neon-dark', Loneliness:'royal-purple'
};

sharePosterBtn.onclick = () => {
  closeModal(postcardModal);
  // reset state
  uploadedBgImage = null;
  selectedFont    = 'playfair';
  imageEffects    = { brightness:100, darkness:50, blur:0, contrast:100, filter:'none' };
  generatedPosterBlob = null;
  selectedPosterSize  = null;

  // auto design by emotion
  if (currentPost?.emotion) {
    selectedDesign = EMOTION_DESIGN_MAP[currentPost.emotion] || 'midnight-gold';
  } else {
    selectedDesign = 'midnight-gold';
  }

  // reset steps
  designStep.classList.add("active");
  platformStep.classList.remove("active");
  shareStep.classList.remove("active");

  // reset UI
  document.querySelectorAll(".clr-dot").forEach(d => d.classList.toggle("active", d.dataset.design === selectedDesign));
  document.querySelectorAll(".font-chip").forEach((b,i) => b.classList.toggle("active", i===0));
  document.querySelectorAll(".filter-chip").forEach((b,i) => b.classList.toggle("active", i===0));
  const sec = document.getElementById("imageControlsSection");
  if (sec) sec.style.display = 'none';
  const stat = document.getElementById("uploadStatus");
  if (stat) stat.textContent = 'Tap to add your image';

  openModal(sharePosterModal);
  setTimeout(() => {
    wirePosterControls();
    updateLivePreview();
  }, 80);
};

nextToPlatform.onclick = () => { designStep.classList.remove("active"); platformStep.classList.add("active"); };
backToDesign.onclick   = () => { platformStep.classList.remove("active"); designStep.classList.add("active"); };
backToPlatform.onclick = () => { shareStep.classList.remove("active"); platformStep.classList.add("active"); };

// Platform buttons — use "plat-btn" class
document.querySelectorAll(".plat-btn[data-size]").forEach(btn => {
  btn.onclick = async () => {
    selectedPosterSize = btn.dataset.size;
    showToast("Generating poster…");
    try {
      await generatePoster(selectedPosterSize);
      shareableLink.value = `${APP_BASE_URL}?post=${currentPost?.id||''}`;
      platformStep.classList.remove("active");
      shareStep.classList.add("active");
      showToast("Poster ready!");
    } catch(err) {
      console.error(err); showToast("Error generating poster");
    }
  };
});

async function generatePoster(size) {
  if (!currentPost) return;
  const SIZES = {
    'instagram-square': {w:1080,h:1080},
    'instagram-story':  {w:1080,h:1920},
    'twitter':          {w:1200,h:675},
    'facebook':         {w:1200,h:630},
    'pinterest':        {w:1000,h:1500},
    'reddit':           {w:1200,h:1200},
  };
  const d = SIZES[size]; if (!d) return;
  posterCanvas.width = d.w; posterCanvas.height = d.h;
  const ctx = posterCanvas.getContext('2d');
  const fs  = d.w * 0.028;
  drawPosterToCtx(ctx, d.w, d.h, fs);
  return new Promise(res => posterCanvas.toBlob(blob => { generatedPosterBlob = blob; res(); }, 'image/png'));
}

// ===== SHARE BUTTONS =====
copyLinkBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(shareableLink.value);
    copyLinkBtn.textContent = "Copied!";
    setTimeout(() => copyLinkBtn.textContent = "Copy", 2000);
    showToast("Link copied!");
  } catch { shareableLink.select(); showToast("Copy the link manually"); }
};

shareNativeBtn.onclick = async () => {
  if (!generatedPosterBlob) { showToast("Generating…"); return; }
  const file = new File([generatedPosterBlob], `margo-poster-${Date.now()}.png`, {type:'image/png'});
  const sd = { title:`MARGO — ${currentPost.text.substring(0,50)}`, text:`"${currentPost.text}"\n\n${shareableLink.value}`, files:[file] };
  try {
    if (navigator.canShare?.(sd)) { await navigator.share(sd); showToast("Shared!"); }
    else downloadPosterFile();
  } catch(e) { if (e.name!=='AbortError') downloadPosterFile(); }
};

downloadManualBtn.onclick = downloadPosterFile;

function downloadPosterFile() {
  if (!generatedPosterBlob) { showToast("No poster yet"); return; }
  const a = document.createElement('a');
  const url = URL.createObjectURL(generatedPosterBlob);
  a.href = url; a.download = `margo-poster-${Date.now()}.png`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast("Poster downloaded!");
}

// ===== MODAL CLOSE BUTTONS =====
document.getElementById("closeGuess").onclick    = () => { closeModal(guessModal);       currentGuessAttempts = 0; };
document.getElementById("closeDiscover").onclick = () => closeModal(discoverModal);
document.getElementById("closePostcard").onclick = () => closeModal(postcardModal);
document.getElementById("closeListen").onclick   = () => closeModal(listenModal);
document.getElementById("closeAnalytics").onclick= () => closeModal(analyticsModal);
document.getElementById("closeSharePoster").onclick = () => {
  closeModal(sharePosterModal);
  designStep.classList.add("active"); platformStep.classList.remove("active"); shareStep.classList.remove("active");
};

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
console.log("MARGO loaded. Firebase:", isFirebaseEnabled);

function setupScrollToTop() {
  window.addEventListener('scroll', () => {
    scrollToTopBtn?.classList.toggle('visible', window.pageYOffset > 350);
  });
}
