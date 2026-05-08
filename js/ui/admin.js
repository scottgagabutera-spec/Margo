/* ============================================================
   MARGO — js/admin.js
   Admin moderation dashboard + Pages CMS + Featured Lyric
   ACCESS: B + G keys (within 300ms) → Firebase login
   SECURITY: UID verified against /adminConfig/allowedUid
   v5.0 — Performance rewrite:
          • Admin uses own paginated Firebase query (50 at a time)
          • Moderation actions patch single card — no full re-render
          • Echoes are lazy — expand on tap, not all at once
          • No renderFeed() calls from admin — feed updates naturally
          • Full brand compliance: Lora only, CSS variables only
   ============================================================ */

const _adminKeysHeld = new Set();
let _adminKeyTimer   = null;

/* ── Admin Firebase state (separate from public feed) ── */
let _adminPosts    = [];
let _adminLastKey       = null;
let _adminLastTimestamp = 0;
let _adminExhausted = false;
const ADMIN_PAGE_SIZE = 50;

function initAdmin() {
  document.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (key === 'b' || key === 'g') {
      _adminKeysHeld.add(key);
      clearTimeout(_adminKeyTimer);
      _adminKeyTimer = setTimeout(() => _adminKeysHeld.clear(), 300);
      if (_adminKeysHeld.has('b') && _adminKeysHeld.has('g')) {
        _adminKeysHeld.clear();
        clearTimeout(_adminKeyTimer);
        adminMode ? openAdminPanel() : showAdminLogin();
      }
    }
  });
  document.addEventListener('keyup', e => _adminKeysHeld.delete(e.key.toLowerCase()));

  /* ── Mobile admin trigger: hold "See What's Live" button for 10s ── */
  (function() {
    const HOLD_MS = 10000;
    let holdTimer = null;

    function attach() {
      const btn = document.getElementById('enterBtn');
      if (!btn) return;

      btn.addEventListener('touchstart', function() {
        holdTimer = setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
          adminMode ? openAdminPanel() : showAdminLogin();
        }, HOLD_MS);
      }, { passive: true });

      btn.addEventListener('touchend',    function() { clearTimeout(holdTimer); }, { passive: true });
      btn.addEventListener('touchmove',   function() { clearTimeout(holdTimer); }, { passive: true });
      btn.addEventListener('touchcancel', function() { clearTimeout(holdTimer); }, { passive: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attach);
    } else {
      attach();
    }
  })();
  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged(user => {
      if (!user) {
        adminMode = false;
        adminUser = null;
        const panel = document.getElementById('adminModal');
        if (panel) panel.remove();
      }
    });
  }
}

/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */
function showAdminLogin() {
  const existing = document.getElementById('adminLoginModal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'adminLoginModal';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.92);
    display:flex;align-items:center;justify-content:center;
    z-index:9000;backdrop-filter:blur(12px);
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--surface);border:1px solid var(--gold-border);
      border-radius:24px;padding:32px;width:100%;max-width:380px;
      box-shadow:0 24px 60px rgba(0,0,0,0.7);
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <svg viewBox="-4 -4 88 88" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="#E8C547"/>
          <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
                fill="none" stroke="#0B0B0D" stroke-width="5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;
          letter-spacing:3px;color:var(--gold);text-transform:uppercase;">MARGO · Admin</span>
      </div>
      <p style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
        text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;">
        Sign in to access moderation dashboard
      </p>
      <input id="adminEmail" type="email" placeholder="Email"
        style="width:100%;padding:12px 14px;background:var(--bg);
        border:1px solid var(--border);border-radius:12px;
        color:var(--text);font-family:'Lora',serif;font-size:0.95rem;
        margin-bottom:10px;box-sizing:border-box;outline:none;"/>
      <input id="adminPassword" type="password" placeholder="Password"
        style="width:100%;padding:12px 14px;background:var(--bg);
        border:1px solid var(--border);border-radius:12px;
        color:var(--text);font-family:'Lora',serif;font-size:0.95rem;
        margin-bottom:18px;box-sizing:border-box;outline:none;"/>
      <div id="adminLoginError" style="display:none;font-family:'Lora',serif;
        font-size:0.6rem;color:#ff6464;margin-bottom:14px;"></div>
      <div style="display:flex;gap:10px;">
        <button id="adminLoginBtn" style="flex:1;padding:14px;background:var(--gold);
          color:var(--bg);border:none;border-radius:12px;font-family:'Lora',serif;
          font-weight:700;font-size:0.95rem;cursor:pointer;min-height:44px;">
          Sign In
        </button>
        <button id="adminLoginCancel" style="padding:14px 18px;background:transparent;
          color:var(--text-2);border:1px solid var(--border);border-radius:12px;
          font-family:'Lora',serif;font-size:0.95rem;cursor:pointer;min-height:44px;">
          Cancel
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const emailEl  = document.getElementById('adminEmail');
  const passEl   = document.getElementById('adminPassword');
  const errorEl  = document.getElementById('adminLoginError');
  const loginBtn = document.getElementById('adminLoginBtn');
  document.getElementById('adminLoginCancel').onclick = () => overlay.remove();
  [emailEl, passEl].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
  });
  loginBtn.onclick = async () => {
    const email = emailEl.value.trim();
    const pass  = passEl.value;
    if (!email || !pass) { _adminLoginError(errorEl, 'Email and password required'); return; }
    loginBtn.textContent = 'Signing in…';
    loginBtn.disabled    = true;
    errorEl.style.display = 'none';
    try {
      if (!firebaseAuth) throw new Error('Firebase Auth not available');
      const cred       = await firebaseAuth.signInWithEmailAndPassword(email, pass);
      const snap       = await adminConfigRef.child('allowedUid').get();
      const allowedUid = snap.val();
      if (!allowedUid)                   { await firebaseAuth.signOut(); throw new Error('Admin not configured'); }
      if (cred.user.uid !== allowedUid)  { await firebaseAuth.signOut(); throw new Error('Access denied'); }
      adminMode = true;
      adminUser = cred.user;
      overlay.remove();
      openAdminPanel();
    } catch (err) {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled    = false;
      const msg = (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found')
        ? 'Invalid credentials' : err.message;
      _adminLoginError(errorEl, msg);
    }
  };
}

function _adminLoginError(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}

/* ══════════════════════════════════════
   PANEL SHELL
══════════════════════════════════════ */
let _adminActiveTab = 'posts';


