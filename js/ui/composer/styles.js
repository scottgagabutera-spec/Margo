function injectComposerStyles() {
  if (document.getElementById('composerV58Styles')) return;
  const s = document.createElement('style');
  s.id = 'composerV58Styles';
  s.textContent = `
    .m-spinner {
      width:14px;height:14px;border-radius:50%;
      border:2px solid rgba(232,197,71,0.2);
      border-top-color:#E8C547;
      animation:mspin 0.7s linear infinite;
      display:inline-block;flex-shrink:0;
    }
    @keyframes mspin{to{transform:rotate(360deg)}}

    /* ── FIX 1: Hide mode row — Genius handles everything ── */
    .mode-section,
    .composer-mode-row,
    #modeSection {
      display: none !important;
    }
    /* Show share inputs always, hide others */
    #shareInputs  { display: block !important; }
    #guessInputs,
    #discoverInputs { display: none !important; }

    #postAndCreateBtn {
      width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
      padding:18px 24px;border-radius:var(--radius);
      background:linear-gradient(135deg,#E8C547 0%,#D4A820 100%);
      color:#0B0B0D;font-family:var(--font-display);font-weight:900;
      font-size:0.92rem;letter-spacing:1.5px;text-transform:uppercase;
      border:none;cursor:pointer;transition:all 0.22s var(--ease-out);
      box-shadow:0 6px 28px rgba(232,197,71,0.30),inset 0 1px 0 rgba(255,255,255,0.25);
      position:relative;overflow:hidden;white-space:nowrap;
    }
    #postAndCreateBtn::before {
      content:'';position:absolute;inset:0;
      background:linear-gradient(135deg,rgba(255,255,255,0.15) 0%,transparent 60%);
      pointer-events:none;
    }
    #postAndCreateBtn:hover {
      background:linear-gradient(135deg,#F5D46A 0%,#E8C547 100%);
      box-shadow:0 10px 36px rgba(232,197,71,0.45),inset 0 1px 0 rgba(255,255,255,0.3);
      transform:translateY(-2px);
    }
    #postAndCreateBtn:active { transform:scale(0.97);box-shadow:0 4px 16px rgba(232,197,71,0.25); }
    #postAndCreateBtn:disabled { opacity:0.55;cursor:default;transform:none;box-shadow:none; }

    /* ── FIX 2: "or just post" — visible white ── */
    #justPostLink {
      display:block;text-align:center;margin-top:10px;
      font-size:0.68rem;font-family:'Space Mono',monospace;
      letter-spacing:1px;text-transform:uppercase;
      color:rgba(255,255,255,0.6);
      cursor:pointer;background:none;border:none;width:100%;
      padding:6px 0;transition:color 0.18s;
    }
    #justPostLink:hover:not(:disabled) { color:#fff; }
    #justPostLink:disabled { opacity:0.4;cursor:default; }

    #geniusIdentifyBtn {
      width:100%;margin-top:7px;padding:11px 16px;
      border-radius:12px;border:1px dashed rgba(232,197,71,0.3);
      background:rgba(232,197,71,0.04);color:rgba(232,197,71,0.7);
      font-family:'Space Mono',monospace;font-size:0.58rem;
      font-weight:700;letter-spacing:2px;text-transform:uppercase;
      cursor:pointer;transition:all 0.2s;
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    #geniusIdentifyBtn:hover:not(:disabled) { background:rgba(232,197,71,0.09);border-color:rgba(232,197,71,0.55);color:#E8C547; }
    #geniusIdentifyBtn.active { border-color:#E8C547;color:#E8C547;background:rgba(232,197,71,0.08); }
    #geniusIdentifyBtn:disabled { opacity:0.5;cursor:default; }

    .genius-section-label {
      font-size:0.58rem;color:rgba(255,255,255,0.45);letter-spacing:2px;
      text-transform:uppercase;font-family:'Space Mono',monospace;margin:10px 0 6px;
    }
    .genius-results-list { display:flex;flex-direction:column;gap:6px; }
    .genius-result-card {
      display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:all 0.18s;
    }
    .genius-result-card:hover { background:rgba(232,197,71,0.07);border-color:rgba(232,197,71,0.25);transform:translateX(2px); }
    .genius-result-card.selected { background:rgba(232,197,71,0.1);border-color:rgba(232,197,71,0.5); }
    .genius-art { width:42px;height:42px;border-radius:8px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.05); }
    .genius-info { flex:1;min-width:0; }
    .genius-song { font-size:0.82rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .genius-artist { font-size:0.7rem;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px; }
    .genius-use-tag {
      flex-shrink:0;font-size:0.58rem;font-family:'Space Mono',monospace;
      letter-spacing:1px;text-transform:uppercase;padding:4px 9px;border-radius:6px;
      background:rgba(232,197,71,0.08);color:rgba(232,197,71,0.7);border:1px solid rgba(232,197,71,0.2);transition:all 0.15s;
    }
    .genius-result-card:hover .genius-use-tag { background:rgba(232,197,71,0.15);color:#E8C547;border-color:rgba(232,197,71,0.4); }
    .genius-result-card.selected .genius-use-tag { background:#E8C547;color:#0B0B0D;border-color:#E8C547; }

    @keyframes ytSlideIn { from{opacity:0;transform:translateY(8px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
    .yt-card {
      position:relative;margin-top:12px;border-radius:20px;overflow:hidden;
      border:1px solid rgba(232,197,71,0.22);
      background:linear-gradient(160deg,#141210 0%,#0f0e0c 100%);
      box-shadow:0 12px 40px rgba(0,0,0,0.5),0 1px 0 rgba(232,197,71,0.18) inset;
      animation:ytSlideIn 0.35s cubic-bezier(0.16,1,0.3,1);
    }
    .yt-card::before {
      content:'';position:absolute;top:0;left:8%;right:8%;height:1px;
      background:linear-gradient(90deg,transparent,rgba(232,197,71,0.8),transparent);pointer-events:none;
    }
    .yt-card::after {
      content:'';position:absolute;bottom:0;left:20%;right:20%;height:40px;
      background:radial-gradient(ellipse at center bottom,rgba(232,197,71,0.06),transparent);pointer-events:none;
    }
    .yt-card-inner { display:flex;align-items:flex-start;gap:14px;padding:14px 14px 12px; }
    .yt-thumb-wrap { position:relative;flex-shrink:0; }
    .yt-thumb-wrap::after {
      content:'';position:absolute;inset:-1px;border-radius:13px;
      background:linear-gradient(135deg,rgba(232,197,71,0.3),transparent 60%);pointer-events:none;
    }
    .yt-thumb { width:80px;height:80px;border-radius:12px;object-fit:cover;display:block;box-shadow:0 6px 20px rgba(0,0,0,0.6); }
    .yt-info { flex:1;min-width:0;padding-top:2px; }
    .yt-title { font-size:0.88rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;letter-spacing:-0.02em; }
    .yt-channel { font-size:0.68rem;color:rgba(255,255,255,0.4);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .yt-links-row { display:flex;gap:5px;flex-wrap:wrap;margin-top:9px; }
    .yt-listen-link {
      display:inline-flex;align-items:center;gap:4px;
      font-size:0.56rem;font-family:'Space Mono',monospace;font-weight:700;
      letter-spacing:1px;text-transform:uppercase;padding:5px 11px;border-radius:20px;
      text-decoration:none;transition:all 0.2s ease;white-space:nowrap;backdrop-filter:blur(8px);
    }
    .yt-listen-link:hover { transform:translateY(-2px) scale(1.04);filter:brightness(1.25);box-shadow:0 4px 12px rgba(0,0,0,0.3); }
    .yt-link-yt { background:rgba(255,50,50,0.14);color:#ff7070;border:1px solid rgba(255,50,50,0.32); }
    .yt-link-dz { background:rgba(255,100,0,0.14);color:#ff8c3a;border:1px solid rgba(255,100,0,0.32); }
    .yt-link-it { background:rgba(252,60,68,0.14);color:#fc7c82;border:1px solid rgba(252,60,68,0.32); }
    .yt-found-tag {
      flex-shrink:0;align-self:flex-start;margin-top:1px;padding:4px 11px;border-radius:20px;
      font-family:'Space Mono',monospace;font-size:0.5rem;font-weight:700;
      letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap;
    }
    .yt-found-yt { background:rgba(255,50,50,0.12);color:#ff7070;border:1px solid rgba(255,50,50,0.28); }
    .yt-found-dz { background:rgba(255,100,0,0.12);color:#ff8c3a;border:1px solid rgba(255,100,0,0.28); }
    .yt-found-it { background:rgba(252,60,68,0.12);color:#fc7c82;border:1px solid rgba(252,60,68,0.28); }
    .yt-loading {
      display:flex;align-items:center;gap:10px;padding:18px 16px;
      font-size:0.65rem;color:rgba(255,255,255,0.4);
      font-family:'Space Mono',monospace;letter-spacing:0.5px;
    }

    @keyframes ytFadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
    .yt-autocomplete {
      position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:1000;
      background:#18181c;border:1px solid rgba(255,255,255,0.1);border-radius:14px;
      overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.7);animation:ytFadeUp 0.18s ease;
    }
    .yt-ac-item {
      display:flex;align-items:center;gap:10px;padding:9px 13px;cursor:pointer;
      border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.12s;
    }
    .yt-ac-item:last-child { border-bottom:none; }
    .yt-ac-item:hover { background:rgba(232,197,71,0.07); }
    .yt-ac-thumb  { width:38px;height:27px;border-radius:5px;object-fit:cover;flex-shrink:0;background:#222; }
    .yt-ac-song   { font-size:0.78rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .yt-ac-artist { font-size:0.65rem;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .song-input-wrap { position:relative; }

    @media (max-width: 768px) {
      .yt-autocomplete {
        position:fixed !important;left:0 !important;right:0 !important;
        top:auto !important;bottom:0 !important;
        border-radius:18px 18px 0 0 !important;
        max-height:50vh;overflow-y:auto;
        box-shadow:0 -8px 40px rgba(0,0,0,0.6) !important;
      }
    /* ── Composer action buttons ── */
    .composer-actions{display:flex;flex-direction:column;gap:10px;width:100%}
    .composer-secondary-actions{display:flex;gap:10px;width:100%}
    .composer-btn-secondary{flex:1;padding:14px 16px;border-radius:var(--radius);background:transparent;border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.8);font-family:var(--font-display);font-weight:700;font-size:0.72rem;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.2s}
    .composer-btn-secondary:hover{border-color:rgba(255,255,255,0.45);color:#fff;background:rgba(255,255,255,0.05)}
    .composer-btn-secondary:active{transform:scale(0.97)}
    .composer-btn-secondary:disabled{opacity:0.4;cursor:default}
    }
  `;

  document.head.appendChild(s);
}

/* ── STATE ── */
let youtubeData    = null;
let geniusResult   = null;
let geniusTimer    = null;
let ytSuggestTimer = null;
let ytFetchTimer   = null;
let lastGeniusQuery = '';

/* ============================================================
   GENIUS ENGINE
   ============================================================ */