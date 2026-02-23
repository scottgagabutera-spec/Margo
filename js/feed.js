/* ============================================================
   MARGO — js/feed.js
   v4.7 — Equal-height cards, gold design, smart font scaling,
          fixed Back to Top position, uniform YouTube thumbs
   ============================================================ */

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

const EMOTION_COLORS = {
  Love:'rgba(255,107,157,0.13)', Heartbreak:'rgba(255,80,80,0.11)',
  Hope:'rgba(107,140,255,0.13)', Nostalgia:'rgba(232,197,71,0.11)',
  Healing:'rgba(74,222,128,0.13)', Joy:'rgba(255,200,71,0.11)',
  Rage:'rgba(255,100,100,0.13)', Loneliness:'rgba(160,160,255,0.11)'
};
const EMOTION_TEXT = {
  Love:'#FF6B9D', Heartbreak:'#ff5050', Hope:'#6B8CFF', Nostalgia:'#E8C547',
  Healing:'#4ade80', Joy:'#ffc847', Rage:'#FF6464', Loneliness:'#a0a0ff'
};
const EMOTION_GLOW = {
  Love:'rgba(255,107,157,0.55)', Heartbreak:'rgba(255,80,80,0.5)',
  Hope:'rgba(107,140,255,0.55)', Nostalgia:'rgba(232,197,71,0.65)',
  Healing:'rgba(74,222,128,0.55)', Joy:'rgba(255,200,71,0.55)',
  Rage:'rgba(255,100,100,0.55)', Loneliness:'rgba(160,160,255,0.55)'
};

