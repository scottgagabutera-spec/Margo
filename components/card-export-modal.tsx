'use client'

import { useState } from 'react'
import { Download, Copy, Share2, Square, RectangleVertical, RectangleHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const themePresets = [
  {
    id: 'dark-gold',
    name: 'Dark Gold',
    gradient: 'bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900',
    border: 'border-amber-500/40',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    gradient: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900',
    border: 'border-indigo-400/30',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    gradient: 'bg-gradient-to-br from-rose-950 via-red-900 to-rose-950',
    border: 'border-rose-500/30',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    gradient: 'bg-gradient-to-br from-cyan-950 via-teal-900 to-slate-900',
    border: 'border-cyan-400/30',
  },
  {
    id: 'violet',
    name: 'Violet',
    gradient: 'bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-950',
    border: 'border-violet-400/30',
  },
  {
    id: 'ember',
    name: 'Ember',
    gradient: 'bg-gradient-to-br from-orange-950 via-red-900 to-amber-950',
    border: 'border-orange-500/30',
  },
]

const shapeOptions = [
  { id: 'square', name: 'Square', icon: Square, ratio: '1:1' },
  { id: 'vertical', name: 'Vertical', icon: RectangleVertical, ratio: '4:5' },
  { id: 'wide', name: 'Wide', icon: RectangleHorizontal, ratio: '16:9' },
]

export function CardExportModal({ open, onOpenChange }: CardExportModalProps) {
  const [selectedTheme, setSelectedTheme] = useState('dark-gold')
  const [selectedShape, setSelectedShape] = useState('square')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <DialogPrimitive.Content
          className="bg-[#0c0b10] border border-white/10 text-white max-w-md fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-sans font-medium text-white/90 tracking-tight">
              Your Card
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Theme Presets */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-white/40 font-medium">
              Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {themePresets.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
                    'hover:border-white/30',
                    selectedTheme === theme.id
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-white/10 bg-white/5'
                  )}
                >
                  <div 
                    className={cn(
                      'w-4 h-4 rounded-full',
                      theme.gradient,
                      theme.border,
                      'border'
                    )} 
                  />
                  <span className={cn(
                    'text-sm',
                    selectedTheme === theme.id ? 'text-amber-400' : 'text-white/60'
                  )}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape Selector */}
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-widest text-white/40 font-medium">
              Shape
            </label>
            <div className="flex gap-2">
              {shapeOptions.map((shape) => {
                const Icon = shape.icon
                return (
                  <button
                    key={shape.id}
                    onClick={() => setSelectedShape(shape.id)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all duration-200',
                      'hover:border-white/30',
                      selectedShape === shape.id
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : 'border-white/10 bg-white/5'
                    )}
                  >
                    <Icon className={cn(
                      'w-6 h-6',
                      selectedShape === shape.id ? 'text-amber-400' : 'text-white/40'
                    )} />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn(
                        'text-sm',
                        selectedShape === shape.id ? 'text-amber-400' : 'text-white/60'
                      )}>
                        {shape.name}
                      </span>
                      <span className="text-[10px] text-white/30">{shape.ratio}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm rounded-xl transition-colors">
              <Download className="w-4 h-4" />
              Save Card
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium text-sm rounded-xl transition-colors">
              <Copy className="w-4 h-4" />
              Copy Text
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-medium text-sm rounded-xl transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
          
          {/* Close button */}
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
      </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
