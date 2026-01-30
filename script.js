/* ==================== FIREBASE CONFIG ==================== */
const firebaseConfig = {
apiKey: "AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM",
authDomain: "margo-f6da4.firebaseapp.com",
databaseURL: "https://margo-f6da4-default-rtdb.firebaseio.com",
projectId: "margo-f6da4",
storageBucket: "margo-f6da4.firebasestorage.app",
messagingSenderId: "150183564620",
appId: "1:150183564620:web:a42de7fef39740b551ebe9"
};

// Initialize Firebase
let db = null;
try {
if (typeof firebase !== 'undefined') {
firebase.initializeApp(firebaseConfig);
db = firebase.database();
console.log("✅ Firebase connected successfully");
} else {
console.warn("⚠️ Firebase SDK not loaded");
}
} catch (error) {
console.warn("⚠️ Firebase initialization failed:", error);
console.warn("Using localStorage fallback");
}

/* ==================== SEED POSTS ==================== */
const SEED_POSTS = [
  {
    id: Date.now() - 120000,
    text: "I'm still learning to love the parts of me nobody claps for",
    song: "Self Love",
    artist: "Metro Boomin",
    emotions: ["Healing", "Hope"],
    timestamp: Date.now() - 120000,
    vibes: { user_1: true, user_2: true },
    template: "minimal"
  },
  {
    id: Date.now() - 300000,
    text: "Some nights I don't know if I'm healing or just getting used to the pain",
    song: "Liability",
    artist: "Lorde",
    emotions: ["Loneliness", "Heartbreak"],
    timestamp: Date.now() - 300000,
    vibes: { user_3: true },
    template: "minimal"
  },
  {
    id: Date.now() - 600000,
    text: "They tried to bury me but they didn't know I was a seed",
    song: "HUMBLE.",
    artist: "Kendrick Lamar",
    emotions: ["Freedom", "Hope"],
    timestamp: Date.now() - 600000,
    vibes: { user_4: true, user_5: true, user_6: true },
    template: "minimal"
  },
  {
    id: Date.now() - 900000,
    text: "What if I told you the version of me you fell for was just a draft?",
    song: "Good Days",
    artist: "SZA",
    emotions: ["Nostalgia", "Healing"],
    timestamp: Date.now() - 900000,
    vibes: { user_7: true },
    template: "minimal"
  },
  {
    id: Date.now() - 1800000,
    text: "I'm not heartless, I just learned how to use my heart less",
    song: "Heartless",
    artist: "The Weeknd",
    emotions: ["Heartbreak", "Rage"],
    timestamp: Date.now() - 1800000,
    vibes: { user_8: true, user_9: true },
    template: "minimal"
  },
  {
    id: Date.now() - 3600000,
    text: "Dancing through the pain like it's the only language I know",
    song: "Levitating",
    artist: "Dua Lipa",
    emotions: ["Joy", "Freedom"],
    timestamp: Date.now() - 3600000,
    vibes: { user_10: true, user_11: true, user_12: true, user_13: true },
    template: "minimal"
  },
  {
    id: Date.now() - 7200000,
    text: "Maybe I'm addicted to the chaos because silence feels like giving up",
    song: "Bad Habit",
    artist: "Steve Lacy",
    emotions: ["Anxiety", "Love"],
    timestamp: Date.now() - 7200000,
    vibes: { user_14: true },
    template: "minimal"
  },
  {
    id: Date.now() - 10800000,
    text: "The best revenge is glowing up and not giving them a front row seat",
    song: "Good as Hell",
    artist: "Lizzo",
    emotions: ["Joy", "Freedom"],
    timestamp: Date.now() - 10800000,
    vibes: { user_15: true, user_16: true, user_17: true },
    template: "minimal"
  }
];

/* ==================== ELEMENTS ==================== */
const app = document.getElementById("app");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const composer = document.getElementById("composer");
const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const count = document.getElementById("count");
const emotionPills = document.getElementById("emotionPills");
const hideSongCheck = document.getElementById("hideSongCheck");
const postcardText = document.getElementById("postcardText");
const postcardEmotions = document.getElementById("postcardEmotions");
const postcardSongInfo = document.getElementById("postcardSongInfo");
const postcardCard = document.getElementById("postcardCard");
const postcardOverlay = document.getElementById("postcard");
const closePostcard = document.getElementById("closePostcard");
const closePostcardBtn = document.getElementById("closePostcardBtn");
const feedList = document.getElementById("feedList");
const feedBackBtn = document.getElementById("feedBackBtn");

