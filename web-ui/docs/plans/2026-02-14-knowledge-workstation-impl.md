# Knowledge Workstation Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the generic Tailwind dashboard web-ui with a dark-first three-pane knowledge workstation featuring bidirectional linking as a first-class navigation primitive.

**Architecture:** Three-pane layout (left rail / center pane with tabs / right rail) built on a design token system. Existing Reader book/zettel themes preserved as a reading surface inside the workstation shell. All state localStorage-first, scoped per dbId. No server changes.

**Tech Stack:** React 18, TypeScript 5.7, Vite 7, Tailwind CSS v4, Framer Motion 12, TanStack React Query 5, React Router 7

**Design doc:** `docs/plans/2026-02-14-knowledge-workstation-redesign.md`

---

## Phase 1: Design Tokens and Component Primitives

### Task 1.1: Create Theme Token CSS

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/index.css`

**Step 1: Create the token file**

Create `src/styles/tokens.css` with CSS custom properties for both dark (default) and light themes. All colors, radii, shadows, spacing, and typography tokens live here. This replaces all ad-hoc Tailwind gray/blue usage.

```css
/* src/styles/tokens.css */

/*
 * Knowledge Workstation Design Tokens
 * Dark-first. Orange as intent, not paint.
 * All component styles reference these variables.
 */

/* ==========================================
   Dark Theme (default identity)
   ========================================== */
:root {
  /* Surfaces - deep slate layers */
  --ws-bg: #0f1117;
  --ws-surface-1: #161922;
  --ws-surface-2: #1c1f2b;
  --ws-surface-3: #242836;
  --ws-surface-raised: #2a2e3d;

  /* Borders */
  --ws-border: #2a2e3d;
  --ws-border-subtle: #1e2230;
  --ws-border-strong: #3a3f52;

  /* Text hierarchy */
  --ws-text: #e2e4ea;
  --ws-text-secondary: #a0a4b4;
  --ws-text-muted: #6b7084;
  --ws-text-faint: #4a4f62;

  /* Accent - orange for intent */
  --ws-accent: #e8863a;
  --ws-accent-hover: #f09a52;
  --ws-accent-muted: rgba(232, 134, 58, 0.15);
  --ws-accent-subtle: rgba(232, 134, 58, 0.08);
  --ws-accent-text: #f0a060;

  /* Semantic */
  --ws-success: #34d399;
  --ws-success-muted: rgba(52, 211, 153, 0.15);
  --ws-warning: #fbbf24;
  --ws-warning-muted: rgba(251, 191, 36, 0.15);
  --ws-danger: #f87171;
  --ws-danger-muted: rgba(248, 113, 113, 0.15);
  --ws-info: #60a5fa;
  --ws-info-muted: rgba(96, 165, 250, 0.15);

  /* Link types */
  --ws-link-explicit: #60a5fa;
  --ws-link-semantic: #a78bfa;
  --ws-link-backlink: #818cf8;
  --ws-link-unresolved: #f87171;
  --ws-link-mention: #34d399;

  /* Focus */
  --ws-focus-ring: var(--ws-accent);
  --ws-focus-ring-offset: var(--ws-bg);

  /* Radius */
  --ws-radius-xs: 3px;
  --ws-radius-sm: 5px;
  --ws-radius-md: 8px;
  --ws-radius-lg: 12px;
  --ws-radius-xl: 16px;

  /* Shadows */
  --ws-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --ws-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.2);
  --ws-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.25);
  --ws-shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3);
  --ws-shadow-popover: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--ws-border);

  /* Spacing scale */
  --ws-space-1: 4px;
  --ws-space-2: 8px;
  --ws-space-3: 12px;
  --ws-space-4: 16px;
  --ws-space-5: 20px;
  --ws-space-6: 24px;
  --ws-space-8: 32px;
  --ws-space-10: 40px;
  --ws-space-12: 48px;

  /* Typography */
  --ws-font-ui: 'DM Sans', system-ui, -apple-system, sans-serif;
  --ws-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --ws-font-reader: 'Georgia', 'Palatino Linotype', 'Book Antiqua', Palatino, serif;

  --ws-text-xs: 0.6875rem;   /* 11px */
  --ws-text-sm: 0.8125rem;   /* 13px */
  --ws-text-base: 0.875rem;  /* 14px */
  --ws-text-md: 0.9375rem;   /* 15px */
  --ws-text-lg: 1.0625rem;   /* 17px */
  --ws-text-xl: 1.25rem;     /* 20px */
  --ws-text-2xl: 1.5rem;     /* 24px */

  /* Line heights */
  --ws-leading-tight: 1.3;
  --ws-leading-normal: 1.5;
  --ws-leading-relaxed: 1.7;

  /* Transitions */
  --ws-transition-fast: 100ms ease;
  --ws-transition-base: 150ms ease;
  --ws-transition-slow: 250ms ease;

  /* Layout */
  --ws-left-rail-width: 220px;
  --ws-left-rail-min: 180px;
  --ws-left-rail-max: 320px;
  --ws-left-rail-collapsed: 52px;
  --ws-right-rail-width: 300px;
  --ws-right-rail-min: 240px;
  --ws-right-rail-max: 420px;
  --ws-tab-bar-height: 36px;
  --ws-header-height: 40px;
}

/* ==========================================
   Light Theme
   Same token names, lighter palette.
   NOT gray-50/white/gray-200 default Tailwind.
   ========================================== */
.light, :root:not(.dark) {
  --ws-bg: #f0ece6;
  --ws-surface-1: #f7f4ef;
  --ws-surface-2: #fdfcfa;
  --ws-surface-3: #ffffff;
  --ws-surface-raised: #ffffff;

  --ws-border: #d8d3ca;
  --ws-border-subtle: #e6e2db;
  --ws-border-strong: #c0b9ae;

  --ws-text: #1e1b16;
  --ws-text-secondary: #52504a;
  --ws-text-muted: #8a8780;
  --ws-text-faint: #b0ada6;

  --ws-accent: #c06820;
  --ws-accent-hover: #a85a18;
  --ws-accent-muted: rgba(192, 104, 32, 0.12);
  --ws-accent-subtle: rgba(192, 104, 32, 0.06);
  --ws-accent-text: #9a5518;

  --ws-success: #16a364;
  --ws-success-muted: rgba(22, 163, 100, 0.1);
  --ws-warning: #d97706;
  --ws-warning-muted: rgba(217, 119, 6, 0.1);
  --ws-danger: #dc2626;
  --ws-danger-muted: rgba(220, 38, 38, 0.1);
  --ws-info: #2563eb;
  --ws-info-muted: rgba(37, 99, 235, 0.1);

  --ws-link-explicit: #2563eb;
  --ws-link-semantic: #7c3aed;
  --ws-link-backlink: #6366f1;
  --ws-link-unresolved: #dc2626;
  --ws-link-mention: #16a364;

  --ws-focus-ring: var(--ws-accent);
  --ws-focus-ring-offset: var(--ws-bg);

  --ws-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --ws-shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --ws-shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
  --ws-shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --ws-shadow-popover: 0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px var(--ws-border);
}
```

**Step 2: Update index.css to import tokens**

In `src/index.css`, add the import at line 1 (before `@import "tailwindcss"`):

```css
@import "./styles/tokens.css";
@import "tailwindcss";
```

Remove the old `:root` block with `--color-primary` and `--color-primary-hover` (lines 3-8 of current file).

Update the `body` rule to use tokens:

```css
body {
  background-color: var(--ws-bg);
  color: var(--ws-text);
  font-family: var(--ws-font-ui);
  font-size: var(--ws-text-base);
  line-height: var(--ws-leading-normal);
  transition: background-color var(--ws-transition-slow), color var(--ws-transition-slow);
}
```

Update dark scrollbar styles to use tokens:

```css
.dark ::-webkit-scrollbar-track {
  background: var(--ws-surface-1);
}
.dark ::-webkit-scrollbar-thumb {
  background: var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--ws-text-muted);
}
```

**Step 3: Add font imports to index.html**

Add Google Fonts link for DM Sans and JetBrains Mono in `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Step 4: Verify build still passes**

Run: `npx vite build`
Expected: Build succeeds. Tokens are loaded via CSS import.

**Step 5: Commit**

```bash
git add src/styles/tokens.css src/index.css index.html
git commit -m "feat: add design token system with dark/light themes"
```

---

### Task 1.2: Build Workstation UI Primitives

**Files:**
- Create: `src/components/ws/WsButton.tsx`
- Create: `src/components/ws/WsInput.tsx`
- Create: `src/components/ws/WsSelect.tsx`
- Create: `src/components/ws/WsTabs.tsx`
- Create: `src/components/ws/WsCard.tsx`
- Create: `src/components/ws/WsBadge.tsx`
- Create: `src/components/ws/WsTooltip.tsx`
- Create: `src/components/ws/WsPanel.tsx`
- Create: `src/components/ws/index.ts`
- Test: `src/components/ws/__tests__/primitives.test.tsx`

All primitives use tokens exclusively. No raw Tailwind color classes. The `ws` prefix means "workstation" and distinguishes from the old `ui/` primitives which remain during migration.

**Step 1: Write tests for Button, Input, Badge, Tabs**

Create `src/components/ws/__tests__/primitives.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WsBadge } from '../WsBadge'
import { WsButton } from '../WsButton'
import { WsInput } from '../WsInput'
import { WsTabs } from '../WsTabs'

describe('WsButton', () => {
  it('renders with label and fires onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<WsButton onClick={onClick}>Save</WsButton>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeInTheDocument()
    await user.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders disabled state', () => {
    render(<WsButton disabled>Save</WsButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders variant styles via data attribute', () => {
    render(<WsButton variant="danger">Delete</WsButton>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger')
  })
})

describe('WsInput', () => {
  it('renders with placeholder and captures input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<WsInput placeholder="Search..." onChange={onChange} />)
    const input = screen.getByPlaceholderText('Search...')
    await user.type(input, 'hello')
    expect(onChange).toHaveBeenCalled()
  })
})

describe('WsBadge', () => {
  it('renders text and variant', () => {
    render(<WsBadge variant="success">Active</WsBadge>)
    const badge = screen.getByText('Active')
    expect(badge).toHaveAttribute('data-variant', 'success')
  })
})

describe('WsTabs', () => {
  it('renders tabs and fires onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const tabs = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]
    render(<WsTabs tabs={tabs} activeId="a" onSelect={onSelect} />)
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ws/__tests__/primitives.test.tsx`
Expected: FAIL - modules not found

