'use client'

import { DeleteMomentDialog } from '@/components/delete-moment-dialog'
import { PostInlineFocusedDelete } from '@/components/post-inline-focused-delete'
import { margoDeleteUiMode } from '@/lib/margo-delete-ui-mode'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  target?: 'moment' | 'lyric-back'
  onDeleted?: (outcome?: 'deleted' | 'shelled') => void
  anchorRef: React.RefObject<HTMLElement | null>
}

/** Routes to popup (default) or inline focused delete for A/B until Scott picks one. */
export function MargoDeleteConfirm({
  open,
  onOpenChange,
  postId,
  target = 'moment',
  onDeleted,
  anchorRef,
}: Props) {
  if (margoDeleteUiMode() === 'inline') {
    return (
      <PostInlineFocusedDelete
        open={open}
        onOpenChange={onOpenChange}
        anchorRef={anchorRef}
        postId={postId}
        target={target}
        onDeleted={onDeleted}
      />
    )
  }
  return (
    <DeleteMomentDialog
      open={open}
      onOpenChange={onOpenChange}
      postId={postId}
      target={target}
      onDeleted={onDeleted}
    />
  )
}
