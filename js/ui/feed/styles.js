/* ============================================================
   MARGO — js/feed.js
   v7.0 — Card height 280px, lyric font-size 1.28rem, line-height 1.45, padding-left 10px
   (was DM Sans 500 — reverted to match prototype editorial feel)
   Size 1.15rem, card height 300px, letter-spacing -0.015em retained.
   All other logic identical to v6.8.
   ============================================================ */

const STREAM_SAMPLES = [
  { text: "I gave you all I had and still you left",             emotion: 'Heartbreak' },
  { text: "Some nights I still hear your voice in the quiet",    emotion: 'Nostalgia'  },
  { text: "Dancing alone was better than lying beside you",      emotion: 'Healing'    },
  { text: "The city never sleeps but I always dream of you",     emotion: 'Love'       },
  { text: "Rage is just grief that forgot how to cry",           emotion: 'Rage'       },
  { text: "Every sunrise is a permission to start over",         emotion: 'Hope'       },
  { text: "I carry your memory like a song I can't name",        emotion: 'Loneliness' },
  { text: "Nothing gold can stay but gold can glow forever",     emotion: 'Nostalgia'  },
  { text: "You were thunder and I was the calm after",           emotion: 'Love'       },
  { text: "Joy is not the absence of pain, it's dancing anyway", emotion: 'Joy'        },
  { text: "Missing someone is just love with nowhere to go",     emotion: 'Loneliness' },
  { text: "I built a home in your chest and you moved out",      emotion: 'Heartbreak' },
  { text: "This one's for you — you know who you are",           emotion: 'SendIt'     },
  { text: "Had to say it through a song because words failed",   emotion: 'LetOut'     },
];

const EMOTION_CFG = {
  Love:       { bg:'rgba(255,107,157,0.13)', text:'#FF6B9D', border:'rgba(255,107,157,0.3)',  strip:'rgba(255,107,157,0.8)',  cardBg:'linear-gradient(160deg,rgba(255,107,157,0.13) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(255,200,220,0.75)', isDark:true },
  Heartbreak: { bg:'rgba(255,80,80,0.11)',   text:'#ff5050', border:'rgba(255,80,80,0.28)',   strip:'rgba(255,80,80,0.75)',   cardBg:'linear-gradient(160deg,rgba(255,60,60,0.14) 0%,#0E0C13 55%)',   lyricText:'#fff', metaText:'rgba(255,180,180,0.7)',   isDark:true },
  Hope:       { bg:'rgba(107,140,255,0.13)', text:'#6B8CFF', border:'rgba(107,140,255,0.3)',  strip:'rgba(107,140,255,0.8)',  cardBg:'linear-gradient(160deg,rgba(107,140,255,0.13) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(180,200,255,0.7)',   isDark:true },
  Nostalgia:  { bg:'rgba(232,197,71,0.11)',  text:'#E8C547', border:'rgba(232,197,71,0.32)',  strip:'rgba(232,197,71,0.9)',   cardBg:'linear-gradient(160deg,rgba(232,197,71,0.12) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(232,210,140,0.7)',   isDark:true },
  Healing:    { bg:'rgba(74,222,128,0.13)',  text:'#4ade80', border:'rgba(74,222,128,0.28)',  strip:'rgba(74,222,128,0.8)',   cardBg:'linear-gradient(160deg,rgba(74,222,128,0.12) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(160,240,190,0.7)',   isDark:true },
  Joy:        { bg:'rgba(255,200,71,0.11)',  text:'#ffc847', border:'rgba(255,200,71,0.3)',   strip:'rgba(255,200,71,0.8)',   cardBg:'linear-gradient(160deg,rgba(255,200,71,0.12) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(255,220,140,0.7)',   isDark:true },
  Rage:       { bg:'rgba(255,100,60,0.13)',  text:'#FF6440', border:'rgba(255,100,60,0.3)',   strip:'rgba(255,100,60,0.8)',   cardBg:'linear-gradient(160deg,rgba(255,80,40,0.15) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(255,180,160,0.7)',   isDark:true },
  Loneliness: { bg:'rgba(160,160,255,0.11)', text:'#a0a0ff', border:'rgba(160,160,255,0.28)', strip:'rgba(160,160,255,0.75)', cardBg:'linear-gradient(160deg,rgba(140,140,255,0.13) 0%,#0E0C13 55%)', lyricText:'#fff', metaText:'rgba(190,190,255,0.65)',  isDark:true },
  SendIt:     { bg:'rgba(0,229,200,0.11)',   text:'#00e5c8', border:'rgba(0,229,200,0.28)',   strip:'rgba(0,229,200,0.8)',    cardBg:'linear-gradient(160deg,rgba(0,229,200,0.12) 0%,#0E0C13 55%)',   lyricText:'#fff', metaText:'rgba(140,240,225,0.7)',   isDark:true },
  LetOut:     { bg:'rgba(200,100,255,0.11)', text:'#c864ff', border:'rgba(200,100,255,0.28)', strip:'rgba(200,100,255,0.8)',  cardBg:'linear-gradient(160deg,rgba(180,80,255,0.13) 0%,#0E0C13 55%)',  lyricText:'#fff', metaText:'rgba(220,170,255,0.7)',   isDark:true },
};
const E_DEFAULT = {
  bg:'rgba(232,197,71,0.11)', text:'#E8C547', border:'rgba(232,197,71,0.25)',
  strip:'rgba(232,197,71,0.8)', cardBg:'linear-gradient(160deg,rgba(232,197,71,0.10) 0%,#0E0C13 55%)',
  lyricText:'#fff', metaText:'rgba(232,210,140,0.65)', isDark:true
};

