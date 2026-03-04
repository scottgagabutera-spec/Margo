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
    /* ── SINGLE ACTION ROW ── */
    #feedList .card-actions-v2 {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 8px 12px 10px !important;
      border-top: 1px solid rgba(255,255,255,0.07) !important;
      flex-shrink: 0 !important;
    }

    /* Resonate */
    .card-resonate-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 7px 12px; border-radius: 50px;
      background: rgba(192,132,252,0.08);
      border: 1px solid rgba(192,132,252,0.25);
      color: rgba(192,132,252,0.9);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.68rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap; flex-shrink: 0;
      position: relative; overflow: hidden;
    }
    .card-resonate-btn:hover {
      background: rgba(192,132,252,0.16);
      border-color: rgba(192,132,252,0.5);
      transform: scale(1.04);
    }
    .card-resonate-btn.resonated {
      background: rgba(192,132,252,0.18);
      border-color: rgba(192,132,252,0.55);
      color: #C084FC;
    }
    .card-resonate-btn:active { transform: scale(0.94); }
    .r-icon { font-size: 0.82rem; display: inline-block; line-height: 1; }
    .card-resonate-btn.resonated .r-icon { transform: scale(1.3) rotate(20deg); }
    .r-count {
      color: #00E5FF; font-size: 0.62rem;
      font-family: 'Space Mono', monospace; font-weight: 700;
    }
    @keyframes rBurst {
      0%{opacity:1;transform:scale(0)} 65%{opacity:.4;transform:scale(2.4)} 100%{opacity:0;transform:scale(3.8)}
    }
    .r-ripple {
      position:absolute;inset:0;border-radius:50px;
      background:radial-gradient(circle,rgba(192,132,252,.5) 0%,transparent 70%);
      opacity:0;pointer-events:none;
    }
    .r-ripple.go { animation: rBurst .5s ease-out forwards; }

    /* Lyric Back */
    .card-lyric-back-btn {
      flex: 1;
      display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 7px 8px; border-radius: 50px;
      background: rgba(232,197,71,0.06);
      border: 1px solid rgba(232,197,71,0.2);
      color: rgba(232,197,71,0.85);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.68rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap; text-align: center;
    }
    .card-lyric-back-btn:hover {
      background: rgba(232,197,71,0.13);
      border-color: rgba(232,197,71,0.45);
      color: #E8C547;
    }
    .card-lyric-back-btn:active { transform: scale(0.96); }
    .lyric-back-count {
      font-size: 0.58rem; font-family: 'Space Mono', monospace;
      font-weight: 700; color: #E8C547; opacity: 0.8;
    }

    /* GIF · Poster */
    .card-share-btn {
      display: flex; align-items: center; gap: 4px;
      padding: 7px 12px; border-radius: 50px;
      background: rgba(232,197,71,0.08);
      border: 1px solid rgba(232,197,71,0.28);
      color: rgba(232,197,71,0.9);
      font-family: 'Space Mono', monospace;
      font-size: 0.48rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap; flex-shrink: 0;
    }
    .card-share-btn:hover {
      background: rgba(232,197,71,0.16);
      border-color: rgba(232,197,71,0.5);
      color: #E8C547;
      box-shadow: 0 0 16px rgba(232,197,71,0.15);
    }
    .card-share-btn:active { transform: scale(0.96); }
    .card-share-dot { opacity: 0.4; margin: 0 1px; }
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

/* ── Build single action row ── */
function buildCardActionsV2(post, postIdx) {
  injectResonateStyles();
  const postId    = post.id;
  const rCount    = getResonateCount(postId);
  const resonated = hasResonated(postId);
  const echoCount = Object.keys((postAnalytics?.[postId]?.echoes) || {}).length;

  const row = document.createElement('div');
  row.className = 'card-actions-v2';

  // ♥ Resonate
  const resonateBtn = document.createElement('button');
  resonateBtn.className = `card-resonate-btn${resonated ? ' resonated' : ''}`;
  resonateBtn.setAttribute('data-post-id', postId);
  resonateBtn.innerHTML = `
    <div class="r-ripple"></div>
    <span class="r-icon">✦</span>
    <span>Resonate</span>
    ${rCount > 0 ? `<span class="r-count">${rCount}</span>` : ''}
  `;
  resonateBtn.onclick = (e) => {
    e.stopPropagation();
    toggleResonate(postId);
    const rip = resonateBtn.querySelector('.r-ripple');
    rip.classList.remove('go');
    void rip.offsetWidth;
    rip.classList.add('go');
  };
  row.appendChild(resonateBtn);

  // ↩ Lyric Back (with echo count)
  const lyrBackBtn = document.createElement('button');
  lyrBackBtn.className = 'card-lyric-back-btn';
  lyrBackBtn.innerHTML = `↩ Lyric Back${echoCount > 0 ? ` <span class="lyric-back-count">·${echoCount}</span>` : ''}`;
  lyrBackBtn.onclick = (e) => {
    e.stopPropagation();
    if (typeof openEchoSheet === 'function') openEchoSheet(postIdx);
  };
  row.appendChild(lyrBackBtn);

  // GIF · Poster
  const shareBtn = document.createElement('button');
  shareBtn.className = 'card-share-btn';
  shareBtn.innerHTML = `GIF <span class="card-share-dot">·</span> Poster`;
  shareBtn.onclick = (e) => {
    e.stopPropagation();
    window.currentPost = post;
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
    const oldActions = card.querySelector('.card-actions, .card-actions-v2, .reaction-bar');
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
    const countEl   = btn.querySelector('.r-count');

    if (count > 0) {
      if (countEl) { countEl.textContent = count; }
      else {
        const span = document.createElement('span');
        span.className   = 'r-count';
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