**Step 3: Implement WsButton**

Create `src/components/ws/WsButton.tsx`:

```tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react'

export type WsButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type WsButtonSize = 'sm' | 'md' | 'lg'

interface WsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: WsButtonVariant
  size?: WsButtonSize
}

export const WsButton = forwardRef<HTMLButtonElement, WsButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-variant={variant}
        data-size={size}
        className={`ws-button ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

WsButton.displayName = 'WsButton'
```

Add to `src/styles/tokens.css` (append at end):

```css
/* ==========================================
   Workstation Primitives
   ========================================== */

/* Button */
.ws-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ws-space-2);
  border-radius: var(--ws-radius-md);
  font-family: var(--ws-font-ui);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--ws-transition-fast), color var(--ws-transition-fast),
    border-color var(--ws-transition-fast), box-shadow var(--ws-transition-fast);
  border: 1px solid transparent;
  outline: none;
  white-space: nowrap;
}

.ws-button:focus-visible {
  box-shadow: 0 0 0 2px var(--ws-focus-ring-offset), 0 0 0 4px var(--ws-focus-ring);
}

.ws-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Sizes */
.ws-button[data-size="sm"] {
  font-size: var(--ws-text-xs);
  padding: var(--ws-space-1) var(--ws-space-2);
  height: 28px;
}
.ws-button[data-size="md"] {
  font-size: var(--ws-text-sm);
  padding: var(--ws-space-1) var(--ws-space-3);
  height: 32px;
}
.ws-button[data-size="lg"] {
  font-size: var(--ws-text-base);
  padding: var(--ws-space-2) var(--ws-space-4);
  height: 38px;
}

/* Variants */
.ws-button[data-variant="default"] {
  background: var(--ws-surface-2);
  color: var(--ws-text-secondary);
  border-color: var(--ws-border);
}
.ws-button[data-variant="default"]:hover:not(:disabled) {
  background: var(--ws-surface-3);
  color: var(--ws-text);
  border-color: var(--ws-border-strong);
}

.ws-button[data-variant="primary"] {
  background: var(--ws-accent);
  color: #fff;
}
.ws-button[data-variant="primary"]:hover:not(:disabled) {
  background: var(--ws-accent-hover);
}

.ws-button[data-variant="ghost"] {
  background: transparent;
  color: var(--ws-text-secondary);
}
.ws-button[data-variant="ghost"]:hover:not(:disabled) {
  background: var(--ws-accent-subtle);
  color: var(--ws-text);
}

.ws-button[data-variant="danger"] {
  background: var(--ws-danger-muted);
  color: var(--ws-danger);
  border-color: transparent;
}
.ws-button[data-variant="danger"]:hover:not(:disabled) {
  background: var(--ws-danger);
  color: #fff;
}
```

**Step 4: Implement WsInput**

Create `src/components/ws/WsInput.tsx`:

```tsx
import { type InputHTMLAttributes, forwardRef } from 'react'

interface WsInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const WsInput = forwardRef<HTMLInputElement, WsInputProps>(
  ({ error, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        data-error={error || undefined}
        className={`ws-input ${className}`}
        {...props}
      />
    )
  }
)

WsInput.displayName = 'WsInput'
```

Add to tokens.css:

```css
/* Input */
.ws-input {
  width: 100%;
  height: 32px;
  padding: var(--ws-space-1) var(--ws-space-3);
  font-family: var(--ws-font-ui);
  font-size: var(--ws-text-sm);
  color: var(--ws-text);
  background: var(--ws-surface-1);
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius-md);
  outline: none;
  transition: border-color var(--ws-transition-fast), box-shadow var(--ws-transition-fast);
}
.ws-input::placeholder {
  color: var(--ws-text-faint);
}
.ws-input:focus {
  border-color: var(--ws-accent);
  box-shadow: 0 0 0 2px var(--ws-focus-ring-offset), 0 0 0 4px var(--ws-focus-ring);
}
.ws-input[data-error] {
  border-color: var(--ws-danger);
}
.ws-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**Step 5: Implement WsBadge**

Create `src/components/ws/WsBadge.tsx`:

```tsx
import type { HTMLAttributes } from 'react'

export type WsBadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
  | 'link-explicit' | 'link-semantic' | 'link-backlink' | 'link-unresolved'

interface WsBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: WsBadgeVariant
  count?: number
}

export function WsBadge({ variant = 'default', count, children, className = '', ...props }: WsBadgeProps) {
  return (
    <span data-variant={variant} className={`ws-badge ${className}`} {...props}>
      {children}
      {count !== undefined && <span className="ws-badge-count">{count}</span>}
    </span>
  )
}
```

Add to tokens.css:

```css
/* Badge */
.ws-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ws-space-1);
  font-family: var(--ws-font-ui);
  font-size: var(--ws-text-xs);
  font-weight: 500;
  padding: 2px var(--ws-space-2);
  border-radius: var(--ws-radius-sm);
  line-height: var(--ws-leading-tight);
  white-space: nowrap;
}
.ws-badge[data-variant="default"] { background: var(--ws-surface-3); color: var(--ws-text-secondary); }
.ws-badge[data-variant="accent"] { background: var(--ws-accent-muted); color: var(--ws-accent-text); }
.ws-badge[data-variant="success"] { background: var(--ws-success-muted); color: var(--ws-success); }
.ws-badge[data-variant="warning"] { background: var(--ws-warning-muted); color: var(--ws-warning); }
.ws-badge[data-variant="danger"] { background: var(--ws-danger-muted); color: var(--ws-danger); }
.ws-badge[data-variant="info"] { background: var(--ws-info-muted); color: var(--ws-info); }
.ws-badge[data-variant="link-explicit"] { background: rgba(96,165,250,0.15); color: var(--ws-link-explicit); }
.ws-badge[data-variant="link-semantic"] { background: rgba(167,139,250,0.15); color: var(--ws-link-semantic); }
.ws-badge[data-variant="link-backlink"] { background: rgba(129,140,248,0.15); color: var(--ws-link-backlink); }
.ws-badge[data-variant="link-unresolved"] { background: var(--ws-danger-muted); color: var(--ws-link-unresolved); }
.ws-badge-count {
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  border-radius: 99px;
  background: var(--ws-accent);
  color: #fff;
}
```

**Step 6: Implement WsTabs**

Create `src/components/ws/WsTabs.tsx`:

```tsx
import { useCallback, useRef, useEffect } from 'react'

export interface WsTabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number
  closeable?: boolean
  pinned?: boolean
}

interface WsTabsProps {
  tabs: WsTabItem[]
  activeId: string
  onSelect: (id: string) => void
  onClose?: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function WsTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  variant = 'underline',
  className = '',
}: WsTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeId)
      if (currentIndex === -1) return

      let nextIndex = currentIndex
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
      else return

      e.preventDefault()
      const nextTab = tabs[nextIndex]
      if (nextTab) {
        onSelect(nextTab.id)
        const tabEl = tablistRef.current?.querySelector(`[data-tab-id="${nextTab.id}"]`) as HTMLElement
        tabEl?.focus()
      }
    },
    [tabs, activeId, onSelect]
  )

  return (
    <div
      ref={tablistRef}
      role="tablist"
      className={`ws-tabs ws-tabs--${variant} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            data-tab-id={tab.id}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className="ws-tab"
            onClick={() => onSelect(tab.id)}
          >
            {tab.icon && <span className="ws-tab-icon">{tab.icon}</span>}
            <span className="ws-tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ws-tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>
            )}
            {tab.closeable && onClose && (
              <span
                role="button"
                tabIndex={-1}
                className="ws-tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.id)
                }}
                aria-label={`Close ${tab.label}`}
              >
                x
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

Add to tokens.css:

```css
/* Tabs */
.ws-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.ws-tabs::-webkit-scrollbar { display: none; }

.ws-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--ws-space-1);
  padding: var(--ws-space-2) var(--ws-space-3);
  font-family: var(--ws-font-ui);
  font-size: var(--ws-text-sm);
  font-weight: 500;
  color: var(--ws-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--ws-transition-fast), background var(--ws-transition-fast);
  outline: none;
  position: relative;
}
.ws-tab:hover { color: var(--ws-text); }
.ws-tab[aria-selected="true"] { color: var(--ws-accent-text); }
.ws-tab:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ws-focus-ring);
  border-radius: var(--ws-radius-sm);
}

/* Underline variant */
.ws-tabs--underline { border-bottom: 1px solid var(--ws-border-subtle); }
.ws-tabs--underline .ws-tab[aria-selected="true"]::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: var(--ws-space-3);
  right: var(--ws-space-3);
  height: 2px;
  background: var(--ws-accent);
  border-radius: 1px;
}

/* Pill variant */
.ws-tabs--pill { gap: var(--ws-space-1); padding: var(--ws-space-1); }
.ws-tabs--pill .ws-tab { border-radius: var(--ws-radius-sm); }
.ws-tabs--pill .ws-tab[aria-selected="true"] {
  background: var(--ws-accent-muted);
  color: var(--ws-accent-text);
}

.ws-tab-icon { display: flex; align-items: center; }
.ws-tab-badge {
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 99px;
  background: var(--ws-accent-muted);
  color: var(--ws-accent-text);
}
.ws-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 11px;
  color: var(--ws-text-faint);
  border-radius: var(--ws-radius-xs);
  cursor: pointer;
}
.ws-tab-close:hover { background: var(--ws-danger-muted); color: var(--ws-danger); }
```