// Action buttons
const shareBtn = document.getElementById("shareBtn");
const listenBtn = document.getElementById("listenBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Modals
const shareModal = document.getElementById("shareModal");
const listenModal = document.getElementById("listenModal");
const guessModal = document.getElementById("guessModal");
const closeShare = document.getElementById("closeShare");
const closeListen = document.getElementById("closeListen");
const closeGuess = document.getElementById("closeGuess");

// Guess elements
const guessLyric = document.getElementById("guessLyric");
const guessSongInput = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const submitGuess = document.getElementById("submitGuess");
const guessResult = document.getElementById("guessResult");

// Template buttons
const templateBtns = document.querySelectorAll(".template-card");

/* ==================== STATE ==================== */
let selectedEmotions = [];
let currentPost = null;
let currentTemplate = "minimal";
let currentScreen = 0;
let allPosts = [];
let userVibes = {};
let userGuesses = {};

// Rate limiting
function getLastPostTime() {
return parseInt(localStorage.getItem("margoLastPostTime") || "0");
}

function setLastPostTime(time) {
localStorage.setItem("margoLastPostTime", time.toString());
}

const POST_COOLDOWN = 30000; // 30 seconds

/* ==================== UTILITY: TIME AGO ==================== */
function timeAgo(timestamp) {
const now = Date.now();
const diff = now - timestamp;
const seconds = Math.floor(diff / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);

if (seconds < 60) return 'just now';
if (minutes < 60) return `${minutes}m ago`;
if (hours < 24) return `${hours}h ago`;
return `${days}d ago`;
}

/* ==================== UTILITY: EMOTION AVATARS ==================== */
const emotionAvatars = {
Love: "💗",
Heartbreak: "💔",
Hope: "✨",
Nostalgia: "🌙",
Healing: "🌿",
Rage: "🔥",
Joy: "🌟",
Loneliness: "🌑",
Freedom: "🦋",
Anxiety: "🌪️"
};

function getAvatar(emotions) {
if (!emotions || emotions.length === 0) return "🎵";
return emotionAvatars[emotions[0]] || "🎵";
}

/* ==================== NAVIGATION ==================== */
function goTo(screenIndex) {
currentScreen = screenIndex;
app.style.transform = `translateX(-${screenIndex * 100}vw)`;
}

feedBackBtn.onclick = () => goTo(0);

/* ==================== SWIPE ==================== */
let startX = 0;
document.addEventListener("touchstart", e => {
startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {
const delta = startX - e.changedTouches[0].clientX;
if (delta > 60 && currentScreen < 1) {
goTo(1);
}
if (delta < -60 && currentScreen > 0) {
goTo(0);
}
});

/* ==================== COMPOSER ==================== */
openComposer.onclick = () => {
composer.classList.remove("hidden");
textInput.focus();
};

closeComposer.onclick = () => {
composer.classList.add("hidden");
resetComposer();
};

textInput.oninput = () => {
count.textContent = textInput.value.length;
};

hideSongCheck.onchange = () => {
if (hideSongCheck.checked) {
songInput.style.opacity = "0.3";
artistInput.style.opacity = "0.3";
songInput.disabled = true;
artistInput.disabled = true;
songInput.value = "Hidden";
artistInput.value = "Mystery Artist";
songInput.placeholder = "Hidden for guessing";
artistInput.placeholder = "Hidden for guessing";
} else {
songInput.style.opacity = "1";
artistInput.style.opacity = "1";
songInput.disabled = false;
artistInput.disabled = false;
songInput.value = "";
artistInput.value = "";
songInput.placeholder = "Song title";
artistInput.placeholder = "Artist";
}
};

function resetComposer() {
textInput.value = "";
songInput.value = "";
artistInput.value = "";
count.textContent = "0";
selectedEmotions = [];
hideSongCheck.checked = false;
songInput.style.opacity = "1";
artistInput.style.opacity = "1";
songInput.disabled = false;
artistInput.disabled = false;
songInput.placeholder = "Song title";
artistInput.placeholder = "Artist";
document.querySelectorAll(".emotion-pill").forEach(pill => {
pill.classList.remove("active");
});
}

/* ==================== EMOTION PILLS ==================== */
document.querySelectorAll(".emotion-pill").forEach(pill => {
pill.onclick = () => {
const emotion = pill.dataset.emotion;
if (selectedEmotions.includes(emotion)) {
selectedEmotions = selectedEmotions.filter(e => e !== emotion);
pill.classList.remove("active");
} else {
selectedEmotions.push(emotion);
pill.classList.add("active");
}
};
});

/* ==================== CREATE POST ==================== */
postBtn.onclick = async () => {
const lastPostTime = getLastPostTime();
const now = Date.now();
if (now - lastPostTime < POST_COOLDOWN) {
const remaining = Math.ceil((POST_COOLDOWN - (now - lastPostTime)) / 1000);
showToast(`⏳ Wait ${remaining}s before posting again`);
return;
}

const text = textInput.value.trim();
const song = songInput.value.trim();
const artist = artistInput.value.trim();

if (!text) {
showToast("✍️ Drop your line first");
return;
}

if (!hideSongCheck.checked) {
if (!song || !artist) {
showToast("🎵 Tag the song");
return;
}
}

if (selectedEmotions.length === 0) {
showToast("💭 Tag the vibe");
return;
}

const post = {
id: Date.now(),
text,
song: hideSongCheck.checked ? "Hidden" : song,
artist: hideSongCheck.checked ? "Mystery Artist" : artist,
emotions: selectedEmotions,
template: currentTemplate,
hideSong: hideSongCheck.checked || false,
timestamp: Date.now(),
vibes: {}
};

postBtn.disabled = true;
const originalText = postBtn.textContent;
postBtn.textContent = "Posting...";

try {
saveToLocalStorage(post);
showToast("✅ Posted to feed!");

if (db) {
db.ref('posts').push(post).then(() => {
console.log("✅ Firebase sync successful");
}).catch((err) => {
console.warn("⚠️ Firebase sync failed (but post is saved locally):", err);
});
}

setLastPostTime(Date.now());
resetComposer();
composer.classList.add("hidden");
goTo(1);

setTimeout(() => {
feedList.scrollTop = 0;
}, 100);
} catch (error) {
console.error("❌ Critical post error:", error);
showToast("❌ Post failed: " + error.message);
} finally {
postBtn.disabled = false;
postBtn.textContent = originalText;
}
};

function saveToLocalStorage(post) {
try {
let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
posts.unshift(post);
localStorage.setItem("margoPosts", JSON.stringify(posts));
allPosts = posts;
renderFeed();
} catch (error) {
console.error("❌ localStorage error:", error);
throw error;
}
}

/* ==================== FIREBASE REAL-TIME FEED ==================== */
function initFeed() {
if (db) {
db.ref('posts').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
const firebasePosts = [];
snapshot.forEach((child) => {
firebasePosts.push({ firebaseId: child.key, ...child.val() });
});
firebasePosts.reverse();

// Merge with localStorage posts
const localPosts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
const allPostsMap = new Map();

// Add Firebase posts first
firebasePosts.forEach(post => allPostsMap.set(post.id, post));
// Add local posts (might override Firebase if same ID)
localPosts.forEach(post => allPostsMap.set(post.id, post));

// Convert to array and sort by timestamp
allPosts = Array.from(allPostsMap.values()).sort((a, b) => b.timestamp - a.timestamp);

// If no posts at all, use seed data
if (allPosts.length === 0) {
allPosts = [...SEED_POSTS];
}

renderFeed();
});
} else {
// Fallback to localStorage
const localPosts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
allPosts = localPosts.length > 0 ? localPosts : [...SEED_POSTS];
renderFeed();
}

// Load user's vibes and guesses
userVibes = JSON.parse(localStorage.getItem("margoUserVibes") || "{}");
userGuesses = JSON.parse(localStorage.getItem("margoUserGuesses") || "{}");
}

