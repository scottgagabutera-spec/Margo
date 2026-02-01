/* MARGO v4.0 - Improved Logic & UX */

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM",
  authDomain: "margo-f6da4.firebaseapp.com",
  databaseURL: "https://margo-f6da4-default-rtdb.firebaseio.com",
  projectId: "margo-f6da4",
  storageBucket: "margo-f6da4.firebasestorage.app",
  messagingSenderId: "150183564620",
  appId: "1:150183564620:web:a42de7fef39740b551ebe9"
};

let db = null;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log("✅ Firebase connected");
  }
} catch (error) {
  console.warn("⚠️ Firebase init failed:", error);
}

// Seed Posts
const SEED_POSTS = [
  {
    id: Date.now() - 120000,
    text: "I'm still learning to love the parts of me nobody claps for",
    song: "Self Love",
    artist: "Metro Boomin",
    emotions: ["Healing", "Hope"],
    timestamp: Date.now() - 120000,
    vibes: {},
    mode: "normal",
    links: {
      spotify: "https://open.spotify.com/track/example1",
      apple: null,
      youtube: null,
      soundcloud: null
    }
  },
  {
    id: Date.now() - 300000,
    text: "Some nights I don't know if I'm healing or just getting used to the pain",
    song: "Liability",
    artist: "Lorde",
    emotions: ["Loneliness", "Heartbreak"],
    timestamp: Date.now() - 300000,
    vibes: {},
    mode: "normal",
    links: { spotify: null, apple: null, youtube: null, soundcloud: null }
  }
];

// Elements
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const composer = document.getElementById("composer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");
const textInput = document.getElementById("textInput");
const count = document.getElementById("count");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

// Mode elements
const modeBtns = document.querySelectorAll(".mode-btn");
const normalInputs = document.getElementById("normalInputs");
const guessInputs = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");

// Normal mode inputs
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

// Platform links
const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

// Modals
const postcardModal = document.getElementById("postcard");
const closePostcardBtn = document.getElementById("closePostcardBtn");
const guessModal = document.getElementById("guessModal");
const closeGuess = document.getElementById("closeGuess");
const discoverModal = document.getElementById("discoverModal");
const closeDiscover = document.getElementById("closeDiscover");
const shareModal = document.getElementById("shareModal");
const closeShare = document.getElementById("closeShare");
const listenModal = document.getElementById("listenModal");
const closeListen = document.getElementById("closeListen");

// Guess modal elements
const guessLyric = document.getElementById("guessLyric");
const guessHint = document.getElementById("guessHint");
const guessSongInput = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const guessSongField = document.getElementById("guessSongField");
const guessArtistField = document.getElementById("guessArtistField");
const submitGuess = document.getElementById("submitGuess");
const guessResult = document.getElementById("guessResult");
const guessActions = document.getElementById("guessActions");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const revealAnswerBtn = document.getElementById("revealAnswerBtn");

// Discover modal elements
const discoverLyric = document.getElementById("discoverLyric");
const discoverSongInputModal = document.getElementById("discoverSongInputModal");
const discoverArtistInputModal = document.getElementById("discoverArtistInputModal");
const helpDiscoverBtn = document.getElementById("helpDiscoverBtn");
const remindMeBtn = document.getElementById("remindMeBtn");

// Postcard elements
const postcardText = document.getElementById("postcardText");
const postcardEmotions = document.getElementById("postcardEmotions");
const postcardSongInfo = document.getElementById("postcardSongInfo");
const shareBtn = document.getElementById("shareBtn");
const listenBtn = document.getElementById("listenBtn");
const downloadBtn = document.getElementById("downloadBtn");

// State
let selectedEmotions = [];
let currentPost = null;
let currentMode = "normal";
let allPosts = [];
let userVibes = {};
let userGuesses = {};

// Rate limiting
const POST_COOLDOWN = 30000;
function getLastPostTime() {
  return parseInt(localStorage.getItem("margoLastPostTime") || "0");
}
function setLastPostTime(time) {
  localStorage.setItem("margoLastPostTime", time.toString());
}

// Navigation
function showLanding() {
  landing.classList.add("active");
  feed.classList.remove("active");
}

function showFeed() {
  landing.classList.remove("active");
  feed.classList.add("active");
  updatePostCount();
}

function updatePostCount() {
  if (postCount) postCount.textContent = allPosts.length;
}

