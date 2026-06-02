import { Component } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'var(--bg-base)',
        }}>
          <div className="ds-card" style={{ maxWidth: 540, textAlign: 'center', padding: 36 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'rgba(239,68,68,0.12)',
              display: 'grid', placeItems: 'center',
              margin: '0 auto 16px', color: 'var(--danger-500)',
            }}>
              <AlertOctagon size={28} />
            </div>
            <h2 className="h3" style={{ marginBottom: 8 }}>Une erreur inattendue est survenue</h2>
            <p className="muted" style={{ marginBottom: 20, lineHeight: 1.6 }}>
              L'interface a rencontré un problème. Vous pouvez réessayer ou recharger la page.
            </p>
            {this.state.error?.message && (
              <pre style={{
                background: 'var(--bg-surface-2)',
                padding: 12,
                borderRadius: 8,
                fontSize: 11,
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: 160,
                marginBottom: 16,
                color: 'var(--danger-500)',
                fontFamily: 'var(--font-mono)',
              }}>
                {String(this.state.error.message)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="ds-btn ds-btn--secondary" onClick={this.reset}>
                <RefreshCw size={14} /> Réessayer
              </button>
              <button className="ds-btn ds-btn--primary" onClick={() => window.location.reload()}>
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