function _populateAdminStats() {
  const totalPosts = posts.filter(p => p.status !== 'hidden').length;
  const totalViews = Object.values(postAnalytics).reduce((sum, a) => sum + (a.views || 0), 0);
  const totalResonates = Object.values(postAnalytics).reduce((sum, a) => {
    return sum + Object.keys(a.resonates || {}).length;
  }, 0);
  const emotionCounts = {};
  posts.forEach(p => { if (p.emotion) emotionCounts[p.emotion] = (emotionCounts[p.emotion] || 0) + 1; });
  const topEmotion = Object.entries(emotionCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  const topPost = posts.filter(p => p.status !== 'hidden')
    .sort((a,b) => (postAnalytics[b.id]?.views||0) - (postAnalytics[a.id]?.views||0))[0];
  const el = (id) => document.getElementById(id);
  if (el('statTotalPosts'))     el('statTotalPosts').textContent     = totalPosts;
  if (el('statTotalViews'))     el('statTotalViews').textContent     = totalViews;
  if (el('statTotalResonates')) el('statTotalResonates').textContent = totalResonates;
  if (el('statTopEmotion'))     el('statTopEmotion').textContent     = topEmotion;
  if (el('statTopLyric'))       el('statTopLyric').textContent       = topPost ? topPost.text.slice(0,40) + '...' : '—';
}

function openAdminPanel() {
  const existing = document.getElementById('adminModal');
  if (existing) existing.remove();
  _adminPosts     = [];
  _adminLastKey   = null;
  _adminExhausted = false;

  const modal = document.createElement('div');
  modal.id = 'adminModal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.95);
    z-index:8000;display:flex;flex-direction:column;
    backdrop-filter:blur(16px);overflow:hidden;
  `;
  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid var(--gold-glow);
      background:var(--surface);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <svg viewBox="-4 -4 88 88" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="#E8C547"/>
          <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
                fill="none" stroke="#0B0B0D" stroke-width="5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;
          letter-spacing:3px;color:var(--gold);text-transform:uppercase;">Admin</span>
        <span id="adminPostBadge" style="font-family:'Lora',serif;font-size:0.6rem;
          color:var(--text-3);"></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);">
          ${adminUser?.email || ''}</span>
        <button id="adminSignOutBtn" style="padding:8px 16px;background:transparent;
          color:var(--text-2);border:1px solid var(--border);border-radius:8px;
          font-family:'Lora',serif;font-size:0.6rem;cursor:pointer;min-height:44px;">
          Sign out</button>
        <button id="adminCloseBtn" style="width:36px;height:36px;background:var(--surface-2);
          border:1px solid var(--border);border-radius:50%;color:var(--text-2);
          font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">
          ×</button>
      </div>
    </div>

    <div style="display:flex;border-bottom:1px solid var(--border);
      background:var(--surface);flex-shrink:0;">
      <button id="tabPosts"    style="${_adminTabStyle(true)}"  data-tab="posts">Posts</button>
      <button id="tabPages"    style="${_adminTabStyle(false)}" data-tab="pages">Pages</button>
      <button id="tabFeatured" style="${_adminTabStyle(false)}" data-tab="featured">Featured</button>
      <button id="tabMusic" style="${_adminTabStyle(false)}" data-tab="music">Music</button>
    </div>

    
    <div id='adminStatsBar' style='display:flex;gap:16px;padding:14px 20px;
      border-bottom:1px solid var(--border);background:var(--surface);
      flex-shrink:0;flex-wrap:wrap;'>
      <div style='font-family:Lora,serif;font-size:0.6rem;color:var(--text-3);
        text-transform:uppercase;letter-spacing:1px;display:flex;flex-direction:column;gap:4px;'>
        <span style='font-size:1.1rem;font-weight:700;color:var(--gold);' id='statTotalPosts'>—</span>
        <span>Posts Live</span>
      </div>
      <div style='font-family:Lora,serif;font-size:0.6rem;color:var(--text-3);
        text-transform:uppercase;letter-spacing:1px;display:flex;flex-direction:column;gap:4px;'>
        <span style='font-size:1.1rem;font-weight:700;color:var(--gold);' id='statTotalViews'>—</span>
        <span>Total Views</span>
      </div>
      <div style='font-family:Lora,serif;font-size:0.6rem;color:var(--text-3);
        text-transform:uppercase;letter-spacing:1px;display:flex;flex-direction:column;gap:4px;'>
        <span style='font-size:1.1rem;font-weight:700;color:var(--gold);' id='statTotalResonates'>—</span>
        <span>Resonates</span>
      </div>
      <div style='font-family:Lora,serif;font-size:0.6rem;color:var(--text-3);
        text-transform:uppercase;letter-spacing:1px;display:flex;flex-direction:column;gap:4px;'>
        <span style='font-size:1.1rem;font-weight:700;color:var(--gold);' id='statTopEmotion'>—</span>
        <span>Top Emotion</span>
      </div>
      <div style='font-family:Lora,serif;font-size:0.6rem;color:var(--text-3);
        text-transform:uppercase;letter-spacing:1px;display:flex;flex-direction:column;gap:4px;margin-left:auto;'>
        <span style='font-size:0.75rem;font-weight:700;color:var(--text-2);' id='statTopLyric'>—</span>
        <span>Most Viewed Lyric</span>
      </div>
    </div>
    <div id="adminPanelPosts" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;gap:8px;padding:14px 20px;border-bottom:1px solid var(--border);
        flex-shrink:0;flex-wrap:wrap;align-items:center;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="af-btn active" data-filter="all"     style="${_adminFilterStyle(true)}">All</button>
          <button class="af-btn"        data-filter="active"  style="${_adminFilterStyle(false)}">Active</button>
          <button class="af-btn"        data-filter="flagged" style="${_adminFilterStyle(false)}">Flagged</button>
          <button class="af-btn"        data-filter="hidden"  style="${_adminFilterStyle(false)}">Hidden</button>
        </div>
        <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap;">
          <button class="as-btn active" data-sort="newest"      style="${_adminFilterStyle(true)}">Newest</button>
          <button class="as-btn"        data-sort="mostFlagged" style="${_adminFilterStyle(false)}">Most Flagged</button>
        </div>
      </div>
      <div style="padding:12px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <input id="adminSearchInput" type="text" placeholder="Search posts…"
          style="width:100%;padding:10px 14px;background:var(--surface-2);
          border:1px solid var(--border);border-radius:12px;
          color:var(--text);font-family:'Lora',serif;font-size:0.82rem;
          box-sizing:border-box;outline:none;"/>
      </div>
      <div id="adminPostList" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
    </div>

    <div id="adminPanelPages" style="flex:1;display:none;flex-direction:column;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <p style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
          text-transform:uppercase;letter-spacing:1px;margin:0;">
          Edit page content — changes go live instantly
        </p>
      </div>
      <div style="display:flex;gap:6px;padding:12px 20px;border-bottom:1px solid var(--border);
        flex-shrink:0;flex-wrap:wrap;">
        <button class="page-tab-btn active" data-page="about"   style="${_adminFilterStyle(true)}">About</button>
        <button class="page-tab-btn"        data-page="privacy" style="${_adminFilterStyle(false)}">Privacy</button>
        <button class="page-tab-btn"        data-page="terms"   style="${_adminFilterStyle(false)}">Terms</button>
        <button class="page-tab-btn"        data-page="contact" style="${_adminFilterStyle(false)}">Contact</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:20px;">
        <div style="max-width:700px;margin:0 auto;">
          <div id="pageDateRow" style="margin-bottom:14px;display:none;">
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
              text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">
              Effective Date</label>
            <input id="pageEffectiveDate" type="text" placeholder="e.g. January 2025"
              style="width:100%;padding:10px 14px;background:var(--surface-2);
              border:1px solid var(--border);border-radius:12px;
              color:var(--text);font-family:'Lora',serif;font-size:0.82rem;
              box-sizing:border-box;outline:none;"/>
          </div>
          <label style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
            text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px;">
            Page Content (HTML supported)</label>
          <textarea id="pageContentEditor"
            style="width:100%;min-height:340px;padding:14px;background:var(--surface-2);
            border:1px solid var(--gold-border);border-radius:12px;
            color:var(--text);font-family:'Lora',serif;font-size:0.82rem;
            line-height:1.6;box-sizing:border-box;outline:none;resize:vertical;"
            placeholder="Write page content here. HTML supported."></textarea>
          <div style="margin-top:10px;margin-bottom:16px;">
            <button id="previewToggleBtn" style="padding:8px 16px;background:transparent;
              border:1px solid var(--border);border-radius:8px;color:var(--text-3);
              font-family:'Lora',serif;font-size:0.6rem;text-transform:uppercase;
              letter-spacing:0.8px;cursor:pointer;">Preview ↓</button>
          </div>
          <div id="pagePreviewBox" style="display:none;background:var(--surface-2);
            border:1px solid var(--gold-glow);border-radius:12px;padding:24px;
            margin-bottom:20px;font-family:'Lora',serif;font-size:0.95rem;
            line-height:1.75;color:var(--text-2);"></div>
          <div style="display:flex;gap:10px;align-items:center;">
            <button id="savePageBtn" style="padding:14px 28px;background:var(--gold);
              color:var(--bg);border:none;border-radius:12px;font-family:'Lora',serif;
              font-weight:700;font-size:0.95rem;cursor:pointer;min-height:44px;">
              Save &amp; Publish</button>
            <span id="pageSaveStatus" style="font-family:'Lora',serif;font-size:0.6rem;
              text-transform:uppercase;letter-spacing:1px;color:var(--success);display:none;">
              ✓ Saved</span>
          </div>
        </div>
      </div>
    </div>

    <div id="adminPanelFeatured" style="flex:1;display:none;flex-direction:column;overflow:hidden;">
      <div style="padding:20px;flex:1;overflow-y:auto;">
        <p style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
          text-transform:uppercase;letter-spacing:1px;margin:0 0 24px;">
          Featured lyric shown on landing page hero — update anytime
        </p>
        <div style="display:flex;flex-direction:column;gap:12px;max-width:480px;">
          <div>
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
              text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">
              Lyric Text</label>
            <input id="featuredLyricText" type="text" placeholder="Enter lyric here"
              style="width:100%;padding:12px 14px;background:var(--surface-2);
              border:1px solid var(--border);border-radius:12px;color:var(--text);
              font-family:'Lora',serif;font-size:0.95rem;font-style:italic;
              box-sizing:border-box;outline:none;"/>
          </div>
          <div>
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
              text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">
              Artist</label>
            <input id="featuredLyricArtist" type="text" placeholder="Artist name"
              style="width:100%;padding:12px 14px;background:var(--surface-2);
              border:1px solid var(--border);border-radius:12px;color:var(--text);
              font-family:'Lora',serif;font-size:0.95rem;box-sizing:border-box;outline:none;"/>
          </div>
          <div>
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
              text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">
              Song Title</label>
            <input id="featuredLyricSong" type="text" placeholder="Song title"
              style="width:100%;padding:12px 14px;background:var(--surface-2);
              border:1px solid var(--border);border-radius:12px;color:var(--text);
              font-family:'Lora',serif;font-size:0.95rem;box-sizing:border-box;outline:none;"/>
          </div>
          <button id="featuredLyricSave" style="padding:14px 20px;background:var(--gold);
            color:var(--bg);border:none;border-radius:12px;font-family:'Lora',serif;
            font-size:0.95rem;font-weight:700;cursor:pointer;min-height:44px;">
            Save Featured Lyric</button>
          <div id="featuredLyricStatus" style="font-family:'Lora',serif;font-size:0.6rem;
            color:var(--text-3);min-height:20px;"></div>
        </div>
      </div>
    </div>
  <div id="adminPanelMusic" style="flex:1;display:none;flex-direction:column;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;justify-content:space-between;align-items:center;">
        <p style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin:0;">Manage songs — add, edit, reorder. Live instantly on /music</p>
        <button id="addSongBtn" style="padding:10px 18px;background:var(--gold);color:var(--bg);border:none;border-radius:10px;font-family:'Lora',serif;font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;cursor:pointer;min-height:44px;">+ Add Song</button>
      </div>
      <div id="adminSongList" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('adminCloseBtn').onclick = () => modal.remove();
  document.getElementById('adminSignOutBtn').onclick = async () => {
    await firebaseAuth?.signOut();
    adminMode = false; adminUser = null;
    modal.remove(); showToast('Signed out');
  };

  modal.querySelectorAll('[data-tab]').forEach(btn => {
    btn.onclick = () => {
      _adminActiveTab = btn.dataset.tab;
      modal.querySelectorAll('[data-tab]').forEach(b => b.style.cssText = _adminTabStyle(false));
      btn.style.cssText = _adminTabStyle(true);
      document.getElementById('adminPanelPosts').style.display    = _adminActiveTab === 'posts'    ? 'flex' : 'none';
      document.getElementById('adminPanelPages').style.display    = _adminActiveTab === 'pages'    ? 'flex' : 'none';
      document.getElementById('adminPanelFeatured').style.display = _adminActiveTab === 'featured' ? 'flex' : 'none';
      document.getElementById('adminPanelMusic').style.display    = _adminActiveTab === 'music'    ? 'flex' : 'none';
      if (_adminActiveTab === 'music')    loadAdminSongs();
      if (_adminActiveTab === 'featured') loadFeaturedLyricAdmin();
      if (_adminActiveTab === 'music')    loadAdminSongs();
    };
  });

  document.getElementById('adminSearchInput').oninput = e => {
    adminSearch = e.target.value.trim().toLowerCase();
    _renderAdminList();
  };
  modal.querySelectorAll('.af-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.af-btn').forEach(b => { b.style.cssText = _adminFilterStyle(false); b.classList.remove('active'); });
      btn.style.cssText = _adminFilterStyle(true); btn.classList.add('active');
      adminFilter = btn.dataset.filter;
      _renderAdminList();
    };
  });
  modal.querySelectorAll('.as-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.as-btn').forEach(b => { b.style.cssText = _adminFilterStyle(false); b.classList.remove('active'); });
      btn.style.cssText = _adminFilterStyle(true); btn.classList.add('active');
      adminSort = btn.dataset.sort;
      _renderAdminList();
    };
  });

  let currentPage = 'about';
  initPageEditor(currentPage);
  modal.querySelectorAll('.page-tab-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.page-tab-btn').forEach(b => { b.style.cssText = _adminFilterStyle(false); b.classList.remove('active'); });
      btn.style.cssText = _adminFilterStyle(true); btn.classList.add('active');
      currentPage = btn.dataset.page;
      initPageEditor(currentPage);
    };
  });
  document.getElementById('previewToggleBtn').onclick = () => {
    const box    = document.getElementById('pagePreviewBox');
    const editor = document.getElementById('pageContentEditor');
    const btn    = document.getElementById('previewToggleBtn');
    if (box.style.display === 'none') {
      box.innerHTML = editor.value;
      box.style.display = 'block';
      btn.textContent = 'Hide Preview ↑';
    } else {
      box.style.display = 'none';
      btn.textContent = 'Preview ↓';
    }
  };
  document.getElementById('savePageBtn').onclick = () => savePageContent(currentPage);
  document.getElementById('featuredLyricSave').onclick = saveFeaturedLyric;

  _loadAdminPosts();
  _populateAdminStats();
}

/* ══════════════════════════════════════
   PAGINATED POST LOADING
══════════════════════════════════════ */
function _loadAdminPosts() {
  const container = document.getElementById('adminPostList');
  if (!container || !isFirebaseEnabled) return;
  _adminPosts = [];
  _adminExhausted = true;
  container.innerHTML = '<div style="text-align:center;padding:48px 20px;font-family:Lora,serif;font-size:0.6rem;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;">Loading...</div>';
  postsRef.orderByChild('timestamp').limitToLast(200).on('value', snap => {
    _adminPosts = [];
    snap.forEach(child => {
      const p = child.val();
      p.id = child.key;
      _adminPosts.unshift(p);
    });
    _adminPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    _renderAdminList();
  });
}

function _getFilteredAdminPosts() {
  let list = [..._adminPosts];
  if (adminFilter !== 'all') list = list.filter(p => (p.status || 'active') === adminFilter);
  if (adminSearch) {
    list = list.filter(p =>
      (p.text || '').toLowerCase().includes(adminSearch)
      || (p.knowledge?.song   || '').toLowerCase().includes(adminSearch)
      || (p.knowledge?.artist || '').toLowerCase().includes(adminSearch)
      || (p.emotion || '').toLowerCase().includes(adminSearch)
    );
  }
  if (adminSort === 'mostFlagged') list.sort((a, b) => (b.flagCount || 0) - (a.flagCount || 0));
  return list;
}

function _renderAdminList() {
  const container = document.getElementById('adminPostList');
  const badge     = document.getElementById('adminPostBadge');
  if (!container) return;
  const list = _getFilteredAdminPosts();
  if (badge) badge.textContent = _adminPosts.length + ' loaded';
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;
      font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
      text-transform:uppercase;letter-spacing:1px;">No posts found</div>`;
  } else {
    list.forEach(post => _appendAdminCard(container, post));
  }
  if (!_adminExhausted) {
    const btn = document.createElement('button');
    btn.textContent = 'Load more posts';
    btn.style.cssText = `display:block;width:100%;padding:14px;margin-top:8px;
      background:var(--surface-2);border:1px solid var(--border);border-radius:12px;
      color:var(--text-2);font-family:'Lora',serif;font-size:0.82rem;
      cursor:pointer;min-height:44px;`;
    btn.onclick = () => _loadAdminPosts(true);
    container.appendChild(btn);
  }
}