**Step 7: Implement WsSelect, WsCard, WsTooltip, WsPanel**

Create `src/components/ws/WsSelect.tsx`:

```tsx
import { type SelectHTMLAttributes, forwardRef } from 'react'

interface WsSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const WsSelect = forwardRef<HTMLSelectElement, WsSelectProps>(
  ({ error, className = '', children, ...props }, ref) => {
    return (
      <select ref={ref} data-error={error || undefined} className={`ws-select ${className}`} {...props}>
        {children}
      </select>
    )
  }
)

WsSelect.displayName = 'WsSelect'
```

Create `src/components/ws/WsCard.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface WsCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  actions?: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function WsCard({ title, subtitle, actions, padding = 'md', className = '', children, ...props }: WsCardProps) {
  return (
    <div data-padding={padding} className={`ws-card ${className}`} {...props}>
      {(title || actions) && (
        <div className="ws-card-header">
          <div>
            {title && <h3 className="ws-card-title">{title}</h3>}
            {subtitle && <p className="ws-card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ws-card-actions">{actions}</div>}
        </div>
      )}
      <div className="ws-card-body">{children}</div>
    </div>
  )
}
```

Create `src/components/ws/WsTooltip.tsx`:

```tsx
import { useState, useRef, type ReactNode, useEffect, useCallback } from 'react'

interface WsTooltipProps {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
  children: ReactNode
}

export function WsTooltip({ content, side = 'top', delay = 300, children }: WsTooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay)
  }, [delay])

  const hide = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  return (
    <span className="ws-tooltip-anchor" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span role="tooltip" className={`ws-tooltip ws-tooltip--${side}`}>
          {content}
        </span>
      )}
    </span>
  )
}
```

Create `src/components/ws/WsPanel.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

interface WsPanelProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode
  footer?: ReactNode
}

export function WsPanel({ header, footer, className = '', children, ...props }: WsPanelProps) {
  return (
    <div className={`ws-panel ${className}`} {...props}>
      {header && <div className="ws-panel-header">{header}</div>}
      <div className="ws-panel-body">{children}</div>
      {footer && <div className="ws-panel-footer">{footer}</div>}
    </div>
  )
}
```

Add styles for Select, Card, Tooltip, Panel to tokens.css:

```css
/* Select */
.ws-select {
  height: 32px;
  padding: var(--ws-space-1) var(--ws-space-3);
  padding-right: var(--ws-space-8);
  font-family: var(--ws-font-ui);
  font-size: var(--ws-text-sm);
  color: var(--ws-text);
  background: var(--ws-surface-1);
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius-md);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7084' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.ws-select:focus {
  border-color: var(--ws-accent);
  box-shadow: 0 0 0 2px var(--ws-focus-ring-offset), 0 0 0 4px var(--ws-focus-ring);
}

/* Card */
.ws-card {
  background: var(--ws-surface-2);
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius-lg);
}
.ws-card[data-padding="sm"] > .ws-card-body { padding: var(--ws-space-3); }
.ws-card[data-padding="md"] > .ws-card-body { padding: var(--ws-space-4); }
.ws-card[data-padding="lg"] > .ws-card-body { padding: var(--ws-space-6); }
.ws-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ws-space-4);
  padding: var(--ws-space-4);
  border-bottom: 1px solid var(--ws-border-subtle);
}
.ws-card-title { font-size: var(--ws-text-md); font-weight: 600; color: var(--ws-text); }
.ws-card-subtitle { font-size: var(--ws-text-sm); color: var(--ws-text-muted); margin-top: 2px; }
.ws-card-actions { display: flex; align-items: center; gap: var(--ws-space-2); }

/* Tooltip */
.ws-tooltip-anchor { position: relative; display: inline-flex; }
.ws-tooltip {
  position: absolute;
  z-index: 9999;
  padding: var(--ws-space-1) var(--ws-space-2);
  font-family: var(--ws-font-ui);
  font-size: var(--ws-text-xs);
  color: var(--ws-text);
  background: var(--ws-surface-raised);
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius-sm);
  box-shadow: var(--ws-shadow-md);
  white-space: nowrap;
  pointer-events: none;
  animation: ws-tooltip-in 100ms ease;
}
.ws-tooltip--top { bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
.ws-tooltip--bottom { top: calc(100% + 6px); left: 50%; transform: translateX(-50%); }
.ws-tooltip--left { right: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
.ws-tooltip--right { left: calc(100% + 6px); top: 50%; transform: translateY(-50%); }
@keyframes ws-tooltip-in { from { opacity: 0; } to { opacity: 1; } }

/* Panel */
.ws-panel {
  display: flex;
  flex-direction: column;
  background: var(--ws-surface-1);
  height: 100%;
  overflow: hidden;
}
.ws-panel-header {
  flex-shrink: 0;
  padding: var(--ws-space-3) var(--ws-space-4);
  border-bottom: 1px solid var(--ws-border-subtle);
}
.ws-panel-body {
  flex: 1;
  overflow-y: auto;
}
.ws-panel-footer {
  flex-shrink: 0;
  padding: var(--ws-space-3) var(--ws-space-4);
  border-top: 1px solid var(--ws-border-subtle);
}
```

**Step 8: Create barrel export**

Create `src/components/ws/index.ts`:

```tsx
export { WsButton, type WsButtonVariant, type WsButtonSize } from './WsButton'
export { WsInput } from './WsInput'
export { WsSelect } from './WsSelect'
export { WsTabs, type WsTabItem } from './WsTabs'
export { WsCard } from './WsCard'
export { WsBadge, type WsBadgeVariant } from './WsBadge'
export { WsTooltip } from './WsTooltip'
export { WsPanel } from './WsPanel'
```

**Step 9: Run tests**

Run: `npx vitest run src/components/ws/__tests__/primitives.test.tsx`
Expected: All 5 tests PASS

**Step 10: Verify build**

Run: `npx vite build`
Expected: Build succeeds

**Step 11: Commit**

```bash
git add src/components/ws/ src/styles/tokens.css
git commit -m "feat: add workstation UI primitives (Button, Input, Select, Tabs, Card, Badge, Tooltip, Panel)"
```

---

### Task 1.3: Storage Migration Utilities

**Files:**
- Create: `src/utils/storage-migration.ts`
- Test: `src/utils/__tests__/storage-migration.test.ts`

This task creates utilities to migrate existing localStorage data from v1 (unscoped) to v2 (dbId-scoped) format, and export/import link data.

**Step 1: Write failing tests**

Create `src/utils/__tests__/storage-migration.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  migrateLinksStore,
  exportLinkData,
  importLinkData,
  type LinkExportData,
} from '../storage-migration'

describe('migrateLinksStore', () => {
  afterEach(() => localStorage.clear())

  it('migrates v1 links store to v2 scoped by dbId', () => {
    const v1Data = {
      version: 1,
      vaultId: 'old-vault',
      pins: [{ id: 'p1', sourceKey: { filePath: '/a', chunkIndex: 0 }, targetKey: { filePath: '/b', chunkIndex: 1 }, sourceText: 'a', targetText: 'b', sourceFingerprint: 'fa', targetFingerprint: 'fb', createdAt: '2025-01-01', autoGenerated: false }],
      trails: [],
      bookmarks: [],
    }
    localStorage.setItem('rag-vault-links-v1-old-vault', JSON.stringify(v1Data))

    const result = migrateLinksStore('old-vault')
    expect(result.version).toBe(2)
    expect(result.pins).toHaveLength(1)

    const stored = localStorage.getItem('rag-vault-pins-v2-old-vault')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).version).toBe(2)
  })

  it('returns empty store when no v1 data exists', () => {
    const result = migrateLinksStore('new-vault')
    expect(result.version).toBe(2)
    expect(result.pins).toHaveLength(0)
  })

  it('does not re-migrate if v2 already exists', () => {
    const v2Data = { version: 2, pins: [{ id: 'existing' }], trails: [], bookmarks: [] }
    localStorage.setItem('rag-vault-pins-v2-my-db', JSON.stringify(v2Data))

    const result = migrateLinksStore('my-db')
    expect(result.pins[0].id).toBe('existing')
  })
})

describe('exportLinkData / importLinkData', () => {
  afterEach(() => localStorage.clear())

  it('round-trips pin data', () => {
    const pins = { version: 2, pins: [{ id: 'p1' }], trails: [], bookmarks: [] }
    localStorage.setItem('rag-vault-pins-v2-db1', JSON.stringify(pins))
    localStorage.setItem('rag-vault-dismissed-v1-db1', JSON.stringify(['d1']))

    const exported = exportLinkData('db1')
    expect(exported.schemaVersion).toBe(1)
    expect(exported.dbId).toBe('db1')
    expect(exported.pins.pins).toHaveLength(1)
    expect(exported.dismissed).toEqual(['d1'])

    localStorage.clear()
    const result = importLinkData(exported, 'db1')
    expect(result.success).toBe(true)

    const restored = localStorage.getItem('rag-vault-pins-v2-db1')
    expect(JSON.parse(restored!).pins).toHaveLength(1)
  })

  it('blocks cross-db import', () => {
    const exported: LinkExportData = {
      schemaVersion: 1,
      dbId: 'db-alpha',
      exportedAt: new Date().toISOString(),
      pins: { version: 2, pins: [], trails: [], bookmarks: [] },
      dismissed: [],
    }
    const result = importLinkData(exported, 'db-beta')
    expect(result.success).toBe(false)
    expect(result.error).toContain('different database')
  })
})
```

**Step 2: Run tests to verify failure**

Run: `npx vitest run src/utils/__tests__/storage-migration.test.ts`
Expected: FAIL - module not found

**Step 3: Implement migration utilities**

