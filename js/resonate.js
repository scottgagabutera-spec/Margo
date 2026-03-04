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
    /* ── REACTION BAR — prototype-matched ── */
    #feedList .reaction-bar {
      position: relative; z-index: 2;
      display: flex; flex-direction: column; gap: 0;
      background: rgba(0,0,0,.38);
      border-top: 1px solid rgba(255,255,255,.07);
      flex-shrink: 0;
      backdrop-filter: blur(10px);
    }
    #feedList .rb-row1,
    #feedList .rb-row2 {
      display: flex; align-items: center;
      padding: 8px 13px 8px 14px; gap: 7px;
    }
    #feedList .rb-row1 {
      border-bottom: 1px solid rgba(255,255,255,.05);
      padding-bottom: 7px;
    }
    #feedList .rb-row2 {
      padding-top: 7px; padding-bottom: 10px;
    }

    /* Resonate */
    #feedList .resonate-btn {
      display: flex; align-items: center; gap: 7px;
      padding: 7px 16px; border-radius: 50px;
      border: 1px solid rgba(192,132,252,.28);
      background: rgba(192,132,252,.08);
      cursor: pointer;
      transition: all .25s cubic-bezier(.34,1.56,.64,1);
      font-family: 'DM Serif Display', serif;
      font-size: .75rem; font-weight: 600; font-style: italic;
      color: rgba(192,132,252,.95);
      position: relative; overflow: hidden; flex-shrink: 0;
      white-space: nowrap; letter-spacing: .2px;
    }
    #feedList .resonate-btn:hover {
      border-color: rgba(192,132,252,.55); color: #C084FC;
      background: rgba(192,132,252,.16);
      transform: scale(1.06);
      box-shadow: 0 0 22px rgba(192,132,252,.24);
    }
    #feedList .resonate-btn.resonated {
      border-color: rgba(192,132,252,.6);
      color: #C084FC; background: rgba(192,132,252,.18);
    }
    #feedList .resonate-btn:active { transform: scale(0.94); }

    @keyframes rBurst {
      0%   { opacity:1; transform:scale(0); }
      65%  { opacity:.4; transform:scale(2.6); }
      100% { opacity:0; transform:scale(4); }
    }
    .r-ripple {
      position: absolute; inset: 0; border-radius: 50px;
      background: radial-gradient(circle, rgba(192,132,252,.55) 0%, transparent 70%);
      opacity: 0; pointer-events: none;
    }
    .r-ripple.go { animation: rBurst .55s ease-out forwards; }

    @keyframes rIconPop {
      0%   { transform: scale(1) rotate(0deg); }
      40%  { transform: scale(1.6) rotate(22deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    .r-icon {
      font-size: 1rem; display: inline-block;
      line-height: 1; font-style: normal;
      transition: transform .36s cubic-bezier(.34,1.56,.64,1);
    }
    #feedList .resonate-btn.resonated .r-icon {
      transform: scale(1.4) rotate(22deg);
    }
    .r-count {
      color: #00E5FF;
      font-family: 'DM Serif Display', serif;
      font-size: .72rem; font-weight: 700;
      font-style: normal; letter-spacing: .3px;
    }

    /* Spacer */
    #feedList .rb-spacer { flex: 1; }

    /* Views chip */
    #feedList .views-chip {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 11px; border-radius: 20px;
      font-family: 'DM Serif Display', serif;
      font-size: .7rem; font-weight: 600;
      color: rgba(255,255,255,.82);
      background: rgba(0,0,0,.5);
      border: 1px solid rgba(255,255,255,.1);
      backdrop-filter: blur(8px);
      text-shadow: 0 1px 6px rgba(0,0,0,.8);
      box-shadow: 0 1px 8px rgba(0,0,0,.35);
      flex-shrink: 0; letter-spacing: .2px;
    }

    /* Lyric Back */
    #feedList .reply-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 50px;
      border: 1px solid rgba(232,197,71,.22);
      background: rgba(232,197,71,.06);
      cursor: pointer;
      transition: all .22s cubic-bezier(.34,1.56,.64,1);
      font-family: 'DM Serif Display', serif;
      font-size: .72rem; font-weight: 600; font-style: italic;
      color: rgba(232,197,71,.9);
      white-space: nowrap; flex-shrink: 0;
    }
    #feedList .reply-btn:hover {
      background: rgba(232,197,71,.14);
      border-color: rgba(232,197,71,.48);
      color: #E8C547; transform: scale(1.05);
      box-shadow: 0 0 16px rgba(232,197,71,.15);
    }
    #feedList .reply-btn:active { transform: scale(0.96); }
    .reply-badge {
      color: #E8C547;
      font-family: 'DM Serif Display', serif;
      font-size: .66rem; font-style: normal; font-weight: 700;
    }

    /* Share button */
    #feedList .share-btn {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 15px 8px 12px; border-radius: 50px;
      border: 1px solid rgba(232,197,71,.35);
      background: rgba(232,197,71,.09);
      cursor: pointer;
      transition: all .22s cubic-bezier(.34,1.56,.64,1);
      white-space: nowrap; flex-shrink: 0;
      margin-left: auto;
    }
    #feedList .share-btn:hover {
      background: rgba(232,197,71,.18);
      border-color: rgba(232,197,71,.6);
      transform: scale(1.06);
      box-shadow: 0 0 20px rgba(232,197,71,.22);
    }
    #feedList .share-btn:active { transform: scale(0.96); }
    .share-top {
      font-family: 'DM Serif Display', serif;
      font-size: .68rem; font-weight: 700;
      color: rgba(232,197,71,.98); font-style: italic; line-height: 1.1;
    }
    .share-sub {
      font-family: 'Space Mono', monospace;
      font-size: .42rem; font-weight: 700;
      color: rgba(232,197,71,.6); letter-spacing: .6px;
      line-height: 1; text-transform: uppercase;
    }
    .share-labels { display: flex; flex-direction: column; gap: 2px; }
    .share-icon { font-size: 1rem; line-height: 1; }
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