// Swipe Navigation
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
  const delta = touchEndX - touchStartX;
  if (Math.abs(delta) > 50) {
    if (delta > 0 && landing.classList.contains('active')) {
      showFeed();
    } else if (delta < 0 && feed.classList.contains('active')) {
      showLanding();
    }
  }
}

[landing, feed].forEach(screen => {
  screen.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  
  screen.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
});

// Button listeners
enterBtn.onclick = () => {
  composer.classList.remove("hidden");
  textInput.focus();
};

backBtn.onclick = () => showLanding();

openComposer.onclick = () => {
  composer.classList.remove("hidden");
  textInput.focus();
};

closeComposer.onclick = () => {
  composer.classList.add("hidden");
  resetComposer();
};

closePostcardBtn.onclick = () => postcardModal.classList.add("hidden");
closeGuess.onclick = () => guessModal.classList.add("hidden");
closeDiscover.onclick = () => discoverModal.classList.add("hidden");
closeShare.onclick = () => shareModal.classList.add("hidden");
closeListen.onclick = () => listenModal.classList.add("hidden");

// Character counter
textInput.oninput = () => {
  count.textContent = textInput.value.length;
};

// Mode selection
modeBtns.forEach(btn => {
  btn.onclick = () => {
    // Remove active from all
    modeBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Get selected mode
    currentMode = btn.dataset.mode;
    
    // Hide all input sections
    normalInputs.classList.remove("active");
    guessInputs.classList.remove("active");
    discoverInputs.classList.remove("active");
    
    // Show appropriate section
    if (currentMode === "normal") {
      normalInputs.classList.add("active");
    } else if (currentMode === "guess") {
      guessInputs.classList.add("active");
    } else if (currentMode === "discover") {
      discoverInputs.classList.add("active");
    }
  };
});

// Emotion pills
document.querySelectorAll(".emotion-pill").forEach(pill => {
  pill.onclick = () => {
    const emotion = pill.dataset.emotion;
    if (selectedEmotions.includes(emotion)) {
      selectedEmotions = selectedEmotions.filter(e => e !== emotion);
      pill.classList.remove("active");
    } else {
      selectedEmotions.push(emotion);
      pill.classList.add("active");
    }
  };
});

// Create post
postBtn.onclick = async () => {
  const lastPostTime = getLastPostTime();
  const now = Date.now();
  if (now - lastPostTime < POST_COOLDOWN) {
    const remaining = Math.ceil((POST_COOLDOWN - (now - lastPostTime)) / 1000);
    showToast(`Wait ${remaining}s before posting again`);
    return;
  }

  const text = textInput.value.trim();

  if (!text) {
    showToast("Drop your lyric first");
    return;
  }

  if (selectedEmotions.length === 0) {
    showToast("Tag the vibe");
    return;
  }

  let post = {
    id: Date.now(),
    text,
    emotions: [...selectedEmotions],
    timestamp: Date.now(),
    vibes: {},
    mode: currentMode,
    links: {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    }
  };

  // Handle different modes
  if (currentMode === "normal") {
    const song = songInput.value.trim();
    const artist = artistInput.value.trim();
    
    if (!song || !artist) {
      showToast("Enter song title and artist");
      return;
    }
    
    post.song = song;
    post.artist = artist;
    
  } else if (currentMode === "guess") {
    const songAnswer = guessSongAnswer.value.trim();
    const artistAnswer = guessArtistAnswer.value.trim();
    const allowGuessSong = guessSongCheck.checked;
    const allowGuessArtist = guessArtistCheck.checked;
    
    if (!allowGuessSong && !allowGuessArtist) {
      showToast("Select at least one thing to guess");
      return;
    }
    
    if (allowGuessSong && !songAnswer) {
      showToast("Enter the song title answer");
      return;
    }
    
    if (allowGuessArtist && !artistAnswer) {
      showToast("Enter the artist name answer");
      return;
    }
    
    post.song = songAnswer;
    post.artist = artistAnswer;
    post.guessConfig = {
      allowGuessSong,
      allowGuessArtist
    };
    
  } else if (currentMode === "discover") {
    const song = discoverSongInput.value.trim();
    const artist = discoverArtistInput.value.trim();
    
    post.song = song || "Unknown Song";
    post.artist = artist || "Unknown Artist";
  }

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    saveToLocalStorage(post);
    showToast("Posted!");

    if (db) {
      db.ref('posts').push(post).catch(err => {
        console.warn("Firebase sync failed:", err);
      });
    }

    setLastPostTime(Date.now());
    resetComposer();
    composer.classList.add("hidden");
    showFeed();

    setTimeout(() => feedList.scrollTop = 0, 100);
  } catch (error) {
    console.error("Post error:", error);
    showToast("Post failed");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Drop It";
  }
};

