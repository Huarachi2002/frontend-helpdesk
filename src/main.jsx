// Debe ser la primera importación para asegurar React en scope global (PrimeReact utils)
import './react-shim.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// PrimeReact & PrimeIcons base styles (100% Free / MIT Open Source)
import 'primereact/resources/themes/lara-light-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'

// Tokens de diseño centralizados y estilos globales
import './styles/theme.css'
import './style.css'

import { initAppearance } from './stores/appearanceStore.js'
import App from './App.jsx'

// Aplicar tema, modo Día/Noche (auto/manual) y preferencias WCAG antes del primer render
initAppearance()

const rootElement = document.getElementById('root') || document.getElementById('app')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