Create `src/utils/storage-migration.ts`:

```ts
export interface PinsStoreV2 {
  version: 2
  pins: Array<Record<string, unknown>>
  trails: Array<Record<string, unknown>>
  bookmarks: Array<Record<string, unknown>>
}

export interface LinkExportData {
  schemaVersion: 1
  dbId: string
  exportedAt: string
  pins: PinsStoreV2
  dismissed: string[]
  tabs?: unknown[]
  history?: unknown[]
}

const PINS_V2_PREFIX = 'rag-vault-pins-v2-'
const LINKS_V1_PREFIX = 'rag-vault-links-v1-'
const DISMISSED_PREFIX = 'rag-vault-dismissed-v1-'

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn(`Failed to write "${key}":`, error)
  }
}

/**
 * Migrate v1 LinksStore (pins+trails+bookmarks in one blob)
 * to v2 PinsStore (scoped by dbId, version 2).
 * Preserves v1 data until migration succeeds.
 */
export function migrateLinksStore(dbId: string): PinsStoreV2 {
  // Check if v2 already exists
  const existing = readJson<PinsStoreV2>(`${PINS_V2_PREFIX}${dbId}`)
  if (existing && existing.version === 2) {
    return existing
  }

  // Try to read v1 data
  const v1 = readJson<{ version: 1; vaultId: string; pins: unknown[]; trails: unknown[]; bookmarks: unknown[] }>(
    `${LINKS_V1_PREFIX}${dbId}`
  )

  const v2: PinsStoreV2 = {
    version: 2,
    pins: (v1?.pins as Array<Record<string, unknown>>) ?? [],
    trails: (v1?.trails as Array<Record<string, unknown>>) ?? [],
    bookmarks: (v1?.bookmarks as Array<Record<string, unknown>>) ?? [],
  }

  // Write v2
  writeJson(`${PINS_V2_PREFIX}${dbId}`, v2)

  return v2
}

/**
 * Export pins + dismissed data for a given dbId.
 * Does NOT include explicit index (derived, recomputable).
 */
export function exportLinkData(dbId: string): LinkExportData {
  const pins = readJson<PinsStoreV2>(`${PINS_V2_PREFIX}${dbId}`) ?? {
    version: 2 as const,
    pins: [],
    trails: [],
    bookmarks: [],
  }
  const dismissed = readJson<string[]>(`${DISMISSED_PREFIX}${dbId}`) ?? []

  return {
    schemaVersion: 1,
    dbId,
    exportedAt: new Date().toISOString(),
    pins,
    dismissed,
  }
}

/**
 * Import link data into a target dbId.
 * Blocks cross-db import (dbId must match).
 */
export function importLinkData(
  data: LinkExportData,
  targetDbId: string
): { success: boolean; error?: string } {
  if (data.dbId !== targetDbId) {
    return {
      success: false,
      error: `Cannot import: data is from a different database ("${data.dbId}" vs "${targetDbId}")`,
    }
  }

  writeJson(`${PINS_V2_PREFIX}${targetDbId}`, data.pins)
  writeJson(`${DISMISSED_PREFIX}${targetDbId}`, data.dismissed)

  return { success: true }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/utils/__tests__/storage-migration.test.ts`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/utils/storage-migration.ts src/utils/__tests__/storage-migration.test.ts
git commit -m "feat: add storage migration utilities (v1->v2, export/import)"
```

---

## Phase 2: App Shell - Three-Pane Layout

### Task 2.1: Create SelectionContext (Unified Selection Model)

**Files:**
- Create: `src/contexts/SelectionContext.tsx`
- Test: `src/contexts/__tests__/SelectionContext.test.tsx`

**Step 1: Write failing test**

Create `src/contexts/__tests__/SelectionContext.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SelectionProvider, useSelection } from '../SelectionContext'

function wrapper({ children }: { children: React.ReactNode }) {
  return <SelectionProvider>{children}</SelectionProvider>
}

describe('useSelection', () => {
  it('starts with null selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper })
    expect(result.current.selection.docId).toBeNull()
  })

  it('updates selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper })
    act(() => {
      result.current.select({ docId: '/docs/a.md', chunkIndex: 3, source: 'search' })
    })
    expect(result.current.selection.docId).toBe('/docs/a.md')
    expect(result.current.selection.chunkIndex).toBe(3)
    expect(result.current.selection.source).toBe('search')
  })

  it('clears selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper })
    act(() => {
      result.current.select({ docId: '/docs/a.md', chunkIndex: 0, source: 'reader' })
    })
    act(() => {
      result.current.clearSelection()
    })
    expect(result.current.selection.docId).toBeNull()
  })
})
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/contexts/__tests__/SelectionContext.test.tsx`
Expected: FAIL

**Step 3: Implement SelectionContext**

Create `src/contexts/SelectionContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type SelectionSource = 'search' | 'reader' | 'files' | 'graph' | 'backlink' | 'command-palette'

export interface AppSelection {
  docId: string | null
  chunkIndex: number | null
  chunkRef: string | null
  source: SelectionSource | null
}

interface SelectionInput {
  docId: string
  chunkIndex?: number | null
  chunkRef?: string | null
  source: SelectionSource
}

interface SelectionContextValue {
  selection: AppSelection
  select: (input: SelectionInput) => void
  clearSelection: () => void
}

const emptySelection: AppSelection = {
  docId: null,
  chunkIndex: null,
  chunkRef: null,
  source: null,
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<AppSelection>(emptySelection)

  const select = useCallback((input: SelectionInput) => {
    setSelection({
      docId: input.docId,
      chunkIndex: input.chunkIndex ?? null,
      chunkRef: input.chunkRef ?? null,
      source: input.source,
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(emptySelection)
  }, [])

  return (
    <SelectionContext.Provider value={{ selection, select, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context
}
```

**Step 4: Run test**

Run: `npx vitest run src/contexts/__tests__/SelectionContext.test.tsx`
Expected: All 3 PASS

**Step 5: Commit**

```bash
git add src/contexts/SelectionContext.tsx src/contexts/__tests__/SelectionContext.test.tsx
git commit -m "feat: add SelectionContext for unified app-level selection model"
```

---

### Task 2.2: Create TabsContext (Center Pane Tab Model)

**Files:**
- Create: `src/contexts/TabsContext.tsx`
- Test: `src/contexts/__tests__/TabsContext.test.tsx`

**Step 1: Write failing test**

Create `src/contexts/__tests__/TabsContext.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { TabsProvider, useTabs } from '../TabsContext'

function wrapper({ children }: { children: React.ReactNode }) {
  return <TabsProvider dbId="test-db">{children}</TabsProvider>
}

describe('useTabs', () => {
  afterEach(() => localStorage.clear())

  it('starts with a default search tab', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0]?.kind).toBe('search')
    expect(result.current.activeTabId).toBe(result.current.tabs[0]?.tabId)
  })

  it('opens a doc tab and focuses it', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })
    act(() => {
      result.current.openDoc('/docs/a.md', 'a.md')
    })
    expect(result.current.tabs).toHaveLength(2)
    const docTab = result.current.tabs.find((t) => t.kind === 'doc')
    expect(docTab).toBeTruthy()
    expect(docTab?.docId).toBe('/docs/a.md')
    expect(result.current.activeTabId).toBe(docTab?.tabId)
  })

  it('focuses existing tab instead of creating duplicate', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })
    act(() => { result.current.openDoc('/docs/a.md', 'a.md') })
    act(() => { result.current.openDoc('/docs/a.md', 'a.md') })
    const docTabs = result.current.tabs.filter((t) => t.docId === '/docs/a.md')
    expect(docTabs).toHaveLength(1)
  })

  it('evicts LRU non-pinned tab when reaching max', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })
    // Open 8 docs (1 search tab + 8 docs = 9, should evict oldest)
    for (let i = 0; i < 8; i++) {
      act(() => { result.current.openDoc(`/docs/${i}.md`, `${i}.md`) })
    }
    // Should have max 8 tabs
    expect(result.current.tabs.length).toBeLessThanOrEqual(8)
  })

  it('closes a tab', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })
    act(() => { result.current.openDoc('/docs/a.md', 'a.md') })
    const docTab = result.current.tabs.find((t) => t.kind === 'doc')!
    act(() => { result.current.closeTab(docTab.tabId) })
    expect(result.current.tabs.find((t) => t.kind === 'doc')).toBeUndefined()
  })
})
```

**Step 2: Run test to verify failure**

Run: `npx vitest run src/contexts/__tests__/TabsContext.test.tsx`
Expected: FAIL

**Step 3: Implement TabsContext**

Create `src/contexts/TabsContext.tsx`:

```tsx
import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

export type TabKind = 'doc' | 'search' | 'files' | 'settings' | 'collections' | 'status' | 'upload'

export interface PaneTab {
  tabId: string
  kind: TabKind
  docId?: string
  chunkRef?: string
  title: string
  scrollTop: number
  lastActiveAt: number
  pinned: boolean
}

interface TabsState {
  tabs: PaneTab[]
  activeTabId: string
}