/* ── Inject runtime styles ── */
function injectFeedStyles() {
  if (document.getElementById('feedV47Styles')) return;
  const s = document.createElement('style');
  s.id = 'feedV47Styles';
  s.textContent = `
    /* ── Card fade-in ── */
    @keyframes cardFadeIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* ── CARD BASE: fixed equal height, gold-forward ── */
    #feedList .feed-card {
      height: 280px !important;
      background: #17171d !important;
      border-width: 1px !important;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: cardFadeIn 0.3s ease both;
      transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
    }

    /* Gold shimmer top line — always present */
    #feedList .feed-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(232,197,71,0.5) 20%,
        rgba(232,197,71,0.9) 50%,
        rgba(232,197,71,0.5) 80%,
        transparent 100%
      );
    }

    /* Emotion-color left accent strip */
    #feedList .feed-card::after {
      content: '';
      position: absolute;
      top: 12px; left: 0; bottom: 12px;
      width: 3px;
      background: var(--card-emotion-glow, rgba(232,197,71,0.6));
      border-radius: 0 3px 3px 0;
      opacity: 0.8;
    }

    #feedList .feed-card:hover {
      transform: translateY(-3px) !important;
      border-color: rgba(232,197,71,0.4) !important;
      box-shadow:
        0 18px 50px rgba(0,0,0,0.55),
        0 0 30px rgba(232,197,71,0.06),
        0 0 0 1px rgba(232,197,71,0.12);
    }

    /* ── Lyric zone: fixed height, font scales with length ── */
    #feedList .card-lyric {
      height: 80px !important;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      flex-shrink: 0;
      padding-left: 8px;
      line-height: 1.45;
    }

    /* ── Song row ── */
    #feedList .card-song {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid rgba(232,197,71,0.1);
      flex-shrink: 0;
      height: 54px;
      overflow: hidden;
    }
    #feedList .card-song-text { flex:1; min-width:0; }

    /* ── Mystery / Discover: fixed height ── */
    #feedList .card-mystery,
    #feedList .card-discover {
      flex-shrink: 0;
      height: 54px;
      display: flex;
      align-items: center;
      overflow: hidden;
    }
    #feedList .card-mystery { border-color: rgba(107,140,255,0.15); }
    #feedList .card-discover { border-color: rgba(74,222,128,0.15); }

    /* ── Actions always at bottom ── */
    #feedList .card-actions {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid rgba(232,197,71,0.1);
      flex-shrink: 0;
    }

    /* ── Card top row ── */
    #feedList .card-top {
      padding-left: 8px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    /* ── Emotion tag ── */
    #feedList .card-emotion-tag {
      flex-shrink: 0;
      margin-bottom: 8px;
      margin-left: 8px;
    }

    /* ── Primary card button — gold ── */
    .card-btn-primary {
      background: rgba(232,197,71,0.12) !important;
      border-color: rgba(232,197,71,0.35) !important;
      color: #E8C547 !important;
      font-weight: 700 !important;
    }
    .card-btn-primary:hover {
      background: rgba(232,197,71,0.22) !important;
      border-color: rgba(232,197,71,0.6) !important;
      color: #fff !important;
    }

    /* ── Skeleton ── */
    @keyframes skShimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .skeleton-card {
      pointer-events:none !important;
      height: 280px !important;
    }
    .sk-line, .sk-block {
      border-radius:6px;
      background:linear-gradient(90deg,
        rgba(255,255,255,0.03) 25%,
        rgba(255,255,255,0.07) 50%,
        rgba(255,255,255,0.03) 75%);
      background-size:800px 100%;
      animation:skShimmer 1.5s infinite linear;
    }
    .sk-short  { height:9px; width:28%; margin-bottom:14px; }
    .sk-block  { height:52px; width:100%; margin-bottom:12px; border-radius:10px; }
    .sk-medium { height:9px; width:48%; margin-bottom:10px; }
    .sk-row    { display:flex; gap:8px; margin-top:4px; }
    .sk-long   { height:30px; flex:1; border-radius:8px; }

    /* ── YouTube thumbnail ── */
    .card-yt-thumb-wrap {
      position:relative; flex-shrink:0;
      width:58px; height:40px;
      border-radius:6px; overflow:hidden;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.08);
    }
    .card-yt-thumb { width:100%; height:100%; object-fit:cover; display:block; }
    .card-yt-play {
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.55); color:#fff;
      opacity:0; transition:opacity 0.18s;
      text-decoration:none; border-radius:5px;
    }
    .card-yt-thumb-wrap:hover .card-yt-play { opacity:1; }

    /* ── Studio YouTube bg option ── */
    .yt-bg-option {
      display:flex; align-items:center; gap:10px; padding:10px 12px;
      border-radius:10px; background:rgba(255,0,0,0.07);
      border:1px solid rgba(255,0,0,0.2);
      cursor:pointer; margin-bottom:10px; transition:background 0.18s;
    }
    .yt-bg-option:hover { background:rgba(255,0,0,0.13); }
    .yt-bg-option img { width:56px; height:38px; border-radius:6px; object-fit:cover; flex-shrink:0; }
    .yt-bg-option-text { flex:1; min-width:0; }
    .yt-bg-option-label {
      font-size:0.65rem; font-weight:700; color:#ff5555;
      font-family:'Space Mono',monospace; letter-spacing:1px; text-transform:uppercase;
    }
    .yt-bg-option-title {
      font-size:0.7rem; color:rgba(255,255,255,0.5);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;
    }

    /* ── Back to Top — fixed above footer always ── */
    .scroll-top {
      position: fixed !important;
      bottom: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(80px) !important;
      z-index: 999 !important;
      pointer-events: none;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1) !important;
    }
    .scroll-top.visible {
      transform: translateX(-50%) translateY(0) !important;
      opacity: 1 !important;
      pointer-events: all !important;
    }

    /* ── Mobile ── */
    @media (max-width:768px) {
      #feedList .feed-card { height: 270px !important; }
      .skeleton-card { height: 270px !important; }
      .card-yt-play { opacity:1; background:rgba(0,0,0,0.4); }
      .modal-sheet { max-height:92dvh; overflow-y:auto; -webkit-overflow-scrolling:touch; }
      .yt-autocomplete {
        position:fixed !important; left:0 !important; right:0 !important;
        top:auto !important; bottom:0 !important;
        border-radius:18px 18px 0 0 !important;
        max-height:50vh; overflow-y:auto;
        box-shadow:0 -8px 40px rgba(0,0,0,0.6) !important;
      }
    }
  `;
  document.head.appendChild(s);
}

/* ── Font size based on lyric length ──
   Short lyric  (≤40 chars) → 1.05rem  — big and bold
   Medium lyric (41–80)     → 0.9rem
   Long lyric   (81–120)    → 0.78rem
   Very long    (>120)      → 0.68rem  — still readable
────────────────────────────────────── */
function getLyricFontSize(text) {
  const len = (text || '').length;
  if (len <= 40)  return '1.05rem';
  if (len <= 80)  return '0.9rem';
  if (len <= 120) return '0.78rem';
  return '0.68rem';
}

