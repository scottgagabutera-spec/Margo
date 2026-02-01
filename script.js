const screens = {
  landing: document.getElementById("landing"),
  composer: document.getElementById("composer"),
  feed: document.getElementById("feed")
};

const choiceBtns = document.querySelectorAll(".choice-btn");
const postBtn = document.getElementById("postBtn");
const newPostBtn = document.getElementById("newPostBtn");

const feedList = document.getElementById("feedList");

const lyricInput = document.getElementById("lyricInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const postcard = document.getElementById("postcard");
const pcText = document.getElementById("pcText");
const pcSong = document.getElementById("pcSong");
const closePcBtn = document.getElementById("closePcBtn");
const shareBtn = document.getElementById("shareBtn");

let posts = JSON.parse(localStorage.getItem("margoPosts")) || [];
let mode = null;

// FLOW
choiceBtns.forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    goTo("composer");
  };
});

postBtn.onclick = () => {
  const post = {
    text: lyricInput.value,
    song: songInput.value,
    artist: artistInput.value,
    time: Date.now()
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  resetComposer();
  renderFeed();
  goTo("feed");
};

newPostBtn.onclick = () => goTo("composer");

// FEED
function renderFeed() {
  feedList.innerHTML = "";

  if (posts.length === 0) {
    feedList.innerHTML = `<p style="opacity:.5">No feelings yet.</p>`;
    return;
  }

  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `
      <p>"${post.text}"</p>
      <small>${post.song} — ${post.artist}</small>
    `;
    card.onclick = () => openPostcard(post);
    feedList.appendChild(card);
  });
}

// POSTCARD
function openPostcard(post) {
  pcText.textContent = `"${post.text}"`;
  pcSong.textContent = post.song + " — " + post.artist;
  postcard.classList.remove("hidden");
}

closePcBtn.onclick = () => postcard.classList.add("hidden");

shareBtn.onclick = () => {
  const text = pcText.textContent + "\n" + pcSong.textContent;
  navigator.clipboard.writeText(text);
  alert("Copied. Share your feeling.");
};

// UTILS
function goTo(screen) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[screen].classList.add("active");
}

function resetComposer() {
  lyricInput.value = "";
  songInput.value = "";
  artistInput.value = "";
}

// INIT
renderFeed();
