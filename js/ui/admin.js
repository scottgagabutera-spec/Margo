/* ============================================================
   MARGO — js/admin.js
   Admin moderation dashboard + Pages CMS.
   ACCESS: B + G keys (within 300ms) → Firebase login
   SECURITY: UID verified against /adminConfig/allowedUid
   Depends on: state.js, firebase.js, feed.js (renderFeed, timeAgo)
   v4.5 — Echo (reply) moderation added:
          • Each post card now shows its echoes inline
          • Hide / Unhide / Delete per echo
          • adminHideEcho(), adminUnhideEcho(), adminDeleteEcho()
   ============================================================ */

const _adminKeysHeld = new Set();
let _adminKeyTimer   = null;

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

// ── Login ──
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
      background:#141418;border:1px solid rgba(232,197,71,0.2);
      border-radius:20px;padding:32px;width:100%;max-width:380px;
      box-shadow:0 24px 60px rgba(0,0,0,0.7);
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <svg viewBox="-4 -4 88 88" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="#E8C547"/>
          <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
                fill="none" stroke="#0B0B0D" stroke-width="5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.85rem;
          letter-spacing:3px;color:#E8C547;text-transform:uppercase;">MARGO · Admin</span>
      </div>
      <p style="font-family:'Space Mono',monospace;font-size:0.55rem;color:#A0A0A8;
        text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;">
        Sign in to access moderation dashboard
      </p>
      <input id="adminEmail" type="email" placeholder="Email"
        style="width:100%;padding:11px 13px;background:#0B0B0D;border:1px solid rgba(255,255,255,0.08);
        border-radius:10px;color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.9rem;
        margin-bottom:10px;box-sizing:border-box;outline:none;"/>
      <input id="adminPassword" type="password" placeholder="Password"
        style="width:100%;padding:11px 13px;background:#0B0B0D;border:1px solid rgba(255,255,255,0.08);
        border-radius:10px;color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.9rem;
        margin-bottom:18px;box-sizing:border-box;outline:none;"/>
      <div id="adminLoginError" style="display:none;font-family:'Space Mono',monospace;
        font-size:0.55rem;color:#ff6464;text-transform:uppercase;letter-spacing:1px;
        margin-bottom:14px;"></div>
      <div style="display:flex;gap:10px;">
        <button id="adminLoginBtn" style="flex:1;padding:13px;background:#E8C547;color:#0B0B0D;
          border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-weight:700;
          font-size:0.88rem;cursor:pointer;">Sign In</button>
        <button id="adminLoginCancel" style="padding:13px 18px;background:transparent;
          color:#A0A0A8;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
          font-family:'DM Sans',sans-serif;font-weight:600;font-size:0.88rem;cursor:pointer;">
          Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const emailEl   = document.getElementById('adminEmail');
  const passEl    = document.getElementById('adminPassword');
  const errorEl   = document.getElementById('adminLoginError');
  const loginBtn  = document.getElementById('adminLoginBtn');
  const cancelBtn = document.getElementById('adminLoginCancel');

  cancelBtn.onclick = () => overlay.remove();
  [emailEl, passEl].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
  });

  loginBtn.onclick = async () => {
    const email = emailEl.value.trim();
    const pass  = passEl.value;
    if (!email || !pass) { showAdminError(errorEl, 'Email and password required'); return; }

    loginBtn.textContent  = 'Signing in…';
    loginBtn.disabled     = true;
    errorEl.style.display = 'none';

    try {
      if (!firebaseAuth) throw new Error('Firebase Auth not available');
      const cred = await firebaseAuth.signInWithEmailAndPassword(email, pass);
      const uid  = cred.user.uid;

      const snap       = await adminConfigRef.child('allowedUid').get();
      const allowedUid = snap.val();

      if (!allowedUid) {
        await firebaseAuth.signOut();
        throw new Error('Admin not configured');
      }
      if (uid !== allowedUid) {
        await firebaseAuth.signOut();
        throw new Error('Access denied');
      }

      adminMode = true;
      adminUser = cred.user;
      overlay.remove();
      openAdminPanel();

    } catch (err) {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled    = false;
      const msg = (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found')
        ? 'Invalid credentials' : err.message;
      showAdminError(errorEl, msg);
    }
  };
}

