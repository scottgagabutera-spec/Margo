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
console.log("✅ Firebase connected");
} else {
console.warn("⚠️ Firebase SDK not loaded");
}
} catch (error) {
console.warn("⚠️ Firebase init failed:", error);
}

/* ==================== UNIFIED MODAL CONTROLLER ==================== */
class ModalController {
constructor() {
this.modals = new Map();
this.activeModal = null;
this.setupGlobalListeners();
}

register(modalId, closeButtonIds = []) {
const modal = document.getElementById(modalId);
if (!modal) return;

const closeButtons = closeButtonIds.map(id => document.getElementById(id)).filter(Boolean);

this.modals.set(modalId, {
element: modal,
closeButtons: closeButtons
});

// Setup close button listeners
closeButtons.forEach(btn => {
btn.addEventListener('click', (e) => {
e.stopPropagation();
this.close(modalId);
});
});

// Close on backdrop click
modal.addEventListener('click', (e) => {
if (e.target === modal) {
this.close(modalId);
}
});
}

open(modalId) {
const modal = this.modals.get(modalId);
if (!modal) return;

// Close any active modal first
if (this.activeModal) {
this.close(this.activeModal);
}

modal.element.classList.remove('hidden');
// Force reflow
void modal.element.offsetWidth;
modal.element.classList.add('active');

this.activeModal = modalId;
}

close(modalId) {
const modal = this.modals.get(modalId);
if (!modal) return;

modal.element.classList.remove('active');
setTimeout(() => {
modal.element.classList.add('hidden');
}, 300); // Match CSS transition

if (this.activeModal === modalId) {
this.activeModal = null;
}
}

closeAll() {
this.modals.forEach((modal, id) => {
this.close(id);
});
}

setupGlobalListeners() {
// Close on Escape key
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && this.activeModal) {
this.close(this.activeModal);
}
});
}
}

// Initialize global modal controller
const modalController = new ModalController();

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
template: "vinyl"
},
{
id: Date.now() - 300000,
text: "Some nights I don't know if I'm healing or just getting used to the pain",
song: "Liability",
artist: "Lorde",
emotions: ["Loneliness", "Heartbreak"],
timestamp: Date.now() - 300000,
vibes: { user_3: true },
template: "vinyl"
},
{
id: Date.now() - 600000,
text: "They tried to bury me but they didn't know I was a seed",
song: "HUMBLE.",
artist: "Kendrick Lamar",
emotions: ["Freedom", "Hope"],
timestamp: Date.now() - 600000,
vibes: { user_4: true, user_5: true, user_6: true },
template: "vinyl"
},
{
id: Date.now() - 900000,
text: "What if I told you the version of me you fell for was just a draft?",
song: "Good Days",
artist: "SZA",
emotions: ["Nostalgia", "Healing"],
timestamp: Date.now() - 900000,
vibes: { user_7: true },
template: "gradient"
},
{
id: Date.now() - 1800000,
text: "I'm not heartless, I just learned how to use my heart less",
song: "Heartless",
artist: "The Weeknd",
emotions: ["Heartbreak", "Rage"],
timestamp: Date.now() - 1800000,
vibes: { user_8: true, user_9: true },
template: "neon"
}
];

/* ==================== ELEMENTS ==================== */
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const composer = document.getElementById("composer");
const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const count = document.getElementById("count");
const hideSongCheck = document.getElementById("hideSongCheck");

// Platform link inputs
const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

const postcardText = document.getElementById("postcardText");
const postcardEmotions = document.getElementById("postcardEmotions");
const postcardSongInfo = document.getElementById("postcardSongInfo");
const postcardCard = document.getElementById("postcardCard");
const postcardOverlay = document.getElementById("postcard");
const moreOptionsToggle = document.getElementById("moreOptionsToggle");
const expandedOptions = document.getElementById("expandedOptions");
const downloadBtn = document.getElementById("downloadBtn");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

// Action buttons
const shareBtn = document.getElementById("shareBtn");
const listenBtn = document.getElementById("listenBtn");
const createStoryBtn = document.getElementById("createStoryBtn");

