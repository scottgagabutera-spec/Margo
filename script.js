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
const guessBtn = document.getElementById("guessBtn");

const guessModal = document.getElementById("guessModal");
const submitGuess = document.getElementById("submitGuess");
const closeGuess = document.getElementById("closeGuess");
const guessResult = document.getElementById("guessResult");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const hideSongCheck = document.getElementById("hideSongCheck");

let selectedEmotions = [];
let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let currentPost = null;

enterBtn.onclick = () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
};

document.querySelectorAll(".emotion").forEach(btn => {
  btn.onclick = () => {
    btn.classList.toggle("active");
    const emo = btn.dataset.emotion;
    if (selectedEmotions.includes(emo)) {
      selectedEmotions = selectedEmotions.filter(e => e !== emo);
    } else {
      selectedEmotions.push(emo);
    }
  };
});

postBtn.onclick = () => {
  const post = {
    text: textInput.value,
    song: hideSongCheck.checked ? "Hidden" : songInput.value,
    artist: hideSongCheck.checked ? "Mystery" : artistInput.value,
    hidden: hideSongCheck.checked
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
  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `
      <div class="feed-text">"${post.text}"</div>
      <div class="feed-song">${post.hidden ? "Mystery track" : post.song + " — " + post.artist}</div>
    `;
    card.onclick = () => openPostcard(post);
    feedList.appendChild(card);
  });
}

function openPostcard(post) {
  currentPost = post;
  postcardText.textContent = `"${post.text}"`;

  if (post.hidden) {
    postcardSong.textContent = "Mystery track";
    guessBtn.classList.remove("hidden");
  } else {
    postcardSong.textContent = post.song + " — " + post.artist;
    guessBtn.classList.add("hidden");
  }

  postcard.classList.remove("hidden");
}

closePostcard.onclick = () => {
  postcard.classList.add("hidden");
};

guessBtn.onclick = () => {
  guessModal.classList.remove("hidden");
};

submitGuess.onclick = () => {
  const song = document.getElementById("guessSongInput").value;
  const artist = document.getElementById("guessArtistInput").value;

  if (
    song.toLowerCase() === currentPost.song.toLowerCase() &&
    artist.toLowerCase() === currentPost.artist.toLowerCase()
  ) {
    guessResult.textContent = "Correct! 🎉";
  } else {
    guessResult.textContent = "Not quite…";
  }
};

closeGuess.onclick = () => {
  guessModal.classList.add("hidden");
  guessResult.textContent = "";
};

function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  hideSongCheck.checked = false;
  selectedEmotions = [];
  document.querySelectorAll(".emotion").forEach(e => e.classList.remove("active"));
}

renderFeed();
