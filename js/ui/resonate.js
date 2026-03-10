/* ============================================================
   MARGO — js/resonate.js
   Resonate system — heart/like for posts.
   Stored in Firebase: analytics/{postId}/resonates/{userId} = true
   Also wires up the new feed card action buttons:
     • Resonate (♥)
     • Lyric Back (opens echo sheet)
     • Share · GIF · Poster (opens share sheet)
   And patches the feed card renderer to use new buttons.
   v1.0
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────────────────── */
function injectResonateStyles() {
  if (document.getElementById('resonateStyles')) return;
  const s = document.createElement('style');
  s.id = 'resonateStyles';
  s.textContent = `
    /* ── Resonate button ── */
    .card-resonate-btn {
      display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 7px 10px; border-radius: 9px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.38);
      font-family: 'Space Mono', monospace;
      font-size: 0.55rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
      white-space: nowrap; flex-shrink: 0;
      position: relative; overflow: hidden;
    }
    .card-resonate-btn:hover {
      border-color: rgba(255,107,157,0.35);
      color: #FF6B9D;
      background: rgba(255,107,157,0.07);
    }
    .card-resonate-btn.resonated {
      background: rgba(255,107,157,0.1);
      border-color: rgba(255,107,157,0.38);
      color: #FF6B9D;
    }
    .card-resonate-btn:active { transform: scale(0.92); }

    /* Heart pop animation */
    @keyframes heartPop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.45); }
      70%  { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    .card-resonate-btn.pop .resonate-heart {
      animation: heartPop 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    .resonate-heart { display: inline-block; font-size: 0.8rem; line-height: 1; }
    .resonate-count { font-size: 0.55rem; }

    /* ── Lyric Back button ── */
    .card-lyric-back-btn {
      flex: 1; padding: 8px 6px; border-radius: 9px;
      background: rgba(107,140,255,0.06);
      border: 1px solid rgba(107,140,255,0.18);
      color: rgba(107,140,255,0.75);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.7rem; font-weight: 600;
      cursor: pointer; transition: all 0.18s;
      white-space: nowrap;
    }
    .card-lyric-back-btn:hover {
      background: rgba(107,140,255,0.12);
      border-color: rgba(107,140,255,0.4);
      color: #6B8CFF;
    }
    .card-lyric-back-btn:active { transform: scale(0.96); }

    /* ── Share button ── */
    .card-share-btn {
      padding: 8px 10px; border-radius: 9px;
      background: rgba(232,197,71,0.06);
      border: 1px solid rgba(232,197,71,0.18);
      color: rgba(232,197,71,0.7);
      font-family: 'Space Mono', monospace;
      font-size: 0.52rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
      cursor: pointer; transition: all 0.18s;
      white-space: nowrap; flex-shrink: 0;
    }
    .card-share-btn:hover {
      background: rgba(232,197,71,0.12);
      border-color: rgba(232,197,71,0.4);
      color: #E8C547;
    }
    .card-share-btn:active { transform: scale(0.96); }

    /* ── Updated card actions row ── */
    #feedList .card-actions-v2 {
      margin-top: auto !important;
      padding-top: 8px !important;
      border-top: 1px solid rgba(232,197,71,0.10) !important;
      flex-shrink: 0 !important;
      display: flex !important;
      gap: 5px !important;
      align-items: center !important;
    }

    /* ── View count chip ── */
    .card-view-count {
      font-family: 'Space Mono', monospace;
      font-size: 0.48rem; font-weight: 700;
      color: rgba(255,255,255,0.2); letter-spacing: 0.5px;
      white-space: nowrap; flex-shrink: 0; padding: 0 2px;
    }
  `;
  document.head.appendChild(s);
}

/* ────────────────────────────────────────────────────────────
   RESONATE LOGIC
──────────────────────────────────────────────────────────── */

/** Get resonates count for a post */
function getResonateCount(postId) {
  if (typeof postAnalytics === 'undefined') return 0;
  const an = postAnalytics[postId] || {};
  return Object.keys(an.resonates || {}).length;
}

/** Whether the current user has resonated with a post */
function hasResonated(postId) {
  if (typeof postAnalytics === 'undefined') return false;
  const an = postAnalytics[postId] || {};
  const myId = typeof userId !== 'undefined' ? userId : '';
  return !!(an.resonates && an.resonates[myId]);
}

/** Toggle resonate for the current user */
function toggleResonate(postId) {
  if (!postId) return;
  if (typeof isFirebaseEnabled === 'undefined' || !isFirebaseEnabled) return;
  const myId = typeof userId !== 'undefined' ? userId : 'anon';
  const ref  = analyticsRef.child(postId).child('resonates').child(myId);
  ref.once('value').then(snap => {
    if (snap.exists()) ref.remove();
    else ref.set(true);
  });
}

