import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'react-3d-button/dist/styles.css'
import 'react-3d-button/dist/themes/ocean.global.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'

// Default to dark mode for a modern SaaS aesthetic
document.documentElement.classList.add('dark')

const queryClient = new QueryClient()

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  const script = document.createElement('script')
  script.src = 'https://browser.sentry-cdn.com/7.120.2/bundle.min.js'
  script.crossOrigin = 'anonymous'
  script.onload = () => {
    type SentryAPI = {
      init: (cfg: { dsn: string; integrations: unknown[]; tracesSampleRate: number }) => void
      browserTracingIntegration: () => unknown
    }
    const SentryGlobal = (window as unknown as Record<string, unknown>).Sentry as SentryAPI | undefined
    if (SentryGlobal && typeof SentryGlobal.init === 'function') {
      SentryGlobal.init({
        dsn: sentryDsn,
        integrations: [SentryGlobal.browserTracingIntegration()],
        tracesSampleRate: 0.2,
      })
    }
  }
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