function showAdminError(el, msg) {
  el.textContent   = msg;
  el.style.display = 'block';
}

// ── Admin panel ──
let _adminActiveTab = 'posts'; // 'posts' | 'pages'

function openAdminPanel() {
  const existing = document.getElementById('adminModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'adminModal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.95);
    z-index:8000;display:flex;flex-direction:column;
    backdrop-filter:blur(16px);overflow:hidden;
  `;

  modal.innerHTML = `
    <!-- TOP BAR -->
    <div style="
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid rgba(232,197,71,0.15);
      background:#0B0B0D;flex-shrink:0;
    ">
      <div style="display:flex;align-items:center;gap:12px;">
        <svg viewBox="-4 -4 88 88" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="#E8C547"/>
          <path d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
                fill="none" stroke="#0B0B0D" stroke-width="5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;
          letter-spacing:3px;color:#E8C547;text-transform:uppercase;">Admin</span>
        <span id="adminPostBadge" style="font-family:'Space Mono',monospace;font-size:0.5rem;
          color:#A0A0A8;font-weight:700;text-transform:uppercase;letter-spacing:1px;"></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-family:'Space Mono',monospace;font-size:0.5rem;color:#707078;
          text-transform:uppercase;letter-spacing:1px;">${adminUser?.email || ''}</span>
        <button id="adminSignOutBtn" style="padding:6px 12px;background:transparent;
          color:#707078;border:1px solid rgba(255,255,255,0.08);border-radius:8px;
          font-family:'DM Sans',sans-serif;font-size:0.7rem;font-weight:600;cursor:pointer;">
          Sign out</button>
        <button id="adminCloseBtn" style="width:28px;height:28px;background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);border-radius:50%;color:#A0A0A8;
          font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
      </div>
    </div>

    <!-- MAIN TABS: Posts / Pages -->
    <div style="
      display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.05);
      background:#0B0B0D;flex-shrink:0;
    ">
      <button id="tabPosts" style="${adminMainTabStyle(true)}" data-tab="posts">
        Posts
      </button>
      <button id="tabPages" style="${adminMainTabStyle(false)}" data-tab="pages">
        Pages
      </button>
      <button id="tabFeatured" style="${adminMainTabStyle(false)}" data-tab="featured">
        Featured
      </button>
    </div>

    <!-- FEATURED PANEL (hidden by default) -->
    <div id="adminPanelFeatured" style="flex:1;display:none;flex-direction:column;overflow:hidden;">
      <div style="padding:20px;flex:1;overflow-y:auto;">
        <p style="font-family:'Lora',serif;font-size:0.6rem;color:#707078;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">
          Featured lyric shown on landing page hero — update anytime
        </p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Lyric Text</label>
            <input id="featuredLyricText" type="text" placeholder="Enter lyric here" style="width:100%;padding:10px 13px;background:#141418;border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0F0F0;font-family:'Lora',serif;font-size:0.95rem;font-style:italic;box-sizing:border-box;outline:none;"/>
          </div>
          <div>
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Artist</label>
            <input id="featuredLyricArtist" type="text" placeholder="Artist name" style="width:100%;padding:10px 13px;background:#141418;border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0F0F0;font-family:'Lora',serif;font-size:0.95rem;box-sizing:border-box;outline:none;"/>
          </div>
          <div>
            <label style="font-family:'Lora',serif;font-size:0.6rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">Song Title</label>
            <input id="featuredLyricSong" type="text" placeholder="Song title" style="width:100%;padding:10px 13px;background:#141418;border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#F0F0F0;font-family:'Lora',serif;font-size:0.95rem;box-sizing:border-box;outline:none;"/>
          </div>
          <button id="featuredLyricSave" style="padding:12px 20px;background:#E8C547;color:#07060A;border:none;border-radius:10px;font-family:'Lora',serif;font-size:0.82rem;font-weight:700;cursor:pointer;margin-top:4px;">
            Save Featured Lyric
          </button>
          <div id="featuredLyricStatus" style="font-family:'Lora',serif;font-size:0.7rem;color:rgba(255,255,255,0.4);min-height:20px;"></div>
        </div>
      </div>
    </div>
    <!-- POSTS PANEL -->
    <div id="adminPanelPosts" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
      <div style="
        display:flex;gap:8px;padding:14px 20px;
        border-bottom:1px solid rgba(255,255,255,0.05);
        flex-shrink:0;flex-wrap:wrap;align-items:center;
      ">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="admin-filter-btn active" data-filter="all"     style="${adminFilterBtnStyle(true)}">All</button>
          <button class="admin-filter-btn" data-filter="active"          style="${adminFilterBtnStyle(false)}">Active</button>
          <button class="admin-filter-btn" data-filter="flagged"         style="${adminFilterBtnStyle(false)}">Flagged</button>
          <button class="admin-filter-btn" data-filter="hidden"          style="${adminFilterBtnStyle(false)}">Hidden</button>
        </div>
        <div style="display:flex;gap:6px;margin-left:auto;flex-wrap:wrap;">
          <button class="admin-sort-btn active" data-sort="newest"       style="${adminFilterBtnStyle(true)}">Newest</button>
          <button class="admin-sort-btn" data-sort="mostFlagged"         style="${adminFilterBtnStyle(false)}">Most Flagged</button>
        </div>
      </div>
      <div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
        <input id="adminSearchInput" type="text" placeholder="Search posts…"
          style="width:100%;padding:9px 13px;background:#141418;
          border:1px solid rgba(255,255,255,0.08);border-radius:10px;
          color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.85rem;
          box-sizing:border-box;outline:none;"/>
      </div>
      <div id="adminPostList" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
    </div>

    <!-- PAGES PANEL (hidden by default) -->
    <div id="adminPanelPages" style="flex:1;display:none;flex-direction:column;overflow:hidden;">
      <div style="
        padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);
        flex-shrink:0;
      ">
        <p style="font-family:'Space Mono',monospace;font-size:0.55rem;color:#707078;
          text-transform:uppercase;letter-spacing:1px;margin:0;">
          Edit page content — changes go live instantly
        </p>
      </div>

      <!-- Page selector tabs -->
      <div style="display:flex;gap:6px;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;flex-wrap:wrap;">
        <button class="page-tab-btn active" data-page="about"   style="${adminFilterBtnStyle(true)}">About</button>
        <button class="page-tab-btn"        data-page="privacy" style="${adminFilterBtnStyle(false)}">Privacy</button>
        <button class="page-tab-btn"        data-page="terms"   style="${adminFilterBtnStyle(false)}">Terms</button>
        <button class="page-tab-btn"        data-page="contact" style="${adminFilterBtnStyle(false)}">Contact</button>
      </div>

      <!-- Editor area -->
      <div style="flex:1;overflow-y:auto;padding:20px;">
        <div id="pageEditorWrap" style="max-width:700px;margin:0 auto;">

          <!-- Effective date (for privacy/terms) -->
          <div id="pageDateRow" style="margin-bottom:14px;display:none;">
            <label style="font-family:'Space Mono',monospace;font-size:0.55rem;color:#A0A0A8;
              text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;">
              Effective Date
            </label>
            <input id="pageEffectiveDate" type="text" placeholder="e.g. January 2025"
              style="width:100%;padding:9px 13px;background:#141418;
              border:1px solid rgba(255,255,255,0.08);border-radius:10px;
              color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.85rem;
              box-sizing:border-box;outline:none;"/>
          </div>

          <!-- Content editor -->
          <label style="font-family:'Space Mono',monospace;font-size:0.55rem;color:#A0A0A8;
            text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px;">
            Page Content (HTML supported)
          </label>
          <textarea id="pageContentEditor"
            style="width:100%;min-height:340px;padding:14px;background:#141418;
            border:1px solid rgba(255,255,255,0.08);border-radius:12px;
            color:#F0F0F0;font-family:'DM Sans',sans-serif;font-size:0.88rem;
            line-height:1.6;box-sizing:border-box;outline:none;resize:vertical;
            border-color:rgba(232,197,71,0.12);"
            placeholder="Write your page content here. Basic HTML like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;strong&gt;, &lt;a&gt; is supported.">
          </textarea>

          <!-- Preview toggle -->
          <div style="margin-top:10px;margin-bottom:16px;">
            <button id="previewToggleBtn" style="
              padding:7px 16px;background:transparent;
              border:1px solid rgba(255,255,255,0.1);border-radius:8px;
              color:#707078;font-family:'Space Mono',monospace;font-size:0.5rem;
              text-transform:uppercase;letter-spacing:0.8px;cursor:pointer;">
              Preview ↓
            </button>
          </div>

          <!-- Live preview -->
          <div id="pagePreviewBox" style="
            display:none;
            background:#0f0f11;border:1px solid rgba(232,197,71,0.1);
            border-radius:12px;padding:24px;margin-bottom:20px;
            font-family:'DM Sans',sans-serif;font-size:0.95rem;
            line-height:1.75;color:rgba(240,240,240,0.72);
          "></div>

          <!-- Save button -->
          <div style="display:flex;gap:10px;align-items:center;">
            <button id="savePageBtn" style="
              padding:13px 28px;background:#E8C547;color:#0B0B0D;
              border:none;border-radius:10px;font-family:'DM Sans',sans-serif;
              font-weight:700;font-size:0.88rem;cursor:pointer;transition:opacity 0.18s;">
              Save &amp; Publish
            </button>
            <span id="pageSaveStatus" style="
              font-family:'Space Mono',monospace;font-size:0.55rem;
              text-transform:uppercase;letter-spacing:1px;color:#4ade80;
              display:none;">
              ✓ Saved
            </span>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ── Wire top bar ──
  document.getElementById('adminCloseBtn').onclick   = () => modal.remove();
  document.getElementById('adminSignOutBtn').onclick = async () => {
    await firebaseAuth?.signOut();
    adminMode = false; adminUser = null;
    modal.remove(); showToast('Signed out');
  };

  // ── Main tab switching (Posts / Pages) ──
  modal.querySelectorAll('[data-tab]').forEach(btn => {
    btn.onclick = () => {
      _adminActiveTab = btn.dataset.tab;
      modal.querySelectorAll('[data-tab]').forEach(b => b.style.cssText = adminMainTabStyle(false));
      btn.style.cssText = adminMainTabStyle(true);
      document.getElementById('adminPanelPosts').style.display = _adminActiveTab === 'posts' ? 'flex' : 'none';
      document.getElementById('adminPanelPages').style.display = _adminActiveTab === 'pages' ? 'flex' : 'none';
      document.getElementById('adminPanelFeatured').style.display = _adminActiveTab === 'featured' ? 'flex' : 'none';
      if (_adminActiveTab === 'featured') loadFeaturedLyricAdmin();
    };
  });

  // ── Posts filters ──
  document.getElementById('adminSearchInput').oninput = e => {
    adminSearch = e.target.value.trim().toLowerCase();
    renderAdminPosts();
  };
  modal.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.admin-filter-btn').forEach(b => {
        b.style.cssText = adminFilterBtnStyle(false); b.classList.remove('active');
      });
      btn.style.cssText = adminFilterBtnStyle(true); btn.classList.add('active');
      adminFilter = btn.dataset.filter;
      renderAdminPosts();
    };
  });
  modal.querySelectorAll('.admin-sort-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.admin-sort-btn').forEach(b => {
        b.style.cssText = adminFilterBtnStyle(false); b.classList.remove('active');
      });
      btn.style.cssText = adminFilterBtnStyle(true); btn.classList.add('active');
      adminSort = btn.dataset.sort;
      renderAdminPosts();
    };
  });

  // ── Pages CMS ──
  let currentPage = 'about';
  initPageEditor(currentPage);

  // Wire featured lyric save button
  const featSaveBtn = document.getElementById("featuredLyricSave");
  if (featSaveBtn) featSaveBtn.onclick = saveFeaturedLyric;

  modal.querySelectorAll('.page-tab-btn').forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll('.page-tab-btn').forEach(b => {
        b.style.cssText = adminFilterBtnStyle(false); b.classList.remove('active');
      });
      btn.style.cssText = adminFilterBtnStyle(true); btn.classList.add('active');
      currentPage = btn.dataset.page;
      initPageEditor(currentPage);
    };
  });

  // Preview toggle
  document.getElementById('previewToggleBtn').onclick = () => {
    const box = document.getElementById('pagePreviewBox');
    const editor = document.getElementById('pageContentEditor');
    const btn  = document.getElementById('previewToggleBtn');
    if (box.style.display === 'none') {
      box.innerHTML = editor.value;
      box.style.display = 'block';
      btn.textContent = 'Hide Preview ↑';
    } else {
      box.style.display = 'none';
      btn.textContent = 'Preview ↓';
    }
  };

  // Save button
  document.getElementById('savePageBtn').onclick = () => savePageContent(currentPage);

  renderAdminPosts();
}

