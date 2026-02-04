/* MARGO - Firebase Real-Time Sync Edition - WITH SCROLL PRESERVATION & LIVE UPDATES - IMPROVED */
/* CONTENT MODERATION: Two-tier system with partial censoring and zero-tolerance blocking */

// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
  apiKey: "AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM",
  authDomain: "margo-f6da4.firebaseapp.com",
  databaseURL: "https://margo-f6da4-default-rtdb.firebaseio.com",
  projectId: "margo-f6da4",
  storageBucket: "margo-f6da4.firebasestorage.app",
  messagingSenderId: "150183564620",
  appId: "1:150183564620:web:a42de7fef39740b551ebe9"
};

// ===== APP BASE URL (UPDATE THIS WITH YOUR ACTUAL DOMAIN) =====
const APP_BASE_URL = window.location.origin;

let isFirebaseEnabled = false;
let postsRef = null;
let analyticsRef = null;

try {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  postsRef = database.ref('posts');
  analyticsRef = database.ref('analytics');
  isFirebaseEnabled = true;
  console.log('✓ Firebase initialized successfully');
} catch (error) {
  console.warn('⚠ Firebase not configured. Using localStorage only.', error.message);
  isFirebaseEnabled = false;
}

// ===== CONTENT MODERATION SYSTEM =====

// Partial censor list - middle letters replaced with **
const autoCensorList = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fucks',
  'shit', 'shitting', 'shitty', 'shits',
  'ass', 'asshole', 'asses',
  'bitch', 'bitches', 'bitching',
  'damn', 'damned',
  'hell',
  'crap', 'crappy',
  'dick', 'dicks',
  'cock', 'cocks',
  'pussy', 'pussies',
  'whore', 'whores',
  'slut', 'sluts', 'slutty',
  'bastard', 'bastards',
  'piss', 'pissed', 'pissing'
];

// Zero-tolerance list - blocks post entirely (no explicit display in code)
const zeroToleranceList = [
  'nigger', 'nigga', 'nig', 'negro',
  'faggot', 'fag', 'dyke',
  'tranny', 'trannie', 'shemale',
  'retard', 'retarded', 'retards',
  'chink', 'gook', 'zipperhead',
  'spic', 'beaner', 'wetback',
  'kike', 'hymie',
  'towelhead', 'sandnigger', 'raghead',
  'coon', 'jigaboo', 'porch monkey',
  'cracker', 'honkey', 'whitey'
];

/**
 * Normalizes text to catch variations and bypass attempts
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/0/g, 'o')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\*/g, '') // Remove existing asterisks
    .replace(/[^a-z]/g, ''); // Remove all non-letter characters
}

/**
 * Partially censors a word by keeping first and last letter
 */
function partialCensor(word) {
  if (word.length <= 2) return '**';
  if (word.length === 3) return word[0] + '*' + word[2];
  
  const firstLetter = word[0];
  const lastLetter = word[word.length - 1];
  return firstLetter + '**' + lastLetter;
}

/**
 * Main moderation function
 * Returns: { allowed: boolean, cleanText: string, reason?: string }
 */
function moderateText(text) {
  // Check zero-tolerance words first
  const normalized = normalizeText(text);
  
  for (const slur of zeroToleranceList) {
    if (normalized.includes(slur)) {
      return {
        allowed: false,
        cleanText: text,
        reason: 'Please keep MARGO respectful and inclusive.'
      };
    }
  }
  
  // Apply partial censoring to profanity
  let cleanText = text;
  const words = text.split(/\b/); // Split on word boundaries
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const normalizedWord = normalizeText(word);
    
    for (const profanity of autoCensorList) {
      if (normalizedWord === profanity || normalizedWord.includes(profanity)) {
        words[i] = partialCensor(word);
        break;
      }
    }
  }
  
  cleanText = words.join('');
  
  return {
    allowed: true,
    cleanText: cleanText
  };
}

// ===== ELEMENTS =====
const landing = document.getElementById("landing");
const feed = document.getElementById("feed");
const composer = document.getElementById("composer");
const guessModal = document.getElementById("guessModal");
const discoverModal = document.getElementById("discoverModal");
const postcardModal = document.getElementById("postcardModal");
const listenModal = document.getElementById("listenModal");
const analyticsModal = document.getElementById("analyticsModal");
const sharePosterModal = document.getElementById("sharePosterModal");

const enterBtn = document.getElementById("enterBtn");
const backBtn = document.getElementById("backBtn");
const openComposer = document.getElementById("openComposer");
const closeComposer = document.getElementById("closeComposer");
const postBtn = document.getElementById("postBtn");

const textInput = document.getElementById("textInput");
const charCount = document.getElementById("charCount");
const feedList = document.getElementById("feedList");
const postCount = document.getElementById("postCount");

// NEW: Live feed elements
const newPostsIndicator = document.getElementById("newPostsIndicator");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

// Mode
const modeBtns = document.querySelectorAll(".mode-btn");
const shareInputs = document.getElementById("shareInputs");
const guessInputs = document.getElementById("guessInputs");
const discoverInputs = document.getElementById("discoverInputs");
const streamingSection = document.getElementById("streamingSection");

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
const guessLinksSection = document.getElementById("guessLinksSection");

// Discover modal
const closeDiscover = document.getElementById("closeDiscover");
const discoverLyric = document.getElementById("discoverLyric");
const discoverSongAnswer = document.getElementById("discoverSongAnswer");
const discoverArtistAnswer = document.getElementById("discoverArtistAnswer");
const submitDiscover = document.getElementById("submitDiscover");
const discoverSpotifyLink = document.getElementById("discoverSpotifyLink");
const discoverAppleLink = document.getElementById("discoverAppleLink");
const discoverYoutubeLink = document.getElementById("discoverYoutubeLink");
const discoverSoundcloudLink = document.getElementById("discoverSoundcloudLink");

// Listen modal
const closeListen = document.getElementById("closeListen");
const listenLinks = document.getElementById("listenLinks");

// Postcard modal
const closePostcard = document.getElementById("closePostcard");
const postcardLyric = document.getElementById("postcardLyric");
const postcardEmotion = document.getElementById("postcardEmotion");
const postcardSong = document.getElementById("postcardSong");
const sharePosterBtn = document.getElementById("sharePosterBtn");
const listenPostcard = document.getElementById("listenPostcard");
const analyticsBtn = document.getElementById("analyticsBtn");