/* ==================== RENDER FEED (ENHANCED) ==================== */
function renderFeed() {
feedList.innerHTML = "";

if (allPosts.length === 0) {
feedList.innerHTML = `
<div class="empty-state">
<p>No posts yet.</p>
<p>Be the first to drop a lyric.</p>
</div>
`;
return;
}

allPosts.forEach((post, index) => {
const card = document.createElement("div");
card.className = "feed-card";
card.style.animationDelay = `${index * 0.05}s`;

// Set emotion attribute
if (post.emotions && post.emotions.length > 0) {
card.setAttribute('data-emotion', post.emotions[0]);
}

// Avatar
const avatar = getAvatar(post.emotions);

// Time ago
const timeText = timeAgo(post.timestamp);

// Emotion tags
const emotionTags = post.emotions.map(e => {
return `<span class="feed-emotion" data-emotion="${e}">${e}</span>`;
}).join("");

// Song section
let songSection = '';
if (post.hideSong && !userGuesses[post.id]) {
songSection = `
<div class="feed-song mystery">
<div class="mystery-text">🎯 Can you guess the song?</div>
<button class="guess-btn" data-index="${index}">Make a Guess</button>
</div>
`;
} else {
songSection = `
<div class="feed-song">
<div class="feed-song-title">${post.song}</div>
<div class="feed-song-artist">${post.artist}</div>
</div>
`;
}

// Vibe count
const vibeCount = post.vibes ? Object.keys(post.vibes).length : 0;
const userVibed = userVibes[post.id] || false;

card.innerHTML = `
<div class="feed-card-header">
<div class="feed-avatar">${avatar}</div>
<div class="feed-meta">
<div class="feed-time">${timeText}</div>
</div>
</div>
<div class="feed-card-content">
<p class="feed-text">${post.text}</p>
<div class="feed-emotions">${emotionTags}</div>
${songSection}
<div class="vibe-counter">
<button class="vibe-btn ${userVibed ? 'active' : ''}" data-index="${index}">
<span class="vibe-icon">💚</span>
<span class="vibe-count">${vibeCount}</span>
</button>
</div>
</div>
<div class="feed-card-actions">
<button class="feed-action listen-action" data-index="${index}">
<span>♫</span>
<span>Listen</span>
</button>
<button class="feed-action share-action" data-index="${index}">
<span>↗</span>
<span>Share</span>
</button>
<button class="feed-action view-action" data-index="${index}">
<span>👁</span>
<span>View</span>
</button>
</div>
`;

feedList.appendChild(card);
});

attachFeedListeners();
}

