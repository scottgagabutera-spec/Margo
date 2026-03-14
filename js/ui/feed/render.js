function renderSkeleton() {
  feedList.innerHTML='';
  for (let i=0;i<6;i++) {
    const s=document.createElement('div');
    s.className='feed-card skeleton-card';
    s.style.animationDelay=(i*0.07)+'s';
    s.innerHTML=`<div class="sk-line sk-short"></div><div class="sk-block"></div>
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

  feedList.innerHTML='';
  const filtered = getRankedPosts();
  const rc = document.getElementById('searchResultCount');

  if (!posts.length) {
    feedList.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,0.4)">No lyrics yet — be the first to drop one.</div>';
    if (rc) rc.textContent=''; return;
  }
  if (!filtered.length) {
    const roomMsg   = activeRoom!=='all' ? ` in ${activeRoom}` : '';
    const searchMsg = searchQuery ? ` matching "${searchQuery}"` : '';
    feedList.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,0.4)">
      No lyrics${roomMsg}${searchMsg} yet.<br><span style="font-size:0.8rem;opacity:0.6">Be the first to drop one here.</span></div>`;
    if (rc) rc.textContent=searchQuery?'0 results':''; return;
  }
  if (rc) rc.textContent=searchQuery?`${filtered.length} result${filtered.length!==1?'s':''}`:'' ;

  filtered.forEach((post, i) => {
    const card    = document.createElement('div');
    const k       = post.knowledge||{song:'Unknown Song',artist:'Unknown Artist'};
    const emotion = post.emotion||'Nostalgia';
    const eClass  = emotion.toLowerCase().replace(/\s+/g,'');
    card.className = `feed-card e-${eClass}`;
    card.style.animationDelay = `${i*0.03}s`;

    const ecfg      = EMOTION_CFG[emotion]||E_DEFAULT;
    const echoCnt   = getEchoCount(post.id);
    const vibeLabel = VIBE_LABELS[emotion] || emotion;

    const meta     = post.youtubeMeta;
    const hasThumb = !!(meta?.thumbnailSm||meta?.thumbnail);

    card.style.setProperty('--e-strip',       ecfg.strip);
    card.style.setProperty('--e-strip-color', ecfg.strip);
    card.style.setProperty('--e-border',      ecfg.border);
    card.style.background = ecfg.cardBg;

    let rankBadge = '';
    if      (currentSort==='fresh' && isNewPost(post))  rankBadge='<span class="card-new-badge">New</span>';
    else if (currentSort==='hot'   && isHotPost(post))  rankBadge='<span class="card-hot-badge">Trending</span>';

    const thumb = hasThumb ? `
      <div class="card-yt-thumb-wrap"
           onclick="event.stopPropagation();window.open('${meta.youtubeUrl||'#'}','_blank','noopener')"
           title="Listen on YouTube">
        <img src="${meta.thumbnailSm||meta.thumbnail}" class="card-yt-thumb" alt="" loading="lazy"
             onerror="this.parentElement.style.display='none'"/>
        <span class="card-yt-play">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </span>
      </div>` : '';

    const hasSongData = k.song!=='Unknown Song' || k.artist!=='Unknown Artist';

    let songSection = '';
    if (hasSongData) {
      songSection = `<div class="card-song">
        ${thumb}
        <div class="card-song-text">
          <div class="card-song-title">${highlightMatch(k.song,searchQuery)}</div>
          <div class="card-song-artist">${highlightMatch(k.artist,searchQuery)}</div>
        </div>
      </div>`;
    }

    card.innerHTML = `
      ${rankBadge}
      <div class="card-top">
        <span class="card-time">${timeAgo(post.timestamp)}</span>
        <span class="card-emotion-tag" style="background:${ecfg.bg};color:${ecfg.text};border:1px solid ${ecfg.border}">${highlightMatch(vibeLabel,searchQuery)}</span>
      </div>
      <div class="card-lyric" style="color:${ecfg.lyricText}">${highlightMatch(post.text,searchQuery)}</div>
      ${songSection}
      <div class="card-actions"></div>
    `;

    card.dataset.echoCount = echoCnt;
    card.dataset.postId    = post.id;

    feedList.appendChild(card);
  });

  if (typeof upgradeCardActions === 'function') {
    requestAnimationFrame(upgradeCardActions);
  }
}

/* ── Utilities ── */
function timeAgo(ts) {
  const m = Math.floor((Date.now()-ts)/60000);
  if (m<1)  return 'now';
  if (m<60) return m+'m';
  const h = Math.floor(m/60);
  if (h<24) return h+'h';
  return Math.floor(h/24)+'d';
}

function trackView(postId) {
  if (isFirebaseEnabled && postId)
    analyticsRef.child(postId).child('views').transaction(v=>(v||0)+1);
}

function showNewPostsIndicator(count) {
  const c = document.getElementById('newPostsCount');
  if (c) c.textContent=count;
  newPostsIndicator?.classList.add('visible');
}