const VIBE_LABELS = {
  Love:'Love', Heartbreak:'Heartbreak', Hope:'Hope', Nostalgia:'Nostalgia',
  Healing:'Healing', Joy:'Joy', Rage:'Rage', Loneliness:'Loneliness',
  SendIt:'Send It', LetOut:'Let Out',
};

let currentSort = 'fresh';

/* ══════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════ */
function injectFeedStyles() {
  if (document.getElementById('feedV65')) return;
  const s = document.createElement('style');
  s.id = 'feedV65';
  s.textContent = `
    @keyframes cardIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }

    .feed-sort-bar {
      display:flex; align-items:center; gap:6px; padding:0 14px;
    }
    .feed-sort-label {
      font-family:'Space Mono',monospace; font-size:0.44rem; font-weight:700;
      text-transform:uppercase; letter-spacing:2px; color:rgba(255,255,255,0.2);
      flex-shrink:0; margin-right:2px;
    }
    .sort-btn {
      padding:5px 14px; border-radius:50px;
      border:1px solid rgba(255,255,255,0.07);
      background:rgba(255,255,255,0.02); color:rgba(255,255,255,0.3);
      font-family:'Space Mono',monospace; font-size:0.46rem; font-weight:700;
      text-transform:uppercase; letter-spacing:1.5px;
      cursor:pointer; transition:all 0.18s; white-space:nowrap;
    }
    .sort-btn:hover { border-color:rgba(232,197,71,0.3); color:rgba(232,197,71,0.75); background:rgba(232,197,71,0.04); }
    .sort-btn.active { background:rgba(232,197,71,0.10); border-color:rgba(232,197,71,0.45); color:#E8C547; }

    /* ─── CARD BASE ─── */
    #feedList .feed-card {
      height: 280px !important;
      border-radius: 14px !important;
      padding: 14px 14px 46px 18px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0 !important;
      position: relative !important;
      overflow: hidden !important;
      cursor: pointer;
      animation: cardIn 0.3s ease both;
      transition: transform 0.22s cubic-bezier(0.4,0,0.2,1),
                  border-color 0.22s, box-shadow 0.22s !important;
    }
    #feedList .feed-card::before {
      content:''; position:absolute; top:0; left:0; right:0; height:1px;
      background:linear-gradient(90deg,
        transparent 0%, var(--e-strip-color,rgba(232,197,71,0.55)) 25%,
        var(--e-strip-color,rgba(232,197,71,1)) 50%,
        var(--e-strip-color,rgba(232,197,71,0.55)) 75%, transparent 100%);
      pointer-events:none;
    }
    #feedList .feed-card::after {
      content:''; position:absolute;
      top:16px; left:0; bottom:46px; width:3px;
      background:var(--e-strip,rgba(232,197,71,0.8));
      border-radius:0 4px 4px 0; opacity:0.9; pointer-events:none;
    }
    #feedList .feed-card:hover {
      border-color:var(--e-border,rgba(232,197,71,0.28)) !important;
      transform:translateY(-2px);
      box-shadow:0 14px 44px rgba(0,0,0,0.55) !important;
    }

    /* ─── CARD LAYOUT ─── */
    #feedList .card-top {
      display:flex; justify-content:space-between;
      align-items:center; flex-shrink:0;
      height:22px; margin-bottom:10px;
    }
    #feedList .card-lyric {
      font-family:'Instrument Serif', serif !important;
      font-style:normal !important;
      font-weight:400 !important;
      overflow:hidden !important;
      display:-webkit-box !important;
      -webkit-line-clamp:3 !important;
      -webkit-box-orient:vertical !important;
      flex-shrink:0 !important; line-height:1.45 !important;
      margin-bottom:8px !important;
      font-size:1.28rem !important;
      letter-spacing:-0.015em !important;
      padding-left:10px !important;
    }
    #feedList .card-emotion-tag {
      flex-shrink:0 !important;
      margin-bottom:0 !important;
      align-self:center !important;
    }

    #feedList .card-song {
      display:flex !important; align-items:center !important;
      gap:9px !important; flex-shrink:0 !important;
      min-height:44px !important; overflow:hidden !important;
      padding-top:8px !important;
      border-top:1px solid rgba(255,255,255,.07) !important;
      margin-top:auto !important;
    }
    #feedList .card-song-text { flex:1; min-width:0; }

    /* ── OLD MODE SECTIONS — HIDDEN ENTIRELY ── */
    #feedList .card-mystery,
    #feedList .card-discover {
      display: none !important;
    }

    /* Hide old card-actions — resonate.js builds card-actions-v2 */
    #feedList .card-actions { display:none !important; }

    /* ─── ACTION ROW — pinned absolutely to bottom ─── */
    #feedList .card-actions-v2 {
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 46px !important;
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      padding: 0 10px !important;
      background: linear-gradient(to top,
        rgba(0,0,0,0.7) 0%,
        rgba(0,0,0,0.4) 60%,
        transparent 100%) !important;
      border-top: 1px solid rgba(255,255,255,0.07) !important;
      z-index: 3 !important;
    }

    /* ─── RESONATE BUTTON ─── */
    #feedList .card-resonate-btn {
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      height: 30px !important;
      padding: 0 12px !important;
      border-radius: 8px !important;
      background: rgba(192,132,252,0.10) !important;
      border: 1px solid rgba(192,132,252,0.28) !important;
      color: rgba(255,255,255,0.9) !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 0.56rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.3px !important;
      text-transform: uppercase !important;
      cursor: pointer !important;
      transition: background 0.14s, border-color 0.14s, transform 0.1s !important;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
      position: relative !important;
      overflow: hidden !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    #feedList .card-resonate-btn:hover {
      background: rgba(192,132,252,0.2) !important;
      border-color: rgba(192,132,252,0.55) !important;
      color: #fff !important;
      transform: translateY(-1px) !important;
    }
    #feedList .card-resonate-btn:active { transform: scale(0.94) !important; }
    #feedList .card-resonate-btn.resonated {
      background: rgba(192,132,252,0.2) !important;
      border-color: rgba(192,132,252,0.6) !important;
      color: #C084FC !important;
    }
    #feedList .r-icon {
      font-size: 0.82rem !important;
      line-height: 1 !important;
      transition: transform 0.2s !important;
    }
    #feedList .card-resonate-btn.resonated .r-icon {
      transform: scale(1.4) rotate(20deg) !important;
    }
    #feedList .r-count {
      color: #00E5FF !important;
      font-size: 0.58rem !important;
      font-family: 'Space Mono', monospace !important;
      font-weight: 700 !important;
    }

    /* ─── LYRIC BACK BUTTON ─── */
    #feedList .card-lyric-back-btn {
      flex: 1 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      height: 30px !important;
      padding: 0 8px !important;
      border-radius: 8px !important;
      background: rgba(232,197,71,0.07) !important;
      border: 1px solid rgba(232,197,71,0.22) !important;
      color: rgba(255,255,255,0.88) !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 0.53rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.3px !important;
      text-transform: uppercase !important;
      cursor: pointer !important;
      transition: background 0.14s, border-color 0.14s, transform 0.1s !important;
      white-space: nowrap !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    #feedList .card-lyric-back-btn:hover {
      background: rgba(232,197,71,0.15) !important;
      border-color: rgba(232,197,71,0.5) !important;
      color: #fff !important;
      transform: translateY(-1px) !important;
    }
    #feedList .card-lyric-back-btn:active { transform: scale(0.94) !important; }
    #feedList .lyric-back-count {
      font-size: 0.53rem !important;
      font-family: 'Space Mono', monospace !important;
      font-weight: 700 !important;
      color: #E8C547 !important;
      opacity: 0.75 !important;
    }

    /* ─── GIF · POSTER BUTTON ─── */
    #feedList .card-share-btn {
      display: flex !important;
      align-items: center !important;
      gap: 3px !important;
      height: 30px !important;
      padding: 0 11px !important;
      border-radius: 8px !important;
      background: rgba(255,255,255,0.05) !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      color: rgba(255,255,255,0.75) !important;
      font-family: 'Space Mono', monospace !important;
      font-size: 0.5rem !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
      cursor: pointer !important;
      transition: background 0.14s, border-color 0.14s, color 0.14s, transform 0.1s !important;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    #feedList .card-share-btn:hover {
      background: rgba(232,197,71,0.12) !important;
      border-color: rgba(232,197,71,0.4) !important;
      color: #fff !important;
      transform: translateY(-1px) !important;
    }
    #feedList .card-share-btn:active { transform: scale(0.94) !important; }
    #feedList .card-share-dot {
      opacity: 0.35 !important;
      margin: 0 1px !important;
      font-size: 0.6rem !important;
    }

    /* Ripple */
    #feedList .r-ripple {
      position:absolute !important; inset:0 !important; border-radius:8px !important;
      background:radial-gradient(circle,rgba(192,132,252,.5) 0%,transparent 70%) !important;
      opacity:0 !important; pointer-events:none !important;
    }
    @keyframes rBurst {
      0%{opacity:1;transform:scale(0)} 65%{opacity:.3;transform:scale(2)} 100%{opacity:0;transform:scale(3.5)}
    }
    #feedList .r-ripple.go { animation:rBurst .42s ease-out forwards !important; }

    /* YouTube thumbnail */
    .card-yt-thumb-wrap {
      position:relative; flex-shrink:0;
      width:56px; height:38px; border-radius:6px; overflow:hidden;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
      cursor:pointer;
    }
    .card-yt-thumb { width:100%; height:100%; object-fit:cover; display:block; }
    .card-yt-play {
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.55); color:#fff;
      opacity:0; transition:opacity 0.18s;
      text-decoration:none; border-radius:5px;
    }
    .card-yt-thumb-wrap:hover .card-yt-play { opacity:1; }
    @media(max-width:768px){ .card-yt-play{ opacity:1; background:rgba(0,0,0,0.4); } }

    /* Skeletons */
    @keyframes skShimmer {
      0%  { background-position:-400px 0; }
      100%{ background-position: 400px 0; }
    }
    .skeleton-card { pointer-events:none !important; min-height:200px !important; }
    .sk-line,.sk-block {
      border-radius:6px;
      background:linear-gradient(90deg,
        rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,
        rgba(255,255,255,0.03) 75%);
      background-size:800px 100%;
      animation:skShimmer 1.5s infinite linear;
    }
    .sk-short  { height:9px; width:28%; margin-bottom:14px; }
    .sk-block  { height:52px; width:100%; margin-bottom:12px; border-radius:10px; }
    .sk-medium { height:9px; width:48%; margin-bottom:10px; }
    .sk-row    { display:flex; gap:8px; margin-top:4px; }
    .sk-long   { height:30px; flex:1; border-radius:8px; }

    .yt-bg-option {
      display:flex; align-items:center; gap:10px; padding:10px 12px;
      border-radius:10px; background:rgba(255,0,0,0.07);
      border:1px solid rgba(255,0,0,0.2); cursor:pointer;
      margin-bottom:10px; transition:background 0.18s;
    }
    .yt-bg-option:hover { background:rgba(255,0,0,0.13); }
    .yt-bg-option img { width:56px; height:38px; border-radius:6px; object-fit:cover; flex-shrink:0; }
    .yt-bg-option-label { font-size:0.65rem; font-weight:700; color:#ff5555; font-family:'Space Mono',monospace; letter-spacing:1px; text-transform:uppercase; }
    .yt-bg-option-title { font-size:0.7rem; color:rgba(255,255,255,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px; }

    .scroll-top,[id*="scrollTop"]:not(#margoScrollTop) {
      display:none !important; opacity:0 !important; pointer-events:none !important;
    }

    @media(max-width:480px){ .skeleton-card{ min-height:180px !important; } }
    @media(max-width:768px){ .modal-sheet{ max-height:92dvh; overflow-y:auto; -webkit-overflow-scrolling:touch; } }
  `;
  document.head.appendChild(s);
}

/* ── Sort bar ── */
