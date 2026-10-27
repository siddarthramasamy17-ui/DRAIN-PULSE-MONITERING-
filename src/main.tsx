import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DRAIN PULSE caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c14] text-slate-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full bg-[#0b0f19] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/60 text-red-400 mx-auto flex items-center justify-center text-xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-slate-100">DRAIN PULSE Recovery</h2>
            <p className="text-xs text-slate-400">
              The telemetry console encountered an unexpected condition. Click below to re-initialize the station.
            </p>
            {this.state.error && (
              <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-red-300 overflow-x-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
            >
              Restart Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
