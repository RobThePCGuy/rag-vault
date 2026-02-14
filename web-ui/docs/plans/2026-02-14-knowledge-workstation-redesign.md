# Knowledge Workstation Redesign

**Date:** 2026-02-14
**Status:** Design approved, pending implementation plan
**Scope:** Complete web-ui redesign with bidirectional linking as first-class navigation primitive

---

## Goals

1. Replace the generic Tailwind dashboard with a dark-first knowledge workstation UI
2. Promote bidirectional links from a Reader-only feature to the app's primary navigation model
3. Fix the "split personality" between the warm Reader surface and cold gray shell
4. Unify search, reading, and link traversal into a single coherent flow

## Non-Goals

- Server-side changes (MVP is client-only; backend is analytics-only)
- New storage layer (localStorage remains authoritative)
- Mobile-native layout (responsive down to ~768px, but desktop-first)
- Global graph view (always local, centered on current doc)

## Constraints

- Local-first: all pins, dismissals, tabs, history, explicit edge index in localStorage
- No new backend endpoints required for MVP
- Existing Reader book/zettel themes preserved as reading surface inside the workstation shell
- Bundle budget: initial load under 300KB (down from 635KB), Reader/Graph lazy-loaded

---

## Existing Infrastructure Inventory

### What already exists and works

- **PinnedLink model** with fingerprint-based resilient matching (SHA-256 of text)
- **LinksContext** with createPin, deletePin, getPinsFromChunk, getBacklinks
- **InferredBacklinks hook** with suggestion engine, dismiss, pin-as-explicit
- **BacklinksPanel** component (currently Reader-only)
- **Graph visualization** with pinned/semantic/backlink/same-doc edge types, force simulation, 150-node cap
- **Related chunks API** (getRelatedChunks, getBatchRelatedChunks) with explanations
- **Feedback flywheel** (pin/unpin/dismiss/click events sent to server, FeedbackStore with boost/penalty multipliers)
- **useGraphData** integrating pins and semantic edges
- **DynamicMargin** as the Reader's right-side context panel

### What needs to change

- BacklinksPanel, DynamicMargin, GraphPanel promoted from Reader-only to app-level right rail
- LinksStore split into separate stores (pins vs derived explicit index)
- All storage scoped by dbId
- Tab model, navigation history, command palette are new
- Wiki-link parsing and Web Worker indexer are new
- Design tokens replace all ad-hoc Tailwind color classes

---

## Architecture

### App Shell: Three-Pane Knowledge Workbench

```
+------------------+-----------------------------+---------------------+
|   LEFT RAIL      |      CENTER PANE            |    RIGHT RAIL       |
|   (collapsible)  |      (main content)         |    (collapsible)    |
|                  |                             |                     |
|  Nav items       |  Tabs: doc | search | etc   |  Context panel:     |
|  Collections     |                             |  - Backlinks        |
|  Recent docs     |  Active tab content:        |  - Outgoing links   |
|  Quick switcher  |  Search / Reader / Upload   |  - Related passages |
|                  |  Files / Settings / Status  |  - Mentions         |
|                  |                             |  - Outline          |
|                  |  (Reader uses paper surface |  - Graph (local)    |
|                  |   inside this pane)         |                     |
+------------------+-----------------------------+---------------------+
     ~200px             flexible                      ~280px
     Mod+[              (fills remaining)             Mod+]
```

**Left rail** (180-320px, resizable, clamp):
- Nav links: Search, Upload, Files, Collections, Status, Settings
- Collections as expandable tree
- Recent documents
- Unresolved links badge (inbox-style count)
- Quick switcher trigger (Mod+K)
- Database info at bottom (current db name, doc count)
- Collapses to icon-only with tooltips

**Center pane** (flexible):
- Tab bar at top: closeable, reorderable, max 8, LRU eviction of non-pinned
- Slim contextual header: doc title, back/forward buttons, breadcrumbs or search box
- Content area: page components render here
- Reader uses its paper/serif surface inside this area; all surrounding chrome stays workstation

**Right rail** (240-420px, resizable, clamp):
- Tab bar: Backlinks, Outgoing, Related, Mentions, Outline, Graph
- Content updates based on unified selection model
- When nothing selected: shows recent docs, pinned items, tips
- Available on every page, not just Reader

### Unified Selection Model

