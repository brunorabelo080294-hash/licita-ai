import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAcessibilidade } from './utils/acessibilidadeStorage'

// Inicializa preferências de acessibilidade visual salvas
initAcessibilidade()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
