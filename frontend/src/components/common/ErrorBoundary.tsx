import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ResQGrid ErrorBoundary] Uncaught runtime exception caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleHardReload = async () => {
    try {
      // Clear all service worker caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      // Unregister any stale service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
    } catch (e) {
      console.warn('Cache clearing notice:', e);
    }
    // Hard reload without cache
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      localStorage.removeItem('resqgrid_token');
      localStorage.removeItem('resqgrid_theme');
      sessionStorage.clear();
    } catch {}
    this.handleHardReload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 select-none">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex items-start space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 flex-shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    DIAGNOSTIC RECOVERY
                  </span>
                  <span className="text-xs text-slate-400">Zero-Network Safe Mode</span>
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  ResQGrid Application Shield Active
                </h1>
                <p className="text-xs text-slate-400">
                  An unexpected render exception was isolated. Your local emergency beacons and stored data are secure.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="relative z-10 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2">
              <div className="flex items-center text-red-400 text-xs font-semibold gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Error details:</span>
              </div>
              <p className="text-xs font-mono text-slate-300 break-words max-h-32 overflow-y-auto">
                {this.state.error?.message || 'Unknown runtime render exception'}
              </p>
            </div>

            {/* Recovery Action Buttons */}
            <div className="relative z-10 space-y-2.5 pt-2">
              <button
                onClick={this.handleHardReload}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-cyan-600/20 transition flex items-center justify-center gap-2 active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application (Clear Cache)</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { window.location.href = '/radio-sos'; }}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Open Offline SOS</span>
                </button>
                <button
                  onClick={this.handleResetState}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-rose-950/40 text-slate-200 hover:text-rose-300 rounded-xl font-semibold text-xs border border-slate-700 hover:border-rose-500/40 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset Session</span>
                </button>
              </div>
            </div>

            <p className="relative z-10 text-[11px] text-center text-slate-500">
              ResQGrid Multi-Channel Emergency Dispatch & PWA Offline Engine
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