function attachFeedListeners() {
document.querySelectorAll(".listen-action").forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const post = allPosts[btn.dataset.index];
currentPost = post;
listenModal.classList.remove("hidden");
};
});

document.querySelectorAll(".share-action").forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const post = allPosts[btn.dataset.index];
currentPost = post;
shareModal.classList.remove("hidden");
};
});

document.querySelectorAll(".view-action").forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const post = allPosts[btn.dataset.index];
showPostcard(post);
};
});

document.querySelectorAll(".guess-btn").forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const post = allPosts[btn.dataset.index];
openGuessModal(post);
};
});

document.querySelectorAll(".vibe-btn").forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const index = btn.dataset.index;
const post = allPosts[index];
toggleVibe(post, btn);
};
});
}

/* ==================== VIBE REACTIONS ==================== */
function toggleVibe(post, button) {
const postId = post.id;
const userId = getUserId();

if (userVibes[postId]) {
delete userVibes[postId];
button.classList.remove('active');
} else {
userVibes[postId] = true;
button.classList.add('active');
}

localStorage.setItem("margoUserVibes", JSON.stringify(userVibes));

if (db && post.firebaseId) {
const vibesRef = db.ref(`posts/${post.firebaseId}/vibes/${userId}`);
if (userVibes[postId]) {
vibesRef.set(true);
} else {
vibesRef.remove();
}
}

if (!post.vibes) post.vibes = {};
if (userVibes[postId]) {
post.vibes[userId] = true;
} else {
delete post.vibes[userId];
}

const count = Object.keys(post.vibes).length;
button.querySelector('.vibe-count').textContent = count;

if (userVibes[postId]) {
showToast("💚 Vibed!");
}
}

