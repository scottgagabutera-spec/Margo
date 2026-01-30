
/* ELEMENTS */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");

const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");

const composer = document.getElementById("composer");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const hideCheck = document.getElementById("hideCheck");

const postBtn = document.getElementById("postBtn");
const count = document.getElementById("count");

const feedList = document.getElementById("feedList");


let posts = [];
let emotions = [];


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


/* BUTTONS */

enterBtn.onclick = showFeed;

backBtn.onclick = showLanding;

openComposer.onclick = () => {
  composer.classList.remove("hidden");
};

closeComposer.onclick = closeModal;


function closeModal() {

  composer.classList.add("hidden");
  resetForm();

}


/* COUNTER */

textInput.oninput = () => {
  count.textContent = textInput.value.length;
};


/* EMOTIONS */

document.querySelectorAll(".pills button").forEach(btn => {

  btn.onclick = () => {

    if (hideCheck.checked) return;

    const e = btn.dataset.e;

    if (emotions.includes(e)) {

      emotions = emotions.filter(x => x !== e);
      btn.classList.remove("active");

    } else {

      emotions.push(e);
      btn.classList.add("active");

    }

  };

});


/* HIDE OPTION */

hideCheck.onchange = () => {

  if (hideCheck.checked) {

    songInput.value = "";
    artistInput.value = "";

    songInput.disabled = true;
    artistInput.disabled = true;

    emotions = [];

    document.querySelectorAll(".pills button")
      .forEach(b => b.classList.remove("active"));

  } else {

    songInput.disabled = false;
    artistInput.disabled = false;

  }

};


/* POST */

postBtn.onclick = () => {

  if (!textInput.value.trim()) return;

  const post = {

    id: Date.now(),

    text: textInput.value,

    song: hideCheck.checked ? null : songInput.value,

    artist: hideCheck.checked ? null : artistInput.value,

    emotions: [...emotions],

    hidden: hideCheck.checked

  };


  posts.unshift(post);

  save();

  render();

  closeModal();

};


/* RESET */

function resetForm() {

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";

  hideCheck.checked = false;

  songInput.disabled = false;
  artistInput.disabled = false;

  count.textContent = "0";

  emotions = [];

  document.querySelectorAll(".pills button")
    .forEach(b => b.classList.remove("active"));

}


/* STORAGE */

function save() {
  localStorage.setItem("margoPosts", JSON.stringify(posts));
}


function load() {

  const saved = localStorage.getItem("margoPosts");

  if (saved) posts = JSON.parse(saved);

  render();

}

load();


/* RENDER */

function render() {

  feedList.innerHTML = "";

  posts.forEach(p => {

    const card = document.createElement("div");

    card.className = "feed-card";

    card.innerHTML = `

      <div class="feed-text">
        "${p.text}"
      </div>

      <div class="feed-tags">
        ${
          p.emotions.map(e => `<span>${e}</span>`).join("")
        }
      </div>

      <div class="feed-meta">

        ${
          p.hidden
          ? "Hidden inspiration"
          : `${p.song || "Unknown"} — ${p.artist || "Unknown"}`
        }

      </div>

    `;

    feedList.appendChild(card);

  });

}
