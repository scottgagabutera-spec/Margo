/* ── STATE ── */
let youtubeData     = null;
let geniusResult    = null;
let geniusTimer     = null;
let ytSuggestTimer  = null;
let ytFetchTimer    = null;
let lastGeniusQuery = '';

function initGeniusIdentify() {
  const textArea = document.getElementById('textInput');
  if (!textArea) return;
  textArea.addEventListener('input', () => {
    clearTimeout(geniusTimer);
    const val = textArea.value.trim();
    const songFilled = document.getElementById('songInput')?.value.trim();
    if (val.length >= 5 && !songFilled) {
      geniusTimer = setTimeout(() => {
        if (val === lastGeniusQuery) return;
        runGeniusSearch(val);
      }, 600);
    }
  });
}

async function runGeniusSearch(query) {
  lastGeniusQuery = query;
  document.getElementById('geniusResultsList')?.remove();
  try {
    const res  = await fetch(`/api/genius?lyric=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok || !data.results?.length) {
      return;
    }
    renderGeniusResults(data.results);
  } catch (err) {
  }
}

function renderGeniusResults(results) {
  document.getElementById('geniusResultsList')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'geniusResultsList';
  const label = document.createElement('div');
  label.className = 'genius-section-label';
  label.textContent = 'Select the right song';
  wrap.appendChild(label);
  const list = document.createElement('div');
  list.className = 'genius-results-list';
  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'genius-result-card';
    const songName   = decodeHTML(r.song);
    const artistName = decodeHTML(r.artist);
    card.innerHTML = `
      ${r.artwork ? `<img src="${r.artwork}" class="genius-art" alt=""/>` : `<div class="genius-art"></div>`}
      <div class="genius-info">
        <div class="genius-song">${songName}</div>
        <div class="genius-artist">${artistName}</div>
      </div>
      <span class="genius-use-tag">Use</span>
    `;
    card.onclick = () => selectGeniusResult({ ...r, song: songName, artist: artistName }, card);
    list.appendChild(card);
  });
  wrap.appendChild(list);
  const textArea = document.getElementById('textInput');
  if (textArea) textArea.parentNode.insertBefore(wrap, textArea.nextSibling);
}

function selectGeniusResult(result, card) {
  document.querySelectorAll('.genius-result-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  card.querySelector('.genius-use-tag').textContent = 'Selected';
  geniusResult = result;
  // Fetch full song details silently
  if (result.id) fetchGeniusDetail(result.id);
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   songEl.value   = result.song;
  if (artistEl) artistEl.value = result.artist;
  if (typeof updateComposerPreview === 'function') updateComposerPreview();
  // Mode is always share — no mode buttons to click
  currentMode = 'share';
  clearYoutubePreview();
  fetchYoutubeData(result.song, result.artist);
  setTimeout(() => { document.getElementById('geniusResultsList')?.remove(); }, 1000);
}

/* ============================================================
   YOUTUBE ENGINE
   ============================================================ */
function initYoutubeAutofetch() {
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (!songEl || !artistEl) return;

  if (!songEl.parentElement.classList.contains('song-input-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'song-input-wrap';
    songEl.parentNode.insertBefore(wrap, songEl);
    wrap.appendChild(songEl);
  }

  songEl.addEventListener('input', () => {
    clearTimeout(ytSuggestTimer);
    clearTimeout(ytFetchTimer);
    closeAutocomplete();
    const val = songEl.value.trim();
    if (val.length < 2) { clearYoutubePreview(); return; }
    ytSuggestTimer = setTimeout(() => fetchYoutubeSuggestions(val), 350);
  });

  songEl.addEventListener('blur', () => setTimeout(closeAutocomplete, 180));

  artistEl.addEventListener('input', () => {
    clearTimeout(ytFetchTimer);
    const song   = songEl.value.trim();
    const artist = artistEl.value.trim();
    if (song.length > 1 && artist.length > 1) {
      ytFetchTimer = setTimeout(() => fetchYoutubeData(song, artist), 700);
    }
  });
}

async function fetchYoutubeSuggestions(query) {
  try {
    const res  = await fetch(`/api/youtube?suggest=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok || !data.suggestions?.length) return;
    renderAutocomplete(data.suggestions);
  } catch (_) {}
}

function renderAutocomplete(suggestions) {
  closeAutocomplete();
  const songEl = document.getElementById('songInput');
  if (!songEl) return;
  const drop = document.createElement('div');
  drop.id = 'ytAutocomplete';
  drop.className = 'yt-autocomplete';
  suggestions.slice(0, 4).forEach(s => {
    const item = document.createElement('div');
    item.className = 'yt-ac-item';
    item.innerHTML = `
      ${s.thumbnail ? `<img src="${s.thumbnail}" class="yt-ac-thumb" alt=""/>` : `<div class="yt-ac-thumb"></div>`}
      <div style="flex:1;min-width:0">
        <div class="yt-ac-song">${decodeHTML(s.song)}</div>
        <div class="yt-ac-artist">${decodeHTML(s.artist)}</div>
      </div>
    `;
    item.onmousedown = (e) => { e.preventDefault(); selectAutocomplete(s); };
    drop.appendChild(item);
  });
  songEl.parentElement.appendChild(drop);
}

