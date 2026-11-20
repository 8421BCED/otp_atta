import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './design/theme.css';
import './design/shell.css';
import './design/student.css';
import './design/kit.css';
import './design/bridge.css';
import App from './App.jsx';
import { installApiClient } from './api';
import { initInstallPrompt } from './installPrompt';
import { startClock } from './clock';

installApiClient();
startClock(); // college time from the server, ticking locally from the first moment
initInstallPrompt(); // must run before the browser fires its install event

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="status-page">
          <div className="status-card ui-card">
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message || 'An unexpected error occurred while loading the app.'}</p>
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => { try { localStorage.clear(); } catch (e) { /* ignore */ } window.location.href = '/'; }}
            >
              Clear data and reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Offline shell and doorbell notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => reg.update())
      .catch((err) => console.log('Service worker not registered:', err));
  });
}
