const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const openComposer = document.getElementById("openComposer");
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const feedList = document.getElementById("feedList");
const postcard = document.getElementById("postcard");
const closePostcard = document.getElementById("closePostcard");
const postcardText = document.getElementById("postcardText");
const postcardSong = document.getElementById("postcardSong");

const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const canvas = document.getElementById("exportCanvas");
const ctx = canvas.getContext("2d");

const textInput = document.getElementById("textInput");
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let currentPost = null;

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
  resetComposer();
};

function renderFeed() {
  feedList.innerHTML = "";
  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "feed-card";
    card.textContent = `"${post.text}"`;
    card.onclick = () => openPostcard(post);
    feedList.appendChild(card);
  });
}

function openPostcard(post) {
  currentPost = post;
  postcardText.textContent = `"${post.text}"`;
  postcardSong.textContent = post.song + " — " + post.artist;
  postcard.classList.remove("hidden");
}

closePostcard.onclick = () => postcard.classList.add("hidden");

function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
}

/* EXPORT IMAGE */
downloadBtn.onclick = () => {
  generateImage();
  const link = document.createElement("a");
  link.download = "margo-postcard.png";
  link.href = canvas.toDataURL();
  link.click();
};

shareBtn.onclick = async () => {
  generateImage();
  const blob = await new Promise(res => canvas.toBlob(res));
  const file = new File([blob], "margo.png", { type: "image/png" });

  if (navigator.share) {
    navigator.share({
      files: [file],
      title: "MARGO",
      text: "A lyric from my soul"
    });
  } else {
    alert("Sharing not supported on this device");
  }
};

function generateImage() {
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  ctx.font = "bold 80px Fraunces";
  wrapText(ctx, `"${currentPost.text}"`, 540, 800, 900, 90);

  ctx.font = "40px Inter";
  ctx.fillStyle = "#ccc";
  ctx.fillText(
    currentPost.song + " — " + currentPost.artist,
    540,
    1200
  );

  ctx.font = "30px Inter";
  ctx.fillStyle = "#666";
  ctx.fillText("MARGO", 540, 1500);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = [];

  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + " ";
    let metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line);
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });
}

renderFeed();
