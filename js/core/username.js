/* ============================================================
   MARGO — js/username.js
   Username system: Instrument#XXXX auto-assigned, 2 edits max,
   consistent color per name, reveal moment on first Lyric Back.
   v1.0
   ============================================================ */

const USERNAME_INSTRUMENTS = [
  'Guitar','Piano','Violin','Cello','Drums','Bass','Flute','Harp',
  'Trumpet','Sitar','Viola','Banjo','Saxophone','Clarinet','Ukulele',
  'Organ','Synth','Mandolin','Trombone'
];

const USERNAME_KEY       = 'margoAnonName';
const USERNAME_EDITS_KEY = 'margoNameEdits';
const USERNAME_REVEALED  = 'margoNameRevealed';
const USERNAME_MAX_EDITS = 2;

/* ── Instrument SVG icons (inline, one per instrument family) ── */
const INSTRUMENT_ICONS = {
  Guitar:    '♬', Piano:     '♪', Violin:    '🎻', Cello:     '🎻',
  Drums:     '🥁', Bass:      '♬', Flute:     '♩', Harp:      '♫',
  Trumpet:   '🎺', Sitar:     '♬', Viola:     '🎻', Banjo:     '♬',
  Saxophone: '🎷', Clarinet:  '♩', Ukulele:   '♬', Organ:     '♪',
  Synth:     '⌨', Mandolin:  '♬', Trombone:  '🎺'
};

/* ────────────────────────────────────────────────────────────
   CORE HELPERS
──────────────────────────────────────────────────────────── */

/** Generate a new random username */
function generateUsername() {
  const instrument = USERNAME_INSTRUMENTS[
    Math.floor(Math.random() * USERNAME_INSTRUMENTS.length)
  ];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${instrument}#${number}`;
}

/** Get or create the current user's username */
function getUsername() {
  let name = localStorage.getItem(USERNAME_KEY);
  if (!name) {
    name = generateUsername();
    localStorage.setItem(USERNAME_KEY, name);
    localStorage.setItem(USERNAME_EDITS_KEY, '0');
  }
  return name;
}

/** How many edits remain */
function getEditsRemaining() {
  const used = parseInt(localStorage.getItem(USERNAME_EDITS_KEY) || '0', 10);
  return Math.max(0, USERNAME_MAX_EDITS - used);
}

/** Whether the name is permanently locked */
function isUsernameLocked() {
  return getEditsRemaining() === 0;
}

/** Whether the user has seen their name for the first time */
function hasUsernameBeenRevealed() {
  return localStorage.getItem(USERNAME_REVEALED) === 'true';
}

/** Mark name as revealed (never show the reveal prompt again) */
function markUsernameRevealed() {
  localStorage.setItem(USERNAME_REVEALED, 'true');
}

/**
 * Attempt to set a new username.
 * Returns { success, reason } — reason is null on success.
 */
function setUsername(newName) {
  newName = newName.trim();
  if (!newName) return { success: false, reason: 'Name cannot be empty.' };
  if (newName.length > 32) return { success: false, reason: 'Name too long (max 32 chars).' };
  if (isUsernameLocked()) return { success: false, reason: 'Name is locked — no edits remaining.' };

  const used = parseInt(localStorage.getItem(USERNAME_EDITS_KEY) || '0', 10);
  localStorage.setItem(USERNAME_KEY, newName);
  localStorage.setItem(USERNAME_EDITS_KEY, String(used + 1));
  return { success: true, reason: null };
}

/* ────────────────────────────────────────────────────────────
   COLOR SYSTEM
   Derives a consistent HSL hue from the username string.
   Same name → same color, everywhere, always.
──────────────────────────────────────────────────────────── */

function getUsernameColor(name) {
  if (!name) name = getUsername();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  // Avoid muddy yellows (45-65) and keep saturation/lightness consistent
  const adjustedHue = hue >= 45 && hue <= 65 ? hue + 80 : hue;
  return {
    hue: adjustedHue,
    color:      `hsl(${adjustedHue}, 70%, 65%)`,
    colorDim:   `hsl(${adjustedHue}, 60%, 55%)`,
    colorBg:    `hsla(${adjustedHue}, 60%, 50%, 0.12)`,
    colorBorder:`hsla(${adjustedHue}, 60%, 50%, 0.28)`,
  };
}

/** Get just the instrument part of a username (before #) */
function getUsernameInstrument(name) {
  if (!name) name = getUsername();
  return name.split('#')[0] || name;
}

