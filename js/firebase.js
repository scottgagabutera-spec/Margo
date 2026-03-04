/* ============================================================
   MARGO — js/firebase.js
   v4.9 — Stats fix: updateLandingStats only fires after posts
          are loaded. analyticsRef listener also updates stats
          and re-renders feed correctly.
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
══════════════════════════════════════════════════════════ */

const _ytDoneIds = new Set();
const _ytQueue   = [];
let   _ytRunning = false;
let   _ytStarted = false;

function enqueueYoutube(postId, song, artist) {
  if (!isFirebaseEnabled) return;
  if (!song || !artist)   return;
  const cleanSong   = song.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*feat\..*$/i, '').replace(/\s*ft\..*$/i, '').trim();
  if (!cleanSong || cleanSong === 'Unknown Song')       return;
  if (!cleanArtist || cleanArtist === 'Unknown Artist') return;
  if (_ytDoneIds.has(postId)) return;
  if (_ytQueue.some(q => q.postId === postId)) return;
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
    console.log(`[YT] error ${song}: ${err.message}`);
    _ytDoneIds.delete(postId);
  }
  setTimeout(processYoutubeQueue, 1200);
}

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
   STATS HELPER
   Single place that updates all stat elements.
   Only runs if posts have loaded — prevents dashes persisting
   because calcFeatured() read an empty posts array.
══════════════════════════════════════════════════════════ */
function _refreshStats() {
  if (!postsLoaded) return;
  if (typeof updateLandingStats === 'function') updateLandingStats();
  const postCountEl = document.getElementById('postCount');
  if (postCountEl) {
    postCountEl.textContent = posts.filter(p => p.status !== 'hidden').length;
  }
}

/* ══════════════════════════════════════════════════════════
   FIREBASE REALTIME SYNC
══════════════════════════════════════════════════════════ */
function startFirebaseSync() {
  if (!isFirebaseEnabled) {
    postsLoaded = true;
    _refreshStats();
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

    posts.forEach(p => {
      if (p.status === 'hidden') return;
      const k = p.knowledge || {};
      if (p.youtubeMeta) { _ytDoneIds.add(p.id); return; }
      if (p.mode === 'share' && k.song && k.artist) {
        enqueueYoutube(p.id, k.song, k.artist);
      } else if (p.mode === 'guess' && k.song && k.artist && !k.hidden) {
        enqueueYoutube(p.id, k.song, k.artist);
      } else if (p.mode === 'discover' && k.song && k.song !== 'Unknown Song') {
        enqueueYoutube(p.id, k.song, k.artist || '');
      }
    });

    if (!_ytStarted && _ytQueue.length) setTimeout(startYoutubeRunner, 3000);

    const isInitialLoad  = !postsLoaded;
    const isBackfillOnly = postsLoaded && posts.length === prevCount;

    // Set postsLoaded BEFORE _refreshStats so the guard inside passes
    postsLoaded = true;

    _refreshStats();
    buildLyricStream();

    if (!isInitialLoad && !isBackfillOnly && posts.length > prevCount && feed.classList.contains('active')) {
      showNewPostsIndicator(posts.length - prevCount);
      newPostsAvailable = true;
    }

    if (feed.classList.contains('active')) {
      if (isInitialLoad || isBackfillOnly || !newPostsAvailable) renderFeed();
    }
  });

  analyticsRef.on('value', snapshot => {
    postAnalytics = snapshot.val() || {};

    // Guard: only refresh stats once posts are loaded
    // (analyticsRef often fires before postsRef on cold start)
    _refreshStats();

    // Re-render feed if active — refreshes resonate counts on cards
    if (postsLoaded) {
      const feedEl = document.getElementById('feed');
      if (feedEl && feedEl.classList.contains('active') && typeof renderFeed === 'function') {
        renderFeed();
      }
    }

    buildLyricStream();
  });
}
