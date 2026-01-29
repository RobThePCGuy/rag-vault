import { AnimatePresence, motion } from 'framer-motion'
import type { DocumentReadingStats, ReadingSession } from '../../contexts/ReadingStatsContext'
import { formatReadingTime } from '../../hooks/useReadingStats'

// ============================================
// Types
// ============================================

interface ReadingStatsPanelProps {
  isOpen: boolean
  onClose: () => void
  stats: DocumentReadingStats | undefined
  completionPercent: number
  totalTimeMs: number
  averageTimePerChunk: number
  onExport: () => void
  onClear: () => void
}

// ============================================
// Component
// ============================================

/**
 * Panel showing reading statistics for the current document
 */
export function ReadingStatsPanel({
  isOpen,
  onClose,
  stats,
  completionPercent,
  totalTimeMs,
  averageTimePerChunk,
  onExport,
  onClear,
}: ReadingStatsPanelProps) {
  const sessions = stats?.sessions ?? []
  const recentSessions = sessions.slice(-10).reverse() // Most recent first

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <StatsIcon className="w-5 h-5 text-blue-500" />
                Reading Stats
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Main stats */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    label="Completion"
                    value={`${completionPercent}%`}
                    icon={<ProgressIcon className="w-5 h-5" />}
                    highlight={completionPercent === 100}
                  />
                  <StatCard
                    label="Total Time"
                    value={formatReadingTime(totalTimeMs)}
                    icon={<ClockIcon className="w-5 h-5" />}
                  />
                  <StatCard
                    label="Chunks Read"
                    value={`${stats?.chunksRead ?? 0}/${stats?.totalChunks ?? 0}`}
                    icon={<ChunkIcon className="w-5 h-5" />}
                  />
                  <StatCard
                    label="Avg/Chunk"
                    value={formatReadingTime(averageTimePerChunk)}
                    icon={<AvgIcon className="w-5 h-5" />}
                  />
                </div>
              </div>

              {/* Sessions */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <SessionIcon className="w-4 h-4" />
                  Recent Sessions
                </h3>

                {recentSessions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No sessions recorded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.map((session) => (
                      <SessionItem key={session.startedAt} session={session} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                type="button"
                onClick={onExport}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ExportIcon className="w-4 h-4" />
                Export
              </button>
              <button
                type="button"
                onClick={onClear}
                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Clear
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Stat Card
// ============================================

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
}

function StatCard({ label, value, icon, highlight }: StatCardProps) {
  return (
    <div
      className={`p-3 rounded-lg ${
        highlight
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-750'
      }`}
    >
      <div
        className={`mb-1 ${
          highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {icon}
      </div>
      <p
        className={`text-xl font-bold ${
          highlight ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}

// ============================================
// Session Item
// ============================================

interface SessionItemProps {
  session: ReadingSession
}

function SessionItem({ session }: SessionItemProps) {
  const date = new Date(session.startedAt)
  const dateStr = date.toLocaleDateString()
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const isOngoing = !session.endedAt

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{dateStr}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{timeStr}</p>
      </div>
      <div className="text-right">
        {isOngoing ? (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatReadingTime(session.durationMs)}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// Icons
// ============================================

function StatsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ChunkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}

function AvgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  )
}

function SessionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
