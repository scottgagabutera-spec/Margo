function buildSwipeCard(post, i) {
  const ecfg = EMOTION_CFG[post.emotion] || E_DEFAULT;
  const k = post.knowledge || { song: 'Unknown Song', artist: 'Unknown Artist' };
  const vibeLabel = VIBE_LABELS[post.emotion] || post.emotion;
  const echoCnt = getEchoCount(post.id);
  const resonateCount = (typeof getEchoCount === "function" ? Object.keys((typeof postAnalytics !== "undefined" && postAnalytics[post.id]?.resonates) || {}).length : (post.resonates || 0));

  const div = document.createElement('div');
  div.className = 'swipe-card';
  div.dataset.postId = post.id;
  div.style.transform = i === 0 ? 'translateY(0)' : 'translateY(105%)';
  div.style.zIndex = 1000 - i;

  const meta = post.youtubeMeta;
  const hasThumb = !!(meta && (meta.thumbnailSm || meta.thumbnail));
  const thumbHtml = hasThumb ? `
    <div class="card-yt-thumb-wrap"
         onclick="event.stopPropagation();window.open('${meta.youtubeUrl||"#"}','_blank','noopener')"
         title="Listen on YouTube">
      <img src="${meta.thumbnailSm||meta.thumbnail}" class="card-yt-thumb" alt="" loading="lazy"
           onerror="this.parentElement.style.display='none'"/>
      <span class="card-yt-play">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </span>
    </div>` : '';

  div.innerHTML = `
    <div class="card-bg" style="background:${ecfg.cardBg};background-color:#07060A"></div>
    <div class="card-glow-strip" style="background:linear-gradient(90deg,transparent 0%,${ecfg.strip} 20%,${ecfg.strip} 80%,transparent 100%)"></div>
    <div class="card-content">
      <span class="card-emotion-label" style="background:${ecfg.bg};color:${ecfg.text};border:1px solid ${ecfg.border}">${vibeLabel}</span>
      <div class="card-lyric">${post.text}</div>
      <span class="card-time">${timeAgo(post.timestamp)}</span>
    </div>
    <div class="card-song">
      ${thumbHtml}
      <div class="song-icon" style="background:${ecfg.bg};color:${ecfg.text}">&#9834;</div>
      <div class="song-text">
        <div class="song-title">${k.song}</div>
        <div class="song-artist">${k.artist}</div>
      </div>
    </div>
    <div class="card-actions">
      <button class="action-seg resonate-seg" data-id="${post.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 Q5 6 8 12 Q11 18 14 12 Q17 6 20 12 Q21.5 15 22 12"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>
        <span>Resonate</span>
        <span class="seg-count">${resonateCount}</span>
      </button>
      <button class="action-seg lyric-back-seg" data-id="${post.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>Lyric Back</span>
        <span class="seg-count" style="opacity:0.25">${echoCnt || '-'}</span>
      </button>
      <button class="action-seg share-seg" data-id="${post.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17 L4 11 L8 15 L12 8 L16 15 L20 11 L20 17"/><path d="M12 3 L12 8" stroke-width="1.5"/><path d="M9 6 L12 3 L15 6" stroke-width="1.5"/></svg>
        <div class="share-label">GIF<span class="share-dot"> &middot; </span>Poster</div>
      </button>
    </div>`;

  const resonateBtn = div.querySelector('.resonate-seg');
  if (resonateBtn) {
    resonateBtn.onclick = function(e) {
      e.stopPropagation();
      if (typeof toggleResonate === 'function') {
        toggleResonate(post.id, resonateBtn);
        const segCount = resonateBtn.querySelector('.seg-count');
        if (segCount && typeof getResonateCount === 'function') {
          segCount.textContent = getResonateCount(post.id);
        }
      }
    };
  }

  const lyricBackBtn = div.querySelector('.lyric-back-seg');
  if (lyricBackBtn) {
    lyricBackBtn.onclick = function(e) {
      e.stopPropagation();
      if (typeof openEchoSheet === 'function') {
        const idx = posts.findIndex(p => p.id === post.id);
        openEchoSheet(idx >= 0 ? idx : post);
      }
    };
  }

  const shareBtn = div.querySelector('.share-seg');
  if (shareBtn) {
    shareBtn.onclick = function(e) {
      e.stopPropagation();
      if (typeof openShareSheet === 'function') openShareSheet(post);
    };
  }

  return div;
}

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
  const stack = document.getElementById('cardStack');
  if (stack) delete stack.dataset.swipeReady;
  injectFeedStyles();
  injectSortBar();
  if (postsLoaded) updateLandingStats();
  if (!postsLoaded) { renderSkeleton(); return; }

  const filtered = getRankedPosts();
  const stack = document.getElementById('cardStack');
  if (!stack) return;
  stack.innerHTML = '';

  if (!filtered.length) {
    stack.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.25);font-family:var(--font-mono);font-size:0.65rem;letter-spacing:3px;text-transform:uppercase">No lyrics here yet</div>';
    updateSwipeUI();
    return;
  }

  filtered.forEach(function(post, i) {
    const card = buildSwipeCard(post, i);
    stack.appendChild(card);
  });

  updateSwipeUI();
  if (typeof initSwipeEngine === 'function') initSwipeEngine();
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
