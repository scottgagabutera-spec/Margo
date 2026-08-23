import { inspectImageBlob } from '@/lib/export/export-debug'

export class CaptureValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CaptureValidationError'
  }
}

const MIN_BYTES = 1024
const MIN_DIMENSION = 8

/**
 * Ensure a literal UI capture is a real, non-empty PNG before sharing.
 */
export async function validateCaptureBlob(blob: Blob): Promise<void> {
  if (!blob) {
    throw new CaptureValidationError('capture blob missing')
  }

  const mime = blob.type || 'image/png'
  if (mime !== 'image/png') {
    throw new CaptureValidationError(`expected image/png, got ${mime || '(empty)'}`)
  }

  if (blob.size < MIN_BYTES) {
    throw new CaptureValidationError(`capture too small (${blob.size} bytes)`)
  }

  const diagnostics = await inspectImageBlob(blob)
  if (!diagnostics.width || !diagnostics.height) {
    throw new CaptureValidationError('could not decode capture dimensions')
  }

  if (diagnostics.width < MIN_DIMENSION || diagnostics.height < MIN_DIMENSION) {
    throw new CaptureValidationError(
      `invalid capture dimensions (${diagnostics.width}x${diagnostics.height})`,
    )
  }

  if (diagnostics.hasRenderedPixels === false) {
    throw new CaptureValidationError('capture appears empty (no rendered pixels)')
  }
}