/* ── Build action row — prototype-matched ── */
function buildCardActionsV2(post, postIdx) {
  injectResonateStyles();
  const postId    = post.id;
  const rCount    = getResonateCount(postId);
  const resonated = hasResonated(postId);
  const echoCount = Object.keys((postAnalytics?.[postId]?.echoes) || {}).length;
  const views     = postAnalytics?.[postId]?.views || 0;

  const viewsLabel = views >= 1000
    ? (views / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
    : views || '';

  const bar = document.createElement('div');
  bar.className = 'reaction-bar';

  // ROW 1: Resonate + views
  const row1 = document.createElement('div');
  row1.className = 'rb-row1';

  const resonateBtn = document.createElement('button');
  resonateBtn.className = `resonate-btn${resonated ? ' resonated' : ''}`;
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

  const spacer = document.createElement('div');
  spacer.className = 'rb-spacer';

  const viewsChip = document.createElement('div');
  viewsChip.className = 'views-chip';
  viewsChip.innerHTML = `👁 ${viewsLabel || '—'}`;

  row1.appendChild(resonateBtn);
  row1.appendChild(spacer);
  row1.appendChild(viewsChip);

  // ROW 2: Lyric Back + Share
  const row2 = document.createElement('div');
  row2.className = 'rb-row2';

  const replyBtn = document.createElement('button');
  replyBtn.className = 'reply-btn';
  replyBtn.innerHTML = `↩ Lyric Back${echoCount > 0 ? ` <span class="reply-badge">·${echoCount}</span>` : ''}`;
  replyBtn.onclick = (e) => {
    e.stopPropagation();
    if (typeof openEchoSheet === 'function') openEchoSheet(postIdx);
  };

  const shareBtn = document.createElement('button');
  shareBtn.className = 'share-btn';
  shareBtn.innerHTML = `
    <span class="share-icon">⬡</span>
    <span class="share-labels">
      <span class="share-top">Share</span>
      <span class="share-sub">GIF · Poster</span>
    </span>
  `;
  shareBtn.onclick = (e) => {
    e.stopPropagation();
    window.currentPost = post;
    if (typeof openShareSheet === 'function') openShareSheet(post);
  };

  row2.appendChild(replyBtn);
  row2.appendChild(shareBtn);

  bar.appendChild(row1);
  bar.appendChild(row2);
  return bar;
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
  document.querySelectorAll('.resonate-btn[data-post-id]').forEach(btn => {
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
