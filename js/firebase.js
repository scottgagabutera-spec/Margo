/* ============================================================
   MARGO — js/firebase.js
   Firebase initialisation + realtime sync listeners.
   v4.6 — Backfill decoupled from render, no flicker
   ============================================================ */
const firebaseConfig = {
  apiKey:            'AIzaSyA1AuUethACF_9aBqbOONjra7X5NbGnfZM',
  authDomain:        'margo-f6da4.firebaseapp.com',
  databaseURL:       'https://margo-f6da4-default-rtdb.firebaseio.com',
  projectId:         'margo-f6da4',
  storageBucket:     'margo-f6da4.firebasestorage.app',
  messagingSenderId: '150183564620',
  appId:             '1:150183564620:web:a42de7fef39740b551ebe9'
};
let isFirebaseEnabled = false;
let postsRef          = null;
let analyticsRef      = null;
let adminConfigRef    = null;
let firebaseAuth      = null;
try {
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  postsRef       = database.ref('posts');
  analyticsRef   = database.ref('analytics');
  adminConfigRef = database.ref('adminConfig');
  firebaseAuth   = firebase.auth();
  isFirebaseEnabled = true;
  console.log('Firebase OK');
} catch (e) {
  console.warn('Firebase failed:', e.message);
}

/* ── YouTube backfill ────────────────────────────────────────
   Writing youtubeMeta back to Firebase re-triggers the 'value'
   listener. We guard with _backfilledIds so each post is only
   ever queued once per session — preventing flicker loops.
   Backfill starts 2s after first render to avoid blocking UI.
────────────────────────────────────────────────────────────── */
const _ytBackfillQueue   = [];
const _backfilledIds     = new Set();
let   _ytBackfillRunning = false;
let   _backfillStarted   = false;

function queueYoutubeBackfill(postId, song, artist) {
  if (!song || !artist) return;
  if (song === 'Unknown Song' || artist === 'Unknown Artist') return;
  if (_backfilledIds.has(postId)) return;
  _backfilledIds.add(postId);
  _ytBackfillQueue.push({ postId, song, artist });
}

function startBackfillRunner() {
  if (_ytBackfillRunning || !_ytBackfillQueue.length) return;
  _ytBackfillRunning = true;
  processNextBackfill();
}

async function processNextBackfill() {
  if (!_ytBackfillQueue.length) {
    _ytBackfillRunning = false;
    return;
  }
  const { postId, song, artist } = _ytBackfillQueue.shift();
  try {
    const res  = await fetch(`/api/youtube?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`);
    const data = await res.json();
    if (res.ok && data && data.videoId && !data.error) {
      const meta = {
        videoId:     data.videoId     || null,
        title:       data.title       || '',
        thumbnail:   data.thumbnail   || null,
        thumbnailSm: data.thumbnailSm || data.thumbnail || null,
        channel:     data.channel     || '',
        youtubeUrl:  data.youtubeUrl  || null,
        embedUrl:    data.embedUrl    || null,
      };
      await postsRef.child(postId).child('youtubeMeta').set(meta);
      console.log(`[YT Backfill] ✓ ${song} — ${artist}`);
    }
  } catch (err) {
    console.log(`[YT Backfill] skip "${song}": ${err.message}`);
  }
  setTimeout(processNextBackfill, 1200);
}

/* ── Realtime listeners ── */
function startFirebaseSync() {
  if (isFirebaseEnabled) {
    postsRef.orderByChild('timestamp').limitToLast(200).on('value', snapshot => {
      const prevCount = posts.length;
      posts = [];
      snapshot.forEach(child => {
        const p = child.val();
        p.id = child.key;
        posts.unshift(p);
      });
      posts.sort((a, b) => b.timestamp - a.timestamp);

      // Queue backfills — _backfilledIds ensures each post queued once only
      posts.forEach(p => {
        if (p.youtubeMeta || p.status === 'hidden') return;
        const k = p.knowledge || {};
        if (p.mode === 'share' && k.song && k.artist) {
          queueYoutubeBackfill(p.id, k.song, k.artist);
        } else if (p.mode === 'guess' && k.song && k.artist && !k.hidden) {
          queueYoutubeBackfill(p.id, k.song, k.artist);
        } else if (p.mode === 'discover' && k.song && k.song !== 'Unknown Song') {
          queueYoutubeBackfill(p.id, k.song, k.artist);
        }
      });

      // Start backfill runner 3s after first load — let the feed render first
      if (!_backfillStarted) {
        _backfillStarted = true;
        setTimeout(startBackfillRunner, 3000);
      }

      updateLandingStats();
      buildLyricStream();

      if (postsLoaded && posts.length > prevCount && feed.classList.contains('active')) {
        showNewPostsIndicator(posts.length - prevCount);
        newPostsAvailable = true;
      }
      postsLoaded = true;
      if (feed.classList.contains('active') && !newPostsAvailable) renderFeed();
    });

    analyticsRef.on('value', snapshot => {
      postAnalytics = snapshot.val() || {};
      buildLyricStream();
    });
  } else {
    postsLoaded = true;
    updateLandingStats();
    buildLyricStream();
  }
}