// Modals
const shareModal = document.getElementById("shareModal");
const listenModal = document.getElementById("listenModal");
const guessModal = document.getElementById("guessModal");
const storyBuilder = document.getElementById("storyBuilder");
const storyPreview = document.getElementById("storyPreview");
const closeShare = document.getElementById("closeShare");
const closeListen = document.getElementById("closeListen");
const closeGuess = document.getElementById("closeGuess");
const closeStoryBuilder = document.getElementById("closeStoryBuilder");
const closeStoryPreview = document.getElementById("closeStoryPreview");
const closeStoryPreviewBtn = document.getElementById("closeStoryPreviewBtn");

// Guess elements
const guessLyric = document.getElementById("guessLyric");
const guessSongInput = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const submitGuess = document.getElementById("submitGuess");
const guessResult = document.getElementById("guessResult");

// Story elements
const storyCards = document.getElementById("storyCards");
const addStoryCard = document.getElementById("addStoryCard");
const previewStory = document.getElementById("previewStory");
const storyCanvas = document.getElementById("storyCanvas");
const editStoryBtn = document.getElementById("editStoryBtn");
const shareStoryBtn = document.getElementById("shareStoryBtn");

// Template buttons
const templateBtns = document.querySelectorAll(".template-card");

/* ==================== STATE ==================== */
let selectedEmotions = [];
let currentPost = null;
let currentTemplate = "vinyl";
let allPosts = [];
let userVibes = {};
let userGuesses = {};
let storyData = [];
let currentStoryLayout = "stack";

// Rate limiting
const POST_COOLDOWN = 30000;
function getLastPostTime() {
return parseInt(localStorage.getItem("margoLastPostTime") || "0");
}
function setLastPostTime(time) {
localStorage.setItem("margoLastPostTime", time.toString());
}

/* ==================== SWIPE NAVIGATION ==================== */
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

function handleGesture() {
const deltaX = touchEndX - touchStartX;
const deltaY = touchEndY - touchStartY;
const threshold = 50;

// Horizontal swipe (must be more horizontal than vertical)
if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
if (deltaX > 0 && landing.classList.contains('active')) {
// Swipe right on landing -> go to feed
showFeed();
} else if (deltaX < 0 && feed.classList.contains('active')) {
// Swipe left on feed -> go to landing
showLanding();
}
}
}

// Add touch listeners to screens
[landing, feed].forEach(screen => {
screen.addEventListener('touchstart', e => {
touchStartX = e.changedTouches[0].screenX;
touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

screen.addEventListener('touchend', e => {
touchEndX = e.changedTouches[0].screenX;
touchEndY = e.changedTouches[0].screenY;
handleGesture();
}, { passive: true });
});

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
Anxiety: "🌪"
};

function getAvatar(emotions) {
if (!emotions || emotions.length === 0) return "🎵";
return emotionAvatars[emotions[0]] || "🎵";
}

/* ==================== NAVIGATION ==================== */
function showLanding() {
landing.classList.add("active");
feed.classList.remove("active");
}

function showFeed() {
landing.classList.remove("active");
feed.classList.add("active");
updatePostCount();
}

function updatePostCount() {
postCount.textContent = allPosts.length;
}

// IMPROVED FLOW: "Drop Your Line" button opens composer first
enterBtn.onclick = () => {
modalController.open('composer');
textInput.focus();
};

backBtn.onclick = showLanding;

/* ==================== REGISTER ALL MODALS ==================== */
// Register modals with their close buttons
modalController.register('composer', ['closeComposer']);
modalController.register('storyBuilder', ['closeStoryBuilder']);
modalController.register('postcard', ['closePostcardBtn']);
modalController.register('guessModal', ['closeGuess']);
modalController.register('shareModal', ['closeShare']);
modalController.register('listenModal', ['closeListen']);
modalController.register('storyPreview', ['closeStoryPreview', 'closeStoryPreviewBtn']);

/* ==================== COMPOSER ==================== */
openComposer.onclick = () => {
modalController.open('composer');
textInput.focus();
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
} else {
songInput.style.opacity = "1";
artistInput.style.opacity = "1";
songInput.disabled = false;
artistInput.disabled = false;
songInput.value = "";
artistInput.value = "";
}
};

function resetComposer() {
textInput.value = "";
songInput.value = "";
artistInput.value = "";
spotifyLink.value = "";
appleLink.value = "";
youtubeLink.value = "";
soundcloudLink.value = "";
count.textContent = "0";
selectedEmotions = [];
hideSongCheck.checked = false;
songInput.style.opacity = "1";
artistInput.style.opacity = "1";
songInput.disabled = false;
artistInput.disabled = false;
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
showToast(`⏳ Hold up — wait ${remaining}s before dropping another`);
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
showToast("🎵 Tag the track");
return;
}
}

