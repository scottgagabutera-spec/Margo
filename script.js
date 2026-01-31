/* MARGO - Clean, Working Script */

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

// Initialize Firebase
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
    hideSong: false
  },
  {
    id: Date.now() - 300000,
    text: "Some nights I don't know if I'm healing or just getting used to the pain",
    song: "Liability",
    artist: "Lorde",
    emotions: ["Loneliness", "Heartbreak"],
    timestamp: Date.now() - 300000,
    vibes: {},
    hideSong: false
  },
  {
    id: Date.now() - 600000,
    text: "They tried to bury me but they didn't know I was a seed",
    song: "HUMBLE.",
    artist: "Kendrick Lamar",
    emotions: ["Freedom", "Hope"],
    timestamp: Date.now() - 600000,
    vibes: {},
    hideSong: false
  },
  {
    id: Date.now() - 900000,
    text: "What if I told you the version of me you fell for was just a draft?",
    song: "Good Days",
    artist: "SZA",
    emotions: ["Nostalgia", "Healing"],
    timestamp: Date.now() - 900000,
    vibes: {},
    hideSong: false
  },
  {
    id: Date.now() - 1800000,
    text: "I'm not heartless, I just learned how to use my heart less",
    song: "Heartless",
    artist: "The Weeknd",
    emotions: ["Heartbreak", "Rage"],
    timestamp: Date.now() - 1800000,
    vibes: {},
    hideSong: false
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
const songInput = document.getElementById("songInput");
const artistInput = document.getElementById("artistInput");
const hideSongCheck = document.getElementById("hideSongCheck");
const count = document.getElementById("count");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

// Modals
const postcardModal = document.getElementById("postcard");
const closePostcardBtn = document.getElementById("closePostcardBtn");
const guessModal = document.getElementById("guessModal");
const closeGuess = document.getElementById("closeGuess");
const shareModal = document.getElementById("shareModal");
const closeShare = document.getElementById("closeShare");
const listenModal = document.getElementById("listenModal");
const closeListen = document.getElementById("closeListen");

// Guess elements
const guessLyric = document.getElementById("guessLyric");
const guessSongInput = document.getElementById("guessSongInput");
const guessArtistInput = document.getElementById("guessArtistInput");
const submitGuess = document.getElementById("submitGuess");
const guessResult = document.getElementById("guessResult");

// Postcard elements
const postcardText = document.getElementById("postcardText");
const postcardEmotions = document.getElementById("postcardEmotions");
const postcardSongInfo = document.getElementById("postcardSongInfo");
const shareBtn = document.getElementById("shareBtn");
const listenBtn = document.getElementById("listenBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Platform link inputs
const spotifyLink = document.getElementById("spotifyLink");
const appleLink = document.getElementById("appleLink");
const youtubeLink = document.getElementById("youtubeLink");
const soundcloudLink = document.getElementById("soundcloudLink");

// State
let selectedEmotions = [];
let currentPost = null;
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
closeShare.onclick = () => shareModal.classList.add("hidden");
closeListen.onclick = () => listenModal.classList.add("hidden");

// Character counter
textInput.oninput = () => {
  count.textContent = textInput.value.length;
};

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
    showToast(`⏳ Wait ${remaining}s before posting again`);
    return;
  }

  const text = textInput.value.trim();
  const song = songInput.value.trim();
  const artist = artistInput.value.trim();

  if (!text) {
    showToast("✍️ Drop your line first");
    return;
  }

  if (!hideSongCheck.checked && (!song || !artist)) {
    showToast("🎵 Tag the song");
    return;
  }

  if (selectedEmotions.length === 0) {
    showToast("💭 Tag the vibe");
    return;
  }

  const post = {
    id: Date.now(),
    text,
    song: hideSongCheck.checked ? "Hidden" : song,
    artist: hideSongCheck.checked ? "Mystery Artist" : artist,
    emotions: [...selectedEmotions],
    hideSong: hideSongCheck.checked || false,
    timestamp: Date.now(),
    vibes: {},
    links: {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    }
  };

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    saveToLocalStorage(post);
    showToast("✅ Posted!");

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
    showToast("❌ Post failed");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post It";
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
  spotifyLink.value = "";
  appleLink.value = "";
  youtubeLink.value = "";
  soundcloudLink.value = "";
  count.textContent = "0";
  selectedEmotions = [];
  hideSongCheck.checked = false;
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

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
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
    feedList.innerHTML = '<div style="text-align:center;padding:80px 20px;color:var(--text-tertiary);">No posts yet. Be the first!</div>';
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
    if (post.hideSong) {
      const userGuessed = userGuesses[post.id];
      const attempts = parseInt(localStorage.getItem(`guessAttempts_${post.id}`) || '0');

      if (userGuessed) {
        songSection = `
          <div class="feed-song">
            <div class="feed-song-title">${post.song}</div>
            <div class="feed-song-artist">${post.artist}</div>
          </div>
        `;
      } else {
        songSection = `
          <div class="feed-song mystery">
            <div class="mystery-text">🎯 Can you name this track?</div>
            <button class="guess-btn" data-index="${index}">Take a Guess</button>
            ${attempts >= 3 ? `<button class="reveal-btn" data-index="${index}">Reveal Answer</button>` : ''}
          </div>
        `;
      }
    } else {
      songSection = `
        <div class="feed-song">
          <div class="feed-song-title">${post.song}</div>
          <div class="feed-song-artist">${post.artist}</div>
        </div>
      `;
    }

    const vibeCount = post.vibes ? Object.keys(post.vibes).length : 0;
    const userVibed = userVibes[post.id] || false;

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
            <span class="vibe-icon">💚</span>
            <span class="vibe-count">${vibeCount}</span>
          </button>
        </div>
      </div>
      <div class="feed-card-actions">
        <button class="feed-action" data-index="${index}" data-action="view">
          <span>👁</span>
          <span>View</span>
        </button>
        <button class="feed-action" data-index="${index}" data-action="share">
          <span>↗</span>
          <span>Share</span>
        </button>
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

  // Reveal buttons
  document.querySelectorAll(".reveal-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const post = allPosts[btn.dataset.index];
      userGuesses[post.id] = true;
      localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));
      showToast("🎵 Answer revealed!");
      renderFeed();
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
    showToast("💚 Vibed!");
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
  guessModal.classList.remove("hidden");
}