/** Get just the number part of a username (after #) */
function getUsernameNumber(name) {
  if (!name) name = getUsername();
  const parts = name.split('#');
  return parts[1] || '';
}

/* ────────────────────────────────────────────────────────────
   AVATAR ELEMENT
   Returns a styled <div> avatar for a given username.
──────────────────────────────────────────────────────────── */

function buildUsernameAvatar(name, size = 28) {
  if (!name) name = getUsername();
  const { color, colorBg } = getUsernameColor(name);
  const instrument = getUsernameInstrument(name);
  const icon = INSTRUMENT_ICONS[instrument] || '♪';

  const el = document.createElement('div');
  el.className = 'username-avatar';
  el.setAttribute('aria-label', name);
  el.style.cssText = `
    width:${size}px; height:${size}px; border-radius:50%;
    background:${colorBg}; border:1.5px solid ${color};
    display:flex; align-items:center; justify-content:center;
    font-size:${Math.round(size * 0.45)}px; flex-shrink:0;
    color:${color}; user-select:none;
  `;
  el.textContent = icon;
  return el;
}

/** Build a full username pill (avatar + name text) */
function buildUsernamePill(name, opts = {}) {
  if (!name) name = getUsername();
  const { color, colorBg, colorBorder } = getUsernameColor(name);
  const locked = (name === getUsername()) && isUsernameLocked();
  const size = opts.size || 20;

  const wrap = document.createElement('div');
  wrap.className = 'username-pill';
  wrap.style.cssText = `
    display:inline-flex; align-items:center; gap:6px;
    padding:4px 10px 4px 5px; border-radius:20px;
    background:${colorBg}; border:1px solid ${colorBorder};
  `;

  wrap.appendChild(buildUsernameAvatar(name, size));

  const text = document.createElement('span');
  text.className = 'username-pill-text';
  text.style.cssText = `
    font-family:'Space Mono',monospace; font-size:0.65rem; font-weight:700;
    color:${color}; letter-spacing:0.5px;
  `;
  text.textContent = name;
  wrap.appendChild(text);

  if (locked) {
    const lock = document.createElement('span');
    lock.className = 'username-lock-badge';
    lock.title = 'Name locked';
    lock.style.cssText = `font-size:0.6rem; color:${color}; opacity:0.7;`;
    lock.textContent = '🔒';
    wrap.appendChild(lock);
  }

  return wrap;
}

/* ────────────────────────────────────────────────────────────
   REVEAL MOMENT
   One-time prompt shown when user taps "Lyric Back" for the
   first time ever. Returns a Promise that resolves when dismissed.
──────────────────────────────────────────────────────────── */

