'use client'

interface PlayPauseIconProps {
  playing: boolean
  buffering?: boolean
  size?: number
  color?: string
}

export function PlayPauseIcon({ playing, buffering = false, size = 20, color = 'currentColor' }: PlayPauseIconProps) {
  if (buffering) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
    )
  }
  if (playing) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="5" y="4" width="3.5" height="12" rx="1.5" fill={color}/>
        <rect x="11.5" y="4" width="3.5" height="12" rx="1.5" fill={color}/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 4.5L15.5 10L6 15.5V4.5Z" fill={color} strokeLinejoin="round"/>
    </svg>
  )
}