submitGuess.onclick = () => {
  if (!currentPost) return;

  const guessedSong = guessSongInput.value.trim().toLowerCase();
  const guessedArtist = guessArtistInput.value.trim().toLowerCase();
  const actualSong = currentPost.song.toLowerCase();
  const actualArtist = currentPost.artist.toLowerCase();

  const songMatch = guessedSong && (guessedSong.includes(actualSong) || actualSong.includes(guessedSong));
  const artistMatch = guessedArtist && (guessedArtist.includes(actualArtist) || actualArtist.includes(guessedArtist));

  const attemptKey = `guessAttempts_${currentPost.id}`;
  const attempts = parseInt(localStorage.getItem(attemptKey) || '0');
  localStorage.setItem(attemptKey, (attempts + 1).toString());

  guessResult.classList.remove("hidden");

  if (songMatch || artistMatch) {
    guessResult.className = "guess-result correct";
    guessResult.textContent = `🎉 Correct! "${currentPost.song}" by ${currentPost.artist}`;
    userGuesses[currentPost.id] = true;
    localStorage.setItem("margoUserGuesses", JSON.stringify(userGuesses));

    setTimeout(() => {
      guessModal.classList.add("hidden");
      renderFeed();
    }, 2000);
  } else {
    guessResult.className = "guess-result incorrect";
    const remaining = 3 - (attempts + 1);
    if (remaining > 0) {
      guessResult.textContent = `❌ Not quite. ${remaining} attempts left.`;
    } else {
      guessResult.textContent = "❌ Out of attempts. Reveal button now available.";
      setTimeout(() => {
        guessModal.classList.add("hidden");
        renderFeed();
      }, 2000);
    }
  }
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

  const text = `"${currentPost.text}"\n\n🎵 ${currentPost.song} — ${currentPost.artist}\n\nShared via MARGO`;
  const postUrl = `${window.location.origin}/?post=${currentPost.id}`;

  // For social platforms, generate image first
  if (['instagram', 'tiktok', 'twitter', 'whatsapp'].includes(platform)) {
    try {
      showToast("Generating poster...");
      const imageDataUrl = await generateSocialImage(platform);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `margo-${platform}-${currentPost.id}.png`;
      link.href = imageDataUrl;
      link.click();
      
      setTimeout(() => {
        // Copy link to clipboard for easy pasting
        navigator.clipboard.writeText(postUrl).then(() => {
          showToast(`✅ Image saved! Link copied. Share to ${platform}!`);
        }).catch(() => {
          showToast(`✅ Image saved for ${platform}!`);
        });
      }, 500);
      
    } catch (err) {
      console.error(err);
      showToast("❌ Image generation failed");
    }
  } else {
    // For other platforms, use standard sharing
    switch(platform) {
      case "native":
        if (navigator.share) {
          navigator.share({ title: "MARGO", text, url: postUrl }).catch(() => {});
        } else {
          showToast("Sharing not supported");
        }
        break;
      case "link":
        navigator.clipboard.writeText(`${text}\n\n${postUrl}`).then(() => {
          showToast("✅ Copied!");
        });
        break;
    }
  }

  shareModal.classList.add("hidden");
}

