'use client'

import {
  MOMENT_VIBE_PICKER_OPTIONS,
  emotionToVibeLabel,
  vibeKeyToStoredEmotion,
  vibeLabelToEmotion,
  normalizeEmotionKey,
  isMargoVibeKey,
} from '@/lib/moment/vibe'

export type LyricBackVibeChipsProps = {
  value: string
  parentEmotion: string
  onChange: (storedEmotion: string) => void
  disabled?: boolean
  ariaLabel?: string
}

function storedFromLabel(label: string, parentEmotion: string): string {
  const fromLabel = vibeLabelToEmotion(label)
  if (fromLabel && isMargoVibeKey(fromLabel)) {
    return vibeKeyToStoredEmotion(fromLabel)
  }
  if (isMargoVibeKey(parentEmotion)) {
    return vibeKeyToStoredEmotion(parentEmotion)
  }
  return vibeKeyToStoredEmotion('chill')
}

export function LyricBackVibeChips({
  value,
  parentEmotion,
  onChange,
  disabled = false,
  ariaLabel = 'Vibe',
}: LyricBackVibeChipsProps) {
  const selectedLabel =
    emotionToVibeLabel(value)
    ?? emotionToVibeLabel(parentEmotion)
    ?? 'Chill'

  return (
    <div className="margo-lb-vibe-chips" role="group" aria-label={ariaLabel}>
      <div className="margo-lb-vibe-chips__scroller">
        {MOMENT_VIBE_PICKER_OPTIONS.map((label) => {
          const selected = normalizeEmotionKey(label) === normalizeEmotionKey(selectedLabel)
          return (
            <button
              key={label}
              type="button"
              className={`margo-lb-vibe-chips__chip${selected ? ' margo-lb-vibe-chips__chip--on' : ''}`}
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(storedFromLabel(label, parentEmotion))}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
