import { describe, expect, it } from 'vitest'
import { parseWikiLinks, getWikiLinkDisplay, getActiveWikiLinkAtCursor } from '../wiki-link-parser'

describe('parseWikiLinks', () => {
  it('parses simple [[Doc]] links', () => {
    const result = parseWikiLinks('See [[My Document]] for details')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      raw: '[[My Document]]',
      docTitle: 'My Document',
      start: 4,
      end: 19,
    })
  })

  it('parses [[Doc#Heading]] links', () => {
    const result = parseWikiLinks('See [[My Document#Introduction]]')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      docTitle: 'My Document',
      heading: 'Introduction',
    })
  })

  it('parses [[Doc^block]] links', () => {
    const result = parseWikiLinks('See [[My Document^abc123]]')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      docTitle: 'My Document',
      blockRef: 'abc123',
    })
  })

  it('parses [[Doc|alias]] links', () => {
    const result = parseWikiLinks('See [[My Document|click here]]')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      docTitle: 'My Document',
      alias: 'click here',
    })
  })

  it('parses [[Doc#Heading|alias]] links', () => {
    const result = parseWikiLinks('See [[My Document#Intro|intro section]]')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      docTitle: 'My Document',
      heading: 'Intro',
      alias: 'intro section',
    })
  })

  it('parses multiple links in one text', () => {
    const result = parseWikiLinks('From [[Doc A]] to [[Doc B]] and [[Doc C]]')
    expect(result).toHaveLength(3)
    expect(result[0]!.docTitle).toBe('Doc A')
    expect(result[1]!.docTitle).toBe('Doc B')
    expect(result[2]!.docTitle).toBe('Doc C')
  })

  it('returns empty array for text with no links', () => {
    expect(parseWikiLinks('No links here')).toHaveLength(0)
  })

  it('handles consecutive calls correctly (regex lastIndex reset)', () => {
    parseWikiLinks('[[A]]')
    const result = parseWikiLinks('[[B]]')
    expect(result).toHaveLength(1)
    expect(result[0]!.docTitle).toBe('B')
  })
})

describe('getWikiLinkDisplay', () => {
  it('returns alias if present', () => {
    const link = parseWikiLinks('[[Doc|My Alias]]')[0]!
    expect(getWikiLinkDisplay(link)).toBe('My Alias')
  })

  it('returns docTitle when no alias', () => {
    const link = parseWikiLinks('[[My Doc]]')[0]!
    expect(getWikiLinkDisplay(link)).toBe('My Doc')
  })

  it('includes heading in display', () => {
    const link = parseWikiLinks('[[Doc#Section]]')[0]!
    expect(getWikiLinkDisplay(link)).toBe('Doc > Section')
  })
})

describe('getActiveWikiLinkAtCursor', () => {
  it('detects active link at cursor', () => {
    const result = getActiveWikiLinkAtCursor('See [[My D', 10)
    expect(result).toEqual({ partial: 'My D', start: 4 })
  })

  it('returns null when no active link', () => {
    expect(getActiveWikiLinkAtCursor('No link here', 5)).toBeNull()
  })

  it('returns null when link is already closed', () => {
    expect(getActiveWikiLinkAtCursor('See [[Done]] after', 15)).toBeNull()
  })
})
