/* ========================
   ELEMENTS
======================== */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const enterBtn = document.getElementById("enterBtn");

const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");

const composer = document.getElementById("composer");

const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const hideCheck = document.getElementById("hideCheck");

const count = document.getElementById("count");

const feedList = document.getElementById("feedList");

const emotionBtns = document.querySelectorAll(".emotion-pill");


/* ========================
   STATE
======================== */

let emotions = [];
let posts = [];


/* ========================
   NAVIGATION
======================== */

function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
}


/* ========================
   INIT
======================== */

showLanding();
loadPosts();


/* ========================
   ENTER BUTTON
======================== */

if (enterBtn) {
  enterBtn.addEventListener("click", () => {
    showFeed();
  });
}


/* ========================
   COMPOSER
======================== */

openComposer.addEventListener("click", () => {
  composer.classList.remove("hidden");
});

closeComposer.addEventListener("click", () => {
  closeComposerModal();
});

function closeComposerModal() {
  composer.classList.add("hidden");
  resetComposer();
}


/* ========================
   CHARACTER COUNT
======================== */

textInput.addEventListener("input", () => {
  count.textContent = textInput.value.length;
});


/* ========================
   EMOTIONS
======================== */

emotionBtns.forEach(btn => {

  btn.addEventListener("click", () => {

    const e = btn.dataset.emotion;

    if (emotions.includes(e)) {

      emotions = emotions.filter(x => x !== e);
      btn.classList.remove("active");

    } else {

      emotions.push(e);
      btn.classList.add("active");

    }

  });

});


/* ========================
   POST
======================== */

postBtn.addEventListener("click", () => {

  const text = textInput.value.trim();

  if (!text) return;

  const hide = hideCheck.checked;

  const post = {
    id: Date.now(),
    text,
    emotions: [...emotions],
    song: hide ? "" : songInput.value,
    artist: hide ? "" : artistInput.value,
    hidden: hide,
    time: Date.now()
  };

  posts.unshift(post);

  savePosts();
  renderFeed();

  closeComposerModal();

});


/* ========================
   STORAGE
======================== */

function savePosts() {
  localStorage.setItem("margoPosts", JSON.stringify(posts));
}

function loadPosts() {

  const saved = localStorage.getItem("margoPosts");

  if (saved) {
    posts = JSON.parse(saved);
  }

  renderFeed();
}


/* ========================
   RESET
======================== */

function resetComposer() {

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";

  hideCheck.checked = false;

  count.textContent = "0";

  emotions = [];

  emotionBtns.forEach(btn => {
    btn.classList.remove("active");
  });

}


/* ========================
   RENDER FEED
======================== */

function renderFeed() {

  feedList.innerHTML = "";

  posts.forEach(post => {

    const card = document.createElement("div");
    card.className = "feed-card";


    let songHTML = "";

    if (!post.hidden && (post.song || post.artist)) {

      songHTML = `
        <div class="feed-song">
          <div>${post.song || "Unknown song"}</div>
          <div>${post.artist || "Unknown artist"}</div>
        </div>
      `;

    }


    card.innerHTML = `

      <p class="feed-text">"${post.text}"</p>

      <div class="feed-emotions">
        ${post.emotions
          .map(e => `<span class="feed-emotion">${e}</span>`)
          .join("")}
      </div>

      ${songHTML}

    `;

    feedList.appendChild(card);

  });

}