// Analytics modal
const closeAnalytics = document.getElementById("closeAnalytics");
const statViews = document.getElementById("statViews");
const statGuesses = document.getElementById("statGuesses");
const statHelps = document.getElementById("statHelps");
const guessesSection = document.getElementById("guessesSection");
const helpsSection = document.getElementById("helpsSection");
const guessesList = document.getElementById("guessesList");
const helpsList = document.getElementById("helpsList");

// Share Poster modal
const closeSharePoster = document.getElementById("closeSharePoster");
const designStep = document.getElementById("designStep");
const platformStep = document.getElementById("platformStep");
const shareStep = document.getElementById("shareStep");
const nextToPlatform = document.getElementById("nextToPlatform");
const backToDesign = document.getElementById("backToDesign");
const backToPlatform = document.getElementById("backToPlatform");
const posterCanvas = document.getElementById("posterCanvas");
const posterPreviewCanvas = document.getElementById("posterPreviewCanvas");
const shareableLink = document.getElementById("shareableLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const shareNativeBtn = document.getElementById("shareNativeBtn");
const downloadManualBtn = document.getElementById("downloadManualBtn");

// ===== STATE =====
let currentMode = "share";
let selectedEmotion = null;
let currentPost = null;
let currentGuessAttempts = 0;
const MAX_GUESS_ATTEMPTS = 2;

let selectedDesign = "midnight-gold";
let selectedPosterSize = null;
let generatedPosterBlob = null;

// Local data (will sync with Firebase)
let posts = [];
let postAnalytics = {};

// NEW: Scroll position tracking
let savedScrollPosition = 0;
let lastPostCount = 0;
let newPostsAvailable = false;

// ===== PER-USER TRACKING =====
let userId = localStorage.getItem("margoUserId");
if (!userId) {
  userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("margoUserId", userId);
}

// ===== FIREBASE REAL-TIME SYNC =====
let postsLoaded = false;

if (isFirebaseEnabled) {
  // Listen for posts changes
  postsRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
    const previousPostCount = posts.length;
    posts = [];
    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val();
      post.id = childSnapshot.key;
      posts.unshift(post);
    });
    
    posts.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log('📡 Posts synced from Firebase:', posts.length);
    
    // NEW: Check for new posts
    if (postsLoaded && posts.length > previousPostCount && feed.classList.contains('active')) {
      const newPostsCount = posts.length - previousPostCount;
      showNewPostsIndicator(newPostsCount);
      newPostsAvailable = true;
    }
    
    postsLoaded = true;
    
    if (feed.classList.contains('active') && !newPostsAvailable) {
      renderFeed();
    }
  });
  
  // Listen for analytics changes
  analyticsRef.on('value', (snapshot) => {
    postAnalytics = snapshot.val() || {};
    console.log('📊 Analytics synced from Firebase');
  });
} else {
  // Fallback to localStorage
  posts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
  postAnalytics = JSON.parse(localStorage.getItem("margoAnalytics") || "{}");
  postsLoaded = true;
  
  posts.forEach(post => {
    if (!postAnalytics[post.id]) {
      postAnalytics[post.id] = {
        views: 0,
        guesses: [],
        helps: []
      };
    }
  });
}

// ===== MODERN COLOR DESIGNS =====
const POSTER_DESIGNS = {
  'midnight-gold': {
    name: 'Midnight Gold',
    bg: ['#0d0d0d', '#1a1410', '#0d0d0d'],
    primary: '#d4af37',
    secondary: 'rgba(212, 175, 55, 0.7)',
    text: '#f8f8f8'
  },
  'royal-purple': {
    name: 'Royal Purple',
    bg: ['#1a0033', '#2d1b4e', '#1a0033'],
    primary: '#c77dff',
    secondary: 'rgba(199, 125, 255, 0.7)',
    text: '#f8f8f8'
  },
  'neon-cyan': {
    name: 'Neon Cyan',
    bg: ['#0a1420', '#142838', '#0a1420'],
    primary: '#00e5ff',
    secondary: 'rgba(0, 229, 255, 0.7)',
    text: '#f8f8f8'
  },
  'sunset-coral': {
    name: 'Sunset Coral',
    bg: ['#1a0a0a', '#2d1416', '#1a0a0a'],
    primary: '#ff6b6b',
    secondary: 'rgba(255, 107, 107, 0.7)',
    text: '#f8f8f8'
  },
  'emerald-night': {
    name: 'Emerald Night',
    bg: ['#051a0d', '#0d2e1a', '#051a0d'],
    primary: '#50fa7b',
    secondary: 'rgba(80, 250, 123, 0.7)',
    text: '#f8f8f8'
  },
  'rose-gold': {
    name: 'Rose Gold',
    bg: ['#1a0d0f', '#2d1a1f', '#1a0d0f'],
    primary: '#f4a4c0',
    secondary: 'rgba(244, 164, 192, 0.7)',
    text: '#f8f8f8'
  }
};

// ===== NEW: SCROLL POSITION MANAGEMENT =====
function saveScrollPosition() {
  if (feedList) {
    savedScrollPosition = feedList.scrollTop || window.pageYOffset;
    console.log('💾 Saved scroll position:', savedScrollPosition);
  }
}

function restoreScrollPosition() {
  if (feedList && savedScrollPosition > 0) {
    // Immediate restore without animation for seamless experience
    feedList.scrollTop = savedScrollPosition;
    window.scrollTo(0, savedScrollPosition);
    console.log('📍 Restored scroll position:', savedScrollPosition);
  }
}

// ===== IMPROVED: SCROLL TO TOP FUNCTIONALITY (FIXED FOR MOBILE) =====
function setupScrollToTop() {
  if (!feedList || !scrollToTopBtn) return;
  
  let scrollTimeout;
  
  // Create a function to check scroll position
  const checkScrollPosition = () => {
    // Get scroll position - check both feedList and window
    const scrollTop = feedList.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
    
    // Show/hide button based on scroll position
    if (scrollTop > 300) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible');
    }
  };
  
  // Listen to BOTH feedList scroll AND window scroll (for mobile)
  feedList.addEventListener('scroll', checkScrollPosition);
  window.addEventListener('scroll', checkScrollPosition);
  
  scrollToTopBtn.onclick = () => {
    // Scroll both feedList and window to top
    feedList.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    savedScrollPosition = 0;
    
    // Hide button after scrolling
    setTimeout(() => {
      scrollToTopBtn.classList.remove('visible');
    }, 600);
  };
}

// ===== NEW: NEW POSTS INDICATOR =====
function showNewPostsIndicator(count) {
  if (!newPostsIndicator) return;
  
  newPostsIndicator.querySelector('.new-posts-count').textContent = count;
  newPostsIndicator.classList.add('visible');
}

