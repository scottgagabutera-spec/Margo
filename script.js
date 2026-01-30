
/* ELEMENTS */

const landing = document.getElementById("landing");
const feed = document.getElementById("feed");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const newPostBtn = document.getElementById("newPostBtn");

const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");

const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const hideCheck = document.getElementById("hideCheck");

const count = document.getElementById("count");

const feedList = document.getElementById("feedList");

let emotions = [];
let posts = [];



/* NAV */

function show(screen) {

  [landing,feed].forEach(s=>{
    s.classList.remove("active");
  });

  screen.classList.add("active");
}



/* START */

show(landing);



/* ENTER */

enterBtn.onclick = ()=> {
  openComposer();
};



/* FEED NAV */

backBtn.onclick = ()=> {
  show(landing);
};

newPostBtn.onclick = ()=> {
  openComposer();
};



/* COMPOSER */

function openComposer(){
  composer.classList.remove("hidden");
}

closeComposer.onclick = ()=> {
  closeComposerModal();
};

function closeComposerModal(){
  composer.classList.add("hidden");
  resetComposer();
}



/* COUNTER */

textInput.oninput = ()=> {
  count.textContent = textInput.value.length;
};



/* EMOTIONS */

document
.querySelectorAll("#emotionPills button")
.forEach(btn=>{

  btn.onclick = ()=>{

    if(btn.classList.contains("active")){
      btn.classList.remove("active");
      emotions = emotions.filter(e=>e!==btn.dataset.e);
    }
    else{
      btn.classList.add("active");
      emotions.push(btn.dataset.e);
    }

  };

});



/* HIDE MODE */

hideCheck.onchange = ()=>{

  const pills = document.getElementById("emotionPills");

  if(hideCheck.checked){

    songInput.disabled = true;
    artistInput.disabled = true;

    songInput.value = "";
    artistInput.value = "";

    pills.classList.add("disabled");

    emotions = [];

    pills
      .querySelectorAll("button")
      .forEach(b=>b.classList.remove("active"));

  }
  else{

    songInput.disabled = false;
    artistInput.disabled = false;

    pills.classList.remove("disabled");
  }

};



/* POST */

postBtn.onclick = ()=>{

  if(!textInput.value.trim()) return;

  const post = {

    id: Date.now(),

    text: textInput.value,

    song: hideCheck.checked ? "" : songInput.value,

    artist: hideCheck.checked ? "" : artistInput.value,

    emotions: [...emotions],

    hidden: hideCheck.checked

  };

  posts.unshift(post);

  save();

  render();

  closeComposerModal();

  show(feed);

};



/* STORAGE */

function save(){
  localStorage.setItem("margoPosts",JSON.stringify(posts));
}

function load(){

  const saved = localStorage.getItem("margoPosts");

  if(saved) posts = JSON.parse(saved);

  render();
}

load();



/* RESET */

function resetComposer(){

  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";

  hideCheck.checked = false;

  emotions = [];

  count.textContent = 0;

  document
  .querySelectorAll("#emotionPills button")
  .forEach(b=>b.classList.remove("active"));

  document
  .getElementById("emotionPills")
  .classList.remove("disabled");

  songInput.disabled = false;
  artistInput.disabled = false;
}



/* RENDER */

function render(){

  feedList.innerHTML = "";

  posts.forEach(p=>{

    const card = document.createElement("div");

    card.className = "feed-card";

    card.innerHTML = `

      <p>"${p.text}"</p>

      <div class="tags">
        ${p.emotions.map(e=>`<span>${e}</span>`).join("")}
      </div>

      <div class="song">
        ${
          p.hidden
          ? "Hidden inspiration"
          : (p.song||"Unknown")+" — "+(p.artist||"Unknown")
        }
      </d