// ── Page editor: load existing content from Firebase ──
function initPageEditor(page) {
  const editor   = document.getElementById('pageContentEditor');
  const dateRow  = document.getElementById('pageDateRow');
  const dateInput= document.getElementById('pageEffectiveDate');
  const preview  = document.getElementById('pagePreviewBox');
  const status   = document.getElementById('pageSaveStatus');
  if (!editor) return;

  dateRow.style.display = (page === 'privacy' || page === 'terms') ? 'block' : 'none';

  preview.style.display = 'none';
  document.getElementById('previewToggleBtn').textContent = 'Preview ↓';
  status.style.display = 'none';
  editor.value = '';
  dateInput.value = '';
  editor.placeholder = 'Loading…';

  if (!isFirebaseEnabled) {
    editor.placeholder = 'Firebase not connected';
    return;
  }

  firebase.database().ref(`pages/${page}`).once('value').then(snap => {
    const data = snap.val();
    if (data) {
      if (typeof data === 'string') {
        editor.value = data;
      } else {
        editor.value = data.content || '';
        if (data.date) dateInput.value = data.date;
      }
    }
    editor.placeholder = 'Write page content here. HTML supported: <p>, <h2>, <ul>, <li>, <strong>, <a href="">.';
  }).catch(() => {
    editor.placeholder = 'Could not load content.';
  });
}

