/**
 * Shared catalog lyric “unit” — one line, or a runtime window of adjacent
 * lines from the same song. Source of truth for concatenation used by
 * Lyric Moments and Suggested Lyric Back (do not re-implement join/timing
 * logic in either serving path).
 *
 * Phase 1: pure assembler over atoms the caller already has. Expand only
 * across contiguous `lineIndex` values present in the input (missing
 * neighbors shrink the window). Curated excerpts are Phase 2.
 */

export type CatalogLyricAtom = {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
  /** When assembling a window, tags are unioned (order-stable, first-seen). */
  vibes?: string[]
}

export type CatalogLyricUnit = {
  /** Inclusive range of `lineIndex` in the source song. */
  startLineIndex: number
  endLineIndex: number
  /** Seed / matched / vibed line the unit was built around. */
  centerLineIndex: number
  lineIndexes: number[]
  /** Multi-line joined with `\n` for display / compose mapping. */
  text: string
  startSec: number
  endSec: number
  vibes: string[]
  isMultiLine: boolean
  atoms: CatalogLyricAtom[]
}

/** Default ±N: up to 3 contiguous lines when both neighbors exist. */
export const CATALOG_UNIT_DEFAULT_RADIUS = 1

export type BuildCatalogLyricUnitsOptions = {
  /** Adjacent span each side of center. Default {@link CATALOG_UNIT_DEFAULT_RADIUS}. */
  radius?: number
}

function byLineIndex(a: CatalogLyricAtom, b: CatalogLyricAtom): number {
  return a.lineIndex - b.lineIndex
}

function unionVibes(atoms: CatalogLyricAtom[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const atom of atoms) {
    for (const v of atom.vibes || []) {
      if (!v || seen.has(v)) continue
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

function unitFromAtoms(
  atoms: CatalogLyricAtom[],
  centerLineIndex: number,
): CatalogLyricUnit {
  const sorted = [...atoms].sort(byLineIndex)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return {
    startLineIndex: first.lineIndex,
    endLineIndex: last.lineIndex,
    centerLineIndex,
    lineIndexes: sorted.map((a) => a.lineIndex),
    text: sorted.map((a) => a.text).join('\n'),
    startSec: Number(first.startSec),
    endSec: Number(last.endSec),
    vibes: unionVibes(sorted),
    isMultiLine: sorted.length > 1,
    atoms: sorted,
  }
}

/**
 * Contiguous window around `centerLineIndex` within ±`radius`, using only
 * atoms present in `songLines`. Gaps break expansion (no skipping indexes).
 */
function selectWindowAtoms(
  byIndex: Map<number, CatalogLyricAtom>,
  centerLineIndex: number,
  radius: number,
): CatalogLyricAtom[] | null {
  const center = byIndex.get(centerLineIndex)
  if (!center) return null

  const before: CatalogLyricAtom[] = []
  for (let i = 1; i <= radius; i++) {
    const atom = byIndex.get(centerLineIndex - i)
    if (!atom) break
    before.unshift(atom)
  }

  const after: CatalogLyricAtom[] = []
  for (let i = 1; i <= radius; i++) {
    const atom = byIndex.get(centerLineIndex + i)
    if (!atom) break
    after.push(atom)
  }

  return [...before, center, ...after]
}

/**
 * Always returns both the single-line unit and the ±radius window unit.
 * Callers choose which to surface (eligibility, ranking, UI).
 *
 * Returns `null` if `centerLineIndex` is not in `songLines`.
 */
export function buildCatalogLyricUnits(
  songLines: CatalogLyricAtom[],
  centerLineIndex: number,
  options?: BuildCatalogLyricUnitsOptions,
): { single: CatalogLyricUnit; window: CatalogLyricUnit } | null {
  const radius = options?.radius ?? CATALOG_UNIT_DEFAULT_RADIUS
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError('buildCatalogLyricUnits: radius must be >= 0')
  }

  const byIndex = new Map<number, CatalogLyricAtom>()
  for (const line of songLines) {
    byIndex.set(line.lineIndex, line)
  }

  const center = byIndex.get(centerLineIndex)
  if (!center) return null

  const windowAtoms = selectWindowAtoms(byIndex, centerLineIndex, radius)
  if (!windowAtoms) return null

  return {
    single: unitFromAtoms([center], centerLineIndex),
    window: unitFromAtoms(windowAtoms, centerLineIndex),
  }
}
