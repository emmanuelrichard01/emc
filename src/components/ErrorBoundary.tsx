import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, Terminal, Copy, Check, ChevronDown } from 'lucide-react';

import HorizonMark from '@/components/ui/HorizonMark';

/** Where "Report the problem" writes to. Same address as the terminal's `email`. */
const REPORT_EMAIL = 'emma.moghalu@gmail.com';

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

  /* A full reload rather than resetting the boundary: most failures that
     reach here are a stale or missing code chunk after a deploy, which only
     a fresh load of the page can fix. */
  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = () => {
    const errorText = `Error: ${this.state.error?.toString()}\n\nStack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard?.writeText(errorText).catch(() => {});
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private reportHref() {
    const subject = "Portfolio: a page stopped working";
    const body = [
      "Hi Emmanuel,",
      "",
      "A page on your site stopped working for me.",
      "",
      `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
      `Error: ${this.state.error?.toString() ?? "Unknown error"}`,
      "",
      "(Anything else you noticed:)",
    ].join("\n");
    return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      /* Built like the 404 and the first screen: one centred column, the
         black hole drawn above it (its ring broken), a plain account of what
         happened, and the ways out. Nothing here depends on the router or
         the page's providers, any of which may be what failed. */
      return (
        <div className="relative min-h-dvh flex items-center overflow-hidden bg-background text-foreground page-x py-8 md:py-10">
          {/* The black hole, drawn as large as the hero's but turned down and
              set in the opposite corner: the hero's rises from the bottom
              right, this one sinks into the bottom left, cropped by the edge
              so it frames the message instead of competing with it. */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-[30vmax] -bottom-[38vmax] w-[80vmax] opacity-[0.45] [mask-image:radial-gradient(closest-side,#000_62%,transparent)]">
            <HorizonMark broken className="w-full" />
          </div>
          <div className="relative mx-auto w-full max-w-4xl text-center">
            
            <p className="t-caption mb-3 md:mb-4">
              <span className="t-figure text-status-error">Error</span>
              <span aria-hidden="true" className="text-muted-ghost px-2">·</span>
              This page stopped working
            </p>
            {/* Sized below the site's display voice so the whole page, actions
                included, fits one screen without scrolling. */}
            <h1 className="font-display text-[clamp(2.125rem,1.1rem+3.4vw,4rem)] font-[560] leading-[0.98] tracking-[-0.03em] text-foreground">
              Something broke on this page.
            </h1>
            <p className="mt-4 md:mt-5 mx-auto max-w-[46ch] t-lede text-muted-foreground">
              It&rsquo;s not you. A bug stopped this page from loading. Reloading usually fixes it. If it keeps
              happening, let me know and I&rsquo;ll fix it.
            </p>

            <div className="mt-7 md:mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={this.handleReload} className="btn-ink tap">
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Reload the page
              </button>
              <button type="button" onClick={this.handleGoHome} className="btn-line tap">
                <Home className="w-4 h-4" aria-hidden="true" />
                Go to the home page
              </button>
            </div>
            <p className="mt-4 text-[14px] text-muted-foreground">
              Still broken?{" "}
              <a href={this.reportHref()} className="link-ink">
                Report the problem
              </a>{" "}
              and the details are filled in for you.
            </p>

            {/* For whoever is debugging: folded away, copyable, never the
                headline. */}
            <details className="group mt-7 md:mt-8 mx-auto max-w-2xl border-t border-border pt-3 text-left">
              <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                  Technical details
                </span>
                <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-4">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="tap flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {this.state.copied ? (
                      <Check className="w-3.5 h-3.5 text-status-ok" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {this.state.copied ? "Copied" : "Copy the details"}
                  </button>
                </div>
                <pre className="bg-card p-4 text-[12px] leading-relaxed overflow-x-auto max-h-72" data-lenis-prevent>
                  <code className="text-status-error">{this.state.error?.toString() || "Unknown error"}</code>
                  {this.props.showDetails && this.state.errorInfo && (
                    <code className="text-muted-foreground block mt-4">{this.state.errorInfo.componentStack}</code>
                  )}
                </pre>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
