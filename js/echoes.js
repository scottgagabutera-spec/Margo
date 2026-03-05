/* ============================================================
   MARGO — js/echoes.js
   v1.3 — FINAL
   • EMOTION → VIBE everywhere
   • Send It / Let Out display names correct
   • Bottom action buttons fully readable
   • Live Genius search from ≥3 chars
   • Submit uses firebase.database().ref('posts') DIRECTLY
     — never relies on stale postsRef global
   ============================================================ */

window._echoState = window._echoState || {
  post:         null,
  postIndex:    -1,
  echoes:       [],
  echoListener: null,
  isSubmitting: false,
};
const ES = window._echoState;

/* ────────────────────────────────────────────────────────────
   STYLES
──────────────────────────────────────────────────────────── */
function injectEchoStyles() {
  if (document.getElementById('echoStylesV13')) return;
  const s = document.createElement('style');
  s.id = 'echoStylesV13';
  s.textContent = `
    #echoSheetBackdrop {
      position:fixed;inset:0;z-index:650;
      background:rgba(0,0,0,0.82);
      backdrop-filter:blur(16px) saturate(0.7);
      -webkit-backdrop-filter:blur(16px) saturate(0.7);
      display:flex;align-items:flex-end;justify-content:center;
      animation:echoFadeIn 0.28s ease;
    }
    @keyframes echoFadeIn{from{opacity:0}to{opacity:1}}
    #echoSheetBackdrop.echo-hidden{display:none!important}

    @media(min-width:560px){
      #echoSheetBackdrop{align-items:center;padding:24px}
    }

    #echoSheet {
      width:100%;max-width:560px;
      background:#0f0e12;
      border:1px solid rgba(255,255,255,0.07);
      border-bottom:none;border-radius:28px 28px 0 0;
      overflow:hidden;display:flex;flex-direction:column;
      max-height:92dvh;
      box-shadow:0 -8px 60px rgba(0,0,0,0.8),0 0 0 1px rgba(232,197,71,0.04) inset;
      animation:echoSlideUp 0.38s cubic-bezier(0.16,1,0.3,1);
    }
    @media(min-width:560px){
      #echoSheet{
        border-radius:24px;border-bottom:1px solid rgba(255,255,255,0.07);
        max-height:88dvh;animation:echoFadeUp 0.32s cubic-bezier(0.16,1,0.3,1);
      }
    }
    @keyframes echoSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes echoFadeUp{from{transform:translateY(20px) scale(0.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}

    .echo-handle{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);margin:12px auto 0;flex-shrink:0}

    .echo-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 0;flex-shrink:0}
    .echo-header-left{display:flex;flex-direction:column;gap:2px}
    .echo-title{
      font-family:'Syne',sans-serif;font-weight:800;font-size:0.9rem;
      letter-spacing:2px;text-transform:uppercase;
      background:linear-gradient(90deg,#fff 20%,#E8C547 100%);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    .echo-parent-lyric{
      font-family:'DM Serif Display',serif;font-style:italic;
      font-size:0.75rem;color:rgba(255,255,255,0.32);line-height:1.4;
      max-width:240px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    }
    .echo-close{
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.38);width:30px;height:30px;border-radius:50%;
      font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.18s;flex-shrink:0;
    }
    .echo-close:hover{background:rgba(255,255,255,0.12);color:#fff}

    .echo-og-card{
      margin:12px 18px 0;border-radius:14px;
      background:rgba(232,197,71,0.05);
      border:1px solid rgba(232,197,71,0.18);
      padding:12px 14px;flex-shrink:0;
    }
    .echo-og-lyric{
      font-family:'DM Serif Display',serif;font-style:italic;
      font-size:0.92rem;line-height:1.55;color:#F0F0F0;margin-bottom:8px;
    }
    .echo-og-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .echo-og-song{
      font-family:'Space Mono',monospace;font-size:0.58rem;font-weight:700;
      color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }

    .echo-divider{display:flex;align-items:center;gap:10px;padding:10px 18px;flex-shrink:0}
    .echo-divider-line{flex:1;height:1px;background:rgba(255,255,255,0.06)}
    .echo-divider-label{
      font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;
      color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:2px;white-space:nowrap;
    }

    .echo-list-wrap{
      flex:1;overflow-y:auto;padding:0 18px 10px;
      scrollbar-width:none;display:flex;flex-direction:column;gap:10px;
    }
    .echo-list-wrap::-webkit-scrollbar{display:none}

    .echo-card{
      background:#161619;border:1px solid rgba(255,255,255,0.07);
      border-radius:16px;padding:14px;
      display:flex;flex-direction:column;gap:10px;
      animation:echoCardIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
      transition:border-color 0.2s,box-shadow 0.2s;
    }
    .echo-card:hover{border-color:rgba(255,255,255,0.13);box-shadow:0 6px 24px rgba(0,0,0,0.4)}
    @keyframes echoCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

    .echo-card-header{display:flex;align-items:center;justify-content:space-between}
    .echo-user-row{display:flex;align-items:center;gap:8px}
    .echo-username{font-family:'Space Mono',monospace;font-size:0.65rem;font-weight:700;letter-spacing:0.3px}
    .echo-time{font-family:'Space Mono',monospace;font-size:0.52rem;color:rgba(255,255,255,0.25);font-weight:400}

    .echo-lyric{font-family:'DM Serif Display',serif;font-style:italic;font-size:0.95rem;line-height:1.6;color:#F0F0F0}

    .echo-song-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .echo-song-info{min-width:0}
    .echo-song-name{font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:600;color:rgba(255,255,255,0.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .echo-artist-name{font-family:'Space Mono',monospace;font-size:0.58rem;color:rgba(255,255,255,0.35);letter-spacing:0.3px}
    .echo-vibe-tag{font-family:'Space Mono',monospace;font-size:0.48rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:3px 9px;border-radius:20px;flex-shrink:0}

    /* ── Action buttons — FULLY READABLE ── */
    .echo-card-actions{display:flex;gap:6px;margin-top:2px}
    .echo-action-btn{
      flex:1;padding:9px 6px;border-radius:10px;
      font-family:'Space Mono',monospace;font-size:0.54rem;font-weight:700;
      text-transform:uppercase;letter-spacing:0.8px;
      cursor:pointer;transition:all 0.18s;
      display:flex;align-items:center;justify-content:center;gap:5px;
      white-space:nowrap;
    }
    .echo-resonate-btn{
      background:rgba(192,132,252,0.10);
      border:1px solid rgba(192,132,252,0.35);
      color:rgba(255,255,255,0.9);
    }
    .echo-resonate-btn:hover{
      background:rgba(192,132,252,0.22);border-color:rgba(192,132,252,0.6);
      color:#fff;transform:translateY(-1px);
    }
    .echo-resonate-btn.resonated{
      background:rgba(192,132,252,0.22);border-color:rgba(192,132,252,0.65);color:#C084FC;
    }
    .echo-share-btn{
      background:rgba(232,197,71,0.08);
      border:1px solid rgba(232,197,71,0.28);
      color:rgba(255,255,255,0.88);
    }
    .echo-share-btn:hover{
      background:rgba(232,197,71,0.18);border-color:rgba(232,197,71,0.55);
      color:#fff;transform:translateY(-1px);
    }

    .echo-empty{text-align:center;padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:12px}
    .echo-empty-icon{font-size:2rem;opacity:0.35}
    .echo-empty-title{font-family:'Syne',sans-serif;font-size:0.88rem;font-weight:700;color:rgba(255,255,255,0.45)}
    .echo-empty-sub{font-family:'DM Serif Display',serif;font-style:italic;font-size:0.78rem;color:rgba(255,255,255,0.25);max-width:220px;line-height:1.5}

    .echo-compose{
      padding:12px 18px 20px;flex-shrink:0;
      border-top:1px solid rgba(255,255,255,0.06);
      display:flex;flex-direction:column;gap:8px;
      background:rgba(0,0,0,0.2);
    }
    .echo-compose-collapsed{display:flex;align-items:center;gap:10px}
    .echo-compose-trigger{
      flex:1;padding:12px 16px;border-radius:50px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.3);
      font-family:'DM Serif Display',serif;font-style:italic;font-size:0.85rem;
      text-align:left;cursor:pointer;transition:all 0.2s;
    }
    .echo-compose-trigger:hover{border-color:rgba(232,197,71,0.3);color:rgba(255,255,255,0.5);background:rgba(232,197,71,0.03)}
    .echo-compose-avatar{flex-shrink:0}

    .echo-compose-form{display:none;flex-direction:column;gap:8px;animation:echoFadeIn 0.2s ease}
    .echo-compose-form.open{display:flex}

    .echo-form-user-row{display:flex;align-items:center;gap:8px;margin-bottom:2px}
    .echo-form-username{font-family:'Space Mono',monospace;font-size:0.65rem;font-weight:700}

    .echo-vibe-label{
      font-family:'Space Mono',monospace;font-size:0.46rem;font-weight:700;
      color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;
    }

    .echo-lyric-input{
      width:100%;min-height:70px;resize:none;
      padding:13px 15px;border-radius:14px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
      color:#fff;font-family:'DM Serif Display',serif;
      font-style:italic;font-size:1rem;line-height:1.6;
      outline:none;transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box;
    }
    .echo-lyric-input::placeholder{color:rgba(255,255,255,0.2)}
    .echo-lyric-input:focus{border-color:rgba(232,197,71,0.38);box-shadow:0 0 0 3px rgba(232,197,71,0.07)}

    .echo-form-row{display:flex;gap:8px}
    .echo-form-input{
      flex:1;padding:10px 12px;border-radius:11px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);
      color:#fff;font-family:'DM Sans',sans-serif;font-size:0.85rem;
      outline:none;transition:border-color 0.2s;box-sizing:border-box;
    }
    .echo-form-input::placeholder{color:rgba(255,255,255,0.2)}
    .echo-form-input:focus{border-color:rgba(232,197,71,0.3);box-shadow:0 0 0 3px rgba(232,197,71,0.06)}

    .echo-vibe-row{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
    .echo-vibe-opt{
      padding:8px 4px;border-radius:9px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);
      color:rgba(255,255,255,0.55);font-family:'DM Sans',sans-serif;
      font-size:0.62rem;font-weight:600;cursor:pointer;transition:all 0.18s;text-align:center;
    }
    .echo-vibe-opt:hover{background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.2)}
    .echo-vibe-opt.active{background:rgba(232,197,71,0.12);border-color:rgba(232,197,71,0.45);color:#E8C547}

    .echo-form-submit-row{display:flex;gap:8px;align-items:center}
    .echo-cancel-btn{
      padding:12px 14px;border-radius:12px;
      background:none;border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.5);font-family:'Space Mono',monospace;
      font-size:0.52rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;
      cursor:pointer;transition:all 0.18s;
    }
    .echo-cancel-btn:hover{border-color:rgba(255,255,255,0.25);color:rgba(255,255,255,0.85)}
    .echo-submit-btn{
      flex:1;padding:13px;border-radius:12px;
      background:rgba(232,197,71,0.12);border:1px solid rgba(232,197,71,0.4);
      color:#E8C547;font-family:'Syne',sans-serif;
      font-weight:800;font-size:0.82rem;letter-spacing:1px;text-transform:uppercase;
      cursor:pointer;transition:all 0.22s cubic-bezier(0.16,1,0.3,1);
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    .echo-submit-btn:hover{background:rgba(232,197,71,0.22);border-color:rgba(232,197,71,0.7);color:#fff;transform:translateY(-1px);box-shadow:0 8px 24px rgba(232,197,71,0.2)}
    .echo-submit-btn:active{transform:scale(0.97)}
    .echo-submit-btn:disabled{opacity:0.45;cursor:default;transform:none;box-shadow:none}

    .echo-char-count{font-family:'Space Mono',monospace;font-size:0.5rem;color:rgba(255,255,255,0.2);text-align:right;font-weight:700}

    .echo-identify-btn{
      width:100%;padding:9px 12px;border-radius:10px;
      background:rgba(232,197,71,0.04);border:1px dashed rgba(232,197,71,0.25);
      color:rgba(232,197,71,0.7);font-family:'Space Mono',monospace;
      font-size:0.52rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;
      cursor:pointer;transition:all 0.18s;
      display:flex;align-items:center;justify-content:center;gap:6px;
    }
    .echo-identify-btn:hover:not(:disabled){background:rgba(232,197,71,0.09);border-color:rgba(232,197,71,0.5);color:#E8C547}
    .echo-identify-btn:disabled{opacity:0.4;cursor:default}

    .echo-live-hint{
      display:inline-flex;align-items:center;gap:5px;
      font-family:'Space Mono',monospace;font-size:0.46rem;font-weight:700;
      color:rgba(232,197,71,0.5);letter-spacing:1px;text-transform:uppercase;padding:2px 0;
    }
    .echo-live-dot{
      width:5px;height:5px;border-radius:50%;background:#E8C547;opacity:0.6;
      animation:echoLD 1.2s ease-in-out infinite;
    }
    @keyframes echoLD{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}

    .echo-spinner{
      width:12px;height:12px;border-radius:50%;
      border:2px solid rgba(232,197,71,0.2);border-top-color:#E8C547;
      animation:echoSpin 0.7s linear infinite;display:inline-block;
    }
    @keyframes echoSpin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(s);
}

/* ────────────────────────────────────────────────────────────
   VIBE CONFIG
──────────────────────────────────────────────────────────── */
const ECHO_VIBES = [
  { value: 'Love',       label: 'Love'       },
  { value: 'Heartbreak', label: 'Heartbreak' },
  { value: 'Hope',       label: 'Hope'       },
  { value: 'Nostalgia',  label: 'Nostalgia'  },
  { value: 'Healing',    label: 'Healing'    },
  { value: 'Joy',        label: 'Joy'        },
  { value: 'Rage',       label: 'Rage'       },
  { value: 'Loneliness', label: 'Loneliness' },
  { value: 'SendIt',     label: 'Send It'    },
  { value: 'LetOut',     label: 'Let Out'    },
];

const ECHO_VIBE_CFG = {
  Love:       { bg:'rgba(255,107,157,0.13)', text:'#FF6B9D', border:'rgba(255,107,157,0.22)' },
  Heartbreak: { bg:'rgba(255,80,80,0.11)',   text:'#ff5050', border:'rgba(255,80,80,0.2)'    },
  Hope:       { bg:'rgba(107,140,255,0.13)', text:'#6B8CFF', border:'rgba(107,140,255,0.22)' },
  Nostalgia:  { bg:'rgba(232,197,71,0.11)',  text:'#E8C547', border:'rgba(232,197,71,0.25)'  },
  Healing:    { bg:'rgba(74,222,128,0.13)',  text:'#4ade80', border:'rgba(74,222,128,0.22)'  },
  Joy:        { bg:'rgba(255,200,71,0.11)',  text:'#ffc847', border:'rgba(255,200,71,0.22)'  },
  Rage:       { bg:'rgba(255,100,100,0.13)', text:'#FF6464', border:'rgba(255,100,100,0.22)' },
  Loneliness: { bg:'rgba(160,160,255,0.11)', text:'#a0a0ff', border:'rgba(160,160,255,0.22)' },
  SendIt:     { bg:'rgba(0,229,255,0.11)',   text:'#00E5FF', border:'rgba(0,229,255,0.22)'   },
  LetOut:     { bg:'rgba(255,160,50,0.11)',  text:'#FFA032', border:'rgba(255,160,50,0.22)'  },
};

/* ────────────────────────────────────────────────────────────
   MOUNT
──────────────────────────────────────────────────────────── */
function mountEchoSheet() {
  if (document.getElementById('echoSheetBackdrop')) return;
  injectEchoStyles();

  const vibeButtons = ECHO_VIBES.map(v =>
    `<button class="echo-vibe-opt" data-emotion="${v.value}">${v.label}</button>`
  ).join('');

  const backdrop = document.createElement('div');
  backdrop.id = 'echoSheetBackdrop';
  backdrop.className = 'echo-hidden';
  backdrop.innerHTML = `
    <div id="echoSheet">
      <div class="echo-handle"></div>
      <div class="echo-header">
        <div class="echo-header-left">
          <span class="echo-title">Lyric Back</span>
          <span class="echo-parent-lyric" id="echoParentLyric"></span>
        </div>
        <button class="echo-close" id="echoClose" aria-label="Close">×</button>
      </div>
      <div class="echo-og-card" id="echoOgCard"></div>
      <div class="echo-divider">
        <div class="echo-divider-line"></div>
        <span class="echo-divider-label" id="echoCountLabel">0 echoes</span>
        <div class="echo-divider-line"></div>
      </div>
      <div class="echo-list-wrap" id="echoList"></div>
      <div class="echo-compose" id="echoCompose">
        <div class="echo-compose-collapsed" id="echoCollapsed">
          <div class="echo-compose-avatar" id="echoComposeAvatar"></div>
          <button class="echo-compose-trigger" id="echoComposeTrigger">Drop a lyric back…</button>
        </div>
        <div class="echo-compose-form" id="echoComposeForm">
          <div class="echo-form-user-row">
            <div id="echoFormAvatar"></div>
            <span class="echo-form-username" id="echoFormUsername"></span>
          </div>
          <textarea class="echo-lyric-input" id="echoLyricInput"
            maxlength="140" placeholder="The lyric that answers this one…" rows="3"></textarea>
          <div class="echo-char-count"><span id="echoCharCount">0</span>/140</div>
          <button class="echo-identify-btn" id="echoIdentifyBtn">Identify Song</button>
          <div id="echoLiveHint" class="echo-live-hint" style="display:none">
            <span class="echo-live-dot"></span> Searching for song…
          </div>
          <div id="echoGeniusResults"></div>
          <div class="echo-form-row">
            <input class="echo-form-input" id="echoSongInput" placeholder="Song title" type="text" maxlength="80"/>
            <input class="echo-form-input" id="echoArtistInput" placeholder="Artist" type="text" maxlength="80"/>
          </div>
          <div class="echo-vibe-label">Vibe</div>
          <div class="echo-vibe-row" id="echoVibeRow">${vibeButtons}</div>
          <div class="echo-form-submit-row">
            <button class="echo-cancel-btn" id="echoCancelBtn">Cancel</button>
            <button class="echo-submit-btn" id="echoSubmitBtn" disabled>Drop Your Lyric Back</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector('#echoClose').onclick          = closeEchoSheet;
  backdrop.querySelector('#echoComposeTrigger').onclick = expandEchoCompose;
  backdrop.querySelector('#echoCancelBtn').onclick      = collapseEchoCompose;
  backdrop.querySelector('#echoSubmitBtn').onclick      = submitEcho;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeEchoSheet(); });

  backdrop.querySelector('#echoLyricInput').oninput = e => {
    const n = e.target.value.length;
    backdrop.querySelector('#echoCharCount').textContent = n;
    backdrop.querySelector('#echoSubmitBtn').disabled = n < 2;
  };

  backdrop.querySelectorAll('.echo-vibe-opt').forEach(btn => {
    btn.onclick = () => {
      backdrop.querySelectorAll('.echo-vibe-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  backdrop.querySelector('#echoIdentifyBtn').onclick = () => {
    const lyric = backdrop.querySelector('#echoLyricInput').value.trim();
    if (lyric.length < 3) { if (typeof showToast === 'function') showToast('Type a lyric first'); return; }
    runEchoGeniusSearch(lyric);
  };

  let geniusDebounce;
  backdrop.querySelector('#echoLyricInput').addEventListener('input', e => {
    clearTimeout(geniusDebounce);
    const val = e.target.value.trim();
    const songFilled = backdrop.querySelector('#echoSongInput').value.trim();
    const liveHint = document.getElementById('echoLiveHint');
    if (val.length >= 3 && !songFilled) {
      if (liveHint) liveHint.style.display = 'inline-flex';
      const ms = val.length < 8 ? 900 : val.length < 15 ? 700 : 500;
      geniusDebounce = setTimeout(() => runEchoGeniusSearch(val), ms);
    } else {
      if (liveHint) liveHint.style.display = 'none';
    }
  });

  let ytDebounce;
  backdrop.querySelector('#echoSongInput').addEventListener('input', () => {
    clearTimeout(ytDebounce);
    const song   = backdrop.querySelector('#echoSongInput').value.trim();
    const artist = backdrop.querySelector('#echoArtistInput').value.trim();
    if (song.length > 1 && artist.length > 1) {
      ytDebounce = setTimeout(() => fillEchoSongMeta(song, artist), 700);
    }
  });
}

/* ────────────────────────────────────────────────────────────
   OPEN / CLOSE
──────────────────────────────────────────────────────────── */
async function openEchoSheet(postIndex) {
  mountEchoSheet();

  const post = (typeof posts !== 'undefined' ? posts : [])[postIndex];
  if (!post) return;

  if (typeof MargoUsername !== 'undefined' && !MargoUsername.hasBeenRevealed()) {
    await MargoUsername.showReveal();
  }

  ES.post      = post;
  ES.postIndex = postIndex;
  ES.echoes    = [];

  const parentLyricEl = document.getElementById('echoParentLyric');
  if (parentLyricEl) parentLyricEl.textContent = (post.text || '').substring(0, 50) + '…';

  populateEchoOgCard(post);
  populateEchoComposeUser();
  collapseEchoCompose();
  clearEchoForm();
  renderEchoList([]);

  const backdrop = document.getElementById('echoSheetBackdrop');
  backdrop.classList.remove('echo-hidden');
  document.body.classList.add('modal-open');

  subscribeEchoes(post.id);
}

function closeEchoSheet() {
  unsubscribeEchoes();
  const backdrop = document.getElementById('echoSheetBackdrop');
  if (backdrop) backdrop.classList.add('echo-hidden');
  document.body.classList.remove('modal-open');
  collapseEchoCompose();
  clearEchoForm();
}

/* ────────────────────────────────────────────────────────────
   ORIGINAL POST CARD
──────────────────────────────────────────────────────────── */
function populateEchoOgCard(post) {
  const card = document.getElementById('echoOgCard');
  if (!card) return;
  const k         = post.knowledge || {};
  const vibe      = post.emotion || post.feeling || 'Nostalgia';
  const vcfg      = ECHO_VIBE_CFG[vibe] || ECHO_VIBE_CFG['Nostalgia'];
  const vibeLabel = ECHO_VIBES.find(v => v.value === vibe)?.label || vibe;
  card.innerHTML = `
    <div class="echo-og-lyric">"${post.text || ''}"</div>
    <div class="echo-og-meta">
      <span class="echo-og-song">${k.song || 'Unknown Song'} — ${k.artist || ''}</span>
      <span class="echo-vibe-tag" style="background:${vcfg.bg};color:${vcfg.text};border:1px solid ${vcfg.border}">
        ${vibeLabel}
      </span>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────
   COMPOSE AREA
──────────────────────────────────────────────────────────── */
function populateEchoComposeUser() {
  if (typeof MargoUsername === 'undefined') return;
  const name   = MargoUsername.get();
  const avatar = document.getElementById('echoComposeAvatar');
  const fAvatar= document.getElementById('echoFormAvatar');
  const fName  = document.getElementById('echoFormUsername');
  const { color } = MargoUsername.getColor(name);
  if (avatar)  { avatar.innerHTML  = ''; avatar.appendChild(MargoUsername.buildAvatar(name, 28)); }
  if (fAvatar) { fAvatar.innerHTML = ''; fAvatar.appendChild(MargoUsername.buildAvatar(name, 22)); }
  if (fName)   { fName.textContent = name; fName.style.color = color; }
}

function expandEchoCompose() {
  const collapsed = document.getElementById('echoCollapsed');
  if (collapsed) collapsed.style.display = 'none';
  const form = document.getElementById('echoComposeForm');
  if (form) { form.classList.add('open'); form.style.display = 'flex'; }
  document.getElementById('echoLyricInput')?.focus();
}

function collapseEchoCompose() {
  const collapsed = document.getElementById('echoCollapsed');
  if (collapsed) collapsed.style.display = '';
  const form = document.getElementById('echoComposeForm');
  if (form) { form.classList.remove('open'); form.style.display = 'none'; }
}

function clearEchoForm() {
  ['echoLyricInput','echoSongInput','echoArtistInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cc = document.getElementById('echoCharCount');
  if (cc) cc.textContent = '0';
  const submitBtn = document.getElementById('echoSubmitBtn');
  if (submitBtn) submitBtn.disabled = true;
  document.querySelectorAll('.echo-vibe-opt').forEach(b => b.classList.remove('active'));
  const gr = document.getElementById('echoGeniusResults');
  if (gr) gr.innerHTML = '';
  const lh = document.getElementById('echoLiveHint');
  if (lh) lh.style.display = 'none';
}

/* ────────────────────────────────────────────────────────────
   FIREBASE SUBSCRIBE / UNSUBSCRIBE
──────────────────────────────────────────────────────────── */
function subscribeEchoes(postId) {
  unsubscribeEchoes();
  let _subDb; try { _subDb = firebase.database(); } catch(_) { return; }
  if (!_subDb) return;

  try {
    const ref = _subDb.ref('posts').child(postId).child('echoes');
    const handler = snap => {
      ES.echoes = [];
      snap.forEach(child => {
        const echo = child.val();
        echo.id = child.key;
        ES.echoes.push(echo);
      });
      ES.echoes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderEchoList(ES.echoes);
    };
    ref.on('value', handler);
    ES.echoListener = () => ref.off('value', handler);
  } catch (err) {
    console.error('[Echo] subscribe error:', err);
  }
}

function unsubscribeEchoes() {
  if (ES.echoListener) { ES.echoListener(); ES.echoListener = null; }
}

/* ────────────────────────────────────────────────────────────
   RENDER ECHO LIST
──────────────────────────────────────────────────────────── */
function renderEchoList(echoes) {
  const list       = document.getElementById('echoList');
  const countLabel = document.getElementById('echoCountLabel');
  if (!list) return;

  if (countLabel) {
    countLabel.textContent = `${echoes.length} echo${echoes.length !== 1 ? 's' : ''}`;
  }

  if (!echoes.length) {
    list.innerHTML = `
      <div class="echo-empty">
        <div class="echo-empty-icon">♪</div>
        <div class="echo-empty-title">No echoes yet</div>
        <div class="echo-empty-sub">Be the first to Lyric Back — drop the song that answers this one.</div>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  echoes.forEach((echo, i) => {
    const card = buildEchoCard(echo, i);
    list.appendChild(card);
  });
}

function buildEchoCard(echo, idx) {
  const username      = echo.username || 'Anonymous';
  const vibe          = echo.emotion || echo.feeling || 'Nostalgia';
  const vcfg          = ECHO_VIBE_CFG[vibe] || ECHO_VIBE_CFG['Nostalgia'];
  const vibeLabel     = ECHO_VIBES.find(v => v.value === vibe)?.label || vibe;
  const resonateCount = Object.keys(echo.resonates || {}).length;
  const myUserId      = typeof userId !== 'undefined' ? userId : '';
  const hasResonated  = !!(echo.resonates && echo.resonates[myUserId]);

  let avatarColor = '#E8C547';
  let avatarIcon  = '♪';
  if (typeof MargoUsername !== 'undefined') {
    const c = MargoUsername.getColor(username);
    avatarColor = c.color;
    const instr = MargoUsername.getInstrument ? MargoUsername.getInstrument(username) : '';
    const icons = {
      Guitar:'♬', Piano:'♪', Violin:'🎻', Cello:'🎻', Drums:'🥁',
      Bass:'♬', Flute:'♩', Harp:'♫', Trumpet:'🎺', Sitar:'♬',
      Viola:'🎻', Banjo:'♬', Saxophone:'🎷', Clarinet:'♩',
      Ukulele:'♬', Organ:'♪', Synth:'⌨', Mandolin:'♬', Trombone:'🎺',
    };
    avatarIcon = icons[instr] || '♪';
  }

  const timeStr = typeof timeAgo === 'function' && echo.timestamp ? timeAgo(echo.timestamp) : '';
  const colorBg = typeof MargoUsername !== 'undefined' ? MargoUsername.getColor(username).colorBg : 'rgba(232,197,71,0.1)';

  const card = document.createElement('div');
  card.className = 'echo-card';
  card.style.animationDelay = `${idx * 0.04}s`;
  card.innerHTML = `
    <div class="echo-card-header">
      <div class="echo-user-row">
        <div style="width:22px;height:22px;border-radius:50%;
          background:${colorBg};border:1.5px solid ${avatarColor};
          display:flex;align-items:center;justify-content:center;
          font-size:0.7rem;flex-shrink:0;color:${avatarColor}">
          ${avatarIcon}
        </div>
        <span class="echo-username" style="color:${avatarColor}">${username}</span>
        <span class="echo-time">${timeStr}</span>
      </div>
    </div>
    <div class="echo-lyric">"${echo.lyric || ''}"</div>
    <div class="echo-song-row">
      <div class="echo-song-info">
        <div class="echo-song-name">${echo.song || 'Unknown Song'}</div>
        <div class="echo-artist-name">${echo.artist || ''}</div>
      </div>
      <span class="echo-vibe-tag" style="background:${vcfg.bg};color:${vcfg.text};border:1px solid ${vcfg.border}">
        ${vibeLabel}
      </span>
    </div>
    <div class="echo-card-actions">
      <button class="echo-action-btn echo-resonate-btn ${hasResonated ? 'resonated' : ''}" data-echo-id="${echo.id}">
        ♥ ${resonateCount > 0 ? resonateCount : 'Resonate'}
      </button>
      <button class="echo-action-btn echo-share-btn" data-echo-idx="${idx}">
        ↗ GIF · Poster
      </button>
    </div>
  `;

  card.querySelector('.echo-resonate-btn').onclick = () => resonateEcho(echo.id);
  card.querySelector('.echo-share-btn').onclick    = () => openDuetShareSheet(echo);

  return card;
}

/* ────────────────────────────────────────────────────────────
   RESONATE ON ECHO
──────────────────────────────────────────────────────────── */
function resonateEcho(echoId) {
  if (!ES.post?.id || !echoId) return;
  let _rDb; try { _rDb = firebase.database(); } catch(_) { return; }
  if (!_rDb) return;
  const myId = typeof userId !== 'undefined' ? userId : 'anon';
  try {
    const ref = _rDb.ref('posts')
      .child(ES.post.id).child('echoes').child(echoId).child('resonates').child(myId);
    ref.once('value').then(snap => {
      if (snap.exists()) ref.remove();
      else ref.set(true);
    });
  } catch (err) {
    console.error('[Echo] resonate error:', err);
  }
}

/* ────────────────────────────────────────────────────────────
   DUET SHARE
──────────────────────────────────────────────────────────── */
function openDuetShareSheet(echo) {
  if (typeof openShareSheet === 'function') {
    openShareSheet(ES.post, { isDuet: true, echoPost: echo });
  }
}

/* ────────────────────────────────────────────────────────────
   SUBMIT ECHO — uses firebase.database().ref('posts') DIRECTLY
   Never relies on postsRef global which can be stale
──────────────────────────────────────────────────────────── */
async function submitEcho() {
  if (ES.isSubmitting) return;

  const lyric  = document.getElementById('echoLyricInput')?.value.trim();
  const song   = document.getElementById('echoSongInput')?.value.trim()   || 'Unknown Song';
  const artist = document.getElementById('echoArtistInput')?.value.trim() || 'Unknown Artist';
  const vibe   = document.querySelector('.echo-vibe-opt.active')?.dataset.emotion || 'Nostalgia';

  if (!lyric || lyric.length < 2) {
    if (typeof showToast === 'function') showToast('Add a lyric first');
    return;
  }

  let _db;
  try { _db = firebase.database(); } catch(_) { _db = null; }
  if (!_db) {
    if (typeof showToast === 'function') showToast('Not connected — try again');
    return;
  }

  if (!ES.post?.id) {
    if (typeof showToast === 'function') showToast('Something went wrong — try again');
    return;
  }

  const username = typeof MargoUsername !== 'undefined' ? MargoUsername.get() : 'Anon';

  let ts;
  try { ts = firebase.database.ServerValue.TIMESTAMP; }
  catch (_) { ts = Date.now(); }

  const echoData = {
    lyric, song, artist,
    emotion:   vibe,
    username,
    timestamp: ts,
    resonates: {},
  };

  ES.isSubmitting = true;
  const submitBtn = document.getElementById('echoSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="echo-spinner"></span> Dropping…';
  }

  try {
    /* ── DIRECT db reference — bypasses any stale postsRef ── */
    await _db.ref('posts').child(ES.post.id).child('echoes').push(echoData);

    collapseEchoCompose();
    clearEchoForm();
    if (typeof showToast === 'function') showToast('Lyric dropped ♪');

  } catch (err) {
    console.error('[Echo] submit error:', err.code, err.message);
    const msg = err.code === 'PERMISSION_DENIED' ? 'Permission denied — check Firebase rules' : 'Something went wrong — try again';
    if (typeof showToast === 'function') showToast(msg);
  } finally {
    ES.isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Drop Your Lyric Back';
    }
  }
}

/* ────────────────────────────────────────────────────────────
   GENIUS SEARCH
──────────────────────────────────────────────────────────── */
let _echoLastQuery = '';

async function runEchoGeniusSearch(query) {
  if (query === _echoLastQuery) return;
  _echoLastQuery = query;

  const btn      = document.getElementById('echoIdentifyBtn');
  const liveHint = document.getElementById('echoLiveHint');
  if (btn) { btn.innerHTML = '<span class="echo-spinner"></span> Searching…'; btn.disabled = true; }
  if (liveHint) liveHint.style.display = 'none';
  const resultsEl = document.getElementById('echoGeniusResults');
  if (resultsEl) resultsEl.innerHTML = '';

  try {
    const res  = await fetch(`/api/genius?lyric=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (btn) { btn.textContent = 'Identify Song'; btn.disabled = false; }
    if (!res.ok || !data.results?.length) return;
    renderEchoGeniusResults(data.results);
  } catch (_) {
    if (btn) { btn.textContent = 'Identify Song'; btn.disabled = false; }
  }
}

function renderEchoGeniusResults(results) {
  const el = document.getElementById('echoGeniusResults');
  if (!el) return;
  el.innerHTML = '';

  const label = document.createElement('div');
  label.style.cssText = `font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
    color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;`;
  label.textContent = 'Select the right song';
  el.appendChild(label);

  results.slice(0, 3).forEach(r => {
    const card = document.createElement('div');
    card.style.cssText = `display:flex;align-items:center;gap:10px;padding:9px 12px;
      border-radius:11px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:all 0.18s;margin-bottom:5px;`;
    card.innerHTML = `
      ${r.artwork ? `<img src="${r.artwork}" style="width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0;" alt=""/>` : ''}
      <div style="flex:1;min-width:0">
        <div style="font-size:0.78rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.song}</div>
        <div style="font-size:0.65rem;color:rgba(255,255,255,0.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.artist}</div>
      </div>
      <span style="font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
        padding:3px 8px;border-radius:6px;background:rgba(232,197,71,0.08);
        color:rgba(232,197,71,0.7);border:1px solid rgba(232,197,71,0.2);flex-shrink:0">Use</span>
    `;
    card.onmouseenter = () => card.style.background = 'rgba(232,197,71,0.07)';
    card.onmouseleave = () => card.style.background = 'rgba(255,255,255,0.03)';
    card.onclick = () => {
      const songInput   = document.getElementById('echoSongInput');
      const artistInput = document.getElementById('echoArtistInput');
      if (songInput)   songInput.value   = r.song;
      if (artistInput) artistInput.value = r.artist;
      el.innerHTML = '';
      _echoLastQuery = '';
      const lh = document.getElementById('echoLiveHint');
      if (lh) lh.style.display = 'none';
    };
    el.appendChild(card);
  });
}

async function fillEchoSongMeta(song, artist) {
  // No-op — song/artist set from Genius or manual input
}

/* ────────────────────────────────────────────────────────────
   GLOBAL EXPOSE
──────────────────────────────────────────────────────────── */
window.openEchoSheet  = openEchoSheet;
window.closeEchoSheet = closeEchoSheet;
window.submitEcho     = submitEcho;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountEchoSheet);
} else {
  mountEchoSheet();
}
