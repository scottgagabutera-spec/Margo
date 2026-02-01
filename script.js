/* ======================================================
   MARGO — Expressive Social Music Platform (Stage 1)
   Cleaned & Structured Script
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
    console.log("Firebase connected");
  }
} catch (e) {
  console.warn("Firebase unavailable (local mode)");
}

/* ---------------------------
   Seed Data
---------------------------- */
const SEED_POSTS = [
  {
    id: Date.now() - 100000,
    text: "I'm still learning to love the parts of me nobody claps for",
    song: "Self Love",
    artist: "Metro Boomin",
    emotions: ["Healing", "Hope"],
    timestamp: Date.now() - 100000,
    vibes: {},
    mode: "normal",
    links: {}
  },
  {
    id: Date.now() - 300000,
    text: "Some nights I don't know if I'm healing or just getting used to the pain",
    song: "Liability",
    artist: "Lorde",
    emotions: ["Loneliness", "Heartbreak"],
    timestamp: Date.now() - 300000,
    vibes: {},
    mode: "normal",
    links: {}
  }
];

/* ---------------------------
   DOM References
---------------------------- */
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

/* Composer */
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const count = document.getElementById("count");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

/* Modals */
const postcardModal = document.getElementById("postcard");
const postcardText = document.getElementById("postcardText");
const postcardSongInfo = document.getElementById("postcardSongInfo");
const postcardEmotions = document.getElementById("postcardEmotions");
const closePostcardBtn = document.getElementById("closePostcardBtn");

/* ---------------------------
   State
---------------------------- */
let allPosts = [];
let currentPost = null;
let selectedEmotions = [];
let userVibes = JSON.parse(localStorage.getItem("margoUserVibes") || "{}");

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

enterBtn.onclick = showFeed;
backBtn.onclick = showLanding;

/* ---------------------------
   Composer Logic
---------------------------- */
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

postBtn.onclick = () => {
  const text = textInput.value.trim();
  if (!text) return toast("Drop a lyric first");
  if (!songInput.value || !artistInput.value)
    return toast("Add song & artist");

  const post = {
    id: Date.now(),
    text,
    song: songInput.value.trim(),
    artist: artistInput.value.trim(),
    emotions: selectedEmotions.length ? selectedEmotions : ["Unspoken"],
    timestamp: Date.now(),
    vibes: {},
    mode: "normal",
    links: {}
  };

  savePost(post);
  composer.classList.add("hidden");
  resetComposer();
  showFeed();
};

/* ---------------------------
   Feed Rendering
---------------------------- */
function renderFeed() {
  feedList.innerHTML = "";

  if (!allPosts.length) {
    feedList.innerHTML = `<p style="opacity:.5;text-align:center;">No posts yet.</p>`;
    return;
  }

  allPosts.forEach((post, index) => {
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
        <button data-index="${index}" class="view-btn">View</button>
        <button data-index="${index}" class="vibe-btn">
          ♥ ${Object.keys(post.vibes || {}).length}
        </button>
      </div>
    `;

    feedList.appendChild(card);
  });

  bindFeedActions();
}

function bindFeedActions() {
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.onclick = () => showPostcard(allPosts[btn.dataset.index]);
  });

  document.querySelectorAll(".vibe-btn").forEach(btn => {
    btn.onclick = () => toggleVibe(allPosts[btn.dataset.index], btn);
  });
}

/* ---------------------------
   Postcard
---------------------------- */
function showPostcard(post) {
  currentPost = post;
  postcardText.textContent = post.text;
  postcardSongInfo.innerHTML = `<strong>${post.song}</strong><br>${post.artist}`;
  postcardEmotions.innerHTML = post.emotions.map(e => `<span>${e}</span>`).join("");
  postcardModal.classList.remove("hidden");
}

closePostcardBtn.onclick = () => postcardModal.classList.add("hidden");

/* ---------------------------
   Vibes
---------------------------- */
function toggleVibe(post, btn) {
  const userId = getUserId();
  post.vibes = post.vibes || {};

  if (post.vibes[userId]) {
    delete post.vibes[userId];
  } else {
    post.vibes[userId] = true;
    toast("Vibed");
  }

  localStorage.setItem("margoUserVibes", JSON.stringify(userVibes));
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
function savePost(post) {
  allPosts.unshift(post);
  saveAllPosts();

  if (db) {
    db.ref("posts").push(post).catch(() => {});
  }
}

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
