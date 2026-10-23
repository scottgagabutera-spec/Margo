'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { FeedIconMore } from '@/components/feed-card-icons'
import { MargoSheet } from '@/components/margo-sheet'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import {
  MAX_POST_REPORT_NOTE,
  POST_REPORT_REASONS,
  type PostReportReason,
  postReportSubmitEnabled,
} from '@/lib/post-report'
import { computeReportPopoverPosition } from '@/lib/post-report-menu-position'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export { POST_REPORT_REASONS }

const MENU_W = 168
const MENU_ROW_H = 36
const MENU_PAD = 4

export type PostReportMenuProps = {
  postId: string
  isOwner: boolean
  showOwnerDelete?: boolean
  onOwnerDelete?: () => void
  /** Owner delete blocked (e.g. active Lyric Backs below). */
  ownerDeleteBlocked?: boolean
  /** One short line under disabled Delete — no sentences. */
  ownerDeleteBlockedHint?: string
  showOwnerEdit?: boolean
  onOwnerEdit?: () => void
  className?: string
  iconSize?: number
}

function ReportRowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4v16M4 4h11l3 3v13H4V4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditRowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a1.4 1.4 0 0 0 0-2L16.5 5.5a1.4 1.4 0 0 0-2 0L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DeleteRowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5h6v2M8 11v7M12 11v7M16 11v7M6 7l1 13h10l1-13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReasonCheckIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="margo-post-report-menu__sheet-check"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <path
        d="M5 12.5L10 17.5L19 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PostReportMenu({
  postId,
  isOwner,
  showOwnerDelete = false,
  onOwnerDelete,
  ownerDeleteBlocked = false,
  ownerDeleteBlockedHint = 'Lyric Backs below',
  showOwnerEdit = false,
  onOwnerEdit,
  className = '',
  iconSize = 20,
}: PostReportMenuProps) {
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const menuId = useId()
  const noteId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState<string | null>(null)
  const [selectedReason, setSelectedReason] = useState<PostReportReason | null>(null)
  const [otherNote, setOtherNote] = useState('')
  const [alreadyReported, setAlreadyReported] = useState(false)
  const [reportStatusLoading, setReportStatusLoading] = useState(false)

  const showReportItem = !isOwner
  const showEditItem = isOwner && showOwnerEdit && typeof onOwnerEdit === 'function'
  const showDeleteItem =
    isOwner && showOwnerDelete && (typeof onOwnerDelete === 'function' || ownerDeleteBlocked)
  const itemCount =
    (showReportItem ? 1 : 0) + (showEditItem ? 1 : 0) + (showDeleteItem ? 1 : 0)
  const canSubmit = postReportSubmitEnabled(selectedReason) && !reportBusy && !alreadyReported

  useEffect(() => setMounted(true), [])

  const resetSheetForm = useCallback(() => {
    setSelectedReason(null)
    setOtherNote('')
    setReportMsg(null)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setPos(null)
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    resetSheetForm()
    triggerRef.current?.focus({ preventScroll: true })
  }, [resetSheetForm])

  const closeAll = useCallback(() => {
    closeMenu()
    closeSheet()
  }, [closeMenu, closeSheet])

  useEffect(() => {
    if (!sheetOpen || !user?.id) return
    let cancelled = false
    setReportStatusLoading(true)
    void (async () => {
      try {
        const { data } = await supabase
          .from('post_reports')
          .select('id')
          .eq('post_id', postId)
          .eq('reporter_id', user.id)
          .maybeSingle()
        if (cancelled) return
        setAlreadyReported(!!data)
      } catch {
        /* best-effort */
      } finally {
        if (!cancelled) setReportStatusLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sheetOpen, user?.id, postId])

  useLayoutEffect(() => {
    if (!menuOpen || itemCount === 0) {
      setPos(null)
      return
    }
    const measure = () => {
      const btn = triggerRef.current
      const menu = menuRef.current
      if (!btn) return
      const menuHeight = menu?.offsetHeight ?? MENU_PAD * 2 + itemCount * MENU_ROW_H
      const r = btn.getBoundingClientRect()
      const vv = window.visualViewport
      const viewportTop = vv?.offsetTop ?? 0
      const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
      const viewportWidth = vv?.width ?? window.innerWidth
      const next = computeReportPopoverPosition({
        triggerRect: r,
        menuWidth: MENU_W,
        menuHeight,
        viewportTop,
        viewportBottom,
        viewportWidth,
      })
      setPos({ top: next.top, left: next.left })
    }
    measure()
    const vv = window.visualViewport
    vv?.addEventListener('resize', measure)
    vv?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      vv?.removeEventListener('resize', measure)
      vv?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [menuOpen, itemCount])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: Event) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      closeMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    const onScroll = () => closeMenu()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpen, closeMenu])

  if (itemCount === 0) return null

  const openReportSheet = () => {
    if (!requireAuth()) return
    closeMenu()
    resetSheetForm()
    setAlreadyReported(false)
    setSheetOpen(true)
  }

  const submitReport = async () => {
    if (!user?.id || reportBusy || !selectedReason || alreadyReported) return
    setReportBusy(true)
    setReportMsg(null)
    try {
      const res = await fetch('/api/posts/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          reason: selectedReason,
          note: selectedReason === 'Other' ? otherNote : null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
      if (res.status === 409 || json.code === 'already_reported') {
        setAlreadyReported(true)
        setReportMsg(null)
        return
      }
      if (res.status === 403) {
        setReportMsg('Could not send.')
        return
      }
      if (!res.ok) {
        setReportMsg(json.error === 'Too many reports. Try again later.' ? json.error : 'Could not send.')
        return
      }
      setAlreadyReported(true)
      setReportMsg('Report received.')
      const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900
      window.setTimeout(() => closeSheet(), delay)
    } catch {
      setReportMsg('Could not send.')
    } finally {
      setReportBusy(false)
    }
  }

  const popover =
    menuOpen && mounted
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="margo-post-report-menu__popover"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: MENU_W,
              visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {showReportItem ? (
              <button
                type="button"
                role="menuitem"
                className="margo-post-report-menu__row"
                onClick={(e) => {
                  e.stopPropagation()
                  openReportSheet()
                }}
              >
                <ReportRowIcon />
                <span>Report</span>
              </button>
            ) : null}
            {showEditItem ? (
              <button
                type="button"
                role="menuitem"
                className="margo-post-report-menu__row"
                onClick={(e) => {
                  e.stopPropagation()
                  closeAll()
                  onOwnerEdit?.()
                }}
              >
                <EditRowIcon />
                <span>Edit</span>
              </button>
            ) : null}
            {showDeleteItem ? (
              <div className="margo-post-report-menu__row-wrap">
                <button
                  type="button"
                  role="menuitem"
                  className="margo-post-report-menu__row margo-post-report-menu__row--muted"
                  disabled={ownerDeleteBlocked}
                  aria-disabled={ownerDeleteBlocked}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (ownerDeleteBlocked) return
                    closeAll()
                    onOwnerDelete?.()
                  }}
                >
                  <DeleteRowIcon />
                  <span>Delete</span>
                </button>
                {ownerDeleteBlocked ? (
                  <p className="margo-post-report-menu__row-hint">{ownerDeleteBlockedHint}</p>
                ) : null}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div
        className={`margo-post-report-menu${className ? ` ${className}` : ''}`}
        data-no-card-nav
      >
        <button
          ref={triggerRef}
          type="button"
          className="margo-post-report-menu__trigger margo-post-card__icon-btn"
          aria-label="More actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuOpen ? menuId : undefined}
          onClick={(e) => {
            e.stopPropagation()
            if (menuOpen) {
              closeMenu()
              return
            }
            setReportMsg(null)
            setMenuOpen(true)
          }}
        >
          <FeedIconMore size={iconSize} />
        </button>
      </div>
      {popover}
      <MargoSheet
        open={sheetOpen}
        onOpenChange={(next) => {
          if (!next) closeSheet()
          else setSheetOpen(true)
        }}
        title="Report"
        heightMode="auto"
        maxHeight="min(52dvh, 360px)"
        bottomInset="tabbar-tight"
        zIndex={240}
      >
        <div className="margo-post-report-menu__sheet">
          {reportStatusLoading ? (
            <p className="margo-post-report-menu__sheet-muted" aria-live="polite">
              …
            </p>
          ) : alreadyReported && !reportMsg ? (
            <p className="margo-post-report-menu__sheet-reported" role="status">
              Reported
            </p>
          ) : (
            <>
              <div
                className="margo-post-report-menu__sheet-options"
                role="radiogroup"
                aria-label="Report reason"
              >
                {POST_REPORT_REASONS.map((reason) => {
                  const selected = selectedReason === reason
                  return (
                    <button
                      key={reason}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={reportBusy}
                      className={`margo-post-report-menu__sheet-row${selected ? ' margo-post-report-menu__sheet-row--selected' : ''}`}
                      onClick={() => setSelectedReason(reason)}
                    >
                      <span>{reason}</span>
                      <ReasonCheckIcon visible={selected} />
                    </button>
                  )
                })}
              </div>
              {selectedReason === 'Other' ? (
                <label className="margo-post-report-menu__sheet-note-wrap" htmlFor={noteId}>
                  <span className="margo-post-report-menu__sheet-note-label">Note</span>
                  <textarea
                    id={noteId}
                    className="margo-post-report-menu__sheet-note"
                    rows={2}
                    maxLength={MAX_POST_REPORT_NOTE}
                    value={otherNote}
                    disabled={reportBusy}
                    onChange={(e) => setOtherNote(e.target.value)}
                  />
                </label>
              ) : null}
              <div className="margo-post-report-menu__sheet-actions">
                <button
                  type="button"
                  className="margo-post-report-menu__sheet-submit"
                  disabled={!canSubmit}
                  onClick={() => void submitReport()}
                >
                  Report
                </button>
              </div>
            </>
          )}
          {reportMsg ? (
            <p className="margo-post-report-menu__sheet-msg" role="status">
              {reportMsg}
            </p>
          ) : null}
        </div>
      </MargoSheet>
    </>
  )
}