/* ────────────────────────────────────────────────────────────
   BUILD NEW ACTION ROW
   Called from feed card renderer to produce the new button set.
──────────────────────────────────────────────────────────── */
function buildCardActionsV2(post, postIdx) {
  injectResonateStyles();

  const postId       = post.id;
  const count        = getResonateCount(postId);
  const resonated    = hasResonated(postId);
  const views        = (postAnalytics?.[postId]?.views) || 0;
  const echoCount    = 0; // echoes aren't counted in postAnalytics yet — can add later

  const row = document.createElement('div');
  row.className = 'card-actions-v2';

  /* Resonate button */
  const resonateBtn = document.createElement('button');
  resonateBtn.className = `card-resonate-btn ${resonated ? 'resonated' : ''}`;
  resonateBtn.setAttribute('aria-label', 'Resonate');
  resonateBtn.innerHTML = `
    <span class="resonate-heart">♥</span>
    <span class="resonate-count">${count > 0 ? count : ''}</span>
  `;
  resonateBtn.onclick = (e) => {
    e.stopPropagation();
    toggleResonate(postId);
    // Optimistic animation
    resonateBtn.classList.add('pop');
    setTimeout(() => resonateBtn.classList.remove('pop'), 400);
  };
  row.appendChild(resonateBtn);

  /* Lyric Back button */
  const lyrBackBtn = document.createElement('button');
  lyrBackBtn.className = 'card-lyric-back-btn';
  lyrBackBtn.textContent = 'Lyric Back';
  lyrBackBtn.onclick = (e) => {
    e.stopPropagation();
    if (typeof openEchoSheet === 'function') openEchoSheet(postIdx);
  };
  row.appendChild(lyrBackBtn);

  /* Share button */
  const shareBtn = document.createElement('button');
  shareBtn.className = 'card-share-btn';
  shareBtn.textContent = '↗ Share';
  shareBtn.onclick = (e) => {
    e.stopPropagation();
    if (typeof openShareSheet === 'function') openShareSheet(post);
  };
  row.appendChild(shareBtn);

  return row;
}

/* ────────────────────────────────────────────────────────────
   PATCH renderFeed
   Overrides the card `actions` HTML in feed.js to use the
   new action row instead of the old Open/Guess/Watch buttons.
   We do this by monkey-patching window.viewPost and injecting
   a post-render hook.

   Strategy: after renderFeed() runs, we find every .card-actions
   and replace it with a .card-actions-v2 row. This avoids
   modifying feed.js directly.
──────────────────────────────────────────────────────────── */
(function patchFeedCardActions() {
  const tryPatch = () => {
    if (typeof renderFeed !== 'function') { setTimeout(tryPatch, 100); return; }

    const _origRenderFeed = renderFeed;
    window.renderFeed = function() {
      _origRenderFeed.apply(this, arguments);
      upgradeCardActions();
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  } else {
    setTimeout(tryPatch, 50);
  }
})();

function upgradeCardActions() {
  injectResonateStyles();
  const feedList = document.getElementById('feedList');
  if (!feedList) return;

  // Get rendered cards — each corresponds to posts array order (via renderFeed)
  const cards = feedList.querySelectorAll('.feed-card:not(.skeleton-card)');
  if (typeof posts === 'undefined') return;

  // Rebuild ranked post order to match what renderFeed rendered
  // We use the same getRankedPosts() from feed.js if available
  let rankedPosts = [];
  if (typeof getRankedPosts === 'function') {
    rankedPosts = getRankedPosts();
  } else if (typeof posts !== 'undefined') {
    rankedPosts = posts.filter(p => p.status !== 'hidden');
  }

  cards.forEach((card, i) => {
    const post = rankedPosts[i];
    if (!post) return;

    // Find the global index in posts[] for openEchoSheet
    const globalIdx = (typeof posts !== 'undefined')
      ? posts.findIndex(p => p.id === post.id)
      : i;

    // Replace old .card-actions with new .card-actions-v2
    const oldActions = card.querySelector('.card-actions');
    if (oldActions) {
      const newActions = buildCardActionsV2(post, globalIdx);
      oldActions.replaceWith(newActions);
    }
  });
}

/* ────────────────────────────────────────────────────────────
   PATCH viewPost
   The old viewPost opened the postcard modal. Now it opens
   the share sheet directly (postcard is removed).
──────────────────────────────────────────────────────────── */
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryPatch);
  } else {
    setTimeout(tryPatch, 60);
  }
})();

/* ────────────────────────────────────────────────────────────
   RESONATE COUNT LIVE UPDATE
   When Firebase updates postAnalytics, refresh resonate
   counts on visible cards without full re-render.
──────────────────────────────────────────────────────────── */
function refreshVisibleResonateCounts() {
  const buttons = document.querySelectorAll('.card-resonate-btn[data-post-id]');
  buttons.forEach(btn => {
    const postId   = btn.dataset.postId;
    const count    = getResonateCount(postId);
    const resonated= hasResonated(postId);
    const countEl  = btn.querySelector('.resonate-count');
    if (countEl) countEl.textContent = count > 0 ? count : '';
    btn.classList.toggle('resonated', resonated);
  });
}

// Hook into the existing analytics Firebase listener
// by patching startFirebaseSync's analytics handler
(function hookAnalytics() {
  const tryHook = () => {
    // analyticsRef is set in firebase.js — wait for it
    if (typeof analyticsRef === 'undefined') { setTimeout(tryHook, 200); return; }

    // Add our own listener on top of the existing one
    analyticsRef.on('value', () => {
      // Small delay to let postAnalytics update first
      setTimeout(refreshVisibleResonateCounts, 50);
    });
  };
  setTimeout(tryHook, 500);
})();

/* ────────────────────────────────────────────────────────────
   GLOBAL EXPOSE
──────────────────────────────────────────────────────────── */
window.toggleResonate      = toggleResonate;
window.getResonateCount    = getResonateCount;
window.hasResonated        = hasResonated;
window.buildCardActionsV2  = buildCardActionsV2;
window.upgradeCardActions  = upgradeCardActions;
