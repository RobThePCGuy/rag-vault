import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DropZone } from '../DropZone'

describe('DropZone', () => {
  it('shows JSONL and NDJSON as supported file types', () => {
    render(<DropZone onFilesSelect={vi.fn()} isUploading={false} />)

    expect(screen.getByText(/JSONL, NDJSON/)).toBeTruthy()
  })

  it('accepts .jsonl and .ndjson extensions', () => {
    const { container } = render(<DropZone onFilesSelect={vi.fn()} isUploading={false} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null

    expect(input).toBeTruthy()
    expect(input?.accept).toContain('.jsonl')
    expect(input?.accept).toContain('.ndjson')
  })
})
