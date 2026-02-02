// MARGO - Improved & Fixed

// ===== ELEMENTS =====
const elements = {
  landing: document.getElementById("landing"),
  feed: document.getElementById("feed"),
  composer: document.getElementById("composer"),
  guessModal: document.getElementById("guessModal"),
  discoverModal: document.getElementById("discoverModal"),
  shareModal: document.getElementById("shareModal"),
  postcardModal: document.getElementById("postcardModal"),
  listenModal: document.getElementById("listenModal"),

  enterBtn: document.getElementById("enterBtn"),
  backBtn: document.getElementById("backBtn"),
  openComposer: document.getElementById("openComposer"),
  closeComposer: document.getElementById("closeComposer"),
  postBtn: document.getElementById("postBtn"),

  textInput: document.getElementById("textInput"),
  charCount: document.getElementById("charCount"),
  feedList: document.getElementById("feedList"),
  postCount: document.getElementById("postCount"),

  modeBtns: document.querySelectorAll(".mode-btn"),
  shareInputs: document.getElementById("shareInputs"),
  guessInputs: document.getElementById("guessInputs"),
  discoverInputs: document.getElementById("discoverInputs"),

  songInput: document.getElementById("songInput"),
  artistInput: document.getElementById("artistInput"),

  guessSongCheck: document.getElementById("guessSongCheck"),
  guessArtistCheck: document.getElementById("guessArtistCheck"),
  guessSongAnswer: document.getElementById("guessSongAnswer"),
  guessArtistAnswer: document.getElementById("guessArtistAnswer"),

  discoverSongInput: document.getElementById("discoverSongInput"),
  discoverArtistInput: document.getElementById("discoverArtistInput"),

  spotifyLink: document.getElementById("spotifyLink"),
  appleLink: document.getElementById("appleLink"),
  youtubeLink: document.getElementById("youtubeLink"),
  soundcloudLink: document.getElementById("soundcloudLink"),

  // ... (rest of modal elements same as before)
};

// Destructure for cleaner code
const {
  landing, feed, composer, guessModal, discoverModal, postcardModal, listenModal,
  enterBtn, backBtn, openComposer, closeComposer, postBtn,
  textInput, charCount, feedList, postCount,
  modeBtns, shareInputs, guessInputs, discoverInputs,
  songInput, artistInput, guessSongCheck, guessArtistCheck,
  guessSongAnswer, guessArtistAnswer, discoverSongInput, discoverArtistInput,
  spotifyLink, appleLink, youtubeLink, soundcloudLink,
} = elements;

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let currentPost = null;
let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let userGuesses = JSON.parse(localStorage.getItem("margoGuesses") || "{}");

// ===== EVENT DELEGATION FOR FEED ACTIONS =====
feedList.addEventListener("click", e => {
  const btn = e.target.closest(".feed-action");
  if (!btn) return;
  const card = btn.closest(".feed-card");
  if (!card) return;

  const index = Array.from(feedList.children).indexOf(card);
  const action = btn.dataset.action;

  if (action === "view")      viewPost(index);
  if (action === "guess")     openGuess(index);
  if (action === "discover")  openDiscover(index);
  if (action === "listen")    openListen(index);
  if (action === "share")     sharePost(index);
});

// ===== NAVIGATION =====
enterBtn.addEventListener("click", () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
  textInput.focus();
});

backBtn.addEventListener("click", () => {
  feed.classList.remove("active");
  landing.classList.add("active");
});

openComposer.addEventListener("click", () => {
  composer.classList.remove("hidden");
  textInput.focus();
});

closeComposer.addEventListener("click", () => {
  composer.classList.add("hidden");
  resetComposer();
  if (!feed.classList.contains("active")) {
    landing.classList.add("active");
  }
});

// Close other modals (add similar listeners for closeGuess, closeDiscover, etc.)

// ===== CHARACTER COUNTER =====
textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length;
});

// ===== MODE & EMOTION SELECTION =====
// (same as before, but you can add aria-checked later if desired)

