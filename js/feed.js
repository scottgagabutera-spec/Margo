/* ============================================================
   MARGO — js/feed.js
   v4.8 — Deep gold cards, uniform YouTube, smart logic,
          font scaling, fixed heights, clean design system
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

/* Emotion design tokens — used consistently everywhere */
const EMOTION_CFG = {
  Love:       { bg: 'rgba(255,107,157,0.13)', text: '#FF6B9D', border: 'rgba(255,107,157,0.22)', strip: 'rgba(255,107,157,0.7)'  },
  Heartbreak: { bg: 'rgba(255,80,80,0.11)',   text: '#ff5050', border: 'rgba(255,80,80,0.2)',    strip: 'rgba(255,80,80,0.65)'   },
  Hope:       { bg: 'rgba(107,140,255,0.13)', text: '#6B8CFF', border: 'rgba(107,140,255,0.22)', strip: 'rgba(107,140,255,0.7)'  },
  Nostalgia:  { bg: 'rgba(232,197,71,0.11)',  text: '#E8C547', border: 'rgba(232,197,71,0.25)',  strip: 'rgba(232,197,71,0.8)'   },
  Healing:    { bg: 'rgba(74,222,128,0.13)',  text: '#4ade80', border: 'rgba(74,222,128,0.22)',  strip: 'rgba(74,222,128,0.7)'   },
  Joy:        { bg: 'rgba(255,200,71,0.11)',  text: '#ffc847', border: 'rgba(255,200,71,0.22)',  strip: 'rgba(255,200,71,0.7)'   },
  Rage:       { bg: 'rgba(255,100,100,0.13)', text: '#FF6464', border: 'rgba(255,100,100,0.22)', strip: 'rgba(255,100,100,0.65)' },
  Loneliness: { bg: 'rgba(160,160,255,0.11)', text: '#a0a0ff', border: 'rgba(160,160,255,0.22)', strip: 'rgba(160,160,255,0.7)'  },
};
const E_DEFAULT = { bg: 'rgba(232,197,71,0.11)', text: '#E8C547', border: 'rgba(232,197,71,0.25)', strip: 'rgba(232,197,71,0.8)' };

/* Lyric font size: shorter lyrics get bigger type */
function lyricFontSize(text) {
  const n = (text || '').length;
  if (n <= 35)  return '1.08rem';
  if (n <= 65)  return '0.93rem';
  if (n <= 110) return '0.8rem';
  return '0.68rem';
}

