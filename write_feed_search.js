const fs = require('fs');

// 1. Add search button to feed header in index.html
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  '<div class="feed-header-right"><div id="headerUsernamePill" style="display:none"></div><button id="dropLyricFAB"',
  '<div class="feed-header-right"><button id="feedSearchBtn" class="feed-search-btn" aria-label="Search lyrics"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></button><div id="headerUsernamePill" style="display:none"></div><button id="dropLyricFAB"'
);

// Add search overlay after feed header
html = html.replace(
  '<div class="new-posts-bar" id="newPostsIndicator">',
  `<div id="feedSearchOverlay" class="feed-search-overlay hidden">
    <div class="feed-search-bar">
      <svg class="feed-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input id="feedSearchInput" class="feed-search-input" type="text" placeholder="Search lyrics, songs, artists…" autocomplete="off" spellcheck="false"/>
      <button id="feedSearchClear" class="feed-search-clear hidden">×</button>
    </div>
    <div id="feedSearchResults" class="feed-search-results"></div>
  </div>
  <div class="new-posts-bar" id="newPostsIndicator">`
);

fs.writeFileSync('index.html', html);
console.log('index.html updated');

// 2. Add CSS to feed.css
let css = fs.readFileSync('assets/css/feed.css', 'utf8');
css += `
/* ── Feed Search ── */
.feed-search-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 50%;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: all 0.18s;
  flex-shrink: 0;
}
.feed-search-btn:hover {
  border-color: rgba(232,197,71,0.4);
  color: #E8C547;
  background: rgba(232,197,71,0.06);
}
.feed-search-btn.active {
  border-color: rgba(232,197,71,0.6);
  color: #E8C547;
  background: rgba(232,197,71,0.08);
}

.feed-search-overlay {
  position: absolute;
  top: 56px;
  left: 0; right: 0;
  z-index: 99;
  background: rgba(7,6,10,0.97);
  backdrop-filter: blur(28px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  transform: translateY(-8px);
  opacity: 0;
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16,1,0.3,1);
  pointer-events: none;
}
.feed-search-overlay.hidden {
  display: none;
}
.feed-search-overlay.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.feed-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.feed-search-icon {
  color: rgba(232,197,71,0.5);
  flex-shrink: 0;
}
.feed-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #F4F1ED;
  font-family: var(--font-ui, 'DM Sans', sans-serif);
  font-size: 0.95rem;
  caret-color: #E8C547;
}
.feed-search-input::placeholder {
  color: rgba(255,255,255,0.25);
}
.feed-search-clear {
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}
.feed-search-clear:hover { color: #fff; }
.feed-search-clear.hidden { display: none; }

.feed-search-results {
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px 0;
}
.feed-search-result-item {
  padding: 10px 18px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.feed-search-result-item:hover {
  background: rgba(232,197,71,0.05);
}
.feed-search-result-lyric {
  font-family: 'Instrument Serif', serif;
  font-size: 0.9rem;
  color: #F4F1ED;
  line-height: 1.4;
  margin-bottom: 4px;
}
.feed-search-result-meta {
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 0.6rem;
  color: rgba(232,197,71,0.55);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.feed-search-highlight {
  color: #E8C547;
  font-style: normal;
}
.feed-search-empty {
  padding: 24px 18px;
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
  color: rgba(255,255,255,0.25);
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
}
@media(max-width:600px){
  .feed-search-overlay { top: 50px; }
}
`;
fs.writeFileSync('assets/css/feed.css', css);
console.log('feed.css updated');

