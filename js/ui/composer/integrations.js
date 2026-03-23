/* MARGO integrations.js v7.1 */

let youtubeData=null,geniusResult=null,geniusTimer=null,lastQuery="",searchCache={},isSheetOpen=false;

function initGeniusIdentify(){
  injectSearchSheet();
  const input=document.getElementById("smartSearchInput");
  if(!input)return;
  input.addEventListener("input",onSmartInput);
  input.addEventListener("focus",function(){if(input.value.trim().length>=2)openSheet();});
  document.addEventListener("pointerdown",function(e){
    const sheet=document.getElementById("searchSheet");
    const wrap=document.getElementById("smartSearchWrap");
    if(sheet&&!sheet.contains(e.target)&&wrap&&!wrap.contains(e.target))closeSheet();
  });
  wireLyricChip();
}

function onSmartInput(){
  const input=document.getElementById("smartSearchInput");
  const val=input.value.trim();
  clearTimeout(geniusTimer);
  if(!val){clearSongSelection();closeSheet();return;}
  if(geniusResult){geniusResult=null;clearSongPill();clearYoutubePreview();hideLyricChip();}
  if(val.length<2)return;
  showSearchingState();
  openSheet();
  const cacheKey=val.toLowerCase();
  if(searchCache[cacheKey]){renderSheetResults(searchCache[cacheKey]);return;}
  geniusTimer=setTimeout(function(){runSmartSearch(val);},380);
}

async function runSmartSearch(query){
  if(query===lastQuery)return;
  lastQuery=query;
  try{
    const res=await fetch("/api/genius?lyric="+encodeURIComponent(query));
    const data=await res.json();
    const results=(res.ok&&data.results&&data.results.length)?data.results:[];
    searchCache[query.toLowerCase()]=results;
    if(results.length)renderSheetResults(results);
    else showNoResults();
  }catch(err){showNoResults();}
}

function injectSearchSheet(){
  if(document.getElementById("searchSheet"))return;
  const shareInputs=document.getElementById("shareInputs");
  if(!shareInputs)return;
  const q='"';
  shareInputs.innerHTML=
    "<div id="+q+"smartSearchWrap"+q+" class="+q+"smart-search-wrap"+q+">"
    +"<div class="+q+"smart-search-field"+q+">"
    +"<span class="+q+"smart-search-icon"+q+"><svg width="+q+"14"+q+" height="+q+"14"+q+" viewBox="+q+"0 0 24 24"+q+" fill="+q+"none"+q+" stroke="+q+"currentColor"+q+" stroke-width="+q+"2.5"+q+" stroke-linecap="+q+"round"+q+" stroke-linejoin="+q+"round"+q+"><circle cx="+q+"11"+q+" cy="+q+"11"+q+" r="+q+"8"+q+"/><path d="+q+"m21 21-4.35-4.35"+q+"/></svg></span>"
    +"<input id="+q+"smartSearchInput"+q+" type="+q+"text"+q+" inputmode="+q+"text"+q+" autocomplete="+q+"off"+q+" autocorrect="+q+"off"+q+" spellcheck="+q+"false"+q+" class="+q+"smart-search-input"+q+" placeholder="+q+"Search by lyric, song or artist…"+q+"/>"
    +"<span id="+q+"searchSpinner"+q+" class="+q+"search-spinner hidden"+q+"></span>"
    +"<button id="+q+"clearSearchBtn"+q+" class="+q+"clear-search-btn hidden"+q+" aria-label="+q+"Clear"+q+">×</button>"
    +"</div>"
    +"<div id="+q+"songPill"+q+" class="+q+"song-pill hidden"+q+">"
    +"<span class="+q+"song-pill-art-wrap"+q+"><img id="+q+"songPillArt"+q+" class="+q+"song-pill-art"+q+" src="+q+q+" alt="+q+q+"/><span class="+q+"song-pill-art-fallback"+q+">♪</span></span>"
    +"<span class="+q+"song-pill-info"+q+"><span id="+q+"songPillName"+q+" class="+q+"song-pill-name"+q+"></span><span id="+q+"songPillArtist"+q+" class="+q+"song-pill-artist"+q+"></span></span>"
    +"<button id="+q+"changeSongBtn"+q+" class="+q+"song-pill-change"+q+">Change</button>"
    +"</div></div>"
    +"<div id="+q+"searchSheet"+q+" class="+q+"search-sheet hidden"+q+">"
    +"<div class="+q+"search-sheet-inner"+q+">"
    +"<div id="+q+"searchSheetStatus"+q+" class="+q+"search-sheet-status"+q+"></div>"
    +"<div id="+q+"searchSheetResults"+q+" class="+q+"search-sheet-results"+q+"></div>"
    +"</div></div>"
    +"<input id="+q+"songInput"+q+" type="+q+"hidden"+q+" value="+q+q+"/>"
    +"<input id="+q+"artistInput"+q+" type="+q+"hidden"+q+" value="+q+q+"/>";
  document.getElementById("clearSearchBtn").addEventListener("click",function(){
    clearSongSelection();
    var input=document.getElementById("smartSearchInput");
    if(input){input.value="";input.focus();}
    closeSheet();
  });
  document.getElementById("changeSongBtn").addEventListener("click",function(){
    geniusResult=null;clearSongPill();clearYoutubePreview();hideLyricChip();hideVibeSection();
    var input=document.getElementById("smartSearchInput");
    if(input){input.value="";input.focus();}
    hideSongPill();
  });
}

