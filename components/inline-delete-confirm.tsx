'use client'

export type InlineDeleteConfirmProps = {
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
  className?: string
}

export function InlineDeleteConfirm({
  busy = false,
  onCancel,
  onConfirm,
  className = '',
}: InlineDeleteConfirmProps) {
  return (
    <div
      className={`margo-inline-delete-confirm${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Delete confirmation"
      data-no-card-nav
    >
      <span className="margo-inline-delete-confirm__prompt">Delete this?</span>
      <button
        type="button"
        className="margo-inline-delete-confirm__cancel"
        disabled={busy}
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        className="margo-inline-delete-confirm__delete"
        disabled={busy}
        onClick={onConfirm}
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