function selectAutocomplete(s) {
  closeAutocomplete();
  const songEl   = document.getElementById('songInput');
  const artistEl = document.getElementById('artistInput');
  if (songEl)   songEl.value   = decodeHTML(s.song);
  if (artistEl) artistEl.value = decodeHTML(s.artist);
  clearYoutubePreview();
  fetchYoutubeData(s.song, s.artist);
}

function closeAutocomplete() { document.getElementById('ytAutocomplete')?.remove(); }

async function fetchYoutubeData(song, artist) {
  const cleanSong   = song.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  const cleanArtist = artist.replace(/\s*feat\..*$/i, '').replace(/\s*ft\..*$/i, '').trim();
  showYtLoading();
  youtubeData = null;
  try {
    const res  = await fetch(`/api/youtube?song=${encodeURIComponent(cleanSong)}&artist=${encodeURIComponent(cleanArtist)}`);
    const data = await res.json();
    if (!res.ok || data.error || (!data.videoId && !data.thumbnail)) {
      clearYoutubePreview(); return;
    }
    youtubeData = data;
    renderYtCard(data);
  } catch (_) { clearYoutubePreview(); }
}

function showYtLoading() {
  clearYoutubePreview();
  const card = document.createElement('div');
  card.id = 'youtubePreview'; card.className = 'yt-card';
  card.innerHTML = `<div class="yt-loading"><span class="m-spinner"></span>Looking up on YouTube, Deezer, Apple Music…</div>`;
  insertAfterArtist(card);
}

function renderYtCard(data) {
  clearYoutubePreview();
  const source = data.source || 'youtube';
  const links = [];
  if (data.youtubeUrl)
    links.push(`<a href="${data.youtubeUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-yt">YouTube</a>`);
  if (data.deezerUrl)
    links.push(`<a href="${data.deezerUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-dz">Deezer</a>`);
  if (data.itunesUrl)
    links.push(`<a href="${data.itunesUrl}" target="_blank" rel="noopener" class="yt-listen-link yt-link-it">Apple Music</a>`);

  const sourceBadgeCls = source === 'youtube' ? 'yt-found-yt' : source === 'deezer' ? 'yt-found-dz' : 'yt-found-it';
  const thumb = data.thumbnail || data.thumbnailSm;

  const card = document.createElement('div');
  card.id = 'youtubePreview'; card.className = 'yt-card';
  card.innerHTML = `
    <div class="yt-card-inner">
      ${thumb ? `<div class="yt-thumb-wrap"><img src="${thumb}" class="yt-thumb" alt="${decodeHTML(data.title||'')}"/></div>` : ''}
      <div class="yt-info">
        <div class="yt-title">${decodeHTML(data.title || '')}</div>
        <div class="yt-channel">${decodeHTML(data.channel || data.collectionName || '')}</div>
        ${links.length ? `<div class="yt-links-row">${links.join('')}</div>` : ''}
      </div>
      <span class="yt-found-tag ${sourceBadgeCls}">Found</span>
    </div>
  `;
  insertAfterArtist(card);
  const ytLink = document.getElementById('youtubeLink');
  if (ytLink && !ytLink.value && data.videoId && data.youtubeUrl) ytLink.value = data.youtubeUrl;
}

function insertAfterArtist(el) {
  const artistEl = document.getElementById('artistInput');
  artistEl?.parentNode?.insertBefore(el, artistEl.nextSibling);
}

function clearYoutubePreview() {
  youtubeData = null;
  document.getElementById('youtubePreview')?.remove();
}

/* ============================================================
   COMPOSER INIT
   ============================================================ */

/* ============================================================
   GENIUS DETAIL ENGINE
   Fetches full song metadata silently after song selection
   ============================================================ */
async function fetchGeniusDetail(id) {
  try {
    const res  = await fetch(`/api/genius?id=${id}`);
    const data = await res.json();
    if (!res.ok || data.error) return;
    geniusResult = {
      ...geniusResult,
      album:           data.album           || null,
      releaseDate:     data.releaseDate      || null,
      featuredArtists: data.featuredArtists  || [],
      writers:         data.writers          || [],
      producers:       data.producers        || [],
    };
    console.log('[Genius detail]', geniusResult.song, '·', geniusResult.album, '·', geniusResult.writers);
  } catch (err) {
    console.warn('[Genius detail failed]', err.message);
  }
}
