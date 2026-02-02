/* MARGO - Complete & Fixed JavaScript */

// ===== ELEMENTS =====
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");
const guessModal = document.getElementById("guessModal");
const discoverModal = document.getElementById("discoverModal");
const shareModal = document.getElementById("shareModal");
const postcardModal = document.getElementById("postcardModal");
const listenModal = document.getElementById("listenModal");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

// Mode
const modeBtns = document.querySelectorAll(".mode-btn");
const shareInputs = document.getElementById("shareInputs");
const guessInputs = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");

// Share mode inputs
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");

// Guess mode inputs
const guessSongCheck = document.getElementById("guessSongCheck");
const guessArtistCheck = document.getElementById("guessArtistCheck");
const guessSongAnswer = document.getElementById("guessSongAnswer");
const guessArtistAnswer = document.getElementById("guessArtistAnswer");

// Discover mode inputs
const discoverSongInput = document.getElementById("discoverSongInput");
const discoverArtistInput = document.getElementById("discoverArtistInput");

// Streaming links
const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

// Guess modal
const closeGuess = document.getElementById("closeGuess");
const guessLyric = document.getElementById("guessLyric");
const guessHint = document.getElementById("guessHint");
const guessSongInput = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const submitGuess = document.getElementById("submitGuess");
const revealAnswer = document.getElementById("revealAnswer");
const guessResult = document.getElementById("guessResult");
const guessInputFields = document.getElementById("guessInputFields");

// Discover modal
const closeDiscover = document.getElementById("closeDiscover");
const discoverLyric = document.getElementById("discoverLyric");
const discoverSongAnswer = document.getElementById("discoverSongAnswer");
const discoverArtistAnswer = document.getElementById("discoverArtistAnswer");
const submitDiscover = document.getElementById("submitDiscover");

// Listen modal
const closeListen = document.getElementById("closeListen");
const listenLinks = document.getElementById("listenLinks");

// Share modal
const closeShare = document.getElementById("closeShare");

// Postcard modal
const closePostcard = document.getElementById("closePostcard");
const postcardLyric = document.getElementById("postcardLyric");
const postcardEmotion = document.getElementById("postcardEmotion");
const postcardSong = document.getElementById("postcardSong");
const sharePostcard = document.getElementById("sharePostcard");
const listenPostcard = document.getElementById("listenPostcard");

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let currentPost = null;
let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
let userGuesses = JSON.parse(localStorage.getItem("margoGuesses") || "{}");

// ===== NAVIGATION =====
// Landing → Composer (not feed directly!)
enterBtn.onclick = () => {
  landing.classList.remove("active");
  composer.classList.remove("hidden");
  textInput.focus();
};

backBtn.onclick = () => {
  feed.classList.remove("active");
  landing.classList.add("active");
};

openComposer.onclick = () => {
  composer.classList.remove("hidden");
  textInput.focus();
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
  resetComposer();
  // Fix black screen - restore landing if no feed is showing
  if (!feed.classList.contains("active")) {
    landing.classList.add("active");
  }
};

closeGuess.onclick = () => guessModal.classList.add("hidden");
closeDiscover.onclick = () => discoverModal.classList.add("hidden");
closeShare.onclick = () => shareModal.classList.add("hidden");
closePostcard.onclick = () => postcardModal.classList.add("hidden");
closeListen.onclick = () => listenModal.classList.add("hidden");

// ===== CHARACTER COUNTER =====
textInput.oninput = () => {
  charCount.textContent = textInput.value.length;
};

// ===== MODE SELECTION =====
modeBtns.forEach(btn => {
  btn.onclick = () => {
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;

    shareInputs.classList.remove("active");
    guessInputs.classList.remove("active");
    discoverInputs.classList.remove("active");

    if (currentMode === "share") shareInputs.classList.add("active");
    if (currentMode === "guess") guessInputs.classList.add("active");
    if (currentMode === "discover") discoverInputs.classList.add("active");
  };
});

// ===== EMOTION SELECTION =====
document.querySelectorAll(".emotion-pill").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".emotion-pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion = btn.dataset.emotion;
  };
});

