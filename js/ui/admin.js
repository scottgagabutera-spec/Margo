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

  /* ── Mobile admin trigger: long press top-left corner 10s ── */
  (function() {
    const HOLD_MS = 10000;
    let holdTimer = null;
    let pressing  = false;

    function inCorner(x, y) {
      return x < 80 && y < 80;
    }

    document.addEventListener('touchstart', function(e) {
      const t = e.touches[0];
      if (!inCorner(t.clientX, t.clientY)) return;
      pressing = true;
      holdTimer = setTimeout(() => {
        if (pressing) {
          if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
          adminMode ? openAdminPanel() : showAdminLogin();
        }
      }, HOLD_MS);
    }, { passive: true });

    document.addEventListener('touchend',   function() { pressing = false; clearTimeout(holdTimer); }, { passive: true });
    document.addEventListener('touchmove',  function() { pressing = false; clearTimeout(holdTimer); }, { passive: true });
    document.addEventListener('touchcancel',function() { pressing = false; clearTimeout(holdTimer); }, { passive: true });
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
      if (_adminActiveTab === 'featured') loadFeaturedLyricAdmin();
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
