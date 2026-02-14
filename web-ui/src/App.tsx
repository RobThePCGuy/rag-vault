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
