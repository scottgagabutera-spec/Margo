/* ELEMENTS */

const app = document.getElementById("app");

const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");

const composer = document.getElementById("composer");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const emotionInput = document.getElementById("emotionInput");

const count = document.getElementById("count");

const postBtn = document.getElementById("postBtn");

const cardText = document.getElementById("cardText");
const cardSong = document.getElementById("cardSong");
const cardEmotions = document.getElementById("cardEmotions");

const feed = document.getElementById("feed");

const backHome = document.getElementById("backHome");
const backCard = document.getElementById("backCard");

const shareBtn = document.getElementById("shareBtn");
const listenBtn = document.getElementById("listenBtn");


/* STATE */

let posts = JSON.parse(localStorage.getItem("margo_posts")) || [];
let currentPost = null;
let screen = 0;


/* NAVIGATION */

function goTo(index) {
  screen = index;
  app.style.transform = `translateX(-${index * 100}vw)`;
}


/* SAVE */

function save() {
  localStorage.setItem("margo_posts", JSON.stringify(posts));
}


/* COMPOSER */

openComposer.onclick = () => {
  composer.classList.remove("hidden");
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
};


textInput.oninput = () => {
  count.textContent = textInput.value.length;
};


/* CREATE POST */

postBtn.onclick = () => {

  const text = textInput.value.trim();
  const song = songInput.value.trim();

  if (!text || !song) return;

  const emotions =
    [...emotionInput.selectedOptions].map(e => e.value);

  const post = {
    id: Date.now(),
    text,
    song,
    emotions
  };

  posts.unshift(post);

  save();

  renderFeed();
  renderCard(post);

  resetComposer();

  goTo(1);
};


/* RESET */

function resetComposer() {

  textInput.value = "";
  songInput.value = "";
  emotionInput.selectedIndex = -1;
  count.textContent = "0";

  composer.classList.add("hidden");
}


/* POSTCARD */

function renderCard(post) {

  currentPost = post;

  cardText.textContent = post.text;
  cardSong.textContent = post.song;

  cardEmotions.innerHTML = "";

  post.emotions.forEach(e => {

    const tag = document.createElement("span");
    tag.textContent = e;

    cardEmotions.appendChild(tag);

  });

}


/* FEED */

function renderFeed() {

  feed.innerHTML = "";

  posts.forEach(p => {

    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <p>${p.text}</p>
      <p class="song">${p.song}</p>
    `;

    div.onclick = () => {
      renderCard(p);
      goTo(1);
    };

    feed.appendChild(div);

  });

}


/* SHARE */

shareBtn.onclick = async () => {

  if (!currentPost) return;

  const text = `"${currentPost.text}"\n${currentPost.song}\n#margo`;

  try {

    await navigator.clipboard.writeText(text);

    alert("Copied. Share it anywhere.");

  } catch {

    alert("Copy failed.");

  }

};


/* LISTEN */

listenBtn.onclick = () => {

  if (!currentPost) return;

  const q = encodeURIComponent(currentPost.song);

  window.open(
    `https://open.spotify.com/search/${q}`,
    "_blank"
  );

};


/* BACK */

backHome.onclick = () => goTo(0);
backCard.onclick = () => goTo(1);


/* SWIPE */

let startX = 0;

document.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.addEventListener("touchend", e => {

  const delta =
    startX - e.changedTouches[0].clientX;

  if (delta > 60 && screen < 2) goTo(screen + 1);
  if (delta < -60 && screen > 0) goTo(screen - 1);

});


/* INIT */

renderFeed();
goTo(0);
