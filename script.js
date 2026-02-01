const screens = {
  landing: document.getElementById("landing"),
  composer: document.getElementById("composer"),
  feed: document.getElementById("feed")
};

const startBtn = document.getElementById("startBtn");
const modeBtns = document.querySelectorAll(".mode-btn");
const form = document.getElementById("form");
const songFields = document.getElementById("songFields");

const lyricInput = document.getElementById("lyricInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const postBtn = document.getElementById("postBtn");
const newPostBtn = document.getElementById("newPostBtn");
const feedList = document.getElementById("feedList");

const postcard = document.getElementById("postcard");
const pcText = document.getElementById("pcText");
const pcSong = document.getElementById("pcSong");
const closePcBtn = document.getElementById("closePcBtn");
const shareBtn = document.getElementById("shareBtn");

let mode = null;
let posts = JSON.parse(localStorage.getItem("margoPosts")) || [];

startBtn.onclick = () => goTo("composer");

modeBtns.forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    form.classList.remove("hidden");

    if (mode === "guess") {
      songFields.classList.add("hidden");
    } else {
      songFields.classList.remove("hidden");
    }
  };
});

postBtn.onclick = () => {
  if (!lyricInput.value) return;

  const post = {
    text: lyricInput.value,
    mode,
    song: songInput.value || null,
    artist: artistInput.value || null
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  resetForm();
  renderFeed();
  goTo("feed");
};

newPostBtn.onclick = () => goTo("composer");

function renderFeed() {
  feedList.innerHTML = "";

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "feed-card";

    let meta = post.mode === "guess"
      ? "Guess the song"
      : (post.song || "Unknown") + " — " + (post.artist || "Anonymous");

    card.innerHTML = `
      <p>"${post.text}"</p>
      <small>${meta}</small>
    `;

    card.onclick = () => openPostcard(post);
    feedList.appendChild(card);
  });
}

function openPostcard(post) {
  pcText.textContent = `"${post.text}"`;

  pcSong.textContent = post.mode === "guess"
    ? "Guess the song"
    : (post.song || "Unknown") + " — " + (post.artist || "Anonymous");

  postcard.classList.remove("hidden");
}

closePcBtn.onclick = () => postcard.classList.add("hidden");

shareBtn.onclick = () => {
  navigator.clipboard.writeText(pcText.textContent + "\n" + pcSong.textContent);
  alert("Copied. Share it.");
};

function goTo(screen) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[screen].classList.add("active");
}

function resetForm() {
  lyricInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  form.classList.add("hidden");
}
