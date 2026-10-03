import '@fontsource/archivo/400.css'
import '@fontsource/archivo/700.css'
import '@fontsource/archivo/900.css'
import '@fontsource/archivo-narrow/500.css'
import '@fontsource/archivo-narrow/700.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import * as deck from './state/deck'
import { useStore } from './state/store'

if (import.meta.env.DEV) Object.assign(window, { __store: useStore, __deck: deck })

const fontsReady = Promise.all([
  document.fonts.load('900 64px Archivo'),
  document.fonts.load('500 20px "Archivo Narrow"'),
  document.fonts.load('700 20px "Archivo Narrow"'),
]).catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App fontsReady={fontsReady} />
  </StrictMode>,
)
