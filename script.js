const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");

const enterBtn = document.getElementById("enterBtn");
const closeComposer = document.getElementById("closeComposer");
const openComposer = document.getElementById("openComposer");
const postBtn = document.getElementById("postBtn");

const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

const listenModal = document.getElementById("listenModal");
const listenLinks = document.getElementById("listenLinks");
const closeListen = document.getElementById("closeListen");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");

// FLOW FIX
enterBtn.onclick = () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
  feed.classList.add("active");   // 🔥 THIS WAS MISSING
  renderFeed();
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
};

textInput.oninput = () => {
  charCount.textContent = textInput.value.length;
};

postBtn.onclick = () => {
  const post = {
    text: textInput.value,
    song: songInput.value,
    artist: artistInput.value,
    links: {
      spotify: spotifyLink.value,
      apple: appleLink.value,
      youtube: youtubeLink.value,
      soundcloud: soundcloudLink.value
    }
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));

  composer.classList.add("hidden");
  feed.classList.add("active");
  renderFeed();
};

function renderFeed() {
  feedList.innerHTML = "";
  postCount.textContent = posts.length;

  posts.forEach((p,i)=>{
    const card = document.createElement("div");
    card.className="feed-card";
    card.innerHTML = `
      <div>${p.text}</div>
      <div>${p.song} — ${p.artist}</div>
      <button onclick="openListen(${i})">Listen</button>
    `;
    feedList.appendChild(card);
  });
}

function openListen(i){
  const p = posts[i];
  listenLinks.innerHTML="";
  Object.entries(p.links).forEach(([k,v])=>{
    if(v){
      const a=document.createElement("a");
      a.href=v; a.target="_blank";
      a.className="listen-link";
      a.textContent=k;
      listenLinks.appendChild(a);
    }
  });
  listenModal.classList.remove("hidden");
}

closeListen.onclick=()=>listenModal.classList.add("hidden");

// AUTO SHOW FEED IF POSTS EXIST
if(posts.length>0){
  landing.classList.remove("active");
  feed.classList.add("active");
  renderFeed();
}
