import type { Echo } from '@/hooks/useEchoes'
import { applyEchoContentRemoved } from '@/lib/post-content-removed'

export type LyricBackDeleteOutcome = 'deleted' | 'shelled'

/** Immediate list update after owner delete API success (before refetch). */
export function applyEchoListDeleteOutcome(
  echoes: Echo[],
  echoId: string,
  outcome: LyricBackDeleteOutcome,
  removedAtIso = new Date().toISOString(),
): Echo[] {
  if (outcome === 'deleted') {
    return echoes.filter((e) => e.id !== echoId)
  }
  return echoes.map((e) =>
    e.id === echoId
      ? applyEchoContentRemoved({ ...e, contentRemovedAt: removedAtIso })
      : e,
  )
}

export function patchStackAfterOwnerDelete(
  stack: Echo[],
  echoId: string,
  outcome: LyricBackDeleteOutcome,
  removedAtIso = new Date().toISOString(),
): Echo[] {
  const idx = stack.findIndex((e) => e.id === echoId)
  if (idx === -1) return stack
  if (outcome === 'deleted') {
    return stack.slice(0, idx)
  }
  const next = [...stack]
  next[idx] = applyEchoContentRemoved({
    ...next[idx],
    contentRemovedAt: removedAtIso,
  })
  return next
}

/** Direct-child count on the parent whose list we are viewing. */
export function decrementEchoCountField(echo: Echo): Echo {
  const n = echo.echoCount ?? 0
  return { ...echo, echoCount: Math.max(0, n - 1) }
}

export function decrementParentEchoCountInStack(stack: Echo[]): Echo[] {
  if (stack.length === 0) return stack
  const next = [...stack]
  const top = next.length - 1
  next[top] = decrementEchoCountField(next[top])
  return next
}