// ===== CREATE POST =====
postBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();

  // Validation
  if (!text) {
    showToast("Please enter a lyric");
    return;
  }

  if (!selectedEmotion) {
    showToast("Please select an emotion");
    return;
  }

  let post = {
    id: Date.now(),
    text,
    emotion: selectedEmotion,
    mode: currentMode,
    knowledge: {},
    guessConfig: null,
    timestamp: Date.now(),
    links: {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    }
  };

  // Mode-specific validation and data
  if (currentMode === "share") {
    const song = songInput.value.trim();
    const artist = artistInput.value.trim();
    
    if (!song || !artist) {
      showToast("Please enter song and artist");
      return;
    }
    
    post.knowledge = { song, artist };
  }

  if (currentMode === "guess") {
    const songAnswer = guessSongAnswer.value.trim();
    const artistAnswer = guessArtistAnswer.value.trim();
    const allowSong = guessSongCheck.checked;
    const allowArtist = guessArtistCheck.checked;
    
    if (!allowSong && !allowArtist) {
      showToast("Select at least one thing to guess");
      return;
    }
    
    if (allowSong && !songAnswer) {
      showToast("Enter the correct song title");
      return;
    }
    
    if (allowArtist && !artistAnswer) {
      showToast("Enter the correct artist");
      return;
    }
    
    post.knowledge = {
      song: songAnswer,
      artist: artistAnswer,
      hidden: true
    };
    post.guessConfig = {
      guessSong: allowSong,
      guessArtist: allowArtist
    };
  }

  if (currentMode === "discover") {
    post.knowledge = {
      song: discoverSongInput.value.trim() || null,
      artist: discoverArtistInput.value.trim() || null
    };
  }

  // Safety: prevent double-click
  if (postBtn.disabled) return;

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    await new Promise(resolve => setTimeout(resolve, 300));

    posts.unshift(post);
    localStorage.setItem("margoPosts", JSON.stringify(posts));
    
    landing.classList.remove("active");
    feed.classList.add("active");
    
    renderFeed();
    resetComposer();
    composer.classList.add("hidden");
    
    showToast("Posted!");
  } catch (err) {
    console.error("Posting failed:", err);
    showToast("Error posting");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
});

// ===== RESET COMPOSER =====
function resetComposer() {
  textInput.value = "";
  songInput.value = "";
  artistInput.value = "";
  guessSongAnswer.value = "";
  guessArtistAnswer.value = "";
  discoverSongInput.value = "";
  discoverArtistInput.value = "";
  spotifyLink.value = "";
  appleLink.value = "";
  youtubeLink.value = "";
  soundcloudLink.value = "";
  charCount.textContent = "0";
  selectedEmotion = null;
  
  document.querySelectorAll(".emotion-pill").forEach(b => b.classList.remove("active"));
  
  // Reset to share mode
  currentMode = "share";
  modeBtns.forEach(b => b.classList.remove("active"));
  modeBtns[0].classList.add("active");
  shareInputs.classList.add("active");
  guessInputs.classList.remove("active");
  discoverInputs.classList.remove("active");
  
  // Reset checkboxes
  guessSongCheck.checked = true;
  guessArtistCheck.checked = true;
}

// ===== RENDER FEED =====
function renderFeed() {
  feedList.innerHTML = "";
  
  if (posts.length === 0) {
    postCount.textContent = "0";
    feedList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">No posts yet. Be the first!</div>';
    return;
  }
  
  postCount.textContent = posts.length;

  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    
    const timeText = timeAgo(post.timestamp);
    
    let songSection = '';
    let actionsSection = '';
    
    // Check if post has streaming links
    const hasLinks = post.links && (
      post.links.spotify || 
      post.links.apple || 
      post.links.youtube || 
      post.links.soundcloud
    );
    
    if (post.mode === "share") {
      songSection = `
        <div class="feed-song">
          <div class="feed-song-title">${post.knowledge.song}</div>
          <div class="feed-song-artist">${post.knowledge.artist}</div>
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" data-action="view">View</button>
          ${hasLinks ? `<button class="feed-action" data-action="listen">Listen</button>` : ''}
          <button class="feed-action" data-action="share">Share</button>
        </div>
      `;
    } 
    else if (post.mode === "guess") {
      const hasGuessed = userGuesses[post.id];
      
      if (hasGuessed) {
        songSection = `
          <div class="feed-song">
            <div class="feed-song-title">${post.knowledge.song}</div>
            <div class="feed-song-artist">${post.knowledge.artist}</div>
          </div>
        `;
        actionsSection = `
          <div class="feed-actions">
            <button class="feed-action" data-action="view">View</button>
            ${hasLinks ? `<button class="feed-action" data-action="listen">Listen</button>` : ''}
            <button class="feed-action" data-action="share">Share</button>
          </div>
        `;
      } else {
        const guessWhat = [];
        if (post.guessConfig.guessSong) guessWhat.push("song");
        if (post.guessConfig.guessArtist) guessWhat.push("artist");
        const guessText = guessWhat.join(" & ");
        
        songSection = `
          <div class="mystery-badge">
            Guess the ${guessText}
          </div>
        `;
        actionsSection = `
          <div class="feed-actions">
            <button class="feed-action" data-action="guess">Guess</button>
            <button class="feed-action" data-action="share">Share</button>
          </div>
        `;
      }
    } 
    else if (post.mode === "discover") {
      songSection = `
        <div class="discover-badge">
          ${post.knowledge.song || post.knowledge.artist ? 
            'Maybe: ' + (post.knowledge.song || '?') + ' — ' + (post.knowledge.artist || '?') :
            'Help discover this song!'}
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" data-action="discover">Help</button>
          <button class="feed-action" data-action="share">Share</button>
        </div>
      `;
    }

    card