Single app-level concept: `currentSelection`

```typescript
interface AppSelection {
  docId: string | null
  chunkIndex: number | null
  chunkRef: HeadingRef | BlockRef | null  // optional refined target
  source: 'search' | 'reader' | 'files' | 'graph' | 'backlink'
}
```

Pages feed this selection (clicking a search result, opening a file, clicking a graph node). Right rail reacts to it. Navigation history records it.

### Tab Model

```typescript
interface PaneTab {
  tabId: string          // uuid
  kind: 'doc' | 'search' | 'files' | 'settings' | 'collections' | 'status' | 'upload'
  docId?: string         // for kind: 'doc'
  chunkRef?: string      // heading key or block key
  title: string          // display label, updates when doc title changes
  scrollTop: number      // center pane scroll position
  lastActiveAt: number   // timestamp for LRU eviction
  pinned: boolean        // prevents auto-eviction
}
```

**Open doc behavior:**
- If doc already has a tab, focus it (no duplicates)
- If not, open new tab
- If 8 tabs reached, evict least recently used non-pinned tab

### Navigation History Stack

Separate from browser history. Managed by `useNavigationHistory` hook.

```typescript
interface NavEntry {
  route: string
  tabId: string
  docId?: string
  chunkIndex?: number
  scrollPosition: number
  searchQuery?: string
  timestamp: number
}
```

- Mod+Left / Mod+Right traverse doc history
- "Back to results" restores search page state including query, scroll, and selected result
- Stack capped at 100 entries, oldest evicted

---

## State Persistence and Storage

### Per-User (not per-route) Persistence

- Left rail collapsed state
- Right rail collapsed state
- Active right-rail tab
- Panel widths (left, right)
- Open tabs and active tab
- Theme preference

### Per-Database (keyed by dbId) Stores

| Store | Key pattern | Content | Authority |
|-------|------------|---------|-----------|
| Pins | `rag-vault-pins-v2-{dbId}` | PinnedLink[], trails, bookmarks | User truth |
| Dismissed | `rag-vault-dismissed-v1-{dbId}` | Dismissed suggestion IDs | User truth |
| Tabs | `rag-vault-tabs-v1-{dbId}` | PaneTab[], activeTabId | User state |
| History | `rag-vault-history-v1-{dbId}` | NavEntry[] | User state |
| Explicit Index | `rag-vault-explicitIndex-v1-{dbId}` | Derived wiki-link edges | Derived (recomputable) |

### Storage Authority Rules

- Local is authoritative. Server feedback endpoint is analytics-only.
- Export/import is a core feature, not a nice-to-have.
- Export format: `{ schemaVersion, dbId, exportedAt, pins, dismissed, tabs?, history? }`
- Explicit index is NOT exported (derived, recomputed on import or reindex).
- Schema versioned. Migrations run on load. Old format preserved until migration succeeds.

### Database Switch Rules

- Switching dbId cancels all in-flight Web Worker jobs
- Cancels all in-flight React Query requests tied to previous dbId
- All contexts reload from new db's storage
- Cross-db import blocked with warning

---

## Design Tokens and Visual Identity

### Token System

```css
/* Dark theme (default identity) */
@theme {
  --color-bg:          /* deep slate base */
  --color-surface-1:   /* panel backgrounds */
  --color-surface-2:   /* elevated cards, popovers */
  --color-border:      /* low-contrast dividers */
  --color-text:        /* primary text, high contrast */
  --color-muted:       /* secondary text, labels */
  --color-accent:      /* orange, for intent/active states */
  --color-accent-muted: /* orange at low opacity, hover backgrounds */

  /* Semantic */
  --color-success:
  --color-warning:
  --color-danger:

  /* Link types */
  --color-link-explicit:  /* explicit user links */
  --color-link-semantic:  /* inferred/related */
  --color-link-backlink:  /* incoming links */
  --color-link-unresolved: /* broken/missing target */

  /* Focus */
  --color-focus-ring:  /* accent or visible neutral */

  /* Spacing, radius, shadow */
  --radius-sm: --radius-md: --radius-lg:
  --shadow-1: --shadow-2: --shadow-3:
}
```

### Rules

