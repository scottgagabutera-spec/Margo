const fs = require('fs');

// ── 1. index.html — inject search button + overlay ──
let html = fs.readFileSync('index.html', 'utf8');
if (html.indexOf('feedSearchBtn') === -1) {
  html = html.replace(
    '<div class="feed-header-right">',
    '<div class="feed-header-right">' +
    '<button id="feedSearchBtn" class="feed-search-icon-btn" aria-label="Search">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
    '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>' +
    '</button>' +
    '<div id="feedSearchOverlay" class="feed-search-overlay feed-search-hidden">' +
    '<input id="feedSearchInput" class="feed-search-input" placeholder="Search lyrics, songs, artists..." autocomplete="off"/>' +
    '<button id="feedSearchClose" class="feed-search-close">Cancel</button>' +
    '</div>'
  );
  fs.writeFileSync('index.html', html);
  console.log('index.html: search button injected');
} else {
  console.log('index.html: already has search, skipping');
}

// ── 2. feed.css — append search styles ──
let css = fs.readFileSync('assets/css/feed.css', 'utf8');
if (css.indexOf('feed-search-icon-btn') === -1) {
  css += '\n/* Feed Search */\n' +
    '.feed-search-icon-btn{background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:color 0.18s,background 0.18s;}\n' +
    '.feed-search-icon-btn:hover{color:#E8C547;background:rgba(232,197,71,0.08);}\n' +
    '.feed-search-overlay{position:absolute;top:0;left:0;right:0;height:56px;display:flex;align-items:center;gap:10px;padding:0 16px;background:rgba(7,6,10,0.97);backdrop-filter:blur(28px);z-index:200;opacity:1;transform:translateY(0);transition:opacity 0.2s ease,transform 0.2s ease;}\n' +
    '.feed-search-hidden{opacity:0;pointer-events:none;transform:translateY(-8px);}\n' +
    '.feed-search-input{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:8px 14px;color:#fff;font-size:0.85rem;outline:none;transition:border-color 0.2s,background 0.2s;}\n' +
    '.feed-search-input:focus{border-color:rgba(232,197,71,0.5);background:rgba(232,197,71,0.05);}\n' +
    '.feed-search-input::placeholder{color:rgba(255,255,255,0.25);}\n' +
    '.feed-search-close{background:none;border:none;color:rgba(232,197,71,0.8);font-size:0.8rem;font-family:var(--font-mono,monospace);font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;padding:4px 6px;white-space:nowrap;transition:color 0.18s;}\n' +
    '.feed-search-close:hover{color:#E8C547;}\n' +
    '.feed-search-results{position:absolute;top:56px;left:0;right:0;max-height:60vh;overflow-y:auto;background:rgba(11,10,14,0.98);backdrop-filter:blur(28px);border-bottom:1px solid rgba(255,255,255,0.07);z-index:199;}\n' +
    '.feed-search-result{display:flex;flex-direction:column;gap:3px;padding:13px 18px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.15s;}\n' +
    '.feed-search-result:hover{background:rgba(232,197,71,0.05);}\n' +
    '.feed-search-result-lyric{font-size:0.85rem;color:rgba(255,255,255,0.9);font-weight:500;line-height:1.4;}\n' +
    '.feed-search-result-meta{font-size:0.7rem;color:rgba(255,255,255,0.35);font-family:var(--font-mono,monospace);letter-spacing:1px;}\n' +
    '.feed-search-result-lyric mark{background:none;color:#E8C547;font-weight:700;}\n' +
    '.feed-search-empty{padding:24px 18px;text-align:center;font-family:var(--font-mono,monospace);font-size:0.65rem;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.2);}\n' +
    '@media(max-width:600px){.feed-search-overlay{height:50px;}.feed-search-results{top:50px;}}\n';
  fs.writeFileSync('assets/css/feed.css', css);
  console.log('feed.css: search styles added');
} else {
  console.log('feed.css: already has search styles, skipping');
}

