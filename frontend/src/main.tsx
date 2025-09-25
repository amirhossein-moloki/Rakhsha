import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Buffer } from 'buffer'

// Polyfill Buffer for use in browser environment (e.g. for things like base64 encoding)
window.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