- Orange as "intent," not "paint": active nav, selected tab, primary actions, link highlights. Most chrome neutral.
- Focus ring uses accent color. All focus states tokenized to prevent blue regression.
- Body text comfortably readable on dark surfaces (not gray-on-near-black).
- Hover and selected states distinct even for color-blind users (use shape, weight, or underline in addition to color).
- Light mode uses the same token system mapped to a lighter palette, not gray-50/white/gray-200.
- Reader paper/serif surface is a "reading skin" inside center pane; surrounding chrome stays workstation tokens.

### Typography

- UI: clean sans-serif for controls, nav, labels
- Reader content: Georgia/Palatino serif (existing book theme, preserved)
- Monospace accent for code blocks, chunk IDs, paths

---

## Bidirectional Linking Model

### Two Layers

**Layer 1: Explicit links (user-created)**
- Wiki-link syntax: `[[Doc Title]]`, `[[Doc Title#Heading]]`, `[[Doc Title^block]]`, `[[Doc Title|display text]]`
- Stored as PinnedLink edges (existing model)
- Internally resolve to docId. Display title as label. Title changes don't break links.
- Visible in Outgoing Links tab and as Backlinks on target document
- Can be labeled ("supports", "contradicts", "extends")

**Layer 2: Semantic links (system-inferred)**
- Via existing getRelatedChunks() and useInferredBacklinks
- Shown in Related Passages tab, visually distinct from explicit
- "Pin as link" promotes inferred to explicit
- "Dismiss" hides (persisted per dbId)

### Link Target Hierarchy

- `[[Doc]]` -- document level, resolves to docId
- `[[Doc#Heading]]` -- section level, resolves against outline/heading data, navigates to first chunk under heading
- `[[Doc^block]]` -- passage level, block key derived from fingerprint (SHA-256 of normalized text)
- `[[Doc|alias]]` -- display alias, link resolves to Doc. Renderer shows alias text. Aliases ignored for mention detection in MVP.

### Wiki-Link Parsing and Edge Indexer

**Client-side Web Worker** runs on app load:
1. Fetches file list (existing useFiles)
2. For each doc, fetches chunk text (throttled, 2-4 concurrent, abort on dbId change)
3. Extracts `[[...]]` patterns from text
4. Builds explicit edge index in memory, persists to localStorage
5. Incremental: re-indexes single doc on open or upload
6. Manual "Reindex all links" action in Settings for full rebuild
7. Progress indicator during initial scan

**Explicit edge index structure:**

```typescript
interface ExplicitEdgeIndex {
  schemaVersion: number
  lastIndexedAt: number
  indexedDocIds: string[]
  bySourceDocId: Map<string, ResolvedLink[]>
  unresolvedBySource: Map<string, UnresolvedLink[]>
  reverseIndex: Map<string, BacklinkRef[]>  // targetDocId -> sources
}
```

Separate from pins store. Derived truth, recomputable without touching user data.

### Block Reference Stability

When source text changes:
1. Attempt exact fingerprint match first
2. If no match, fuzzy reattachment: find chunk with highest text similarity to original anchor text (use embeddings)
3. If fuzzy confidence below threshold (hardcoded for MVP, configurable later), mark anchor as "orphaned"
4. Orphaned anchors surfaced in Outgoing Links tab AND wherever the link appears with a "broken" indicator and hover explanation
5. Repair actions: "Retarget" (preserves label and source anchor, records target change), "Remove link", "Keep (stale)"
6. Never silently drop anchors. Failed resolution is always visible.

### Link Maintenance

- **Broken link triage:** Unresolved links surface in Outgoing Links tab "Unresolved" filter AND as badge in left rail
- **Retarget:** Single action to choose new target, preserves source anchor and label
- **Create stub:** From unresolved link, create new empty doc with that title
- **Rename handling:** Links stored by docId internally; rendered title updates when doc title changes

### Unlinked Mentions

- **Trigger:** Only computed when Mentions tab is opened (not proactive)
- **Strategy:** Use existing search endpoint first (query current doc title as keyword search, filter out current doc). Fall back to client-side scan only if search unavailable.
- **Matching:** Exact title match, case-insensitive, word boundaries required, ignore inside code blocks and URLs
- **Caps:** 50 candidate docs max, paginate beyond that. Cache per doc, invalidate on upload/ingest.
- **Action:** "Link it" one-click creates explicit edge
- **Future:** User-defined aliases per document (not MVP)

---

## UX Flows

