/* ============================================================
   MARGO — js/feed.js
   Landing lyric stream, stats bar, search, room tabs,
   feed ranking, and renderFeed.
   Depends on: state.js, firebase.js
   v4.3
   ============================================================ */

// ── Lyric stream sample data (shown before Firebase loads) ──
const STREAM_SAMPLES = [
  { text: "I gave you all I had and still you left",             emotion: 'Heartbreak' },
  { text: "Some nights I still hear your voice in the quiet",    emotion: 'Nostalgia'  },
  { text: "Dancing alone was better than lying beside you",      emotion: 'Healing'    },
  { text: "The city never sleeps but I always dream of you",     emotion: 'Love'       },
  { text: "Rage is just grief that forgot how to cry",           emotion: 'Rage'       },
  { text: "Every sunrise is a permission to start over",         emotion: 'Hope'       },
  { text: "I carry your memory like a song I can't name",        emotion: 'Loneliness' },
  { text: "Nothing gold can stay but gold can glow forever",     emotion: 'Nostalgia'  },
  { text: "You were thunder and I was the calm after",           emotion: 'Love'       },
  { text: "Joy is not the absence of pain, it's dancing anyway", emotion: 'Joy'        },
  { text: "Missing someone is just love with nowhere to go",     emotion: 'Loneliness' },
  { text: "I built a home in your chest and you moved out",      emotion: 'Heartbreak' },
];

// ── Emotion colour maps ──
const EMOTION_COLORS = {
  Love:'rgba(255,107,157,0.12)', Heartbreak:'rgba(255,80,80,0.1)',
  Hope:'rgba(107,140,255,0.12)', Nostalgia:'rgba(232,197,71,0.1)',
  Healing:'rgba(74,222,128,0.12)', Joy:'rgba(255,200,71,0.1)',
  Rage:'rgba(255,100,100,0.12)', Loneliness:'rgba(160,160,255,0.1)'
};
const EMOTION_TEXT = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6464', Loneliness:'#a0a0ff'
};

// ── Font preload ──
function preloadStudioFonts() {
  const fonts = [
    "700 16px 'Playfair Display'", "italic 16px 'Playfair Display'",
    "600 16px 'Cormorant Garamond'", "italic 16px 'Cormorant Garamond'",
    "600 16px 'Lora'", "italic 16px 'Lora'",
    "700 16px 'Merriweather'", "700 16px 'Josefin Sans'",
    "400 16px 'Bebas Neue'", "600 16px 'Oswald'",
    "700 16px 'Dancing Script'",
    "800 16px 'Syne'",
    "700 16px 'Space Mono'",
    "italic 16px 'DM Serif Display'",
    "700 16px 'DM Sans'",
  ];
  fonts.forEach(f => document.fonts.load(f).catch(() => {}));
}

// ── Lyric stream ──
function buildLyricStream() {
  const track1 = document.getElementById('track1');
  const track2 = document.getElementById('track2');
  if (!track1 || !track2) return;
  track1.innerHTML = '';
  track2.innerHTML = '';
  const source = getTickerPosts();
  const fill   = [...source, ...source, ...source];

  const buildCard = item => {
    const emotion = item.emotion || 'Nostalgia';
    const eClass  = 'emotion-' + emotion.toLowerCase();
    const text    = item.text || '';
    const display = text.length > 44 ? text.substring(0, 44) + '…' : text;
    const card    = document.createElement('div');
    card.className = 'lyric-card' + (Math.random() > 0.65 ? ' featured' : '');
    card.innerHTML = `<div class="lyric-card-text">${display}</div>
      <div class="lyric-card-meta"><span class="lyric-card-emotion ${eClass}">${emotion}</span></div>`;
    return card;
  };

  const offset = Math.floor(source.length / 2);
  fill.forEach(item => track1.appendChild(buildCard(item)));
  [...source.slice(offset), ...source, ...source, ...source.slice(0, offset)]
    .forEach(item => track2.appendChild(buildCard(item)));
}

function getTickerPosts() {
  if (posts.length < 6) return STREAM_SAMPLES;
  const recent  = posts.slice(0, 4);
  const byViews = posts.filter(p => !recent.includes(p))
    .sort((a,b) => (postAnalytics[b.id]?.views||0) - (postAnalytics[a.id]?.views||0))
    .slice(0, 4);
  const rest   = posts.filter(p => !recent.includes(p) && !byViews.includes(p));
  const random = rest.sort(() => Math.random() - 0.5).slice(0, 4);
  return [...recent, ...byViews, ...random];
}

// ── Stats bar ──
function initStatsShimmer() {
  const ids = ['statTotal','featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.textContent === '—') {
      el.innerHTML = '<span class="stat-shimmer">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
    }
  });
}

