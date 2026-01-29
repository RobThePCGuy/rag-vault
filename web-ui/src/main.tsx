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
import { TagsProvider } from './contexts/TagsContext'
import { ToastProvider } from './contexts/ToastContext'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
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
          </ToastProvider>
        </PreferencesProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