### Link Creation (Keyboard-First)

1. **`[[` trigger** in designated text inputs -> autocomplete dropdown with doc titles, optional `#heading` or `^block` suffix
2. **Text selection in Reader** -> popover with "Link to..." -> search/autocomplete for target
3. **Right-click chunk** -> "Create link to..."
4. **Command palette (Mod+K):** "Create link to..." (from current selection), "Pin current related passage", "Dismiss suggestion"
5. **Single `LinkPopover` component** used everywhere for consistency

### Hover Previews

- Debounced ~300ms hover intent before showing
- Prefetch target doc metadata + chunk excerpt
- Preview card: doc title, excerpt, backlink count, score if semantic
- Actions: "Open", "Open in split tab", "Pin as explicit link" (for semantic items)
- Fast mouse-away cancels without flash

### Graph (Right Rail Tab)

- Always local: current doc + depth 1 by default
- Depth 2 available via toggle, capped at 150 nodes, 300 edges
- Progressive loading: depth 1 immediate, depth 2 in background
- Edge type toggles: explicit / semantic / same-doc
- Click node navigates center pane
- Click edge shows: explicit label, or semantic score + top matching excerpt
- No global hairball unless explicitly requested

### Command Palette (Mod+K)

- Open doc by title (fuzzy search)
- Jump to collection
- "Create link to..."
- "Open backlinks" / "Open outgoing" / "Open related"
- Toggle left rail / right rail
- Switch database
- All navigational actions surface here first, menus second

### Settings Page (Tabbed)

- **Database** tab: Current DB info, switcher, create, scan. Danger zone at bottom (delete).
- **Search** tab: Hybrid weight slider, future search config
- **Paths** tab: Allowed roots
- **Data** tab: Export/import config, export/import links (pins, dismissed, optionally tabs/history)
- Active tab persists

---

## Accessibility

### Focus Management