/* ── Inject all card styles once ── */
function injectFeedStyles() {
  if (document.getElementById('feedV48')) return;
  const s = document.createElement('style');
  s.id = 'feedV48';
  s.textContent = `
    /* ── Card animation ── */
    @keyframes cardIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* ─────────────────────────────────────────────────
       FEED CARD — deep gold, uniform, premium feel
       All cards same height, flex-column,
       proportioned sections so buttons never clip
    ───────────────────────────────────────────────── */
    #feedList .feed-card {
      height: 285px !important;
      background: #161619 !important;
      border: 1px solid rgba(232,197,71,0.22) !important;
      border-radius: 14px !important;
      padding: 14px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
      position: relative !important;
      overflow: hidden !important;
      animation: cardIn 0.3s ease both;
      transition: transform 0.22s cubic-bezier(0.4,0,0.2,1),
                  border-color 0.22s,
                  box-shadow 0.22s !important;
      box-shadow:
        0 0 0 0 transparent,
        0 4px 20px rgba(0,0,0,0.4),
        inset 0 1px 0 rgba(232,197,71,0.08) !important;
    }

    /* Gold shimmer top edge */
    #feedList .feed-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(232,197,71,0.55) 25%,
        rgba(232,197,71,1)    50%,
        rgba(232,197,71,0.55) 75%,
        transparent 100%
      );
      pointer-events: none;
    }

    /* Emotion-color left strip via CSS variable */
    #feedList .feed-card::after {
      content: '';
      position: absolute;
      top: 16px; left: 0; bottom: 16px;
      width: 3px;
      background: var(--e-strip, rgba(232,197,71,0.8));
      border-radius: 0 4px 4px 0;
      opacity: 0.85;
      pointer-events: none;
    }

    #feedList .feed-card:hover {
      transform: translateY(-3px) !important;
      border-color: rgba(232,197,71,0.5) !important;
      box-shadow:
        0 0 0 1px rgba(232,197,71,0.15),
        0 20px 50px rgba(0,0,0,0.55),
        inset 0 1px 0 rgba(232,197,71,0.12) !important;
    }

    /* ── Top row ── */
    #feedList .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      height: 20px;
      margin-bottom: 10px;
      padding-left: 7px;
    }

    /* ── Lyric zone: fixed 78px, font scales by JS ── */
    #feedList .card-lyric {
      height: 78px !important;
      overflow: hidden !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      flex-shrink: 0 !important;
      line-height: 1.45 !important;
      margin-bottom: 8px !important;
      padding-left: 7px !important;
      font-weight: 400 !important;
    }

    /* ── Emotion tag ── */
    #feedList .card-emotion-tag {
      flex-shrink: 0 !important;
      align-self: flex-start !important;
      margin-bottom: 9px !important;
      margin-left: 7px !important;
    }

    /* ── Song row ── */
    #feedList .card-song {
      display: flex !important;
      align-items: center !important;
      gap: 9px !important;
      flex-shrink: 0 !important;
      height: 50px !important;
      overflow: hidden !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(232,197,71,0.12) !important;
      margin-bottom: 0 !important;
    }
    #feedList .card-song-text { flex:1; min-width:0; }

    /* ── Guess / Discover zone ── */
    #feedList .card-mystery,
    #feedList .card-discover {
      flex-shrink: 0 !important;
      height: 50px !important;
      display: flex !important;
      align-items: center !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(232,197,71,0.1) !important;
      overflow: hidden !important;
      font-size: 0.75rem !important;
    }
    #feedList .card-mystery  { color: #6B8CFF !important; }
    #feedList .card-discover { color: #4ade80 !important; }

    /* ── Actions always at bottom ── */
    #feedList .card-actions {
      margin-top: auto !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(232,197,71,0.12) !important;
      flex-shrink: 0 !important;
      display: flex !important;
      gap: 6px !important;
    }

    /* ── Buttons — gold-tinted primary ── */
    #feedList .card-btn {
      flex: 1 !important;
      padding: 8px 6px !important;
      background: rgba(232,197,71,0.06) !important;
      border: 1px solid rgba(232,197,71,0.18) !important;
      border-radius: 8px !important;
      font-family: 'DM Sans', sans-serif !important;
      font-size: 0.7rem !important;
      font-weight: 600 !important;
      color: rgba(232,197,71,0.8) !important;
      cursor: pointer !important;
      transition: all 0.18s !important;
    }
    #feedList .card-btn:hover {
      background: rgba(232,197,71,0.14) !important;
      border-color: rgba(232,197,71,0.45) !important;
      color: #E8C547 !important;
    }
    #feedList .card-btn-primary {
      background: rgba(232,197,71,0.14) !important;
      border-color: rgba(232,197,71,0.4) !important;
      color: #E8C547 !important;
      font-weight: 700 !important;
    }
    #feedList .card-btn-primary:hover {
      background: rgba(232,197,71,0.25) !important;
      border-color: rgba(232,197,71,0.65) !important;
      color: #fff !important;
    }

    /* ── YouTube thumbnail ── */
    .card-yt-thumb-wrap {
      position: relative;
      flex-shrink: 0;
      width: 56px; height: 38px;
      border-radius: 6px; overflow: hidden;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .card-yt-thumb { width:100%; height:100%; object-fit:cover; display:block; }
    .card-yt-play {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55); color: #fff;
      opacity: 0; transition: opacity 0.18s;
      text-decoration: none; border-radius: 5px;
    }
    .card-yt-thumb-wrap:hover .card-yt-play { opacity: 1; }
    @media (max-width: 768px) {
      .card-yt-play { opacity: 1; background: rgba(0,0,0,0.4); }
    }

    /* ── Skeletons ── */
    @keyframes skShimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .skeleton-card {
      pointer-events: none !important;
      height: 285px !important;
    }
    .sk-line, .sk-block {
      border-radius: 6px;
      background: linear-gradient(90deg,
        rgba(255,255,255,0.03) 25%,
        rgba(255,255,255,0.07) 50%,
        rgba(255,255,255,0.03) 75%);
      background-size: 800px 100%;
      animation: skShimmer 1.5s infinite linear;
    }
    .sk-short  { height:9px; width:28%; margin-bottom:14px; }
    .sk-block  { height:52px; width:100%; margin-bottom:12px; border-radius:10px; }
    .sk-medium { height:9px; width:48%; margin-bottom:10px; }
    .sk-row    { display:flex; gap:8px; margin-top:4px; }
    .sk-long   { height:30px; flex:1; border-radius:8px; }

    /* ── Studio YouTube bg ── */
    .yt-bg-option {
      display:flex; align-items:center; gap:10px; padding:10px 12px;
      border-radius:10px; background:rgba(255,0,0,0.07);
      border:1px solid rgba(255,0,0,0.2); cursor:pointer;
      margin-bottom:10px; transition:background 0.18s;
    }
    .yt-bg-option:hover { background:rgba(255,0,0,0.13); }
    .yt-bg-option img { width:56px;height:38px;border-radius:6px;object-fit:cover;flex-shrink:0; }
    .yt-bg-option-text { flex:1; min-width:0; }
    .yt-bg-option-label {
      font-size:0.65rem; font-weight:700; color:#ff5555;
      font-family:'Space Mono',monospace; letter-spacing:1px; text-transform:uppercase;
    }
    .yt-bg-option-title {
      font-size:0.7rem; color:rgba(255,255,255,0.5);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;
    }

    /* ── Back to top — viewport-fixed ── */
    .scroll-top {
      position: fixed !important;
      bottom: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.3s ease !important;
      z-index: 999 !important;
    }
    .scroll-top.visible {
      opacity: 1 !important;
      pointer-events: all !important;
    }

    /* ── Mobile ── */
    @media (max-width: 480px) {
      #feedList .feed-card { height: 275px !important; }
      .skeleton-card { height: 275px !important; }
    }
    @media (max-width: 768px) {
      .modal-sheet { max-height: 92dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
      .yt-autocomplete {
        position: fixed !important; left:0 !important; right:0 !important;
        top:auto !important; bottom:0 !important;
        border-radius:18px 18px 0 0 !important;
        max-height:50vh; overflow-y:auto;
        box-shadow:0 -8px 40px rgba(0,0,0,0.6) !important;
      }
    }
  `;
  document.head.appendChild(s);
}

