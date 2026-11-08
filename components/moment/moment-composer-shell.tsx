'use client'

import type { ReactNode } from 'react'
import type { MomentShapeId } from '@/lib/moment/types'
import { LandingComposerPreviewFrame } from '@/components/landing/landing-composer-preview-frame'

export type MomentComposerShellMode = 'landing' | 'compose' | 'card'

export interface MomentComposerShellProps {
  mode: MomentComposerShellMode
  shapeId: MomentShapeId
  previewEmpty: boolean
  lead?: ReactNode
  inputs?: ReactNode
  preview: ReactNode
  toolbar: ReactNode
  className?: string
}

/**
 * Single calm composer layout for landing, Compose, and card export.
 * Order: composer column (back, chip, field), then preview with toolbar directly below.
 */
export function MomentComposerShell({
  mode,
  shapeId,
  previewEmpty,
  lead,
  inputs,
  preview,
  toolbar,
  className = '',
}: MomentComposerShellProps) {
  if (mode === 'card') {
    return (
      <div
        className={`margo-composer-shell margo-composer-shell--card margo-moment-studio margo-moment-studio--calm ${className}`.trim()}
      >
        {lead ? <div className="margo-composer-shell__card-lead">{lead}</div> : null}
        <div className="margo-composer-shell__stage margo-moment-studio__preview-col">
          <LandingComposerPreviewFrame shapeId={shapeId} empty={previewEmpty} filled={!previewEmpty}>
            {preview}
          </LandingComposerPreviewFrame>
          <div className="margo-composer-shell__toolbar margo-moment-studio__calm-toolbar">{toolbar}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`margo-composer-shell margo-composer-shell--${mode} margo-moment-studio margo-moment-studio--calm ${className}`.trim()}
    >
      <div className="margo-composer-shell__composer margo-landing-composer__left">
        {lead}
        {inputs ? <div className="margo-moment-studio__inputs">{inputs}</div> : null}
      </div>

      <div className="margo-composer-shell__stage margo-moment-studio__preview-col">
        <LandingComposerPreviewFrame shapeId={shapeId} empty={previewEmpty} filled={!previewEmpty}>
          {preview}
        </LandingComposerPreviewFrame>
        <div className="margo-composer-shell__toolbar margo-moment-studio__calm-toolbar">{toolbar}</div>
      </div>
    </div>
  )
}
