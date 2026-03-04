/* ============================================================
   MARGO — js/resonate.js
   v1.2 — concept-v2
   • Resonate button shows "Resonate" text so users know what it means
   • Share button shows "GIF · Poster" so users know what they're getting
   • upgradeCardActions() replaces .card-actions on ALL card modes
   • viewPost() patched to open share sheet with correct currentPost
   ============================================================ */

function injectResonateStyles() {
  if (document.getElementById('resonateStyles')) return;
  const s = document.createElement('style');
  s.id = 'resonateStyles';
  s.textContent = `
    #feedList .card-actions-v2 {
      margin-top: auto !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(232,197,71,0.10) !important;
      flex-shrink: 0 !important;
      display: flex !important;
      gap: 6px !important;
      align-items: center !important;
    }

    /* Resonate */
    .card-resonate-btn {
      display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 8px 10px; border-radius: 9px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.45);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.68rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
      white-space: nowrap; flex-shrink: 0;
    }
    .card-resonate-btn:hover {
      border-color: rgba(255,107,157,0.35); color: #FF6B9D;
      background: rgba(255,107,157,0.07);
    }
    .card-resonate-btn.resonated {
      background: rgba(255,107,157,0.1);
      border-color: rgba(255,107,157,0.38); color: #FF6B9D;
    }
    .card-resonate-btn:active { transform: scale(0.92); }

    @keyframes heartPop {
      0%  { transform: scale(1); }
      40% { transform: scale(1.5); }
      70% { transform: scale(0.88); }
      100%{ transform: scale(1); }
    }
    .card-resonate-btn.pop .resonate-heart {
      animation: heartPop 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    .resonate-heart  { display:inline-block; font-size:0.78rem; line-height:1; }
    .resonate-label  { font-size:0.68rem; font-weight:600; }
    .resonate-count  {
      font-size:0.6rem; font-family:'Space Mono',monospace;
      font-weight:700; opacity:0.75;
    }

    /* Lyric Back */
    .card-lyric-back-btn {
      flex: 1; padding: 8px 6px; border-radius: 9px;
      background: rgba(107,140,255,0.06);
      border: 1px solid rgba(107,140,255,0.18);
      color: rgba(107,140,255,0.8);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.7rem; font-weight: 600;
      cursor: pointer; transition: all 0.18s;
      white-space: nowrap; text-align: center;
      display: flex; align-items: center; justify-content: center; gap: 5px;
    }
    .card-lyric-back-btn:hover {
      background: rgba(107,140,255,0.12);
      border-color: rgba(107,140,255,0.4); color: #6B8CFF;
    }
    .card-lyric-back-btn:active { transform: scale(0.96); }
    .lyric-back-count {
      font-size: 0.58rem; font-family: 'Space Mono', monospace;
      font-weight: 700; opacity: 0.7;
    }

    /* GIF · Poster */
    .card-share-btn {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      padding: 8px 11px; border-radius: 9px;
      background: rgba(232,197,71,0.07);
      border: 1px solid rgba(232,197,71,0.22);
      color: rgba(232,197,71,0.8);
      font-family: 'Space Mono', monospace;
      font-size: 0.5rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      cursor: pointer; transition: all 0.18s;
      white-space: nowrap; flex-shrink: 0;
    }
    .card-share-btn:hover {
      background: rgba(232,197,71,0.14);
      border-color: rgba(232,197,71,0.45); color: #E8C547;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(232,197,71,0.15);
    }
    .card-share-btn:active { transform: scale(0.96); }
    .card-share-dot { opacity:0.4; font-size:0.38rem; margin:0 1px; }
  `;
  document.head.appendChild(s);
}

/* ── Resonate helpers ── */
function getResonateCount(postId) {
  if (typeof postAnalytics === 'undefined') return 0;
  return Object.keys((postAnalytics[postId]?.resonates) || {}).length;
}

function hasResonated(postId) {
  if (typeof postAnalytics === 'undefined') return false;
  const myId = typeof userId !== 'undefined' ? userId : '';
  return !!(postAnalytics[postId]?.resonates?.[myId]);
}

function toggleResonate(postId) {
  if (!postId || typeof isFirebaseEnabled === 'undefined' || !isFirebaseEnabled) return;
  const myId = typeof userId !== 'undefined' ? userId : 'anon';
  const ref  = analyticsRef.child(postId).child('resonates').child(myId);
  ref.once('value').then(snap => { snap.exists() ? ref.remove() : ref.set(true); });
}

