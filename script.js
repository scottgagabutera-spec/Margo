/* =========================
   STATE
========================= */

let posts = [];
let selectedEmotions = [];
let hideMode = false;


/* =========================
   ELEMENTS
========================= */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const newPostBtn = document.getElementById("newPostBtn");

const composer = document.getElementById("composer");
const postBtn = document.getElementById("postBtn");

const backBtn = document.getElementById("backBtn");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const count = document.getElementById("count");

const hideModeCheck = document.getElementById("hideMode");

const feedList = document.getElementById("feedList");

const themeToggle = document.getElementById("themeToggle");

const emotionBtns = document.querySelectorAll(".emotion");


/* =========================
   INIT
========================= */

loadPosts();
showLanding();
initTheme();


/* =========================
   NAVIGATION
========================= */

function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
}


/* =========================
   THEME
========================= */

function initTheme() {

  const saved = localStorage.getItem("margoTheme");

  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }

}

themeToggle.onclick = () => {

  const current = document.documentElement.getAttribute("data-theme");

  const next = current === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", next);

  localStorage.setItem("margoTheme", next);

};


/* =========================
   COMPOSER OPEN/CLOSE
========================= */

openComposer.onclick = () => {
  showFeed();
  openComposerModal();
};

newPostBtn.onclick = () => {
  openComposerModal();
};

function openComposerModal() {
  composer.classList.remove("hidden");
  textInput.focus();
}

closeComposer.onclick = () => {
  closeComposerModal();
};

function closeComposerModal() {
  composer.classList.add("hidden");
  resetComposer();
}

backBtn.onclick = () => {
  showLanding();
};


/* =========================
   COUNTER
========================= */

textInput.oninput = () => {
  count.textContent = textInput.value.length;
};


/* =========================
   HIDE MODE
========================= */

hideModeCheck.onchange = () => {

  hideMode = hideModeCheck.checked;

  if (hideMode) {

    songInput.value = "";
    artistInput.value = "";

    songInput.disabled = true;
    artistInput.disabled = true;

    songInput.style.opacity = ".4";
    artistInput.style.opacity = ".4";

    lockEmotions();

  } else {

    songInput.disabled = false;
    artistInput.disabled = false;

    songInput.style.opacity = "1";
    artistInput.style.opacity = "1";

    unlockEmotions();

  }

};


/* =========================
   EMOTIONS
========================= */

emotionBtns.forEach(btn => {

  btn.onclick = () => {

    if (hideMode) return;

    const e = btn.dataset.emotion;

    if (selectedEmotions.includes(e)) {

      selectedEmotions = selectedEmotions.filter(x => x !== e);
      btn.classList.remove("active");

    } else {

      selectedEmotions.push(e);
      btn.classList.add("active");

    }

  };

});

function lockEmotions() {

  selectedEmotions = [];

  emotionBtns.forEach(b => {
    b.classList.remove("active");
    b.style.opacity = ".4";
    b.style.pointerEvents = "none";
  });

}

function unlockEmotions() {

  emotionBtns.forEach(b => {
    b.style.opacity = "1";
    b.style.pointerEvents = "auto";
  });

}


/* =========================
   POST
========================= */

postBtn.onclick = () => {

  const text = textInput.value.trim();

  if (!text) {
    alert("Write something first.");
    return;
  }

  const post = {
    id: Date.now(),
    text: text,

    song: hideMode ? null : songInput.value.trim(),
    artist: hideMode ? null : artistInput.value.trim(),

    emotions: hideMode ? [] : [...selectedEmotions],

    hide: hideMode,

    time: Date.now()
  };

  posts.unshift(post);

  savePosts();

  renderFeed();

  closeComposerModal();

};


/* =========================
   STORAGE
========================= */

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


/* =========================
   RESET
========================= */

function resetComposer() {

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";

  count.textContent = "0";

  hideMode = false;
  hideModeCheck.checked = false;

  songInput.disabled = false;
  artistInput.disabled = false;

  unlockEmotions();

  selectedEmotions = [];

  emotionBtns.forEach(b => b.classList.remove("active"));

}


/* =========================
   FEED RENDER
========================= */

function renderFeed() {

  feedList.innerHTML = "";

  if (posts.length === 0) {

    feedList.innerHTML = `
      <div style="opacity:.6;text-align:center;margin-top:40px;">
        No posts yet. Be first.
      </div>
    `;

    return;
  }

  posts.forEach(post => {

    const card = document.createElement("div");

    card.className = "feed-card";

    const emotionsHTML = post.emotions
      .map(e => `<span class="feed-emotion">${e}</span>`)
      .join("");

    const songHTML = post.hide
      ? `<div style="opacity:.6">Hidden inspiration</div>`
      : `
        <div>${post.song || "Unknown song"}</div>
        <div>${post.artist || "Unknown artist"}</div>
      `;

    card.innerHTML = `

      <p class="feed-text">"${post.text}"</p>

      <div class="feed-emotions">
        ${emotionsHTML}
      </div>

      <div class="feed-song">
        ${songHTML}
      </div>

    `;

    feedList.appendChild(card);

  });

}


/* =========================
   MOBILE SWIPE LANDING
========================= */

let startY = 0;

document.addEventListener("touchstart", e => {
  startY = e.touches[0].clientY;
});

document.addEventListener("touchend", e => {

  const endY = e.changedTouches[0].clientY;

  const diff = startY - endY;

  if (diff > 80 && landing.classList.contains("active")) {
    showFeed();
  }

});