function saveToLocalStorage(post) {
  let posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
  posts.unshift(post);
  localStorage.setItem("margoPosts", JSON.stringify(posts));
  allPosts = posts;
  renderFeed();
}

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
  count.textContent = "0";
  selectedEmotions = [];
  
  // Reset mode to normal
  currentMode = "normal";
  modeBtns.forEach(b => b.classList.remove("active"));
  modeBtns[0].classList.add("active");
  normalInputs.classList.add("active");
  guessInputs.classList.remove("active");
  discoverInputs.classList.remove("active");
  
  // Reset checkboxes
  guessSongCheck.checked = true;
  guessArtistCheck.checked = true;
  
  document.querySelectorAll(".emotion-pill").forEach(pill => {
    pill.classList.remove("active");
  });
}

// Time ago
function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

// Init feed
function initFeed() {
  const localPosts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
  allPosts = localPosts.length > 0 ? localPosts : [...SEED_POSTS];
  renderFeed();
  updatePostCount();
  
  userVibes = JSON.parse(localStorage.getItem("margoUserVibes") || "{}");
  userGuesses = JSON.parse(localStorage.getItem("margoUserGuesses") || "{}");

  if (db) {
    db.ref('posts').limitToLast(50).on('value', (snapshot) => {
      const firebasePosts = [];
      snapshot.forEach((child) => {
        firebasePosts.push({ firebaseId: child.key, ...child.val() });
      });
      firebasePosts.reverse();

      const allPostsMap = new Map();
      firebasePosts.forEach(post => allPostsMap.set(post.id, post));
      localPosts.forEach(post => allPostsMap.set(post.id, post));
      
      allPosts = Array.from(allPostsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      renderFeed();
      updatePostCount();
    });
  }
}

// Render feed
function renderFeed() {
  feedList.innerHTML = "";

  if (allPosts.length === 0) {
    feedList.innerHTML = '<div style="text-align:center;padding:80px 20px;color:var(--text-tertiary);font-size:0.9rem;">No posts yet. Be the first!</div>';
    return;
  }

  allPosts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";

    const timeText = timeAgo(post.timestamp);
    const emotionTags = post.emotions.map(e =>
      `<span class="feed-emotion" data-emotion="${e}">${e}</span>`
    ).join("");

    let songSection = '';
    
    if (post.mode === "discover") {
      songSection = `
        <div class="feed-song discover">
          <div class="discover-text">Wants to discover this song</div>
          <button class="help-discover-btn" data-index="${index}">Help Discover</button>
        </div>
      `;
    } else if (post.mode === "guess") {
      const userGuessed = userGuesses[post.id];

      if (userGuessed) {
        // Show the answer after successful guess
        songSection = `
          <div class="feed-song">
            <div class="feed-song-title">${post.song}</div>
            <div class="feed-song-artist">${post.artist}</div>
          </div>
        `;
      } else {
        // Show guess challenge
        const guessWhat = [];
        if (post.guessConfig.allowGuessSong) guessWhat.push("song");
        if (post.guessConfig.allowGuessArtist) guessWhat.push("artist");
        const guessText = guessWhat.join(" and ");
        
        songSection = `
          <div class="feed-song mystery">
            <div class="mystery-text">Guess the ${guessText}</div>
            <button class="guess-btn" data-index="${index}">Take the Challenge</button>
          </div>
        `;
      }
    } else {
      // Normal mode
      songSection = `
        <div class="feed-song">
          <div class="feed-song-title">${post.song}</div>
          <div class="feed-song-artist">${post.artist}</div>
        </div>
      `;
    }

    const vibeCount = post.vibes ? Object.keys(post.vibes).length : 0;
    const userVibed = userVibes[post.id] || false;
    
    const hasAnyLink = post.links && (post.links.spotify || post.links.apple || post.links.youtube || post.links.soundcloud);

    card.innerHTML = `
      <div class="feed-card-header">
        <div class="feed-time">${timeText}</div>
      </div>
      <div class="feed-card-content">
        <p class="feed-text">${post.text}</p>
        <div class="feed-emotions">${emotionTags}</div>
        ${songSection}
        <div class="vibe-counter">
          <button class="vibe-btn ${userVibed ? 'active' : ''}" data-index="${index}">
            <span class="vibe-icon">♥</span>
            <span class="vibe-count">${vibeCount}</span>
          </button>
        </div>
      </div>
      <div class="feed-card-actions">
        ${hasAnyLink ? `<button class="feed-action" data-index="${index}" data-action="listen"><span class="feed-action-icon">♫</span><span>Listen</span></button>` : ''}
        <button class="feed-action" data-index="${index}" data-action="view"><span class="feed-action-icon">•</span><span>View</span></button>
        <button class="feed-action" data-index="${index}" data-action="share"><span class="feed-action-icon">↗</span><span>Share</span></button>
      </div>
    `;

    feedList.appendChild(card);
  });

  attachListeners();
}