/* ── Font preload ── */
function preloadStudioFonts() {
  const fonts = [
    "700 16px 'Playfair Display'","italic 16px 'Playfair Display'",
    "600 16px 'Cormorant Garamond'","italic 16px 'Cormorant Garamond'",
    "600 16px 'Lora'","italic 16px 'Lora'",
    "700 16px 'Merriweather'","700 16px 'Josefin Sans'",
    "400 16px 'Bebas Neue'","600 16px 'Oswald'",
    "700 16px 'Dancing Script'","800 16px 'Syne'",
    "700 16px 'Space Mono'","italic 16px 'DM Serif Display'","700 16px 'DM Sans'",
  ];
  fonts.forEach(f => document.fonts.load(f).catch(() => {}));
}

/* ── Lyric stream ── */
function buildLyricStream() {
  const track1 = document.getElementById('track1');
  const track2 = document.getElementById('track2');
  if (!track1 || !track2) return;
  track1.innerHTML = ''; track2.innerHTML = '';
  const source = getTickerPosts();
  const fill   = [...source, ...source, ...source];
  const buildCard = item => {
    const emotion = item.emotion || 'Nostalgia';
    const eClass  = 'emotion-' + emotion.toLowerCase();
    const text    = item.text || '';
    const display = text.length > 44 ? text.substring(0,44) + '…' : text;
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
    .sort((a,b) => (postAnalytics[b.id]?.views||0) - (postAnalytics[a.id]?.views||0)).slice(0, 4);
  const rest    = posts.filter(p => !recent.includes(p) && !byViews.includes(p));
  const random  = rest.sort(() => Math.random() - 0.5).slice(0, 4);
  return [...recent, ...byViews, ...random];
}

/* ── Stats ── */
function initStatsShimmer() {
  const ids = ['statTotal','featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.textContent === '—')
      el.innerHTML = '<span class="stat-shimmer">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
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
  const artistEntries = Object.entries(artistCounts).sort((a,b) => b[1]-a[1]);
  const songEntries   = Object.entries(songCounts).sort((a,b)   => b[1]-a[1]);
  const topEmotion    = Object.entries(emotionCounts).sort((a,b) => b[1]-a[1])[0];
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
    if (window.innerWidth >= 769)
      bar.style.justifyContent = bar.scrollWidth <= bar.clientWidth ? 'center' : 'flex-start';
    else { bar.style.justifyContent = 'flex-start'; bar.scrollLeft = 0; }
  }
  alignStats();
  window.addEventListener('resize', alignStats);
}

/* ── Search ── */
function getFilteredPosts() {
  const visible = posts.filter(p => p.status !== 'hidden');
  let filtered  = activeRoom === 'all'
    ? visible
    : visible.filter(p => (p.emotion || '').toLowerCase() === activeRoom.toLowerCase());
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
  input.onkeydown = e => { if (e.key === 'Escape') { clearSearch(); input.blur(); } };
  if (clearBtn) clearBtn.onclick = () => { clearSearch(); input.focus(); };
}

/* ── Room tabs ── */
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

/* ── Feed ranking ── */
function calculatePostScore(post) {
  const now          = Date.now();
  const ageInHours   = post.timestamp ? (now - post.timestamp) / (1000 * 60 * 60) : 999;
  const recencyScore = Math.max(0, 48 - ageInHours);
  const analytics    = postAnalytics[post.id] || {};
  const views        = analytics.views || 0;
  const guesses      = Object.keys(analytics.guesses || {}).length;
  const helps        = Object.keys(analytics.helps   || {}).length;
  return (recencyScore * 0.4) + (views * 0.2) + (guesses * 0.25) + (helps * 0.15);
}

function getRankedPosts() {
  return getFilteredPosts().sort((a, b) => calculatePostScore(b) - calculatePostScore(a));
}

/* ── Loading skeleton ── */
function renderSkeleton() {
  feedList.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'feed-card skeleton-card';
    s.style.animationDelay = (i * 0.07) + 's';
    s.innerHTML = `
      <div class="sk-line sk-short"></div>
      <div class="sk-block"></div>
      <div class="sk-line sk-medium"></div>
      <div class="sk-row"><div class="sk-long"></div><div class="sk-long"></div></div>`;
    feedList.appendChild(s);
  }
}