function hideNewPostsIndicator() {
  if (!newPostsIndicator) return;
  newPostsIndicator.classList.remove('visible');
}

// Setup new posts indicator click
if (newPostsIndicator) {
  newPostsIndicator.onclick = () => {
    newPostsAvailable = false;
    savedScrollPosition = 0;
    renderFeed();
    hideNewPostsIndicator();
    
    // Scroll both to top
    feedList.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
}

// ===== MODAL SCROLL FIX =====
function openModal(modal) {
  // Save scroll position before opening modal
  saveScrollPosition();
  
  // Smooth fade in for modal
  modal.style.display = 'flex';
  modal.style.opacity = '0';
  
  requestAnimationFrame(() => {
    modal.classList.remove("hidden");
    modal.style.opacity = '';
    
    document.body.classList.add("modal-open");
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${savedScrollPosition}px`;
  });
}

function closeModal(modal) {
  // Smooth fade out
  modal.style.opacity = '0';
  
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.style.display = '';
    modal.style.opacity = '';
    
    document.body.classList.remove("modal-open");
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    
    // Restore scroll position immediately and smoothly
    if (feedList && savedScrollPosition > 0) {
      feedList.scrollTop = savedScrollPosition;
      window.scrollTo(0, savedScrollPosition);
    }
  }, 200);
}

// ===== SWIPE NAVIGATION =====
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

const handleSwipe = () => {
  const diffX = touchStartX - touchEndX;
  const diffY = Math.abs(touchStartY - touchEndY);
  
  if (Math.abs(diffX) > diffY && Math.abs(diffX) > 100) {
    if (diffX > 0 && landing.classList.contains("active")) {
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
    } else if (diffX < 0 && feed.classList.contains("active")) {
      feed.classList.remove("active");
      landing.classList.add("active");
    }
  }
};

landing.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

landing.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].clientX;
  touchEndY = e.changedTouches[0].clientY;
  handleSwipe();
});

feed.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

feed.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].clientX;
  touchEndY = e.changedTouches[0].clientY;
  handleSwipe();
});

// ===== NAVIGATION =====
enterBtn.onclick = () => {
  landing.classList.remove("active");
  openModal(composer);
  
  // IMPROVED: Delay focus on mobile to avoid keyboard covering content
  setTimeout(() => {
    textInput.focus();
  }, 300);
};

backBtn.onclick = () => {
  feed.classList.remove("active");
  landing.classList.add("active");
};

openComposer.onclick = () => {
  openModal(composer);
  
  // IMPROVED: Delay focus on mobile
  setTimeout(() => {
    textInput.focus();
  }, 300);
};

closeComposer.onclick = () => {
  closeModal(composer);
  resetComposer();
  if (!feed.classList.contains("active")) {
    landing.classList.add("active");
  }
};

closeGuess.onclick = () => {
  closeModal(guessModal);
  currentGuessAttempts = 0;
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  guessInputFields.classList.remove("hidden");
  submitGuess.classList.remove("hidden");
  revealAnswer.classList.add("hidden");
  if (guessLinksSection) {
    guessLinksSection.classList.add("hidden");
  }
};

closeDiscover.onclick = () => {
  closeModal(discoverModal);
};

closePostcard.onclick = () => {
  closeModal(postcardModal);
};

closeListen.onclick = () => {
  closeModal(listenModal);
};

closeAnalytics.onclick = () => {
  closeModal(analyticsModal);
};

closeSharePoster.onclick = () => {
  closeModal(sharePosterModal);
  resetPosterModal();
};

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

    if (currentMode === "discover") {
      streamingSection.style.display = "none";
    } else {
      streamingSection.style.display = "block";
    }

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

// ===== CREATE POST WITH MODERATION =====
postBtn.onclick = async () => {
  if (postBtn.disabled) return;

  const text = textInput.value.trim();

  if (!text) {
    showToast("Please enter a lyric");
    return;
  }

  if (!selectedEmotion) {
    showToast("Please select an emotion");
    return;
  }

  // ===== MODERATION CHECK =====
  const moderation = moderateText(text);
  
  if (!moderation.allowed) {
    showToast(moderation.reason);
    return;
  }
  
  // Use the cleaned text from moderation
  const cleanedText = moderation.cleanText;
  // ===== END MODERATION =====

  let post = {
    text: cleanedText, // Use moderated text
    emotion: selectedEmotion,
    mode: currentMode,
    knowledge: {
      song: "Unknown Song",
      artist: "Unknown Artist"
    },
    guessConfig: null,
    links: currentMode !== "discover" ? {
      spotify: spotifyLink.value.trim() || null,
      apple: appleLink.value.trim() || null,
      youtube: youtubeLink.value.trim() || null,
      soundcloud: soundcloudLink.value.trim() || null
    } : null,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  try {
    if (currentMode === "share") {
      const song = songInput.value.trim();
      const artist = artistInput.value.trim();
      
      if (!song || !artist) {
        throw new Error("Please enter song and artist");
      }
      
      post.knowledge = { song, artist };
    }

    if (currentMode === "guess") {
      const songAnswer = guessSongAnswer.value.trim();
      const artistAnswer = guessArtistAnswer.value.trim();
      const allowSong = guessSongCheck.checked;
      const allowArtist = guessArtistCheck.checked;
      
      if (!allowSong && !allowArtist) {
        throw new Error("Select at least one thing to guess");
      }
      
      if (allowSong && !songAnswer) {
        throw new Error("Enter the correct song title");
      }
      
      if (allowArtist && !artistAnswer) {
        throw new Error("Enter the correct artist");
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
        song: discoverSongInput.value.trim() || "Unknown Song",
        artist: discoverArtistInput.value.trim() || "Unknown Artist"
      };
    }
  } catch (err) {
    showToast(err.message);
    return;
  }

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    if (isFirebaseEnabled) {
      const newPostRef = await postsRef.push(post);
      
      await analyticsRef.child(newPostRef.key).set({
        views: 0,
        guesses: [],
        helps: []
      });
      
      console.log('✓ Posted to Firebase:', newPostRef.key);
    } else {
      const newPost = {
        ...post,
        id: Date.now(),
        timestamp: Date.now()
      };
      
      posts.unshift(newPost);
      
      postAnalytics[newPost.id] = {
        views: 0,
        guesses: [],
        helps: []
      };
      
      if (posts.length > 50) {
        posts = posts.slice(0, 50);
      }
      
      try {
        localStorage.setItem("margoPosts", JSON.stringify(posts));
        localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
      } catch (storageErr) {
        console.warn("LocalStorage full:", storageErr);
        posts = posts.slice(0, 10);
        localStorage.setItem("margoPosts", JSON.stringify(posts));
      }
    }

    showToast("Posted successfully!");
    feed.classList.add("active");
    landing.classList.remove("active");
    
    // Reset scroll position for new post
    savedScrollPosition = 0;
    renderFeed();

    resetComposer();
    closeModal(composer);

  } catch (err) {
    console.error("Posting failed:", err);
    showToast(err.message || "Error posting. Please try again.");
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = "Post";
  }
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
  
  currentMode = "share";
  modeBtns.forEach(b => b.classList.remove("active"));
  modeBtns[0].classList.add("active");
  shareInputs.classList.add("active");
  guessInputs.classList.remove("active");
  discoverInputs.classList.remove("active");
  streamingSection.style.display = "block";
  
  guessSongCheck.checked = true;
  guessArtistCheck.checked = true;
}

// ===== DYNAMIC FONT SIZING =====
function getDynamicFontSize(text) {
  const length = text.length;
  
  // Dynamic font sizing based on character count
  if (length < 50) return '1.15rem';      // Very short - large
  if (length < 80) return '1.05rem';      // Short - medium-large
  if (length < 110) return '0.95rem';     // Medium - medium
  if (length < 140) return '0.85rem';     // Long - small
  return '0.75rem';                       // Very long - very small
}

// ===== RENDER FEED =====
function renderFeed() {
  // Add subtle transition class
  if (feedList) {
    feedList.classList.add('transitioning');
  }
  
  feedList.innerHTML = "";
  
  if (!postsLoaded) {
    postCount.textContent = "...";
    feedList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:var(--gold);"><div style="font-size: 1.5rem; margin-bottom: 10px;">⏳</div><div>Loading posts...</div></div>';
    return;
  }
  
  if (posts.length === 0) {
    postCount.textContent = "0";
    feedList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">No posts yet. Be the first!</div>';
    return;
  }
  
  postCount.textContent = posts.length;

  posts.forEach((post, index) => {
    const card = document.createElement("div");
    card.className = "feed-card";
    
    // Stagger animation slightly for each card
    card.style.animationDelay = `${index * 0.03}s`;
    
    const timeText = timeAgo(post.timestamp);
    const emotion = post.emotion || "Nostalgia";
    
    let songSection = '';
    let actionsSection = '';
    
    const hasLinks = post.links && (
      post.links.spotify || 
      post.links.apple || 
      post.links.youtube || 
      post.links.soundcloud
    );
    
    const knowledge = post.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
    
    if (post.mode === "share") {
      songSection = `
        <div class="feed-song">
          <div class="feed-song-title">${knowledge.song}</div>
          <div class="feed-song-artist">${knowledge.artist}</div>
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="viewPost(${index})">View</button>
          ${hasLinks ? '<button class="feed-action" onclick="openListen(' + index + ')">Listen</button>' : ''}
        </div>
      `;
    } 
    else if (post.mode === "guess") {
      const guessWhat = [];
      if (post.guessConfig?.guessSong) guessWhat.push("song");
      if (post.guessConfig?.guessArtist) guessWhat.push("artist");
      if (guessWhat.length === 0) {
        guessWhat.push("song", "artist");
      }
      const guessText = guessWhat.join(" & ");
      
      songSection = `
        <div class="mystery-badge">
          Guess the ${guessText}
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openGuess(${index})">Guess</button>
          <button class="feed-action" onclick="viewPost(${index})">View</button>
        </div>
      `;
    } 
    else if (post.mode === "discover") {
      const hasClues = knowledge.song !== "Unknown Song" || knowledge.artist !== "Unknown Artist";
      songSection = `
        <div class="discover-badge">
          ${hasClues ? 
            'Maybe: ' + knowledge.song + ' — ' + knowledge.artist :
            'Help discover this song!'}
        </div>
      `;
      actionsSection = `
        <div class="feed-actions">
          <button class="feed-action" onclick="openDiscover(${index})">Help Discover</button>
          <button class="feed-action" onclick="viewPost(${index})">View</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="feed-text" style="font-size: ${getDynamicFontSize(post.text)}">${post.text}</div>
      <div class="feed-emotion">${emotion}</div>
      ${songSection}
      <div class="feed-time">${timeText}</div>
      ${actionsSection}
    `;

    feedList.appendChild(card);
  });
  
  // Remove transition class after a brief moment
  setTimeout(() => {
    if (feedList) {
      feedList.classList.remove('transitioning');
    }
  }, 100);
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

// ===== TRACK VIEW =====
function trackView(postId) {
  if (isFirebaseEnabled) {
    analyticsRef.child(postId).child('views').transaction((currentViews) => {
      return (currentViews || 0) + 1;
    });
  } else {
    if (!postAnalytics[postId]) {
      postAnalytics[postId] = { views: 0, guesses: [], helps: [] };
    }
    postAnalytics[postId].views++;
    localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  }
}

// ===== OPEN GUESS MODAL =====
function openGuess(index) {
  currentPost = posts[index];
  
  trackView(currentPost.id);
  
  currentGuessAttempts = 0;
  
  guessLyric.textContent = currentPost.text;
  guessSongInput.value = "";
  guessArtistInput.value = "";
  guessResult.classList.add("hidden");
  
  const songField = document.querySelector('#guessSongInput');
  const artistField = document.querySelector('#guessArtistInput');
  
  const guessSong = currentPost.guessConfig?.guessSong ?? true;
  const guessArtist = currentPost.guessConfig?.guessArtist ?? true;
  
  if (guessSong) {
    songField.style.display = 'block';
  } else {
    songField.style.display = 'none';
  }
  
  if (guessArtist) {
    artistField.style.display = 'block';
  } else {
    artistField.style.display = 'none';
  }
  
  guessInputFields.classList.remove("hidden");
  submitGuess.classList.remove("hidden");
  revealAnswer.classList.add("hidden");
  
  const guessWhat = [];
  if (guessSong) guessWhat.push("song");
  if (guessArtist) guessWhat.push("artist");
  guessHint.textContent = `You have ${MAX_GUESS_ATTEMPTS} attempts to guess the ${guessWhat.join(" and ")}!`;
  
  if (guessLinksSection) {
    guessLinksSection.classList.add("hidden");
  }
  
  openModal(guessModal);
}

// ===== SHOW LINKS IN GUESS MODAL =====
function showGuessLinks(permanent = false) {
  if (!currentPost || !currentPost.links || !guessLinksSection) return;
  
  const hasLinks = currentPost.links.spotify || 
                   currentPost.links.apple || 
                   currentPost.links.youtube || 
                   currentPost.links.soundcloud;
  
  if (!hasLinks) return;
  
  const linksHTML = [];
  
  if (currentPost.links.spotify) {
    linksHTML.push(`<a href="${currentPost.links.spotify}" target="_blank" class="guess-link">🎵 Spotify</a>`);
  }
  if (currentPost.links.apple) {
    linksHTML.push(`<a href="${currentPost.links.apple}" target="_blank" class="guess-link">🍎 Apple Music</a>`);
  }
  if (currentPost.links.youtube) {
    linksHTML.push(`<a href="${currentPost.links.youtube}" target="_blank" class="guess-link">▶️ YouTube</a>`);
  }
  if (currentPost.links.soundcloud) {
    linksHTML.push(`<a href="${currentPost.links.soundcloud}" target="_blank" class="guess-link">☁️ SoundCloud</a>`);
  }
  
  guessLinksSection.innerHTML = `
    <div class="guess-links-title">Listen to the song:</div>
    <div class="guess-links-container">
      ${linksHTML.join('')}
    </div>
  `;
  guessLinksSection.classList.remove("hidden");
  
  if (!permanent) {
    setTimeout(() => {
      if (guessLinksSection && !permanent) {
        guessLinksSection.classList.add("hidden");
      }
    }, 5000);
  }
}

// ===== SUBMIT GUESS WITH PARTIAL FEEDBACK =====
submitGuess.onclick = () => {
  if (!currentPost) return;
  
  currentGuessAttempts++;
  
  const guessedSong = guessSongInput.value.trim().toLowerCase();
  const guessedArtist = guessArtistInput.value.trim().toLowerCase();
  
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  const actualSong = knowledge.song.toLowerCase();
  const actualArtist = knowledge.artist.toLowerCase();
  
  const guessSong = currentPost.guessConfig?.guessSong ?? true;
  const guessArtist = currentPost.guessConfig?.guessArtist ?? true;
  
  let songMatch = false;
  let artistMatch = false;
  let songCorrect = false;
  let artistCorrect = false;
  
  if (guessSong) {
    songCorrect = guessedSong && (
      guessedSong === actualSong ||
      guessedSong.includes(actualSong) ||
      actualSong.includes(guessedSong)
    );
    songMatch = songCorrect;
  } else {
    songMatch = true;
  }
  
  if (guessArtist) {
    artistCorrect = guessedArtist && (
      guessedArtist === actualArtist ||
      guessedArtist.includes(actualArtist) ||
      actualArtist.includes(guessedArtist)
    );
    artistMatch = artistCorrect;
  } else {
    artistMatch = true;
  }
  
  const guessData = {
    song: guessedSong || null,
    artist: guessedArtist || null,
    correct: songMatch && artistMatch,
    timestamp: Date.now()
  };
  
  if (isFirebaseEnabled) {
    analyticsRef.child(currentPost.id).child('guesses').push(guessData);
  } else {
    if (!postAnalytics[currentPost.id]) {
      postAnalytics[currentPost.id] = { views: 0, guesses: [], helps: [] };
    }
    postAnalytics[currentPost.id].guesses.push(guessData);
    localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  }
  
  guessResult.classList.remove("hidden");
  
  if (songMatch && artistMatch) {
    guessResult.className = "result-message success";
    guessResult.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 1rem;">✓ Correct!</div>
      <div style="font-size: 0.85rem;">"${knowledge.song}" by ${knowledge.artist}</div>
    `;
    
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.add("hidden");
    
    showGuessLinks(true);
  }
  else if (currentGuessAttempts >= MAX_GUESS_ATTEMPTS) {
    guessResult.className = "result-message error";
    guessResult.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 1rem;">✗ Out of attempts</div>
      <div style="font-size: 0.85rem; margin-top: 8px;"><strong>Answer:</strong></div>
      <div style="font-size: 0.85rem;">Song: ${knowledge.song}</div>
      <div style="font-size: 0.85rem;">Artist: ${knowledge.artist}</div>
    `;
    
    submitGuess.classList.add("hidden");
    guessInputFields.classList.add("hidden");
    revealAnswer.classList.add("hidden");
    
    showGuessLinks(true);
  }
  else if (songCorrect || artistCorrect) {
    guessResult.className = "result-message partial";
    
    let feedbackHTML = '<div style="margin-bottom: 8px; font-size: 1rem;">Partial Correct</div>';
    
    if (guessSong) {
      feedbackHTML += `<div style="font-size: 0.8rem;">${songCorrect ? '✓' : '✗'} Song: ${guessedSong || '(empty)'}</div>`;
    }
    if (guessArtist) {
      feedbackHTML += `<div style="font-size: 0.8rem;">${artistCorrect ? '✓' : '✗'} Artist: ${guessedArtist || '(empty)'}</div>`;
    }
    
    const attemptsLeft = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
    feedbackHTML += `<div style="margin-top: 8px; font-size: 0.75rem;">${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining</div>`;
    
    guessResult.innerHTML = feedbackHTML;
    guessSongInput.value = "";
    guessArtistInput.value = "";
  }
  else {
    guessResult.className = "result-message error";
    
    let feedbackHTML = '<div style="margin-bottom: 8px; font-size: 1rem;">✗ Incorrect</div>';
    
    if (guessSong && guessedSong) {
      feedbackHTML += `<div style="font-size: 0.8rem;">✗ Song: ${guessedSong}</div>`;
    }
    if (guessArtist && guessedArtist) {
      feedbackHTML += `<div style="font-size: 0.8rem;">✗ Artist: ${guessedArtist}</div>`;
    }
    
    const attemptsLeft = MAX_GUESS_ATTEMPTS - currentGuessAttempts;
    feedbackHTML += `<div style="margin-top: 8px; font-size: 0.75rem;">${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining</div>`;
    
    guessResult.innerHTML = feedbackHTML;
    guessSongInput.value = "";
    guessArtistInput.value = "";
  }
};

// ===== REVEAL ANSWER =====
revealAnswer.onclick = () => {
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  
  guessInputFields.classList.add("hidden");
  submitGuess.classList.add("hidden");
  revealAnswer.classList.add("hidden");
  
  guessResult.className = "result-message success";
  guessResult.innerHTML = `
    <div style="margin-bottom: 8px; font-size: 1rem;">✓ Answer</div>
    <div style="font-size: 0.85rem;"><strong>Song:</strong> ${knowledge.song}</div>
    <div style="font-size: 0.85rem;"><strong>Artist:</strong> ${knowledge.artist}</div>
  `;
  guessResult.classList.remove("hidden");
  
  showGuessLinks(true);
};

// ===== OPEN DISCOVER MODAL =====
function openDiscover(index) {
  currentPost = posts[index];
  
  trackView(currentPost.id);
  
  discoverLyric.textContent = currentPost.text;
  discoverSongAnswer.value = "";
  discoverArtistAnswer.value = "";
  discoverSpotifyLink.value = "";
  discoverAppleLink.value = "";
  discoverYoutubeLink.value = "";
  discoverSoundcloudLink.value = "";
  
  openModal(discoverModal);
}

// ===== SUBMIT DISCOVER =====
submitDiscover.onclick = () => {
  const song = discoverSongAnswer.value.trim();
  const artist = discoverArtistAnswer.value.trim();
  
  if (!song || !artist) {
    showToast("Please enter both song and artist");
    return;
  }
  
  const helpData = {
    song,
    artist,
    links: {
      spotify: discoverSpotifyLink.value.trim() || null,
      apple: discoverAppleLink.value.trim() || null,
      youtube: discoverYoutubeLink.value.trim() || null,
      soundcloud: discoverSoundcloudLink.value.trim() || null
    },
    timestamp: Date.now()
  };
  
  if (isFirebaseEnabled) {
    analyticsRef.child(currentPost.id).child('helps').push(helpData);
  } else {
    if (!postAnalytics[currentPost.id]) {
      postAnalytics[currentPost.id] = { views: 0, guesses: [], helps: [] };
    }
    postAnalytics[currentPost.id].helps.push(helpData);
    localStorage.setItem("margoAnalytics", JSON.stringify(postAnalytics));
  }
  
  showToast("Thanks for helping!");
  closeModal(discoverModal);
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
    { name: 'Spotify', key: 'spotify' },
    { name: 'Apple Music', key: 'apple' },
    { name: 'YouTube', key: 'youtube' },
    { name: 'SoundCloud', key: 'soundcloud' }
  ];
  
  let hasAnyLink = false;
  
  platforms.forEach(platform => {
    if (currentPost.links[platform.key]) {
      hasAnyLink = true;
      const link = document.createElement("a");
      link.className = "listen-link";
      link.href = currentPost.links[platform.key];
      link.target = "_blank";
      link.innerHTML = `<span>${platform.name}</span>`;
      listenLinks.appendChild(link);
    }
  });
  
  if (!hasAnyLink) {
    listenLinks.innerHTML = '<p class="hint">No streaming links available</p>';
  }
  
  openModal(listenModal);
}

// ===== VIEW POST (POSTCARD) =====
function viewPost(index) {
  currentPost = posts[index];
  
  trackView(currentPost.id);
  
  postcardLyric.textContent = currentPost.text;
  postcardEmotion.textContent = currentPost.emotion || "Nostalgia";
  
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  
  if (currentPost.mode === "guess") {
    postcardSong.innerHTML = `
      <div style="font-style: italic; color: var(--text-secondary);">Guess correctly to reveal</div>
    `;
  } else {
    postcardSong.innerHTML = `
      <div>${knowledge.song}</div>
      <div>${knowledge.artist}</div>
    `;
  }
  
  const hasLinks = currentPost.links && (
    currentPost.links.spotify || 
    currentPost.links.apple || 
    currentPost.links.youtube || 
    currentPost.links.soundcloud
  );
  
  if (hasLinks && currentPost.mode !== "guess") {
    listenPostcard.style.display = 'block';
  } else {
    listenPostcard.style.display = 'none';
  }
  
  // Check if this was opened from a shared link
  const urlParams = new URLSearchParams(window.location.search);
  const sharedPostId = urlParams.get('post');
  
  if (sharedPostId && sharedPostId == currentPost.id) {
    // Show a subtle indicator that this is a shared post
    setTimeout(() => {
      showToast("📬 Viewing shared post");
    }, 500);
  }
  
  openModal(postcardModal);
}

listenPostcard.onclick = () => {
  const postIndex = posts.findIndex(p => p.id === currentPost.id);
  if (postIndex !== -1) {
    closeModal(postcardModal);
    openListen(postIndex);
  }
};

// ===== ANALYTICS =====
analyticsBtn.onclick = () => {
  if (!currentPost || !postAnalytics[currentPost.id]) return;
  
  const analytics = postAnalytics[currentPost.id];
  
  const guesses = analytics.guesses ? 
    (Array.isArray(analytics.guesses) ? analytics.guesses : Object.values(analytics.guesses)) : [];
  const helps = analytics.helps ? 
    (Array.isArray(analytics.helps) ? analytics.helps : Object.values(analytics.helps)) : [];
  
  const modalBody = document.querySelector('#analyticsModal .modal-body');
  
  if (currentPost.mode === 'guess') {
    modalBody.innerHTML = `
      <div class="analytics-stats">
        <div class="stat-card">
          <div class="stat-number">${analytics.views || 0}</div>
          <div class="stat-label">Views</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${guesses.length}</div>
          <div class="stat-label">Guess Attempts</div>
        </div>
      </div>
      
      ${guesses.length > 0 ? `
        <div class="activity-section">
          <h4>Guess Attempts</h4>
          <div class="activity-list" id="guessesList"></div>
        </div>
      ` : ''}
    `;
    
    if (guesses.length > 0) {
      const newGuessesList = document.getElementById('guessesList');
      guesses.forEach(guess => {
        const item = document.createElement("div");
        item.className = `activity-item ${guess.correct ? 'correct' : 'incorrect'}`;
        item.innerHTML = `
          <div class="activity-guess">
            ${guess.song ? `Song: ${guess.song}` : ''}
            ${guess.artist ? `<br>Artist: ${guess.artist}` : ''}
          </div>
          <div class="activity-result ${guess.correct ? 'correct' : 'incorrect'}">
            ${guess.correct ? 'Correct' : 'Incorrect'}
          </div>
          <div class="activity-time">${timeAgo(guess.timestamp)}</div>
        `;
        newGuessesList.appendChild(item);
      });
    }
  } 
  else if (currentPost.mode === 'discover') {
    modalBody.innerHTML = `
      <div class="analytics-stats">
        <div class="stat-card">
          <div class="stat-number">${analytics.views || 0}</div>
          <div class="stat-label">Views</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${helps.length}</div>
          <div class="stat-label">Discovery Helps</div>
        </div>
      </div>
      
      ${helps.length > 0 ? `
        <div class="activity-section">
          <h4>Discovery Suggestions</h4>
          <div class="activity-list" id="helpsList"></div>
        </div>
      ` : ''}
    `;
    
    if (helps.length > 0) {
      const newHelpsList = document.getElementById('helpsList');
      helps.forEach(help => {
        const item = document.createElement("div");
        item.className = "activity-item";
        
        let linksHTML = '';
        if (help.links) {
          const linksList = [];
          if (help.links.spotify) linksList.push(`<a href="${help.links.spotify}" target="_blank" class="activity-link">Spotify</a>`);
          if (help.links.apple) linksList.push(`<a href="${help.links.apple}" target="_blank" class="activity-link">Apple Music</a>`);
          if (help.links.youtube) linksList.push(`<a href="${help.links.youtube}" target="_blank" class="activity-link">YouTube</a>`);
          if (help.links.soundcloud) linksList.push(`<a href="${help.links.soundcloud}" target="_blank" class="activity-link">SoundCloud</a>`);
          
          if (linksList.length > 0) {
            linksHTML = `<div class="activity-links">${linksList.join('')}</div>`;
          }
        }
        
        item.innerHTML = `
          <div class="activity-guess">
            <strong>Song:</strong> ${help.song}<br>
            <strong>Artist:</strong> ${help.artist}
          </div>
          ${linksHTML}
          <div class="activity-time">${timeAgo(help.timestamp)}</div>
        `;
        newHelpsList.appendChild(item);
      });
    }
  } 
  else {
    modalBody.innerHTML = `
      <div class="analytics-stats">
        <div class="stat-card">
          <div class="stat-number">${analytics.views || 0}</div>
          <div class="stat-label">Views</div>
        </div>
      </div>
    `;
  }
  
  closeModal(postcardModal);
  openModal(analyticsModal);
};

// ===== COLOR DOT SELECTION WITH LIVE PREVIEW =====
document.querySelectorAll(".color-dot").forEach(dot => {
  dot.onclick = () => {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
    dot.classList.add("active");
    selectedDesign = dot.dataset.design;
    updateLivePreview();
  };
});

// ===== UPDATE LIVE PREVIEW =====
function updateLivePreview() {
  if (!currentPost || !posterPreviewCanvas) return;
  
  const ctx = posterPreviewCanvas.getContext('2d');
  const previewWidth = 320;
  const previewHeight = 320;
  
  posterPreviewCanvas.width = previewWidth;
  posterPreviewCanvas.height = previewHeight;
  
  const colors = POSTER_DESIGNS[selectedDesign];
  
  const gradient = ctx.createLinearGradient(0, 0, 0, previewHeight);
  gradient.addColorStop(0, colors.bg[0]);
  gradient.addColorStop(0.5, colors.bg[1]);
  gradient.addColorStop(1, colors.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, previewWidth, previewHeight);
  
  const baseFontSize = 13;
  
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.3}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', previewWidth / 2, 40);
  
  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 0.95}px serif`;
  const lyricPreview = currentPost.text.length > 80 ? currentPost.text.substring(0, 80) + '...' : currentPost.text;
  wrapText(ctx, lyricPreview, previewWidth / 2, previewHeight / 2 - 30, previewWidth * 0.85, baseFontSize * 1.3);
  
  const emotion = currentPost.emotion || "Nostalgia";
  ctx.fillStyle = colors.primary;
  ctx.font = `600 ${baseFontSize * 0.75}px sans-serif`;
  ctx.fillText(`#${emotion}`, previewWidth / 2, previewHeight / 2 + 35);
  
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(previewWidth * 0.3, previewHeight / 2 + 50);
  ctx.lineTo(previewWidth * 0.7, previewHeight / 2 + 50);
  ctx.stroke();
  
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 0.9}px serif`;
  const songTitle = knowledge.song.length > 25 ? 
    knowledge.song.substring(0, 25) + '...' : 
    knowledge.song;
  ctx.fillText(songTitle, previewWidth / 2, previewHeight / 2 + 75);
  
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize * 0.75}px sans-serif`;
  const artistName = knowledge.artist.length > 30 ? 
    knowledge.artist.substring(0, 30) + '...' : 
    knowledge.artist;
  ctx.fillText(artistName, previewWidth / 2, previewHeight / 2 + 92);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let testLine = '';
  let lineArray = [];

  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lineArray.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lineArray.push(line);
  
  const startY = y - ((lineArray.length - 1) * lineHeight) / 2;
  for (let k = 0; k < lineArray.length; k++) {
    ctx.fillText(lineArray[k], x, startY + (k * lineHeight));
  }
}

nextToPlatform.onclick = () => {
  designStep.classList.remove("active");
  platformStep.classList.add("active");
};

backToDesign.onclick = () => {
  platformStep.classList.remove("active");
  designStep.classList.add("active");
};

backToPlatform.onclick = () => {
  shareStep.classList.remove("active");
  platformStep.classList.add("active");
};

// ===== PLATFORM SELECTION & POSTER GENERATION =====
document.querySelectorAll(".platform-btn").forEach(btn => {
  btn.onclick = async () => {
    selectedPosterSize = btn.dataset.size;
    
    // Generate poster with watermark
    await generatePoster(selectedPosterSize, selectedDesign);
    
    // Generate shareable link
    const shareLink = `${APP_BASE_URL}?post=${currentPost.id}`;
    shareableLink.value = shareLink;
    
    // Move to share step
    platformStep.classList.remove("active");
    shareStep.classList.add("active");
  };
});

// ===== POSTER GENERATION WITH WATERMARK =====
async function generatePoster(size, design) {
  if (!currentPost) return;
  
  const sizes = {
    'instagram-square': { width: 1080, height: 1080 },
    'instagram-story': { width: 1080, height: 1920 },
    'twitter': { width: 1200, height: 675 },
    'facebook': { width: 1200, height: 630 },
    'pinterest': { width: 1000, height: 1500 }
  };
  
  const dims = sizes[size];
  const colors = POSTER_DESIGNS[design];
  const canvas = posterCanvas;
  const ctx = canvas.getContext('2d');
  
  canvas.width = dims.width;
  canvas.height = dims.height;
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, dims.height);
  gradient.addColorStop(0, colors.bg[0]);
  gradient.addColorStop(0.5, colors.bg[1]);
  gradient.addColorStop(1, colors.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, dims.width, dims.height);
  
  const baseFontSize = dims.width * 0.032;
  
  // MARGO header
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.4}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MARGO', dims.width / 2, dims.height * 0.11);
  
  // Lyric
  ctx.fillStyle = colors.text;
  ctx.font = `italic ${baseFontSize * 1.15}px serif`;
  wrapText(ctx, currentPost.text, dims.width / 2, dims.height * 0.38, dims.width * 0.85, baseFontSize * 1.7);
  
  // Emotion
  const emotion = currentPost.emotion || "Nostalgia";
  ctx.fillStyle = colors.primary;
  ctx.font = `600 ${baseFontSize * 0.85}px sans-serif`;
  ctx.fillText(`#${emotion}`, dims.width / 2, dims.height * 0.62);
  
  // Separator
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(dims.width * 0.3, dims.height * 0.68);
  ctx.lineTo(dims.width * 0.7, dims.height * 0.68);
  ctx.stroke();
  
  const knowledge = currentPost.knowledge || { song: "Unknown Song", artist: "Unknown Artist" };
  
  // Song title
  ctx.fillStyle = colors.primary;
  ctx.font = `bold ${baseFontSize * 1.1}px serif`;
  ctx.fillText(knowledge.song, dims.width / 2, dims.height * 0.78);
  
  // Artist
  ctx.fillStyle = colors.secondary;
  ctx.font = `500 ${baseFontSize * 0.9}px sans-serif`;
  ctx.fillText(knowledge.artist, dims.width / 2, dims.height * 0.85);
  
  // ===== WATERMARK =====
  // Add MARGO URL at the bottom
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = `500 ${baseFontSize * 0.6}px sans-serif`;
  ctx.textAlign = 'center';
  
  // Get domain without protocol
  const domain = APP_BASE_URL.replace(/^https?:\/\//, '');
  ctx.fillText(domain, dims.width / 2, dims.height * 0.95);
  
  // Convert canvas to blob for sharing
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      generatedPosterBlob = blob;
      resolve();
    }, 'image/png');
  });
}

