/* ============================================================
   MARGO — js/feed.js
   v6.3 — concept-v2
   • Two new emotions: SendIt + LetOut
   • Emotion color bleeds into card background
   • Smart text contrast — light bg = dark text, dark bg = light text
   • Mode badge removed entirely from cards
   • Lyric Back echo count passed via data-attr for resonate.js to use
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
  { text: "This one's for you — you know who you are",           emotion: 'SendIt'     },
  { text: "Had to say it through a song because words failed",   emotion: 'LetOut'     },
];

/* ══════════════════════════════════════════════════════════
   EMOTION DESIGN TOKENS
   Each emotion has:
   - bg:        card background tint (more opaque than before)
   - cardBg:    full card background CSS (gradient)
   - text:      emotion label / accent color
   - border:    card border color
   - strip:     left side strip color
   - lyricText: color for the lyric text on this card
   - metaText:  color for song/artist/time metadata
   - isDark:    true = dark background → use light text
══════════════════════════════════════════════════════════ */
const EMOTION_CFG = {
  Love: {
    bg: 'rgba(255,107,157,0.13)', text: '#FF6B9D',
    border: 'rgba(255,107,157,0.3)', strip: 'rgba(255,107,157,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(255,107,157,0.12) 0%, rgba(20,14,18,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(255,200,220,0.75)', isDark: true
  },
  Heartbreak: {
    bg: 'rgba(255,80,80,0.11)', text: '#ff5050',
    border: 'rgba(255,80,80,0.28)', strip: 'rgba(255,80,80,0.75)',
    cardBg: 'linear-gradient(160deg, rgba(255,60,60,0.14) 0%, rgba(18,12,12,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(255,180,180,0.7)', isDark: true
  },
  Hope: {
    bg: 'rgba(107,140,255,0.13)', text: '#6B8CFF',
    border: 'rgba(107,140,255,0.3)', strip: 'rgba(107,140,255,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(107,140,255,0.13) 0%, rgba(12,14,22,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(180,200,255,0.7)', isDark: true
  },
  Nostalgia: {
    bg: 'rgba(232,197,71,0.11)', text: '#E8C547',
    border: 'rgba(232,197,71,0.32)', strip: 'rgba(232,197,71,0.9)',
    cardBg: 'linear-gradient(160deg, rgba(232,197,71,0.11) 0%, rgba(16,15,10,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(232,210,140,0.7)', isDark: true
  },
  Healing: {
    bg: 'rgba(74,222,128,0.13)', text: '#4ade80',
    border: 'rgba(74,222,128,0.28)', strip: 'rgba(74,222,128,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(74,222,128,0.11) 0%, rgba(10,18,14,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(160,240,190,0.7)', isDark: true
  },
  Joy: {
    bg: 'rgba(255,200,71,0.11)', text: '#ffc847',
    border: 'rgba(255,200,71,0.3)', strip: 'rgba(255,200,71,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(255,200,71,0.11) 0%, rgba(18,16,8,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(255,220,140,0.7)', isDark: true
  },
  Rage: {
    bg: 'rgba(255,100,60,0.13)', text: '#FF6440',
    border: 'rgba(255,100,60,0.3)', strip: 'rgba(255,100,60,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(255,80,40,0.15) 0%, rgba(20,10,8,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(255,180,160,0.7)', isDark: true
  },
  Loneliness: {
    bg: 'rgba(160,160,255,0.11)', text: '#a0a0ff',
    border: 'rgba(160,160,255,0.28)', strip: 'rgba(160,160,255,0.75)',
    cardBg: 'linear-gradient(160deg, rgba(140,140,255,0.12) 0%, rgba(12,12,20,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(190,190,255,0.65)', isDark: true
  },
  // ── NEW EMOTIONS ──
  SendIt: {
    bg: 'rgba(0,229,200,0.11)', text: '#00e5c8',
    border: 'rgba(0,229,200,0.28)', strip: 'rgba(0,229,200,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(0,229,200,0.12) 0%, rgba(8,18,18,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(140,240,225,0.7)', isDark: true
  },
  LetOut: {
    bg: 'rgba(200,100,255,0.11)', text: '#c864ff',
    border: 'rgba(200,100,255,0.28)', strip: 'rgba(200,100,255,0.8)',
    cardBg: 'linear-gradient(160deg, rgba(180,80,255,0.13) 0%, rgba(16,8,20,1) 55%)',
    lyricText: '#fff', metaText: 'rgba(220,170,255,0.7)', isDark: true
  },
};
const E_DEFAULT = {
  bg: 'rgba(232,197,71,0.11)', text: '#E8C547',
  border: 'rgba(232,197,71,0.25)', strip: 'rgba(232,197,71,0.8)',
  cardBg: 'linear-gradient(160deg, rgba(232,197,71,0.09) 0%, rgba(16,15,10,1) 55%)',
  lyricText: '#fff', metaText: 'rgba(232,210,140,0.65)', isDark: true
};