function showUsernameReveal() {
  return new Promise((resolve) => {
    if (hasUsernameBeenRevealed()) { resolve('already-revealed'); return; }

    const name = getUsername();
    const { color, colorBg, colorBorder } = getUsernameColor(name);
    const instrument = getUsernameInstrument(name);
    const icon = INSTRUMENT_ICONS[instrument] || '♪';
    const editsLeft = getEditsRemaining();

    // Inject reveal styles once
    if (!document.getElementById('usernameRevealStyles')) {
      const s = document.createElement('style');
      s.id = 'usernameRevealStyles';
      s.textContent = `
        .username-reveal-backdrop {
          position:fixed; inset:0; z-index:900;
          background:rgba(0,0,0,0.82);
          backdrop-filter:blur(18px);
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          animation:urFadeIn 0.3s ease;
        }
        @keyframes urFadeIn { from{opacity:0} to{opacity:1} }

        .username-reveal-card {
          width:100%; max-width:360px;
          background:#111013;
          border:1px solid rgba(255,255,255,0.1);
          border-radius:28px;
          padding:36px 28px 28px;
          display:flex; flex-direction:column; align-items:center; gap:20px;
          text-align:center;
          box-shadow:0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,197,71,0.06) inset;
          animation:urSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes urSlideUp {
          from{opacity:0; transform:translateY(24px) scale(0.96)}
          to{opacity:1; transform:translateY(0) scale(1)}
        }

        .ur-avatar-wrap {
          position:relative;
          width:72px; height:72px;
        }
        .ur-avatar-ring {
          position:absolute; inset:-8px; border-radius:50%;
          border:1.5px solid var(--ur-color);
          animation:urRingPulse 2s ease-out infinite;
          opacity:0.5;
        }
        .ur-avatar-ring:nth-child(2) { inset:-16px; animation-delay:0.7s; opacity:0.25; }
        @keyframes urRingPulse {
          0%  { transform:scale(0.85); opacity:0.6; }
          100%{ transform:scale(1.15); opacity:0; }
        }
        .ur-avatar {
          width:72px; height:72px; border-radius:50%;
          background:var(--ur-color-bg); border:2px solid var(--ur-color);
          display:flex; align-items:center; justify-content:center;
          font-size:2rem; position:relative; z-index:2;
          box-shadow:0 0 24px var(--ur-color-bg);
        }

        .ur-label {
          font-family:'Space Mono',monospace;
          font-size:0.58rem; font-weight:700; letter-spacing:2px;
          text-transform:uppercase; color:rgba(255,255,255,0.35);
        }
        .ur-name {
          font-family:'Syne',sans-serif;
          font-size:1.6rem; font-weight:800; letter-spacing:-0.5px;
          color:var(--ur-color);
          animation:urNameReveal 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both;
        }
        @keyframes urNameReveal {
          from{opacity:0; transform:scale(0.88) translateY(8px)}
          to{opacity:1; transform:scale(1) translateY(0)}
        }
        .ur-sub {
          font-family:'DM Serif Display',serif;
          font-style:italic; font-size:0.88rem; line-height:1.5;
          color:rgba(255,255,255,0.4); max-width:240px;
        }
        .ur-edits-note {
          font-family:'Space Mono',monospace;
          font-size:0.52rem; font-weight:700; letter-spacing:1px;
          color:rgba(255,255,255,0.22); text-transform:uppercase;
        }
        .ur-actions {
          display:flex; flex-direction:column; gap:8px; width:100%;
        }
        .ur-btn-confirm {
          width:100%; padding:16px;
          background:var(--ur-color-bg); border:1px solid var(--ur-color);
          border-radius:14px; color:var(--ur-color);
          font-family:'Syne',sans-serif; font-weight:800; font-size:0.88rem;
          letter-spacing:1px; text-transform:uppercase;
          cursor:pointer; transition:all 0.22s cubic-bezier(0.16,1,0.3,1);
        }
        .ur-btn-confirm:hover {
          background:var(--ur-color); color:#0B0B0D;
          transform:translateY(-2px);
          box-shadow:0 8px 24px rgba(0,0,0,0.4);
        }
        .ur-btn-edit {
          width:100%; padding:12px;
          background:none; border:1px solid rgba(255,255,255,0.08);
          border-radius:12px; color:rgba(255,255,255,0.35);
          font-family:'Space Mono',monospace; font-size:0.58rem;
          font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
          cursor:pointer; transition:all 0.18s;
        }
        .ur-btn-edit:hover {
          border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.65);
        }
        .ur-btn-edit:disabled {
          opacity:0.3; cursor:default;
        }

        /* Inline edit field */
        .ur-edit-row {
          display:flex; gap:8px; width:100%;
          animation:urFadeIn 0.2s ease;
        }
        .ur-edit-input {
          flex:1; padding:11px 13px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:10px; color:#fff;
          font-family:'Space Mono',monospace; font-size:0.82rem;
          outline:none; transition:border-color 0.18s;
        }
        .ur-edit-input:focus {
          border-color:var(--ur-color);
          box-shadow:0 0 0 3px var(--ur-color-bg);
        }
        .ur-edit-save {
          padding:0 16px; border-radius:10px;
          background:var(--ur-color); border:none; color:#0B0B0D;
          font-family:'Syne',sans-serif; font-weight:800; font-size:0.75rem;
          cursor:pointer; transition:all 0.18s; white-space:nowrap;
        }
        .ur-edit-save:hover { filter:brightness(1.15); transform:scale(1.03); }
        .ur-error {
          font-family:'Space Mono',monospace; font-size:0.55rem;
          color:#ff6464; font-weight:700; letter-spacing:0.5px;
          animation:urFadeIn 0.15s ease;
        }
      `;
      document.head.appendChild(s);
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'username-reveal-backdrop';
    backdrop.style.setProperty('--ur-color', color);
    backdrop.style.setProperty('--ur-color-bg', colorBg);
    backdrop.style.setProperty('--ur-color-border', colorBorder);

    backdrop.innerHTML = `
      <div class="username-reveal-card">
        <div class="ur-avatar-wrap">
          <div class="ur-avatar-ring"></div>
          <div class="ur-avatar-ring"></div>
          <div class="ur-avatar" style="background:${colorBg};border-color:${color}">
            <span style="font-size:2rem">${icon}</span>
          </div>
        </div>
        <div>
          <div class="ur-label">You're about to drop a lyric as</div>
        </div>
        <div class="ur-name">${name}</div>
        <div class="ur-sub">This is your name on Margo.<br>It's yours — consistently, everywhere.</div>
        <div class="ur-edits-note" id="urEditsNote">${editsLeft} edit${editsLeft !== 1 ? 's' : ''} remaining</div>
        <div class="ur-actions" id="urActions">
          <button class="ur-btn-confirm" id="urConfirmBtn">That's me →</button>
          <button class="ur-btn-edit" id="urEditBtn" ${editsLeft === 0 ? 'disabled' : ''}>
            ${editsLeft > 0 ? 'Edit name (uses 1 edit)' : 'Name locked — no edits remaining'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    const confirmBtn = backdrop.querySelector('#urConfirmBtn');
    const editBtn    = backdrop.querySelector('#urEditBtn');
    const actionsEl  = backdrop.querySelector('#urActions');
    const editsNote  = backdrop.querySelector('#urEditsNote');
    const nameEl     = backdrop.querySelector('.ur-name');

    function dismiss(reason) {
      markUsernameRevealed();
      document.body.classList.remove('modal-open');
      backdrop.style.animation = 'urFadeIn 0.22s ease reverse forwards';
      setTimeout(() => backdrop.remove(), 240);
      resolve(reason);
    }

    confirmBtn.onclick = () => dismiss('confirmed');

    editBtn.onclick = () => {
      // Replace actions with inline edit row
      actionsEl.innerHTML = `
        <div class="ur-edit-row">
          <input class="ur-edit-input" id="urEditInput"
            type="text" maxlength="32"
            placeholder="Instrument#1234"
            value="${getUsername()}"/>
          <button class="ur-edit-save" id="urEditSave">Save</button>
        </div>
        <div class="ur-error" id="urEditError" style="display:none"></div>
        <button class="ur-btn-edit" id="urCancelEdit" style="margin-top:2px">Cancel</button>
      `;
      const input    = backdrop.querySelector('#urEditInput');
      const saveBtn  = backdrop.querySelector('#urEditSave');
      const errorEl  = backdrop.querySelector('#urEditError');
      const cancelBtn= backdrop.querySelector('#urCancelEdit');

      input.focus();
      input.select();

      saveBtn.onclick = () => {
        const result = setUsername(input.value);
        if (!result.success) {
          errorEl.textContent = result.reason;
          errorEl.style.display = 'block';
          return;
        }
        // Update display
        const newName = getUsername();
        nameEl.textContent = newName;
        const newLeft = getEditsRemaining();
        editsNote.textContent = newLeft === 0
          ? 'Name locked — no more edits'
          : `${newLeft} edit${newLeft !== 1 ? 's' : ''} remaining`;
        // Update colors
        const newColors = getUsernameColor(newName);
        backdrop.style.setProperty('--ur-color', newColors.color);
        backdrop.style.setProperty('--ur-color-bg', newColors.colorBg);
        // Restore actions
        actionsEl.innerHTML = `
          <button class="ur-btn-confirm" id="urConfirmBtn2">That's me →</button>
          ${newLeft > 0
            ? `<button class="ur-btn-edit" id="urEditBtn2">Edit name (${newLeft} edit${newLeft !== 1 ? 's' : ''} remaining)</button>`
            : `<button class="ur-btn-edit" disabled>Name locked — no edits remaining</button>`
          }
        `;
        backdrop.querySelector('#urConfirmBtn2').onclick = () => dismiss('confirmed-after-edit');
        if (newLeft > 0) {
          backdrop.querySelector('#urEditBtn2').onclick = editBtn.onclick;
        }
      };

      cancelBtn.onclick = () => {
        actionsEl.innerHTML = `
          <button class="ur-btn-confirm" id="urConfirmBtn3">That's me →</button>
          <button class="ur-btn-edit" id="urEditBtn3">Edit name (uses 1 edit)</button>
        `;
        backdrop.querySelector('#urConfirmBtn3').onclick = () => dismiss('confirmed');
        backdrop.querySelector('#urEditBtn3').onclick = editBtn.onclick;
      };

      input.onkeydown = (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
      };
    };
  });
}

/* ────────────────────────────────────────────────────────────
   SETTINGS PANEL WIDGET
   Embedded anywhere to let users edit their name with
   the remaining-edits constraint displayed clearly.
──────────────────────────────────────────────────────────── */

function buildUsernameSettingsWidget(onSave) {
  const name   = getUsername();
  const locked = isUsernameLocked();
  const left   = getEditsRemaining();
  const { color, colorBg, colorBorder } = getUsernameColor(name);

  const wrap = document.createElement('div');
  wrap.className = 'username-settings-widget';
  wrap.style.cssText = `
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:16px; padding:16px;
    display:flex; flex-direction:column; gap:12px;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; justify-content:space-between;';
  header.innerHTML = `
    <span style="font-family:'Space Mono',monospace;font-size:0.52rem;font-weight:700;
      color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:2px">
      Your Name
    </span>
    <span style="font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
      color:${locked ? '#ff6464' : color};letter-spacing:1px">
      ${locked ? '🔒 Locked' : `${left} edit${left !== 1 ? 's' : ''} left`}
    </span>
  `;
  wrap.appendChild(header);

  const pillRow = document.createElement('div');
  pillRow.style.cssText = 'display:flex; align-items:center; gap:10px;';
  pillRow.appendChild(buildUsernameAvatar(name, 32));
  const nameText = document.createElement('span');
  nameText.style.cssText = `
    font-family:'Syne',sans-serif; font-size:1.1rem; font-weight:800;
    color:${color}; letter-spacing:-0.2px;
  `;
  nameText.textContent = name;
  pillRow.appendChild(nameText);
  if (locked) {
    const lockBadge = document.createElement('span');
    lockBadge.style.cssText = 'font-size:0.9rem; margin-left:2px;';
    lockBadge.textContent = '🔒';
    pillRow.appendChild(lockBadge);
  }
  wrap.appendChild(pillRow);

  if (!locked) {
    const editRow = document.createElement('div');
    editRow.style.cssText = 'display:flex; gap:8px;';
    editRow.innerHTML = `
      <input id="usernameEditInput" type="text" maxlength="32"
        placeholder="${name}"
        style="flex:1;padding:10px 12px;background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.1);border-radius:10px;
        color:#fff;font-family:'Space Mono',monospace;font-size:0.78rem;
        outline:none;transition:border-color 0.18s"/>
      <button id="usernameEditSave"
        style="padding:0 14px;border-radius:10px;background:${colorBg};
        border:1px solid ${colorBorder};color:${color};
        font-family:'Syne',sans-serif;font-weight:800;font-size:0.72rem;
        cursor:pointer;transition:all 0.18s;white-space:nowrap;">
        Save
      </button>
    `;
    const input   = editRow.querySelector('#usernameEditInput');
    const saveBtn = editRow.querySelector('#usernameEditSave');
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
      font-family:'Space Mono',monospace; font-size:0.52rem;
      color:#ff6464; font-weight:700; display:none;
    `;

    saveBtn.onclick = () => {
      const result = setUsername(input.value);
      if (!result.success) {
        errorEl.textContent = result.reason;
        errorEl.style.display = 'block';
        return;
      }
      if (onSave) onSave(getUsername());
      // Rebuild widget in place
      const newWidget = buildUsernameSettingsWidget(onSave);
      wrap.replaceWith(newWidget);
    };
    input.onkeydown = e => { if (e.key === 'Enter') saveBtn.click(); };
    input.onfocus = () => {
      input.style.borderColor = color;
      input.style.boxShadow = `0 0 0 3px ${colorBg}`;
    };
    input.onblur = () => {
      input.style.borderColor = 'rgba(255,255,255,0.1)';
      input.style.boxShadow = 'none';
    };

    wrap.appendChild(editRow);
    wrap.appendChild(errorEl);
  }

  return wrap;
}

/* ── Expose globally ── */
window.MargoUsername = {
  get:               getUsername,
  set:               setUsername,
  generate:          generateUsername,
  getColor:          getUsernameColor,
  getInstrument:     getUsernameInstrument,
  getNumber:         getUsernameNumber,
  editsRemaining:    getEditsRemaining,
  isLocked:          isUsernameLocked,
  hasBeenRevealed:   hasUsernameBeenRevealed,
  markRevealed:      markUsernameRevealed,
  showReveal:        showUsernameReveal,
  buildAvatar:       buildUsernameAvatar,
  buildPill:         buildUsernamePill,
  buildSettingsWidget: buildUsernameSettingsWidget,
};

// Ensure username exists on load
getUsername();