/* ── Lyric chip ── */
function wireLyricChip(){
  const editBtn=document.getElementById("lyricChipEdit");
  if(!editBtn)return;
  editBtn.addEventListener("click",function(){
    const editWrap=document.getElementById("lyricEditWrap");
    if(!editWrap)return;
    const isHidden=editWrap.classList.contains("hidden");
    editWrap.classList.toggle("hidden",!isHidden);
    if(isHidden){
      const ta=document.getElementById("textInput");
      if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);}
    }
  });
  const ta=document.getElementById("textInput");
  if(ta){
    ta.addEventListener("input",function(){
      const chip=document.getElementById("lyricChipText");
      if(chip)chip.textContent=ta.value||"Add your line…";
      const cc=document.getElementById("charCount");
      if(cc)cc.textContent=ta.value.length;
    });
  }
}

function showLyricChip(lyric){
  const wrap=document.getElementById("lyricChipWrap");
  const chip=document.getElementById("lyricChipText");
  const ta=document.getElementById("textInput");
  const cc=document.getElementById("charCount");
  if(!wrap||!chip)return;
  const text=lyric.substring(0,140);
  chip.textContent=text;
  if(ta){ta.value=text;}
  if(cc){cc.textContent=text.length;}
  wrap.classList.remove("hidden");
  showVibeSection();
}

function hideLyricChip(){
  const wrap=document.getElementById("lyricChipWrap");
  if(wrap)wrap.classList.add("hidden");
  const ta=document.getElementById("textInput");
  if(ta)ta.value="";
  hideVibeSection();
}

function showVibeSection(){
  const vl=document.getElementById("vibeLabel");
  const eg=document.getElementById("emotionGrid");
  if(vl)vl.style.display="";
  if(eg)eg.style.display="";
}

function hideVibeSection(){
  const vl=document.getElementById("vibeLabel");
  const eg=document.getElementById("emotionGrid");
  if(vl)vl.style.display="none";
  if(eg)eg.style.display="none";
}

/* ── Sheet open/close ── */
function openSheet(){
  const sheet=document.getElementById("searchSheet");
  if(!sheet||isSheetOpen)return;
  sheet.classList.remove("hidden");
  requestAnimationFrame(function(){sheet.classList.add("open");});
  isSheetOpen=true;
}

function closeSheet(){
  const sheet=document.getElementById("searchSheet");
  if(!sheet)return;
  sheet.classList.remove("open");
  setTimeout(function(){sheet.classList.add("hidden");},220);
  isSheetOpen=false;
}

function showSearchingState(){
  const status=document.getElementById("searchSheetStatus");
  const results=document.getElementById("searchSheetResults");
  const spinner=document.getElementById("searchSpinner");
  const q='"';
  if(status)status.innerHTML="<span class="+q+"search-identifying"+q+"><span class="+q+"search-pulse"+q+"></span>Identifying…</span>";
  if(results)results.innerHTML="";
  if(spinner)spinner.classList.remove("hidden");
}

