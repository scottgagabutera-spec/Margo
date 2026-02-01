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

let mode = null;

// Seed emotional content
const seedPosts = [
  { text: "I miss who I was before I met you.", song: "Liability", artist: "Lorde" },
  { text: "Nobody said it was easy.", song: "The Scientist", artist: "Coldplay" },
  { text: "I'm scared of falling in love again.", song: "Happier", artist: "Ed Sheeran" },
  { text: "I gave you my heart, but the very next day you gave it away.", song: "Last Christmas", artist: "Wham!" },
  { text: "I'm trying to find myself again.", song: "Drivers License", artist: "Olivia Rodrigo" }
];

let posts = JSON.parse(localStorage.getItem("margoPosts")) || seedPosts;

// FLOW
choiceBtns.forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    goTo("composer");
  };
});

postBtn.onclick = () => {
  if (!lyricInput.value) return;

  const post = {
    text: lyricInput.value,
    song: songInput.value || "Unknown",
    artist: artistInput.value || "Anonymous",
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
    feedList.innerHTML = `
      <div class="empty">
        No feelings yet. Be the first to share one.
      </div>`;
    return;
  }

  posts.forEach(post => {
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
