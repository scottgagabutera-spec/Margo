/* ======================================================
   MARGO — Social Expression Platform (Stage 1)
   ====================================================== */

/* ---------------------------
   Firebase (Stage 1 safe)
---------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM",
  authDomain: "margo-f6da4.firebaseapp.com",
  databaseURL: "https://margo-f6da4-default-rtdb.firebaseio.com",
  projectId: "margo-f6da4",
  storageBucket: "margo-f6da4.firebasestorage.app",
  messagingSenderId: "150183564620",
  appId: "1:150183564620:web:a42de7fef39740b551ebe9"
};

let db = null;
try {
  if (window.firebase) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  }
} catch {
  console.warn("Firebase unavailable (local mode)");
}

/* ---------------------------
   Seed Posts
---------------------------- */
const SEED_POSTS = [
  {
    id: Date.now() - 100000,
    text: "I'm still learning to love the parts of me nobody claps for",
    song: "Self Love",
    artist: "Metro Boomin",
    emotions: ["Healing", "Hope"],
    timestamp: Date.now() - 100000,
    vibes: {}
  },
  {
    id: Date.now() - 300000,
    text: "Some nights I don't know if I'm healing or just getting used to the pain",
    song: "Liability",
    artist: "Lorde",
    emotions: ["Loneliness", "Heartbreak"],
    timestamp: Date.now() - 300000,
    vibes: {}
  }
];

/* ---------------------------
   DOM
---------------------------- */
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");

const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");

const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

const textInput = document.getElementById("textInput");
const count = document.getElementById("count");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const postBtn = document.getElementById("postBtn");

/* Postcard */
const postcard = document.getElementById("postcard");
const postcardText = document.getElementById("postcardText");
const postcardSongInfo = document.getElementById("postcardSongInfo");
const postcardEmotions = document.getElementById("postcardEmotions");
const closePostcardBtn = document.getElementById("closePostcardBtn");

/* ---------------------------
   State
---------------------------- */
let allPosts = [];
let selectedEmotions = [];

/* ---------------------------
   Navigation
---------------------------- */
function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
  updatePostCount();
}

/* ---------------------------
   Composer
---------------------------- */
function openComposerModal() {
  composer.classList.remove("hidden");
  textInput.focus();
}

function closeComposerModal() {
  composer.classList.add("hidden");
  resetComposer();
}

/* Landing CTA = OPEN COMPOSER */
enterBtn.onclick = () => {
  showFeed();
  openComposerModal();
};

/* Feed header CTA */
openComposer.onclick = openComposerModal;
closeComposer.onclick = closeComposerModal;
backBtn.onclick = showLanding;

textInput.oninput = () => {
  count.textContent = textInput.value.length;
};

/* ---------------------------
   Post Submission
---------------------------- */
postBtn.onclick = () => {
  const text = textInput.value.trim();
  if (!text) return toast("Drop a line first");
  if (!songInput.value || !artistInput.value)
    return toast("Add song & artist");

  const post = {
    id: Date.now(),
    text,
    song: songInput.value.trim(),
    artist: artistInput.value.trim(),
    emotions: selectedEmotions.length ? selectedEmotions : ["Unspoken"],
    timestamp: Date.now(),
    vibes: {}
  };

  allPosts.unshift(post);
  saveAllPosts();
  renderFeed();
  closeComposerModal();

  if (db) db.ref("posts").push(post).catch(() => {});
};

/* ---------------------------
   Feed
---------------------------- */
function renderFeed() {
  feedList.innerHTML = "";

  if (!allPosts.length) {
    feedList.innerHTML = `<p style="opacity:.5;text-align:center;">No lines yet.</p>`;
    return;
  }

  allPosts.forEach((post, i) => {
    const card = document.createElement("div");
    card.className = "feed-card";

    card.innerHTML = `
      <p class="feed-text">“${post.text}”</p>
      <div class="feed-emotions">
        ${post.emotions.map(e => `<span class="feed-emotion">${e}</span>`).join("")}
      </div>
      <div class="feed-song">
        <strong>${post.song}</strong> — ${post.artist}
      </div>
      <div class="feed-card-actions">
        <button class="view-btn" data-i="${i}">View</button>
        <button class="vibe-btn">♥ ${Object.keys(post.vibes).length}</button>
      </div>
    `;

    card.querySelector(".view-btn").onclick = () => showPostcard(post);
    card.querySelector(".vibe-btn").onclick = () => toggleVibe(post);

    feedList.appendChild(card);
  });

  updatePostCount();
}

/* ---------------------------
   Postcard
---------------------------- */
function showPostcard(post) {
  postcardText.textContent = post.text;
  postcardSongInfo.innerHTML = `<strong>${post.song}</strong><br>${post.artist}`;
  postcardEmotions.innerHTML = post.emotions.map(e => `<span>${e}</span>`).join("");
  postcard.classList.remove("hidden");
}

closePostcardBtn.onclick = () => postcard.classList.add("hidden");

/* ---------------------------
   Vibes
---------------------------- */
function toggleVibe(post) {
  const userId = getUserId();
  post.vibes[userId] = !post.vibes[userId];
  saveAllPosts();
  renderFeed();
}

function getUserId() {
  let id = localStorage.getItem("margoUserId");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2);
    localStorage.setItem("margoUserId", id);
  }
  return id;
}

/* ---------------------------
   Storage
---------------------------- */
function saveAllPosts() {
  localStorage.setItem("margoPosts", JSON.stringify(allPosts));
}

function loadPosts() {
  const local = JSON.parse(localStorage.getItem("margoPosts") || "[]");
  allPosts = local.length ? local : SEED_POSTS;
  renderFeed();
}

/* ---------------------------
   Utils
---------------------------- */
function updatePostCount() {
  postCount.textContent = allPosts.length;
}

function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  count.textContent = "0";
  selectedEmotions = [];
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => t.remove(), 2500);
}

/* ---------------------------
   Init
---------------------------- */
showLanding();
loadPosts();