function attachListeners() {
  // Feed actions
  document.querySelectorAll(".feed-action").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const index = btn.dataset.index;
      const action = btn.dataset.action;
      const post = allPosts[index];
      
      if (action === "view") {
        showPostcard(post);
      } else if (action === "share") {
        currentPost = post;
        shareModal.classList.remove("hidden");
      } else if (action === "listen") {
        currentPost = post;
        handleListenFromFeed(post);
      }
    };
  });

  // Vibe buttons
  document.querySelectorAll(".vibe-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const index = btn.dataset.index;
      toggleVibe(allPosts[index], btn);
    };
  });

  // Guess buttons
  document.querySelectorAll(".guess-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const post = allPosts[btn.dataset.index];
      openGuessModal(post);
    };
  });

  // Help discover buttons
  document.querySelectorAll(".help-discover-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const post = allPosts[btn.dataset.index];
      openDiscoverModal(post);
    };
  });
}

// Vibe system
function toggleVibe(post, button) {
  const postId = post.id;
  const userId = getUserId();

  if (!post.vibes) post.vibes = {};

  if (userVibes[postId]) {
    delete userVibes[postId];
    delete post.vibes[userId];
    button.classList.remove('active');
  } else {
    userVibes[postId] = true;
    post.vibes[userId] = true;
    button.classList.add('active');
    showToast("Vibed!");
  }

  localStorage.setItem("margoUserVibes", JSON.stringify(userVibes));

  const count = Object.keys(post.vibes).length;
  button.querySelector('.vibe-count').textContent = count;
}

function getUserId() {
  let userId = localStorage.getItem("margoUserId");
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("margoUserId", userId);
  }
  return userId;
}

// Guess modal
function openGuessModal(post) {
  currentPost = post;
  guessLyric.textContent = post.text;
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  guessActions.classList.add("hidden");
  submitGuess.style.display = "block";
  
  // Show/hide input fields based on what needs to be guessed
  if (post.guessConfig.allowGuessSong) {
    guessSongField.style.display = "flex";
  } else {
    guessSongField.style.display = "none";
  }
  
  if (post.guessConfig.allowGuessArtist) {
    guessArtistField.style.display = "flex";
  } else {
    guessArtistField.style.display = "none";
  }
  
  // Update hint
  const guessWhat = [];
  if (post.guessConfig.allowGuessSong) guessWhat.push("song");
  if (post.guessConfig.allowGuessArtist) guessWhat.push("artist");
  guessHint.textContent = `Guess the ${guessWhat.join(" and ")}. You have 1 attempt!`;
  
  guessModal.classList.remove("hidden");
}

