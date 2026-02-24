/* ============================================================
   MARGO — js/firebase.js
   v4.8 — Bulletproof YouTube: new posts + backfill unified,
          never double-fetches, handles all failure modes
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
  console.log('[Margo] Firebase OK');
} catch (e) {
  console.warn('[Margo] Firebase failed:', e.message);
}

/* ══════════════════════════════════════════════════════════
   YOUTUBE METADATA ENGINE
   ─────────────────────────────────────────────────────────
   SINGLE SOURCE OF TRUTH for all YouTube fetching.

   Logic:
   • _ytDoneIds   = Set of postIds that already have meta in
                    Firebase OR that we've confirmed have none.
                    Populated on sync. Persists for session.
   • _ytQueue     = Array of {postId, song, artist} waiting
                    to be fetched. Each postId appears once.
   • _ytRunning   = Whether the runner is active.

   Flow for NEW posts (called from composer.js submitPost):
     await fetchAndSaveYoutubeMeta(postId, song, artist)
     → fetches immediately, writes to Firebase, done.

   Flow for EXISTING posts without meta (backfill):
     On Firebase sync → enqueueYoutube(postId, song, artist)
     → deduplicated queue, runs 1 per 1.2s, writes to Firebase.

   Writing to Firebase (.child('youtubeMeta').set(...)) DOES
   re-trigger the 'value' listener. We guard against infinite
   loops by checking _ytDoneIds BEFORE re-queuing.
══════════════════════════════════════════════════════════ */

const _ytDoneIds = new Set(); // postIds that have meta or confirmed none
const _ytQueue   = [];        // [{postId, song, artist}]
let   _ytRunning = false;
let   _ytStarted = false;     // only start runner once per session

/* Called on sync — enqueue posts that need YouTube meta */
function enqueueYoutube(postId, song, artist) {
  if (!isFirebaseEnabled) return;
  if (!song || !artist)   return;
  // Normalize — strip featuring info that confuses YouTube
  const cleanSong   = song.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*feat\..*$/i, '').replace(/\s*ft\..*$/i, '').trim();
  if (!cleanSong || cleanSong === 'Unknown Song')     return;
  if (!cleanArtist || cleanArtist === 'Unknown Artist') return;
  if (_ytDoneIds.has(postId)) return; // already have meta or confirmed no match
  if (_ytQueue.some(q => q.postId === postId)) return; // already queued
  _ytQueue.push({ postId, song: cleanSong, artist: cleanArtist });
}

function startYoutubeRunner() {
  if (_ytStarted || _ytRunning || !_ytQueue.length) return;
  _ytStarted = true;
  _ytRunning = true;
  processYoutubeQueue();
}

async function processYoutubeQueue() {
  if (!_ytQueue.length) { _ytRunning = false; return; }
  const { postId, song, artist } = _ytQueue.shift();
  _ytDoneIds.add(postId); // mark before fetch so re-trigger doesn't re-queue

  try {
    const meta = await _fetchYoutubeMeta(song, artist);
    if (meta) {
      await postsRef.child(postId).child('youtubeMeta').set(meta);
      console.log(`[YT] ✓ saved: ${song} — ${artist}`);
    } else {
      console.log(`[YT] no match: ${song} — ${artist}`);
    }
  } catch (err) {
    console.log(`[YT] error ${song}: ${err.message}`);
    // Remove from done so it can retry next session
    _ytDoneIds.delete(postId);
  }

  setTimeout(processYoutubeQueue, 1200); // 1.2s between requests
}

/* Shared fetch function — used by both new posts and backfill */
async function _fetchYoutubeMeta(song, artist) {
  const url = `/api/youtube?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`;
  const res  = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.videoId || data.error) return null;
  return {
    videoId:     data.videoId     || null,
    title:       data.title       || '',
    thumbnail:   data.thumbnail   || null,
    thumbnailSm: data.thumbnailSm || data.thumbnail || null,
    channel:     data.channel     || '',
    youtubeUrl:  data.youtubeUrl  || `https://www.youtube.com/watch?v=${data.videoId}`,
    embedUrl:    data.embedUrl    || `https://www.youtube.com/embed/${data.videoId}`,
  };
}

/*
  Called from composer.js when a new post is submitted.
  Usage: const meta = await fetchAndSaveYoutubeMeta(postId, song, artist);
  Returns the meta object or null.
*/
async function fetchAndSaveYoutubeMeta(postId, song, artist) {
  if (!isFirebaseEnabled || !postId || !song || !artist) return null;
  const cleanSong   = song.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*feat\..*$/i, '').replace(/\s*ft\..*$/i, '').trim();
  if (!cleanSong || !cleanArtist) return null;
  try {
    const meta = await _fetchYoutubeMeta(cleanSong, cleanArtist);
    if (meta) {
      _ytDoneIds.add(postId);
      await postsRef.child(postId).child('youtubeMeta').set(meta);
      console.log(`[YT] ✓ new post: ${cleanSong} — ${cleanArtist}`);
    }
    return meta;
  } catch (err) {
    console.log(`[YT] new post error: ${err.message}`);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════
   FIREBASE REALTIME SYNC
══════════════════════════════════════════════════════════ */
function startFirebaseSync() {
  if (!isFirebaseEnabled) {
    postsLoaded = true;
    updateLandingStats();
    buildLyricStream();
    return;
  }

  postsRef.orderByChild('timestamp').limitToLast(200).on('value', snapshot => {
    const prevCount = posts.length;
    posts = [];
    snapshot.forEach(child => {
      const p = child.val();
      p.id = child.key;
      posts.unshift(p);
    });
    posts.sort((a, b) => b.timestamp - a.timestamp);

    // Scan posts: mark those with meta as done, queue those without
    posts.forEach(p => {
      if (p.status === 'hidden') return;
      const k = p.knowledge || {};

      if (p.youtubeMeta) {
        // Already has meta — mark done so we never re-queue
        _ytDoneIds.add(p.id);
        return;
      }

      // Determine song + artist based on mode
      if (p.mode === 'share' && k.song && k.artist) {
        enqueueYoutube(p.id, k.song, k.artist);
      } else if (p.mode === 'guess' && k.song && k.artist && !k.hidden) {
        enqueueYoutube(p.id, k.song, k.artist);
      } else if (p.mode === 'discover' && k.song && k.song !== 'Unknown Song') {
        enqueueYoutube(p.id, k.song, k.artist || '');
      }
    });

    // Start the runner 3s after first load (let render settle first)
    if (!_ytStarted && _ytQueue.length) {
      setTimeout(startYoutubeRunner, 3000);
    }

    updateLandingStats();
    buildLyricStream();

    // Only show "new posts" indicator for GENUINE new posts —
    // not on initial load (prevCount===0) and not for backfill
    // writes (post count stays the same, only youtubeMeta changed).
    const isInitialLoad  = !postsLoaded;
    const isBackfillOnly = postsLoaded && posts.length === prevCount;

    if (postsLoaded && !isBackfillOnly && posts.length > prevCount && feed.classList.contains('active')) {
      showNewPostsIndicator(posts.length - prevCount);
      newPostsAvailable = true;
    }

    postsLoaded = true;

    // Re-render feed: always on initial load, or when genuinely
    // new posts arrive. Backfill writes re-render silently only
    // if feed is visible and no pending new-posts bar is shown.
    if (feed.classList.contains('active')) {
      if (isInitialLoad || isBackfillOnly || !newPostsAvailable) renderFeed();
    }
  });

  analyticsRef.on('value', snapshot => {
    postAnalytics = snapshot.val() || {};
    buildLyricStream();
  });
}
