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
import { createClient } from '@/lib/supabase/client'
import { computeReportPopoverPosition } from '@/lib/post-report-menu-position'

const supabase = createClient()

export const POST_REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'] as const

const MENU_W = 168
const MENU_ROW_H = 36
const MENU_PAD = 4

export type PostReportMenuProps = {
  postId: string
  isOwner: boolean
  showOwnerDelete?: boolean
  onOwnerDelete?: () => void
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

export function PostReportMenu({
  postId,
  isOwner,
  showOwnerDelete = false,
  onOwnerDelete,
  className = '',
  iconSize = 20,
}: PostReportMenuProps) {
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState<string | null>(null)

  const showReportItem = !isOwner
  const showDeleteItem = isOwner && showOwnerDelete && typeof onOwnerDelete === 'function'
  const itemCount = (showReportItem ? 1 : 0) + (showDeleteItem ? 1 : 0)

  useEffect(() => setMounted(true), [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setPos(null)
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setReportMsg(null)
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const closeAll = useCallback(() => {
    closeMenu()
    closeSheet()
  }, [closeMenu, closeSheet])

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
    setSheetOpen(true)
    setReportMsg(null)
  }

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
          : 'Could not send.',
      )
      return
    }
    setReportMsg('Report received.')
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900
    window.setTimeout(() => closeSheet(), delay)
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
            {showDeleteItem ? (
              <button
                type="button"
                role="menuitem"
                className="margo-post-report-menu__row margo-post-report-menu__row--muted"
                onClick={(e) => {
                  e.stopPropagation()
                  closeAll()
                  onOwnerDelete?.()
                }}
              >
                <DeleteRowIcon />
                <span>Delete</span>
              </button>
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
          {POST_REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              disabled={reportBusy}
              className="margo-post-report-menu__sheet-row"
              onClick={() => void submitReport(reason)}
            >
              {reason}
            </button>
          ))}
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