interface TabsContextValue {
  tabs: PaneTab[]
  activeTabId: string
  activeTab: PaneTab | undefined
  openDoc: (docId: string, title: string, chunkRef?: string) => void
  openPage: (kind: Exclude<TabKind, 'doc'>, title: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabScroll: (tabId: string, scrollTop: number) => void
  pinTab: (tabId: string, pinned: boolean) => void
}

const MAX_TABS = 8

function makeId(): string {
  return crypto.randomUUID()
}

function makeDefaultState(): TabsState {
  const searchTab: PaneTab = {
    tabId: makeId(),
    kind: 'search',
    title: 'Search',
    scrollTop: 0,
    lastActiveAt: Date.now(),
    pinned: true,
  }
  return { tabs: [searchTab], activeTabId: searchTab.tabId }
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function TabsProvider({ dbId, children }: { dbId: string; children: ReactNode }) {
  const [state, setState] = useLocalStorage<TabsState>(
    `rag-vault-tabs-v1-${dbId}`,
    makeDefaultState()
  )

  const openDoc = useCallback(
    (docId: string, title: string, chunkRef?: string) => {
      setState((prev) => {
        // Check for existing tab with same docId
        const existing = prev.tabs.find((t) => t.kind === 'doc' && t.docId === docId)
        if (existing) {
          return {
            ...prev,
            activeTabId: existing.tabId,
            tabs: prev.tabs.map((t) =>
              t.tabId === existing.tabId ? { ...t, lastActiveAt: Date.now(), chunkRef } : t
            ),
          }
        }

        // Create new tab
        const newTab: PaneTab = {
          tabId: makeId(),
          kind: 'doc',
          docId,
          chunkRef,
          title,
          scrollTop: 0,
          lastActiveAt: Date.now(),
          pinned: false,
        }

        let tabs = [...prev.tabs, newTab]

        // Evict if over max
        if (tabs.length > MAX_TABS) {
          const evictable = tabs
            .filter((t) => !t.pinned && t.tabId !== newTab.tabId)
            .sort((a, b) => a.lastActiveAt - b.lastActiveAt)
          if (evictable.length > 0) {
            const evictId = evictable[0]!.tabId
            tabs = tabs.filter((t) => t.tabId !== evictId)
          }
        }

        return { tabs, activeTabId: newTab.tabId }
      })
    },
    [setState]
  )

  const openPage = useCallback(
    (kind: Exclude<TabKind, 'doc'>, title: string) => {
      setState((prev) => {
        const existing = prev.tabs.find((t) => t.kind === kind)
        if (existing) {
          return {
            ...prev,
            activeTabId: existing.tabId,
            tabs: prev.tabs.map((t) =>
              t.tabId === existing.tabId ? { ...t, lastActiveAt: Date.now() } : t
            ),
          }
        }
        const newTab: PaneTab = {
          tabId: makeId(),
          kind,
          title,
          scrollTop: 0,
          lastActiveAt: Date.now(),
          pinned: false,
        }
        let tabs = [...prev.tabs, newTab]
        if (tabs.length > MAX_TABS) {
          const evictable = tabs.filter((t) => !t.pinned && t.tabId !== newTab.tabId).sort((a, b) => a.lastActiveAt - b.lastActiveAt)
          if (evictable.length > 0) tabs = tabs.filter((t) => t.tabId !== evictable[0]!.tabId)
        }
        return { tabs, activeTabId: newTab.tabId }
      })
    },
    [setState]
  )

  const closeTab = useCallback(
    (tabId: string) => {
      setState((prev) => {
        const tabs = prev.tabs.filter((t) => t.tabId !== tabId)
        if (tabs.length === 0) return makeDefaultState()
        let activeTabId = prev.activeTabId
        if (activeTabId === tabId) {
          // Activate the nearest tab
          const closedIndex = prev.tabs.findIndex((t) => t.tabId === tabId)
          const newActive = tabs[Math.min(closedIndex, tabs.length - 1)]
          activeTabId = newActive?.tabId ?? tabs[0]!.tabId
        }
        return { tabs, activeTabId }
      })
    },
    [setState]
  )

  const setActiveTab = useCallback(
    (tabId: string) => {
      setState((prev) => ({
        ...prev,
        activeTabId: tabId,
        tabs: prev.tabs.map((t) => (t.tabId === tabId ? { ...t, lastActiveAt: Date.now() } : t)),
      }))
    },
    [setState]
  )

  const updateTabScroll = useCallback(
    (tabId: string, scrollTop: number) => {
      setState((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) => (t.tabId === tabId ? { ...t, scrollTop } : t)),
      }))
    },
    [setState]
  )

  const pinTab = useCallback(
    (tabId: string, pinned: boolean) => {
      setState((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) => (t.tabId === tabId ? { ...t, pinned } : t)),
      }))
    },
    [setState]
  )

  const activeTab = state.tabs.find((t) => t.tabId === state.activeTabId)

  return (
    <TabsContext.Provider
      value={{
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        activeTab,
        openDoc,
        openPage,
        closeTab,
        setActiveTab,
        updateTabScroll,
        pinTab,
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

export function useTabs() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider')
  }
  return context
}
```

**Step 4: Run tests**

Run: `npx vitest run src/contexts/__tests__/TabsContext.test.tsx`
Expected: All 5 PASS

**Step 5: Commit**

```bash
git add src/contexts/TabsContext.tsx src/contexts/__tests__/TabsContext.test.tsx
git commit -m "feat: add TabsContext with tab management, LRU eviction, persistence"
```

---

### Task 2.3: Create Resizable Panel Hook

**Files:**
- Create: `src/hooks/useResizablePanel.ts`
- Test: `src/hooks/__tests__/useResizablePanel.test.ts`

**Step 1: Write failing test**

Create `src/hooks/__tests__/useResizablePanel.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, afterEach } from 'vitest'
import { useResizablePanel } from '../useResizablePanel'

describe('useResizablePanel', () => {
  afterEach(() => localStorage.clear())

  it('returns default width', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ storageKey: 'test-panel', defaultWidth: 220, min: 180, max: 320 })
    )
    expect(result.current.width).toBe(220)
    expect(result.current.collapsed).toBe(false)
  })

  it('clamps width to bounds', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ storageKey: 'test-panel', defaultWidth: 220, min: 180, max: 320 })
    )
    act(() => { result.current.setWidth(500) })
    expect(result.current.width).toBe(320)
    act(() => { result.current.setWidth(50) })
    expect(result.current.width).toBe(180)
  })

  it('toggles collapsed state', () => {
    const { result } = renderHook(() =>
      useResizablePanel({ storageKey: 'test-panel', defaultWidth: 220, min: 180, max: 320 })
    )
    act(() => { result.current.toggleCollapsed() })
    expect(result.current.collapsed).toBe(true)
    act(() => { result.current.toggleCollapsed() })
    expect(result.current.collapsed).toBe(false)
  })
})
```

**Step 2: Implement**

Create `src/hooks/useResizablePanel.ts`:

```ts
import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

interface PanelState {
  width: number
  collapsed: boolean
}

interface UseResizablePanelOptions {
  storageKey: string
  defaultWidth: number
  min: number
  max: number
}

export function useResizablePanel({ storageKey, defaultWidth, min, max }: UseResizablePanelOptions) {
  const [state, setState] = useLocalStorage<PanelState>(`ws-panel-${storageKey}`, {
    width: defaultWidth,
    collapsed: false,
  })

  const setWidth = useCallback(
    (w: number) => {
      setState((prev) => ({ ...prev, width: Math.max(min, Math.min(max, w)) }))
    },
    [setState, min, max]
  )

  const toggleCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, collapsed: !prev.collapsed }))
  }, [setState])

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setState((prev) => ({ ...prev, collapsed }))
    },
    [setState]
  )

  return {
    width: state.width,
    collapsed: state.collapsed,
    setWidth,
    toggleCollapsed,
    setCollapsed,
  }
}
```

**Step 3: Run tests**

Run: `npx vitest run src/hooks/__tests__/useResizablePanel.test.ts`
Expected: All 3 PASS

**Step 4: Commit**

```bash
git add src/hooks/useResizablePanel.ts src/hooks/__tests__/useResizablePanel.test.ts
git commit -m "feat: add useResizablePanel hook with clamping and persistence"
```

---

### Task 2.4: Build Workstation Shell Layout

**Files:**
- Create: `src/components/Shell/WorkstationShell.tsx`
- Create: `src/components/Shell/LeftRail.tsx`
- Create: `src/components/Shell/RightRail.tsx`
- Create: `src/components/Shell/CenterPane.tsx`
- Create: `src/components/Shell/TabBar.tsx`
- Create: `src/components/Shell/ResizeHandle.tsx`
- Create: `src/components/Shell/index.ts`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

This is the largest single task. It builds the three-pane layout shell, replaces the old Layout/Header/Sidebar, and rewires App.tsx routing.

**Step 1: Create ResizeHandle**

Create `src/components/Shell/ResizeHandle.tsx`:

```tsx
import { useCallback, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction: 'left' | 'right'
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const startXRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current
        startXRef.current = moveEvent.clientX
        onResize(direction === 'right' ? -delta : delta)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [onResize, direction]
  )

  return (
    <div
      className="ws-resize-handle"
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
    />
  )
}
```

Add to tokens.css:

```css
/* Resize handle */
.ws-resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background var(--ws-transition-fast);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}
.ws-resize-handle:hover,
.ws-resize-handle:active {
  background: var(--ws-accent-muted);
}
.ws-resize-handle::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  right: -3px;
}
```

**Step 2: Create LeftRail**

Create `src/components/Shell/LeftRail.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { useCurrentConfig } from '../../hooks'
import { WsTooltip } from '../ws'

interface LeftRailProps {
  collapsed: boolean
  onToggle: () => void
  width: number
}

const navItems = [
  { to: '/', label: 'Search', shortcut: '' },
  { to: '/upload', label: 'Upload', shortcut: '' },
  { to: '/files', label: 'Files', shortcut: '' },
  { to: '/collections', label: 'Collections', shortcut: '' },
  { to: '/status', label: 'Status', shortcut: '' },
  { to: '/settings', label: 'Settings', shortcut: '' },
]

