import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WsBadge, WsButton, WsInput, WsTabs } from '../index'
import type { WsTabItem } from '../index'

describe('WsButton', () => {
  it('renders with label and fires onClick', async () => {
    const onClick = vi.fn()
    render(<WsButton onClick={onClick}>Save</WsButton>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDefined()
    expect(button.textContent).toBe('Save')

    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders disabled state', () => {
    render(<WsButton disabled>Disabled</WsButton>)

    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toHaveProperty('disabled', true)
  })

  it('renders variant styles via data attribute', () => {
    render(<WsButton variant="primary">Primary</WsButton>)

    const button = screen.getByRole('button', { name: 'Primary' })
    expect(button.getAttribute('data-variant')).toBe('primary')
  })
})

describe('WsInput', () => {
  it('renders with placeholder and captures input', async () => {
    render(<WsInput placeholder="Type here..." />)

    const input = screen.getByPlaceholderText('Type here...')
    expect(input).toBeDefined()

    await userEvent.type(input, 'hello')
    expect(input).toHaveProperty('value', 'hello')
  })
})

describe('WsBadge', () => {
  it('renders text and variant', () => {
    render(<WsBadge variant="success">Active</WsBadge>)

    const badge = screen.getByText('Active')
    expect(badge).toBeDefined()
    expect(badge.getAttribute('data-variant')).toBe('success')
  })
})

describe('WsTabs', () => {
  const tabs: WsTabItem[] = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
    { id: 'c', label: 'Gamma' },
  ]

  it('renders tabs and fires onSelect', async () => {
    const onSelect = vi.fn()
    render(<WsTabs tabs={tabs} activeId="a" onSelect={onSelect} />)

    const tabButtons = screen.getAllByRole('tab')
    expect(tabButtons).toHaveLength(3)
    expect(tabButtons[0]?.textContent).toBe('Alpha')

    await userEvent.click(tabButtons[1]!)
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('sets correct aria-selected', () => {
    render(<WsTabs tabs={tabs} activeId="b" onSelect={() => {}} />)

    const tabButtons = screen.getAllByRole('tab')
    expect(tabButtons[0]?.getAttribute('aria-selected')).toBe('false')
    expect(tabButtons[1]?.getAttribute('aria-selected')).toBe('true')
    expect(tabButtons[2]?.getAttribute('aria-selected')).toBe('false')
  })

  it('supports keyboard navigation', () => {
    const onSelect = vi.fn()
    render(<WsTabs tabs={tabs} activeId="a" onSelect={onSelect} />)

    const tabButtons = screen.getAllByRole('tab')
    tabButtons[0]!.focus()

    fireEvent.keyDown(tabButtons[0]!.parentElement!, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('b')
  })
})
