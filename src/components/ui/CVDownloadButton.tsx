import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, CheckCircle2, FileText, FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { CV_FILE_NAME, CV_FILE_SIZE, CV_PATH, downloadCV } from '@/lib/cv';

interface Props {
  className?: string;
  variant?: 'structural' | 'ghost' | 'card';
}

const FILE_NAME = CV_FILE_NAME;
const FILE_SIZE = CV_FILE_SIZE;

/** Hands a fetched blob to the browser under the CV's filename. */
function saveBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = FILE_NAME;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoked on the next tick — releasing it synchronously can cancel the
  // download in Safari before it has read the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const CVDownloadButton = ({ className = '', variant = 'structural' }: Props) => {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'downloading' | 'success'>('idle');
  /** Bytes received / total, or null when the transfer reports no length. */
  const [progress, setProgress] = useState<number | null>(0);
  const abortRef = useRef<AbortController | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  /* The bar counts real bytes.

     It used to be an interval adding `Math.random() * 25` to a number, next to
     a static anchor click that emits no progress events at all — a percentage
     nobody measured, which is precisely the fabrication this codebase removes
     everywhere else. App.tsx says it outright about its own route loader: "a
     dynamic import emits no progress events, so any percentage shown here
     would be made up."

     Fetching the file instead makes the number real. The response is streamed,
     progress is received/total, and the blob is handed to the anchor once
     complete. Where Content-Length is absent (a compressed transfer) progress
     is null and the UI shows an indeterminate state rather than inventing one.
     Any failure falls back to the plain anchor download, so the button still
     works if fetch is blocked. */
  const handleDownload = async () => {
    if (status !== 'idle') return;

    setStatus('preparing');
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    const finish = () => {
      setStatus('success');
      toast.success('CV downloaded', {
        description: `${FILE_NAME} · ${FILE_SIZE}`,
        icon: <FileText className="w-4 h-4 text-primary" />,
      });
      resetRef.current = setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);
    };

    try {
      const response = await fetch(CV_PATH, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setStatus('downloading');

      const total = Number(response.headers.get('Content-Length')) || 0;
      const reader = response.body?.getReader();

      // No streaming reader available — take the blob whole and stay honest
      // about not knowing the progress.
      if (!reader) {
        setProgress(null);
        const blob = await response.blob();
        saveBlob(blob);
        finish();
        return;
      }

      const chunks: Uint8Array[] = [];
      let received = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setProgress(total > 0 ? Math.min(100, (received / total) * 100) : null);
        }
      }

      saveBlob(new Blob(chunks as BlobPart[], { type: 'application/pdf' }));
      setProgress(100);
      finish();
    } catch (error) {
      if (controller.signal.aborted) return;

      // Fetch can be unavailable or blocked; the plain anchor still works, so
      // fall back rather than reporting a failure the user can do nothing with.
      downloadCV();
      setProgress(null);
      finish();
    } finally {
      abortRef.current = null;
    }
  };

  const statusLabel = {
    idle: 'Download CV',
    preparing: 'Preparing…',
    downloading: 'Downloading…',
    success: 'Downloaded',
  };

  const statusIcon = {
    idle: <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />,
    preparing: <Loader2 className="w-4 h-4 animate-spin" />,
    downloading: <FileDown className="w-4 h-4" />,
    // Green reads on the stock, not on the ink button, where the icon keeps the text colour.
    success: <CheckCircle2 className={`w-4 h-4 ${variant === 'structural' ? '' : 'text-status-ok'}`} />,
  };

  const inFlight = status === 'downloading' || status === 'preparing';
  /* Indeterminate when the transfer reports no length: the bar sweeps rather
     than filling to a figure that was never measured. */
  const indeterminate = progress === null;

  /* On the ink button the fill is a shade of the stock; on a hairline
     variant it is a shade of the ink. Either way it is the real byte count. */
  const fillTone = variant === 'structural' ? 'bg-background/15' : 'bg-foreground/[0.07]';

  const ProgressFill = () =>
    indeterminate ? (
      <motion.div
        className={`absolute inset-y-0 w-1/3 ${fillTone}`}
        animate={{ x: ['-120%', '320%'] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
    ) : (
      <motion.div
        className={`absolute inset-y-0 left-0 ${fillTone}`}
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    );

  /* ── Card Variant ── */
  if (variant === 'card') {
    return (
      <div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={status !== 'idle'}
          aria-label="Download Emmanuel Moghalu's CV as PDF"
          aria-describedby="cv-file-info"
          className={`group relative flex items-center justify-between border-y border-border px-0 py-4 hover:border-rule-strong transition-colors disabled:opacity-70 disabled:cursor-not-allowed w-full overflow-hidden cursor-pointer ${className}`}
        >
          {/* Progress bar background */}
          {inFlight && (
            <div className="absolute inset-0 overflow-hidden">
              <ProgressFill />
            </div>
          )}

          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {statusIcon[status]}
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-col items-start">
              <span className="text-[15px] text-foreground">
                {statusLabel[status]}
              </span>
              <span id="cv-file-info" className="t-caption mt-0.5">
                {FILE_NAME} · {FILE_SIZE}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {status === 'downloading' && !indeterminate && (
              <span className="t-figure text-[12px] text-foreground">{Math.round(progress)}%</span>
            )}
            <span className="t-caption">PDF</span>
          </div>
        </button>
      </div>
    );
  }

  /* ── Structural / Ghost Variant ── */
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={status !== 'idle'}
      aria-label="Download Emmanuel Moghalu's CV as PDF"
      className={`group ${
        variant === 'structural' ? 'btn-structural' : 'btn-ghost-structural'
      } relative w-full sm:w-auto disabled:cursor-wait overflow-hidden cursor-pointer ${className}`}
    >
      {/* Progress bar background */}
      {inFlight && (
        <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <ProgressFill />
        </div>
      )}

      <span className="min-w-[104px] text-left relative z-10">
        {statusLabel[status]}
      </span>

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          className="relative z-10"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
        >
          {statusIcon[status]}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};