// ===== COPY LINK BUTTON =====
copyLinkBtn.onclick = async () => {
  try {
    await navigator.clipboard.writeText(shareableLink.value);
    copyLinkBtn.textContent = "Copied!";
    copyLinkBtn.style.background = "var(--success)";
    
    setTimeout(() => {
      copyLinkBtn.textContent = "Copy";
      copyLinkBtn.style.background = "";
    }, 2000);
    
    showToast("Link copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy:", err);
    shareableLink.select();
    showToast("Please copy the link manually");
  }
};

// ===== WEB SHARE API =====
shareNativeBtn.onclick = async () => {
  if (!generatedPosterBlob) {
    showToast("Please wait, generating poster...");
    return;
  }
  
  const shareData = {
    title: `MARGO - ${currentPost.text.substring(0, 50)}...`,
    text: `Check out this lyric on MARGO!\n\n"${currentPost.text}"\n\n${shareableLink.value}`,
    files: [
      new File([generatedPosterBlob], `margo-poster-${Date.now()}.png`, {
        type: 'image/png'
      })
    ]
  };
  
  try {
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      showToast("Shared successfully!");
    } else {
      // Fallback: just download
      downloadPosterFile();
      showToast("Poster downloaded! Share it manually.");
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error("Share failed:", err);
      downloadPosterFile();
      showToast("Sharing not supported. Poster downloaded instead.");
    }
  }
};

