const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const count = document.getElementById("count");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const feedList = document.getElementById("feedList");

const postcard = document.getElementById("postcard");
const postcardText = document.getElementById("postcardText");
const postcardSong = document.getElementById("postcardSong");
const closePostcardBtn = document.getElementById("closePostcardBtn");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");

/* NAV */
enterBtn.onclick = () => {
  landing.classList.remove("active");
  feed.classList.add("active");
  renderFeed();
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
  textInput.focus();
};

closeComposer.onclick = () => composer.classList.add("hidden");

/* COMPOSER */
textInput.oninput = () => count.textContent = textInput.value.length;

postBtn.onclick = () => {
  const text = textInput.value.trim();
  if (!text) return;

  const post = {
    id: Date.now(),
    text,
    song: songInput.value.trim(),
    artist: artistInput.value.trim(),
    vibes: {}
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));

  composer.classList.add("hidden");
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  count.textContent = "0";

  renderFeed();
};

/* FEED */
function renderFeed() {
  feedList.innerHTML = "";
  posts.forEach((post, i) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `
      <p class="feed-text">“${post.text}”</p>
      ${post.song ? `<div class="feed-song">${post.song} — ${post.artist}</div>` : ""}
      <button class="vibe-btn">♥ ${Object.keys(post.vibes).length}</button>
    `;
    card.onclick = () => showPostcard(post);
    feedList.appendChild(card);
  });
}

/* POSTCARD */
function showPostcard(post) {
  postcardText.textContent = post.text;
  postcardSong.textContent = post.song ? `${post.song} — ${post.artist}` : "";
  postcard.classList.remove("hidden");
}

closePostcardBtn.onclick = () => postcard.classList.add("hidden");
