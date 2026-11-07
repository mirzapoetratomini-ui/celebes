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

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Celebes Event] Uncaught React Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">Memuat Ulang Tampilan Celebes Event</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Terjadi penyesuaian cache pada aplikasi. Silakan tekan tombol di bawah untuk menyegarkan halaman.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition text-sm cursor-pointer"
              >
                Bersihkan Cache & Reset
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left border-t border-slate-700/60 pt-4">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                  Detail Teknis (Pengembang)
                </summary>
                <pre className="mt-2 text-xs bg-slate-950 p-3 rounded-lg overflow-x-auto text-rose-400 font-mono">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