if (selectedEmotions.length === 0) {
showToast("💭 What's the energy?");
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
vibes: {},
links: {
spotify: spotifyLink.value.trim() || null,
apple: appleLink.value.trim() || null,
youtube: youtubeLink.value.trim() || null,
soundcloud: soundcloudLink.value.trim() || null
}
};

postBtn.disabled = true;
const originalText = postBtn.textContent;
postBtn.textContent = "Dropping...";

try {
saveToLocalStorage(post);
showToast("✅ Posted to the feed!");

if (db) {
db.ref('posts').push(post).then(() => {
console.log("✅ Firebase synced");
}).catch((err) => {
console.warn("⚠️ Firebase sync failed:", err);
});
}

setLastPostTime(Date.now());
resetComposer();
modalController.close('composer');

// IMPROVED: Now go to feed after posting
showFeed();
setTimeout(() => feedList.scrollTop = 0, 100);
} catch (error) {
console.error("❌ Post error:", error);
showToast("❌ Post failed");
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

const localPosts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
const allPostsMap = new Map();
firebasePosts.forEach(post => allPostsMap.set(post.id, post));
localPosts.forEach(post => allPostsMap.set(post.id, post));

allPosts = Array.from(allPostsMap.values()).sort((a, b) => b.timestamp - a.timestamp);

if (allPosts.length === 0) {
allPosts = [...SEED_POSTS];
}

renderFeed();
updatePostCount();
});
} else {
const localPosts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
allPosts = localPosts.length > 0 ? localPosts : [...SEED_POSTS];
renderFeed();
updatePostCount();
}

userVibes = JSON.parse(localStorage.getItem("margoUserVibes") || "{}");
userGuesses = JSON.parse(localStorage.getItem("margoUserGuesses") || "{}");
}

/* ==================== RENDER FEED ==================== */
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

if (post.emotions && post.emotions.length > 0) {
card.setAttribute('data-emotion', post.emotions[0]);
}

const avatar = getAvatar(post.emotions);
const timeText = timeAgo(post.timestamp);
const emotionTags = post.emotions.map(e =>
`<span class="feed-emotion" data-emotion="${e}">${e}</span>`
).join("");

// Add class for long text (for font size adjustment)
const textClass = post.text.length > 80 ? 'feed-text long-text' : 'feed-text';

let songSection = '';
if (post.hideSong) {
// Check if this user has guessed correctly
const userGuessed = userGuesses[post.id];
const guessAttempts = parseInt(localStorage.getItem(`guessAttempts_${post.id}`) || '0');

if (userGuessed) {
// User guessed correctly - show the answer
songSection = `
<div class="feed-song">
<div class="feed-song-title">${post.song}</div>
<div class="feed-song-artist">${post.artist}</div>
<div class="mystery-status">✓ You guessed it!</div>
</div>
`;
} else {
// Still a mystery - show guess button or reveal option
songSection = `
<div class="feed-song mystery">
<div class="mystery-text">🎯 Can you name this track?</div>
<button class="guess-btn" data-index="${index}">Take a Guess</button>
${guessAttempts >= 3 ? `<button class="guess-btn reveal-btn" data-index="${index}" data-action="reveal">Reveal Answer</button>` : ''}
</div>
`;
}
} else {
songSection = `
<div class="feed-song">
<div class="feed-song-title">${post.song}</div>
<div class="feed-song-artist">${post.artist}</div>
</div>
`;
}

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
<p class="${textClass}">${post.text}</p>
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
renderListenModal(post);
modalController.open('listenModal');
};
});

document.querySelectorAll(".share-action").forEach(btn => {
btn.onclick = (e) => {
e.stopPropagation();
const post = allPosts[btn.dataset.index];
currentPost = post;
modalController.open('shareModal');
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
const action = btn.dataset.action;

if (action === 'reveal') {
// Reveal the answer
userGuesses[post.id] = true;
localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));
showToast("🎵 Answer revealed!");
renderFeed();
} else {
// Open guess modal
openGuessModal(post);
}
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
modalController.open('guessModal');
}

