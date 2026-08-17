import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Vault Dashboard React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#090d16', color: '#f28b82', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff' }}>⚠️ Task Dashboard Render Error</h2>
          <p style={{ fontSize: '13px', color: '#9aa0a6', margin: '8px 0 16px 0' }}>
            An unexpected runtime error occurred while rendering the task dashboard.
          </p>
          <pre style={{ background: '#1e1f20', padding: '16px', borderRadius: '12px', color: '#fdd663', overflowX: 'auto', border: '1px solid #3c4043', fontSize: '13px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ background: '#131314', color: '#9aa0a6', fontSize: '11px', padding: '12px', borderRadius: '12px', marginTop: '12px', overflowX: 'auto' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
