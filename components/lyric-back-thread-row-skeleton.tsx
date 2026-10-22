'use client'

/** Reserved height for song strip so rows do not shift when artwork loads. */
export function LyricBackTrackStripPlaceholder() {
  return (
    <div className="margo-lb-thread-row__track-row margo-lb-thread-row__track-row--placeholder" aria-hidden>
      <div className="margo-lb-thread-row__track-art">
        <div className="margo-lb-thread-row__art margo-lb-thread-row__art--placeholder" />
      </div>
      <div className="margo-lb-thread-row__track-meta">
        <span className="margo-lb-thread-row__song margo-lb-thread-row__song--placeholder" />
        <span className="margo-lb-thread-row__artist margo-lb-thread-row__artist--placeholder" />
      </div>
      <div className="margo-lb-thread-row__snippet-btn margo-lb-thread-row__snippet-btn--placeholder" />
    </div>
  )
}
