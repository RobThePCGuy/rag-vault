import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Spinner } from '../ui'
import { TabBar } from './TabBar'

const ReaderPage = lazy(() => import('../../pages/ReaderPage').then(m => ({ default: m.ReaderPage })))
const SearchPage = lazy(() => import('../../pages/SearchPage').then(m => ({ default: m.SearchPage })))
const UploadPage = lazy(() => import('../../pages/UploadPage').then(m => ({ default: m.UploadPage })))
const FilesPage = lazy(() => import('../../pages/FilesPage').then(m => ({ default: m.FilesPage })))
const CollectionsPage = lazy(() => import('../../pages/CollectionsPage').then(m => ({ default: m.CollectionsPage })))
const StatusPage = lazy(() => import('../../pages/StatusPage').then(m => ({ default: m.StatusPage })))
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

// Lazy load ReaderSettingsProvider too
const ReaderSettingsProvider = lazy(() =>
  import('../../contexts/ReaderSettingsContext').then(m => ({ default: m.ReaderSettingsProvider }))
)

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
            <Route
              path="/read"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ReaderSettingsProvider>
                    <ReaderPage />
                  </ReaderSettingsProvider>
                </Suspense>
              }
            />
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
