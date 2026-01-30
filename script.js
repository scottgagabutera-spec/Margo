/* ELEMENTS */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");

const composer = document.getElementById("composer");
const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const count = document.getElementById("count");

const feedList = document.getElementById("feedList");

let emotions = [];
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


/* START */

showLanding();


/* COMPOSER */

openComposer.onclick = () => {
  showFeed();
  composer.classList.remove("hidden");
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
  resetComposer();
};

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

  if (!textInput.value.trim()) return;

  const post = {
    id: Date.now(),
    text: textInput.value,
    song: songInput.value,
    artist: artistInput.value,
    emotions,
    time: Date.now()
  };

  posts.unshift(post);

  localStorage.setItem("margoPosts", JSON.stringify(posts));

  renderFeed();

  composer.classList.add("hidden");

  resetComposer();

};


/* RESET */

function resetComposer() {

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  count.textContent = "0";

  emotions = [];

  document.querySelectorAll(".emotion-pill").forEach(b=>{
    b.classList.remove("active");
  });

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

    card.innerHTML = `

      <p class="feed-text">"${post.text}"</p>

      <div>

        ${post.emotions.map(e=>`<span class="feed-emotion">${e}</span>`).join("")}

      </div>

      <div class="feed-song">

        <div>${post.song || "Unknown song"}</div>
        <div>${post.artist || "Unknown artist"}</div>

      </div>

    `;

    feedList.appendChild(card);

  });

}
