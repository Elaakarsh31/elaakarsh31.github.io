import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/ibm-plex-mono/latin-400';
import '@fontsource/ibm-plex-mono/latin-500';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
