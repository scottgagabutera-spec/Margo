/* ============================================
   MARGO v6.0 - Platform-Level Implementation
   ============================================ */

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================

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

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================

const AppState = {
  currentView: 'feed',
  currentMode: 'normal',
  selectedEmotions: [],
  currentPost: null,
  allPosts: [],
  userVibes: {},
  userGuesses: {},
  
  // Rate limiting
  POST_COOLDOWN: 30000,
  
  init() {
    this.loadFromLocalStorage();
    this.loadSeedPosts();
  },
  
  loadFromLocalStorage() {
    this.userVibes = JSON.parse(localStorage.getItem("margoUserVibes") || "{}");
    this.userGuesses = JSON.parse(localStorage.getItem("margoUserGuesses") || "{}");
    const localPosts = JSON.parse(localStorage.getItem("margoPosts") || "[]");
    if (localPosts.length > 0) {
      this.allPosts = localPosts;
    }
  },
  
  loadSeedPosts() {
    if (this.allPosts.length === 0) {
      this.allPosts = [
        {
          id: Date.now() - 120000,
          text: "I'm still learning to love the parts of me nobody claps for",
          song: "Self Love",
          artist: "Metro Boomin",
          emotions: ["Healing", "Hope"],
          timestamp: Date.now() - 120000,
          vibes: {},
          mode: "normal",
          links: { spotify: null, apple: null, youtube: null, soundcloud: null }
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
    }
  },
  
  savePost(post) {
    this.allPosts.unshift(post);
    localStorage.setItem("margoPosts", JSON.stringify(this.allPosts));
    
    // Firebase sync
    if (db) {
      db.ref('posts').push(post).catch(err => {
        console.warn("Firebase sync failed:", err);
      });
    }
  },
  
  getLastPostTime() {
    return parseInt(localStorage.getItem("margoLastPostTime") || "0");
  },
  
  setLastPostTime(time) {
    localStorage.setItem("margoLastPostTime", time.toString());
  }
};

// ==========================================
// 3. DOM ELEMENTS
// ==========================================

const DOM = {
  // Navigation
  navItems: null,
  
  // Composer
  composer: null,
  composerTextInput: null,
  composerCount: null,
  emotionPills: null,
  modeBtns: null,
  postBtn: null,
  
  // Mode inputs
  normalInputs: null,
  guessInputs: null,
  discoverInputs: null,
  
  // Feed
  feedList: null,
  postCount: null,
  
  init() {
    // Composer elements
    this.composer = document.getElementById('composer');
    this.composerTextInput = document.getElementById('textInput');
    this.composerCount = document.getElementById('count');
    this.emotionPills = document.querySelectorAll('.emotion-pill');
    this.modeBtns = document.querySelectorAll('[data-mode]');
    this.postBtn = document.getElementById('postBtn');
    
    // Mode input containers
    this.normalInputs = document.getElementById('normalInputs');
    this.guessInputs = document.getElementById('guessInputs');
    this.discoverInputs = document.getElementById('discoverInputs');
    
    // Feed
    this.feedList = document.getElementById('feedList');
    this.postCount = document.getElementById('postCount');
    
    // Navigation
    this.navItems = document.querySelectorAll('.nav-item');
  }
};

// ==========================================
// 4. UI UTILITIES
// ==========================================

const UI = {
  showToast(message) {
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
  },
  
  timeAgo(timestamp) {
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
};

// ==========================================
// 5. NAVIGATION
// ==========================================

const Navigation = {
  init() {
    DOM.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.switchView(view);
      });
    });
  },
  
  switchView(viewName) {
    // Update nav active state
    DOM.navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Hide all views
    document.querySelectorAll('.content-view').forEach(view => {
      view.style.display = 'none';
    });
    
    // Show selected view
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
      targetView.style.display = 'block';
    }
    
    AppState.currentView = viewName;
  }
};

// ==========================================
// 6. COMPOSER
// ==========================================