submitGuess.onclick = () => {
  if (!currentPost) return;

  const guessedSong = guessSongInput.value.trim().toLowerCase();
  const guessedArtist = guessArtistInput.value.trim().toLowerCase();
  const actualSong = currentPost.song.toLowerCase();
  const actualArtist = currentPost.artist.toLowerCase();

  const allowGuessSong = currentPost.guessConfig.allowGuessSong;
  const allowGuessArtist = currentPost.guessConfig.allowGuessArtist;

  let songMatch = false;
  let artistMatch = false;

  if (allowGuessSong) {
    songMatch = guessedSong && (
      guessedSong === actualSong || 
      guessedSong.includes(actualSong) || 
      actualSong.includes(guessedSong)
    );
  } else {
    songMatch = true; // Not being tested
  }

  if (allowGuessArtist) {
    artistMatch = guessedArtist && (
      guessedArtist === actualArtist || 
      guessedArtist.includes(actualArtist) || 
      actualArtist.includes(guessedArtist)
    );
  } else {
    artistMatch = true; // Not being tested
  }

  guessResult.classList.remove("hidden");
  submitGuess.style.display = "none";

  if (songMatch && artistMatch) {
    // Perfect match!
    guessResult.className = "guess-result correct";
    let message = "Perfect! ";
    if (allowGuessSong && allowGuessArtist) {
      message += `"${currentPost.song}" by ${currentPost.artist}`;
    } else if (allowGuessSong) {
      message += `The song is "${currentPost.song}"`;
    } else {
      message += `The artist is ${currentPost.artist}`;
    }
    guessResult.textContent = message;
    
    userGuesses[currentPost.id] = true;
    localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));

    setTimeout(() => {
      guessModal.classList.add("hidden");
      renderFeed();
    }, 2500);
  } else {
    // Wrong answer
    guessResult.className = "guess-result incorrect";
    guessResult.textContent = "Not quite! Try again or reveal the answer.";
    guessActions.classList.remove("hidden");
  }
};

tryAgainBtn.onclick = () => {
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  guessActions.classList.add("hidden");
  submitGuess.style.display = "block";
};

revealAnswerBtn.onclick = () => {
  const allowGuessSong = currentPost.guessConfig.allowGuessSong;
  const allowGuessArtist = currentPost.guessConfig.allowGuessArtist;
  
  let message = "The answer is: ";
  if (allowGuessSong && allowGuessArtist) {
    message += `"${currentPost.song}" by ${currentPost.artist}`;
  } else if (allowGuessSong) {
    message += `"${currentPost.song}"`;
  } else {
    message += `${currentPost.artist}`;
  }
  
  guessResult.className = "guess-result correct";
  guessResult.textContent = message;
  guessActions.classList.add("hidden");
  
  userGuesses[currentPost.id] = true;
  localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));

  setTimeout(() => {
    guessModal.classList.add("hidden");
    renderFeed();
  }, 2500);
};

// Discover modal
function openDiscoverModal(post) {
  currentPost = post;
  discoverLyric.textContent = post.text;
  discoverSongInputModal.value = "";
  discoverArtistInputModal.value = "";
  discoverModal.classList.remove("hidden");
}

helpDiscoverBtn.onclick = () => {
  const song = discoverSongInputModal.value.trim();
  const artist = discoverArtistInputModal.value.trim();

  if (!song || !artist) {
    showToast("Enter both song and artist");
    return;
  }

  currentPost.song = song;
  currentPost.artist = artist;
  currentPost.mode = "normal";

  const posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
  const postIndex = posts.findIndex(p => p.id === currentPost.id);
  if (postIndex !== -1) {
    posts[postIndex] = currentPost;
    localStorage.setItem("margoPosts", JSON.stringify(posts));
  }

  showToast("Thanks for helping!");
  discoverModal.classList.add("hidden");
  renderFeed();
};

remindMeBtn.onclick = () => {
  showToast("We'll remind you!");
  discoverModal.classList.add("hidden");
};

// Postcard
function showPostcard(post) {
  currentPost = post;
  postcardText.textContent = post.text;
  
  postcardEmotions.innerHTML = "";
  post.emotions.forEach(e => {
    const tag = document.createElement("span");
    tag.textContent = e;
    postcardEmotions.appendChild(tag);
  });

  postcardSongInfo.innerHTML = `
    <div class="card-song-title">${post.song}</div>
    <div class="card-song-artist">${post.artist}</div>
  `;

  postcardModal.classList.remove("hidden");
}

// Listen from feed
function handleListenFromFeed(post) {
  currentPost = post;
  
  document.querySelectorAll(".listen-btn").forEach(btn => {
    const platform = btn.dataset.platform;
    const hasLink = post.links && post.links[platform];
    
    if (hasLink) {
      btn.disabled = false;
      btn.classList.add("has-link");
    } else {
      btn.disabled = true;
      btn.classList.remove("has-link");
    }
  });
  
  listenModal.classList.remove("hidden");
}

// Share
shareBtn.onclick = () => {
  postcardModal.classList.add("hidden");
  shareModal.classList.remove("hidden");
};

document.querySelectorAll(".share-btn").forEach(btn => {
  btn.onclick = async () => {
    const platform = btn.dataset.platform;
    await handleShare(platform);
  };
});