/* ── Font preload ── */
function preloadStudioFonts() {
  ["700 16px 'Playfair Display'","italic 16px 'Playfair Display'",
   "600 16px 'Cormorant Garamond'","italic 16px 'Cormorant Garamond'",
   "600 16px 'Lora'","italic 16px 'Lora'",
   "700 16px 'Merriweather'","700 16px 'Josefin Sans'",
   "400 16px 'Bebas Neue'","600 16px 'Oswald'",
   "700 16px 'Dancing Script'","800 16px 'Syne'",
   "700 16px 'Space Mono'","italic 16px 'DM Serif Display'","700 16px 'DM Sans'",
  ].forEach(f => document.fonts.load(f).catch(() => {}));
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
    const text    = item.text || '';
    const display = text.length > 44 ? text.substring(0,44) + '…' : text;
    const card    = document.createElement('div');
    card.className = 'lyric-card' + (Math.random() > 0.65 ? ' featured' : '');
    card.innerHTML = `<div class="lyric-card-text">${display}</div>
      <div class="lyric-card-meta"><span class="lyric-card-emotion emotion-${emotion.toLowerCase()}">${emotion}</span></div>`;
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
  ['statTotal','featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el && el.textContent === '—')
        el.innerHTML = '<span class="stat-shimmer">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
    });
}

