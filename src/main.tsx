import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { API, API_EST_DEV } from './config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Fondation Z7 (13/10/2026) : hors production, un bandeau permanent le dit.
// Il ne capte aucun clic.
if (API_EST_DEV) {
  const b = document.createElement('div')
  b.id = 'z7-bandeau-dev'
  b.textContent = 'DEV · données fictives · ' + API
  b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;pointer-events:none;'
    + 'background:#0b4f9c;color:#fff;font:700 12px/1.6 Arial,sans-serif;text-align:center;padding:2px 8px;opacity:.92;'
  document.body.appendChild(b)
}
