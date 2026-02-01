console.log("MARGO loaded");

/* DOM */
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");

const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const count = document.getElementById("count");

const feedList = document.getElementById("feedList");

/* STATE */
let posts = [];

/* NAVIGATION */
function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
}

enterBtn.addEventListener("click", () => {
  console.log("Drop a Line clicked");
  showFeed();
});

backBtn.addEventListener("click", showLanding);

/* COMPOSER */
openComposer.addEventListener("click", () => {
  composer.classList.remove("hidden");
  textInput.focus();
});

closeComposer.addEventListener("click", () => {
  composer.classList.add("hidden");
  resetComposer();
});

textInput.addEventListener("input", () => {
  count.textContent = `${textInput.value.length}/140`;
});

postBtn.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) return;

  const post = {
    id: Date.now(),
    text
  };

  posts.unshift(post);
  renderFeed();

  composer.classList.add("hidden");
  resetComposer();
});

/* FEED */
function renderFeed() {
  feedList.innerHTML = "";

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `<p class="feed-text">“${post.text}”</p>`;
    feedList.appendChild(card);
  });
}

/* UTILS */
function resetComposer() {
  textInput.value = "";
  count.textContent = "0/140";
}

/* INIT */
showLanding();