// ===== MANUAL DOWNLOAD =====
downloadManualBtn.onclick = () => {
  downloadPosterFile();
};

function downloadPosterFile() {
  if (!selectedPosterSize) return;
  
  const link = document.createElement('a');
  link.download = `margo-poster-${selectedPosterSize}-${Date.now()}.png`;
  link.href = posterCanvas.toDataURL('image/png');
  link.click();
  
  showToast("Poster downloaded!");
}

// ===== SHARE POSTER BUTTON =====
sharePosterBtn.onclick = () => {
  closeModal(postcardModal);
  resetPosterModal();
  setTimeout(() => {
    updateLivePreview();
  }, 100);
  openModal(sharePosterModal);
};

function resetPosterModal() {
  designStep.classList.add("active");
  platformStep.classList.remove("active");
  shareStep.classList.remove("active");
  selectedDesign = "midnight-gold";
  selectedPosterSize = null;
  generatedPosterBlob = null;
  
  document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("active"));
  document.querySelectorAll(".color-dot")[0].classList.add("active");
}

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
console.log("MARGO Firebase Edition loaded - WITH SCROLL PRESERVATION & LIVE UPDATES - IMPROVED");
console.log("Firebase enabled:", isFirebaseEnabled);
console.log("Posts loaded:", posts.length);

