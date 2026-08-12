import type { MargoIconProps } from './icon-props'
import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE } from './icon-props'

export function InstagramIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1" fill={color} />
    </svg>
  )
}

export function TikTokIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 4v10.2a3.8 3.8 0 1 1-3.2-3.75V13a1.6 1.6 0 1 0 1.2 1.55V4h2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 7.5c1.2 1.4 2.7 2.2 4.5 2.4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function XIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 5l14 14M19 5L5 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function YouTubeIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="6" width="19" height="12" rx="3" stroke={color} strokeWidth="1.5" />
      <path d="M10.5 9.5v5l5-2.5-5-2.5Z" fill={color} />
    </svg>
  )
}

export function SpotifyIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
      <path d="M7.5 10.2c2.8-1 6.2-.8 8.8.6M7.8 13c2.2-.7 4.9-.6 7 .4M8.2 15.6c1.6-.5 3.6-.4 5.2.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
