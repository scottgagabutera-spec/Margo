function injectSortBar() {
  if (document.getElementById('feedSortBar')) return;
  const bar = document.createElement('div');
  bar.id = 'feedSortBar'; bar.className = 'feed-sort-bar';
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
  document.getElementById('feed')?.appendChild(bar);
}

function preloadStudioFonts() {
  ["700 16px 'Playfair Display'","italic 16px 'Playfair Display'",
   "600 16px 'Cormorant Garamond'","italic 16px 'Cormorant Garamond'",
   "600 16px 'Lora'","italic 16px 'Lora'",
   "700 16px 'Merriweather'","700 16px 'Josefin Sans'",
   "400 16px 'Bebas Neue'","600 16px 'Oswald'",
   "700 16px 'Dancing Script'","800 16px 'Syne'",
   "700 16px 'Space Mono'","italic 16px 'DM Serif Display'","700 16px 'DM Sans'",
  ].forEach(f => document.fonts.load(f).catch(()=>{}));
}

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
      <div class="lyric-card-meta"><span class="lyric-card-emotion emotion-${emotion.toLowerCase()}">${VIBE_LABELS[emotion]||emotion}</span></div>`;
    return card;
  };
  const offset = Math.floor(source.length / 2);
  fill.forEach(item => track1.appendChild(buildCard(item)));
  [...source.slice(offset), ...source, ...source, ...source.slice(0,offset)].forEach(item => track2.appendChild(buildCard(item)));
}

function getTickerPosts() {
  if (posts.length < 6) return STREAM_SAMPLES;
  const recent  = posts.slice(0, 4);
  const byViews = posts.filter(p => !recent.includes(p))
    .sort((a,b) => (postAnalytics[b.id]?.views||0) - (postAnalytics[a.id]?.views||0)).slice(0,4);
  const rest    = posts.filter(p => !recent.includes(p) && !byViews.includes(p));
  const random  = rest.sort(()=>Math.random()-0.5).slice(0,4);
  return [...recent, ...byViews, ...random];
}

function initStatsShimmer() {
  ['statTotal','featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.textContent === '—') el.innerHTML = '<span class="stat-shimmer">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>';
  });
}

function calcFeatured() {
  const ac={}, sc={}, ec={};
  posts.forEach(p => {
    const a=p.knowledge?.artist, s=p.knowledge?.song, e=p.emotion||'Nostalgia';
    if (a && a!=='Unknown Artist') { const k=a.trim(); ac[k]=(ac[k]||0)+1; }
    if (s && s!=='Unknown Song')   { const k=s.trim(); sc[k]=(sc[k]||0)+1; }
    ec[e]=(ec[e]||0)+1;
  });
  const ae=Object.entries(ac).sort((a,b)=>b[1]-a[1]);
  const se=Object.entries(sc).sort((a,b)=>b[1]-a[1]);
  const te=Object.entries(ec).sort((a,b)=>b[1]-a[1])[0];
  return {
    uniqueArtistCount: Object.keys(ac).length,
    uniqueSongCount:   Object.keys(sc).length,
    topArtist:  (ae[0]?.[1]>=2) ? ae[0][0] : null,
    topSong:    (se[0]?.[1]>=2) ? se[0][0] : null,
    topEmotion: te
  };
}

function updateLandingStats() {
  const n = posts.length||0;
  const $ = id => document.getElementById(id);
  if ($('liveCount'))  $('liveCount').textContent  = n;
  if ($('statTotal'))  $('statTotal').textContent  = n||'—';
  if ($('postCount'))  $('postCount').textContent  = n;
  if (!n) { ['featuredArtistCount','featuredSongCount','topArtistName','topSongName','topEmotion'].forEach(id=>{ if($(id))$(id).textContent='—'; }); return; }
  const {uniqueArtistCount,uniqueSongCount,topArtist,topSong,topEmotion} = calcFeatured();
  if ($('featuredArtistCount')) $('featuredArtistCount').textContent = uniqueArtistCount||'—';
  if ($('featuredSongCount'))   $('featuredSongCount').textContent   = uniqueSongCount||'—';
  if ($('topArtistName'))       $('topArtistName').textContent       = topArtist||'—';
  if ($('topSongName'))         $('topSongName').textContent         = topSong||'—';
  if ($('topEmotion'))          $('topEmotion').textContent          = topEmotion ? (VIBE_LABELS[topEmotion[0]]||topEmotion[0]) : '—';
}

function setupStatsBar() {
  const bar = document.querySelector('.stats-bar');
  if (!bar) return;
  const align = () => {
    if (window.innerWidth >= 769) bar.style.justifyContent = bar.scrollWidth<=bar.clientWidth ? 'center' : 'flex-start';
    else { bar.style.justifyContent='flex-start'; bar.scrollLeft=0; }
  };
  align(); window.addEventListener('resize', align);
}