// Setup scroll to top button
setupScrollToTop();

// ===== HANDLE SHARED POST LINKS =====
function handleSharedPostLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('post');
  
  if (!postId) return;
  
  console.log('📍 Shared post link detected:', postId);
  
  // Find the post
  const postIndex = posts.findIndex(p => p.id == postId);
  
  if (postIndex !== -1) {
    console.log('✓ Post found, opening directly');
    
    // Hide landing, show feed
    landing.classList.remove("active");
    feed.classList.add("active");
    
    // Render feed
    renderFeed();
    
    // Open the specific post immediately
    setTimeout(() => {
      viewPost(postIndex);
    }, 300);
  } else {
    console.log('⚠ Post not found yet, waiting for Firebase sync...');
    
    // If using Firebase, posts might not be loaded yet
    // Set up a one-time listener to open post when it loads
    if (isFirebaseEnabled) {
      const checkInterval = setInterval(() => {
        const foundIndex = posts.findIndex(p => p.id == postId);
        if (foundIndex !== -1) {
          clearInterval(checkInterval);
          console.log('✓ Post loaded from Firebase, opening now');
          
          landing.classList.remove("active");
          feed.classList.add("active");
          renderFeed();
          
          setTimeout(() => {
            viewPost(foundIndex);
          }, 300);
        }
      }, 500);
      
      // Stop checking after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('⚠ Post not found after 10s, showing feed instead');
        landing.classList.remove("active");
        feed.classList.add("active");
        renderFeed();
      }, 10000);
    } else {
      // Not using Firebase and post not found - just show feed
      console.log('Post not found, showing feed');
      landing.classList.remove("active");
      feed.classList.add("active");
      renderFeed();
    }
  }
}

// Check for shared post link when page loads
window.addEventListener('load', () => {
  handleSharedPostLink();
});
