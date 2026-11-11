import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught an unhandled display exception:', error, errorInfo);
    }
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.resetError })
          : this.props.fallback;
      }

      return (
        <div className="empty" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--paper)', display: 'grid', placeItems: 'center', marginBottom: '20px', color: 'var(--charcoal)' }}>
            <AlertCircle size={24} />
          </div>
          <span className="eyebrow" style={{ letterSpacing: '2px', color: 'var(--muted)', marginBottom: '8px' }}>
            VEYORA MAISON
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', margin: '0 0 12px', fontWeight: 400 }}>
            Something interrupted this view.
          </h1>
          <p style={{ maxWidth: '460px', margin: '0 auto 24px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
            We encountered an unexpected display issue while preparing this piece. Your saved favourites and shopping bag remain secure.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="button dark"
              onClick={() => {
                this.resetError();
                window.location.reload();
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={15} /> Reload View
            </button>
            <a
              href="/"
              className="button secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
            >
              <ArrowLeft size={15} /> Return to Storefront
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