// ── Featured lyric admin load ──
function loadFeaturedLyricAdmin() {
  firebase.database().ref("adminConfig/featuredLyric").once("value").then(snap => {
    const data = snap.val();
    if (!data) return;
    const textEl   = document.getElementById("featuredLyricText");
    const artistEl = document.getElementById("featuredLyricArtist");
    const songEl   = document.getElementById("featuredLyricSong");
    if (textEl && data.text)     textEl.value   = data.text;
    if (artistEl && data.artist) artistEl.value = data.artist;
    if (songEl && data.song)     songEl.value   = data.song;
  }).catch(() => {});
}

// ── Featured lyric save (wired in openAdminPanel) ──
function saveFeaturedLyric() {
  const text   = document.getElementById("featuredLyricText")?.value.trim();
  const artist = document.getElementById("featuredLyricArtist")?.value.trim();
  const song   = document.getElementById("featuredLyricSong")?.value.trim();
  const status = document.getElementById("featuredLyricStatus");
  if (!text) { if (status) status.textContent = "Lyric text is required."; return; }
  firebase.database().ref("adminConfig/featuredLyric").set({ text, artist: artist||"", song: song||"", updatedAt: Date.now() })
    .then(() => {
      if (status) { status.style.color = "#4ade80"; status.textContent = "✓ Saved — live on landing page"; }
      const textEl = document.getElementById("heroFeaturedText");
      const attrEl = document.getElementById("heroFeaturedAttr");
      if (textEl) textEl.textContent = text;
      if (attrEl) attrEl.textContent = (artist||"") + (song ? " · " + song : "");
    })
    .catch(e => { if (status) { status.style.color = "#ff6060"; status.textContent = "Error: " + e.message; } });
}

