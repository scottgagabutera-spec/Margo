import type { Notification, NotificationType } from '@/hooks/useNotifications'

export type NotificationFilter = 'all' | 'likes' | 'follows' | 'updates'

const LIKES: NotificationType[] = ['resonate', 'lyric_back']
const FOLLOWS: NotificationType[] = ['follow', 'follow_request']
const UPDATES: NotificationType[] = [
  'warned',
  'frozen',
  'removed',
  'restored',
  'artist_approved',
  'artist_rejected',
]

export function filterNotifications(list: Notification[], filter: NotificationFilter): Notification[] {
  if (filter === 'all') return list
  if (filter === 'likes') return list.filter((n) => LIKES.includes(n.type))
  if (filter === 'follows') return list.filter((n) => FOLLOWS.includes(n.type))
  return list.filter((n) => UPDATES.includes(n.type))
}

export type NotificationGroupLabel = 'Today' | 'This week' | 'Earlier'

export function groupLabelForDate(iso: string): NotificationGroupLabel {
  const d = new Date(iso)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startWeek = new Date(startToday)
  startWeek.setDate(startWeek.getDate() - 7)
  if (d >= startToday) return 'Today'
  if (d >= startWeek) return 'This week'
  return 'Earlier'
}

export type NotificationDisplayRow =
  | { kind: 'group'; label: NotificationGroupLabel }
  | { kind: 'item'; notification: Notification; groupedText?: string }

/** Group resonate rows on the same post within a time bucket. */
export function buildNotificationDisplayRows(list: Notification[]): NotificationDisplayRow[] {
  const rows: NotificationDisplayRow[] = []
  let lastGroup: NotificationGroupLabel | null = null
  const resonateBuckets = new Map<string, Notification[]>()

  for (const n of list) {
    const gl = groupLabelForDate(n.createdAt)
    if (gl !== lastGroup) {
      rows.push({ kind: 'group', label: gl })
      lastGroup = gl
      resonateBuckets.clear()
    }
    if (n.type === 'resonate' && n.postId) {
      const key = `${gl}:${n.postId}`
      const bucket = resonateBuckets.get(key) || []
      bucket.push(n)
      resonateBuckets.set(key, bucket)
      if (bucket.length === 1) {
        rows.push({ kind: 'item', notification: n })
      } else if (bucket.length === 2) {
        const idx = rows.findIndex(
          (r) => r.kind === 'item' && r.notification.id === bucket[0].id,
        )
        if (idx >= 0) rows.splice(idx, 1)
        rows.push({
          kind: 'item',
          notification: bucket[0],
          groupedText: groupedResonateCopy(bucket),
        })
      } else {
        const idx = rows.findIndex((r) => r.kind === 'item' && r.notification.postId === n.postId && r.groupedText)
        if (idx >= 0) {
          rows[idx] = {
            kind: 'item',
            notification: bucket[0],
            groupedText: groupedResonateCopy(bucket),
          }
        }
      }
      continue
    }
    rows.push({ kind: 'item', notification: n })
  }
  return rows
}

function groupedResonateCopy(bucket: Notification[]): string {
  const first = bucket[0].actor?.displayName || bucket[0].actor?.username || 'Someone'
  const others = bucket.length - 1
  if (others <= 0) return `${first} resonated with your lyric`
  return `${first} and ${others} other${others === 1 ? '' : 's'} resonated with your lyric`
}