function getUserId() {
let userId = localStorage.getItem("margoUserId");
if (!userId) {
userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem("margoUserId", userId);
}
return userId;
}

/* ==================== GUESS MODAL ==================== */
function openGuessModal(post) {
currentPost = post;
guessLyric.textContent = post.text;
guessSongInput.value = "";
guessArtistInput.value = "";
guessResult.classList.add("hidden");
guessModal.classList.remove("hidden");
}

closeGuess.onclick = () => {
guessModal.classList.add("hidden");
};

submitGuess.onclick = () => {
if (!currentPost) return;

const guessedSong = guessSongInput.value.trim().toLowerCase();
const guessedArtist = guessArtistInput.value.trim().toLowerCase();
const actualSong = currentPost.song.toLowerCase();
const actualArtist = currentPost.artist.toLowerCase();

const songMatch = guessedSong.includes(actualSong) || actualSong.includes(guessedSong);
const artistMatch = guessedArtist.includes(actualArtist) || actualArtist.includes(guessedArtist);

guessResult.classList.remove("hidden");

if (songMatch && artistMatch) {
guessResult.className = "guess-result correct";
guessResult.textContent = `🎉 Correct! "${currentPost.song}" by ${currentPost.artist}`;

userGuesses[currentPost.id] = true;
localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));

setTimeout(() => {
guessModal.classList.add("hidden");
renderFeed();
}, 2000);
} else {
guessResult.className = "guess-result incorrect";
guessResult.textContent = "❌ Not quite. Try again!";
}
};

/* ==================== POSTCARD OVERLAY ==================== */
function showPostcard(post) {
currentPost = post;
renderPostcard(post);
postcardOverlay.classList.remove("hidden");
}

closePostcard.onclick = () => {
postcardOverlay.classList.add("hidden");
};

closePostcardBtn.onclick = () => {
postcardOverlay.classList.add("hidden");
};

function renderPostcard(post) {
postcardText.textContent = `"${post.text}"`;

postcardEmotions.innerHTML = "";
post.emotions.forEach(e => {
const tag = document.createElement("span");
tag.className = "emotion-tag";
tag.textContent = e;
postcardEmotions.appendChild(tag);
});

postcardSongInfo.innerHTML = `
<div class="song-title">${post.song}</div>
<div class="song-artist">${post.artist}</div>
`;

if (post.template) {
applyTemplate(post.template);
}
}

/* ==================== TEMPLATE SYSTEM ==================== */
const templates = {
minimal: {
gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
textColor: "#ffffff",
font: "Inter"
},
vinyl: {
gradient: "linear-gradient(135deg, #2c1810 0%, #4a2511 100%)",
textColor: "#f4e4d7",
font: "Playfair Display"
},
neon: {
gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
textColor: "#00ffff",
font: "Inter"
},
polaroid: {
gradient: "linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)",
textColor: "#333333",
font: "Inter"
},
emotion: {
gradient: "dynamic",
textColor: "#ffffff",
font: "Inter"
}
};

const emotionGradients = {
Love: "linear-gradient(135deg, #ff6b9d 0%, #c06c84 100%)",
Heartbreak: "linear-gradient(135deg, #283c86 0%, #45a247 100%)",
Hope: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)",
Nostalgia: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
Healing: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
Rage: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
Joy: "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)",
Loneliness: "linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)",
Freedom: "linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)",
Anxiety: "linear-gradient(135deg, #434343 0%, #000000 100%)"
};

function applyTemplate(templateName) {
currentTemplate = templateName;
const template = templates[templateName];
const card = postcardCard.querySelector(".card-inner");

templateBtns.forEach(btn => {
btn.classList.toggle("active", btn.dataset.template === templateName);
});

postcardCard.dataset.template = templateName;

if (templateName === "emotion" && currentPost && currentPost.emotions.length > 0) {
const primaryEmotion = currentPost.emotions[0];
const gradient = emotionGradients[primaryEmotion] || emotionGradients.Hope;
card.style.background = gradient;
} else if (template.gradient !== "dynamic") {
card.style.background = template.gradient;
}

card.style.color = template.textColor;
postcardText.style.fontFamily = template.font;
}

templateBtns.forEach(btn => {
btn.onclick = () => {
applyTemplate(btn.dataset.template);
};
});