const Composer = {
  init() {
    // Open composer buttons
    document.getElementById('desktopCompose')?.addEventListener('click', () => this.open());
    document.getElementById('mobileFab')?.addEventListener('click', () => this.open());
    
    // Character counter
    DOM.composerTextInput.addEventListener('input', () => {
      DOM.composerCount.textContent = DOM.composerTextInput.value.length;
    });
    
    // Emotion pills
    DOM.emotionPills.forEach(pill => {
      pill.addEventListener('click', () => this.toggleEmotion(pill));
    });
    
    // Mode buttons
    DOM.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.selectMode(btn));
    });
    
    // Post button
    DOM.postBtn.addEventListener('click', () => this.createPost());
  },
  
  open() {
    DOM.composer.classList.add('active');
    DOM.composerTextInput.focus();
  },
  
  close() {
    DOM.composer.classList.remove('active');
    this.reset();
  },
  
  reset() {
    DOM.composerTextInput.value = '';
    DOM.composerCount.textContent = '0';
    AppState.selectedEmotions = [];
    
    DOM.emotionPills.forEach(pill => pill.classList.remove('active'));
    
    // Reset mode to normal
    AppState.currentMode = 'normal';
    DOM.modeBtns.forEach(btn => {
      if (btn.dataset.mode === 'normal') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Show normal inputs
    DOM.normalInputs.style.display = 'block';
    DOM.guessInputs.style.display = 'none';
    DOM.discoverInputs.style.display = 'none';
    
    // Clear all inputs
    document.querySelectorAll('#composer input, #composer textarea').forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = true;
      } else {
        input.value = '';
      }
    });
  },
  
  toggleEmotion(pill) {
    const emotion = pill.dataset.emotion;
    const index = AppState.selectedEmotions.indexOf(emotion);
    
    if (index > -1) {
      AppState.selectedEmotions.splice(index, 1);
      pill.classList.remove('active');
    } else {
      AppState.selectedEmotions.push(emotion);
      pill.classList.add('active');
    }
  },
  
  selectMode(btn) {
    const mode = btn.dataset.mode;
    AppState.currentMode = mode;
    
    // Update button states
    DOM.modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Show/hide mode-specific inputs
    DOM.normalInputs.style.display = mode === 'normal' ? 'block' : 'none';
    DOM.guessInputs.style.display = mode === 'guess' ? 'block' : 'none';
    DOM.discoverInputs.style.display = mode === 'discover' ? 'block' : 'none';
  },
  
  async createPost() {
    // Rate limiting
    const lastPostTime = AppState.getLastPostTime();
    const now = Date.now();
    if (now - lastPostTime < AppState.POST_COOLDOWN) {
      const remaining = Math.ceil((AppState.POST_COOLDOWN - (now - lastPostTime)) / 1000);
      UI.showToast(`Wait ${remaining}s before posting again`);
      return;
    }
    
    // Validation
    const text = DOM.composerTextInput.value.trim();
    if (!text) {
      UI.showToast("Drop your lyric first");
      return;
    }
    
    if (AppState.selectedEmotions.length === 0) {
      UI.showToast("Tag the vibe");
      return;
    }
    
    // Build post object
    let post = {
      id: Date.now(),
      text,
      emotions: [...AppState.selectedEmotions],
      timestamp: Date.now(),
      vibes: {},
      mode: AppState.currentMode,
      links: {
        spotify: document.getElementById('spotifyLink').value.trim() || null,
        apple: document.getElementById('appleLink').value.trim() || null,
        youtube: document.getElementById('youtubeLink').value.trim() || null,
        soundcloud: document.getElementById('soundcloudLink').value.trim() || null
      }
    };
    
    // Handle mode-specific data
    if (AppState.currentMode === 'normal') {
      const song = document.getElementById('songInput').value.trim();
      const artist = document.getElementById('artistInput').value.trim();
      
      if (!song || !artist) {
        UI.showToast("Enter song title and artist");
        return;
      }
      
      post.song = song;
      post.artist = artist;
      
    } else if (AppState.currentMode === 'guess') {
      const songAnswer = document.getElementById('guessSongAnswer').value.trim();
      const artistAnswer = document.getElementById('guessArtistAnswer').value.trim();
      const allowGuessSong = document.getElementById('guessSongCheck').checked;
      const allowGuessArtist = document.getElementById('guessArtistCheck').checked;
      
      if (!allowGuessSong && !allowGuessArtist) {
        UI.showToast("Select at least one thing to guess");
        return;
      }
      
      if (allowGuessSong && !songAnswer) {
        UI.showToast("Enter the song title answer");
        return;
      }
      
      if (allowGuessArtist && !artistAnswer) {
        UI.showToast("Enter the artist name answer");
        return;
      }
      
      post.song = songAnswer;
      post.artist = artistAnswer;
      post.guessConfig = { allowGuessSong, allowGuessArtist };
      
    } else if (AppState.currentMode === 'discover') {
      const song = document.getElementById('discoverSongInput').value.trim();
      const artist = document.getElementById('discoverArtistInput').value.trim();
      
      post.song = song || "Unknown Song";
      post.artist = artist || "Unknown Artist";
    }
    
    // Save post
    DOM.postBtn.disabled = true;
    DOM.postBtn.textContent = "Posting...";
    
    try {
      AppState.savePost(post);
      AppState.setLastPostTime(Date.now());
      UI.showToast("Posted!");
      
      this.close();
      Feed.render();
      
      // Scroll to top
      setTimeout(() => {
        DOM.feedList.scrollTop = 0;
      }, 100);
      
    } catch (error) {
      console.error("Post error:", error);
      UI.showToast("Post failed");
    } finally {
      DOM.postBtn.disabled = false;
      DOM.postBtn.textContent = "Drop It";
    }
  }
};

// ==========================================
// 7. FEED
// ==========================================

