/* MARGO integrations.js v8.0 */

let youtubeData=null,geniusResult=null,geniusTimer=null,lastQuery="",searchCache={},isSheetOpen=false;

function initGeniusIdentify(){
  injectSearchSheet();
  var input=document.getElementById("smartSearchInput");
  if(!input)return;
  input.addEventListener("input",onSmartInput);
  input.addEventListener("focus",function(){if(input.value.trim().length>=2&&!geniusResult)openSheet();});
  document.addEventListener("pointerdown",function(e){
    var sheet=document.getElementById("searchSheet");
    var wrap=document.getElementById("smartSearchWrap");
    if(sheet&&!sheet.contains(e.target)&&wrap&&!wrap.contains(e.target))closeSheet();
  });
  wireLyricChip();
  wireSongConfirm();
}

function onSmartInput(){
  var input=document.getElementById("smartSearchInput");
  var val=input.value.trim();
  clearTimeout(geniusTimer);
  if(!val){clearSongSelection();closeSheet();return;}
  if(geniusResult){geniusResult=null;clearSongPill();clearYoutubePreview();hideLyricChip();}
  if(val.length<2)return;
  showSearchingState();
  openSheet();
  var cacheKey=val.toLowerCase();
  if(searchCache[cacheKey]){renderSheetResults(searchCache[cacheKey]);return;}
  geniusTimer=setTimeout(function(){runSmartSearch(val);},380);
}

async function runSmartSearch(query){
  if(query===lastQuery)return;
  lastQuery=query;
  try{
    var res=await fetch("/api/genius?lyric="+encodeURIComponent(query));
    var data=await res.json();
    var results=(res.ok&&data.results&&data.results.length)?data.results:[];
    searchCache[query.toLowerCase()]=results;
    if(results.length)renderSheetResults(results);
    else showNoResults();
  }catch(err){showNoResults();}
}

function injectSearchSheet(){
  if(document.getElementById("searchSheet"))return;
  var shareInputs=document.getElementById("shareInputs");
  if(!shareInputs)return;
  var q='"';
  shareInputs.innerHTML=
    "<div id="+q+"smartSearchWrap"+q+" class="+q+"smart-search-wrap"+q+">"
    +"<div class="+q+"smart-search-field"+q+">"
    +"<span class="+q+"smart-search-icon"+q+"><svg width="+q+"16"+q+" height="+q+"16"+q+" viewBox="+q+"0 0 24 24"+q+" fill="+q+"none"+q+" stroke="+q+"currentColor"+q+" stroke-width="+q+"2"+q+" stroke-linecap="+q+"round"+q+" stroke-linejoin="+q+"round"+q+"><circle cx="+q+"11"+q+" cy="+q+"11"+q+" r="+q+"8"+q+"/><path d="+q+"m21 21-4.35-4.35"+q+"/></svg></span>"
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
    var inp=document.getElementById("smartSearchInput");
    if(inp){inp.value="";inp.focus();}
    closeSheet();
  });
  document.getElementById("changeSongBtn").addEventListener("click",function(){
    geniusResult=null;clearSongPill();clearYoutubePreview();hideLyricChip();hideVibeSection();hideSongConfirm();
    var inp=document.getElementById("smartSearchInput");
    if(inp){inp.value="";inp.focus();}
    hideSongPill();
  });
}

/* ── Song confirm (editable song + artist) ── */
function wireSongConfirm(){
  var si=document.getElementById("songConfirmInput");
  var ai=document.getElementById("artistConfirmInput");
  if(si) si.addEventListener("input",function(){
    var hidden=document.getElementById("songInput");
    if(hidden)hidden.value=si.value;
    if(geniusResult)geniusResult.song=si.value;
    var pill=document.getElementById("songPillName");
    if(pill)pill.textContent=si.value;
  });
  if(ai) ai.addEventListener("input",function(){
    var hidden=document.getElementById("artistInput");
    if(hidden)hidden.value=ai.value;
    if(geniusResult)geniusResult.artist=ai.value;
    var pill=document.getElementById("songPillArtist");
    if(pill)pill.textContent=ai.value;
  });
}

