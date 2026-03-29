/* Margo Feed Search */
(function(){
  var overlay, input, closeBtn, resultsEl, iconBtn;

  function init(){
    iconBtn  = document.getElementById("feedSearchBtn");
    overlay  = document.getElementById("feedSearchOverlay");
    input    = document.getElementById("feedSearchOverlayInput");
    closeBtn = document.getElementById("feedSearchClose");
    if (!iconBtn || !overlay || !input) return;
    resultsEl = document.createElement("div");
    resultsEl.className = "feed-search-results";
    resultsEl.style.display = "none";
    var header = document.getElementById("feedHeader");
    if (header) header.appendChild(resultsEl);
    iconBtn.addEventListener("click", openSearch);
    closeBtn.addEventListener("click", closeSearch);
    input.addEventListener("input", onInput);
    document.addEventListener("keydown", function(e){ if(e.key==="Escape") closeSearch(); });
  }

  function openSearch(){
    overlay.classList.remove("feed-search-hidden");
    setTimeout(function(){ input.focus(); }, 150);
  }

  function closeSearch(){
    overlay.classList.add("feed-search-hidden");
    input.value = "";
    resultsEl.style.display = "none";
    resultsEl.innerHTML = "";
  }

  function highlight(text, q){
    if (!text) return "";
    var result = "";
    var lower = text.toLowerCase();
    var ql = q.toLowerCase();
    var i = 0;
    while (i < text.length) {
      var idx = lower.indexOf(ql, i);
      if (idx === -1) { result += text.slice(i); break; }
      result += text.slice(i, idx) + "<mark>" + text.slice(idx, idx + q.length) + "</mark>";
      i = idx + q.length;
    }
    return result;
  }

  function onInput(){
    var q = input.value.trim();
    if (q.length < 2) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; return; }
    var posts = (typeof allPosts !== "undefined" ? allPosts : (typeof window.allPosts !== "undefined" ? window.allPosts : []));
    if (!posts || posts.length === 0) {
      resultsEl.innerHTML = "<div class=\"feed-search-empty\">No posts loaded yet</div>";
      resultsEl.style.display = "block"; return;
    }
    var ql = q.toLowerCase();
    var hits = posts.filter(function(p){
      return (p.lyric  && p.lyric.toLowerCase().indexOf(ql)  !== -1) ||
             (p.song   && p.song.toLowerCase().indexOf(ql)   !== -1) ||
             (p.artist && p.artist.toLowerCase().indexOf(ql) !== -1);
    }).slice(0, 20);
    if (hits.length === 0) {
      resultsEl.innerHTML = "<div class=\"feed-search-empty\">No results for &ldquo;" + q + "&rdquo;</div>";
      resultsEl.style.display = "block"; return;
    }
    resultsEl.innerHTML = hits.map(function(p){
      var lyric  = highlight(p.lyric  || "", q);
      var song   = highlight(p.song   || "", q);
      var artist = p.artist || "";
      return "<div class=\"feed-search-result\" data-postid=\"" + (p.id||"") + "\">" +
             "<span class=\"feed-search-result-lyric\">" + lyric + "</span>" +
             "<span class=\"feed-search-result-meta\">" + song + (artist ? " &middot; " + artist : "") + "</span>" +
             "</div>";
    }).join("");
    resultsEl.querySelectorAll(".feed-search-result").forEach(function(el){
      el.addEventListener("click", function(){
        var postId = el.getAttribute("data-postid");
        closeSearch();
        setTimeout(function(){
          var card = document.querySelector("[data-postid=\"" + postId + "\"]");
          if (card) card.scrollIntoView({behavior:"smooth", block:"center"});
        }, 200);
      });
    });
    resultsEl.style.display = "block";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 700);
  }
})();