export function LeftRail({ collapsed, onToggle, width }: LeftRailProps) {
  const { config } = useCurrentConfig()

  return (
    <aside
      className="ws-left-rail"
      style={{ width: collapsed ? 'var(--ws-left-rail-collapsed)' : width }}
    >
      {/* Nav */}
      <nav className="ws-left-rail-nav">
        {navItems.map((item) => (
          <WsTooltip key={item.to} content={item.label} side="right" delay={collapsed ? 100 : 1000}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `ws-nav-item ${isActive ? 'ws-nav-item--active' : ''} ${collapsed ? 'ws-nav-item--collapsed' : ''}`
              }
              end={item.to === '/'}
            >
              <span className="ws-nav-icon">{item.label.charAt(0)}</span>
              {!collapsed && <span className="ws-nav-label">{item.label}</span>}
            </NavLink>
          </WsTooltip>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* DB info footer */}
      {config && !collapsed && (
        <div className="ws-left-rail-footer">
          <div className="ws-db-indicator" title={config.dbPath}>
            <span className="ws-db-dot" />
            <span className="ws-db-name">{config.name}</span>
            <span className="ws-db-count">{config.documentCount} docs</span>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle left rail">
        {collapsed ? '\u203A' : '\u2039'}
      </button>
    </aside>
  )
}
```

**Step 3: Create TabBar**

Create `src/components/Shell/TabBar.tsx`:

```tsx
import { useTabs } from '../../contexts/TabsContext'
import { WsTabs, type WsTabItem } from '../ws'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs()

  const tabItems: WsTabItem[] = tabs.map((t) => ({
    id: t.tabId,
    label: t.title,
    closeable: !t.pinned,
    pinned: t.pinned,
  }))

  return (
    <div className="ws-tab-bar">
      <WsTabs
        tabs={tabItems}
        activeId={activeTabId}
        onSelect={setActiveTab}
        onClose={closeTab}
        variant="pill"
      />
    </div>
  )
}
```

**Step 4: Create CenterPane**

Create `src/components/Shell/CenterPane.tsx`:

```tsx
import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Spinner } from '../ui'
import { TabBar } from './TabBar'

// Lazy load heavy pages
const ReaderPage = lazy(() => import('../../pages/ReaderPage').then(m => ({ default: m.ReaderPage })))
const SearchPage = lazy(() => import('../../pages/SearchPage').then(m => ({ default: m.SearchPage })))
const UploadPage = lazy(() => import('../../pages/UploadPage').then(m => ({ default: m.UploadPage })))
const FilesPage = lazy(() => import('../../pages/FilesPage').then(m => ({ default: m.FilesPage })))
const CollectionsPage = lazy(() => import('../../pages/CollectionsPage').then(m => ({ default: m.CollectionsPage })))
const StatusPage = lazy(() => import('../../pages/StatusPage').then(m => ({ default: m.StatusPage })))
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Spinner />
    </div>
  )
}

export function CenterPane() {
  return (
    <div className="ws-center-pane">
      <TabBar />
      <div className="ws-center-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/read" element={<ReaderPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  )
}
```

**Step 5: Create RightRail (shell only, panels wired in Phase 3)**

Create `src/components/Shell/RightRail.tsx`:

```tsx
import { useSelection } from '../../contexts/SelectionContext'
import { WsTabs } from '../ws'

interface RightRailProps {
  collapsed: boolean
  onToggle: () => void
  width: number
}

const rightRailTabs = [
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'related', label: 'Related' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'outline', label: 'Outline' },
  { id: 'graph', label: 'Graph' },
]

export function RightRail({ collapsed, onToggle, width }: RightRailProps) {
  const { selection } = useSelection()

  if (collapsed) {
    return (
      <aside className="ws-right-rail ws-right-rail--collapsed">
        <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle right rail">
          {'\u2039'}
        </button>
      </aside>
    )
  }

  return (
    <aside className="ws-right-rail" style={{ width }}>
      <div className="ws-right-rail-header">
        <WsTabs
          tabs={rightRailTabs}
          activeId="backlinks"
          onSelect={() => {}}
          variant="pill"
          className="ws-right-rail-tabs"
        />
        <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle right rail">
          {'\u203A'}
        </button>
      </div>
      <div className="ws-right-rail-content">
        {selection.docId ? (
          <div style={{ padding: 'var(--ws-space-4)', color: 'var(--ws-text-muted)', fontSize: 'var(--ws-text-sm)' }}>
            Context for: {selection.docId}
          </div>
        ) : (
          <div style={{ padding: 'var(--ws-space-4)', color: 'var(--ws-text-faint)', fontSize: 'var(--ws-text-sm)' }}>
            Select a document to see backlinks, related passages, and more.
          </div>
        )}
      </div>
    </aside>
  )
}
```

**Step 6: Create WorkstationShell**

Create `src/components/Shell/WorkstationShell.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useResizablePanel } from '../../hooks/useResizablePanel'
import { CenterPane } from './CenterPane'
import { LeftRail } from './LeftRail'
import { ResizeHandle } from './ResizeHandle'
import { RightRail } from './RightRail'

export function WorkstationShell() {
  const leftPanel = useResizablePanel({
    storageKey: 'left-rail',
    defaultWidth: 220,
    min: 180,
    max: 320,
  })

  const rightPanel = useResizablePanel({
    storageKey: 'right-rail',
    defaultWidth: 300,
    min: 240,
    max: 420,
  })

  return (
    <div className="ws-shell">
      <LeftRail
        collapsed={leftPanel.collapsed}
        onToggle={leftPanel.toggleCollapsed}
        width={leftPanel.width}
      />
      {!leftPanel.collapsed && (
        <ResizeHandle
          direction="left"
          onResize={(delta) => leftPanel.setWidth(leftPanel.width + delta)}
        />
      )}
      <CenterPane />
      {!rightPanel.collapsed && (
        <ResizeHandle
          direction="right"
          onResize={(delta) => rightPanel.setWidth(rightPanel.width + delta)}
        />
      )}
      <RightRail
        collapsed={rightPanel.collapsed}
        onToggle={rightPanel.toggleCollapsed}
        width={rightPanel.width}
      />
    </div>
  )
}
```

Add shell layout styles to tokens.css:

```css
/* ==========================================
   Workstation Shell Layout
   ========================================== */

.ws-shell {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--ws-bg);
  color: var(--ws-text);
  font-family: var(--ws-font-ui);
}

/* Left Rail */
.ws-left-rail {
  display: flex;
  flex-direction: column;
  background: var(--ws-surface-1);
  border-right: 1px solid var(--ws-border-subtle);
  overflow: hidden;
  transition: width var(--ws-transition-slow);
  flex-shrink: 0;
}

.ws-left-rail-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--ws-space-2);
}

.ws-nav-item {
  display: flex;
  align-items: center;
  gap: var(--ws-space-2);
  padding: var(--ws-space-2) var(--ws-space-3);
  border-radius: var(--ws-radius-md);
  font-size: var(--ws-text-sm);
  font-weight: 500;
  color: var(--ws-text-secondary);
  text-decoration: none;
  transition: background var(--ws-transition-fast), color var(--ws-transition-fast);
}
.ws-nav-item:hover { background: var(--ws-surface-2); color: var(--ws-text); }
.ws-nav-item--active {
  background: var(--ws-accent-muted) !important;
  color: var(--ws-accent-text) !important;
  font-weight: 600;
}
.ws-nav-item--collapsed {
  justify-content: center;
  padding: var(--ws-space-2);
}
.ws-nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: var(--ws-text-xs);
  font-weight: 700;
  color: inherit;
  opacity: 0.7;
}
.ws-nav-item--active .ws-nav-icon { opacity: 1; }

.ws-left-rail-footer {
  padding: var(--ws-space-3);
  border-top: 1px solid var(--ws-border-subtle);
}
.ws-db-indicator {
  display: flex;
  align-items: center;
  gap: var(--ws-space-2);
  font-size: var(--ws-text-xs);
  color: var(--ws-text-muted);
}
.ws-db-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ws-success);
  flex-shrink: 0;
}
.ws-db-name { font-weight: 500; color: var(--ws-text-secondary); }
.ws-db-count { color: var(--ws-text-faint); }

.ws-rail-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  margin: var(--ws-space-2);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
  border: 1px solid var(--ws-border-subtle);
  color: var(--ws-text-muted);
  font-size: var(--ws-text-lg);
  cursor: pointer;
  transition: background var(--ws-transition-fast);
}
.ws-rail-toggle:hover { background: var(--ws-surface-3); color: var(--ws-text); }

/* Center Pane */
.ws-center-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.ws-tab-bar {
  flex-shrink: 0;
  height: var(--ws-tab-bar-height);
  background: var(--ws-surface-1);
  border-bottom: 1px solid var(--ws-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 var(--ws-space-2);
}

.ws-center-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--ws-space-6);
}

/* Right Rail */
.ws-right-rail {
  display: flex;
  flex-direction: column;
  background: var(--ws-surface-1);
  border-left: 1px solid var(--ws-border-subtle);
  overflow: hidden;
  flex-shrink: 0;
}
.ws-right-rail--collapsed {
  width: 36px;
  align-items: center;
  padding-top: var(--ws-space-2);
}

.ws-right-rail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ws-space-1) var(--ws-space-2);
  border-bottom: 1px solid var(--ws-border-subtle);
  flex-shrink: 0;
}
.ws-right-rail-tabs { flex: 1; overflow-x: auto; }
.ws-right-rail-content { flex: 1; overflow-y: auto; }

/* Responsive */
@media (max-width: 1024px) {
  .ws-right-rail:not(.ws-right-rail--collapsed) {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    box-shadow: var(--ws-shadow-xl);
  }
}
@media (max-width: 768px) {
  .ws-left-rail { width: var(--ws-left-rail-collapsed) !important; }
  .ws-nav-item { justify-content: center; padding: var(--ws-space-2); }
  .ws-nav-label { display: none; }
}
```

**Step 7: Create barrel export**

Create `src/components/Shell/index.ts`:

```tsx
export { WorkstationShell } from './WorkstationShell'
export { LeftRail } from './LeftRail'
export { RightRail } from './RightRail'
export { CenterPane } from './CenterPane'
export { TabBar } from './TabBar'
export { ResizeHandle } from './ResizeHandle'
```

**Step 8: Update App.tsx to use WorkstationShell**

Replace `src/App.tsx`:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary'
import { WorkstationShell } from './components/Shell'

function App() {
  return (
    <ErrorBoundary>
      <WorkstationShell />
    </ErrorBoundary>
  )
}

export default App
```