function showSongConfirm(song,artist){
  var block=document.getElementById("songConfirmBlock");
  var si=document.getElementById("songConfirmInput");
  var ai=document.getElementById("artistConfirmInput");
  if(si)si.value=song||"";
  if(ai)ai.value=artist||"";
  if(block)block.classList.remove("hidden");
}

function hideSongConfirm(){
  var block=document.getElementById("songConfirmBlock");
  if(block)block.classList.add("hidden");
  var si=document.getElementById("songConfirmInput");
  var ai=document.getElementById("artistConfirmInput");
  if(si)si.value="";
  if(ai)ai.value="";
}

/* ── Lyric chip ── */
function wireLyricChip(){
  // Make chip text itself a contenteditable — no second textarea revealed
  var chipText=document.getElementById("lyricChipText");
  var editBtn=document.getElementById("lyricChipEdit");
  var ta=document.getElementById("textInput");
  if(!chipText)return;

  chipText.contentEditable="true";
  chipText.spellcheck=false;
  chipText.setAttribute("data-placeholder","");

  chipText.addEventListener("focus",function(){
    chipText.classList.add("editing");
    // select all on focus
    var range=document.createRange();
    range.selectNodeContents(chipText);
    var sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  chipText.addEventListener("blur",function(){
    chipText.classList.remove("editing");
    syncChipToTextarea();
  });

  chipText.addEventListener("input",function(){
    syncChipToTextarea();
    // enforce 140 char limit
    var text=chipText.textContent||"";
    if(text.length>140){
      chipText.textContent=text.substring(0,140);
      // move cursor to end
      var range=document.createRange();
      range.selectNodeContents(chipText);
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });

  chipText.addEventListener("keydown",function(e){
    if(e.key==="Enter"){e.preventDefault();chipText.blur();}
  });

  // Edit button just focuses the chip text
  if(editBtn){
    editBtn.addEventListener("click",function(){
      chipText.focus();
    });
  }

  function syncChipToTextarea(){
    var text=(chipText.textContent||"").substring(0,140);
    if(ta)ta.value=text;
    var cc=document.getElementById("charCount");
    if(cc)cc.textContent=text.length;
  }
}

function showLyricChip(lyric){
  var wrap=document.getElementById("lyricChipWrap");
  var chip=document.getElementById("lyricChipText");
  var ta=document.getElementById("textInput");
  var cc=document.getElementById("charCount");
  var editWrap=document.getElementById("lyricEditWrap");
  if(!wrap||!chip)return;
  var text=lyric.substring(0,140);
  chip.textContent=text;
  if(ta){ta.value=text;}
  if(cc){cc.textContent=text.length;}
  if(editWrap)editWrap.classList.add("hidden");
  wrap.classList.remove("hidden");
  wrap.style.display="block";
  chip.contentEditable="true";
  var lbl=document.getElementById("lyricChipLabel");if(lbl){lbl.style.removeProperty("display");lbl.style.display="block";}
  showVibeSection();
}

function hideLyricChip(){
  var ct=document.getElementById("lyricChipText");
  var lbl2=document.getElementById("lyricChipLabel");if(lbl2)lbl2.style.display="none";
  if(ct)ct.contentEditable="false";
  var wrap=document.getElementById("lyricChipWrap");
  if(wrap)wrap.classList.add("hidden");
  var editWrap=document.getElementById("lyricEditWrap");
  if(editWrap)editWrap.classList.add("hidden");
  var ta=document.getElementById("textInput");
  if(ta)ta.value="";
  var cc=document.getElementById("charCount");
  if(cc)cc.textContent="0";
  hideVibeSection();
}

function showVibeSection(){
  var vl=document.getElementById("vibeLabel");
  var eg=document.getElementById("emotionGrid");
  if(vl){vl.style.removeProperty("display");vl.style.display="block";}
  if(eg){eg.style.removeProperty("display");eg.style.display="flex";}
}

function hideVibeSection(){
  var vl=document.getElementById("vibeLabel");
  var eg=document.getElementById("emotionGrid");
  if(vl)vl.style.display="none";
  if(eg)eg.style.display="none";
}

/* ── Sheet open/close ── */
function openSheet(){
  console.log("openSheet called from:", new Error().stack);
  var sheet=document.getElementById("searchSheet");
  if(!sheet||isSheetOpen)return;
  sheet.classList.remove("hidden");
  requestAnimationFrame(function(){sheet.classList.add("open");});
  isSheetOpen=true;
}

function closeSheet(){
  var sheet=document.getElementById("searchSheet");
  if(!sheet)return;
  sheet.classList.remove("open");
  setTimeout(function(){sheet.classList.add("hidden");},220);
  isSheetOpen=false;
}

function showSearchingState(){
  var status=document.getElementById("searchSheetStatus");
  var results=document.getElementById("searchSheetResults");
  var spinner=document.getElementById("searchSpinner");
  var q='"';
  if(status)status.innerHTML="<span class="+q+"search-identifying"+q+"><span class="+q+"search-pulse"+q+"></span>Identifying…</span>";
  if(results)results.innerHTML="";
  if(spinner)spinner.classList.remove("hidden");
}

function showNoResults(){
  var status=document.getElementById("searchSheetStatus");
  var results=document.getElementById("searchSheetResults");
  var spinner=document.getElementById("searchSpinner");
  var q='"';
  if(status)status.innerHTML="<span class="+q+"search-no-result"+q+">Try a different line or song name</span>";
  if(results)results.innerHTML="";
  if(spinner)spinner.classList.add("hidden");
}

function renderSheetResults(results){
  var status=document.getElementById("searchSheetStatus");
  var list=document.getElementById("searchSheetResults");
  var spinner=document.getElementById("searchSpinner");
  var q='"';
  if(spinner)spinner.classList.add("hidden");
  if(status)status.innerHTML="<span class="+q+"search-found-label"+q+">Select the right song</span>";
  if(!list)return;
  list.innerHTML="";
  results.forEach(function(r,idx){
    var song=decodeHTML(r.song||""),artist=decodeHTML(r.artist||"");
    var card=document.createElement("div");
    card.className="search-result-card";
    card.style.animationDelay=idx*55+"ms";
    var img=r.artwork
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
    var tag=card.querySelector(".search-result-use");
    if(tag)tag.textContent="✓";
  }
  geniusResult=result;
  var songEl=document.getElementById("songInput");
  var artistEl=document.getElementById("artistInput");
  if(songEl)songEl.value=result.song;
  if(artistEl)artistEl.value=result.artist;
  showSongPill(result);
  showSongConfirm(result.song,result.artist);
  var searchVal=document.getElementById("smartSearchInput").value.trim();
  showLyricChip(searchVal);
  if(result.id)fetchGeniusDetail(result.id);
  clearYoutubePreview();
  fetchYoutubeData(result.song,result.artist);
  closeSheet();
  var si=document.getElementById("smartSearchInput");if(si){si.blur();si.value="";}
}

function showSongPill(result){
  var pill=document.getElementById("songPill");
  var nameEl=document.getElementById("songPillName");
  var artEl=document.getElementById("songPillArtist");
  var imgEl=document.getElementById("songPillArt");
  var input=document.getElementById("smartSearchInput");
  if(nameEl)nameEl.textContent=result.song;
  if(artEl)artEl.textContent=result.artist;
  if(imgEl&&result.artwork){imgEl.src=result.artwork;imgEl.style.display="block";}
  if(pill)pill.classList.remove("hidden");
  var field=input&&input.closest(".smart-search-field");
  if(field)field.style.display="none";
  var wrap=document.getElementById("smartSearchWrap");
  if(wrap)wrap.classList.add("has-selection");
}

function hideSongPill(){
  var pill=document.getElementById("songPill");
  var input=document.getElementById("smartSearchInput");
  var wrap=document.getElementById("smartSearchWrap");
  if(pill)pill.classList.add("hidden");
  var field=input&&input.closest(".smart-search-field");
  if(field)field.style.display="";
  if(wrap)wrap.classList.remove("has-selection");
}

function clearSongPill(){
  hideSongPill();
  var s=document.getElementById("songInput"),a=document.getElementById("artistInput");
  if(s)s.value="";if(a)a.value="";
}

function clearSongSelection(){
  geniusResult=null;lastQuery="";
  clearSongPill();clearYoutubePreview();hideLyricChip();hideSongConfirm();
  var sp=document.getElementById("searchSpinner");
  if(sp)sp.classList.add("hidden");
}

function initYoutubeAutofetch(){}

async function fetchYoutubeData(song,artist){
  var cleanSong=song.replace(/\s*[\(\[].*?[\)\]]/g,"").trim();
  var cleanArtist=artist.replace(/\s*feat\..*$/i,"").replace(/\s*ft\..*$/i,"").trim();
  showYtLoading();youtubeData=null;
  try{
    var res=await fetch("/api/youtube?song="+encodeURIComponent(cleanSong)+"&artist="+encodeURIComponent(cleanArtist));
    var data=await res.json();
    if(!res.ok||data.error||(!data.videoId&&!data.thumbnail)){clearYoutubePreview();return;}
    youtubeData=data;renderYtCard(data);
  }catch(_){clearYoutubePreview();}
}

function showYtLoading(){
  clearYoutubePreview();
  var q='"';
  var card=document.createElement("div");
  card.id="youtubePreview";card.className="yt-card";
  card.innerHTML="<div class="+q+"yt-loading"+q+"><span class="+q+"m-spinner"+q+"></span>Looking up on YouTube, Deezer, Apple Music…</div>";
  insertAfterSearch(card);
}

function renderYtCard(data){
  clearYoutubePreview();
  var source=data.source||"youtube";
  var links=[];
  var q='"';
  if(data.youtubeUrl)links.push("<a href="+q+data.youtubeUrl+q+" target="+q+"_blank"+q+" rel="+q+"noopener"+q+" class="+q+"yt-listen-link yt-link-yt"+q+">YouTube</a>");
  if(data.deezerUrl)links.push("<a href="+q+data.deezerUrl+q+" target="+q+"_blank"+q+" rel="+q+"noopener"+q+" class="+q+"yt-listen-link yt-link-dz"+q+">Deezer</a>");
  if(data.itunesUrl)links.push("<a href="+q+data.itunesUrl+q+" target="+q+"_blank"+q+" rel="+q+"noopener"+q+" class="+q+"yt-listen-link yt-link-it"+q+">Apple Music</a>");
  var cls=source==="youtube"?"yt-found-yt":source==="deezer"?"yt-found-dz":"yt-found-it";
  var thumb=data.thumbnail||data.thumbnailSm;
  var card=document.createElement("div");
  card.id="youtubePreview";card.className="yt-card";
  card.innerHTML="<div class="+q+"yt-card-inner"+q+">"
    +(thumb?"<div class="+q+"yt-thumb-wrap"+q+"><img src="+q+thumb+q+" class="+q+"yt-thumb"+q+" alt="+q+decodeHTML(data.title||"")+q+"/></div>":"")
    +"<div class="+q+"yt-info"+q+"><div class="+q+"yt-title"+q+">"+decodeHTML(data.title||"")+"</div>"
    +"<div class="+q+"yt-channel"+q+">"+decodeHTML(data.channel||data.collectionName||"")+"</div>"
    +(links.length?"<div class="+q+"yt-links-row"+q+">"+links.join("")+"</div>":"")
    +"</div><span class="+q+"yt-found-tag "+cls+q+">Found</span></div>";
  insertAfterSearch(card);
  var ytLink=document.getElementById("youtubeLink");
  if(ytLink&&!ytLink.value&&data.videoId&&data.youtubeUrl)ytLink.value=data.youtubeUrl;
}

function insertAfterSearch(el){
  var wrap=document.getElementById("smartSearchWrap");
  if(wrap)wrap.parentNode.insertBefore(el,wrap.nextSibling);
}

function clearYoutubePreview(){
  youtubeData=null;
  var el=document.getElementById("youtubePreview");
  if(el)el.remove();
}

async function fetchGeniusDetail(id){
  try{
    var res=await fetch("/api/genius?id="+id);
    var data=await res.json();
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