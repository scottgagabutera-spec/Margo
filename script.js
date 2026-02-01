const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const feedList = document.getElementById("feedList");
const postcard = document.getElementById("postcard");
const closePostcard = document.getElementById("closePostcard");
const postcardText = document.getElementById("postcardText");
const postcardSong = document.getElementById("postcardSong");

const vibeButtons = document.querySelectorAll(".vibe-btn");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let currentPostIndex = null;

enterBtn.onclick = () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
};

openComposer.onclick = () => composer.classList.remove("hidden");
closeComposer.onclick = () => composer.classList.add("hidden");

postBtn.onclick = () => {
  const post = {
    text: textInput.value,
    song: songInput.value,
    artist: artistInput.value,
    vibes: { love: 0, sad: 0, magic: 0, fire: 0 }
  };
  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  composer.classList.add("hidden");
  feed.classList.add("active");
  renderFeed();
  resetComposer();
};

function renderFeed() {
  feedList.innerHTML = "";
  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `
      <div>"${post.text}"</div>
      <small>❤️ ${post.vibes.love} 😢 ${post.vibes.sad} ✨ ${post.vibes.magic} 🔥 ${post.vibes.fire}</small>
    `;
    card.onclick = () => openPostcard(index);
    feedList.appendChild(card);
  });
}

function openPostcard(index) {
  currentPostIndex = index;
  const post = posts[index];
  postcardText.textContent = `"${post.text}"`;
  postcardSong.textContent = post.song + " — " + post.artist;
  updateVibes(post);
  postcard.classList.remove("hidden");
}

function updateVibes(post) {
  vibeButtons.forEach(btn => {
    const type = btn.dataset.vibe;
    btn.querySelector("span").textContent = post.vibes[type];
  });
}

vibeButtons.forEach(btn => {
  btn.onclick = () => {
    const type = btn.dataset.vibe;
    posts[currentPostIndex].vibes[type]++;
    localStorage.setItem("margoPosts", JSON.stringify(posts));
    updateVibes(posts[currentPostIndex]);
    renderFeed();
  };
});

closePostcard.onclick = () => postcard.classList.add("hidden");

function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
}

renderFeed();