let currentSort = 'fresh';

function lyricFontSize(text) {
  const n = (text || '').length;
  if (n <= 35)  return '1.08rem';
  if (n <= 65)  return '0.93rem';
  if (n <= 110) return '0.8rem';
  return '0.68rem';
}

/* ── Inject styles ── */
function injectFeedStyles() {
  if (document.getElementById('feedV63')) return;
  const s = document.createElement('style');
  s.id = 'feedV63';
  s.textContent = `
    @keyframes cardIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .feed-sort-bar {
      display: flex; align-items: center; gap: 6px; padding: 0 14px;
    }
    .feed-sort-label {
      font-family: 'Space Mono', monospace; font-size: 0.44rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.2);
      flex-shrink: 0; margin-right: 2px;
    }
    .sort-btn {
      padding: 5px 14px; border-radius: 50px;
      border: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.3);
      font-family: 'Space Mono', monospace; font-size: 0.46rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px;
      cursor: pointer; transition: all 0.18s; white-space: nowrap;
    }
    .sort-btn:hover {
      border-color: rgba(232,197,71,0.3); color: rgba(232,197,71,0.75);
      background: rgba(232,197,71,0.04);
    }
    .sort-btn.active {
      background: rgba(232,197,71,0.10); border-color: rgba(232,197,71,0.45); color: #E8C547;
    }

    /* Rank badges */
    .card-hot-badge {
      position: absolute; top: 10px; right: 10px; z-index: 2;
      font-family: 'Space Mono', monospace; font-size: 0.42rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 3px 8px; border-radius: 20px;
      background: rgba(255,140,0,0.12); color: #ffaa44;
      border: 1px solid rgba(255,140,0,0.28); pointer-events: none;
    }
    .card-new-badge {
      position: absolute; top: 10px; right: 10px; z-index: 2;
      font-family: 'Space Mono', monospace; font-size: 0.42rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 3px 8px; border-radius: 20px;
      background: rgba(74,222,128,0.10); color: #4ade80;
      border: 1px solid rgba(74,222,128,0.25); pointer-events: none;
    }

    /* ─── CARD BASE ─── */
    #feedList .feed-card {
      border-radius: 14px !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
      position: relative !important;
      overflow: hidden !important;
      animation: cardIn 0.3s ease both;
      transition: transform 0.36s cubic-bezier(.34,1.36,.64,1),
                  border-color 0.28s, box-shadow 0.28s !important;
    }
    #feedList .c-inner {
      padding: 14px 14px 10px 19px;
      display: flex; flex-direction: column; flex: 1;
      position: relative; z-index: 2;
    }
    #feedList .feed-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg,
        transparent 0%, var(--e-strip-color, rgba(232,197,71,0.55)) 25%,
        var(--e-strip-color, rgba(232,197,71,1)) 50%,
        var(--e-strip-color, rgba(232,197,71,0.55)) 75%, transparent 100%);
      pointer-events: none;
    }
    #feedList .feed-card::after {
      content: ''; position: absolute;
      top: 16px; left: 0; bottom: 16px; width: 3px;
      background: var(--e-strip, rgba(232,197,71,0.8));
      border-radius: 0 4px 4px 0; opacity: 0.9; pointer-events: none;
    }
    #feedList .feed-card:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 0 0 1px var(--e-border, rgba(232,197,71,0.2)),
                  0 20px 50px rgba(0,0,0,0.6),
                  inset 0 1px 0 rgba(255,255,255,0.05) !important;
    }

    /* ─── GLOW ORB ─── */
    #feedList .c-glow {
      position: absolute; top: -50px; right: -50px;
      width: 200px; height: 200px; border-radius: 50%;
      filter: blur(60px); z-index: 0; pointer-events: none;
      opacity: .08; transition: opacity .4s ease;
    }
    #feedList .feed-card:hover .c-glow { opacity: .18 !important; }

    /* ─── LAYOUT INTERNALS ─── */
    #feedList .card-top {
      display: flex; justify-content: space-between;
      align-items: center; flex-shrink: 0;
      height: 20px; margin-bottom: 10px;
    }
    #feedList .card-lyric {
      overflow: hidden !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      flex-shrink: 0 !important; line-height: 1.5 !important;
      margin-bottom: 9px !important;
      font-weight: 400 !important;
    }
    #feedList .card-emotion-tag {
      flex-shrink: 0 !important; align-self: flex-start !important;
      margin-bottom: 8px !important;
    }
    #feedList .card-song {
      display: flex !important; align-items: center !important;
      gap: 9px !important; flex-shrink: 0 !important;
      min-height: 44px !important; overflow: hidden !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(255,255,255,.07) !important;
    }
    #feedList .card-song-text { flex: 1; min-width: 0; }
    #feedList .card-mystery,
    #feedList .card-discover {
      flex-shrink: 0 !important; min-height: 44px !important;
      display: flex !important; align-items: center !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(255,255,255,.08) !important;
      overflow: hidden !important; font-size: 0.75rem !important;
    }
    #feedList .card-mystery  { color: rgba(180,200,255,.7) !important; }
    #feedList .card-discover { color: rgba(140,230,180,.7) !important; }
    #feedList .card-actions  { display: none !important; }

    /* ─── BUTTONS — inherit from resonate.js for v2 row ─── */
    #feedList .card-btn {
      flex: 1 !important; padding: 8px 6px !important;
      background: rgba(255,255,255,0.06) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      border-radius: 8px !important;
      font-family: 'DM Sans', sans-serif !important;
      font-size: 0.7rem !important; font-weight: 600 !important;
      color: rgba(255,255,255,0.7) !important;
      cursor: pointer !important; transition: all 0.18s !important;
    }
    #feedList .card-btn:hover {
      background: rgba(255,255,255,0.12) !important;
      border-color: rgba(255,255,255,0.25) !important;
      color: #fff !important;
    }

    /* ─── YOUTUBE THUMBNAIL ─── */
    .card-yt-thumb-wrap {
      position: relative; flex-shrink: 0;
      width: 56px; height: 38px; border-radius: 6px; overflow: hidden;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
    }
    .card-yt-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
    .card-yt-play {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.55); color: #fff;
      opacity: 0; transition: opacity 0.18s;
      text-decoration: none; border-radius: 5px;
    }
    .card-yt-thumb-wrap:hover .card-yt-play { opacity: 1; }
    @media (max-width:768px) {
      .card-yt-play { opacity: 1; background: rgba(0,0,0,0.4); }
    }

    /* ─── SKELETONS ─── */
    @keyframes skShimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .skeleton-card { pointer-events: none !important; min-height: 200px !important; }
    .sk-line, .sk-block {
      border-radius: 6px;
      background: linear-gradient(90deg,
        rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%,
        rgba(255,255,255,0.03) 75%);
      background-size: 800px 100%;
      animation: skShimmer 1.5s infinite linear;
    }
    .sk-short  { height: 9px; width: 28%; margin-bottom: 14px; }
    .sk-block  { height: 52px; width: 100%; margin-bottom: 12px; border-radius: 10px; }
    .sk-medium { height: 9px; width: 48%; margin-bottom: 10px; }
    .sk-row    { display: flex; gap: 8px; margin-top: 4px; }
    .sk-long   { height: 30px; flex: 1; border-radius: 8px; }

    /* ─── NEW EMOTION STREAM CLASSES ─── */
    .emotion-sendit { background:rgba(0,229,200,0.12); color:#00e5c8; }
    .emotion-letout { background:rgba(200,100,255,0.12); color:#c864ff; }

    /* ─── STUDIO YT BG ─── */
    .yt-bg-option {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border-radius: 10px; background: rgba(255,0,0,0.07);
      border: 1px solid rgba(255,0,0,0.2); cursor: pointer;
      margin-bottom: 10px; transition: background 0.18s;
    }
    .yt-bg-option:hover { background: rgba(255,0,0,0.13); }
    .yt-bg-option img { width: 56px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
    .yt-bg-option-label {
      font-size: 0.65rem; font-weight: 700; color: #ff5555;
      font-family: 'Space Mono', monospace; letter-spacing: 1px; text-transform: uppercase;
    }
    .yt-bg-option-title {
      font-size: 0.7rem; color: rgba(255,255,255,0.5);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
    }

    .scroll-top, [id*="scrollTop"]:not(#margoScrollTop) {
      display: none !important; opacity: 0 !important; pointer-events: none !important;
    }

    @media (max-width: 480px) {
      .skeleton-card { min-height: 180px !important; }
    }
    @media (max-width: 768px) {
      .modal-sheet { max-height: 92dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    }
  `;
  document.head.appendChild(s);
}

