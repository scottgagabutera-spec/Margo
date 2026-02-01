const dropBtn = document.getElementById("dropBtn");
const landing = document.getElementById("landing");
const create = document.getElementById("create");
const feed = document.getElementById("feed");

const lineInput = document.getElementById("lineInput");
const modeSection = document.getElementById("modeSection");
const metaSection = document.getElementById("metaSection");
const postBtn = document.getElementById("postBtn");

const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const linkInput = document.getElementById("linkInput");

const postsDiv = document.getElementById("posts");

let mode = null;
let posts = [];

dropBtn.onclick = () => {
  landing.classList.add("hidden");
  create.classList.remove("hidden");
};

lineInput.oninput = () => {
  if (lineInput.value.trim().length > 3) {
    modeSection.classList.remove("hidden");
  }
};

document.querySelectorAll(".mode").forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    metaSection.classList.add("hidden");

    if (mode === "share" || mode === "discover") {
      metaSection.classList.remove("hidden");
    }

    postBtn.classList.remove("hidden");
  };
});

postBtn.onclick = () => {
  const post = {
    line: lineInput.value,
    mode,
    song: songInput.value,
    artist: artistInput.value,
    link: linkInput.value,
    replies: []
  };

  posts.unshift(post);
  renderFeed();

  create.classList.add("hidden");
  feed.classList.remove("hidden");
};

function renderFeed() {
  postsDiv.innerHTML = "";

  posts.forEach((p, i) => {
    let meta = "";

    if (p.mode === "guess") meta = "Guess the song";
    if (p.mode === "share") meta = `${p.song || "Unknown"} — ${p.artist || ""}`;
    if (p.mode === "discover") meta = "Help identify this song";

    postsDiv.innerHTML += `
      <div class="post">
        <div class="line">"${p.line}"</div>
        <div class="meta">${meta}</div>
        ${p.link ? `<div class="meta">🎧 Listen</div>` : ""}
        <input class="reply" placeholder="Reply / guess..." 
          onkeydown="if(event.key==='Enter') reply(${i}, this.value)">
        <div class="meta">${p.replies.join("<br>")}</div>
      </div>
    `;
  });
}

function reply(i, text) {
  if (!text.trim()) return;
  posts[i].replies.push(text);
  renderFeed();
}
