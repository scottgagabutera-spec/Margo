const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");

const enterBtn = document.getElementById("enterBtn");
const openComposerBtn = document.getElementById("openComposer");
const postBtn = document.getElementById("postBtn");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let currentMode = "share";
let selectedEmotion = null;
let activePost = null;

enterBtn.onclick = () => {
  landing.classList.remove("active");
  feed.classList.add("active");
  renderFeed();
};

openComposerBtn.onclick = () => composer.classList.remove("hidden");
function closeComposer(){ composer.classList.add("hidden"); }

document.querySelectorAll(".mode-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".mode-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    updateConditional();
  }
});

function updateConditional(){
  document.querySelectorAll(".conditional").forEach(c=>c.classList.remove("active"));
  if(currentMode==="share") shareFields.classList.add("active");
  if(currentMode==="guess") guessFields.classList.add("active");
}

document.querySelectorAll(".emotion-pill").forEach(p=>{
  p.onclick=()=>{
    document.querySelectorAll(".emotion-pill").forEach(e=>e.classList.remove("active"));
    p.classList.add("active");
    selectedEmotion = p.textContent;
  }
});

postBtn.onclick = ()=>{
  const text = textInput.value.trim();
  if(!text) return toast("Write something");
  if(!selectedEmotion) return toast("Pick emotion");

  const post = {
    id: Date.now(),
    text,
    emotion:selectedEmotion,
    mode:currentMode,
    song:songInput.value,
    artist:artistInput.value,
    answerSong:guessSongAnswer.value,
    answerArtist:guessArtistAnswer.value,
    time:Date.now()
  };

  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  resetComposer();
  closeComposer();
  renderFeed();
  toast("Posted");
};

function resetComposer(){
  textInput.value="";
  songInput.value="";
  artistInput.value="";
  guessSongAnswer.value="";
  guessArtistAnswer.value="";
  selectedEmotion=null;
  document.querySelectorAll(".emotion-pill").forEach(e=>e.classList.remove("active"));
}

function renderFeed(){
  feedList.innerHTML="";
  postCount.textContent = posts.length;
  posts.forEach(p=>{
    const card=document.createElement("div");
    card.className="feed-card";
    card.innerHTML=`
      <div class="feed-text">"${p.text}"</div>
      <div>${p.emotion}</div>
      <div class="feed-actions">
        ${p.mode==="guess"?`<button onclick="openGuess(${p.id})">Guess</button>`:""}
        ${p.mode==="discover"?`<button onclick="openDiscover(${p.id})">Help</button>`:""}
        <button onclick="openPostcard(${p.id})">View</button>
        <button onclick="openShare(${p.id})">Share</button>
      </div>
    `;
    feedList.appendChild(card);
  });
}

function openPostcard(id){
  activePost = posts.find(p=>p.id===id);
  postcardBody.innerHTML=`
    <div class="feed-text">"${activePost.text}"</div>
    <div>${activePost.emotion}</div>
    <div>${activePost.song || "Unknown"} - ${activePost.artist || ""}</div>
  `;
  postcardModal.classList.remove("hidden");
}
function closePostcard(){ postcardModal.classList.add("hidden"); }

function openGuess(id){
  activePost = posts.find(p=>p.id===id);
  guessModal.classList.remove("hidden");
}
function closeGuess(){ guessModal.classList.add("hidden"); }

function submitGuess(){
  if(
    userGuessSong.value.toLowerCase()===activePost.answerSong.toLowerCase() &&
    userGuessArtist.value.toLowerCase()===activePost.answerArtist.toLowerCase()
  ){
    guessResult.textContent="Correct!";
  } else {
    guessResult.textContent="Wrong";
  }
}

function openDiscover(id){
  activePost = posts.find(p=>p.id===id);
  discoverModal.classList.remove("hidden");
}
function closeDiscover(){ discoverModal.classList.add("hidden"); }

function submitDiscover(){
  activePost.song = discoverSong.value;
  activePost.artist = discoverArtist.value;
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  closeDiscover();
  renderFeed();
  toast("Thanks!");
}

function openShare(id){
  activePost = posts.find(p=>p.id===id);
  shareModal.classList.remove("hidden");
}
function closeShare(){ shareModal.classList.add("hidden"); }

function copyShareLink(){
  navigator.clipboard.writeText(activePost.text);
  toast("Copied");
}

function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2000);
}