function calcFeatured() {
  const ac = {}, sc = {}, ec = {};
  posts.forEach(p => {
    const a = p.knowledge?.artist, s = p.knowledge?.song, e = p.emotion || 'Nostalgia';
    if (a && a !== 'Unknown Artist') { const k = a.trim(); ac[k] = (ac[k]||0)+1; }
    if (s && s !== 'Unknown Song')   { const k = s.trim(); sc[k] = (sc[k]||0)+1; }
    ec[e] = (ec[e]||0)+1;
  });
  const ae = Object.entries(ac).sort((a,b) => b[1]-a[1]);
  const se = Object.entries(sc).sort((a,b) => b[1]-a[1]);
  const te = Object.entries(ec).sort((a,b) => b[1]-a[1])[0];
  return {
    uniqueArtistCount: Object.keys(ac).length,
    uniqueSongCount:   Object.keys(sc).length,
    topArtist: (ae[0]?.[1] >= 2) ? ae[0][0] : null,
    topSong:   (se[0]?.[1] >= 2) ? se[0][0] : null,
    topEmotion: te
  };
}

function updateLandingStats() {
  const n = posts.length || 0;
  const $ = id => document.getElementById(id);
  if ($('liveCount'))  $('liveCount').textContent  = n;
  if ($('statTotal'))  $('statTotal').textContent  = n || '—';
  if ($('postCount'))  $('postCount').textContent  = n;
  if (!n) { ['featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion'].forEach(id => { if ($(id)) $(id).textContent = '—'; }); return; }
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
  const align = () => {
    if (window.innerWidth >= 769)
      bar.style.justifyContent = bar.scrollWidth <= bar.clientWidth ? 'center' : 'flex-start';
    else { bar.style.justifyContent = 'flex-start'; bar.scrollLeft = 0; }
  };
  align();
  window.addEventListener('resize', align);
}

/* ── Search ── */
function getFilteredPosts() {
  const visible = posts.filter(p => p.status !== 'hidden');
  let filtered  = activeRoom === 'all'
    ? visible
    : visible.filter(p => (p.emotion||'').toLowerCase() === activeRoom.toLowerCase());
  if (!searchQuery) return filtered;
  const q = searchQuery.toLowerCase();
  return filtered.filter(p =>
    (p.text||'').toLowerCase().includes(q)
    || (p.knowledge?.song||'').toLowerCase().includes(q)
    || (p.knowledge?.artist||'').toLowerCase().includes(q)
    || (p.emotion||'').toLowerCase().includes(q)
  );
}

function highlightMatch(text, query) {
  if (!query || !text) return text || '';
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${esc})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function clearSearch() {
  const input = document.getElementById('feedSearchInput');
  const btn   = document.getElementById('searchClearBtn');
  searchQuery = '';
  if (input) input.value = '';
  if (btn) btn.style.display = 'none';
  renderFeed();
}

function initSearch() {
  const input = document.getElementById('feedSearchInput');
  const btn   = document.getElementById('searchClearBtn');
  if (!input) return;
  input.oninput   = () => { searchQuery = input.value.trim(); if (btn) btn.style.display = searchQuery ? 'flex' : 'none'; renderFeed(); };
  input.onkeydown = e => { if (e.key === 'Escape') { clearSearch(); input.blur(); } };
  if (btn) btn.onclick = () => { clearSearch(); input.focus(); };
}

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
  const now  = Date.now();
  const age  = post.timestamp ? (now - post.timestamp) / 3600000 : 999;
  const rec  = Math.max(0, 48 - age);
  const a    = postAnalytics[post.id] || {};
  return (rec * 0.4) + ((a.views||0) * 0.2)
    + (Object.keys(a.guesses||{}).length * 0.25)
    + (Object.keys(a.helps||{}).length   * 0.15);
}
function getRankedPosts() {
  return getFilteredPosts().sort((a, b) => calculatePostScore(b) - calculatePostScore(a));
}

/* ── Skeleton ── */
function renderSkeleton() {
  feedList.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'feed-card skeleton-card';
    s.style.animationDelay = (i * 0.07) + 's';
    s.innerHTML = `<div class="sk-line sk-short"></div><div class="sk-block"></div>
      <div class="sk-line sk-medium"></div>
      <div class="sk-row"><div class="sk-long"></div><div class="sk-long"></div></div>`;
    feedList.appendChild(s);
  }
}

