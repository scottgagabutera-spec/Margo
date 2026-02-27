/* ============================================================
   MARGO — js/state.js
   Shared state, constants, and DOM element references.
   Loaded first. All other modules read/write these globals.
   v4.4 — Studio DOM refs are now late-bound via bindStudioElements()
          called by studio.js AFTER it injects the studio HTML.
          This prevents null crashes at parse time.
   ============================================================ */

// ── App constants ──
const APP_BASE_URL = window.location.origin;
const APP_DOMAIN   = 'trymargo.com';
const MAX_GUESS_ATTEMPTS = 2;

// ── User ID (persisted) ──
let userId = localStorage.getItem('margoUserId');
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  localStorage.setItem('margoUserId', userId);
}

// ── Feed state ──
let currentMode         = 'share';
let selectedEmotion     = null;
let currentPost         = null;
let currentGuessAttempts= 0;
let posts               = [];
let postAnalytics       = {};
let postsLoaded         = false;
let savedScrollPosition = 0;
let newPostsAvailable   = false;
let searchQuery         = '';
let activeRoom          = 'all';

// ── Studio state ──
const FONT_FAMILIES = {
  'playfair':    { family: "'Playfair Display', serif",   style: 'italic', label: 'Playfair'    },
  'cormorant':   { family: "'Cormorant Garamond', serif", style: 'italic', label: 'Cormorant'   },
  'lora':        { family: "'Lora', serif",               style: 'italic', label: 'Lora'        },
  'merriweather':{ family: "'Merriweather', serif",       style: 'normal', label: 'Merriweather'},
  'josefin':     { family: "'Josefin Sans', sans-serif",  style: 'normal', label: 'Josefin'     },
  'bebas':       { family: "'Bebas Neue', sans-serif",    style: 'normal', label: 'Bebas'       },
  'oswald':      { family: "'Oswald', sans-serif",        style: 'normal', label: 'Oswald'      },
  'dancing':     { family: "'Dancing Script', cursive",   style: 'normal', label: 'Dancing'     },
};

const POSTER_DESIGNS = {
  'midnight-gold':   { bg:['#0B0B0D','#1a1410','#0B0B0D'], primary:'#E8C547',  text:'#F0F0F0', light:false },
  'royal-purple':    { bg:['#1a0033','#2d1b4e','#1a0033'], primary:'#c77dff',  text:'#F0F0F0', light:false },
  'neon-cyan':       { bg:['#0a1420','#142838','#0a1420'], primary:'#00e5ff',  text:'#F0F0F0', light:false },
  'sunset-coral':    { bg:['#1a0a0a','#2d1416','#1a0a0a'], primary:'#ff8080',  text:'#F0F0F0', light:false },
  'emerald-night':   { bg:['#051a0d','#0d2e1a','#051a0d'], primary:'#50fa7b',  text:'#F0F0F0', light:false },
  'rose-gold':       { bg:['#1a0d0f','#2d1a1f','#1a0d0f'], primary:'#f4a4c0',  text:'#F0F0F0', light:false },
  'cream-editorial': { bg:['#f5f1e8','#ebe3d5','#f5f1e8'], primary:'#2a2520',  text:'#2a2520', light:true  },
  'monochrome':      { bg:['#000000','#111111','#000000'], primary:'#ffffff',  text:'#ffffff', light:false },
  'vaporwave':       { bg:['#2d0a3d','#6b1fa8','#1a0d3d'], primary:'#ff71ce',  text:'#ffffff', light:false },
  'neon-dark':       { bg:['#0a0a0a','#0f0f0f','#0a0a0a'], primary:'#ff00ff',  text:'#00ffff', light:false },
  'y2k-chrome':      { bg:['#000033','#1a1a4d','#000033'], primary:'#00ffff',  text:'#ffffff', light:false },
  'brutalist':       { bg:['#ffffff','#f0f0f0','#ffffff'],  primary:'#000000',  text:'#000000', light:true  },
};

const EMOTION_DESIGN_MAP = {
  Love:'rose-gold', Heartbreak:'sunset-coral', Hope:'emerald-night',
  Nostalgia:'midnight-gold', Healing:'cream-editorial', Joy:'vaporwave',
  Rage:'neon-dark', Loneliness:'royal-purple'
};

