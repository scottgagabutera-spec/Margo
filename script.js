/* -----------------------------
   State
----------------------------- */
let posts = [];

/* -----------------------------
   DOM
----------------------------- */
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");

const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const count = document.getElementById("count");

const feedList = document.getElementById("feedList");

/* -----------------------------
   Navigation
----------------------------- */
enterBtn.onclick = () => {
  landing.classList.remove("active");
  feed.classList.add("active");
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
  textInput.focus();
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
  resetComposer();
};

/* -----------------------------
   Composer
----------------------------- */
textInput.oninput = () => {
  count.textContent = textInput.value.length;
};

postBtn.onclick = () => {
  const text = textInput.value.trim();
  const song = songInput.value.trim();
  const artist = artistInput.value.trim();

  if (!text || !song || !artist) {
    alert("Please complete all fields");
    return;
  }

  const post = {
    id: Date.now(),
    text,
    song,
    artist
  };

  posts.unshift(post);
  renderFeed();
  composer.classList.add("hidden");
  resetComposer();
};

/* -----------------------------
   Feed
----------------------------- */
function renderFeed() {
  feedList.innerHTML = "";

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "feed-card";

    card.innerHTML = `
      <div class="feed-text">“${post.text}”</div>
      <div class="feed-song">${post.song} — ${post.artist}</div>
      <div class="feed-actions">
        <span>♥ vibe</span>
        <span>↗ share</span>
      </div>
    `;

    feedList.appendChild(card);
  });
}

/* -----------------------------
   Utils
----------------------------- */
function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  count.textContent = "0";
}
