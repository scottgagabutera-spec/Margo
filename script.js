const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const feedList = document.getElementById("feedList");

const modeBtns = document.querySelectorAll(".mode-btn");
const shareInputs = document.getElementById("shareInputs");
const guessInputs = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");

const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const guessSongCheck = document.getElementById("guessSongCheck");
const guessArtistCheck = document.getElementById("guessArtistCheck");
const guessSongAnswer = document.getElementById("guessSongAnswer");
const guessArtistAnswer = document.getElementById("guessArtistAnswer");

const discoverSongInput = document.getElementById("discoverSongInput");
const discoverArtistInput = document.getElementById("discoverArtistInput");

let currentMode = "share";
let selectedEmotion = null;
let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");

enterBtn.onclick = () => {
  landing.classList.remove("active");
  feed.classList.add("active");
};

backBtn.onclick = () => {
  feed.classList.remove("active");
  landing.classList.add("active");
};

openComposer.onclick = () => composer.classList.remove("hidden");
closeComposer.onclick = () => composer.classList.add("hidden");

modeBtns.forEach(btn => {
  btn.onclick = () => {
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    shareInputs.classList.remove("active");
    guessInputs.classList.remove("active");
    discoverInputs.classList.remove("active");

    if (currentMode === "share") shareInputs.classList.add("active");
    if (currentMode === "guess") guessInputs.classList.add("active");
    if (currentMode === "discover") discoverInputs.classList.add("active");
  };
});

document.querySelectorAll(".emotion-pills button").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".emotion-pills button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion = btn.dataset.emotion;
  }
});

postBtn.onclick = () => {
  const text = textInput.value.trim();
  if (!text || !selectedEmotion) return alert("Add lyric + emotion");

  let post = {
    id: Date.now(),
    text,
    emotion: selectedEmotion,
    mode: currentMode,
    knowledge: {},
    guessConfig: null,
    timestamp: Date.now()
  };

  if (currentMode === "share") {
    post.knowledge = { song:songInput.value, artist:artistInput.value };
  }

  if (currentMode === "guess") {
    post.knowledge = {
      song: guessSongAnswer.value,
      artist: guessArtistAnswer.value,
      hidden:true
    };
    post.guessConfig = {
      guessSong: guessSongCheck.checked,
      guessArtist: guessArtistCheck.checked
    };
  }

  if (currentMode === "discover") {
    post.knowledge = {
      song: discoverSongInput.value || null,
      artist: discoverArtistInput.value || null
    };
  }

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  renderFeed();
  composer.classList.add("hidden");
};

function renderFeed() {
  feedList.innerHTML = "";
  posts.forEach(p=>{
    const card = document.createElement("div");
    card.className="feed-card";
    card.innerHTML = `
      <div class="feed-text">"${p.text}"</div>
      <div style="text-align:center;color:#d4af37">${p.emotion}</div>
      <div style="text-align:center;font-size:.8rem">
        ${p.mode==="share" ? `${p.knowledge.song} — ${p.knowledge.artist}` :
          p.mode==="guess" ? "Guess the song" :
          "Help discover this song"}
      </div>
    `;
    feedList.appendChild(card);
  });
}

renderFeed();
