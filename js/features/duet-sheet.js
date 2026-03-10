/* ============================================================
   MARGO — js/features/duet-sheet.js
   v1.0
   Handles the GIF · POSTER button inside Lyric Back (echoes).
   When a user taps GIF · POSTER on an echo card, this file
   receives both the original post and the echo, then opens
   the share sheet in duet mode.

   Called by echoes.js:
     openDuetSheet(originalPost, echo)

   Delegates to share-sheet.js:
     openShareSheet(post, { isDuet: true, echoPost })
   ============================================================ */

/**
 * openDuetSheet — called from echoes.js when user taps GIF · POSTER
 * on an echo card inside Lyric Back.
 *
 * @param {object} originalPost  — the parent lyric post object
 * @param {object} echo          — the echo object (lyric, song, artist, emotion)
 */
function openDuetSheet(originalPost, echo) {
  if (!originalPost || !echo) return;

  // Build a post-shaped object from the echo so share-sheet.js
  // can render it the same way as any other post
  const echoPost = {
    text:      echo.lyric    || '',
    emotion:   echo.emotion  || echo.feeling || 'Nostalgia',
    username:  echo.username || 'Anonymous',
    timestamp: echo.timestamp,
    knowledge: {
      song:   echo.song   || 'Unknown Song',
      artist: echo.artist || 'Unknown Artist',
    },
    // No youtubeMeta for echoes — that's fine, share sheet handles missing thumb
  };

  // Delegate to share-sheet.js with duet opts
  if (typeof openShareSheet === 'function') {
    openShareSheet(originalPost, {
      isDuet:   true,
      echoPost: echoPost,
    });
  } else {
    // Fallback — just open share sheet with the echo alone
    if (typeof openShareSheet === 'function') {
      openShareSheet(echoPost);
    }
  }
}

// Expose globally so echoes.js can call it
window.openDuetSheet = openDuetSheet;
