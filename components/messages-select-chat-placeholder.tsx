'use client'

import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'

export function MessagesSelectChatPlaceholder() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <p style={{
        fontFamily: UI_FONT,
        fontSize: LIST_ROW_TYPE.preview,
        color: 'var(--text-muted)',
        margin: 0,
      }}>
        Select a chat
      </p>
    </div>
  )
}
