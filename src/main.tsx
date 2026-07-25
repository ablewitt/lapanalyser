import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { clearOrphanedPersistedState } from './lib/sessionService'

// Remove orphaned localStorage keys left over from before persistence moved to
// sessionStorage. Runs before render; harmless once the keys are gone.
clearOrphanedPersistedState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
