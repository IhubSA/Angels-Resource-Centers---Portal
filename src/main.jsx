import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicRequestPage from './components/public/PublicRequestPage.jsx'
import { AppProvider } from './context/AppContext.jsx'

// Hash-based routing (2026-09-10) — deliberately not a path (e.g. "/request"), since this is
// a single static index.html with no server-side rewrite rule configured on Vercel to serve
// it for any path other than "/". A hash fragment never reaches the server, so
// "<site>/#/request" always loads index.html normally and just renders differently once the
// script runs — no deploy config changes needed. See PublicRequestPage.jsx / deployment-notes.md.
const isPublicRequestPage = /^#\/?request/i.test(window.location.hash);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      {isPublicRequestPage ? <PublicRequestPage /> : <App />}
    </AppProvider>
  </StrictMode>,
)
