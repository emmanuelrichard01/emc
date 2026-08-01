import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal, Copy, Check } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-background p-6 font-mono text-foreground selection:bg-destructive/30">
          <div className="max-w-2xl w-full border border-destructive bg-card p-8 relative overflow-hidden rounded-none">

            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 border border-destructive bg-destructive/10">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-destructive mb-1 tracking-widest uppercase">
                  SYS.CRITICAL_FAILURE
                </h1>
                <p className="text-[11px] text-destructive/70 tracking-widest uppercase mt-2">
                  The application kernel encountered an unrecoverable error.
                </p>
              </div>
            </div>

            {/* Error Dump */}
            <div className="mb-8 relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={this.handleCopyError}
                  className="p-1.5 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground transition-colors cursor-pointer"
                  title="Copy Stack Trace"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <pre className="bg-muted/30 border border-border p-4 text-[10px] md:text-xs overflow-x-auto">
                <code className="text-destructive font-bold">
                  {this.state.error?.toString() || "Unknown Error"}
                </code>
                {this.props.showDetails && this.state.errorInfo && (
                  <code className="text-muted-foreground block mt-4">
                    {this.state.errorInfo.componentStack}
                  </code>
                )}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-destructive bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors uppercase tracking-widest text-[11px] font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reboot System
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-border bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground transition-colors uppercase tracking-widest text-[11px] font-bold cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Return Home
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-border text-[9px] text-muted-foreground/60 flex justify-between items-center tracking-widest uppercase">
              <span>ERR_CODE: 0xDEADBEEF</span>
              <span className="flex items-center gap-2">
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