/* ── Render feed ── */
function renderFeed() {
  injectFeedStyles();
  updateLandingStats();
  if (!postsLoaded) { renderSkeleton(); return; }

  feedList.innerHTML = '';
  const filtered = getRankedPosts();
  const rc = document.getElementById('searchResultCount');

  if (!posts.length) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">No lyrics yet — be the first to drop one.</div>';
    if (rc) rc.textContent = ''; return;
  }
  if (!filtered.length) {
    const roomMsg   = activeRoom !== 'all' ? ` in ${activeRoom}` : '';
    const searchMsg = searchQuery ? ` matching "${searchQuery}"` : '';
    feedList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-2)">
      No lyrics${roomMsg}${searchMsg} yet.<br><span style="font-size:0.8rem;opacity:0.6">Be the first to drop one here.</span></div>`;
    if (rc) rc.textContent = searchQuery ? '0 results' : ''; return;
  }
  if (rc) rc.textContent = searchQuery ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : '';

  filtered.forEach((post, i) => {
    const card    = document.createElement('div');
    card.className = 'feed-card';
    card.style.animationDelay = `${i * 0.03}s`;

    const k       = post.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
    const emotion = post.emotion || 'Nostalgia';
    const ecfg    = EMOTION_CFG[emotion] || E_DEFAULT;
    const idx     = posts.findIndex(p => p.id === post.id);
    const meta    = post.youtubeMeta;
    const hasMeta = !!(meta?.thumbnailSm || meta?.thumbnail);
    const links   = post.links || {};
    const hasStreamLinks = !!(links.spotify || links.apple || links.soundcloud);

    // Set emotion CSS variable for left strip
    card.style.setProperty('--e-strip', ecfg.strip);
    card.style.borderColor = ecfg.border;

    // Mode badge
    const badge = post.mode === 'guess'
      ? '<span class="card-mode-badge mode-guess">Guess</span>'
      : post.mode === 'discover'
      ? '<span class="card-mode-badge mode-discover">Discover</span>'
      : '<span class="card-mode-badge mode-share">Share</span>';

    // YouTube thumbnail — same structure for ALL posts that have meta
    const thumb = hasMeta ? `
      <div class="card-yt-thumb-wrap">
        <img src="${meta.thumbnailSm || meta.thumbnail}" class="card-yt-thumb" alt=""
          loading="lazy" onerror="this.parentElement.style.display='none'"/>
        <a href="${meta.youtubeUrl || '#'}" target="_blank" rel="noopener noreferrer"
          class="card-yt-play" onclick="event.stopPropagation()" title="Watch on YouTube">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </a>
      </div>` : '';

    // Song section
    let songSection = '';
    if (post.mode === 'share') {
      songSection = `<div class="card-song">
        ${thumb}
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

    // Actions — smart: YouTube thumb replaces listen button
    let actions = '';
    if (post.mode === 'share') {
      if (hasMeta) {
        // Thumb IS the listen button — just View needed
        actions = `<div class="card-actions">
          <button class="card-btn card-btn-primary" onclick="window.viewPost(${idx})">View Post</button>
        </div>`;
      } else if (hasStreamLinks) {
        actions = `<div class="card-actions">
          <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
          <button class="card-btn" onclick="window.openListen(${idx})">Listen</button>
        </div>`;
      } else {
        actions = `<div class="card-actions">
          <button class="card-btn card-btn-primary" onclick="window.viewPost(${idx})">View Post</button>
        </div>`;
      }
    } else if (post.mode === 'guess') {
      actions = `<div class="card-actions">
        <button class="card-btn card-btn-primary" onclick="window.openGuess(${idx})">Guess →</button>
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
      </div>`;
    } else {
      actions = `<div class="card-actions">
        <button class="card-btn card-btn-primary" onclick="window.openDiscover(${idx})">Help ID →</button>
        <button class="card-btn" onclick="window.viewPost(${idx})">View</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="card-time">${timeAgo(post.timestamp)}</span>
        ${badge}
      </div>
      <div class="card-lyric" style="font-size:${lyricFontSize(post.text)}">${highlightMatch(post.text, searchQuery)}</div>
      <span class="card-emotion-tag" style="background:${ecfg.bg};color:${ecfg.text}">${highlightMatch(emotion, searchQuery)}</span>
      ${songSection}
      ${actions}
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
    analyticsRef.child(postId).child('views').transaction(v => (v||0)+1);
}
function showNewPostsIndicator(count) {
  const c = document.getElementById('newPostsCount');
  if (c) c.textContent = count;
  newPostsIndicator?.classList.add('visible');
}