function calcFeatured() {
  const artistCounts = {}, songCounts = {}, emotionCounts = {};
  posts.forEach(p => {
    const artist  = p.knowledge?.artist;
    const song    = p.knowledge?.song;
    const emotion = p.emotion || 'Nostalgia';
    if (artist && artist !== 'Unknown Artist') { const k = artist.trim(); artistCounts[k] = (artistCounts[k]||0)+1; }
    if (song   && song   !== 'Unknown Song')   { const k = song.trim();   songCounts[k]   = (songCounts[k]  ||0)+1; }
    emotionCounts[emotion] = (emotionCounts[emotion]||0)+1;
  });
  const artistEntries = Object.entries(artistCounts).sort((a,b)=>b[1]-a[1]);
  const songEntries   = Object.entries(songCounts).sort((a,b)=>b[1]-a[1]);
  const topEmotion    = Object.entries(emotionCounts).sort((a,b)=>b[1]-a[1])[0];
  return {
    uniqueArtistCount: Object.keys(artistCounts).length,
    uniqueSongCount:   Object.keys(songCounts).length,
    topArtist: (artistEntries[0]?.[1] >= 2) ? artistEntries[0][0] : null,
    topSong:   (songEntries[0]?.[1]   >= 2) ? songEntries[0][0]   : null,
    topEmotion
  };
}

function updateLandingStats() {
  const n = posts.length || 0;
  const $ = id => document.getElementById(id);
  if ($('liveCount'))  $('liveCount').textContent  = n;
  if ($('statTotal'))  $('statTotal').textContent  = n || '—';
  if ($('postCount'))  $('postCount').textContent  = n;
  if (!n) {
    ['featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion']
      .forEach(id => { if ($(id)) $(id).textContent = '—'; });
    return;
  }
  const { uniqueArtistCount, uniqueSongCount, topArtist, topSong, topEmotion } = calcFeatured();
  if ($('featuredArtistCount')) $('featuredArtistCount').textContent = uniqueArtistCount || '—';
  if ($('featuredSongCount'))   $('featuredSongCount').textContent   = uniqueSongCount   || '—';
  if ($('topArtistName'))       $('topArtistName').textContent       = topArtist         || '—';
  if ($('topSongName'))         $('topSongName').textContent         = topSong           || '—';
  if ($('topEmotion'))          $('topEmotion').textContent          = topEmotion ? topEmotion[0] : '—';
}

function setupStatsBar() {
  const bar = document.querySelector('.stats-bar');
  if (!bar) return;
  function alignStats() {
    if (window.innerWidth >= 769) {
      bar.style.justifyContent = bar.scrollWidth <= bar.clientWidth ? 'center' : 'flex-start';
    } else {
      bar.style.justifyContent = 'flex-start';
      bar.scrollLeft = 0;
    }
  }
  alignStats();
  window.addEventListener('resize', alignStats);
}

// ── Search ──
function getFilteredPosts() {
  // Step 0: never show hidden posts in public feed
  const visible = posts.filter(p => p.status !== 'hidden');
  // Step 1: filter by active emotion room
  let filtered = activeRoom === 'all'
    ? visible
    : visible.filter(p => (p.emotion || '').toLowerCase() === activeRoom.toLowerCase());
  // Step 2: filter by search query
  if (!searchQuery) return filtered;
  const q = searchQuery.toLowerCase();
  return filtered.filter(p =>
    (p.text              || '').toLowerCase().includes(q)
    || (p.knowledge?.song   || '').toLowerCase().includes(q)
    || (p.knowledge?.artist || '').toLowerCase().includes(q)
    || (p.emotion           || '').toLowerCase().includes(q)
  );
}

function highlightMatch(text, query) {
  if (!query || !text) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function clearSearch() {
  const input    = document.getElementById('feedSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  searchQuery = '';
  if (input)    input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  renderFeed();
}

function initSearch() {
  const input    = document.getElementById('feedSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  if (!input) return;
  input.oninput = () => {
    searchQuery = input.value.trim();
    if (clearBtn) clearBtn.style.display = searchQuery ? 'flex' : 'none';
    renderFeed();
  };
  input.onkeydown = e => {
    if (e.key === 'Escape') { clearSearch(); input.blur(); }
  };
  if (clearBtn) clearBtn.onclick = () => { clearSearch(); input.focus(); };
}

// ── Room tabs ──
function initRoomTabs() {
  const tabs = document.querySelectorAll('.room-tab');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeRoom = tab.dataset.room;
      renderFeed();
    };
  });
}

// ── Feed ranking ──
function calculatePostScore(post) {
  const now = Date.now();
  const ageInHours = post.timestamp
    ? (now - post.timestamp) / (1000 * 60 * 60)
    : 999;
  const recencyScore = Math.max(0, 48 - ageInHours);
  const analytics = postAnalytics[post.id] || {};
  const views   = analytics.views || 0;
  const guesses = Object.keys(analytics.guesses || {}).length;
  const helps   = Object.keys(analytics.helps   || {}).length;
  return (recencyScore * 0.4) + (views * 0.2) + (guesses * 0.25) + (helps * 0.15);
}