function showNoResults(){
  const status=document.getElementById("searchSheetStatus");
  const results=document.getElementById("searchSheetResults");
  const spinner=document.getElementById("searchSpinner");
  const q='"';
  if(status)status.innerHTML="<span class="+q+"search-no-result"+q+">Try a different line or song name</span>";
  if(results)results.innerHTML="";
  if(spinner)spinner.classList.add("hidden");
}

function renderSheetResults(results){
  const status=document.getElementById("searchSheetStatus");
  const list=document.getElementById("searchSheetResults");
  const spinner=document.getElementById("searchSpinner");
  const q='"';
  if(spinner)spinner.classList.add("hidden");
  if(status)status.innerHTML="<span class="+q+"search-found-label"+q+">Select the right song</span>";
  if(!list)return;
  list.innerHTML="";
  results.forEach(function(r,idx){
    const song=decodeHTML(r.song||""),artist=decodeHTML(r.artist||"");
    const card=document.createElement("div");
    card.className="search-result-card";
    card.style.animationDelay=idx*55+"ms";
    const img=r.artwork
      ? "<img src="+q+r.artwork+q+" class="+q+"search-result-art"+q+" alt="+q+q+"/>"
      : "<div class="+q+"search-result-art search-result-art-fallback"+q+">♪</div>";
    card.innerHTML=img
      +"<div class="+q+"search-result-info"+q+"><div class="+q+"search-result-song"+q+">"+song+"</div><div class="+q+"search-result-artist"+q+">"+artist+"</div></div>"
      +"<span class="+q+"search-result-use"+q+">Use</span>";
    card.addEventListener("pointerdown",function(e){
      e.preventDefault();
      selectResult(Object.assign({},r,{song:song,artist:artist}),card);
    });
    list.appendChild(card);
  });
}

function selectResult(result,card){
  document.querySelectorAll(".search-result-card").forEach(function(c){c.classList.remove("selected");});
  if(card){
    card.classList.add("selected");
    const tag=card.querySelector(".search-result-use");
    if(tag)tag.textContent="✓";
  }
  geniusResult=result;
  const songEl=document.getElementById("songInput");
  const artistEl=document.getElementById("artistInput");
  if(songEl)songEl.value=result.song;
  if(artistEl)artistEl.value=result.artist;
  showSongPill(result);
  // Auto-fill lyric from search query
  const searchVal=document.getElementById("smartSearchInput").value.trim();
  showLyricChip(searchVal);
  if(result.id)fetchGeniusDetail(result.id);
  clearYoutubePreview();
  fetchYoutubeData(result.song,result.artist);
  setTimeout(function(){closeSheet();},280);
}

function showSongPill(result){
  const pill=document.getElementById("songPill");
  const nameEl=document.getElementById("songPillName");
  const artEl=document.getElementById("songPillArtist");
  const imgEl=document.getElementById("songPillArt");
  const input=document.getElementById("smartSearchInput");
  if(nameEl)nameEl.textContent=result.song;
  if(artEl)artEl.textContent=result.artist;
  if(imgEl&&result.artwork){imgEl.src=result.artwork;imgEl.style.display="block";}
  if(pill)pill.classList.remove("hidden");
  const field=input&&input.closest(".smart-search-field");
  if(field)field.style.display="none";
  const wrap=document.getElementById("smartSearchWrap");
  if(wrap)wrap.classList.add("has-selection");
}

function hideSongPill(){
  const pill=document.getElementById("songPill");
  const input=document.getElementById("smartSearchInput");
  const wrap=document.getElementById("smartSearchWrap");
  if(pill)pill.classList.add("hidden");
  const field=input&&input.closest(".smart-search-field");
  if(field)field.style.display="";
  if(wrap)wrap.classList.remove("has-selection");
}

function clearSongPill(){
  hideSongPill();
  const s=document.getElementById("songInput"),a=document.getElementById("artistInput");
  if(s)s.value="";if(a)a.value="";
}

