const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");

const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

const modeBtns = document.querySelectorAll(".mode-btn");
const shareInputs = document.getElementById("shareInputs");
const guessInputs = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");

const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let currentMode = "share";
let selectedEmotion = null;

// FLOW FIX
enterBtn.onclick = () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
};

textInput.oninput = () => {
  charCount.textContent = textInput.value.length;
};

modeBtns.forEach(btn=>{
  btn.onclick=()=>{
    modeBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentMode=btn.dataset.mode;
    shareInputs.classList.remove("active");
    guessInputs.classList.remove("active");
    discoverInputs.classList.remove("active");
    if(currentMode==="share") shareInputs.classList.add("active");
    if(currentMode==="guess") guessInputs.classList.add("active");
    if(currentMode==="discover") discoverInputs.classList.add("active");
  }
});

document.querySelectorAll(".emotion-pill").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".emotion-pill").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion=btn.dataset.emotion;
  }
});

postBtn.onclick=()=>{
  const text=textInput.value.trim();
  if(!text || !selectedEmotion) return alert("Missing fields");

  const post={
    id:Date.now(),
    text,
    emotion:selectedEmotion,
    mode:currentMode,
    knowledge:{
      song:songInput.value,
      artist:artistInput.value
    },
    links:{
      spotify:spotifyLink.value||null,
      apple:appleLink.value||null,
      youtube:youtubeLink.value||null
    },
    timestamp:Date.now()
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts",JSON.stringify(posts));

  composer.classList.add("hidden");
  feed.classList.add("active");
  renderFeed();
};

function renderFeed(){
  feedList.innerHTML="";
  postCount.textContent=posts.length;

  posts.forEach(post=>{
    let links="";
    if(post.links.spotify||post.links.apple||post.links.youtube){
      links=`
        <div class="feed-links">
          ${post.links.spotify?`<a href="${post.links.spotify}" target="_blank">Spotify</a>`:""}
          ${post.links.apple?`<a href="${post.links.apple}" target="_blank">Apple</a>`:""}
          ${post.links.youtube?`<a href="${post.links.youtube}" target="_blank">YouTube</a>`:""}
        </div>
      `;
    }

    const card=document.createElement("div");
    card.className="feed-card";
    card.innerHTML=`
      <div class="feed-text">${post.text}</div>
      <div style="text-align:center;color:#d4af37">${post.emotion}</div>
      <div style="text-align:center;font-size:0.9rem">${post.knowledge.song||""} — ${post.knowledge.artist||""}</div>
      ${links}
    `;
    feedList.appendChild(card);
  });
}

renderFeed();
