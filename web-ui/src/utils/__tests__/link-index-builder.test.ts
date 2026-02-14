import { describe, expect, it } from 'vitest'
import { buildLinkIndex } from '../link-index-builder'
import type { ScanDocument } from '../link-index-builder'

describe('buildLinkIndex', () => {
  it('returns an empty index when given no documents', () => {
    const index = buildLinkIndex([])
    expect(index.outgoing).toEqual({})
    expect(index.incoming).toEqual({})
    expect(index.referencedTitles).toEqual([])
    expect(index.totalLinks).toBe(0)
    expect(index.totalDocuments).toBe(0)
  })

  it('returns an empty index for documents with no wiki links', () => {
    const docs: ScanDocument[] = [
      { filePath: 'notes/plain.md', chunks: [{ chunkIndex: 0, text: 'Just plain text here.' }] },
    ]
    const index = buildLinkIndex(docs)
    expect(index.outgoing).toEqual({})
    expect(index.incoming).toEqual({})
    expect(index.totalLinks).toBe(0)
    expect(index.totalDocuments).toBe(1)
  })

  it('builds outgoing edges for a document with wiki links', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/hub.md',
        chunks: [
          { chunkIndex: 0, text: 'See [[Alpha]] and [[Beta]]' },
          { chunkIndex: 1, text: 'Also [[Gamma]]' },
        ],
      },
    ]
    const index = buildLinkIndex(docs)

    const outgoing = index.outgoing['notes/hub.md']
    expect(outgoing).toBeDefined()
    expect(outgoing).toHaveLength(3)
    expect(outgoing![0]!.targetTitle).toBe('Alpha')
    expect(outgoing![0]!.chunkIndex).toBe(0)
    expect(outgoing![1]!.targetTitle).toBe('Beta')
    expect(outgoing![1]!.chunkIndex).toBe(0)
    expect(outgoing![2]!.targetTitle).toBe('Gamma')
    expect(outgoing![2]!.chunkIndex).toBe(1)
  })

  it('builds incoming edges (backlinks) keyed by target title', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/a.md',
        chunks: [{ chunkIndex: 0, text: 'Link to [[Shared Topic]]' }],
      },
      {
        filePath: 'notes/b.md',
        chunks: [{ chunkIndex: 2, text: 'Also about [[Shared Topic]]' }],
      },
    ]
    const index = buildLinkIndex(docs)

    const incoming = index.incoming['Shared Topic']
    expect(incoming).toBeDefined()
    expect(incoming).toHaveLength(2)
    expect(incoming!.map((e) => e.sourceDoc).sort()).toEqual(['notes/a.md', 'notes/b.md'])
  })

  it('collects all referenced titles in sorted order', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/index.md',
        chunks: [{ chunkIndex: 0, text: '[[Zebra]] and [[Apple]] and [[Mango]]' }],
      },
    ]
    const index = buildLinkIndex(docs)
    expect(index.referencedTitles).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('counts total links and documents correctly', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/a.md',
        chunks: [{ chunkIndex: 0, text: '[[X]] [[Y]]' }],
      },
      {
        filePath: 'notes/b.md',
        chunks: [{ chunkIndex: 0, text: '[[X]]' }],
      },
      {
        filePath: 'notes/c.md',
        chunks: [{ chunkIndex: 0, text: 'no links' }],
      },
    ]
    const index = buildLinkIndex(docs)
    expect(index.totalLinks).toBe(3)
    expect(index.totalDocuments).toBe(3)
  })

  it('preserves heading, blockRef, and alias in edges', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/rich.md',
        chunks: [
          { chunkIndex: 0, text: 'See [[Doc#Intro^abc|click here]]' },
        ],
      },
    ]
    const index = buildLinkIndex(docs)

    const outgoing = index.outgoing['notes/rich.md']
    expect(outgoing).toHaveLength(1)
    expect(outgoing![0]).toMatchObject({
      sourceDoc: 'notes/rich.md',
      targetTitle: 'Doc',
      heading: 'Intro',
      blockRef: 'abc',
      alias: 'click here',
      chunkIndex: 0,
    })
  })

  it('records correct position offsets for links', () => {
    const text = 'Start [[Alpha]] end'
    const docs: ScanDocument[] = [
      { filePath: 'notes/pos.md', chunks: [{ chunkIndex: 0, text }] },
    ]
    const index = buildLinkIndex(docs)

    const edge = index.outgoing['notes/pos.md']![0]!
    expect(edge.position.start).toBe(6)
    expect(edge.position.end).toBe(15) // '[[Alpha]]'.length === 9, 6+9=15
    expect(text.slice(edge.position.start, edge.position.end)).toBe('[[Alpha]]')
  })

  it('deduplicates referenced titles', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/dup.md',
        chunks: [
          { chunkIndex: 0, text: '[[Same]] and [[Same]] and [[Same]]' },
        ],
      },
    ]
    const index = buildLinkIndex(docs)
    expect(index.referencedTitles).toEqual(['Same'])
    // But all three edges should still exist
    expect(index.totalLinks).toBe(3)
  })

  it('handles multiple chunks across multiple documents', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'vault/daily.md',
        chunks: [
          { chunkIndex: 0, text: 'Morning thought about [[Idea A]]' },
          { chunkIndex: 1, text: 'Evening thought about [[Idea B]]' },
        ],
      },
      {
        filePath: 'vault/projects.md',
        chunks: [
          { chunkIndex: 0, text: '[[Idea A]] is relevant to [[Idea C]]' },
        ],
      },
    ]
    const index = buildLinkIndex(docs)

    // Outgoing from daily.md
    expect(index.outgoing['vault/daily.md']).toHaveLength(2)
    // Outgoing from projects.md
    expect(index.outgoing['vault/projects.md']).toHaveLength(2)

    // Incoming for Idea A: from daily.md chunk 0 and projects.md chunk 0
    const incomingA = index.incoming['Idea A']
    expect(incomingA).toHaveLength(2)

    // Incoming for Idea B: only from daily.md
    expect(index.incoming['Idea B']).toHaveLength(1)

    // Incoming for Idea C: only from projects.md
    expect(index.incoming['Idea C']).toHaveLength(1)

    expect(index.totalLinks).toBe(4)
    expect(index.totalDocuments).toBe(2)
    expect(index.referencedTitles).toEqual(['Idea A', 'Idea B', 'Idea C'])
  })

  it('is idempotent - same input produces same output', () => {
    const docs: ScanDocument[] = [
      {
        filePath: 'notes/a.md',
        chunks: [{ chunkIndex: 0, text: '[[Target]]' }],
      },
    ]
    const index1 = buildLinkIndex(docs)
    const index2 = buildLinkIndex(docs)
    expect(index1).toEqual(index2)
  })
})
