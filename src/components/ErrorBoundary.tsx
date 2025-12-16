import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error('System Crash:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = () => {
    const errorText = `Error: ${this.state.error?.toString()}\n\nStack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6 font-mono text-neutral-400 selection:bg-red-500/30">
          <div className="max-w-2xl w-full border border-red-900/30 bg-red-950/5 rounded-xl p-8 shadow-2xl relative overflow-hidden">

            {/* Decorative Noise/Scanline */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-500 mb-1 tracking-tight">
                  SYSTEM_CRITICAL_FAILURE
                </h1>
                <p className="text-sm text-red-400/60">
                  The application kernel encountered an unrecoverable error.
                </p>
              </div>
            </div>

            {/* Error Dump */}
            <div className="mb-8 relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={this.handleCopyError}
                  className="p-1.5 rounded bg-red-900/50 hover:bg-red-900 text-red-200 transition-colors"
                  title="Copy Stack Trace"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <pre className="bg-black/50 border border-red-900/30 rounded-lg p-4 text-[10px] md:text-xs overflow-x-auto custom-scrollbar">
                <code className="text-red-300">
                  {this.state.error?.toString() || "Unknown Error"}
                </code>
                {this.props.showDetails && this.state.errorInfo && (
                  <code className="text-red-400/50 block mt-2">
                    {this.state.errorInfo.componentStack}
                  </code>
                )}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white border-none font-mono"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                REBOOT_SYSTEM
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="border-red-900/30 text-red-400 hover:bg-red-950/30 hover:text-red-300 font-mono"
              >
                <Home className="w-4 h-4 mr-2" />
                RETURN_HOME
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-red-900/20 text-[10px] text-red-900/60 flex justify-between items-center">
              <span>ERROR_CODE: 0xDEADBEEF</span>
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3" /> sys_log_v2.0
              </span>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;