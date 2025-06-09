import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import '@repo/ui/main.css'
import { Toaster } from '@ui/components/index.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
)
