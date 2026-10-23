import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: '480px', margin: '40px auto', background: '#FFF5F5', border: '1.5px solid #FEB2B2', borderRadius: '14px', color: '#9B2C2C', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#C53030' }}>Application Error</h2>
          <p style={{ fontSize: '0.86rem', margin: '0 0 16px 0', color: '#4A5568' }}>
            {this.state.error?.message || 'An unexpected error occurred while loading the application.'}
          </p>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = '/'; }}
            style={{ padding: '10px 20px', background: '#3182CE', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Clear Cache & Reload
          </button>
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
)

