function submitGuess() {
  if (!currentPost) return;
  currentGuessAttempts++;
  const k=currentPost.knowledge||{};
  const doSong=currentPost.guessConfig?.guessSong??true, doArtist=currentPost.guessConfig?.guessArtist??true;
  const gs=document.getElementById('guessSongInput').value.trim().toLowerCase();
  const ga=document.getElementById('guessArtistInput').value.trim().toLowerCase();
  const as=(k.song||'').toLowerCase(), aa=(k.artist||'').toLowerCase();
  const songOk  =!doSong  ||(gs&&(gs===as||gs.includes(as)||as.includes(gs)));
  const artistOk=!doArtist||(ga&&(ga===aa||ga.includes(aa)||aa.includes(ga)));
  const correct =songOk&&artistOk;
  if (isFirebaseEnabled)
    analyticsRef.child(currentPost.id).child('guesses').push({song:gs||null,artist:ga||null,correct,timestamp:Date.now()});
  const resultEl=document.getElementById('guessResult');
  resultEl.classList.remove('hidden','result-success','result-error','result-partial');
  if (correct) {
    resultEl.className='result-msg result-success';
    resultEl.innerHTML=`You got it — "${k.song}" by ${k.artist}`;
    const meta=currentPost.youtubeMeta;
    if(meta?.thumbnail) resultEl.innerHTML+=`<br><img src="${meta.thumbnail}" style="width:100%;border-radius:8px;margin-top:8px;object-fit:cover" alt=""/>`;
    document.getElementById('submitGuess').style.display='none';
    document.getElementById('guessInputFields').style.display='none';
    if (currentPost.links) {
      const ll=document.getElementById('guessLinksSection');
      let html='<div class="guess-links-title">Listen</div>';
      if(currentPost.links.spotify)   html+=`<a href="${currentPost.links.spotify}"   target="_blank" class="guess-link">Spotify</a>`;
      if(currentPost.links.apple)     html+=`<a href="${currentPost.links.apple}"     target="_blank" class="guess-link">Apple Music</a>`;
      if(currentPost.links.youtube)   html+=`<a href="${currentPost.links.youtube}"   target="_blank" class="guess-link">YouTube</a>`;
      if(currentPost.links.soundcloud)html+=`<a href="${currentPost.links.soundcloud}"target="_blank" class="guess-link">SoundCloud</a>`;
      ll.innerHTML=html; ll.classList.remove('hidden');
    }
    return;
  }
  const left=MAX_GUESS_ATTEMPTS-currentGuessAttempts;
  if (left<=0) {
    resultEl.className='result-msg result-error';
    resultEl.innerHTML=`It was: "${k.song}" by ${k.artist}`;
    document.getElementById('submitGuess').style.display='none';
    document.getElementById('guessInputFields').style.display='none';
    return;
  }
  const ps=doSong&&gs&&(gs===as||gs.includes(as)||as.includes(gs));
  const pa=doArtist&&ga&&(ga===aa||ga.includes(aa)||aa.includes(ga));
  resultEl.className=`result-msg ${(ps||pa)?'result-partial':'result-error'}`;
  let msg=(ps||pa)?'Partially right — ':'Not quite — ';
  if(doSong)  msg+=`Song: ${ps?'correct':'wrong'} `;
  if(doArtist)msg+=`Artist: ${pa?'correct':'wrong'} `;
  msg+=`(${left} left)`;
  resultEl.innerHTML=msg;
  document.getElementById('guessSongInput').value='';
  document.getElementById('guessArtistInput').value='';
}

/* ── Discover ── */
window.openDiscover = function(index) {
  currentPost=posts[index]; if(!currentPost)return;
  trackView(currentPost.id);
  ['discoverLyric','discoverSongAnswer','discoverArtistAnswer',
   'discoverSpotifyLink','discoverAppleLink','discoverYoutubeLink','discoverSoundcloudLink']
    .forEach(id=>{
      const el=document.getElementById(id);
      if(el){id==='discoverLyric'?el.textContent=currentPost.text:el.value='';}
    });
  openModal(discoverModal);
};

