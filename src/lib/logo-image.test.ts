import { describe, expect, it } from 'vitest'
import { detectLogoImage, MAX_LOGO_UPLOAD_BYTES } from './logo-image'

describe('detectLogoImage', () => {
  it('accepts PNG, JPEG and WebP signatures', () => {
    expect(detectLogoImage('image/png', new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]))).toEqual({ mimeType: 'image/png', extension: 'png' })

    expect(detectLogoImage('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff])))
      .toEqual({ mimeType: 'image/jpeg', extension: 'jpg' })

    expect(detectLogoImage('image/webp', new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]))).toEqual({ mimeType: 'image/webp', extension: 'webp' })
  })

  it('rejects mismatched MIME declarations and unsupported formats', () => {
    expect(detectLogoImage('image/jpeg', new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]))).toBeNull()
    expect(detectLogoImage('image/svg+xml', new TextEncoder().encode('<svg/>'))).toBeNull()
  })

  it('documents the 2 MB limit', () => {
    expect(MAX_LOGO_UPLOAD_BYTES).toBe(2 * 1024 * 1024)
  })
})
