const startBtn = document.getElementById("startBtn");
const landing = document.getElementById("landing");
const create = document.getElementById("create");
const feed = document.getElementById("feed");

const lyricInput = document.getElementById("lyricInput");
const modeSection = document.getElementById("modeSection");
const metaSection = document.getElementById("metaSection");
const postBtn = document.getElementById("postBtn");

const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

const postsDiv = document.getElementById("posts");

let selectedMode = null;
let posts = [];

startBtn.onclick = () => {
  landing.classList.add("hidden");
  create.classList.remove("hidden");
};

lyricInput.oninput = () => {
  if (lyricInput.value.trim().length > 3) {
    modeSection.classList.remove("hidden");
  }
};

document.querySelectorAll(".modeBtn").forEach(btn => {
  btn.onclick = () => {
    selectedMode = btn.dataset.mode;
    metaSection.classList.add("hidden");

    if (selectedMode === "know" || selectedMode === "discover") {
      metaSection.classList.remove("hidden");
    }

    postBtn.classList.remove("hidden");
  };
});

postBtn.onclick = () => {
  const post = {
    lyric: lyricInput.value,
    mode: selectedMode,
    song: songInput.value,
    artist: artistInput.value,
    replies: []
  };

  posts.unshift(post);
  renderFeed();

  create.classList.add("hidden");
  feed.classList.remove("hidden");
};

function renderFeed() {
  postsDiv.innerHTML = "";

  posts.forEach((post, index) => {
    const div = document.createElement("div");
    div.className = "post";

    let metaText = "";
    if (post.mode === "guess") metaText = "Guess the song";
    if (post.mode === "know") metaText = `${post.song || "Unknown"} — ${post.artist || ""}`;
    if (post.mode === "discover") metaText = "Help identify this song";

    div.innerHTML = `
      <div class="lyric">"${post.lyric}"</div>
      <div class="meta">${metaText}</div>
      <input class="replyInput" placeholder="Reply / guess..." 
        onkeydown="if(event.key==='Enter') addReply(${index}, this.value)">
      <div class="meta">${post.replies.join("<br>")}</div>
    `;

    postsDiv.appendChild(div);
  });
}

function addReply(index, text) {
  if (!text.trim()) return;
  posts[index].replies.push(text);
  renderFeed();
}
