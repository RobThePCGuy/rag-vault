import { Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout/Layout'
import { FilesPage } from './pages/FilesPage'
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
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
