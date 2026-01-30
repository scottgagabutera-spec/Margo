
/* ELEMENTS */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");

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


let emotions = [];
let posts = [];


/* SCREENS */

function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
}


/* INIT */

showLanding();
loadPosts();


/* ENTER */

enterBtn.onclick = () => {

  showFeed();

  const hasPosted = localStorage.getItem("hasPosted");

  if (!hasPosted) {
    openComposerModal();
  }

};


/* BACK */

backBtn.onclick = () => {
  showLanding();
};


/* COMPOSER */

function openComposerModal() {
  composer.classList.remove("hidden");
}

function closeComposerModal() {
  composer.classList.add("hidden");
  resetComposer();
}

openComposer.onclick = openComposerModal;
closeComposer.onclick = closeComposerModal;


/* COUNT */

textInput.oninput = () => {
  count.textContent = textInput.value.length;
};


/* EMOTIONS */

document.querySelectorAll(".emotion-pill").forEach(btn => {

  btn.onclick = () => {

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


/* POST */

postBtn.onclick = () => {

  const text = textInput.value.trim();

  if (!text) return;

  const hide = hideCheck.checked;

  const post = {
    id: Date.now(),
    text,
    emotions: [...emotions],
    song: hide ? "" : songInput.value,
    artist: hide ? "" : artistInput.value,
    time: Date.now()
  };

  posts.unshift(post);

  localStorage.setItem("hasPosted", "true");

  savePosts();

  renderFeed();

  closeComposerModal();

};


/* RESET */

function resetComposer() {

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  hideCheck.checked = false;

  emotions = [];

  count.textContent = "0";

  document.querySelectorAll(".emotion-pill").forEach(b => {
    b.classList.remove("active");
  });

}


/* STORAGE */

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


/* RENDER */

function renderFeed() {

  feedList.innerHTML = "";

  if (!posts.length) {

    feedList.innerHTML = `
      <div class="empty-feed">
        Drop your first line to begin ✨
      </div>
    `;

    return;
  }


  posts.forEach(post => {

    const card = document.createElement("div");

    card.className = "feed-card";

    card.innerHTML = `

      <p class="feed-text">"${post.text}"</p>

      <div>
        ${post.emotions.map(e =>
          `<span class="feed-emotion">${e}</span>`
        ).join("")}
      </div>

      <div class="feed-song">

        ${
          post.song || post.artist
            ? `<div>${post.song || "Unknown"} — ${post.artist || "Unknown"}</div>`
            : `<div>Hidden inspiration</div>`
        }

      </div>

    `;

    feedList.appendChild(card);

  });

}
