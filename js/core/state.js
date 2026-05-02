/* ============================================================
   MARGO — js/state.js
   Shared state, constants, and DOM element references.
   Loaded first. All other modules read/write these globals.
   v5.0 — concept-v2 branch:
          • FONT_FAMILIES, POSTER_DESIGNS, POSTER_SIZES,
            EMOTION_DESIGN_MAP use window.X = window.X || {}
            to prevent duplicate-declaration errors across files.
          • postcardModal + chooser refs removed (gone in v2).
          • Echo + resonate state added.
          • sharePosterBtn reference kept — studio.js still uses it
            but now routes to openShareSheet() instead of chooser.
   ============================================================ */

// ── App constants ──
const APP_BASE_URL = window.location.origin;
const APP_DOMAIN   = 'trymargo.com';

// ── User ID (persisted) ──
let userId = localStorage.getItem('margoUserId');
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
  localStorage.setItem('margoUserId', userId);
}

// ── Feed state ──
let currentMode          = 'share';
let selectedEmotion      = null;
let currentPost          = null;
let posts                = [];
let postAnalytics        = {};
let postsLoaded          = false;
let savedScrollPosition  = 0;
let newPostsAvailable    = false;
let searchQuery          = '';
let activeRoom           = 'all';
let currentSort          = 'fresh';

// ── Studio state ──
// Use window.X = window.X || {} pattern — prevents duplicate-const
// errors if these are also referenced in studio.js or duet-mode.js
window.FONT_FAMILIES = window.FONT_FAMILIES || {
  'playfair':    { family: "'Playfair Display', serif",   style: 'italic', label: 'Playfair'    },
  'cormorant':   { family: "'Cormorant Garamond', serif", style: 'italic', label: 'Cormorant'   },
  'lora':        { family: "'Lora', serif",               style: 'italic', label: 'Lora'        },
  'merriweather':{ family: "'Merriweather', serif",       style: 'normal', label: 'Merriweather'},
  'josefin':     { family: "'Josefin Sans', sans-serif",  style: 'normal', label: 'Josefin'     },
  'bebas':       { family: "'Bebas Neue', sans-serif",    style: 'normal', label: 'Bebas'       },
  'oswald':      { family: "'Oswald', sans-serif",        style: 'normal', label: 'Oswald'      },
  'dancing':     { family: "'Dancing Script', cursive",   style: 'normal', label: 'Dancing'     },
};
const FONT_FAMILIES = window.FONT_FAMILIES; // local alias for backward compat

window.POSTER_DESIGNS = window.POSTER_DESIGNS || {
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
const POSTER_DESIGNS = window.POSTER_DESIGNS;

window.EMOTION_DESIGN_MAP = window.EMOTION_DESIGN_MAP || {
  Love:'rose-gold', Heartbreak:'sunset-coral', Hope:'emerald-night',
  Nostalgia:'midnight-gold', Healing:'cream-editorial', Joy:'vaporwave',
  Rage:'neon-dark', Loneliness:'royal-purple'
};
const EMOTION_DESIGN_MAP = window.EMOTION_DESIGN_MAP;

window.POSTER_SIZES = window.POSTER_SIZES || {
  'instagram-square': { w:1080, h:1080 },
  'instagram-story':  { w:1080, h:1920 },
  'reddit':           { w:1200, h:1200 },
  'twitter':          { w:1200, h:675  },
  'pinterest':        { w:1000, h:1500 },
};
const POSTER_SIZES = window.POSTER_SIZES;

let studioFont       = 'playfair';
let studioDesign     = 'midnight-gold';
let studioBgImage    = null;
let studioBrightness = 100;
let studioBlur       = 0;
let studioDim        = 50;
let studioFilter     = 'none';
let generatedBlob    = null;
let selectedSize     = null;

// ── Admin state ──
let adminMode   = false;
let adminUser   = null;
let adminFilter = 'all';
let adminSort   = 'newest';
let adminSearch = '';

// ── DOM Elements — always present ──
const landing           = document.getElementById('landing');
const feed              = document.getElementById('feed');
window.feed = feed;
const composer          = document.getElementById('composer');

// NOTE: postcardModal and studioChooser are removed in concept-v2.
// Any code referencing them will safely get `null` from getElementById.
const postcardModal     = document.getElementById('postcardModal');   // null in v2
const studioChooserEl   = document.getElementById('studioChooser');  // null in v2

const enterBtn          = document.getElementById('enterBtn');
const backBtn           = document.getElementById('backBtn');
const openComposerBtn   = document.getElementById('openComposer');
const closeComposerBtn  = document.getElementById('closeComposer');
const postBtn           = document.getElementById('postBtn');
const getTextInput    = () => document.getElementById('textInput');
const getCharCount    = () => document.getElementById('charCount');
const feedList          = document.getElementById('feedList');
const newPostsIndicator = document.getElementById('newPostsIndicator');
const scrollToTopBtn    = document.getElementById('scrollToTopBtn');

const shareInputs       = document.getElementById('shareInputs');
const streamingSection  = document.getElementById('streamingSection');

const getSongInput    = () => document.getElementById('songInput');
const getArtistInput  = () => document.getElementById('artistInput');

const spotifyLink    = document.getElementById('spotifyLink');
const appleLink      = document.getElementById('appleLink');
const youtubeLink    = document.getElementById('youtubeLink');
const soundcloudLink = document.getElementById('soundcloudLink');

// sharePosterBtn now routes to openShareSheet() via app.js init
const sharePosterBtn = document.getElementById('sharePosterBtn');

// ── Studio elements ──
const studioOverlay   = document.getElementById('studioOverlay');
const studioCanvas    = document.getElementById('studioCanvas');
const closeStudio     = document.getElementById('closeStudio');
const studioExportBtn = document.getElementById('studioExportBtn');
const sizePicker      = document.getElementById('sizePicker');
const sizeCancelBtn   = document.getElementById('sizeCancelBtn');
const ceremonyOverlay = document.getElementById('ceremonyOverlay');
const ceremonyThumb   = document.getElementById('ceremonyThumb');
const cerDownload     = document.getElementById('cerDownload');
const cerShare        = document.getElementById('cerShare');
const ceremonyBack    = document.getElementById('ceremonyBack');
const studioPhotoInput= document.getElementById('studioPhotoInput');
const photoControls   = document.getElementById('photoControls');

// Safety no-op (studio.js may call this — it's fine)
function bindStudioElements() {}
