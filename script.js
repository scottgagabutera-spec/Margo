const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");
const feedList = document.getElementById("feedList");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const hideSongCheck = document.getElementById("hideSongCheck");

let selectedEmotions = [];
let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");

enterBtn.onclick = () => {
  landing.classList.remove("active");
  feed.classList.add("active");
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
};

document.querySelectorAll(".emotion").forEach(btn => {
  btn.onclick = () => {
    const emo = btn.dataset.emotion;
    btn.classList.toggle("active");
    if (selectedEmotions.includes(emo)) {
      selectedEmotions = selectedEmotions.filter(e => e !== emo);
    } else {
      selectedEmotions.push(emo);
    }
  };
});

postBtn.onclick = () => {
  if (!textInput.value) return;

  const post = {
    text: textInput.value,
    song: hideSongCheck.checked ? "Hidden" : songInput.value,
    artist: hideSongCheck.checked ? "Mystery" : artistInput.value,
    emotions: selectedEmotions,
    timestamp: Date.now()
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  renderFeed();
  composer.classList.add("hidden");
  resetComposer();
};

function renderFeed() {
  feedList.innerHTML = "";
  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `
      <div class="feed-text">"${post.text}"</div>
      <div class="feed-song">${post.song} — ${post.artist}</div>
    `;
    feedList.appendChild(card);
  });
}

function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  hideSongCheck.checked = false;
  selectedEmotions = [];
  document.querySelectorAll(".emotion").forEach(e => e.classList.remove("active"));
}

renderFeed();
