function getFilteredPosts() {
  const visible = posts.filter(p => p.status !== 'hidden');
  let filtered  = activeRoom === 'all' ? visible : visible.filter(p => (p.emotion||'').toLowerCase()===activeRoom.toLowerCase());
  if (!searchQuery) return filtered;
  const q = searchQuery.toLowerCase();
  return filtered.filter(p =>
    (p.text||'').toLowerCase().includes(q)
    || (p.knowledge?.song||'').toLowerCase().includes(q)
    || (p.knowledge?.artist||'').toLowerCase().includes(q)
    || (p.emotion||'').toLowerCase().includes(q)
  );
}

function highlightMatch(text, query) {
  if (!query || !text) return text||'';
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${esc})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function clearSearch() {
  const input = document.getElementById('feedSearchInput');
  const btn   = document.getElementById('searchClearBtn');
  searchQuery = '';
  if (input) input.value='';
  if (btn) btn.style.display='none';
  renderFeed();
}

function initSearch() {
  const input = document.getElementById('feedSearchInput');
  const btn   = document.getElementById('searchClearBtn');
  if (!input) return;
  input.oninput   = () => { searchQuery=input.value.trim(); if(btn)btn.style.display=searchQuery?'flex':'none'; renderFeed(); };
  input.onkeydown = e => { if(e.key==='Escape'){clearSearch();input.blur();} };
  if (btn) btn.onclick = () => { clearSearch(); input.focus(); };
}

function initRoomTabs() {
  const tabs = document.querySelectorAll('.room-tab');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      activeRoom = tab.dataset.room;
      const stack = document.getElementById('cardStack');
      if (stack) delete stack.dataset.swipeReady;
      renderFeed();
    };
  });
}

function initCardTilt() {}

function getPostAge(post)  { if (!post.timestamp) return 999; return (Date.now()-post.timestamp)/3600000; }
function getEngagement(post) {
  const a = postAnalytics[post.id]||{};
  return (a.views||0)
    + (Object.keys(a.guesses  ||{}).length*3)
    + (Object.keys(a.helps    ||{}).length*2)
    + (Object.keys(a.resonates||{}).length*4)
    + (Object.keys(a.echoes   ||{}).length*5);
}
function calculatePostScore(post) {
  const age=getPostAge(post), engage=getEngagement(post);
  if (currentSort==='fresh') return Math.exp(-age/18)*1000 + engage*0.05;
  if (currentSort==='hot')   return engage / Math.pow(age+2,1.4);
  if (currentSort==='top')   return engage;
  return 0;
}
function isNewPost(post)  { return getPostAge(post) < 6; }
function isHotPost(post)  { return getEngagement(post) >= 20; }
function getRankedPosts() { return getFilteredPosts().sort((a,b)=>calculatePostScore(b)-calculatePostScore(a)); }
function getEchoCount(postId) {
  if (typeof postAnalytics==='undefined') return 0;
  return Object.keys(postAnalytics[postId]?.echoes||{}).length;
}