/* ── Sort bar ── */
function injectSortBar() {
  if (document.getElementById('feedSortBar')) return;
  const bar = document.createElement('div');
  bar.id = 'feedSortBar';
  bar.className = 'feed-sort-bar';
  bar.innerHTML = `
    <span class="feed-sort-label">Sort</span>
    <button class="sort-btn active" data-sort="fresh">Recent</button>
    <button class="sort-btn" data-sort="hot">Rising</button>
    <button class="sort-btn" data-sort="top">All time</button>
  `;
  bar.addEventListener('click', e => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    bar.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSort = btn.dataset.sort;
    renderFeed();
  });
  feedList?.parentNode?.insertBefore(bar, feedList);
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
  input.oninput   = () => {
    searchQuery = input.value.trim();
    if (btn) btn.style.display = searchQuery ? 'flex' : 'none';
    renderFeed();
  };
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

/* ── Magnetic tilt ── */
function initCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return; // skip on touch
  document.getElementById('feedList')?.addEventListener('mousemove', e => {
    const card = e.target.closest('.feed-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transform = `translateY(-8px) scale(1.018) rotateY(${x*5}deg) rotateX(${-y*4}deg)`;
  }, { passive: true });
  document.getElementById('feedList')?.addEventListener('mouseleave', e => {
    const card = e.target.closest?.('.feed-card');
    if (card) card.style.transform = '';
  }, { passive: true });
}