// ── 3. js/ui/feed/search.js — search logic (regex built from string to avoid escaping issues) ──
const searchJS = [
  '/* Margo Feed Search */',
  '(function(){',
  '  var overlay, input, closeBtn, resultsEl, iconBtn;',
  '',
  '  function init(){',
  '    iconBtn  = document.getElementById("feedSearchBtn");',
  '    overlay  = document.getElementById("feedSearchOverlay");',
  '    input    = document.getElementById("feedSearchInput");',
  '    closeBtn = document.getElementById("feedSearchClose");',
  '    if (!iconBtn || !overlay || !input) return;',
  '    resultsEl = document.createElement("div");',
  '    resultsEl.className = "feed-search-results";',
  '    resultsEl.style.display = "none";',
  '    var header = document.getElementById("feedHeader");',
  '    if (header) header.appendChild(resultsEl);',
  '    iconBtn.addEventListener("click", openSearch);',
  '    closeBtn.addEventListener("click", closeSearch);',
  '    input.addEventListener("input", onInput);',
  '    document.addEventListener("keydown", function(e){ if(e.key==="Escape") closeSearch(); });',
  '  }',
  '',
  '  function openSearch(){',
  '    overlay.classList.remove("feed-search-hidden");',
  '    setTimeout(function(){ input.focus(); }, 150);',
  '  }',
  '',
  '  function closeSearch(){',
  '    overlay.classList.add("feed-search-hidden");',
  '    input.value = "";',
  '    resultsEl.style.display = "none";',
  '    resultsEl.innerHTML = "";',
  '  }',
  '',
  '  function highlight(text, q){',
  '    if (!text) return "";',
  '    var result = "";',
  '    var lower = text.toLowerCase();',
  '    var ql = q.toLowerCase();',
  '    var i = 0;',
  '    while (i < text.length) {',
  '      var idx = lower.indexOf(ql, i);',
  '      if (idx === -1) { result += text.slice(i); break; }',
  '      result += text.slice(i, idx) + "<mark>" + text.slice(idx, idx + q.length) + "</mark>";',
  '      i = idx + q.length;',
  '    }',
  '    return result;',
  '  }',
  '',
  '  function onInput(){',
  '    var q = input.value.trim();',
  '    if (q.length < 2) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; return; }',
  '    var posts = (typeof allPosts !== "undefined" ? allPosts : (typeof window.allPosts !== "undefined" ? window.allPosts : []));',
  '    if (!posts || posts.length === 0) {',
  '      resultsEl.innerHTML = "<div class=\\"feed-search-empty\\">No posts loaded yet</div>";',
  '      resultsEl.style.display = "block"; return;',
  '    }',
  '    var ql = q.toLowerCase();',
  '    var hits = posts.filter(function(p){',
  '      return (p.lyric  && p.lyric.toLowerCase().indexOf(ql)  !== -1) ||',
  '             (p.song   && p.song.toLowerCase().indexOf(ql)   !== -1) ||',
  '             (p.artist && p.artist.toLowerCase().indexOf(ql) !== -1);',
  '    }).slice(0, 20);',
  '    if (hits.length === 0) {',
  '      resultsEl.innerHTML = "<div class=\\"feed-search-empty\\">No results for &ldquo;" + q + "&rdquo;</div>";',
  '      resultsEl.style.display = "block"; return;',
  '    }',
  '    resultsEl.innerHTML = hits.map(function(p){',
  '      var lyric  = highlight(p.lyric  || "", q);',
  '      var song   = highlight(p.song   || "", q);',
  '      var artist = p.artist || "";',
  '      return "<div class=\\"feed-search-result\\" data-postid=\\"" + (p.id||"") + "\\">" +',
  '             "<span class=\\"feed-search-result-lyric\\">" + lyric + "</span>" +',
  '             "<span class=\\"feed-search-result-meta\\">" + song + (artist ? " &middot; " + artist : "") + "</span>" +',
  '             "</div>";',
  '    }).join("");',
  '    resultsEl.querySelectorAll(".feed-search-result").forEach(function(el){',
  '      el.addEventListener("click", function(){',
  '        var postId = el.getAttribute("data-postid");',
  '        closeSearch();',
  '        setTimeout(function(){',
  '          var card = document.querySelector("[data-postid=\\"" + postId + "\\"]");',
  '          if (card) card.scrollIntoView({behavior:"smooth", block:"center"});',
  '        }, 200);',
  '      });',
  '    });',
  '    resultsEl.style.display = "block";',
  '  }',
  '',
  '  if (document.readyState === "loading") {',
  '    document.addEventListener("DOMContentLoaded", init);',
  '  } else {',
  '    setTimeout(init, 700);',
  '  }',
  '})();'
].join('\n');

fs.writeFileSync('js/ui/feed/search.js', searchJS);
console.log('js/ui/feed/search.js: created');

// ── 4. index.html — add script tag ──
html = fs.readFileSync('index.html', 'utf8');
if (html.indexOf('feed/search.js') === -1) {
  html = html.replace('</body>', '<script src="js/ui/feed/search.js"></script>\n</body>');
  fs.writeFileSync('index.html', html);
  console.log('index.html: script tag added');
} else {
  console.log('index.html: script tag already present, skipping');
}

console.log('\nAll done.');