// Generate social media poster with platform-specific dimensions
async function generateSocialImage(platform) {
  const card = document.getElementById("postcardCard");
  
  // Platform-specific dimensions
  const dimensions = {
    instagram: { width: 1080, height: 1080 },  // Square post
    tiktok: { width: 1080, height: 1920 },     // Story/vertical
    twitter: { width: 1200, height: 675 },     // Twitter card
    whatsapp: { width: 1080, height: 1080 }    // Square
  };
  
  const dim = dimensions[platform] || dimensions.instagram;
  
  // Capture the card as canvas
  const htmlCanvas = await html2canvas(card, {
    backgroundColor: null,
    scale: 2,
    logging: false,
    useCORS: true
  });
  
  // Create final canvas with platform dimensions
  const canvas = document.createElement('canvas');
  canvas.width = dim.width;
  canvas.height = dim.height;
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, dim.width, dim.height);
  
  // Calculate scaling to fit card in center
  const scale = Math.min(
    (dim.width * 0.9) / htmlCanvas.width,
    (dim.height * 0.9) / htmlCanvas.height
  );
  
  const x = (dim.width - htmlCanvas.width * scale) / 2;
  const y = (dim.height - htmlCanvas.height * scale) / 2;
  
  // Draw the postcard
  ctx.drawImage(htmlCanvas, x, y, htmlCanvas.width * scale, htmlCanvas.height * scale);
  
  // Add branding at bottom
  ctx.font = 'bold 24px Inter';
  ctx.fillStyle = 'rgba(212, 197, 169, 0.3)';
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', dim.width / 2, dim.height - 40);
  
  // Add deep link URL (small, subtle)
  ctx.font = '18px Inter';
  ctx.fillStyle = 'rgba(212, 197, 169, 0.2)';
  ctx.fillText(`margo-silk.vercel.app/?post=${currentPost.id}`, dim.width / 2, dim.height - 15);
  
  return canvas.toDataURL('image/png');
}

// Listen
listenBtn.onclick = () => {
  if (!currentPost) return;
  
  postcardModal.classList.add("hidden");
  
  // Update listen buttons based on available links
  document.querySelectorAll(".listen-btn").forEach(btn => {
    const platform = btn.dataset.platform;
    const hasLink = currentPost.links && currentPost.links[platform];
    
    if (hasLink) {
      btn.disabled = false;
      btn.classList.add("has-link");
    } else {
      btn.disabled = true;
      btn.classList.remove("has-link");
    }
  });
  
  listenModal.classList.remove("hidden");
};

document.querySelectorAll(".listen-btn").forEach(btn => {
  btn.onclick = () => {
    if (btn.disabled) return;
    handleListen(btn.dataset.platform);
  };
});

function handleListen(platform) {
  if (!currentPost || !currentPost.links || !currentPost.links[platform]) {
    showToast("No link available for this platform");
    return;
  }

  // Open the link that the poster provided
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
    
    showToast("✅ Downloaded!");
  } catch (err) {
    console.error(err);
    showToast("❌ Download failed");
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

// Deep linking - open specific post if URL has ?post=ID
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  
  if (postId) {
    // Wait for feed to load
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
