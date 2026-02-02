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
postBtn.onclick = () => {
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

  // Save and display
  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  setTimeout(() => {
    posts.unshift(post);
    localStorage.setItem("margoPosts", JSON.stringify(posts));
    
    // Go to feed after posting
    landing.classList.remove("active");
    feed.classList.add("active");
    
    renderFeed(); // CRITICAL FIX - Actually render the feed!
    resetComposer();
    composer.classList.add("hidden");
    
    postBtn.disabled = false;
    postBtn.textContent = "Post";
    
    showToast("Posted!");
  }, 300);
};

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
      // Listen button shows if poster added links
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="viewPost(${index})">View</button>
          ${hasLinks ? `<button class="feed-action" onclick="openListen(${index})">Listen</button>` : ''}
          <button class="feed-action" onclick="sharePost(${index})">Share</button>
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
        // AFTER revealing - Listen button shows if poster added links
        actionsSection = `
          <div class="feed-actions">
            <button class="feed-action" onclick="viewPost(${index})">View</button>
            ${hasLinks ? `<button class="feed-action" onclick="openListen(${index})">Listen</button>` : ''}
            <button class="feed-action" onclick="sharePost(${index})">Share</button>
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
        // BEFORE revealing - no Listen button shown yet
        actionsSection = `
          <div class="feed-actions">
            <button class="feed-action" onclick="openGuess(${index})">Guess</button>
            <button class="feed-action" onclick="sharePost(${index})">Share</button>
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
      // Discover mode - no Listen (they don't know the song)
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openDiscover(${index})">Help</button>
          <button class="feed-action" onclick="sharePost(${index})">Share</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="feed-text">${post.text}</div>
      <div class="feed-emotion">${post.emotion}</div>
      ${songSection}
      <div class="feed-time">${timeText}</div>
      ${actionsSection}
    `;

    feedList.appendChild(card);
  });
}

// ===== TIME AGO =====
function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  
  if (mins < 1) return 'now';
  if (mins < 60) return mins + 'm';
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h';
  
  const days = Math.floor(hours / 24);
  return days + 'd';
}

// ===== OPEN GUESS MODAL =====
function openGuess(index) {
  currentPost = posts[index];
  
  guessLyric.textContent = currentPost.text;
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  revealAnswer.classList.add("hidden");
  submitGuess.classList.remove("hidden");
  guessInputFields.classList.remove("hidden");
  
  // Show/hide input fields based on config
  const songField = document.querySelector('#guessSongInput');
  const artistField = document.querySelector('#guessArtistInput');
  
  if (currentPost.guessConfig.guessSong) {
    songField.style.display = 'block';
  } else {
    songField.style.display = 'none';
  }
  
  if (currentPost.guessConfig.guessArtist) {
    artistField.style.display = 'block';
  } else {
    artistField.style.display = 'none';
  }
  
  // Update hint
  const guessWhat = [];
  if (currentPost.guessConfig.guessSong) guessWhat.push("song");
  if (currentPost.guessConfig.guessArtist) guessWhat.push("artist");
  guessHint.textContent = `You have ONE attempt to guess the ${guessWhat.join(" and ")}!`;
  
  guessModal.classList.remove("hidden");
}

// ===== SUBMIT GUESS (1 ATTEMPT ONLY) =====
submitGuess.onclick = () => {
  if (!currentPost) return;
  
  const guessedSong = guessSongInput.value.trim().toLowerCase();
  const guessedArtist = guessArtistInput.value.trim().toLowerCase();
  const actualSong = currentPost.knowledge.song.toLowerCase();
  const actualArtist = currentPost.knowledge.artist.toLowerCase();
  
  let songMatch = false;
  let artistMatch = false;
  let songCorrect = false;
  let artistCorrect = false;
  
  // Check song if required
  if (currentPost.guessConfig.guessSong) {
    songCorrect = guessedSong && (
      guessedSong === actualSong ||
      guessedSong.includes(actualSong) ||
      actualSong.includes(guessedSong)
    );
    songMatch = songCorrect;
  } else {
    songMatch = true; // Not being tested
  }
  
  // Check artist if required
  if (currentPost.guessConfig.guessArtist) {
    artistCorrect = guessedArtist && (
      guessedArtist === actualArtist ||
      guessedArtist.includes(actualArtist) ||
      actualArtist.includes(guessedArtist)
    );
    artistMatch = artistCorrect;
  } else {
    artistMatch = true; // Not being tested
  }
  
  // Show result
  guessResult.classList.remove("hidden");
  submitGuess.classList.add("hidden");
  
  // BOTH CORRECT
  if (songMatch && artistMatch) {
    guessResult.className = "result-message success";
    guessResult.textContent = `🎉 Correct! "${currentPost.knowledge.song}" by ${currentPost.knowledge.artist}`;
    
    userGuesses[currentPost.id] = true;
    localStorage.setItem("margoGuesses", JSON.stringify(userGuesses));
    
    guessInputFields.classList.add("hidden");
    
    setTimeout(() => {
      guessModal.classList.add("hidden");
      renderFeed();
    }, 2000);
  }
  // PARTIAL CORRECT (one right, one wrong)
  else if (songCorrect || artistCorrect) {
    guessResult.className = "result-message error";
    if (songCorrect) {
      guessResult.textContent = `🎵 Song is correct! But not the artist.`;
    } else {
      guessResult.textContent = `🎤 Artist is correct! But not the song.`;
    }
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.remove("hidden");
  }
  // BOTH WRONG
  else {
    guessResult.className = "result-message error";
    guessResult.textContent = "❌ Not quite! That was your only attempt.";
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.remove("hidden");
  }
};

// ===== REVEAL ANSWER =====
revealAnswer.onclick = () => {
  guessResult.className = "result-message success";
  guessResult.textContent = `The answer is "${currentPost.knowledge.song}" by ${currentPost.knowledge.artist}`;
  
  userGuesses[currentPost.id] = true;
  localStorage.setItem("margoGuesses", JSON.stringify(userGuesses));
  
  revealAnswer.classList.add("hidden");
  
  setTimeout(() => {
    guessModal.classList.add("hidden");
    renderFeed();
  }, 2000);
};

// ===== OPEN DISCOVER MODAL =====
function openDiscover(index) {
  currentPost = posts[index];
  
  discoverLyric.textContent = currentPost.text;
  discoverSongAnswer.value = "";
  discoverArtistAnswer.value = "";
  
  discoverModal.classList.remove("hidden");
}

// ===== SUBMIT DISCOVER =====
submitDiscover.onclick = () => {
  const song = discoverSongAnswer.value.trim();
  const artist = discoverArtistAnswer.value.trim();
  
  if (!song || !artist) {
    showToast("Please enter both song and artist");
    return;
  }
  
  currentPost.knowledge.song = song;
  currentPost.knowledge.artist = artist;
  currentPost.mode = "share";
  
  const postIndex = posts.findIndex(p => p.id === currentPost.id);
  if (postIndex !== -1) {
    posts[postIndex] = currentPost;
    localStorage.setItem("margoPosts", JSON.stringify(posts));
  }
  
  showToast("Thanks for helping!");
  discoverModal.classList.add("hidden");
  renderFeed();
};

// ===== OPEN LISTEN MODAL =====
function openListen(index) {
  currentPost = posts[index];
  
  if (!currentPost.links) {
    showToast("No streaming links available");
    return;
  }
  
  listenLinks.innerHTML = "";
  
  const platforms = [
    { name: 'Spotify', key: 'spotify', icon: '🎵' },
    { name: 'Apple Music', key: 'apple', icon: '🍎' },
    { name: 'YouTube', key: 'youtube', icon: '▶' },
    { name: 'SoundCloud', key: 'soundcloud', icon: '☁' }
  ];
  
  let hasAnyLink = false;
  
  platforms.forEach(platform => {
    if (currentPost.links[platform.key]) {
      hasAnyLink = true;
      const link = document.createElement("a");
      link.className = "listen-link";
      link.href = currentPost.links[platform.key];
      link.target = "_blank";
      link.innerHTML = `
        <span class="listen-icon">${platform.icon}</span>
        <span>${platform.name}</span>
      `;
      listenLinks.appendChild(link);
    }
  });
  
  if (!hasAnyLink) {
    listenLinks.innerHTML = '<p class="hint">No streaming links available</p>';
  }
  
  listenModal.classList.remove("hidden");
}

// ===== VIEW POST (POSTCARD) =====
function viewPost(index) {
  currentPost = posts[index];
  
  postcardLyric.textContent = currentPost.text;
  postcardEmotion.textContent = currentPost.emotion;
  postcardSong.innerHTML = `
    <div>${currentPost.knowledge.song || 'Unknown Song'}</div>
    <div>${currentPost.knowledge.artist || 'Unknown Artist'}</div>
  `;
  
  // Show/hide Listen button based on whether links exist
  const hasLinks = currentPost.links && (
    currentPost.links.spotify || 
    currentPost.links.apple || 
    currentPost.links.youtube || 
    currentPost.links.soundcloud
  );
  
  if (hasLinks) {
    listenPostcard.style.display = 'block';
  } else {
    listenPostcard.style.display = 'none';
  }
  
  postcardModal.classList.remove("hidden");
}

// Listen from postcard
listenPostcard.onclick = () => {
  const postIndex = posts.findIndex(p => p.id === currentPost.id);
  if (postIndex !== -1) {
    postcardModal.classList.add("hidden");
    openListen(postIndex);
  }
};

// ===== SHARE POST =====
function sharePost(index) {
  currentPost = posts[index];
  shareModal.classList.remove("hidden");
}

sharePostcard.onclick = () => {
  postcardModal.classList.add("hidden");
  shareModal.classList.remove("hidden");
};

// Share actions
document.querySelectorAll(".share-btn").forEach(btn => {
  btn.onclick = () => {
    const action = btn.dataset.action;
    
    if (action === "copy") {
      const url = window.location.origin + "/?post=" + currentPost.id;
      navigator.clipboard.writeText(url).then(() => {
        showToast("Link copied!");
        shareModal.classList.add("hidden");
      });
    } 
    else if (action === "native") {
      if (navigator.share) {
        const text = `"${currentPost.text}"\n\n${currentPost.knowledge.song || 'Unknown'} — ${currentPost.knowledge.artist || 'Unknown'}\n\nShared via MARGO`;
        navigator.share({
          title: "MARGO",
          text: text,
          url: window.location.origin + "/?post=" + currentPost.id
        }).catch(() => {});
        shareModal.classList.add("hidden");
      } else {
        showToast("Sharing not supported on this device");
      }
    }
  };
});

// ===== TOAST NOTIFICATION =====
function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===== INITIALIZE =====
console.log("MARGO loaded. Posts:", posts.length);

// Deep linking
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  
  if (postId) {
    const postIndex = posts.findIndex(p => p.id == postId);
    if (postIndex !== -1) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
      setTimeout(() => viewPost(postIndex), 500);
    }
  }
});