// ── Save page content to Firebase ──
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
  status.style.display = 'none';

  const payload = (page === 'privacy' || page === 'terms')
    ? { content, date: dateInput.value.trim() || 'January 2025' }
    : content;

  try {
    await firebase.database().ref(`pages/${page}`).set(payload);
    saveBtn.textContent  = 'Save & Publish';
    saveBtn.disabled     = false;
    status.style.display = 'inline';
    showToast(`${page.charAt(0).toUpperCase() + page.slice(1)} page updated ✓`);
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  } catch(err) {
    saveBtn.textContent = 'Save & Publish';
    saveBtn.disabled    = false;
    showToast('Error saving: ' + err.message);
  }
}

// ── Style helpers ──
function adminMainTabStyle(active) {
  return `padding:12px 24px;border:none;background:transparent;cursor:pointer;
    font-family:'Space Mono',monospace;font-size:0.55rem;font-weight:700;
    text-transform:uppercase;letter-spacing:1.2px;transition:all 0.18s;
    border-bottom:2px solid ${active ? '#E8C547' : 'transparent'};
    color:${active ? '#E8C547' : '#707078'};`;
}

function adminFilterBtnStyle(active) {
  return `padding:6px 13px;border-radius:50px;cursor:pointer;
    font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    text-transform:uppercase;letter-spacing:0.8px;transition:all 0.18s;
    ${active
      ? 'background:rgba(232,197,71,0.1);border:1px solid rgba(232,197,71,0.3);color:#E8C547;'
      : 'background:transparent;border:1px solid rgba(255,255,255,0.08);color:#707078;'}`;
}

