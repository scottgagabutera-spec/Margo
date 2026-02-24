/* ============================================================
   MARGO — js/firebase.js
   v4.9 — Quota guard: backfill runner stops immediately on
          429 (quotaExceeded) and does not retry until next
          session. Suggest calls are now zero-quota.
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
   YOUTUBE METADATA ENGINE v4.9
   ─────────────────────────────────────────────────────────
   Key change: _ytQuotaDead flag.
   When api/youtube returns 429 (quotaExceeded), we set
   _ytQuotaDead = true, drain the queue without fetching,
   and log a clear message. Runner stops until next page load
   (quota resets at midnight Pacific).

   Suggest calls now use zero-quota endpoint so autocomplete
   continues working even when the main quota is exhausted.
══════════════════════════════════════════════════════════ */

const _ytDoneIds  = new Set();
const _ytQueue    = [];
let   _ytRunning  = false;
let   _ytStarted  = false;
let   _ytQuotaDead = false; // stops runner when quota exhausted

function enqueueYoutube(postId, song, artist) {
  if (!isFirebaseEnabled) return;
  if (!song || !artist)   return;
  if (_ytQuotaDead)       return; // no point queuing if quota is gone
  const cleanSong   = song.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*feat\..*$/i, '').replace(/\s*ft\..*$/i, '').trim();
  if (!cleanSong   || cleanSong   === 'Unknown Song')   return;
  if (!cleanArtist || cleanArtist === 'Unknown Artist') return;
  if (_ytDoneIds.has(postId)) return;
  if (_ytQueue.some(q => q.postId === postId)) return;
  _ytQueue.push({ postId, song: cleanSong, artist: cleanArtist });
}

function startYoutubeRunner() {
  if (_ytStarted || _ytRunning || !_ytQueue.length || _ytQuotaDead) return;
  _ytStarted = true;
  _ytRunning = true;
  processYoutubeQueue();
}

async function processYoutubeQueue() {
  // Stop immediately if quota is dead or queue is empty
  if (!_ytQueue.length || _ytQuotaDead) {
    _ytRunning = false;
    if (_ytQuotaDead) console.warn('[YT] Quota exhausted — backfill paused until midnight Pacific');
    return;
  }

  const { postId, song, artist } = _ytQueue.shift();
  _ytDoneIds.add(postId);

  try {
    const meta = await _fetchYoutubeMeta(song, artist);
    if (meta) {
      await postsRef.child(postId).child('youtubeMeta').set(meta);
      console.log(`[YT] ✓ saved: ${song} — ${artist}`);
    } else {
      console.log(`[YT] no match: ${song} — ${artist}`);
    }
  } catch (err) {
    if (err.message === 'QUOTA_EXHAUSTED') {
      // Stop the runner — no point burning more calls
      _ytQuotaDead = true;
      _ytRunning   = false;
      // Put it back in queue so it can retry next session
      _ytDoneIds.delete(postId);
      _ytQueue.unshift({ postId, song, artist });
      console.warn('[YT] Quota exhausted — backfill stopped. Will retry next session.');
      return;
    }
    console.log(`[YT] error ${song}: ${err.message}`);
    _ytDoneIds.delete(postId); // allow retry next session
  }

  // 1.5s between requests — slightly more conservative than before
  setTimeout(processYoutubeQueue, 1500);
}

async function _fetchYoutubeMeta(song, artist) {
  const url = `/api/youtube?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`;
  const res  = await fetch(url);

  // Quota exhausted — throw a specific error so runner can stop cleanly
  if (res.status === 429) {
    _ytQuotaDead = true;
    throw new Error('QUOTA_EXHAUSTED');
  }

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

async function fetchAndSaveYoutubeMeta(postId, song, artist) {
  if (!isFirebaseEnabled || !postId || !song || !artist) return null;
  if (_ytQuotaDead) {
    console.warn('[YT] Skipping new post meta fetch — quota exhausted');
    return null;
  }
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

    // Only enqueue if quota is alive
    if (!_ytQuotaDead) {
      posts.forEach(p => {
        if (p.status === 'hidden') return;
        const k = p.knowledge || {};

        if (p.youtubeMeta) {
          _ytDoneIds.add(p.id);
          return;
        }

        if (p.mode === 'share' && k.song && k.artist) {
          enqueueYoutube(p.id, k.song, k.artist);
        } else if (p.mode === 'guess' && k.song && k.artist && !k.hidden) {
          enqueueYoutube(p.id, k.song, k.artist);
        } else if (p.mode === 'discover' && k.song && k.song !== 'Unknown Song') {
          enqueueYoutube(p.id, k.song, k.artist || '');
        }
      });

      if (!_ytStarted && _ytQueue.length) {
        setTimeout(startYoutubeRunner, 3000);
      }
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
}