function _appendAdminCard(container, post) {
  const an     = postAnalytics[post.id] || {};
  const views  = an.views || 0;
  const status = post.status || 'active';
  const flags  = post.flagCount || 0;
  const k      = post.knowledge || { song: 'Unknown', artist: 'Unknown' };
  const statusColor = status === 'hidden'  ? 'var(--text-3)'
                    : status === 'flagged' ? 'var(--gold)'
                    : 'var(--success)';
  const card = document.createElement('div');
  card.id = 'acard-' + post.id;
  card.style.cssText = `
    background:var(--surface-2);border:1px solid var(--border);
    border-radius:14px;padding:16px;margin-bottom:10px;
    ${status === 'hidden'  ? 'opacity:0.55;' : ''}
    ${status === 'flagged' ? 'border-color:var(--gold-border);' : ''}
  `;
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;
      gap:12px;margin-bottom:10px;">
      <div style="font-family:'Lora',serif;font-style:italic;font-size:0.95rem;
        color:var(--text);line-height:1.5;flex:1;">${post.text || ''}</div>
      <span style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
        padding:4px 10px;border-radius:20px;text-transform:uppercase;flex-shrink:0;
        color:${statusColor};border:1px solid ${statusColor};opacity:0.85;">
        ${status}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
      <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);">
        ${k.song} — ${k.artist}</span>
      <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);">
        ${post.emotion || ''}</span>
      <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);">
        ${timeAgo(post.timestamp)}</span>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px;">
      <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);">
        👁 ${views}</span>
      <span style="font-family:'Lora',serif;font-size:0.6rem;
        color:${flags > 0 ? 'var(--gold)' : 'var(--text-3)'};">
        🚩 ${flags}</span>
    </div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px;">
      ${status !== 'hidden'
        ? '<button onclick="adminHidePost(\'' + post.id + '\')" style="' + _adminActionStyle('var(--text-3)') + '">Hide</button>'
        : '<button onclick="adminUnhidePost(\'' + post.id + '\')" style="' + _adminActionStyle('var(--success)') + '">Unhide</button>'}
      ${flags > 0
        ? '<button onclick="adminClearFlags(\'' + post.id + '\')" style="' + _adminActionStyle('var(--gold)') + '">Clear Flags</button>'
        : ''}
      <button onclick="adminDeletePost('${post.id}')" style="${_adminActionStyle('#ff6464')}">Delete</button>
    </div>
    <div>
      <button onclick="_toggleEchoes('${post.id}', this)"
        style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
        background:none;border:none;cursor:pointer;padding:4px 0;text-decoration:underline;">
        Show echoes ▾</button>
      <div id="echoes-${post.id}" style="display:none;margin-top:8px;"></div>
    </div>
  `;
  container.appendChild(card);
}

/* ══════════════════════════════════════
   LAZY ECHOES
══════════════════════════════════════ */
function _toggleEchoes(postId, btn) {
  const wrap = document.getElementById('echoes-' + postId);
  if (!wrap) return;
  const isOpen = wrap.style.display !== 'none';
  if (isOpen) { wrap.style.display = 'none'; btn.textContent = 'Show echoes ▾'; return; }
  wrap.style.display = 'block';
  btn.textContent = 'Hide echoes ▴';
  if (wrap.dataset.loaded) return;
  wrap.dataset.loaded = '1';
  wrap.innerHTML = `<div style="font-family:'Lora',serif;font-size:0.6rem;
    color:var(--text-3);padding:8px 0;">Loading echoes…</div>`;
  const memPost = _adminPosts.find(p => p.id === postId);
  if (memPost?.echoes) { _renderEchoesInWrap(postId, wrap, memPost.echoes); return; }
  if (!isFirebaseEnabled) return;
  postsRef.child(postId).child('echoes').once('value').then(snap => {
    const data = snap.val();
    if (data) _renderEchoesInWrap(postId, wrap, data);
    else wrap.innerHTML = `<div style="font-family:'Lora',serif;font-size:0.6rem;
      color:var(--text-3);padding:8px 0;">No echoes yet</div>`;
  }).catch(() => { wrap.innerHTML = ''; });
}

