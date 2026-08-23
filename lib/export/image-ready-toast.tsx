'use client'

import type { CSSProperties } from 'react'
import { toast } from 'sonner'
import { logExportDebug } from '@/lib/export/export-debug'
import {
  downloadPngBlob,
  sharePngFile,
  createSharePngFile,
  type PreparedShareImage,
} from '@/lib/export/share-image-blob'
import { UI_FONT } from '@/lib/fonts'

const btnStyle: CSSProperties = {
  minHeight: 'var(--margo-touch-min, 44px)',
  padding: '0 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-hi)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--text)',
  fontFamily: UI_FONT,
  fontSize: '0.72rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const primaryBtnStyle: CSSProperties = {
  ...btnStyle,
  background: 'var(--gold-faint)',
  borderColor: 'var(--gold)',
  color: 'var(--gold)',
}

/**
 * After a validated PNG exists, show explicit separate actions:
 * Share image (if supported) · Save image · Copy link
 */
export function showImageReadyToast(
  prepared: PreparedShareImage,
  opts: { shareUrl: string; attemptId: string },
): void {
  const { blob, filename, canShareFiles } = prepared

  logExportDebug('image-ready-toast:show', {
    attemptId: opts.attemptId,
    canShareFiles,
    filename,
    byteSize: blob.size,
  })

  toast.custom((t) => (
    <div style={{
      padding: '14px 16px',
      background: 'var(--surface, #0F0E13)',
      border: '1px solid var(--border-hi)',
      borderRadius: '12px',
      minWidth: 'min(320px, calc(100vw - 32px))',
      boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    }}>
      <p style={{
        margin: 0,
        fontFamily: UI_FONT,
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text)',
      }}>
        Image ready
      </p>
      <p style={{
        margin: '4px 0 0',
        fontFamily: UI_FONT,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
      }}>
        Share the image, save it, or copy the song link — separately.
      </p>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '12px',
      }}>
        {canShareFiles ? (
          <button
            type="button"
            style={primaryBtnStyle}
            onClick={() => {
              toast.dismiss(t)
              const file = createSharePngFile(blob, filename)
              logExportDebug('image-ready-toast:action', {
                attemptId: opts.attemptId,
                action: 'share-image',
              })
              void sharePngFile(file).then((result) => {
                if (result === 'shared') toast.success('Shared')
                else if (result === 'cancelled') toast.message('Share cancelled')
                else toast.error('Could not share image')
              })
            }}
          >
            Share image
          </button>
        ) : null}
        <button
          type="button"
          style={canShareFiles ? btnStyle : primaryBtnStyle}
          onClick={() => {
            toast.dismiss(t)
            logExportDebug('image-ready-toast:action', {
              attemptId: opts.attemptId,
              action: 'save-image',
            })
            downloadPngBlob(blob, filename)
            toast.success('Image saved')
          }}
        >
          Save image
        </button>
        <button
          type="button"
          style={btnStyle}
          onClick={() => {
            toast.dismiss(t)
            logExportDebug('image-ready-toast:action', {
              attemptId: opts.attemptId,
              action: 'copy-link',
            })
            void navigator.clipboard?.writeText(opts.shareUrl).then(() => {
              toast.success('Link copied')
            }).catch(() => {
              toast.error('Could not copy link')
            })
          }}
        >
          Copy link
        </button>
      </div>
    </div>
  ), { duration: 45_000 })
}
