/* ============================================================
   MARGO — js/firebase.js
   v5.1 — Fetches Firebase config from /api/config (server-side
          env vars) instead of hardcoding keys in source.
   ============================================================ */
let isFirebaseEnabled = false;
let postsRef          = null;
let analyticsRef      = null;
let adminConfigRef    = null;
let firebaseAuth      = null;

async function initFirebase() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Config fetch failed: ' + res.status);
    const firebaseConfig = await res.json();
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    postsRef       = database.ref('posts');
    analyticsRef   = database.ref('analytics');
    adminConfigRef = database.ref('adminConfig');
    firebaseAuth   = firebase.auth();
    isFirebaseEnabled = true;
    loadFeaturedLyric();
  } catch (e) {
    console.warn('[Margo] Firebase failed:', e.message);
    isFirebaseEnabled = false;
  }
  if (typeof startFirebaseSync === 'function') startFirebaseSync();
}

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
  if (_ytRunning || !_ytQueue.length) return;
  _ytStarted = true;
  _ytRunning = true;
  processYoutubeQueue();
}

async function processYoutubeQueue() {
  if (!_ytQueue.length) { _ytRunning = false; _ytStarted = false; return; }
  const { postId, song, artist } = _ytQueue.shift();
  _ytDoneIds.add(postId);
  try {
    const meta = await _fetchYoutubeMeta(song, artist);
    if (meta) await postsRef.child(postId).child('youtubeMeta').set(meta);
  } catch (err) {
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

function _refreshStats() {
  if (!postsLoaded) return;
  if (typeof updateLandingStats === 'function') updateLandingStats();
  const postCountEl = document.getElementById('postCount');
  if (postCountEl) {
    postCountEl.textContent = posts.filter(p => p.status !== 'hidden').length;
  }
}

function startFirebaseSync() {
  if (!isFirebaseEnabled) {
    postsLoaded = true;
    _refreshStats();
    if (typeof buildLyricStream === 'function') buildLyricStream();
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

    postsLoaded = true;
    _refreshStats();
    if (typeof buildLyricStream === 'function') buildLyricStream();

    if (!isInitialLoad && !isBackfillOnly && posts.length > prevCount && feed && feed.classList.contains('active')) {
      if (typeof showNewPostsIndicator === 'function') showNewPostsIndicator(posts.length - prevCount);
      newPostsAvailable = true;
    }

    // Always render on initial load — feed may not be active yet but posts are ready
    if (isInitialLoad) {
      if (typeof renderFeed === 'function') renderFeed();
    } else if (feed && feed.classList.contains('active')) {
      if (isBackfillOnly || !newPostsAvailable) {
        if (typeof renderFeed === 'function') renderFeed();
      }
    }
  });

  analyticsRef.on('value', snapshot => {
    postAnalytics = snapshot.val() || {};
    _refreshStats();
  });
}

initFirebase();

/* ── Featured lyric — loads from adminConfig/featuredLyric on landing ── */
function loadFeaturedLyric() {
  if (!isFirebaseEnabled || !adminConfigRef) return;
  adminConfigRef.child('featuredLyric').once('value', function(snap) {
    const data = snap.val();
    if (!data || !data.text) return;
    const textEl = document.getElementById('heroFeaturedText');
    const attrEl = document.getElementById('heroFeaturedAttr');
    if (textEl) textEl.textContent = data.text;
    if (attrEl) attrEl.textContent = (data.artist || '') + (data.song ? ' \u00b7 ' + data.song : '');
  });
}