function _renderEchoesInWrap(postId, wrap, echoesData) {
  const echoList = Object.entries(echoesData)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  wrap.innerHTML = `<div style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
    text-transform:uppercase;letter-spacing:1px;color:var(--text-3);
    margin-bottom:8px;padding-top:12px;border-top:1px solid var(--border);">
    ${echoList.length} Echo${echoList.length !== 1 ? 's' : ''}</div>`;
  echoList.forEach(echo => {
    const echoStatus = echo.status || 'active';
    const echoCard   = document.createElement('div');
    echoCard.id      = 'echo-card-' + postId + '-' + echo.id;
    echoCard.style.cssText = `
      background:var(--surface);border:1px solid var(--border);
      border-radius:10px;padding:12px 14px;margin-bottom:8px;
      ${echoStatus === 'hidden' ? 'opacity:0.45;' : ''}
    `;
    echoCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;
        align-items:flex-start;gap:10px;margin-bottom:8px;">
        <div style="flex:1;">
          <div style="font-family:'Lora',serif;font-style:italic;font-size:0.82rem;
            color:${echoStatus === 'hidden' ? 'var(--text-3)' : 'var(--text)'};
            line-height:1.45;">"${echo.lyric || ''}"</div>
          ${echo.song ? '<span style="font-family:\'Lora\',serif;font-size:0.6rem;color:var(--text-3);display:block;margin-top:4px;">' + echo.song + (echo.artist ? ' — ' + echo.artist : '') + '</span>' : ''}
          ${echo.username ? '<span style="font-family:\'Lora\',serif;font-size:0.6rem;color:var(--text-3);display:block;margin-top:2px;">@' + echo.username + '</span>' : ''}
          <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
            display:block;margin-top:4px;">${timeAgo(echo.timestamp)}</span>
        </div>
        <span style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
          padding:3px 8px;border-radius:20px;text-transform:uppercase;flex-shrink:0;
          color:${echoStatus === 'hidden' ? 'var(--text-3)' : 'var(--success)'};
          border:1px solid ${echoStatus === 'hidden' ? 'var(--border)' : 'var(--success)'};">
          ${echoStatus}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${echoStatus !== 'hidden'
          ? '<button onclick="adminHideEcho(\'' + postId + '\',\'' + echo.id + '\')" style="' + _adminActionStyle('var(--text-3)') + '">Hide</button>'
          : '<button onclick="adminUnhideEcho(\'' + postId + '\',\'' + echo.id + '\')" style="' + _adminActionStyle('var(--success)') + '">Unhide</button>'}
        <button onclick="adminDeleteEcho('${postId}','${echo.id}')" style="${_adminActionStyle('#ff6464')}">Delete</button>
      </div>
    `;
    wrap.appendChild(echoCard);
  });
}

/* ══════════════════════════════════════
   MODERATION — patch single card, no full re-render
══════════════════════════════════════ */
async function adminHidePost(postId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).update({ status: 'hidden' });
    _patchAdminPost(postId, { status: 'hidden' });
    showToast('Post hidden');
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminUnhidePost(postId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).update({ status: 'active' });
    _patchAdminPost(postId, { status: 'active' });
    showToast('Post restored');
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminDeletePost(postId) {
  if (!window.confirm('Permanently delete this post? This cannot be undone.')) return;
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).remove();
    await analyticsRef.child(postId).remove();
    _adminPosts = _adminPosts.filter(p => p.id !== postId);
    const card = document.getElementById('acard-' + postId);
    if (card) card.remove();
    showToast('Post deleted');
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminClearFlags(postId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).update({ flagCount: 0, status: 'active' });
    _patchAdminPost(postId, { flagCount: 0, status: 'active' });
    showToast('Flags cleared');
  } catch (e) { showToast('Error: ' + e.message); }
}

function _patchAdminPost(postId, changes) {
  const idx = _adminPosts.findIndex(p => p.id === postId);
  if (idx !== -1) _adminPosts[idx] = { ..._adminPosts[idx], ...changes };
  const oldCard = document.getElementById('acard-' + postId);
  if (!oldCard || idx === -1) return;
  const parent  = oldCard.parentNode;
  const anchor  = oldCard.nextSibling;
  oldCard.remove();
  const tmp = { appendChild: el => parent.insertBefore(el, anchor) };
  _appendAdminCard(tmp, _adminPosts[idx]);
}

async function adminHideEcho(postId, echoId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).child('echoes').child(echoId).update({ status: 'hidden' });
    _refreshEchoWrap(postId);
    showToast('Echo hidden');
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminUnhideEcho(postId, echoId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).child('echoes').child(echoId).update({ status: 'active' });
    _refreshEchoWrap(postId);
    showToast('Echo restored');
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminDeleteEcho(postId, echoId) {
  if (!window.confirm('Permanently delete this echo?')) return;
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).child('echoes').child(echoId).remove();
    const echoCard = document.getElementById('echo-card-' + postId + '-' + echoId);
    if (echoCard) echoCard.remove();
    showToast('Echo deleted');
  } catch (e) { showToast('Error: ' + e.message); }
}

function _refreshEchoWrap(postId) {
  const wrap = document.getElementById('echoes-' + postId);
  if (!wrap || !wrap.dataset.loaded) return;
  wrap.dataset.loaded = '';
  wrap.innerHTML = '';
  postsRef.child(postId).child('echoes').once('value').then(snap => {
    const data = snap.val();
    if (data) _renderEchoesInWrap(postId, wrap, data);
  }).catch(() => {});
}

/* ══════════════════════════════════════
   PAGES CMS
══════════════════════════════════════ */
function initPageEditor(page) {
  const editor    = document.getElementById('pageContentEditor');
  const dateRow   = document.getElementById('pageDateRow');
  const dateInput = document.getElementById('pageEffectiveDate');
  const preview   = document.getElementById('pagePreviewBox');
  const status    = document.getElementById('pageSaveStatus');
  if (!editor) return;
  dateRow.style.display = (page === 'privacy' || page === 'terms') ? 'block' : 'none';
  preview.style.display = 'none';
  document.getElementById('previewToggleBtn').textContent = 'Preview ↓';
  if (status) status.style.display = 'none';
  editor.value    = '';
  dateInput.value = '';
  editor.placeholder = 'Loading…';
  if (!isFirebaseEnabled) { editor.placeholder = 'Firebase not connected'; return; }
  firebase.database().ref('pages/' + page).once('value').then(snap => {
    const data = snap.val();
    if (data) {
      editor.value = typeof data === 'string' ? data : (data.content || '');
      if (data.date) dateInput.value = data.date;
    }
    editor.placeholder = 'Write page content here. HTML supported.';
  }).catch(() => { editor.placeholder = 'Could not load content.'; });
}

async function savePageContent(page) {
  const editor    = document.getElementById('pageContentEditor');
  const dateInput = document.getElementById('pageEffectiveDate');
  const saveBtn   = document.getElementById('savePageBtn');
  const status    = document.getElementById('pageSaveStatus');
  if (!editor || !isFirebaseEnabled) return;
  const content = editor.value.trim();
  if (!content) { showToast('Content is empty'); return; }
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled    = true;
  if (status) status.style.display = 'none';
  const payload = (page === 'privacy' || page === 'terms')
    ? { content, date: dateInput.value.trim() || 'January 2025' }
    : content;
  try {
    await firebase.database().ref('pages/' + page).set(payload);
    saveBtn.textContent = 'Save & Publish';
    saveBtn.disabled    = false;
    if (status) { status.style.display = 'inline'; setTimeout(() => { status.style.display = 'none'; }, 3000); }
    showToast(page.charAt(0).toUpperCase() + page.slice(1) + ' page updated ✓');
  } catch(err) {
    saveBtn.textContent = 'Save & Publish';
    saveBtn.disabled    = false;
    showToast('Error saving: ' + err.message);
  }
}

/* ══════════════════════════════════════
   FEATURED LYRIC
══════════════════════════════════════ */
function loadFeaturedLyricAdmin() {
  firebase.database().ref('adminConfig/featuredLyric').once('value').then(snap => {
    const data = snap.val();
    if (!data) return;
    const t = document.getElementById('featuredLyricText');
    const a = document.getElementById('featuredLyricArtist');
    const s = document.getElementById('featuredLyricSong');
    if (t && data.text)   t.value = data.text;
    if (a && data.artist) a.value = data.artist;
    if (s && data.song)   s.value = data.song;
  }).catch(() => {});
}

function saveFeaturedLyric() {
  const text   = document.getElementById('featuredLyricText')?.value.trim();
  const artist = document.getElementById('featuredLyricArtist')?.value.trim();
  const song   = document.getElementById('featuredLyricSong')?.value.trim();
  const status = document.getElementById('featuredLyricStatus');
  if (!text) { if (status) status.textContent = 'Lyric text is required.'; return; }
  firebase.database().ref('adminConfig/featuredLyric')
    .set({ text, artist: artist || '', song: song || '', updatedAt: Date.now() })
    .then(() => {
      if (status) { status.style.color = 'var(--success)'; status.textContent = '✓ Saved — live on landing page'; }
      const textEl = document.getElementById('heroFeaturedText');
      const attrEl = document.getElementById('heroFeaturedAttr');
      if (textEl) textEl.textContent = text;
      if (attrEl) attrEl.textContent = (artist || '') + (song ? ' · ' + song : '');
    })
    .catch(e => { if (status) { status.style.color = '#ff6464'; status.textContent = 'Error: ' + e.message; } });
}

/* ══════════════════════════════════════
   STYLE HELPERS — brand compliant
══════════════════════════════════════ */
function _adminTabStyle(active) {
  return 'padding:12px 24px;border:none;background:transparent;cursor:pointer;' +
    'font-family:\'Lora\',serif;font-size:0.6rem;font-weight:700;' +
    'text-transform:uppercase;letter-spacing:1.2px;transition:all 0.18s;min-height:44px;' +
    'border-bottom:2px solid ' + (active ? 'var(--gold)' : 'transparent') + ';' +
    'color:' + (active ? 'var(--gold)' : 'var(--text-3)') + ';';
}
function _adminFilterStyle(active) {
  return 'padding:8px 14px;border-radius:50px;cursor:pointer;' +
    'font-family:\'Lora\',serif;font-size:0.6rem;font-weight:700;' +
    'text-transform:uppercase;letter-spacing:0.8px;transition:all 0.18s;min-height:44px;' +
    (active
      ? 'background:var(--gold-faint);border:1px solid var(--gold-border);color:var(--gold);'
      : 'background:transparent;border:1px solid var(--border);color:var(--text-3);');
}
function _adminActionStyle(color) {
  return 'padding:8px 16px;border-radius:8px;cursor:pointer;' +
    'font-family:\'Lora\',serif;font-size:0.6rem;font-weight:700;' +
    'text-transform:uppercase;letter-spacing:0.8px;min-height:44px;' +
    'background:transparent;border:1px solid ' + color + ';color:' + color + ';transition:all 0.18s;';
}

/* ── Music tab state ── */
let _adminSongs = [];

/* ── Load all songs from Firebase /songs ── */
function loadAdminSongs() {
  const container = document.getElementById('adminSongList');
  if (!container || !isFirebaseEnabled) return;
  container.innerHTML = `<div style="text-align:center;padding:32px;font-family:'Lora',serif;
    font-size:0.6rem;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;">
    Loading…</div>`;

  firebase.database().ref('songs').orderByChild('order').on('value', snap => {
    _adminSongs = [];
    snap.forEach(child => {
      const s = child.val();
      s.id = child.key;
      _adminSongs.push(s);
    });
    _renderAdminSongs();
  });

  document.getElementById('addSongBtn').onclick = () => openSongForm(null);
}

/* ── Render song list in admin ── */
function _renderAdminSongs() {
  const container = document.getElementById('adminSongList');
  if (!container) return;

  if (!_adminSongs.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:64px 20px;">
        <div style="font-family:'Lora',serif;font-style:italic;font-size:1.1rem;
          color:var(--text-2);margin-bottom:12px;">No songs yet</div>
        <div style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
          text-transform:uppercase;letter-spacing:1px;">
          Hit "+ Add Song" to publish your first track</div>
      </div>`;
    return;
  }

  container.innerHTML = '';
  _adminSongs.forEach(song => {
    const card = document.createElement('div');
    card.id = 'asong-' + song.id;
    card.style.cssText = `
      background:var(--surface-2);border:1px solid var(--border);
      border-radius:14px;padding:16px;margin-bottom:10px;
      ${song.status === 'coming_soon' ? 'opacity:0.65;' : ''}
    `;

    const statusColor = song.status === 'coming_soon' ? 'var(--text-3)' : 'var(--success)';
    const statusLabel = song.status === 'coming_soon' ? 'Coming Soon' : 'Live';

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div>
          <div style="font-family:'Lora',serif;font-size:1rem;font-weight:600;
            color:var(--text);margin-bottom:4px;">${_esc(song.title)}</div>
          <div style="font-family:'Lora',serif;font-size:0.82rem;color:var(--text-2);">
            ${_esc(song.artist || 'Margo')}</div>
        </div>
        <span style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
          padding:4px 10px;border-radius:20px;text-transform:uppercase;flex-shrink:0;
          color:${statusColor};border:1px solid ${statusColor};">
          ${statusLabel}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);">
          YT: ${song.youtubeId ? '✓ ' + _esc(song.youtubeId) : '— not set'}</span>
        <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);">
          Lyrics: ${song.srt ? 'SRT ✓' : (song.lrc ? 'LRC ✓' : (song.lyrics ? 'Plain ✓' : '—'))}</span>
        <span style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);">
          Order: ${song.order || '—'}</span>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        <button onclick="openSongForm('${song.id}')" style="${_adminActionStyle('var(--gold)')}">Edit</button>
        <button onclick="toggleSongStatus('${song.id}')" style="${_adminActionStyle('var(--text-2)')}">
          ${song.status === 'coming_soon' ? 'Mark Live' : 'Mark Coming Soon'}</button>
        <button onclick="deleteSong('${song.id}')" style="${_adminActionStyle('#ff6464')}">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ══════════════════════════════════════
   SONG FORM — Add / Edit
══════════════════════════════════════ */
function openSongForm(songId) {
  const song = songId ? _adminSongs.find(s => s.id === songId) : null;
  const isNew = !song;

  const overlay = document.createElement('div');
  overlay.id = 'songFormOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.92);
    display:flex;align-items:flex-start;justify-content:center;
    z-index:9500;backdrop-filter:blur(12px);overflow-y:auto;padding:24px 16px;
  `;

  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--gold-border);
      border-radius:24px;padding:28px;width:100%;max-width:560px;
      box-shadow:0 24px 60px rgba(0,0,0,0.7);">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <span style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
          text-transform:uppercase;letter-spacing:1.5px;color:var(--gold);">
          ${isNew ? 'Add Song' : 'Edit Song'}</span>
        <button onclick="document.getElementById('songFormOverlay').remove()"
          style="width:32px;height:32px;background:var(--surface-2);border:1px solid var(--border);
          border-radius:50%;color:var(--text-2);font-size:1.1rem;cursor:pointer;
          display:flex;align-items:center;justify-content:center;">×</button>
      </div>

      ${_songField('songFTitle',   'Song Title *',          song?.title       || '', 'text',     'e.g. A Thousand Lives')}
      ${_songField('songFArtist',  'Artist',                song?.artist      || 'Margo', 'text','e.g. Margo')}
      ${_songField('songFAudioUrl', 'Audio URL (R2)',        song?.audioUrl    || '', 'url',      'https://audio.trymargo.com/Margo/audio/filename.wav')}
      ${_songField('songFArtwork', 'Artwork URL (R2)',       song?.artwork     || '', 'url',      'https://audio.trymargo.com/Margo/artwork/filename.webp')}
      ${_songField('songFOrder',   'Display Order (1=top)', song?.order       || '1', 'number',  '1')}
      ${_songField('songFTags',    'Tags (comma-separated)',  (song?.tags||[]).join(', '), 'text', 'New, Original, Remix')}
      ${_songField('songFDesc',    'Short Description',     song?.description || '', 'text',     'e.g. Debut single')}

      <div style="margin-bottom:14px;">
        <label style="${_songLabelStyle()}">Status</label>
        <select id="songFStatus" style="width:100%;padding:10px 14px;background:var(--bg);
          border:1px solid var(--border);border-radius:12px;color:var(--text);
          font-family:'Lora',serif;font-size:0.82rem;outline:none;box-sizing:border-box;">
          <option value="active"      ${song?.status === 'active'      || isNew ? 'selected' : ''}>Live — visible on /music</option>
          <option value="coming_soon" ${song?.status === 'coming_soon' ? 'selected' : ''}>Coming Soon</option>
        </select>
      </div>

      ${_songField('songFCSLabel', 'Coming Soon Label',     song?.comingSoonLabel || '', 'text',  'e.g. Dropping June 2025')}

      <div style="margin-bottom:14px;">
        <label style="${_songLabelStyle()}">SRT Lyrics (from CapCut or similar)</label>
        <textarea id="songFSRT" rows="6"
          style="width:100%;padding:10px 14px;background:var(--bg);
          border:1px solid var(--border);border-radius:12px;color:var(--text);
          font-family:'Lora',serif;font-size:0.75rem;line-height:1.5;
          box-sizing:border-box;outline:none;resize:vertical;"
          placeholder="1&#10;00:00:01,000 --> 00:00:03,500&#10;Lyric line here&#10;&#10;2&#10;...">${_esc(song?.srt || '')}</textarea>
        <div style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);margin-top:4px;">
          Paste the .srt file content here. Use this for karaoke sync.</div>
      </div>

      <div style="margin-bottom:14px;">
        <label style="${_songLabelStyle()}">Plain Lyrics (fallback if no SRT)</label>
        <textarea id="songFLyrics" rows="4"
          style="width:100%;padding:10px 14px;background:var(--bg);
          border:1px solid var(--border);border-radius:12px;color:var(--text);
          font-family:'Lora',serif;font-size:0.82rem;line-height:1.7;
          box-sizing:border-box;outline:none;resize:vertical;"
          placeholder="Verse 1&#10;Line one&#10;Line two...">${_esc(song?.lyrics || '')}</textarea>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:16px;margin-bottom:16px;">
        <div style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
          text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:12px;">
          Streaming Links (add when available)</div>
        ${_songField('songFYTUrl',    'YouTube URL',    song?.youtubeUrl    || '', 'url', 'https://youtube.com/watch?v=...')}
        ${_songField('songFAMUrl',    'Audiomack URL',  song?.audiomackUrl  || '', 'url', 'https://audiomack.com/...')}
        ${_songField('songFBPUrl',    'Boomplay URL',   song?.boomplayUrl   || '', 'url', 'https://boomplay.com/...')}
        ${_songField('songFSCUrl',    'SoundCloud URL', song?.soundcloudUrl || '', 'url', 'https://soundcloud.com/...')}
        ${_songField('songFSPUrl',    'Spotify URL',    song?.spotifyUrl    || '', 'url', 'https://open.spotify.com/...')}
        ${_songField('songFAPUrl',    'Apple Music URL', song?.appleMusicUrl || '', 'url', 'https://music.apple.com/...')}
        ${_songField('songFDZUrl',    'Deezer URL',      song?.deezerUrl     || '', 'url', 'https://deezer.com/...')}
        ${_songField('songFTKUrl',    'TikTok URL',      song?.tiktokUrl     || '', 'url', 'https://tiktok.com/...')}
      </div>

      <div id="songFormError" style="display:none;font-family:'Lora',serif;
        font-size:0.6rem;color:#ff6464;margin-bottom:14px;"></div>

      <div style="display:flex;gap:10px;">
        <button id="songFormSaveBtn"
          style="flex:1;padding:14px;background:var(--gold);color:var(--bg);
          border:none;border-radius:12px;font-family:'Lora',serif;font-weight:700;
          font-size:0.95rem;cursor:pointer;min-height:44px;">
          ${isNew ? 'Publish Song' : 'Save Changes'}
        </button>
        <button onclick="document.getElementById('songFormOverlay').remove()"
          style="padding:14px 18px;background:transparent;color:var(--text-2);
          border:1px solid var(--border);border-radius:12px;font-family:'Lora',serif;
          font-size:0.95rem;cursor:pointer;min-height:44px;">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // AI Sync Lyrics handler
  document.getElementById('syncLyricsBtn').onclick = async () => {
    const audioUrl = document.getElementById('songFAudioUrl').value.trim();
    const lyrics   = document.getElementById('songFLyrics').value.trim();
    if (!audioUrl) { alert('Please enter the Audio URL first.'); return; }
    if (!lyrics)   { alert('Please paste the plain lyrics first.'); return; }
    const btn = document.getElementById('syncLyricsBtn');
    btn.textContent = '⏳ Syncing… this takes about 30 seconds';
    btn.disabled = true;
    try {
      const res = await fetch('/api/sync-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl, lyrics })
      });
      const data = await res.json();
      if (data.srt) {
        document.getElementById('songFSRT').value = data.srt;
        btn.textContent = '✓ Synced! Review below and save.';
        btn.style.color = 'var(--success)';
      } else {
        btn.textContent = '✗ Sync failed — ' + (data.error || 'unknown error');
        btn.style.color = '#ff6464';
        btn.disabled = false;
      }
    } catch(e) {
      btn.textContent = '✗ Error: ' + e.message;
      btn.style.color = '#ff6464';
      btn.disabled = false;
    }
  };

  document.getElementById('songFormSaveBtn').onclick = async () => {
    const title = document.getElementById('songFTitle').value.trim();
    const errEl = document.getElementById('songFormError');
    if (!title) {
      errEl.textContent = 'Song title is required.';
      errEl.style.display = 'block';
      return;
    }

    const tags = document.getElementById('songFTags').value.split(',').map(t => t.trim()).filter(Boolean);

    const payload = {
      title,
      artist:         document.getElementById('songFArtist').value.trim()  || 'Margo',
      audioUrl:       document.getElementById('songFAudioUrl').value.trim() || null,
      artwork:        document.getElementById('songFArtwork').value.trim() || null,
      order:          parseInt(document.getElementById('songFOrder').value) || 1,
      tags,
      description:    document.getElementById('songFDesc').value.trim()    || null,
      status:         document.getElementById('songFStatus').value,
      comingSoonLabel:document.getElementById('songFCSLabel').value.trim() || null,
      srt:            document.getElementById('songFSRT').value.trim()     || null,
      lyrics:         document.getElementById('songFLyrics').value.trim()  || null,
      youtubeUrl:     document.getElementById('songFYTUrl').value.trim()   || null,
      audiomackUrl:   document.getElementById('songFAMUrl').value.trim()   || null,
      boomplayUrl:    document.getElementById('songFBPUrl').value.trim()   || null,
      soundcloudUrl:  document.getElementById('songFSCUrl').value.trim()   || null,
      spotifyUrl:     document.getElementById('songFSPUrl').value.trim()   || null,
      appleMusicUrl:  document.getElementById('songFAPUrl').value.trim()   || null,
      deezerUrl:      document.getElementById('songFDZUrl').value.trim()   || null,
      tiktokUrl:      document.getElementById('songFTKUrl').value.trim()   || null,
      updatedAt:      Date.now(),
    };

    const saveBtn = document.getElementById('songFormSaveBtn');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled    = true;
    errEl.style.display = 'none';

    try {
      if (isNew) {
        payload.createdAt = Date.now();
        await firebase.database().ref('songs').push(payload);
      } else {
        await firebase.database().ref('songs/' + songId).update(payload);
      }
      overlay.remove();
      showToast((isNew ? 'Song published' : 'Song updated') + ' ✓');
    } catch(err) {
      saveBtn.textContent = isNew ? 'Publish Song' : 'Save Changes';
      saveBtn.disabled    = false;
      errEl.textContent   = 'Error: ' + err.message;
      errEl.style.display = 'block';
    }
  };
}

/* ── Toggle live/coming_soon ── */
async function toggleSongStatus(songId) {
  const song = _adminSongs.find(s => s.id === songId);
  if (!song || !isFirebaseEnabled) return;
  const newStatus = song.status === 'coming_soon' ? 'active' : 'coming_soon';
  try {
    await firebase.database().ref('songs/' + songId).update({ status: newStatus, updatedAt: Date.now() });
    showToast('Song marked as ' + (newStatus === 'active' ? 'live' : 'coming soon'));
  } catch(e) { showToast('Error: ' + e.message); }
}

/* ── Delete song ── */
async function deleteSong(songId) {
  const song = _adminSongs.find(s => s.id === songId);
  if (!song) return;
  if (!window.confirm('Delete "' + (song.title || 'this song') + '"? This cannot be undone.')) return;
  if (!isFirebaseEnabled) return;
  try {
    await firebase.database().ref('songs/' + songId).remove();
    showToast('Song deleted');
  } catch(e) { showToast('Error: ' + e.message); }
}

/* ── Form helpers ── */
function _songField(id, label, value, type, placeholder) {
  return `
    <div style="margin-bottom:14px;">
      <label for="${id}" style="${_songLabelStyle()}">${label}</label>
      <input id="${id}" type="${type}" value="${_esc(value)}" placeholder="${_esc(placeholder)}"
        style="width:100%;padding:10px 14px;background:var(--bg);
        border:1px solid var(--border);border-radius:12px;color:var(--text);
        font-family:'Lora',serif;font-size:0.82rem;box-sizing:border-box;outline:none;"/>
    </div>`;
}
function _songLabelStyle() {
  return "font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);" +
    "text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;";
}
function _esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
/* ============================================================
   MARGO — admin-music-tab.js
   Music CMS tab for the admin panel.
   ADD TO admin.js:
     1. In openAdminPanel() HTML: add the "Music" tab button
        alongside Posts / Pages / Featured
     2. In openAdminPanel() HTML: add #adminPanelMusic div
        alongside the other panels
     3. In the tab onclick handler: add music case
     4. Paste all functions below at the bottom of admin.js
        (before the style helpers section)

   Firebase node: /songs/{songId}
   Song schema (MLRC — Margo Lyric Rich Content):
   {
     id:          string  (Firebase push key)
     title:       string
     artist:      string  (default "Margo")
     status:      "live" | "coming" | "planned"
     featured:    boolean (only one song should be true)
     coverUrl:    string  (URL to cover art image)
     youtubeId:   string  (YouTube video ID, e.g. "dQw4w9WgXcQ")
     releaseDate: string  (e.g. "May 2025")
     platforms: {
       youtube:   string (full URL)
       audiomack: string
       boomplay:  string
       soundcloud:string
       spotify:   string
       apple:     string
     }
     lyrics:      string  (raw SRT or LRC pasted by admin)
     lyricsJson:  array   (parsed internally, stored for music page)
     createdAt:   number
     updatedAt:   number
   }
   ============================================================ */

/* ── Firebase reference (set alongside postsRef in initFirebase) ── */
// Add this line in initFirebase() after adminConfigRef is set:
// songsRef = database.ref('songs');
// Also declare at top of admin.js: let songsRef = null;

let _musicSongs    = [];
let _musicEditId   = null; // null = new song, string = editing existing

/* ══════════════════════════════════════════════════════════════
   PANEL HTML SNIPPET
   Paste this div in openAdminPanel() modal.innerHTML,
   right after adminPanelFeatured closing div:
══════════════════════════════════════════════════════════════ */
function _getMusicPanelHTML() {
  return `
    <div id="adminPanelMusic" style="flex:1;display:none;flex-direction:column;overflow:hidden;">

      <!-- Song list header -->
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap;gap:12px;">
        <p style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
          text-transform:uppercase;letter-spacing:1px;margin:0;">
          Manage songs — changes go live instantly on music.html
        </p>
        <button id="musicAddBtn" style="padding:10px 20px;background:var(--gold);
          color:var(--bg);border:none;border-radius:10px;font-family:'Lora',serif;
          font-weight:700;font-size:0.6rem;text-transform:uppercase;letter-spacing:1px;
          cursor:pointer;min-height:44px;">
          + Add Song
        </button>
      </div>

      <!-- Song list -->
      <div id="musicSongList" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>

      <!-- Song form (hidden until Add/Edit) -->
      <div id="musicFormOverlay" style="display:none;position:absolute;inset:0;
        background:var(--bg);z-index:100;overflow-y:auto;padding:24px 20px;">
        <div style="max-width:600px;margin:0 auto;">

          <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
            <button id="musicFormBack" style="padding:8px 16px;background:transparent;
              color:var(--text-2);border:1px solid var(--border);border-radius:8px;
              font-family:'Lora',serif;font-size:0.6rem;cursor:pointer;min-height:44px;">
              ← Back
            </button>
            <span id="musicFormTitle" style="font-family:'Lora',serif;font-size:0.95rem;
              font-weight:700;color:var(--text);">Add Song</span>
          </div>

          <!-- Status + Featured row -->
          <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
            <div style="flex:1;min-width:140px;">
              <label style="${_musicLabelStyle()}">Status</label>
              <select id="mfStatus" style="${_musicInputStyle()}">
                <option value="live">Live — full karaoke</option>
                <option value="coming">Coming Soon</option>
                <option value="planned">Planned</option>
              </select>
            </div>
            <div style="display:flex;align-items:flex-end;padding-bottom:2px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
                font-family:'Lora',serif;font-size:0.6rem;color:var(--text-2);
                text-transform:uppercase;letter-spacing:1px;min-height:44px;">
                <input type="checkbox" id="mfFeatured" style="width:16px;height:16px;
                  accent-color:var(--gold);cursor:pointer;"/>
                Featured (hero song)
              </label>
            </div>
          </div>

          <!-- Title + Artist -->
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="flex:2;min-width:160px;">
              <label style="${_musicLabelStyle()}">Song Title *</label>
              <input id="mfTitle" type="text" placeholder="A Thousand Lives"
                style="${_musicInputStyle()}"/>
            </div>
            <div style="flex:1;min-width:120px;">
              <label style="${_musicLabelStyle()}">Artist</label>
              <input id="mfArtist" type="text" placeholder="Margo"
                style="${_musicInputStyle()}"/>
            </div>
          </div>

          <!-- Release date + Cover URL -->
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:140px;">
              <label style="${_musicLabelStyle()}">Release Date</label>
              <input id="mfReleaseDate" type="text" placeholder="May 2025"
                style="${_musicInputStyle()}"/>
            </div>
            <div style="flex:2;min-width:180px;">
              <label style="${_musicLabelStyle()}">Cover Art URL</label>
              <input id="mfCoverUrl" type="text" placeholder="https://… or /assets/music/cover.jpg"
                style="${_musicInputStyle()}"/>
            </div>
          </div>

          <!-- YouTube ID -->
          <div style="margin-bottom:16px;">
            <label style="${_musicLabelStyle()}">YouTube Video ID
              <span style="color:var(--text-3);font-weight:400;"> — just the ID, e.g. dQw4w9WgXcQ</span>
            </label>
            <input id="mfYoutubeId" type="text" placeholder="dQw4w9WgXcQ"
              style="${_musicInputStyle()}"/>
          </div>

          <!-- Platform links -->
          <div style="background:var(--surface-2);border:1px solid var(--border);
            border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
              text-transform:uppercase;letter-spacing:1px;color:var(--text-3);margin-bottom:14px;">
              Platform Links — leave blank to hide that button
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div><label style="${_musicLabelStyle()}">YouTube (full URL)</label>
                <input id="mfLinkYoutube" type="text" placeholder="https://youtube.com/watch?v=…"
                  style="${_musicInputStyle()}"/></div>
              <div><label style="${_musicLabelStyle()}">Audiomack</label>
                <input id="mfLinkAudiomack" type="text" placeholder="https://audiomack.com/…"
                  style="${_musicInputStyle()}"/></div>
              <div><label style="${_musicLabelStyle()}">Boomplay</label>
                <input id="mfLinkBoomplay" type="text" placeholder="https://boomplay.com/…"
                  style="${_musicInputStyle()}"/></div>
              <div><label style="${_musicLabelStyle()}">SoundCloud</label>
                <input id="mfLinkSoundcloud" type="text" placeholder="https://soundcloud.com/…"
                  style="${_musicInputStyle()}"/></div>
              <div><label style="${_musicLabelStyle()}">Spotify <span style="color:var(--text-3);font-weight:400;">(when Distrokid done)</span></label>
                <input id="mfLinkSpotify" type="text" placeholder="https://open.spotify.com/…"
                  style="${_musicInputStyle()}"/></div>
              <div><label style="${_musicLabelStyle()}">Apple Music</label>
                <input id="mfLinkApple" type="text" placeholder="https://music.apple.com/…"
                  style="${_musicInputStyle()}"/></div>
            </div>
          </div>

          <!-- Lyrics / SRT -->
          <div style="margin-bottom:16px;">
            <label style="${_musicLabelStyle()}">Lyrics — paste SRT (from CapCut) or LRC format
              <span style="color:var(--text-3);font-weight:400;"> — leave blank for Coming Soon songs</span>
            </label>
            <textarea id="mfLyrics" rows="12"
              placeholder="Paste SRT from CapCut here:&#10;&#10;1&#10;00:00:27,055 --> 00:00:28,515&#10;You Say You're A President&#10;&#10;2&#10;00:00:28,515 --> 00:00:30,262&#10;I've Sat In That Chair&#10;&#10;— OR paste LRC:&#10;[00:27.05] You Say You're A President"
              style="${_musicInputStyle()}min-height:220px;resize:vertical;font-size:0.78rem;
              font-family:monospace;line-height:1.7;"></textarea>
            <div id="mfLyricsPreview" style="margin-top:8px;font-family:'Lora',serif;
              font-size:0.6rem;color:var(--text-3);"></div>
          </div>

          <!-- Save / Delete -->
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <button id="musicSaveBtn" style="padding:14px 28px;background:var(--gold);
              color:var(--bg);border:none;border-radius:12px;font-family:'Lora',serif;
              font-weight:700;font-size:0.95rem;cursor:pointer;min-height:44px;">
              Save Song
            </button>
            <button id="musicDeleteBtn" style="display:none;padding:14px 20px;
              background:transparent;color:#ff6464;border:1px solid #ff6464;
              border-radius:12px;font-family:'Lora',serif;font-size:0.82rem;
              cursor:pointer;min-height:44px;">
              Delete Song
            </button>
            <span id="musicSaveStatus" style="font-family:'Lora',serif;font-size:0.6rem;
              color:var(--success);display:none;text-transform:uppercase;letter-spacing:1px;">
              ✓ Saved
            </span>
          </div>

        </div>
      </div><!-- end musicFormOverlay -->
    </div><!-- end adminPanelMusic -->
  `;
}

/* ══════════════════════════════════════════════════════════════
   TAB BUTTON HTML SNIPPET
   Paste this button in the tabs row in openAdminPanel(),
   alongside tabPosts / tabPages / tabFeatured:
   <button id="tabMusic" style="${_adminTabStyle(false)}" data-tab="music">Music</button>
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   TAB SWITCH — add this case in the tab onclick handler:
   if (_adminActiveTab === 'music') {
     document.getElementById('adminPanelMusic').style.display = 'flex';
     loadMusicSongs();
   }
   And hide it in the others:
   document.getElementById('adminPanelMusic').style.display = 'none';
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   LOAD + RENDER SONG LIST
══════════════════════════════════════════════════════════════ */
function loadMusicSongs() {
  const container = document.getElementById('musicSongList');
  if (!container || !isFirebaseEnabled) return;
  container.innerHTML = `<div style="text-align:center;padding:48px;font-family:'Lora',serif;
    font-size:0.6rem;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;">
    Loading songs…</div>`;

  const songsRef = firebase.database().ref('songs');
  songsRef.orderByChild('createdAt').on('value', snap => {
    _musicSongs = [];
    snap.forEach(child => {
      const s = child.val();
      s.id = child.key;
      _musicSongs.unshift(s);
    });
    _renderMusicSongList(container);
  });

  // Wire Add button
  const addBtn = document.getElementById('musicAddBtn');
  if (addBtn) addBtn.onclick = () => _openMusicForm(null);
}

function _renderMusicSongList(container) {
  if (!_musicSongs.length) {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;">
      <div style="font-family:'Lora',serif;font-size:1.1rem;font-style:italic;
        color:var(--text-3);margin-bottom:16px;">No songs yet</div>
      <div style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
        text-transform:uppercase;letter-spacing:1px;">
        Tap + Add Song to publish your first track</div>
    </div>`;
    return;
  }

  container.innerHTML = '';
  _musicSongs.forEach(song => {
    const statusColor = song.status === 'live'    ? 'var(--success)'
                      : song.status === 'coming'  ? 'var(--gold)'
                      : 'var(--text-3)';
    const hasLyrics = song.lyricsJson && song.lyricsJson.length > 0;
    const lyricsCount = hasLyrics ? song.lyricsJson.length : 0;

    const card = document.createElement('div');
    card.style.cssText = `
      background:var(--surface-2);border:1px solid var(--border);
      border-radius:14px;padding:16px;margin-bottom:10px;
      display:flex;gap:14px;align-items:flex-start;cursor:pointer;
      transition:border-color 0.18s;
    `;
    if (song.featured) card.style.borderColor = 'var(--gold-border)';
    card.onmouseenter = () => card.style.borderColor = 'var(--gold-border)';
    card.onmouseleave = () => card.style.borderColor = song.featured ? 'var(--gold-border)' : 'var(--border)';

    // Cover art
    const coverDiv = document.createElement('div');
    coverDiv.style.cssText = `width:48px;height:48px;border-radius:8px;flex-shrink:0;
      background:var(--surface-3);overflow:hidden;display:flex;align-items:center;
      justify-content:center;font-family:'Syne',sans-serif;font-weight:800;
      font-size:0.8rem;color:var(--gold);`;
    if (song.coverUrl) {
      const img = document.createElement('img');
      img.src = song.coverUrl;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = () => { coverDiv.innerHTML = 'M'; };
      coverDiv.appendChild(img);
    } else {
      coverDiv.textContent = 'M';
    }

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';
    info.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
        <span style="font-family:'Lora',serif;font-size:0.95rem;font-weight:700;
          color:var(--text);">${song.title || 'Untitled'}</span>
        ${song.featured ? `<span style="font-family:'Lora',serif;font-size:0.55rem;
          font-weight:700;text-transform:uppercase;letter-spacing:1px;
          color:var(--gold);border:1px solid var(--gold-border);
          border-radius:50px;padding:2px 8px;">Featured</span>` : ''}
      </div>
      <div style="font-family:'Lora',serif;font-size:0.7rem;color:var(--text-3);margin-bottom:8px;">
        ${song.artist || 'Margo'}${song.releaseDate ? ' · ' + song.releaseDate : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span style="font-family:'Lora',serif;font-size:0.6rem;font-weight:700;
          text-transform:uppercase;letter-spacing:0.8px;padding:3px 10px;
          border-radius:50px;color:${statusColor};border:1px solid ${statusColor};">
          ${song.status || 'planned'}
        </span>
        ${hasLyrics ? `<span style="font-family:'Lora',serif;font-size:0.6rem;
          color:var(--success);border:1px solid var(--success-border);
          border-radius:50px;padding:3px 10px;">
          ♪ ${lyricsCount} lines synced</span>` : `<span style="font-family:'Lora',serif;
          font-size:0.6rem;color:var(--text-3);border:1px solid var(--border);
          border-radius:50px;padding:3px 10px;">No lyrics yet</span>`}
        ${song.youtubeId ? `<span style="font-family:'Lora',serif;font-size:0.6rem;
          color:var(--text-3);">▶ YT</span>` : ''}
      </div>
    `;

    card.appendChild(coverDiv);
    card.appendChild(info);
    card.onclick = () => _openMusicForm(song);
    container.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   OPEN FORM (ADD or EDIT)
══════════════════════════════════════════════════════════════ */
function _openMusicForm(song) {
  _musicEditId = song ? song.id : null;
  const overlay  = document.getElementById('musicFormOverlay');
  const formTitle = document.getElementById('musicFormTitle');
  const deleteBtn = document.getElementById('musicDeleteBtn');
  const saveStatus = document.getElementById('musicSaveStatus');
  if (!overlay) return;

  // Set form title
  if (formTitle) formTitle.textContent = song ? 'Edit Song' : 'Add Song';
  if (deleteBtn) deleteBtn.style.display = song ? 'inline-block' : 'none';
  if (saveStatus) saveStatus.style.display = 'none';

  // Populate fields
  _mfSet('mfTitle',          song?.title        || '');
  _mfSet('mfArtist',         song?.artist       || 'Margo');
  _mfSet('mfStatus',         song?.status       || 'live');
  _mfSet('mfReleaseDate',    song?.releaseDate  || '');
  _mfSet('mfCoverUrl',       song?.coverUrl     || '');
  _mfSet('mfYoutubeId',      song?.youtubeId    || '');
  _mfSet('mfLinkYoutube',    song?.platforms?.youtube    || '');
  _mfSet('mfLinkAudiomack',  song?.platforms?.audiomack  || '');
  _mfSet('mfLinkBoomplay',   song?.platforms?.boomplay   || '');
  _mfSet('mfLinkSoundcloud', song?.platforms?.soundcloud || '');
  _mfSet('mfLinkSpotify',    song?.platforms?.spotify    || '');
  _mfSet('mfLinkApple',      song?.platforms?.apple      || '');
  _mfSet('mfLyrics',         song?.lyrics       || '');

  const featuredEl = document.getElementById('mfFeatured');
  if (featuredEl) featuredEl.checked = !!song?.featured;

  // Live lyrics line count preview
  const lyricsEl  = document.getElementById('mfLyrics');
  const previewEl = document.getElementById('mfLyricsPreview');
  if (lyricsEl && previewEl) {
    const update = () => {
      const parsed = parseLyrics(lyricsEl.value.trim());
      previewEl.textContent = parsed.length
        ? `✓ ${parsed.length} lines detected — karaoke ready`
        : lyricsEl.value.trim() ? 'Format not recognised — check SRT or LRC syntax' : '';
      previewEl.style.color = parsed.length ? 'var(--success)' : 'var(--gold)';
    };
    lyricsEl.oninput = update;
    update();
  }

  // Back button
  const backBtn = document.getElementById('musicFormBack');
  if (backBtn) backBtn.onclick = () => {
    overlay.style.display = 'none';
    if (saveStatus) saveStatus.style.display = 'none';
  };

  // Save
  const saveBtn = document.getElementById('musicSaveBtn');
  if (saveBtn) saveBtn.onclick = _saveMusicSong;

  // Delete
  if (deleteBtn) deleteBtn.onclick = _deleteMusicSong;

  overlay.style.display = 'block';
  overlay.scrollTop = 0;
}

function _mfSet(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'SELECT') el.value = val;
  else el.value = val;
}
function _mfGet(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/* ══════════════════════════════════════════════════════════════
   SAVE SONG
══════════════════════════════════════════════════════════════ */
async function _saveMusicSong() {
  const title = _mfGet('mfTitle');
  if (!title) { showToast('Song title is required'); return; }

  const rawLyrics = _mfGet('mfLyrics');
  const lyricsJson = rawLyrics ? parseLyrics(rawLyrics) : [];

  const featured = document.getElementById('mfFeatured')?.checked || false;
  const saveBtn   = document.getElementById('musicSaveBtn');
  const saveStatus = document.getElementById('musicSaveStatus');

  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true; }
  if (saveStatus) saveStatus.style.display = 'none';

  const payload = {
    title,
    artist:      _mfGet('mfArtist')         || 'Margo',
    status:      _mfGet('mfStatus')          || 'live',
    featured,
    releaseDate: _mfGet('mfReleaseDate')     || '',
    coverUrl:    _mfGet('mfCoverUrl')        || '',
    youtubeId:   _mfGet('mfYoutubeId')       || '',
    platforms: {
      youtube:   _mfGet('mfLinkYoutube')    || '',
      audiomack: _mfGet('mfLinkAudiomack')  || '',
      boomplay:  _mfGet('mfLinkBoomplay')   || '',
      soundcloud:_mfGet('mfLinkSoundcloud') || '',
      spotify:   _mfGet('mfLinkSpotify')    || '',
      apple:     _mfGet('mfLinkApple')      || '',
    },
    lyrics:     rawLyrics,
    lyricsJson,
    updatedAt:  Date.now(),
  };

  try {
    const songsRef = firebase.database().ref('songs');

    // If this song is being set as featured, un-feature all others first
    if (featured) {
      const snap = await songsRef.once('value');
      const updates = {};
      snap.forEach(child => {
        if (child.key !== _musicEditId && child.val().featured) {
          updates[child.key + '/featured'] = false;
        }
      });
      if (Object.keys(updates).length) await songsRef.update(updates);
    }

    if (_musicEditId) {
      // Edit existing
      await songsRef.child(_musicEditId).update(payload);
    } else {
      // New song
      payload.createdAt = Date.now();
      await songsRef.push(payload);
    }

    if (saveBtn) { saveBtn.textContent = 'Save Song'; saveBtn.disabled = false; }
    if (saveStatus) {
      saveStatus.style.display = 'inline';
      setTimeout(() => { if (saveStatus) saveStatus.style.display = 'none'; }, 3000);
    }
    showToast((_musicEditId ? 'Song updated' : 'Song added') + ' ✓');

    // Close form after short delay
    setTimeout(() => {
      const overlay = document.getElementById('musicFormOverlay');
      if (overlay) overlay.style.display = 'none';
    }, 1000);

  } catch (err) {
    if (saveBtn) { saveBtn.textContent = 'Save Song'; saveBtn.disabled = false; }
    showToast('Error: ' + err.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   DELETE SONG
══════════════════════════════════════════════════════════════ */
async function _deleteMusicSong() {
  if (!_musicEditId) return;
  if (!window.confirm('Permanently delete this song? This cannot be undone.')) return;
  try {
    await firebase.database().ref('songs').child(_musicEditId).remove();
    showToast('Song deleted');
    const overlay = document.getElementById('musicFormOverlay');
    if (overlay) overlay.style.display = 'none';
  } catch (err) {
    showToast('Error: ' + err.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   LYRICS PARSER — accepts SRT or LRC, returns MLRC JSON array
   This is the core of the system. Used by admin AND music.html.
   Export/copy parseLyrics() to a shared location so music.html
   can import it too (or inline it in music.html's <script>).
══════════════════════════════════════════════════════════════ */
function parseLyrics(raw) {
  if (!raw || !raw.trim()) return [];

  const text = raw.trim();

  // ── Detect SRT (has "00:00:00,000 --> 00:00:00,000" pattern) ──
  if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(text)) {
    return _parseSRT(text);
  }

  // ── Detect LRC (has "[mm:ss.xx]" pattern) ──
  if (/\[\d{2}:\d{2}[.:]\d{2,3}\]/.test(text)) {
    return _parseLRC(text);
  }

  return [];
}

function _srtTimeToSec(ts) {
  // "00:00:27,055" → 27.055
  const [hms, ms] = ts.trim().split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + (parseInt(ms || '0', 10) / 1000);
}

function _parseSRT(text) {
  const lines = [];
  // Split on blank lines to get blocks
  const blocks = text.split(/\n\s*\n/);
  for (const block of blocks) {
    const rows = block.trim().split('\n');
    if (rows.length < 2) continue;
    // Find the timestamp row (contains -->)
    const tsRow = rows.find(r => r.includes('-->'));
    if (!tsRow) continue;
    const [startStr, endStr] = tsRow.split('-->');
    const start = _srtTimeToSec(startStr);
    const end   = _srtTimeToSec(endStr);
    // Text is everything after the timestamp row (skip index number row too)
    const tsIdx = rows.indexOf(tsRow);
    const textRows = rows.slice(tsIdx + 1).filter(r => r.trim());
    const lyricText = textRows.join(' ').trim();
    if (lyricText && !isNaN(start)) {
      lines.push({ start, end, text: lyricText });
    }
  }
  return lines;
}

function _lrcTimeToSec(ts) {
  // "[01:32.45]" → 92.45
  const clean = ts.replace(/[\[\]]/g, '');
  const [mStr, sStr] = clean.split(':');
  const m = parseInt(mStr, 10);
  const s = parseFloat(sStr);
  return m * 60 + s;
}

function _parseLRC(text) {
  const lines = [];
  const rows  = text.split('\n');
  const parsed = [];

  for (const row of rows) {
    const match = row.match(/^(\[\d{2}:\d{2}[.:]\d{2,3}\])\s*(.*)$/);
    if (!match) continue;
    const start   = _lrcTimeToSec(match[1]);
    const lyricText = match[2].trim();
    if (lyricText && !lyricText.startsWith('[')) {
      parsed.push({ start, text: lyricText });
    }
  }

  // Derive end time: each line ends when the next one starts
  for (let i = 0; i < parsed.length; i++) {
    lines.push({
      start: parsed[i].start,
      end:   parsed[i + 1] ? parsed[i + 1].start : parsed[i].start + 5,
      text:  parsed[i].text,
    });
  }
  return lines;
}

/* ══════════════════════════════════════════════════════════════
   STYLE HELPERS
══════════════════════════════════════════════════════════════ */
function _musicLabelStyle() {
  return 'font-family:\'Lora\',serif;font-size:0.6rem;font-weight:600;color:var(--text-2);' +
    'text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;';
}
function _musicInputStyle() {
  return 'width:100%;padding:11px 14px;background:var(--surface-2);' +
    'border:1px solid var(--border);border-radius:10px;' +
    'color:var(--text);font-family:\'Lora\',serif;font-size:0.82rem;' +
    'box-sizing:border-box;outline:none;display:block;';
}
