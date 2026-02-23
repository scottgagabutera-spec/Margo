/* ============================================================
   MARGO — js/firebase.js
   Firebase initialisation + realtime sync listeners.
   Depends on: state.js (posts, postAnalytics, postsLoaded)
   v4.5 — YouTube metadata backfill for existing posts
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

/* ── YouTube backfill queue ──────────────────────────────────
   For posts that have a known song+artist but no youtubeMeta,
   we fetch YouTube data and write it back to Firebase so ALL
   posts are uniform. Rate-limited to 1 per 800ms to avoid
   hammering the API.
────────────────────────────────────────────────────────────── */
const _ytBackfillQueue   = [];
let   _ytBackfillRunning = false;

function queueYoutubeBackfill(postId, song, artist) {
  // Skip unknowns
  if (!song || !artist || song === 'Unknown Song' || artist === 'Unknown Artist') return;
  // Don't double-queue
  if (_ytBackfillQueue.find(q => q.postId === postId)) return;
  _ytBackfillQueue.push({ postId, song, artist });
  if (!_ytBackfillRunning) runBackfillQueue();
}

async function runBackfillQueue() {
  if (!_ytBackfillQueue.length) { _ytBackfillRunning = false; return; }
  _ytBackfillRunning = true;
  const { postId, song, artist } = _ytBackfillQueue.shift();

  try {
    const res  = await fetch(`/api/youtube?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`);
    const data = await res.json();
    if (res.ok && data && data.videoId && !data.error) {
      const meta = {
        videoId:    data.videoId    || null,
        title:      data.title      || '',
        thumbnail:  data.thumbnail  || null,
        thumbnailSm: data.thumbnailSm || data.thumbnail || null,
        channel:    data.channel    || '',
        youtubeUrl: data.youtubeUrl || null,
        embedUrl:   data.embedUrl   || null,
      };
      // Write back to Firebase — only set youtubeMeta, don't touch anything else
      await postsRef.child(postId).child('youtubeMeta').set(meta);
      console.log(`[Backfill] ✓ ${song} — ${artist}`);
    }
  } catch (err) {
    // Silently skip — don't block the queue
    console.log(`[Backfill] skip ${song}: ${err.message}`);
  }

  // Next item after 900ms — be polite to the API
  setTimeout(runBackfillQueue, 900);
}

/* ── Realtime listeners — started after DOM is ready ── */
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

      // ── Backfill YouTube metadata for posts that lack it ──
      if (isFirebaseEnabled) {
        posts.forEach(p => {
          if (!p.youtubeMeta && p.status !== 'hidden') {
            const k = p.knowledge || {};
            // Share mode: has explicit song+artist
            if (p.mode === 'share') {
              queueYoutubeBackfill(p.id, k.song, k.artist);
            }
            // Guess mode: has answer key
            if (p.mode === 'guess' && k.song && k.artist && !k.hidden) {
              queueYoutubeBackfill(p.id, k.song, k.artist);
            }
            // Discover mode with community-identified song
            if (p.mode === 'discover' && k.song && k.song !== 'Unknown Song') {
              queueYoutubeBackfill(p.id, k.song, k.artist);
            }
          }
        });
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