const Feed = {
  render() {
    DOM.feedList.innerHTML = "";
    
    if (AppState.allPosts.length === 0) {
      DOM.feedList.innerHTML = `
        <div style="text-align:center;padding:80px 20px;color:var(--text-tertiary);font-size:var(--text-sm);">
          No posts yet. Be the first!
        </div>
      `;
      return;
    }
    
    // Update post count
    if (DOM.postCount) {
      DOM.postCount.textContent = AppState.allPosts.length;
    }
    
    // Render each post
    AppState.allPosts.forEach((post, index) => {
      const card = this.createFeedCard(post, index);
      DOM.feedList.appendChild(card);
    });
  },
  
  createFeedCard(post, index) {
    const card = document.createElement("div");
    card.className = "feed-card";
    
    const timeText = UI.timeAgo(post.timestamp);
    const emotionTags = post.emotions.map(e =>
      `<span class="feed-emotion" data-emotion="${e}">${e}</span>`
    ).join("");
    
    let songSection = '';
    if (post.mode === "discover") {
      songSection = `
        <div class="feed-song">
          <div style="color: var(--text-secondary); margin-bottom: var(--space-2);">
            Wants to discover this song
          </div>
          <button class="btn btn-secondary btn-sm" data-index="${index}" data-action="help-discover">
            Help Discover
          </button>
        </div>
      `;
    } else if (post.mode === "guess") {
      const userGuessed = AppState.userGuesses[post.id];
      if (userGuessed) {
        songSection = `
          <div class="feed-song">
            <div class="feed-song-title">${post.song}</div>
            <div class="feed-song-artist">${post.artist}</div>
          </div>
        `;
      } else {
        const guessWhat = [];
        if (post.guessConfig.allowGuessSong) guessWhat.push("song");
        if (post.guessConfig.allowGuessArtist) guessWhat.push("artist");
        const guessText = guessWhat.join(" and ");
        
        songSection = `
          <div class="feed-song">
            <div style="color: var(--text-secondary); margin-bottom: var(--space-2);">
              Guess the ${guessText}
            </div>
            <button class="btn btn-secondary btn-sm" data-index="${index}" data-action="guess">
              Take the Challenge
            </button>
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
    const userVibed = AppState.userVibes[post.id] || false;
    const hasAnyLink = post.links && (post.links.spotify || post.links.apple || 
      post.links.youtube || post.links.soundcloud);
    
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
        ${hasAnyLink ? `
          <button class="feed-action" data-index="${index}" data-action="listen">
            <span class="feed-action-icon">♫</span>
            <span>Listen</span>
          </button>
        ` : ''}
        <button class="feed-action" data-index="${index}" data-action="view">
          <span class="feed-action-icon">•</span>
          <span>View</span>
        </button>
        <button class="feed-action" data-index="${index}" data-action="share">
          <span class="feed-action-icon">↗</span>
          <span>Share</span>
        </button>
      </div>
    `;
    
    // Attach event listeners
    this.attachCardListeners(card, post, index);
    
    return card;
  },
  
  attachCardListeners(card, post, index) {
    // Vibe button
    const vibeBtn = card.querySelector('.vibe-btn');
    if (vibeBtn) {
      vibeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleVibe(post, vibeBtn);
      });
    }
    
    // Action buttons
    card.querySelectorAll('.feed-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleAction(action, post);
      });
    });
  },
  
  toggleVibe(post, button) {
    const postId = post.id;
    const userId = this.getUserId();
    
    if (!post.vibes) post.vibes = {};
    
    if (AppState.userVibes[postId]) {
      delete AppState.userVibes[postId];
      delete post.vibes[userId];
      button.classList.remove('active');
    } else {
      AppState.userVibes[postId] = true;
      post.vibes[userId] = true;
      button.classList.add('active');
      UI.showToast("Vibed!");
    }
    
    localStorage.setItem("margoUserVibes", JSON.stringify(AppState.userVibes));
    
    const count = Object.keys(post.vibes).length;
    button.querySelector('.vibe-count').textContent = count;
  },
  
  getUserId() {
    let userId = localStorage.getItem("margoUserId");
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("margoUserId", userId);
    }
    return userId;
  },
  
  handleAction(action, post) {
    AppState.currentPost = post;
    
    switch(action) {
      case 'view':
        UI.showToast("View modal - Coming soon");
        break;
      case 'listen':
        UI.showToast("Listen modal - Coming soon");
        break;
      case 'share':
        UI.showToast("Share modal - Coming soon");
        break;
      case 'guess':
        UI.showToast("Guess modal - Coming soon");
        break;
      case 'help-discover':
        UI.showToast("Discover modal - Coming soon");
        break;
    }
  }
};

// ==========================================
// 8. GLOBAL FUNCTIONS (for inline handlers)
// ==========================================

function closeComposer() {
  Composer.close();
}

// ==========================================
// 9. INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize app state
  AppState.init();
  
  // Initialize DOM references
  DOM.init();
  
  // Initialize modules
  Navigation.init();
  Composer.init();
  
  // Render initial feed
  Feed.render();
  
  console.log("✨ MARGO v6.0 initialized");
});