function getPostAge(post) {
  if (!post.timestamp) return 999;
  return (Date.now() - post.timestamp) / 3600000;
}

function getEngagement(post) {
  const a = postAnalytics[post.id] || {};
  return (a.views || 0)
    + (Object.keys(a.guesses  || {}).length * 3)
    + (Object.keys(a.helps    || {}).length * 2)
    + (Object.keys(a.resonates|| {}).length * 4)
    + (Object.keys(a.echoes   || {}).length * 5);
}

function calculatePostScore(post) {
  const age    = getPostAge(post);
  const engage = getEngagement(post);
  if (currentSort === 'fresh') return Math.exp(-age / 18) * 1000 + engage * 0.05;
  if (currentSort === 'hot')   return engage / Math.pow(age + 2, 1.4);
  if (currentSort === 'top')   return engage;
  return 0;
}

function isNewPost(post) { return getPostAge(post) < 6; }
function isHotPost(post) { return getEngagement(post) >= 20; }

function getRankedPosts() {
  return getFilteredPosts().sort((a, b) => calculatePostScore(b) - calculatePostScore(a));
}

/* ── Get echo count for a post ── */
function getEchoCount(postId) {
  if (typeof postAnalytics === 'undefined') return 0;
  return Object.keys(postAnalytics[postId]?.echoes || {}).length;
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

/* ══════════════════════════════════════════════════════════
   RENDER FEED
══════════════════════════════════════════════════════════ */
function renderFeed() {
  injectFeedStyles();
  injectSortBar();
  if (postsLoaded) updateLandingStats();
  if (!postsLoaded) { renderSkeleton(); return; }

  feedList.innerHTML = '';
  const filtered = getRankedPosts();
  const rc = document.getElementById('searchResultCount');

  if (!posts.length) {
    feedList.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,0.4)">No lyrics yet — be the first to drop one.</div>';
    if (rc) rc.textContent = ''; return;
  }
  if (!filtered.length) {
    const roomMsg   = activeRoom !== 'all' ? ` in ${activeRoom}` : '';
    const searchMsg = searchQuery ? ` matching "${searchQuery}"` : '';
    feedList.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,0.4)">
      No lyrics${roomMsg}${searchMsg} yet.<br><span style="font-size:0.8rem;opacity:0.6">Be the first to drop one here.</span></div>`;
    if (rc) rc.textContent = searchQuery ? '0 results' : ''; return;
  }
  if (rc) rc.textContent = searchQuery ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : '';

  filtered.forEach((post, i) => {
    const card     = document.createElement('div');
    const eClass   = emotion.toLowerCase().replace(/\s+/g, '');
    card.className = `feed-card e-${eClass}`;
    card.style.animationDelay = `${i * 0.03}s`;

    const k       = post.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
    const emotion = post.emotion || 'Nostalgia';
    const ecfg    = EMOTION_CFG[emotion] || E_DEFAULT;
    const idx     = posts.findIndex(p => p.id === post.id);
    const echoCnt = getEchoCount(post.id);

    const meta           = post.youtubeMeta;
    const hasThumb       = !!(meta?.thumbnailSm || meta?.thumbnail);
    const hasYouTubeUrl  = !!(meta?.youtubeUrl);
    const hasStreamLinks = !!(post.links?.spotify || post.links?.apple || post.links?.soundcloud);

    /* ── CSS class handles background, border, strip, glow ── */
    card.style.setProperty('--e-strip', ecfg.strip);
    card.style.setProperty('--e-shimmer', ecfg.strip.replace('0.85', '0.9'));
    card.style.setProperty('--e-glow', ecfg.border.replace('0.3', '0.1'));

    /* Smart text contrast */
    const lyricColor = ecfg.lyricText || '#fff';
    const metaColor  = ecfg.metaText  || 'rgba(255,255,255,0.6)';

    let rankBadge = '';
    if (currentSort === 'fresh' && isNewPost(post))  rankBadge = '<span class="card-new-badge">New</span>';
    else if (currentSort === 'hot' && isHotPost(post)) rankBadge = '<span class="card-hot-badge">Trending</span>';

    const thumb = hasThumb ? `
      <div class="card-yt-thumb-wrap"
           onclick="event.stopPropagation();window.open('${meta.youtubeUrl || '#'}','_blank','noopener')"
           title="Listen on YouTube">
        <img src="${meta.thumbnailSm || meta.thumbnail}"
             class="card-yt-thumb" alt="" loading="lazy"
             onerror="this.parentElement.style.display='none'"/>
        <span class="card-yt-play">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </span>
      </div>` : '';

    /* Song section — show song/artist for all modes if we have the data */
    let songSection = '';
    const hasSongData = k.song !== 'Unknown Song' || k.artist !== 'Unknown Artist';

    if (hasSongData) {
      songSection = `<div class="card-song">
        ${thumb}
        <div class="card-song-text">
          <div class="card-song-title" style="color:${lyricColor}">${highlightMatch(k.song, searchQuery)}</div>
          <div class="card-song-artist" style="color:${metaColor}">${highlightMatch(k.artist, searchQuery)}</div>
        </div>
      </div>`;
    } else if (post.mode === 'guess') {
      const what = [];
      if (post.guessConfig?.guessSong)   what.push('song');
      if (post.guessConfig?.guessArtist) what.push('artist');
      if (!what.length) what.push('song', 'artist');
      songSection = `<div class="card-mystery">Can you name the ${what.join(' and ')}?</div>`;
    } else {
      songSection = `<div class="card-discover">Help identify this song</div>`;
    }

    /* Actions — always the same structure, resonate.js will upgrade to v2 row */
    const actions = `<div class="card-actions">
      <button class="card-btn" onclick="window.viewPost(${idx})">Open</button>
    </div>`;

    card.innerHTML = `
      ${rankBadge}
      <div class="c-glow" style="background:${ecfg.text}4D"></div>
      <div class="c-inner">
        <div class="card-top">
          <span class="card-time" style="color:${metaColor}">${timeAgo(post.timestamp)}</span>
        </div>
        <div class="card-lyric" style="font-size:${lyricFontSize(post.text)};color:${lyricColor}">${highlightMatch(post.text, searchQuery)}</div>
        <span class="card-emotion-tag" style="background:${ecfg.bg};color:${ecfg.text};border:1px solid ${ecfg.border}">${highlightMatch(emotion, searchQuery)}</span>
        ${songSection}
      </div>
      ${actions}
    `;

    /* Store echo count on card for resonate.js to read */
    card.dataset.echoCount = echoCnt;
    card.dataset.postId    = post.id;

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
