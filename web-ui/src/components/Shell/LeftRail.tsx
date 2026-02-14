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

      <div style={{ flex: 1 }} />

      {config && !collapsed && (
        <div className="ws-left-rail-footer">
          <div className="ws-db-indicator" title={config.dbPath}>
            <span className="ws-db-dot" />
            <span className="ws-db-name">{config.name}</span>
            <span className="ws-db-count">{config.documentCount} docs</span>
          </div>
        </div>
      )}

      <button
        type="button"
        className="ws-rail-toggle"
        onClick={onToggle}
        aria-label="Toggle left rail"
      >
        {collapsed ? '\u203A' : '\u2039'}
      </button>
    </aside>
  )
}
