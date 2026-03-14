function _shareGif(p1, p2, opts) {
  if (navigator.share) {
    const snapOpts = Object.assign({}, opts);
    const snapFn   = DS.view === 'convo'
      ? () => _snapConvoPng(p1, p2, snapOpts)
      : () => new Promise(res => {
          const canvas = _el('_dsCvs');
          if (canvas) canvas.toBlob(b => res(b), 'image/png');
          else res(null);
        });

    snapFn().then(async blob => {
      if (!blob) return;
      try {
        const file = new File([blob], 'margo-duet.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Lyric Back on Margo', url: 'https://trymargo.com' });
      } catch {
        _triggerDl(blob, `margo-duet-${Date.now()}.png`);
      }
    });
  } else {
    // No Web Share API — fall back to download
    DS.view === 'convo' ? _exportConvoGif(p1, p2, opts) : _exportCardGif(p1, p2, opts);
  }
}

function _savePng() {
  const canvas = _el('_dsCvs');
  if (canvas) {
    canvas.toBlob(blob => { if (blob) _triggerDl(blob, `margo-duet-${Date.now()}.png`); }, 'image/png');
  }
}

function _triggerDl(blob, name) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
function _el(id) { return document.getElementById(id); }
function _qAll(sel) { return Array.from(document.querySelectorAll(sel)); }
function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur+' '+w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur); return lines;
}
function _mix(h1, h2, t) {
  const p = c => [parseInt(c.replace('#','').slice(0,2),16), parseInt(c.replace('#','').slice(2,4),16), parseInt(c.replace('#','').slice(4,6),16)];
  const a = p(h1), b = p(h2);
  return `rgb(${Math.round(a[0]*(1-t)+b[0]*t)},${Math.round(a[1]*(1-t)+b[1]*t)},${Math.round(a[2]*(1-t)+b[2]*t)})`;
}

/* ══════════════════════════════════════════════════════════
   EXPOSE
══════════════════════════════════════════════════════════ */
window.openDuetSheet  = openSheet;
window.closeDuetSheet = closeSheet;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _mount);
} else {
  _mount();
}

})();