/* ==================== SHARE FUNCTIONALITY ==================== */
shareBtn.onclick = () => {
shareModal.classList.remove("hidden");
};

closeShare.onclick = () => {
shareModal.classList.add("hidden");
};

document.querySelectorAll(".share-modal .platform-btn").forEach(btn => {
btn.onclick = () => handleShare(btn.dataset.platform);
});

function handleShare(platform) {
if (!currentPost) return;

const text = `"${currentPost.text}"\n\n${currentPost.song} — ${currentPost.artist}\n\nMade with MARGO`;
const url = window.location.href;
const encodedText = encodeURIComponent(text);
const encodedUrl = encodeURIComponent(url);

switch(platform) {
case "native":
if (navigator.share) {
navigator.share({ title: "MARGO", text, url }).catch(() => {});
} else {
showToast("Sharing not supported");
}
break;
case "link":
navigator.clipboard.writeText(`${text}\n\n${url}`).then(() => {
showToast("✅ Link copied!");
}).catch(() => {
showToast("❌ Copy failed");
});
break;
case "twitter":
window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, "_blank");
break;
case "instagram":
navigator.clipboard.writeText(text).then(() => {
showToast("📋 Copied! Paste in Instagram");
});
break;
case "tiktok":
navigator.clipboard.writeText(text).then(() => {
showToast("📋 Copied! Paste in TikTok");
});
break;
case "snapchat":
navigator.clipboard.writeText(text).then(() => {
showToast("📋 Copied! Share on Snap");
});
break;
case "whatsapp":
window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank");
break;
case "facebook":
window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, "_blank");
break;
case "telegram":
window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
break;
case "reddit":
window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`, "_blank");
break;
}

shareModal.classList.add("hidden");
}

/* ==================== LISTEN FUNCTIONALITY ==================== */
listenBtn.onclick = () => {
if (!currentPost) return;
listenModal.classList.remove("hidden");
};

closeListen.onclick = () => {
listenModal.classList.add("hidden");
};

document.querySelectorAll(".listen-modal .platform-btn").forEach(btn => {
btn.onclick = () => handleListen(btn.dataset.platform);
});

function handleListen(platform) {
if (!currentPost) return;

const query = `${currentPost.song} ${currentPost.artist}`;
const encodedQuery = encodeURIComponent(query);

const urls = {
spotify: `https://open.spotify.com/search/${encodedQuery}`,
apple: `https://music.apple.com/us/search?term=${encodedQuery}`,
youtube: `https://www.youtube.com/results?search_query=${encodedQuery}`,
youtubemusic: `https://music.youtube.com/search?q=${encodedQuery}`,
soundcloud: `https://soundcloud.com/search?q=${encodedQuery}`,
tidal: `https://tidal.com/search?q=${encodedQuery}`,
deezer: `https://www.deezer.com/search/${encodedQuery}`,
amazon: `https://music.amazon.com/search/${encodedQuery}`
};

const url = urls[platform];
if (url) {
window.open(url, "_blank");
listenModal.classList.add("hidden");
}
}

/* ==================== DOWNLOAD FUNCTIONALITY ==================== */
downloadBtn.onclick = async () => {
const originalIcon = downloadBtn.querySelector('.icon').textContent;
const originalText = downloadBtn.querySelector('span:last-child').textContent;

try {
downloadBtn.disabled = true;
downloadBtn.querySelector('.icon').textContent = '⏳';
downloadBtn.querySelector('span:last-child').textContent = "Saving...";

const canvas = await html2canvas(postcardCard, {
backgroundColor: null,
scale: 2,
logging: false,
useCORS: true
});

const link = document.createElement("a");
link.download = `margo-${currentPost.id}.png`;
link.href = canvas.toDataURL("image/png");
link.click();

showToast("✅ Card saved!");
} catch (err) {
console.error(err);
showToast("❌ Download failed");
} finally {
downloadBtn.disabled = false;
downloadBtn.querySelector('.icon').textContent = originalIcon;
downloadBtn.querySelector('span:last-child').textContent = originalText;
}
};

/* ==================== TOAST ==================== */
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

/* ==================== INIT ==================== */
initFeed();