submitGuess.onclick = () => {
if (!currentPost) return;

const guessedSong = guessSongInput.value.trim().toLowerCase();
const guessedArtist = guessArtistInput.value.trim().toLowerCase();
const actualSong = currentPost.song.toLowerCase();
const actualArtist = currentPost.artist.toLowerCase();

// Flexible matching - either song OR artist can be correct
// Or both fields match
const songMatch = guessedSong && (guessedSong.includes(actualSong) || actualSong.includes(guessedSong));
const artistMatch = guessedArtist && (guessedArtist.includes(actualArtist) || actualArtist.includes(guessedArtist));

// Track attempts
const attemptKey = `guessAttempts_${currentPost.id}`;
const attempts = parseInt(localStorage.getItem(attemptKey) || '0');
localStorage.setItem(attemptKey, (attempts + 1).toString());

guessResult.classList.remove("hidden");

// Accept if either song or artist is correct (or both)
if (songMatch || artistMatch) {
const correctParts = [];
if (songMatch) correctParts.push('song');
if (artistMatch) correctParts.push('artist');

guessResult.className = "guess-result correct";
guessResult.textContent = `🎉 Correct! "${currentPost.song}" by ${currentPost.artist}`;
userGuesses[currentPost.id] = true;
localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));
setTimeout(() => {
modalController.close('guessModal');
renderFeed();
}, 2000);
} else {
guessResult.className = "guess-result incorrect";
const remaining = 3 - (attempts + 1);
if (remaining > 0) {
guessResult.textContent = `❌ Not quite. ${remaining} attempts left before reveal option appears.`;
} else {
guessResult.textContent = "❌ Out of attempts. You can now reveal the answer from the post.";
setTimeout(() => {
modalController.close('guessModal');
renderFeed();
}, 2000);
}
}
};

/* ==================== STORY BUILDER ==================== */
createStoryBtn.onclick = () => {
modalController.close('postcard');
modalController.open('storyBuilder');
initStoryBuilder();
};

function initStoryBuilder() {
storyData = currentPost ? [{ ...currentPost }] : [];
renderStoryBuilder();
}

function renderStoryBuilder() {
storyCards.innerHTML = "";

storyData.forEach((post, index) => {
const card = document.createElement("div");
card.className = "story-card-item";
card.innerHTML = `
<textarea placeholder="Drop your line..." maxlength="140">${post.text || ''}</textarea>
<div class="input-row">
<div class="input-wrapper">
<input type="text" placeholder="Song" value="${post.song || ''}" class="story-song">
</div>
<div class="input-wrapper">
<input type="text" placeholder="Artist" value="${post.artist || ''}" class="story-artist">
</div>
</div>
<div class="story-card-actions">
<button class="remove-story-card" data-index="${index}">Remove</button>
</div>
`;
storyCards.appendChild(card);
});

// Update story data on input
document.querySelectorAll(".story-card-item").forEach((card, index) => {
const textarea = card.querySelector("textarea");
const songInput = card.querySelector(".story-song");
const artistInput = card.querySelector(".story-artist");

textarea.oninput = () => { storyData[index].text = textarea.value; };
songInput.oninput = () => { storyData[index].song = songInput.value; };
artistInput.oninput = () => { storyData[index].artist = artistInput.value; };
});

document.querySelectorAll(".remove-story-card").forEach(btn => {
btn.onclick = () => {
const index = parseInt(btn.dataset.index);
storyData.splice(index, 1);
renderStoryBuilder();
};
});
}

addStoryCard.onclick = () => {
storyData.push({
text: "",
song: "",
artist: "",
emotions: currentPost?.emotions || ["Hope"],
template: currentTemplate
});
renderStoryBuilder();
};

// Layout picker
document.querySelectorAll(".layout-btn").forEach(btn => {
btn.onclick = () => {
document.querySelectorAll(".layout-btn").forEach(b => b.classList.remove("active"));
btn.classList.add("active");
currentStoryLayout = btn.dataset.layout;
};
});

previewStory.onclick = () => {
if (storyData.length === 0) {
showToast("Add at least one lyric to your story");
return;
}
renderStoryPreview();
modalController.close('storyBuilder');
modalController.open('storyPreview');
};