function getRankedPosts() {
  return getFilteredPosts().sort((a, b) => calculatePostScore(b) - calculatePostScore(a));
}

// ── Render feed ──
function getDynamicFontSize() { return '0.95rem'; }

function renderFeed() {
  feedList.innerHTML = '';
  updateLandingStats();

  const filtered      = getRankedPosts();
  const resultCountEl = document.getElementById('searchResultCount');

  if (!postsLoaded) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gold)">Loading…</div>';
    return;
  }
  if (!posts.length) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">No lyrics yet — be the first to drop one.</div>';
    if (resultCountEl) resultCountEl.textContent = '';
    return;
  }
  if (!filtered.length) {
    const roomMsg   = activeRoom !== 'all' ? ` in ${activeRoom}` : '';
    const searchMsg = searchQuery ? ` matching "${searchQuery}"` : '';
    feedList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">
      No lyrics${roomMsg}${searchMsg} yet.<br>
      <span style="font-size:0.8rem;opacity:0.6">Be the first to drop one here.</span></div>`;
    if (resultCountEl) resultCountEl.textContent = searchQuery ? '0 results' : '';
    return;
  }

  if (resultCountEl) {
    resultCountEl.textContent = searchQuery
      ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
      : '';
  }

  filtered.forEach((post, i) => {
    const card    = document.createElement('div');
    card.className = 'feed-card';
    card.style.animationDelay = `${i * 0.03}s`;

    const k       = post.knowledge || { song:'Unknown Song', artist:'Unknown Artist' };
    const emotion = post.emotion || 'Nostalgia';
    const eBg     = EMOTION_COLORS[emotion] || 'rgba(232,197,71,0.1)';
    const eColor  = EMOTION_TEXT[emotion]   || 'var(--gold)';
    const hasLinks= post.links && (post.links.spotify||post.links.apple||post.links.youtube||post.links.soundcloud);
    const idx     = posts.findIndex(p => p.id === post.id);

    const modeBadge = post.mode === 'guess'
      ? '<span class="card-mode-badge mode-guess">Guess</span>'
      : post.mode === 'discover'
      ? '<span class="card-mode-badge mode-discover">Discover</span>'
      : '<span class="card-mode-badge mode-share">Share</span>';

    const lyricHTML = highlightMatch(post.text, searchQuery);
    let songSection = '', actionsSection = '';

    if (post.mode === 'share') {
      songSection = `<div class="card-song">
        <div class="card-song-title">${highlightMatch(k.song, searchQuery)}</div>
        <div class="card-song-artist">${highlightMatch(k.artist, searchQuery)}</div>
      </div>`;
      actionsSection = `<div class="card-actions">
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
        ${hasLinks ? `<button class="card-btn" onclick="window.openListen(${idx})">Listen</button>` : ''}
      </div>`;
    } else if (post.mode === 'guess') {
      const what = [];
      if (post.guessConfig?.guessSong)   what.push('song');
      if (post.guessConfig?.guessArtist) what.push('artist');
      if (!what.length) what.push('song','artist');
      songSection = `<div class="card-mystery">Guess the ${what.join(' & ')} →</div>`;
      actionsSection = `<div class="card-actions">
        <button class="card-btn" onclick="window.openGuess(${idx})">Guess</button>
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
      </div>`;
    } else {
      const hasClue = k.song !== 'Unknown Song' || k.artist !== 'Unknown Artist';
      const clue    = hasClue
        ? `Maybe: ${highlightMatch(k.song, searchQuery)} — ${highlightMatch(k.artist, searchQuery)}`
        : 'Help discover this song';
      songSection = `<div class="card-discover">${clue}</div>`;
      actionsSection = `<div class="card-actions">
        <button class="card-btn" onclick="window.openDiscover(${idx})">Help</button>
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="card-time">${timeAgo(post.timestamp)}</span>
        ${modeBadge}
      </div>
      <div class="card-lyric" style="font-size:${getDynamicFontSize()}">${lyricHTML}</div>
      <span class="card-emotion-tag" style="background:${eBg};color:${eColor}">${highlightMatch(emotion, searchQuery)}</span>
      ${songSection}
      ${actionsSection}
    `;
    feedList.appendChild(card);
  });
}

// ── Utilities ──
function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}

function trackView(postId) {
  if (isFirebaseEnabled && postId)
    analyticsRef.child(postId).child('views').transaction(v => (v || 0) + 1);
}

function showNewPostsIndicator(count) {
  const c = document.getElementById('newPostsCount');
  if (c) c.textContent = count;
  newPostsIndicator?.classList.add('visible');
}