async function handleShare(platform) {
  if (!currentPost) return;

  const postUrl = `${window.location.origin}/?post=${currentPost.id}`;

  if (['instagram', 'tiktok', 'twitter', 'whatsapp'].includes(platform)) {
    try {
      showToast("Generating poster...");
      const imageDataUrl = await generateSocialImage(platform, postUrl);
      
      const link = document.createElement('a');
      link.download = `margo-${platform}-${currentPost.id}.png`;
      link.href = imageDataUrl;
      link.click();
      
      setTimeout(() => {
        navigator.clipboard.writeText(postUrl).then(() => {
          showToast(`Poster saved! Link copied.`);
        }).catch(() => {
          showToast(`Poster saved for ${platform}!`);
        });
      }, 500);
      
    } catch (err) {
      console.error(err);
      showToast("Image generation failed");
    }
  } else {
    const text = `"${currentPost.text}"\n\n${currentPost.song} — ${currentPost.artist}\n\nShared via MARGO`;
    
    switch(platform) {
      case "native":
        if (navigator.share) {
          navigator.share({ title: "MARGO", text, url: postUrl }).catch(() => {});
        } else {
          showToast("Sharing not supported");
        }
        break;
      case "link":
        navigator.clipboard.writeText(postUrl).then(() => {
          showToast("Link copied!");
        });
        break;
    }
  }

  shareModal.classList.add("hidden");
}

async function generateSocialImage(platform, deepLink) {
  const card = document.getElementById("postcardCard");
  
  const dimensions = {
    instagram: { width: 1080, height: 1080 },
    tiktok: { width: 1080, height: 1920 },
    twitter: { width: 1200, height: 675 },
    whatsapp: { width: 1080, height: 1080 }
  };
  
  const dim = dimensions[platform] || dimensions.instagram;
  
  const htmlCanvas = await html2canvas(card, {
    backgroundColor: null,
    scale: 2,
    logging: false,
    useCORS: true
  });
  
  const canvas = document.createElement('canvas');
  canvas.width = dim.width;
  canvas.height = dim.height;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, dim.width, dim.height);
  
  const scale = Math.min(
    (dim.width * 0.85) / htmlCanvas.width,
    (dim.height * 0.85) / htmlCanvas.height
  );
  
  const x = (dim.width - htmlCanvas.width * scale) / 2;
  const y = (dim.height - htmlCanvas.height * scale) / 2;
  
  ctx.drawImage(htmlCanvas, x, y, htmlCanvas.width * scale, htmlCanvas.height * scale);
  
  ctx.font = 'bold 32px DM Sans, Arial';
  ctx.fillStyle = '#d4af37';
  ctx.textAlign = 'center';
  ctx.fillText('Click link to view', dim.width / 2, dim.height - 100);
  
  ctx.font = 'bold 28px DM Sans, Arial';
  ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
  ctx.fillText(deepLink, dim.width / 2, dim.height - 60);
  
  ctx.font = 'bold 24px DM Sans, Arial';
  ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
  ctx.fillText('MARGO', dim.width / 2, dim.height - 20);
  
  return canvas.toDataURL('image/png');
}

// Listen
listenBtn.onclick = () => {
  if (!currentPost) return;
  postcardModal.classList.add("hidden");
  handleListenFromFeed(currentPost);
};

document.querySelectorAll(".listen-btn").forEach(btn => {
  btn.onclick = () => {
    if (btn.disabled) return;
    handleListenPlatform(btn.dataset.platform);
  };
});

function handleListenPlatform(platform) {
  if (!currentPost || !currentPost.links || !currentPost.links[platform]) {
    showToast("No link available");
    return;
  }

  window.open(currentPost.links[platform], "_blank");
  listenModal.classList.add("hidden");
}

// Download
downloadBtn.onclick = async () => {
  if (!currentPost) return;
  
  try {
    const card = document.getElementById("postcardCard");
    const canvas = await html2canvas(card, {
      backgroundColor: null,
      scale: 2
    });

    const link = document.createElement("a");
    link.download = `margo-${currentPost.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    showToast("Downloaded!");
  } catch (err) {
    console.error(err);
    showToast("Download failed");
  }
};

// Toast
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

// Initialize
showLanding();
initFeed();

// Deep linking
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  
  if (postId) {
    setTimeout(() => {
      const post = allPosts.find(p => p.id == postId);
      if (post) {
        showFeed();
        setTimeout(() => {
          showPostcard(post);
        }, 300);
      }
    }, 500);
  }
});
