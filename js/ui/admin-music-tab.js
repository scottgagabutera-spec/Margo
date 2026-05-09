/* ══════════════════════════════════════════════════════════════
   MARGO — admin.js ADDITION: Music Tab
   Paste this entire block at the END of admin.js (after the
   _adminActionStyle function). Then apply the 3 HTML patches
   described in the comments below.
   ══════════════════════════════════════════════════════════════

   HTML PATCH 1 — In openAdminPanel(), find the tabs row:
   <button id="tabFeatured" ...>Featured</button>
   Add after it:
   <button id="tabMusic" style="${_adminTabStyle(false)}" data-tab="music">Music</button>

   HTML PATCH 2 — In openAdminPanel(), find adminPanelFeatured div end </div>
   and ADD after it:

   <div id="adminPanelMusic" style="flex:1;display:none;flex-direction:column;overflow:hidden;">
     <div style="padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;
       display:flex;justify-content:space-between;align-items:center;">
       <p style="font-family:'Lora',serif;font-size:0.6rem;color:var(--text-3);
         text-transform:uppercase;letter-spacing:1px;margin:0;">
         Manage songs — add, edit, reorder. Live instantly on /music
       </p>
       <button id="addSongBtn" style="padding:10px 18px;background:var(--gold);color:var(--bg);
         border:none;border-radius:10px;font-family:'Lora',serif;font-size:0.6rem;
         font-weight:700;text-transform:uppercase;letter-spacing:0.8px;cursor:pointer;
         min-height:44px;">+ Add Song</button>
     </div>
     <div id="adminSongList" style="flex:1;overflow-y:auto;padding:16px 20px;"></div>
   </div>

   HTML PATCH 3 — In the tab switch handler (modal.querySelectorAll('[data-tab]')):
   Add this case to the display toggling:
   document.getElementById('adminPanelMusic').style.display = _adminActiveTab === 'music' ? 'flex' : 'none';
   if (_adminActiveTab === 'music') loadAdminSongs();

   ══════════════════════════════════════════════════════════════ */

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
      ${_songField('songFYTId',    'YouTube Video ID',      song?.youtubeId   || '', 'text',     'e.g. dQw4w9WgXcQ (from youtube.com/watch?v=...)')}
      ${_songField('songFArtwork', 'Artwork URL',           song?.artwork     || '', 'url',      'https://... (square image preferred)')}
      ${_songField('songFAudioUrl', 'Audio URL (R2)',    song?.audioUrl    || '', 'url',      'https://audio.trymargo.com/Margo/audio/filename.wav')}
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
        ${_songField('songFAPUrl',    'Apple Music URL',song?.appleMusicUrl || '', 'url', 'https://music.apple.com/...')}
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
      youtubeId:      document.getElementById('songFYTId').value.trim()    || null,
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
      audioUrl:       document.getElementById('songFAudioUrl').value.trim() || null,
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