function clearSongSelection(){
  geniusResult=null;lastQuery="";
  clearSongPill();clearYoutubePreview();hideLyricChip();
  const sp=document.getElementById("searchSpinner");
  if(sp)sp.classList.add("hidden");
}

function initYoutubeAutofetch(){}

async function fetchYoutubeData(song,artist){
  const cleanSong=song.replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
  const cleanArtist=artist.replace(/\s*feat\..*$/i,"").replace(/\s*ft\..*$/i,"").trim();
  showYtLoading();youtubeData=null;
  try{
    const res=await fetch("/api/youtube?song="+encodeURIComponent(cleanSong)+"&artist="+encodeURIComponent(cleanArtist));
    const data=await res.json();
    if(!res.ok||data.error||(!data.videoId&&!data.thumbnail)){clearYoutubePreview();return;}
    youtubeData=data;renderYtCard(data);
  }catch(_){clearYoutubePreview();}
}

function showYtLoading(){
  clearYoutubePreview();
  const q='"';
  const card=document.createElement("div");
  card.id="youtubePreview";card.className="yt-card";
  card.innerHTML="<div class="+q+"yt-loading"+q+"><span class="+q+"m-spinner"+q+"></span>Looking up on YouTube, Deezer, Apple Music…</div>";
  insertAfterSearch(card);
}

function renderYtCard(data){
  clearYoutubePreview();
  const source=data.source||"youtube";
  const links=[];
  const q='"';
  if(data.youtubeUrl)links.push("<a href="+q+data.youtubeUrl+q+" target="+q+"_blank"+q+" rel="+q+"noopener"+q+" class="+q+"yt-listen-link yt-link-yt"+q+">YouTube</a>");
  if(data.deezerUrl)links.push("<a href="+q+data.deezerUrl+q+" target="+q+"_blank"+q+" rel="+q+"noopener"+q+" class="+q+"yt-listen-link yt-link-dz"+q+">Deezer</a>");
  if(data.itunesUrl)links.push("<a href="+q+data.itunesUrl+q+" target="+q+"_blank"+q+" rel="+q+"noopener"+q+" class="+q+"yt-listen-link yt-link-it"+q+">Apple Music</a>");
  const cls=source==="youtube"?"yt-found-yt":source==="deezer"?"yt-found-dz":"yt-found-it";
  const thumb=data.thumbnail||data.thumbnailSm;
  const card=document.createElement("div");
  card.id="youtubePreview";card.className="yt-card";
  card.innerHTML="<div class="+q+"yt-card-inner"+q+">"
    +(thumb?"<div class="+q+"yt-thumb-wrap"+q+"><img src="+q+thumb+q+" class="+q+"yt-thumb"+q+" alt="+q+decodeHTML(data.title||"")+q+"/></div>":"")
    +"<div class="+q+"yt-info"+q+"><div class="+q+"yt-title"+q+">"+decodeHTML(data.title||"")+"</div>"
    +"<div class="+q+"yt-channel"+q+">"+decodeHTML(data.channel||data.collectionName||"")+"</div>"
    +(links.length?"<div class="+q+"yt-links-row"+q+">"+links.join("")+"</div>":"")
    +"</div><span class="+q+"yt-found-tag "+cls+q+">Found</span></div>";
  insertAfterSearch(card);
  const ytLink=document.getElementById("youtubeLink");
  if(ytLink&&!ytLink.value&&data.videoId&&data.youtubeUrl)ytLink.value=data.youtubeUrl;
}

function insertAfterSearch(el){
  const wrap=document.getElementById("smartSearchWrap");
  if(wrap)wrap.parentNode.insertBefore(el,wrap.nextSibling);
}

function clearYoutubePreview(){
  youtubeData=null;
  const el=document.getElementById("youtubePreview");
  if(el)el.remove();
}

async function fetchGeniusDetail(id){
  try{
    const res=await fetch("/api/genius?id="+id);
    const data=await res.json();
    if(!res.ok||data.error)return;
    geniusResult=Object.assign({},geniusResult,{
      album:data.album||null,
      releaseDate:data.releaseDate||null,
      featuredArtists:data.featuredArtists||[],
      writers:data.writers||[],
      producers:data.producers||[]
    });
  }catch(_){}
}

function closeAutocomplete(){closeSheet();}