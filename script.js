const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const storyBtn = document.getElementById("storyBtn");

const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const feedList = document.getElementById("feedList");

const postcard = document.getElementById("postcard");
const swipeArea = document.getElementById("swipeArea");
const closePostcard = document.getElementById("closePostcard");
const postcardText = document.getElementById("postcardText");
const postcardSong = document.getElementById("postcardSong");

const storyView = document.getElementById("storyView");
const storyText = document.getElementById("storyText");
const storySong = document.getElementById("storySong");
const closeStory = document.getElementById("closeStory");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let currentIndex = 0;

enterBtn.onclick = () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
};

openComposer.onclick = () => composer.classList.remove("hidden");
closeComposer.onclick = () => composer.classList.add("hidden");

postBtn.onclick = () => {
  const post = {
    text: textInput.value,
    song: songInput.value,
    artist: artistInput.value
  };
  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  composer.classList.add("hidden");
  feed.classList.add("active");
  renderFeed();
};

function renderFeed() {
  feedList.innerHTML = "";
  posts.forEach((post, i) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.innerHTML = `<div class="feed-text">"${post.text}"</div>`;
    card.onclick = () => openPostcard(i);
    feedList.appendChild(card);
  });
}

function openPostcard(index) {
  currentIndex = index;
  showPost(currentIndex);
  postcard.classList.remove("hidden");
}

function showPost(i) {
  postcardText.textContent = `"${posts[i].text}"`;
  postcardSong.textContent = posts[i].song + " — " + posts[i].artist;
}

let startX = 0;

swipeArea.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

swipeArea.addEventListener("touchend", e => {
  const endX = e.changedTouches[0].clientX;
  if (startX - endX > 50 && currentIndex < posts.length - 1) {
    currentIndex++;
    showPost(currentIndex);
  }
  if (endX - startX > 50 && currentIndex > 0) {
    currentIndex--;
    showPost(currentIndex);
  }
});

closePostcard.onclick = () => postcard.classList.add("hidden");

storyBtn.onclick = () => {
  let i = 0;
  storyView.classList.remove("hidden");
  showStory(i);

  storyView.onclick = () => {
    i++;
    if (i < posts.length) showStory(i);
    else storyView.classList.add("hidden");
  };
};

function showStory(i) {
  storyText.textContent = `"${posts[i].text}"`;
  storySong.textContent = posts[i].song + " — " + posts[i].artist;
}

closeStory.onclick = () => storyView.classList.add("hidden");

renderFeed();