function renderStoryPreview() {
storyCanvas.innerHTML = "";
storyCanvas.dataset.layout = currentStoryLayout;

storyData.forEach(post => {
const miniCard = document.createElement("div");
miniCard.className = "story-mini-card";
miniCard.innerHTML = `
<div class="story-mini-text">"${post.text}"</div>
<div class="story-mini-song">${post.song} — ${post.artist}</div>
`;
storyCanvas.appendChild(miniCard);
});
}

editStoryBtn.onclick = () => {
modalController.close('storyPreview');
modalController.open('storyBuilder');
};

shareStoryBtn.onclick = () => {
modalController.open('shareModal');
};

// Export story with specific formats
document.querySelectorAll(".export-story-btn").forEach(btn => {
btn.onclick = async () => {
const format = btn.dataset.format;
await exportStory(format);
};
});

async function exportStory(format) {
const canvas = storyCanvas;
const originalText = event.target.textContent;

try {
event.target.textContent = "Generating...";
event.target.disabled = true;

const dimensions = getExportDimensions(format);
const htmlCanvas = await html2canvas(canvas, {
backgroundColor: '#1a1410',
scale: 2,
width: canvas.offsetWidth,
height: canvas.offsetHeight,
logging: false,
useCORS: true
});

// Create a new canvas with the target dimensions
const finalCanvas = document.createElement('canvas');
finalCanvas.width = dimensions.width;
finalCanvas.height = dimensions.height;
const ctx = finalCanvas.getContext('2d');

// Fill with background
ctx.fillStyle = '#1a1410';
ctx.fillRect(0, 0, dimensions.width, dimensions.height);

// Calculate scaling and positioning
const scale = Math.min(
dimensions.width / htmlCanvas.width,
dimensions.height / htmlCanvas.height
);
const x = (dimensions.width - htmlCanvas.width * scale) / 2;
const y = (dimensions.height - htmlCanvas.height * scale) / 2;

ctx.drawImage(htmlCanvas, x, y, htmlCanvas.width * scale, htmlCanvas.height * scale);

// Add branding
ctx.font = '24px Syne';
ctx.fillStyle = 'rgba(212, 197, 169, 0.3)';
ctx.textAlign = 'center';
ctx.fillText('MARGO', dimensions.width / 2, dimensions.height - 30);

const link = document.createElement("a");
link.download = `margo-story-${format}-${Date.now()}.png`;
link.href = finalCanvas.toDataURL("image/png");
link.click();

showToast(`✅ Story saved for ${format}!`);
} catch (err) {
console.error(err);
showToast("❌ Export failed");
} finally {
event.target.textContent = originalText;
event.target.disabled = false;
}
}

/* ==================== POSTCARD OVERLAY ==================== */
function showPostcard(post) {
currentPost = post;
renderPostcard(post);
expandedOptions.classList.remove('active');
moreOptionsToggle.textContent = 'More Options ▼';
modalController.open('postcard');
}

// More options toggle
moreOptionsToggle.onclick = () => {
expandedOptions.classList.toggle('active');
if (expandedOptions.classList.contains('active')) {
moreOptionsToggle.textContent = 'Less Options ▲';
} else {
moreOptionsToggle.textContent = 'More Options ▼';
}
};

// Template options
document.querySelectorAll(".template-option").forEach(btn => {
btn.onclick = () => {
document.querySelectorAll(".template-option").forEach(b => b.classList.remove('active'));
btn.classList.add('active');
applyTemplate(btn.dataset.template);
};
});

// Export options
document.querySelectorAll(".export-option").forEach(btn => {
btn.onclick = async () => {
const format = btn.dataset.format;
await exportPostcard(format);
};
});

// Download button
downloadBtn.onclick = async () => {
await exportPostcard('square');
};

function renderPostcard(post) {
postcardText.textContent = `${post.text}`;
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
} else {
applyTemplate('vinyl');
}

// Reset template option active states
document.querySelectorAll(".template-option").forEach(b => {
b.classList.remove('active');
if (b.dataset.template === (post.template || 'vinyl')) {
b.classList.add('active');
}
});
}