**Step 9: Update main.tsx to add SelectionProvider and TabsProvider**

In `src/main.tsx`, add imports and wrap App with the new providers:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AnnotationsProvider } from './contexts/AnnotationsContext'
import { CollectionsProvider } from './contexts/CollectionsContext'
import { GraphStateProvider } from './contexts/GraphStateContext'
import { LinksProvider } from './contexts/LinksContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { ReadingModeProvider } from './contexts/ReadingModeContext'
import { ReadingStatsProvider } from './contexts/ReadingStatsContext'
import { SelectionProvider } from './contexts/SelectionContext'
import { TabsProvider } from './contexts/TabsContext'
import { TagsProvider } from './contexts/TagsContext'
import { ToastProvider } from './contexts/ToastContext'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has <div id="root"></div>')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PreferencesProvider>
          <ToastProvider>
            <SelectionProvider>
              <TabsProvider dbId="default">
                <LinksProvider>
                  <AnnotationsProvider>
                    <TagsProvider>
                      <CollectionsProvider>
                        <GraphStateProvider>
                          <ReadingModeProvider>
                            <ReadingStatsProvider>
                              <App />
                            </ReadingStatsProvider>
                          </ReadingModeProvider>
                        </GraphStateProvider>
                      </CollectionsProvider>
                    </TagsProvider>
                  </AnnotationsProvider>
                </LinksProvider>
              </TabsProvider>
            </SelectionProvider>
          </ToastProvider>
        </PreferencesProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
```

Note: `TabsProvider dbId="default"` is a placeholder. It will be wired to the actual dbId from useCurrentConfig once the shell is functional.

**Step 10: Verify build**

Run: `npx vite build`
Expected: Build succeeds

**Step 11: Verify dev server**

Run: `npx vite --open` (manual check - verify the three-pane layout renders)

**Step 12: Commit**

```bash
git add src/components/Shell/ src/App.tsx src/main.tsx src/styles/tokens.css
git commit -m "feat: three-pane workstation shell with left rail, center pane tabs, right rail"
```

---

### Task 2.5: Migrate Page Components to Token System

**Files:**
- Modify: `src/pages/SearchPage.tsx` - replace gray/blue Tailwind classes
- Modify: `src/pages/UploadPage.tsx` - replace gray/blue Tailwind classes
- Modify: `src/pages/FilesPage.tsx` - replace gray/blue Tailwind classes
- Modify: `src/pages/StatusPage.tsx` - replace gray/blue Tailwind classes
- Modify: `src/pages/CollectionsPage.tsx` - replace gray/blue Tailwind classes
- Modify: `src/pages/SettingsPage.tsx` - replace gray/blue Tailwind classes
- Modify: `src/components/Search/SearchBox.tsx` - replace blue button, blue focus rings
- Modify: `src/components/Search/SearchResults.tsx` - replace gray/blue card styles
- Modify: `src/components/Settings/ThemeToggle.tsx` - update to use tokens

This is a mechanical migration task. For each file:
1. Replace `bg-white dark:bg-gray-800` with inline style `background: var(--ws-surface-2)` or class
2. Replace `border-gray-200 dark:border-gray-700` with `border-color: var(--ws-border)`
3. Replace `text-gray-900 dark:text-gray-100` with `color: var(--ws-text)`
4. Replace `text-gray-600 dark:text-gray-400` with `color: var(--ws-text-secondary)`
5. Replace `text-gray-500 dark:text-gray-400` with `color: var(--ws-text-muted)`
6. Replace `bg-blue-600` / `bg-blue-50` / `text-blue-600` with accent token equivalents
7. Replace `focus:ring-blue-500` with `focus:ring-[var(--ws-focus-ring)]` or the ws-input/ws-button class
8. Replace `bg-gray-50 dark:bg-gray-900` with `background: var(--ws-bg)` or `var(--ws-surface-1)`

**Strategy:** Create a CSS utility class file to map old patterns to tokens, so migration can happen incrementally without breaking existing pages.

Add to `src/styles/tokens.css`:

```css
/* ==========================================
   Migration utilities
   Inline styles and classes to replace
   raw Tailwind color usage during migration
   ========================================== */

.ws-page { color: var(--ws-text); }
.ws-page-title { font-size: var(--ws-text-xl); font-weight: 600; color: var(--ws-text); }
.ws-page-subtitle { font-size: var(--ws-text-sm); color: var(--ws-text-muted); margin-top: 4px; }
.ws-surface { background: var(--ws-surface-2); border: 1px solid var(--ws-border); border-radius: var(--ws-radius-lg); }
.ws-error-box { background: var(--ws-danger-muted); border: 1px solid var(--ws-danger); border-radius: var(--ws-radius-md); padding: var(--ws-space-4); color: var(--ws-danger); }
.ws-success-box { background: var(--ws-success-muted); border: 1px solid var(--ws-success); border-radius: var(--ws-radius-md); padding: var(--ws-space-4); color: var(--ws-success); }
.ws-info-box { background: var(--ws-info-muted); border: 1px solid var(--ws-info); border-radius: var(--ws-radius-md); padding: var(--ws-space-4); color: var(--ws-info); }
```

Each page migration is a find-and-replace using these patterns. Full code diffs for each page are too large for a single plan task, so the implementing engineer should:

1. Open each page file
2. Replace all `bg-white dark:bg-gray-800` with `ws-surface` class (or `ws-card` component)
3. Replace page headers with `ws-page-title` / `ws-page-subtitle`
4. Replace error blocks with `ws-error-box`
5. Replace blue buttons with `<WsButton variant="primary">`
6. Replace blue focus rings with `ws-input` / `ws-button` classes
7. Run `npx vite build` after each page to verify no regressions
8. Commit each page separately if helpful

**Verify:**

Run: `npx vite build`
Expected: Build succeeds, no blue/gray Tailwind color classes remain in page files

**Commit:**

```bash
git add src/pages/ src/components/Search/ src/components/Settings/ src/styles/tokens.css
git commit -m "refactor: migrate all pages and core components to workstation design tokens"
```

---

## Phase 3: Right Rail Promotion

### Task 3.1: Create Right Rail Tab Panels

**Files:**
- Create: `src/components/RightRail/BacklinksTab.tsx`
- Create: `src/components/RightRail/OutgoingTab.tsx`
- Create: `src/components/RightRail/RelatedTab.tsx`
- Create: `src/components/RightRail/MentionsTab.tsx`
- Create: `src/components/RightRail/OutlineTab.tsx`
- Create: `src/components/RightRail/GraphTab.tsx`
- Create: `src/components/RightRail/EmptyState.tsx`
- Create: `src/components/RightRail/index.ts`
- Modify: `src/components/Shell/RightRail.tsx` - wire up real panels

Each tab wraps existing hooks/components from the Reader subsystem but makes them work with the unified selection model instead of Reader-specific props.

**BacklinksTab** wraps `useBacklinks` + `BacklinksPanel` logic:

```tsx
// src/components/RightRail/BacklinksTab.tsx
import { useSelection } from '../../contexts/SelectionContext'
import { useBacklinks } from '../../hooks'

export function BacklinksTab() {
  const { selection } = useSelection()
  const { backlinks, backlinkCount } = useBacklinks(
    selection.docId ?? '',
    selection.chunkIndex ?? 0
  )

  if (!selection.docId) return <RailEmpty message="Select a document to see backlinks" />

  if (backlinkCount === 0) {
    return <RailEmpty message="No backlinks found for this document" />
  }

  return (
    <div className="ws-rail-list">
      {backlinks.map((link) => (
        <BacklinkItem key={link.id} link={link} />
      ))}
    </div>
  )
}

// Minimal BacklinkItem - detailed implementation in this task
function BacklinkItem({ link }: { link: { id: string; sourceKey: { filePath: string; chunkIndex: number }; sourceText: string; label?: string } }) {
  const fileName = link.sourceKey.filePath.split('/').pop() ?? link.sourceKey.filePath
  return (
    <button type="button" className="ws-rail-item">
      <span className="ws-rail-item-title">{fileName}</span>
      <span className="ws-rail-item-meta">Chunk #{link.sourceKey.chunkIndex}</span>
      {link.label && <span className="ws-rail-item-label">{link.label}</span>}
      <p className="ws-rail-item-excerpt">{link.sourceText.slice(0, 120)}...</p>
    </button>
  )
}

function RailEmpty({ message }: { message: string }) {
  return (
    <div style={{ padding: 'var(--ws-space-6)', textAlign: 'center', color: 'var(--ws-text-faint)', fontSize: 'var(--ws-text-sm)' }}>
      {message}
    </div>
  )
}
```

**RelatedTab** wraps `useRelatedChunks`:

```tsx
// src/components/RightRail/RelatedTab.tsx
import { useSelection } from '../../contexts/SelectionContext'
import { useRelatedChunks } from '../../hooks'

export function RelatedTab() {
  const { selection } = useSelection()
  const { data: related, isLoading } = useRelatedChunks(
    selection.docId ?? '',
    selection.chunkIndex ?? 0,
    { enabled: !!selection.docId }
  )

  if (!selection.docId) return <div className="ws-rail-empty">Select a document</div>
  if (isLoading) return <div className="ws-rail-loading">Loading related...</div>
  if (!related || related.length === 0) return <div className="ws-rail-empty">No related passages found</div>

  return (
    <div className="ws-rail-list">
      {related.map((chunk, i) => (
        <div key={`${chunk.filePath}-${chunk.chunkIndex}`} className="ws-rail-item">
          <span className="ws-rail-item-title">{chunk.filePath.split('/').pop()}</span>
          <span className="ws-rail-item-meta">Score: {chunk.score.toFixed(3)}</span>
          <p className="ws-rail-item-excerpt">{chunk.text.slice(0, 120)}...</p>
        </div>
      ))}
    </div>
  )
}
```

**OutlineTab** wraps `useTableOfContents`:

```tsx
// src/components/RightRail/OutlineTab.tsx
import { useSelection } from '../../contexts/SelectionContext'
import { useDocumentChunks, useTableOfContents } from '../../hooks'