function submitDiscover() {
  const song  =document.getElementById('discoverSongAnswer').value.trim();
  const artist=document.getElementById('discoverArtistAnswer').value.trim();
  if(!song||!artist){showToast('Enter both song and artist');return;}
  const helpData={
    song,artist,
    links:{
      spotify:   document.getElementById('discoverSpotifyLink').value.trim()||null,
      apple:     document.getElementById('discoverAppleLink').value.trim()||null,
      youtube:   document.getElementById('discoverYoutubeLink').value.trim()||null,
      soundcloud:document.getElementById('discoverSoundcloudLink').value.trim()||null,
    },
    timestamp:Date.now()
  };
  if(isFirebaseEnabled)analyticsRef.child(currentPost.id).child('helps').push(helpData);
  showToast('Thanks for helping identify it'); closeModal(discoverModal);
}

/* ── Analytics ── */
function openAnalytics() {
  if(!currentPost)return;
  const an=postAnalytics[currentPost.id]||{views:0};
  const guesses=Object.values(an.guesses||{});
  const helps  =Object.values(an.helps  ||{});
  const body   =document.getElementById('analyticsBody');
  let html=`<div class="analytics-grid">
    <div class="stat-card"><div class="stat-num">${an.views||0}</div><div class="stat-label">Views</div></div>`;
  if(currentPost.mode==='guess')   html+=`<div class="stat-card"><div class="stat-num">${guesses.length}</div><div class="stat-label">Guesses</div></div>`;
  if(currentPost.mode==='discover')html+=`<div class="stat-card"><div class="stat-num">${helps.length}</div><div class="stat-label">Identifications</div></div>`;
  html+='</div>';
  body.innerHTML=html;
  if(currentPost.mode==='guess'&&guesses.length){
    let sec='<div class="activity-section"><h4>Guesses</h4><div class="activity-list">';
    guesses.forEach(g=>{
      const gSong   = g.song   ? 'Song: '+g.song   : '';
      const gArtist = g.artist ? (g.song?' · ':'')+'Artist: '+g.artist : '';
      sec+=`<div class="activity-item ${g.correct?'correct':'incorrect'}">
        <div class="activity-guess">${gSong}${gArtist}</div>
        <div class="activity-result ${g.correct?'correct':'incorrect'}">${g.correct?'Correct':'Incorrect'}</div>
        <div class="activity-time">${timeAgo(g.timestamp)}</div>
      </div>`;
    });
    body.innerHTML+=sec+'</div></div>';
  }
  if(currentPost.mode==='discover'&&helps.length){
    let sec='<div class="activity-section"><h4>Community Identifications</h4><div class="activity-list">';
    helps.forEach(h=>{
      const lp=[];
      if(h.links?.spotify)   lp.push(`<a href="${h.links.spotify}"   target="_blank" class="help-link">Spotify</a>`);
      if(h.links?.apple)     lp.push(`<a href="${h.links.apple}"     target="_blank" class="help-link">Apple</a>`);
      if(h.links?.youtube)   lp.push(`<a href="${h.links.youtube}"   target="_blank" class="help-link">YouTube</a>`);
      if(h.links?.soundcloud)lp.push(`<a href="${h.links.soundcloud}"target="_blank" class="help-link">SoundCloud</a>`);
      sec+=`<div class="activity-item">
        <div class="activity-guess"><strong>${h.song||'?'}</strong> — ${h.artist||'?'}</div>
        ${lp.length?`<div class="help-links-row">${lp.join('')}</div>`:''}
        <div class="activity-time">${timeAgo(h.timestamp)}</div>
      </div>`;
    });
    body.innerHTML+=sec+'</div></div>';
  }
  openModal(analyticsModal);
}
