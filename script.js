/* ELEMENTS */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const openFeed = document.getElementById("openFeed");
const backHome = document.getElementById("backHome");

const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");

const composer = document.getElementById("composer");

const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const hideToggle = document.getElementById("hideToggle");

const count = document.getElementById("count");

const feedList = document.getElementById("feedList");

const themeToggle = document.getElementById("themeToggle");


let emotions = [];
let posts = [];


/* NAV */

function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
}


/* START */

showLanding();


/* THEME */

let theme = localStorage.getItem("margoTheme") || "dark";

document.body.className = theme;

themeToggle.onclick = () => {

  theme = theme === "dark" ? "light" : "dark";

  document.body.className = theme;

  localStorage.setItem("margoTheme", theme);

};


/* NAVIGATION */

openFeed.onclick = showFeed;
backHome.onclick = showLanding;


/* COMPOSER */

function openModal() {
  composer.classList.remove("hidden");
  document.body.classList.add("modal-open");
  textInput.focus();
}

function closeModal() {
  composer.classList.add("hidden");
  document.body.classList.remove("modal-open");
  resetComposer();
}

openComposer.onclick = openModal;
closeComposer.onclick = closeModal;


/* COUNTER */

textInput.oninput = () => {
  count.textContent = textInput.value.length;
};


/* EMOTIONS */

document.querySelectorAll(".emotion-pill").forEach(btn => {

  btn.onclick = () => {

    if (hideToggle.checked) return;

    const e = btn.dataset.emotion;

    if (emotions.includes(e)) {

      emotions = emotions.filter(x => x !== e);
      btn.classList.remove("active");

    } else {

      emotions.push(e);
      btn.classList.add("active");

    }

  };

});


/* HIDE MODE */

hideToggle.onchange = () => {

  const disabled = hideToggle.checked;

  songInput.disabled = disabled;
  artistInput.disabled = disabled;

  if (disabled) {

    songInput.value = "";
    artistInput.value = "";

    emotions = [];

    document
      .querySelectorAll(".emotion-pill")
      .forEach(b => b.classList.remove("active"));
  }

};


/* POST */

postBtn.onclick = () => {

  if (!textInput.value.trim()) return;

  const post = {

    id: Date.now(),

    text: textInput.value,

    song: hideToggle.checked ? "" : songInput.value,

    artist: hideToggle.checked ? "" : artistInput.value,

    emotions: hideToggle.checked ? [] : emotions,

    hidden: hideToggle.checked,

    time: Date.now()
  };


  posts.unshift(post);

  localStorage.setItem("margoPosts", JSON.stringify(posts));

  renderFeed();

  closeModal();

};


/* RESET */

function resetComposer() {

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";

  hideToggle.checked = false;

  count.textContent = "0";

  emotions = [];

  document
    .querySelectorAll(".emotion-pill")
    .forEach(b => b.classList.remove("active"));

}


/* LOAD */

function loadPosts() {

  const saved = localStorage.getItem("margoPosts");

  if (saved) posts = JSON.parse(saved);

  renderFeed();

}

loadPosts();


/* RENDER */

function renderFeed() {

  feedList.innerHTML = "";

  posts.forEach(post => {

    const card = document.createElement("div");

    card.className = "feed-card";


    const emotionHTML = post.emotions
      .map(e => `<span class="feed-emotion">${e}</span>`)
      .join("");


    const songHTML = post.hidden
      ? `<div class="feed-song">Hidden inspiration</div>`
      : `
        <div class="feed-song">
          <div>${post.song || "Unknown song"}</div>
          <div>${post.artist || "Unknown artist"}</div>
        </div>
      `;


    card.innerHTML = `

      <p class="feed-text">"${post.text}"</p>

      <div>${emotionHTML}</div>

      ${songHTML}

    `;


    feedList.appendChild(card);

  });

}
