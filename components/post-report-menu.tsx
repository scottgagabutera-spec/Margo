'use client'

import { useCallback, useRef, useState } from 'react'
import { FeedIconMore } from '@/components/feed-card-icons'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { useDismissibleLayer } from '@/hooks/useDismissibleLayer'
import { createClient } from '@/lib/supabase/client'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()

export const POST_REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'] as const

export type PostReportMenuProps = {
  postId: string
  isOwner: boolean
  /** Card header: owner sees Delete. Lyric Back row: report only, omit delete. */
  showOwnerDelete?: boolean
  onOwnerDelete?: () => void
  className?: string
  menuClassName?: string
  iconSize?: number
}

export function PostReportMenu({
  postId,
  isOwner,
  showOwnerDelete = false,
  onOwnerDelete,
  className = '',
  menuClassName = '',
  iconSize = 20,
}: PostReportMenuProps) {
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState<string | null>(null)

  const closeAll = useCallback(() => {
    setMenuOpen(false)
    setReportOpen(false)
    setReportMsg(null)
  }, [])

  useDismissibleLayer(menuOpen, closeAll, wrapRef)

  const showReportItem = !isOwner
  const showDeleteItem = isOwner && showOwnerDelete && typeof onOwnerDelete === 'function'
  if (!showReportItem && !showDeleteItem) return null

  const submitReport = async (reason: string) => {
    if (!user?.id || reportBusy) return
    setReportBusy(true)
    setReportMsg(null)
    const { error } = await supabase.from('post_reports').insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
    })
    setReportBusy(false)
    if (error) {
      const msg = String(error.message || '')
      setReportMsg(
        msg.toLowerCase().includes('duplicate') || msg.includes('unique')
          ? 'Already reported.'
          : error.message,
      )
      return
    }
    setReportMsg('Thanks — we received your report.')
    window.setTimeout(() => closeAll(), 1200)
  }

  return (
    <div
      ref={wrapRef}
      className={`margo-post-report-menu${className ? ` ${className}` : ''}`}
      data-no-card-nav
    >
      <button
        type="button"
        className="margo-post-report-menu__trigger margo-post-card__icon-btn"
        aria-label="More actions"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((o) => !o)
          setReportOpen(false)
          setReportMsg(null)
        }}
      >
        <FeedIconMore size={iconSize} />
      </button>
      {menuOpen && !reportOpen ? (
        <div
          role="menu"
          className={`margo-post-report-menu__panel${menuClassName ? ` ${menuClassName}` : ''}`}
        >
          {showReportItem ? (
            <button
              type="button"
              role="menuitem"
              className="margo-post-report-menu__item"
              onClick={() => {
                if (!requireAuth()) return
                setReportOpen(true)
              }}
            >
              Report
            </button>
          ) : null}
          {showDeleteItem ? (
            <button
              type="button"
              role="menuitem"
              className="margo-post-report-menu__item margo-post-report-menu__item--muted"
              onClick={() => {
                closeAll()
                onOwnerDelete?.()
              }}
            >
              Delete
            </button>
          ) : null}
          {reportMsg ? (
            <p className="margo-post-report-menu__msg margo-post-report-menu__msg--err">{reportMsg}</p>
          ) : null}
        </div>
      ) : null}
      {menuOpen && reportOpen ? (
        <div className={`margo-post-report-menu__panel margo-post-report-menu__panel--reasons${menuClassName ? ` ${menuClassName}` : ''}`}>
          <p className="margo-post-report-menu__heading">Why report?</p>
          {POST_REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              disabled={reportBusy}
              className="margo-post-report-menu__item"
              onClick={() => void submitReport(reason)}
            >
              {reason}
            </button>
          ))}
          {reportMsg ? (
            <p className="margo-post-report-menu__msg margo-post-report-menu__msg--ok">{reportMsg}</p>
          ) : null}
          <button
            type="button"
            className="margo-post-report-menu__item margo-post-report-menu__item--back"
            onClick={() => {
              setReportOpen(false)
              setReportMsg(null)
            }}
          >
            Back
          </button>
        </div>
      ) : null}
    </div>
  )
}