// 3. Add JS to a new file
const searchJS = `
/* ── Feed Search ── */
function initFeedSearch() {
  var btn = document.getElementById('feedSearchBtn');
  var overlay = document.getElementById('feedSearchOverlay');
  var input = document.getElementById('feedSearchInput');
  var clear = document.getElementById('feedSearchClear');
  var results = document.getElementById('feedSearchResults');
  if (!btn || !overlay || !input) return;

  var searchTimer = null;

  btn.addEventListener('click', function() {
    var isOpen = overlay.classList.contains('open');
    if (isOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  input.addEventListener('input', function() {
    var val = input.value.trim();
    clear.classList.toggle('hidden', !val);
    clearTimeout(searchTimer);
    if (!val) { results.innerHTML = ''; return; }
    searchTimer = setTimeout(function() { runFeedSearch(val); }, 200);
  });

  clear.addEventListener('click', function() {
    input.value = '';
    clear.classList.add('hidden');
    results.innerHTML = '';
    input.focus();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSearch();
  });

  document.addEventListener('pointerdown', function(e) {
    if (!overlay.contains(e.target) && e.target !== btn) closeSearch();
  });

  function openSearch() {
    overlay.classList.remove('hidden');
    btn.classList.add('active');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.classList.add('open');
        input.focus();
      });
    });
  }

  function closeSearch() {
    overlay.classList.remove('open');
    btn.classList.remove('active');
    setTimeout(function() { overlay.classList.add('hidden'); }, 220);
    input.value = '';
    clear.classList.add('hidden');
    results.innerHTML = '';
  }

  function runFeedSearch(query) {
    if (typeof posts === 'undefined' || !posts.length) return;
    var q = query.toLowerCase();
    var matched = posts.filter(function(p) {
      var lyric = (p.text || '').toLowerCase();
      var song = (p.knowledge && p.knowledge.song ? p.knowledge.song : '').toLowerCase();
      var artist = (p.knowledge && p.knowledge.artist ? p.knowledge.artist : '').toLowerCase();
      return lyric.includes(q) || song.includes(q) || artist.includes(q);
    });

    if (!matched.length) {
      results.innerHTML = '<div class="feed-search-empty">No results found</div>';
      return;
    }

    results.innerHTML = '';
    matched.slice(0, 20).forEach(function(p) {
      var item = document.createElement('div');
      item.className = 'feed-search-result-item';
      var lyric = p.text || '';
      var song = p.knowledge && p.knowledge.song ? p.knowledge.song : '';
      var artist = p.knowledge && p.knowledge.artist ? p.knowledge.artist : '';
      var display = lyric.length > 80 ? lyric.substring(0, 80) + '…' : lyric;
      // Highlight match
      var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
      display = display.replace(re, '<em class="feed-search-highlight">$1</em>');
      item.innerHTML = '<div class="feed-search-result-lyric">' + display + '</div>'
        + '<div class="feed-search-result-meta">' + (song ? song : '') + (artist ? ' · ' + artist : '') + '</div>';
      item.addEventListener('click', function() {
        closeSearch();
        // Scroll to card in feed
        var idx = posts.findIndex(function(x) { return x.id === p.id; });
        if (idx !== -1 && typeof swipeGoTo === 'function') {
          swipeGoTo(idx);
        }
      });
      results.appendChild(item);
    });
  }
}
`;

fs.writeFileSync('js/ui/feed/search.js', searchJS);
console.log('js/ui/feed/search.js created');

// 4. Add script tag to index.html
let html2 = fs.readFileSync('index.html', 'utf8');
html2 = html2.replace(
  '<script src="js/ui/feed/landing.js"></script>',
  '<script src="js/ui/feed/landing.js"></script>\n  <script src="js/ui/feed/search.js"></script>'
);
fs.writeFileSync('index.html', html2);
console.log('script tag added to index.html');

// 5. Call initFeedSearch in goToFeed
let app = fs.readFileSync('js/core/app.js', 'utf8');
app = app.replace(
  'setArrows(true);',
  'setArrows(true);\n  if(typeof initFeedSearch===\"function\")initFeedSearch();'
);
fs.writeFileSync('js/core/app.js', app);
console.log('initFeedSearch called in goToFeed');

console.log('All done.');
