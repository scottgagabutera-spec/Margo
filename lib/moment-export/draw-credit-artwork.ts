import { ADAPTIVE_TEXT_GOLD } from '@/lib/ui/adaptive-text-color'

const PLACEHOLDER_FILL = 'rgba(7, 6, 10, 0.55)'
const PLACEHOLDER_BORDER = 'rgba(232, 197, 71, 0.35)'

/** Dark tile + gold note when catalog art is missing (preview + PNG). */
export function drawCreditArtworkPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const radius = size * 0.18
  ctx.save()
  ctx.fillStyle = PLACEHOLDER_FILL
  ctx.strokeStyle = PLACEHOLDER_BORDER
  ctx.lineWidth = Math.max(1, size * 0.02)
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, radius)
  ctx.fill()
  ctx.stroke()

  const cx = x + size / 2
  const cy = y + size / 2
  const scale = size / 56
  ctx.fillStyle = ADAPTIVE_TEXT_GOLD
  ctx.beginPath()
  ctx.ellipse(cx - 4 * scale, cy + 6 * scale, 5 * scale, 4 * scale, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(cx - 1.5 * scale, cy - 14 * scale, 3 * scale, 16 * scale)
  ctx.beginPath()
  ctx.ellipse(cx + 6 * scale, cy - 10 * scale, 4.5 * scale, 3.5 * scale, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
