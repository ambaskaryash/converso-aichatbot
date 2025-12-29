import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import styles from './index.css?inline'
import buttonBase from 'react-3d-button/dist/styles.css?inline'
import oceanTheme from 'react-3d-button/dist/themes/ocean.global.css?inline'

declare global {
  interface Window {
    CONVERSO_PROJECT_ID?: string;
    CONVERSO_API_KEY?: string;
    Converso?: {
      init: (config: { projectId: string; apiKey?: string }) => void;
    };
    __ConversoWidget__?: {
      render: (projectId: string) => void;
      unmount: () => void;
    };
  }
}

const WIDGET_ID = 'converso-widget-root'

function mountWidget() {
  // Prevent duplicate mounting
  const existing = document.getElementById(WIDGET_ID)
  if (existing && window.__ConversoWidget__) {
    const pid = window.CONVERSO_PROJECT_ID || '00000000-0000-0000-0000-000000000000'
    window.__ConversoWidget__.render(pid)
    return
  } else if (existing) {
    return
  }

  // Create host element
  const host = document.createElement('div')
  host.id = WIDGET_ID
  document.body.appendChild(host)

  // Attach Shadow DOM
  const shadow = host.attachShadow({ mode: 'open' })

  // Inject styles
  const styleTag = document.createElement('style')
  styleTag.textContent = styles
  shadow.appendChild(styleTag)
  const styleTagBtn = document.createElement('style')
  styleTagBtn.textContent = buttonBase
  shadow.appendChild(styleTagBtn)
  const styleTagTheme = document.createElement('style')
  styleTagTheme.textContent = oceanTheme
  shadow.appendChild(styleTagTheme)

  // Create mount point for React
  const mountPoint = document.createElement('div')
  mountPoint.className = "fixed bottom-4 right-4 z-50 font-sans antialiased"
  shadow.appendChild(mountPoint)

  // Get project ID from script tag data attribute or global config
  // For now, we'll default to a placeholder or look for a global variable
  const projectId = window.CONVERSO_PROJECT_ID || '00000000-0000-0000-0000-000000000000'

  const root = ReactDOM.createRoot(mountPoint)
  const render = (pid: string) =>
    root.render(
    <React.StrictMode>
      <App projectId={pid} />
    </React.StrictMode>,
  )
  render(projectId)

  // Expose re-render/unmount helpers
  window.__ConversoWidget__ = {
    render,
    unmount: () => {
      root.unmount()
    },
  }
}

// Auto-mount if running in a browser environment
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  const pid = params.get('projectId')
  const key = params.get('apiKey')
  const apiBase = params.get('apiBase')
  if (pid) {
    window.CONVERSO_PROJECT_ID = pid
  }
  if (key) {
    window.CONVERSO_API_KEY = key
    try {
      window.localStorage.setItem('converso_api_key', key)
    } catch {
      void 0
    }
  }
  if (apiBase) {
    ;(window as unknown as Record<string, string>).CONVERSO_API_BASE_URL = apiBase
    try {
      window.localStorage.setItem('converso_api_base', apiBase)
    } catch {
      void 0
    }
  }
  if (document.readyState === 'complete') {
    mountWidget()
  } else {
    window.addEventListener('load', mountWidget)
  }
}

// Expose for manual mounting
window.Converso = {
  init: (config: { projectId: string; apiKey?: string }) => {
    window.CONVERSO_PROJECT_ID = config.projectId;
    if (config.apiKey) {
      window.CONVERSO_API_KEY = config.apiKey;
      try {
        window.localStorage.setItem('converso_api_key', config.apiKey);
      } catch {
        void 0;
      }
    }
    if (window.__ConversoWidget__) {
      window.__ConversoWidget__.render(config.projectId)
    } else {
      mountWidget();
    }
  }
}