// ===== POSTING - FIXED VERSION =====
postBtn.addEventListener("click", async () => {
  if (postBtn.disabled) return;

  const text = textInput.value.trim();
  if (!text) return showToast("Please enter a lyric");
  if (!selectedEmotion) return showToast("Please select an emotion");

  const post = {
    id: Date.now(),
    text,
    emotion: selectedEmotion,
    mode: currentMode,
    knowledge: {},
    guessConfig: null,
    timestamp: Date.now(),
    links: {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null,
    },
  };

  // Mode-specific logic (keep your existing if-blocks here)

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    // Fake delay
    await new Promise(r => setTimeout(r, 600));

    posts.unshift(post);

    // Safety limit
    if (posts.length > 300) posts = posts.slice(0, 300);

    localStorage.setItem("margoPosts", JSON.stringify(posts));

    landing.classList.remove("active");
    feed.classList.add("active");
    renderFeed();
    resetComposer();
    composer.classList.add("hidden");

    showToast("Posted!");
  } catch (err) {
    console.error("Post failed:", err);
    showToast("Error posting – try again");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
});

// ===== RENDER FEED - DELEGATED EVENTS, SAFER =====
function renderFeed() {
  feedList.innerHTML = "";
  postCount.textContent = posts.length;

  if (posts.length === 0) {
    feedList.innerHTML = '<div class="empty-feed">No posts yet. Be the first!</div>';
    return;
  }

  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.dataset.postId = post.id;

    const time = timeAgo(post.timestamp);
    const hasLinks = Object.values(post.links || {}).some(Boolean);

    let songSection = "";
    let actionsHTML = "";

    // ... (your existing logic for share/guess/discover sections)

    card.innerHTML = `
      <div class="feed-text">${post.text}</div>
      <div class="feed-emotion">${post.emotion}</div>
      ${songSection}
      <div class="feed-time">${time}</div>
      <div class="feed-actions">
        ${actionsHTML}
      </div>
    `;

    // Add data-action to buttons inside the template
    // Example for share mode:
    // <button class="feed-action" data-action="view">View</button>
    // <button class="feed-action" data-action="listen" ${hasLinks ? '' : 'disabled'}>Listen</button>
    // etc.

    feedList.appendChild(card);
  });
}

// ===== OTHER FUNCTIONS =====
// Keep your timeAgo, openGuess, submitGuess, etc.
// Update viewPost to prevent spoilers:

function viewPost(index) {
  currentPost = posts[index];
  if (!currentPost) return;

  postcardLyric.textContent = currentPost.text;
  postcardEmotion.textContent = currentPost.emotion;

  let songDisplay = "Unknown Song";
  let artistDisplay = "Unknown Artist";

  const isRevealed = currentPost.mode !== "guess" || userGuesses[currentPost.id];

  if (isRevealed) {
    songDisplay = currentPost.knowledge.song || "Unknown Song";
    artistDisplay = currentPost.knowledge.artist || "Unknown Artist";
  } else if (currentPost.mode === "guess") {
    const parts = [];
    if (currentPost.guessConfig?.guessSong) parts.push("song");
    if (currentPost.guessConfig?.guessArtist) parts.push("artist");
    songDisplay = `Guess the ${parts.join(" & ")}`;
  }

  postcardSong.innerHTML = `
    <div>${songDisplay}</div>
    <div>${artistDisplay}</div>
  `;

  listenPostcard.style.display = Object.values(currentPost.links || {}).some(Boolean) ? "block" : "none";

  postcardModal.classList.remove("hidden");
}

// ===== INIT =====
function init() {
  renderFeed();

  // Deep link support (your existing code)
  const params = new URLSearchParams(location.search);
  const postId = params.get("post");
  if (postId) {
    const idx = posts.findIndex(p => p.id == postId);
    if (idx !== -1) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
      setTimeout(() => viewPost(idx), 300);
    }
  }
}

init();

// Reset composer, showToast, etc. remain similar
