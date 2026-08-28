declare module 'gifenc' {
  export interface GifPaletteColor {
    0: number
    1: number
    2: number
    3?: number
  }

  export type GifPalette = GifPaletteColor[]

  export interface GifEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: GifPalette; delay?: number },
    ): void
    finish(): void
    bytes(): Uint8Array
  }

  export function GIFEncoder(): GifEncoder
  export function quantize(
    rgba: Uint8Array,
    maxColors: number,
    opts?: { format?: string },
  ): GifPalette
  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: GifPalette,
    opts?: { format?: string },
  ): Uint8Array
}