const POSTER_SIZES = {
  'instagram-square': { w:1080, h:1080 },
  'instagram-story':  { w:1080, h:1920 },
  'reddit':           { w:1200, h:1200 },
  'twitter':          { w:1200, h:675  },
  'pinterest':        { w:1000, h:1500 },
};

let studioFont      = 'playfair';
let studioDesign    = 'midnight-gold';
let studioBgImage   = null;
let studioBrightness= 100;
let studioBlur      = 0;
let studioDim       = 50;
let studioFilter    = 'none';
let generatedBlob   = null;
let selectedSize    = null;

// ── Admin state ──
let adminMode   = false;
let adminUser   = null;
let adminFilter = 'all';
let adminSort   = 'newest';
let adminSearch = '';

// ── DOM Elements — always present in HTML ──
const landing           = document.getElementById('landing');
const feed              = document.getElementById('feed');
const composer          = document.getElementById('composer');
const guessModal        = document.getElementById('guessModal');
const discoverModal     = document.getElementById('discoverModal');
const postcardModal     = document.getElementById('postcardModal');
const listenModal       = document.getElementById('listenModal');
const analyticsModal    = document.getElementById('analyticsModal');

const enterBtn          = document.getElementById('enterBtn');
const backBtn           = document.getElementById('backBtn');
const openComposerBtn   = document.getElementById('openComposer');
const closeComposerBtn  = document.getElementById('closeComposer');
const postBtn           = document.getElementById('postBtn');
const textInput         = document.getElementById('textInput');
const charCount         = document.getElementById('charCount');
const feedList          = document.getElementById('feedList');
const newPostsIndicator = document.getElementById('newPostsIndicator');
const scrollToTopBtn    = document.getElementById('scrollToTopBtn');

const modeBtns          = document.querySelectorAll('.mode-btn');
const shareInputs       = document.getElementById('shareInputs');
const guessInputs       = document.getElementById('guessInputs');
const discoverInputs    = document.getElementById('discoverInputs');
const streamingSection  = document.getElementById('streamingSection');

const songInput           = document.getElementById('songInput');
const artistInput         = document.getElementById('artistInput');
const guessSongCheck      = document.getElementById('guessSongCheck');
const guessArtistCheck    = document.getElementById('guessArtistCheck');
const guessSongAnswer     = document.getElementById('guessSongAnswer');
const guessArtistAnswer   = document.getElementById('guessArtistAnswer');
const discoverSongInput   = document.getElementById('discoverSongInput');
const discoverArtistInput = document.getElementById('discoverArtistInput');

const spotifyLink    = document.getElementById('spotifyLink');
const appleLink      = document.getElementById('appleLink');
const youtubeLink    = document.getElementById('youtubeLink');
const soundcloudLink = document.getElementById('soundcloudLink');

const sharePosterBtn = document.getElementById('sharePosterBtn');
const listenPostcard = document.getElementById('listenPostcard');
const analyticsBtn   = document.getElementById('analyticsBtn');

// ── Studio overlay (exists in HTML as empty shell) ──
const studioOverlay = document.getElementById('studioOverlay');

// ── Studio inner elements — injected by studio.js at runtime.
//    Declared as `let` here so studio.js can assign them after
//    buildStudioHTML() runs. DO NOT use getElementById here —
//    these elements don't exist yet when state.js loads. ──
let studioCanvas     = null;
let closeStudio      = null;
let studioExportBtn  = null;
let sizePicker       = null;
let sizeCancelBtn    = null;
let ceremonyOverlay  = null;
let ceremonyThumb    = null;
let cerDownload      = null;
let cerShare         = null;
let ceremonyBack     = null;
let studioPhotoInput = null;
let photoControls    = null;

// Called by studio.js immediately after buildStudioHTML()
function bindStudioElements() {
  studioCanvas     = document.getElementById('studioCanvas');
  closeStudio      = document.getElementById('closeStudio');
  studioExportBtn  = document.getElementById('studioExportBtn');
  sizePicker       = document.getElementById('sizePicker');
  sizeCancelBtn    = document.getElementById('sizeCancelBtn');
  ceremonyOverlay  = document.getElementById('ceremonyOverlay');
  ceremonyThumb    = document.getElementById('ceremonyThumb');
  cerDownload      = document.getElementById('cerDownload');
  cerShare         = document.getElementById('cerShare');
  ceremonyBack     = document.getElementById('ceremonyBack');
  studioPhotoInput = document.getElementById('studioPhotoInput');
  photoControls    = document.getElementById('photoControls');
}
