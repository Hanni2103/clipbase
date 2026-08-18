import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AIStateProvider } from './hooks/useAIState'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AIStateProvider>
        <App />
      </AIStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
