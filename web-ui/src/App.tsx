import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout/Layout'
import { ReaderSettingsProvider } from './contexts/ReaderSettingsContext'
import { CollectionsPage } from './pages/CollectionsPage'
import { FilesPage } from './pages/FilesPage'
import { ReaderPage } from './pages/ReaderPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatusPage } from './pages/StatusPage'
import { UploadPage } from './pages/UploadPage'

function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route
            path="/read"
            element={
              <ReaderSettingsProvider>
                <ReaderPage />
              </ReaderSettingsProvider>
            }
          />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