// ── Posts list ──
function getAdminPosts() {
  let list = [...posts];
  if (adminFilter !== 'all') list = list.filter(p => (p.status || 'active') === adminFilter);
  if (adminSearch) {
    list = list.filter(p =>
      (p.text || '').toLowerCase().includes(adminSearch)
      || (p.knowledge?.song   || '').toLowerCase().includes(adminSearch)
      || (p.knowledge?.artist || '').toLowerCase().includes(adminSearch)
      || (p.emotion || '').toLowerCase().includes(adminSearch)
    );
  }
  if (adminSort === 'mostFlagged') {
    list.sort((a, b) => (b.flagCount || 0) - (a.flagCount || 0));
  } else {
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }
  return list;
}

function renderAdminPosts() {
  const container = document.getElementById('adminPostList');
  const badge     = document.getElementById('adminPostBadge');
  if (!container) return;

  const list = getAdminPosts();
  if (badge) badge.textContent = `${list.length} post${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;
      font-family:'Space Mono',monospace;font-size:0.6rem;color:#707078;
      text-transform:uppercase;letter-spacing:1px;">No posts found</div>`;
    return;
  }

  container.innerHTML = '';
  list.forEach(post => {
    const an      = postAnalytics[post.id] || {};
    const views   = an.views || 0;
    const guesses = Object.keys(an.guesses || {}).length;
    const helps   = Object.keys(an.helps   || {}).length;
    const status  = post.status || 'active';
    const flags   = post.flagCount || 0;
    const k       = post.knowledge || { song: 'Unknown', artist: 'Unknown' };

    const statusColor = status === 'hidden'  ? '#707078'
                      : status === 'flagged' ? '#ffc847'
                      : '#4ade80';

    const card = document.createElement('div');
    card.style.cssText = `
      background:#141418;border:1px solid rgba(255,255,255,0.06);
      border-radius:14px;padding:16px;margin-bottom:10px;
      ${status === 'hidden'  ? 'opacity:0.55;' : ''}
      ${status === 'flagged' ? 'border-color:rgba(255,200,71,0.2);' : ''}
    `;
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">
        <div style="font-family:'DM Serif Display',serif;font-style:italic;
          font-size:0.95rem;color:#F0F0F0;line-height:1.5;flex:1;">${post.text || ''}</div>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;
          padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;
          flex-shrink:0;background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}40;">
          ${status}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
        <span style="font-family:'Space Mono',monospace;font-size:0.5rem;color:#A0A0A8;font-weight:700;">
          ${k.song} — ${k.artist}</span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#707078;">${post.emotion || ''}</span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#707078;">${timeAgo(post.timestamp)}</span>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#A0A0A8;">👁 ${views}</span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#A0A0A8;">🎯 ${guesses}</span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;color:#A0A0A8;">🔍 ${helps}</span>
        <span style="font-family:'Space Mono',monospace;font-size:0.48rem;
          color:${flags > 0 ? '#ffc847' : '#707078'};">🚩 ${flags}</span>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:${post.echoes ? '14px' : '0'};">
        ${status !== 'hidden'
          ? `<button onclick="adminHidePost('${post.id}')"   style="${adminActionBtnStyle('#707078')}">Hide</button>`
          : `<button onclick="adminUnhidePost('${post.id}')" style="${adminActionBtnStyle('#4ade80')}">Unhide</button>`}
        ${flags > 0
          ? `<button onclick="adminClearFlags('${post.id}')" style="${adminActionBtnStyle('#ffc847')}">Clear Flags</button>`
          : ''}
        <button onclick="adminDeletePost('${post.id}')" style="${adminActionBtnStyle('#ff6464')}">Delete</button>
      </div>
      <div id="echoes-${post.id}" style="margin-top:4px;"></div>
    `;
    container.appendChild(card);

    // Load and render echoes for this post
    renderAdminEchoes(post.id, post.echoes || null);
  });
}

// ── Render echoes (replies) under a post card ──
function renderAdminEchoes(postId, echoesData) {
  const wrap = document.getElementById(`echoes-${postId}`);
  if (!wrap) return;

  // If echoes already in memory (from posts array), use them
  if (echoesData) {
    _displayAdminEchoes(postId, wrap, echoesData);
    return;
  }

  // Otherwise fetch from Firebase
  if (!isFirebaseEnabled) return;
  postsRef.child(postId).child('echoes').once('value').then(snap => {
    const data = snap.val();
    if (data) _displayAdminEchoes(postId, wrap, data);
  }).catch(() => {});
}

function _displayAdminEchoes(postId, wrap, echoesData) {
  const echoList = Object.entries(echoesData).map(([id, val]) => ({ id, ...val }));
  if (!echoList.length) return;

  echoList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const header = document.createElement('div');
  header.style.cssText = `
    font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;
    text-transform:uppercase;letter-spacing:1px;color:#707078;
    margin-bottom:8px;padding-top:12px;
    border-top:1px solid rgba(255,255,255,0.05);
  `;
  header.textContent = `${echoList.length} Echo${echoList.length !== 1 ? 's' : ''}`;
  wrap.appendChild(header);

  echoList.forEach(echo => {
    const echoStatus = echo.status || 'active';
    const echoCard   = document.createElement('div');
    echoCard.id      = `echo-card-${postId}-${echo.id}`;
    echoCard.style.cssText = `
      background:#0f0f11;border:1px solid rgba(255,255,255,0.04);
      border-radius:10px;padding:11px 13px;margin-bottom:7px;
      ${echoStatus === 'hidden' ? 'opacity:0.45;' : ''}
    `;

    const songLine = (echo.song)
      ? `<span style="font-family:'Space Mono',monospace;font-size:0.45rem;color:#707078;display:block;margin-top:4px;">
           ${echo.song}${echo.artist ? ' — ' + echo.artist : ''}
         </span>`
      : '';

    const usernameLabel = echo.username
      ? `<span style="font-family:'Space Mono',monospace;font-size:0.44rem;color:#505058;display:block;margin-top:2px;">@${echo.username}</span>`
      : '';

    echoCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
        <div style="flex:1;">
          <div style="font-family:'DM Sans',sans-serif;font-size:0.85rem;
            color:${echoStatus === 'hidden' ? '#707078' : '#D0D0D0'};line-height:1.45;">
            "${echo.lyric || ''}"
          </div>
          ${songLine}
          ${usernameLabel}
          <span style="font-family:'Space Mono',monospace;font-size:0.44rem;color:#505058;
            display:block;margin-top:4px;">${timeAgo(echo.timestamp)}</span>
        </div>
        <span style="font-family:'Space Mono',monospace;font-size:0.44rem;font-weight:700;
          padding:2px 7px;border-radius:20px;text-transform:uppercase;flex-shrink:0;
          ${echoStatus === 'hidden'
            ? 'background:rgba(112,112,120,0.1);color:#707078;border:1px solid rgba(112,112,120,0.3);'
            : 'background:rgba(74,222,128,0.08);color:#4ade80;border:1px solid rgba(74,222,128,0.25);'}">
          ${echoStatus}
        </span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${echoStatus !== 'hidden'
          ? `<button onclick="adminHideEcho('${postId}','${echo.id}')"   style="${adminActionBtnStyle('#707078')}">Hide</button>`
          : `<button onclick="adminUnhideEcho('${postId}','${echo.id}')" style="${adminActionBtnStyle('#4ade80')}">Unhide</button>`}
        <button onclick="adminDeleteEcho('${postId}','${echo.id}')" style="${adminActionBtnStyle('#ff6464')}">Delete</button>
      </div>
    `;
    wrap.appendChild(echoCard);
  });
}