- Escape closes in order: popover -> command palette -> drawer/overlay -> rail
- Focus returns to the element that triggered the dismissed layer
- Tab order: left rail -> center pane -> right rail
- Hidden/collapsed rails removed from tab order
- Rails trap focus only in overlay/drawer mode (narrow viewports)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Mod+K | Command palette |
| Mod+[ | Toggle left rail |
| Mod+] | Toggle right rail |
| Mod+Left | Navigate doc history back |
| Mod+Right | Navigate doc history forward |
| [[ | Wiki-link autocomplete (in text inputs only) |
| Escape | Close topmost layer |

All shortcuts avoid browser default collisions. Configurable in Settings (future, not MVP).

---

## Performance

### Bundle Budget

- Initial load: under 300KB (down from 635KB)
- Reader + subcomponents: lazy-loaded
- Graph visualization (canvas + force sim): lazy-loaded
- Settings page tabs: lazy-loaded
- Export dialog: lazy-loaded

### Runtime Caps

- Tabs: max 8, LRU eviction
- Nav history: 100 entries
- Graph: 150 nodes, 300 edges
- Mentions: 50 candidate docs, paginated
- Web Worker scan: 2-4 concurrent doc fetches, abort on dbId change
- React Query: debounced related chunk fetches, tuned stale times per panel
- Virtualized lists for backlinks, outgoing, mentions when > 50 items

### Responsive Behavior

- Below ~1024px: right rail becomes overlay drawer with same tabs
- Below ~768px: left rail auto-collapses to icon-only
- Keyboard flow: Mod+[ and Mod+] toggles, Tab order skips hidden rails
- Focus moves into overlay rail on open, Escape closes and returns focus to toggle button

---

## Future Considerations (Not MVP)

- Server-side wiki-link extraction endpoint for large vaults
- Server-side link storage and sync (local wins on conflict)
- User-defined aliases per document
- Configurable keyboard shortcuts
- True split pane (two readers side by side)
- Peek panel (temporary preview drawer)
- Collaborative link sharing across users
- AI-suggested link labels based on content analysis

---

## Implementation Phases

### Phase 1: Design Tokens and Component Primitives

CSS variables for all colors, radii, shadows, spacing, typography. Build primitives: Button, Input, Select, Tabs, Panel, Card, Badge, Tooltip, SplitPane layout, CommandPalette shell. Replace all stray Tailwind gray/blue classes with tokenized classes. Both dark and light token maps. Export/import for new storage format.

**Acceptance criteria:**
- All color usage goes through CSS variables, zero raw Tailwind color classes in components
- Dark and light themes render correctly with the same component code
- Focus rings use accent token everywhere
- Primitives documented with usage examples
- Storage migration from v1 format succeeds without data loss

### Phase 2: App Shell - Three-Pane Layout

Collapsible left rail, center pane with tab bar, collapsible right rail. Resizable with clamps. Persist state per-user. Unified selection model at shell level. Header merged into shell. Collections added to nav. Database info in left rail footer.

**Acceptance criteria:**
- Left rail and right rail collapse state persists across sessions
- Panel widths persist and respect clamps (left: 180-320, right: 240-420)
- Tabs open, close, reorder, evict at 8, persist across sessions
- Right rail updates based on unified selection on Search and Files pages (not just Reader)
- Responsive: right rail becomes overlay below 1024px, left rail icon-only below 768px
- Database switch cancels in-flight queries and reloads all state

### Phase 3: Right Rail Promotion

Move DynamicMargin, BacklinksPanel, GraphPanel from Reader-only to app-level right rail with tabs. Wire to unified selection model. Right rail shows context on every page. Empty state when nothing selected.

**Acceptance criteria:**
- Backlinks tab shows incoming links for selected doc on any page
- Related Passages tab shows semantic suggestions for selected doc/chunk
- Graph tab shows local graph for selected doc
- Outline tab shows headings for selected doc
- Empty state shows recent docs or pinned items when nothing selected
- All existing Reader margin functionality preserved (no regression)

### Phase 4: Link Creation UX

`[[` autocomplete in text inputs. Selection popover "Link to..." in Reader. Command palette (Mod+K) with doc search and link actions. `LinkPopover` component. Heading (`#`) and block (`^`) reference support. Alias display (`|`).

**Acceptance criteria:**
- `[[` trigger opens autocomplete with doc titles in at least Reader text selection flow
- Selection popover creates a PinnedLink edge visible in Backlinks on target doc
- Backlinks show outside Reader (on Search, Files pages via right rail)
- Command palette opens with Mod+K, searches docs, executes nav actions
- `[[Doc#Heading]]` navigates to correct section
- `[[Doc|alias]]` renders alias text

### Phase 5: Link Lifecycle and Maintenance

Web Worker wiki-link indexer. Outgoing Links tab. Unlinked Mentions tab. Broken link triage (unresolved filter, retarget, create stub). Orphaned anchor detection and repair UI. Link export/import in Settings.

**Acceptance criteria:**
- Web Worker scans all docs and builds explicit edge index on load
- Incremental re-index on doc open or upload
- Outgoing Links tab shows all explicit links from current doc
- Unresolved links flagged with badge in left rail and repair actions
- Mentions tab finds title occurrences in other docs with "Link it" action
- Export/import includes pins and dismissed, versioned format
- Block references that can't resolve show "orphaned" indicator with repair options

### Phase 6: Navigation and Polish

Navigation history stack (Mod+Left/Right). Hover previews with prefetch. Settings page tabs. Responsive overlay behavior for rails. Keyboard focus management (Escape layering, tab order).

**Acceptance criteria:**
- Doc history back/forward traverses visited docs independent of browser history
- "Back to results" restores search query, scroll position, selected result
- Hover previews show doc title, excerpt, backlink count after 300ms
- Settings rendered as tabbed layout with persisted active tab
- Escape closes layers in correct order, focus returns to trigger
- Overlay rails trap focus correctly on narrow viewports

### Phase 7: Performance

Route-level code splitting for Reader, Graph, Settings, Export. List virtualization for backlinks, outgoing, mentions. Bundle size optimization. Suspense boundaries. Web Worker throttling and abort.

**Acceptance criteria:**
- Initial bundle under 300KB
- Reader and Graph load on demand without visible delay on fast connections
- Lists with > 50 items are virtualized (no scroll jank)
- Web Worker respects concurrency limits and aborts cleanly on dbId change
- No unnecessary re-renders in right rail when center pane scrolls

### Phase 8 (Future): Server Optimization

Optional backend endpoint for bulk doc text or extracted wiki links. Server-side link storage. Sync protocol (local wins on conflict). Large vault performance.

**Not in scope for MVP.** Documented here for future planning.