/* ==================== UPDATED TEMPLATE SYSTEM ==================== */
const templates = {
vinyl: {
gradient: "linear-gradient(135deg, #2c1810 0%, #4a2511 100%)",
textColor: "#f4e4d7",
font: "Fraunces"
},
gradient: {
gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
textColor: "#ffffff",
font: "Fraunces"
},
neon: {
gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
textColor: "#00ffff",
font: "Fraunces"
},
minimal: {
gradient: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
textColor: "#1a1a1a",
font: "Fraunces"
},
emotion: {
gradient: "dynamic",
textColor: "#ffffff",
font: "Fraunces"
}
};

const emotionGradients = {
Love: "linear-gradient(135deg, #ff6b9d 0%, #c06c84 100%)",
Heartbreak: "linear-gradient(135deg, #4a5568 0%, #2d3748 100%)",
Hope: "linear-gradient(135deg, #ffd89b 0%, #ff8c61 100%)",
Nostalgia: "linear-gradient(135deg, #b590ca 0%, #8b7ba8 100%)",
Healing: "linear-gradient(135deg, #81c784 0%, #66bb6a 100%)",
Rage: "linear-gradient(135deg, #ff4757 0%, #ff6348 100%)",
Joy: "linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)",
Loneliness: "linear-gradient(135deg, #5f6a8f 0%, #48566a 100%)",
Freedom: "linear-gradient(135deg, #7bed9f 0%, #70a1ff 100%)",
Anxiety: "linear-gradient(135deg, #34495e 0%, #2c3e50 100%)"
};

function applyTemplate(templateName) {
currentTemplate = templateName;
const template = templates[templateName];
const card = postcardCard.querySelector(".card-inner");

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

/* ==================== EXPORT WITH PLATFORM-SPECIFIC DIMENSIONS ==================== */
function getExportDimensions(format) {
const dimensions = {
square: { width: 1080, height: 1080 }, // Instagram Post
story: { width: 1080, height: 1920 }, // Instagram/TikTok Story
twitter: { width: 1200, height: 675 }, // Twitter Card
original: { width: 1080, height: 1080 } // Default square
};
return dimensions[format] || dimensions.original;
}

document.querySelectorAll(".export-btn").forEach(btn => {
btn.onclick = async () => {
const format = btn.dataset.format;
await exportPostcard(format);
};
});

async function exportPostcard(format) {
const originalText = event.target.querySelector('span:nth-child(2)').textContent;

try {
event.target.disabled = true;
event.target.querySelector('span:nth-child(2)').textContent = "Generating...";

const dimensions = getExportDimensions(format);
const htmlCanvas = await html2canvas(postcardCard, {
backgroundColor: null,
scale: 2,
logging: false,
useCORS: true
});

// Create final canvas with platform dimensions
const canvas = document.createElement('canvas');
canvas.width = dimensions.width;
canvas.height = dimensions.height;
const ctx = canvas.getContext('2d');

// Calculate scaling to fit
const scale = Math.min(
dimensions.width / htmlCanvas.width,
dimensions.height / htmlCanvas.height
);
const x = (dimensions.width - htmlCanvas.width * scale) / 2;
const y = (dimensions.height - htmlCanvas.height * scale) / 2;

// Draw black background
ctx.fillStyle = '#0d0d0d';
ctx.fillRect(0, 0, dimensions.width, dimensions.height);

// Draw postcard
ctx.drawImage(htmlCanvas, x, y, htmlCanvas.width * scale, htmlCanvas.height * scale);

// Add subtle branding
ctx.font = 'bold 20px Syne';
ctx.fillStyle = 'rgba(212, 197, 169, 0.2)';
ctx.textAlign = 'center';
ctx.fillText('MARGO', dimensions.width / 2, dimensions.height - 40);

const link = document.createElement("a");
link.download = `margo-${format}-${currentPost.id}.png`;
link.href = canvas.toDataURL("image/png");
link.click();

showToast(`✅ Saved for ${format === 'story' ? 'Story' : format}!`);
} catch (err) {
console.error(err);
showToast("❌ Export failed");
} finally {
event.target.disabled = false;
event.target.querySelector('span:nth-child(2)').textContent = originalText;
}
}

/* ==================== SHARE FUNCTIONALITY ==================== */
shareBtn.onclick = () => {
modalController.open('shareModal');
};

document.querySelectorAll(".share-modal .platform-btn").forEach(btn => {
btn.onclick = () => handleShare(btn.dataset.platform);
});

async function handleShare(platform) {
if (!currentPost) return;

const text = `"${currentPost.text}"\n\n🎵 ${currentPost.song} — ${currentPost.artist}\n\nShared via MARGO`;
const url = window.location.href;

// For social media platforms, generate and download image
if (['twitter', 'instagram', 'tiktok', 'snapchat'].includes(platform)) {
modalController.close('shareModal');
showToast("Generating image...");

try {
// Determine format based on platform
let format = 'square';
if (platform === 'twitter') format = 'twitter';
if (platform === 'tiktok') format = 'story';

// Generate the image
await exportPostcardForShare(format, platform);
} catch (err) {
console.error(err);
showToast("❌ Image generation failed");
}
return;
}

// For other platforms, use standard sharing
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
showToast("✅ Copied to clipboard!");
}).catch(() => {
showToast("❌ Copy failed");
});
break;
case "whatsapp":
window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, "_blank");
break;
case "telegram":
window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, "_blank");
break;
}