/* ── Build action row ── */
function buildCardActionsV2(post, postIdx) {
  injectResonateStyles();
  const postId    = post.id;
  const count     = getResonateCount(postId);
  const resonated = hasResonated(postId);

  const row = document.createElement('div');
  row.className = 'card-actions-v2';

  // Resonate
  const resonateBtn = document.createElement('button');
  resonateBtn.className = `card-resonate-btn${resonated ? ' resonated' : ''}`;
  resonateBtn.setAttribute('aria-label', 'Resonate');
  resonateBtn.setAttribute('data-post-id', postId);
  resonateBtn.innerHTML = `
    <span class="resonate-heart">♥</span>
    <span class="resonate-label">Resonate</span>
    ${count > 0 ? `<span class="resonate-count">${count}</span>` : ''}
  `;
  resonateBtn.onclick = (e) => {
    e.stopPropagation();
    toggleResonate(postId);
    resonateBtn.classList.add('pop');
    setTimeout(() => resonateBtn.classList.remove('pop'), 400);
  };
  row.appendChild(resonateBtn);

  // Lyric Back — show echo count if any
  const echoCount = Object.keys((postAnalytics?.[postId]?.echoes) || {}).length;
  const lyrBackBtn = document.createElement('button');
  lyrBackBtn.className = 'card-lyric-back-btn';
  lyrBackBtn.innerHTML = `Lyric Back${echoCount > 0 ? ` <span class="lyric-back-count">${echoCount}</span>` : ''}`;
  lyrBackBtn.onclick = (e) => {
    e.stopPropagation();
    if (typeof openEchoSheet === 'function') openEchoSheet(postIdx);
  };
  row.appendChild(lyrBackBtn);

  // GIF · Poster
  const shareBtn = document.createElement('button');
  shareBtn.className = 'card-share-btn';
  shareBtn.innerHTML = `GIF <span class="card-share-dot">●</span> Poster`;
  shareBtn.onclick = (e) => {
    e.stopPropagation();
    window.currentPost = post; // set BEFORE opening so canvas has real data
    if (typeof openShareSheet === 'function') openShareSheet(post);
  };
  row.appendChild(shareBtn);

  return row;
}

/* ── Patch renderFeed ── */
(function patchFeedCardActions() {
  const tryPatch = () => {
    if (typeof renderFeed !== 'function') { setTimeout(tryPatch, 100); return; }
    const _orig = renderFeed;
    window.renderFeed = function() {
      _orig.apply(this, arguments);
      upgradeCardActions();
    };
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', tryPatch)
    : setTimeout(tryPatch, 50);
})();

function upgradeCardActions() {
  injectResonateStyles();
  const feedListEl = document.getElementById('feedList');
  if (!feedListEl || typeof posts === 'undefined') return;

  const cards = feedListEl.querySelectorAll('.feed-card:not(.skeleton-card)');
  const rankedPosts = typeof getRankedPosts === 'function'
    ? getRankedPosts()
    : posts.filter(p => p.status !== 'hidden');

  cards.forEach((card, i) => {
    const post = rankedPosts[i];
    if (!post) return;
    const globalIdx  = posts.findIndex(p => p.id === post.id);
    const oldActions = card.querySelector('.card-actions, .card-actions-v2');
    if (oldActions) oldActions.replaceWith(buildCardActionsV2(post, globalIdx));
  });
}

/* ── Patch viewPost ── */
(function patchViewPost() {
  const tryPatch = () => {
    if (typeof posts === 'undefined') { setTimeout(tryPatch, 100); return; }
    window.viewPost = function(index) {
      const post = posts[index];
      if (!post) return;
      if (typeof trackView === 'function') trackView(post.id);
      window.currentPost = post;
      if (typeof openShareSheet === 'function') openShareSheet(post);
    };
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', tryPatch)
    : setTimeout(tryPatch, 60);
})();

/* ── Live resonate refresh ── */
function refreshVisibleResonateCounts() {
  document.querySelectorAll('.card-resonate-btn[data-post-id]').forEach(btn => {
    const postId    = btn.dataset.postId;
    const count     = getResonateCount(postId);
    const resonated = hasResonated(postId);
    const countEl   = btn.querySelector('.resonate-count');

    if (count > 0) {
      if (countEl) { countEl.textContent = count; }
      else {
        const span = document.createElement('span');
        span.className   = 'resonate-count';
        span.textContent = count;
        btn.appendChild(span);
      }
    } else if (countEl) {
      countEl.remove();
    }
    btn.classList.toggle('resonated', resonated);
  });
}

(function hookAnalytics() {
  const tryHook = () => {
    if (typeof analyticsRef === 'undefined') { setTimeout(tryHook, 200); return; }
    analyticsRef.on('value', () => setTimeout(refreshVisibleResonateCounts, 50));
  };
  setTimeout(tryHook, 500);
})();

/* ── Global expose ── */
window.toggleResonate     = toggleResonate;
window.getResonateCount   = getResonateCount;
window.hasResonated       = hasResonated;
window.buildCardActionsV2 = buildCardActionsV2;
window.upgradeCardActions = upgradeCardActions;