export function OutlineTab() {
  const { selection } = useSelection()
  const { data: chunks } = useDocumentChunks(selection.docId ?? '', { enabled: !!selection.docId })
  const { entries } = useTableOfContents(chunks ?? [])

  if (!selection.docId) return <div className="ws-rail-empty">Select a document</div>
  if (entries.length === 0) return <div className="ws-rail-empty">No headings found</div>

  return (
    <nav className="ws-rail-list">
      {entries.map((entry) => (
        <a
          key={entry.chunkIndex}
          className="ws-rail-item"
          style={{ paddingLeft: `calc(var(--ws-space-3) + ${(entry.level - 1) * 12}px)` }}
        >
          {entry.text}
        </a>
      ))}
    </nav>
  )
}
```

**EmptyState, MentionsTab, OutgoingTab, GraphTab** are stubs for now (filled in Phase 4-5):

```tsx
// src/components/RightRail/EmptyState.tsx
export function RailEmptyState() {
  return (
    <div className="ws-rail-empty-state">
      <p>Select a document to see its connections</p>
    </div>
  )
}

// src/components/RightRail/MentionsTab.tsx
export function MentionsTab() {
  return <div className="ws-rail-empty">Mentions (coming soon)</div>
}

// src/components/RightRail/OutgoingTab.tsx
export function OutgoingTab() {
  return <div className="ws-rail-empty">Outgoing links (coming soon)</div>
}

// src/components/RightRail/GraphTab.tsx
export function GraphTab() {
  return <div className="ws-rail-empty">Graph (coming soon)</div>
}
```

Add rail item styles to tokens.css:

```css
/* Right rail items */
.ws-rail-list { display: flex; flex-direction: column; }
.ws-rail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--ws-space-3) var(--ws-space-4);
  border-bottom: 1px solid var(--ws-border-subtle);
  cursor: pointer;
  text-align: left;
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  color: var(--ws-text);
  font-family: var(--ws-font-ui);
  transition: background var(--ws-transition-fast);
  width: 100%;
}
.ws-rail-item:hover { background: var(--ws-surface-2); }
.ws-rail-item-title { font-size: var(--ws-text-sm); font-weight: 500; color: var(--ws-text); }
.ws-rail-item-meta { font-size: var(--ws-text-xs); color: var(--ws-text-muted); }
.ws-rail-item-label { font-size: var(--ws-text-xs); color: var(--ws-accent-text); }
.ws-rail-item-excerpt { font-size: var(--ws-text-xs); color: var(--ws-text-secondary); line-height: var(--ws-leading-normal); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ws-rail-empty { padding: var(--ws-space-6); text-align: center; color: var(--ws-text-faint); font-size: var(--ws-text-sm); }
.ws-rail-loading { padding: var(--ws-space-6); text-align: center; color: var(--ws-text-muted); font-size: var(--ws-text-sm); }
.ws-rail-empty-state { padding: var(--ws-space-8); text-align: center; color: var(--ws-text-faint); font-size: var(--ws-text-sm); }
```

**Step: Wire panels into RightRail.tsx**

Update `src/components/Shell/RightRail.tsx` to import and render actual tab panels based on active tab state. Use `useLocalStorage` for the active right rail tab.

**Commit:**

```bash
git add src/components/RightRail/ src/components/Shell/RightRail.tsx src/styles/tokens.css
git commit -m "feat: right rail tab panels (backlinks, related, outline) wired to selection model"
```

---

## Phase 4: Link Creation UX

### Task 4.1: Command Palette

**Files:**
- Create: `src/components/CommandPalette/CommandPalette.tsx`
- Create: `src/components/CommandPalette/index.ts`
- Create: `src/hooks/useCommandPalette.ts`

Build a Mod+K command palette with fuzzy search against doc titles and navigation actions. Uses the file list from `useFiles` hook.

This is the keyboard-first entry point for all navigation. Implementation follows the same pattern as the other components - create hook for state, component for rendering, wire into shell via a global keyboard listener.

**Commit:**

```bash
git add src/components/CommandPalette/ src/hooks/useCommandPalette.ts
git commit -m "feat: command palette (Mod+K) with doc search and nav actions"
```

---

### Task 4.2: Wiki-Link Autocomplete and LinkPopover

**Files:**
- Create: `src/components/Links/LinkPopover.tsx`
- Create: `src/components/Links/WikiLinkAutocomplete.tsx`
- Create: `src/components/Links/index.ts`
- Create: `src/utils/wiki-link-parser.ts`
- Test: `src/utils/__tests__/wiki-link-parser.test.ts`

Build the `[[` autocomplete and the shared LinkPopover component.

**wiki-link-parser.ts** extracts `[[Doc]]`, `[[Doc#Heading]]`, `[[Doc^block]]`, `[[Doc|alias]]` from text:

```ts
export interface ParsedWikiLink {
  raw: string          // full match including brackets
  docTitle: string     // document title
  heading?: string     // #heading target
  blockRef?: string    // ^block target
  alias?: string       // |display text
  start: number        // position in source text
  end: number
}

const WIKI_LINK_RE = /\[\[([^\]|#^]+?)(?:#([^\]|^]+?))?(?:\^([^\]|]+?))?(?:\|([^\]]+?))?\]\]/g

export function parseWikiLinks(text: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = []
  let match: RegExpExecArray | null
  while ((match = WIKI_LINK_RE.exec(text)) !== null) {
    links.push({
      raw: match[0],
      docTitle: match[1]!.trim(),
      heading: match[2]?.trim(),
      blockRef: match[3]?.trim(),
      alias: match[4]?.trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return links
}
```

**Commit:**

```bash
git add src/components/Links/ src/utils/wiki-link-parser.ts src/utils/__tests__/wiki-link-parser.test.ts
git commit -m "feat: wiki-link parser, LinkPopover, autocomplete component"
```

---

## Phase 5: Link Lifecycle and Maintenance

### Task 5.1: Web Worker Wiki-Link Indexer

**Files:**
- Create: `src/workers/link-indexer.worker.ts`
- Create: `src/hooks/useLinkIndex.ts`
- Create: `src/contexts/LinkIndexContext.tsx`

Web Worker that scans all docs, extracts wiki links, and builds the explicit edge index.

### Task 5.2: Outgoing Links Tab

**Files:**
- Modify: `src/components/RightRail/OutgoingTab.tsx` - replace stub with real implementation

### Task 5.3: Unlinked Mentions Tab

**Files:**
- Modify: `src/components/RightRail/MentionsTab.tsx` - replace stub with real implementation

### Task 5.4: Link Export/Import in Settings

**Files:**
- Modify: `src/components/Settings/ExportImportCard.tsx` - add link data export/import

**Commit per sub-task.**

---

## Phase 6: Navigation and Polish

### Task 6.1: Navigation History Stack

**Files:**
- Create: `src/hooks/useNavigationHistory.ts`
- Test: `src/hooks/__tests__/useNavigationHistory.test.ts`

### Task 6.2: Hover Previews

**Files:**
- Create: `src/components/Links/HoverPreview.tsx`
- Create: `src/hooks/useHoverPreview.ts`

### Task 6.3: Settings Page Tabs

**Files:**
- Modify: `src/pages/SettingsPage.tsx` - convert to tabbed layout

### Task 6.4: Keyboard Focus Management

**Files:**
- Create: `src/hooks/useShortcuts.ts`
- Modify: `src/components/Shell/WorkstationShell.tsx` - add global keyboard listeners

**Commit per sub-task.**

---

## Phase 7: Performance

### Task 7.1: Route Code Splitting

**Files:**
- Modify: `src/components/Shell/CenterPane.tsx` - already uses lazy() from Task 2.4
- Modify: `vite.config.ts` - add manualChunks for vendor splitting

Add to vite.config.ts:

```ts
build: {
  sourcemap: process.env.NODE_ENV !== 'production',
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        query: ['@tanstack/react-query'],
        motion: ['framer-motion'],
      },
    },
  },
},
```

### Task 7.2: List Virtualization

**Files:**
- Add dependency: Install a lightweight virtualizer (e.g., `@tanstack/react-virtual`)
- Modify: `src/components/RightRail/BacklinksTab.tsx` - virtualize long lists
- Modify: `src/components/RightRail/RelatedTab.tsx` - virtualize long lists

### Task 7.3: Bundle Size Verification

Run: `npx vite build`
Expected: Initial chunk under 300KB (vendor, query, motion split out)

**Commit per sub-task.**

---

## Summary: Commit Sequence

| # | Commit | Phase |
|---|--------|-------|
| 1 | Design token system with dark/light themes | 1 |
| 2 | Workstation UI primitives | 1 |
| 3 | Storage migration utilities | 1 |
| 4 | SelectionContext | 2 |
| 5 | TabsContext | 2 |
| 6 | useResizablePanel hook | 2 |
| 7 | Three-pane workstation shell | 2 |
| 8 | Migrate pages to token system | 2 |
| 9 | Right rail tab panels | 3 |
| 10 | Command palette | 4 |
| 11 | Wiki-link parser, LinkPopover, autocomplete | 4 |
| 12 | Web Worker link indexer | 5 |
| 13 | Outgoing links tab | 5 |
| 14 | Unlinked mentions tab | 5 |
| 15 | Link export/import | 5 |
| 16 | Navigation history stack | 6 |
| 17 | Hover previews | 6 |
| 18 | Settings tabbed layout | 6 |
| 19 | Keyboard focus management | 6 |
| 20 | Route code splitting + vendor chunks | 7 |
| 21 | List virtualization | 7 |
| 22 | Bundle verification | 7 |
