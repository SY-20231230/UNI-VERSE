import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { UIProvider } from './context/UIContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AppProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </AppProvider>
    </HashRouter>
  </StrictMode>
);