modalController.close('shareModal');
}

async function exportPostcardForShare(format, platform) {
try {
const dimensions = getExportDimensions(format);
const htmlCanvas = await html2canvas(postcardCard, {
backgroundColor: null,
scale: 2,
logging: false,
useCORS: true
});

// Create final canvas with platform dimensions
const canvas = document.createElement('canvas');
canvas.width = dimensions.width;
canvas.height = dimensions.height;
const ctx = canvas.getContext('2d');

// Calculate scaling to fit
const scale = Math.min(
dimensions.width / htmlCanvas.width,
dimensions.height / htmlCanvas.height
);
const x = (dimensions.width - htmlCanvas.width * scale) / 2;
const y = (dimensions.height - htmlCanvas.height * scale) / 2;

// Draw black background
ctx.fillStyle = '#0d0d0d';
ctx.fillRect(0, 0, dimensions.width, dimensions.height);

// Draw postcard
ctx.drawImage(htmlCanvas, x, y, htmlCanvas.width * scale, htmlCanvas.height * scale);

// Add subtle branding
ctx.font = 'bold 20px Syne';
ctx.fillStyle = 'rgba(212, 197, 169, 0.2)';
ctx.textAlign = 'center';
ctx.fillText('MARGO', dimensions.width / 2, dimensions.height - 40);

// Download the image
const link = document.createElement("a");
link.download = `margo-${platform}-${currentPost.id}.png`;
link.href = canvas.toDataURL("image/png");
link.click();

const platformNames = {
twitter: 'Twitter/X',
instagram: 'Instagram',
tiktok: 'TikTok',
snapchat: 'Snapchat'
};

showToast(`✅ Image saved for ${platformNames[platform]}! Upload it to share.`);
} catch (err) {
console.error(err);
throw err;
}
}

/* ==================== LISTEN FUNCTIONALITY ==================== */
listenBtn.onclick = () => {
if (!currentPost) return;
renderListenModal(currentPost);
modalController.open('listenModal');
};

function renderListenModal(post) {
const platforms = ['spotify', 'apple', 'youtube', 'soundcloud'];

// Update platform buttons based on available links
document.querySelectorAll(".listen-modal .platform-btn").forEach(btn => {
const platform = btn.dataset.platform;
const hasLink = post.links && post.links[platform];

if (hasLink) {
// Platform has a custom link - highlight and enable
btn.classList.add('has-custom-link');
btn.style.borderColor = 'var(--primary)';
btn.style.background = 'rgba(255, 107, 53, 0.15)';
btn.style.cursor = 'pointer';
btn.style.opacity = '1';
btn.disabled = false;
} else {
// No custom link - disable and gray out
btn.classList.remove('has-custom-link');
btn.style.borderColor = 'var(--border)';
btn.style.background = 'var(--glass-bg)';
btn.style.cursor = 'not-allowed';
btn.style.opacity = '0.4';
btn.disabled = true;
}
});
}

document.querySelectorAll(".listen-modal .platform-btn").forEach(btn => {
btn.onclick = () => {
if (!btn.disabled) {
handleListen(btn.dataset.platform);
}
};
});

function handleListen(platform) {
if (!currentPost) return;

// Only use custom links (search fallback removed)
if (currentPost.links && currentPost.links[platform]) {
window.open(currentPost.links[platform], "_blank");
modalController.close('listenModal');
} else {
showToast("No link available for this platform");
}
}

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
showLanding();
initFeed();