function adminActionBtnStyle(color) {
  return `padding:7px 14px;border-radius:8px;cursor:pointer;
    font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    text-transform:uppercase;letter-spacing:0.8px;
    background:${color}14;border:1px solid ${color}40;color:${color};transition:all 0.18s;`;
}

// ── Post moderation actions ──
async function adminHidePost(postId) {
  if (!isFirebaseEnabled) return;
  try { await postsRef.child(postId).update({ status: 'hidden' }); showToast('Post hidden'); renderAdminPosts(); renderFeed(); }
  catch (e) { showToast('Error: ' + e.message); }
}
async function adminUnhidePost(postId) {
  if (!isFirebaseEnabled) return;
  try { await postsRef.child(postId).update({ status: 'active' }); showToast('Post restored'); renderAdminPosts(); renderFeed(); }
  catch (e) { showToast('Error: ' + e.message); }
}
async function adminDeletePost(postId) {
  if (!window.confirm('Permanently delete this post? This cannot be undone.')) return;
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).remove();
    await analyticsRef.child(postId).remove();
    showToast('Post deleted'); renderAdminPosts(); renderFeed();
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminClearFlags(postId) {
  if (!isFirebaseEnabled) return;
  try { await postsRef.child(postId).update({ flagCount: 0, status: 'active' }); showToast('Flags cleared'); renderAdminPosts(); }
  catch (e) { showToast('Error: ' + e.message); }
}

// ── Echo (reply) moderation actions ──
async function adminHideEcho(postId, echoId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).child('echoes').child(echoId).update({ status: 'hidden' });
    showToast('Echo hidden');
    renderAdminPosts();
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminUnhideEcho(postId, echoId) {
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).child('echoes').child(echoId).update({ status: 'active' });
    showToast('Echo restored');
    renderAdminPosts();
  } catch (e) { showToast('Error: ' + e.message); }
}
async function adminDeleteEcho(postId, echoId) {
  if (!window.confirm('Permanently delete this echo? This cannot be undone.')) return;
  if (!isFirebaseEnabled) return;
  try {
    await postsRef.child(postId).child('echoes').child(echoId).remove();
    showToast('Echo deleted');
    renderAdminPosts();
  } catch (e) { showToast('Error: ' + e.message); }
}