/* ── Smart card actions ──────────────────────────────────────
   YouTube thumb = the listen button. No duplicate.
   Only show separate Listen if non-YouTube links exist + no thumb.
────────────────────────────────────────────────────────────── */
function getCardActions(post, idx, hasMeta, hasNonYtLinks) {
  if (post.mode === 'share') {
    if (hasMeta) {
      return `<div class="card-actions">
        <button class="card-btn card-btn-primary" onclick="window.viewPost(${idx})">View Post</button>
      </div>`;
    }
    if (hasNonYtLinks) {
      return `<div class="card-actions">
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
        <button class="card-btn" onclick="window.openListen(${idx})">Listen</button>
      </div>`;
    }
    return `<div class="card-actions">
      <button class="card-btn card-btn-primary" onclick="window.viewPost(${idx})">View Post</button>
    </div>`;
  }
  if (post.mode === 'guess') {
    return `<div class="card-actions">
      <button class="card-btn card-btn-primary" onclick="window.openGuess(${idx})">Guess →</button>
      <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
    </div>`;
  }
  return `<div class="card-actions">
    <button class="card-btn card-btn-primary" onclick="window.openDiscover(${idx})">Help ID →</button>
    <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
  </div>`;
}

/* ── Render feed ── */
function renderFeed() {
  injectFeedStyles();
  updateLandingStats();
  if (!postsLoaded) { renderSkeleton(); return; }

  feedList.innerHTML = '';
  const filtered      = getRankedPosts();
  const resultCountEl = document.getElementById('searchResultCount');

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

  if (resultCountEl)
    resultCountEl.textContent = searchQuery
      ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : '';

  filtered.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'feed-card';
    card.style.animationDelay = `${i * 0.03}s`;

    const k          = post.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
    const emotion    = post.emotion || 'Nostalgia';
    const eBg        = EMOTION_COLORS[emotion]   || 'rgba(232,197,71,0.11)';
    const eColor     = EMOTION_TEXT[emotion]     || '#E8C547';
    const eGlow      = EMOTION_GLOW[emotion]     || 'rgba(232,197,71,0.65)';
    const idx        = posts.findIndex(p => p.id === post.id);
    const meta       = post.youtubeMeta;
    const hasMeta    = !!(meta?.thumbnailSm || meta?.thumbnail);
    const links      = post.links || {};
    const hasNonYtLinks = !!(links.spotify || links.apple || links.soundcloud);

    // CSS custom props for ::before / ::after pseudo elements
    card.style.setProperty('--card-emotion-glow', eGlow);
    card.style.borderColor = `rgba(232,197,71,0.18)`;

    const modeBadge = post.mode === 'guess'
      ? '<span class="card-mode-badge mode-guess">Guess</span>'
      : post.mode === 'discover'
      ? '<span class="card-mode-badge mode-discover">Discover</span>'
      : '<span class="card-mode-badge mode-share">Share</span>';

    const fontSize  = getLyricFontSize(post.text);
    const lyricHTML = highlightMatch(post.text, searchQuery);

    // YouTube thumbnail
    const thumbHTML = hasMeta
      ? `<div class="card-yt-thumb-wrap">
           <img src="${meta.thumbnailSm || meta.thumbnail}" class="card-yt-thumb" alt=""
             loading="lazy" onerror="this.parentElement.style.display='none'"/>
           <a href="${meta.youtubeUrl || '#'}" target="_blank" rel="noopener noreferrer"
             class="card-yt-play" onclick="event.stopPropagation()" title="Watch on YouTube">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
           </a>
         </div>`
      : '';

    let songSection = '';
    if (post.mode === 'share') {
      songSection = `<div class="card-song">
        ${thumbHTML}
        <div class="card-song-text">
          <div class="card-song-title">${highlightMatch(k.song, searchQuery)}</div>
          <div class="card-song-artist">${highlightMatch(k.artist, searchQuery)}</div>
        </div>
      </div>`;
    } else if (post.mode === 'guess') {
      const what = [];
      if (post.guessConfig?.guessSong)   what.push('song');
      if (post.guessConfig?.guessArtist) what.push('artist');
      if (!what.length) what.push('song', 'artist');
      songSection = `<div class="card-mystery">Can you guess the ${what.join(' & ')}? →</div>`;
    } else {
      const hasClue = k.song !== 'Unknown Song' || k.artist !== 'Unknown Artist';
      songSection = `<div class="card-discover">${
        hasClue
          ? `Maybe: ${highlightMatch(k.song, searchQuery)} — ${highlightMatch(k.artist, searchQuery)}`
          : 'Help discover this song'
      }</div>`;
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="card-time">${timeAgo(post.timestamp)}</span>
        ${modeBadge}
      </div>
      <div class="card-lyric" style="font-size:${fontSize}">${lyricHTML}</div>
      <span class="card-emotion-tag" style="background:${eBg};color:${eColor}">${highlightMatch(emotion, searchQuery)}</span>
      ${songSection}
      ${getCardActions(post, idx, hasMeta, hasNonYtLinks)}
    `;
    feedList.appendChild(card);
  });
}

/* ── Utilities ── */
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
