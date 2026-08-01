import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, CheckCircle2, FileText, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  className?: string;
  variant?: 'structural' | 'ghost' | 'card';
}

const FILE_NAME = 'Emmanuel_Moghalu_CV.pdf';
const FILE_SIZE = '208 KB';

export const CVDownloadButton = ({ className = '', variant = 'structural' }: Props) => {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'downloading' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const handleDownload = async () => {
    if (status !== 'idle') return;

    setStatus('preparing');
    setProgress(0);

    // Simulate preparation phase briefly
    await new Promise(r => setTimeout(r, 400));
    setStatus('downloading');

    // Animate progress bar
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          if (progressRef.current) clearInterval(progressRef.current);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    try {
      const response = await fetch('/Emmanuel_Moghalu_CV.pdf');
      if (!response.ok) throw new Error('File not found');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Complete progress
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);

      const a = document.createElement('a');
      a.href = url;
      a.download = FILE_NAME;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus('success');
      toast.success('CV downloaded successfully', {
        description: `${FILE_NAME} · ${FILE_SIZE}`,
        icon: <FileText className="w-4 h-4 text-primary" />
      });

      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);
    } catch (error) {
      if (progressRef.current) clearInterval(progressRef.current);
      setStatus('idle');
      setProgress(0);
      toast.error('Download failed', {
        description: 'Could not retrieve the file. Please try again.'
      });
    }
  };

  const statusLabel = {
    idle: 'Download CV',
    preparing: 'Preparing...',
    downloading: 'Downloading...',
    success: 'Downloaded',
  };

  const statusIcon = {
    idle: <Download className="w-4 h-4" />,
    preparing: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
    downloading: <FileDown className="w-4 h-4 text-primary" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  /* ── Card Variant ── */
  if (variant === 'card') {
    return (
      <div>
        <div className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4">
          // Résumé
        </div>
        <button
          onClick={handleDownload}
          disabled={status !== 'idle'}
          aria-label="Download Emmanuel Moghalu's CV as PDF"
          aria-describedby="cv-file-info"
          className={`group relative flex items-center justify-between border border-border bg-card px-4 py-3 hover:border-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed w-full overflow-hidden ${className}`}
        >
          {/* Progress bar background */}
          {(status === 'downloading' || status === 'preparing') && (
            <motion.div
              className="absolute inset-0 bg-primary/5"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          )}

          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors relative z-10">
            <AnimatePresence mode="wait">
              <motion.div key={status} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                {statusIcon[status]}
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-col items-start">
              <span className={`text-[13px] uppercase tracking-wider font-mono ${status === 'downloading' || status === 'preparing' ? 'text-primary' : ''}`}>
                {statusLabel[status]}
              </span>
              <span id="cv-file-info" className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">
                {FILE_NAME} · {FILE_SIZE}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {status === 'downloading' && (
              <span className="text-[9px] font-mono text-primary">{Math.round(progress)}%</span>
            )}
            <span className="text-[9px] font-mono text-muted-foreground">[PDF]</span>
          </div>
        </button>
      </div>
    );
  }

  /* ── Structural / Ghost Variant ── */
  return (
    <button
      onClick={handleDownload}
      disabled={status !== 'idle'}
      aria-label="Download Emmanuel Moghalu's CV as PDF"
      className={`${variant === 'structural' ? 'btn-structural' : 'btn-ghost-structural'} relative flex items-center justify-center gap-3 w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden ${className}`}
    >
      {/* Progress bar background */}
      {(status === 'downloading' || status === 'preparing') && (
        <motion.div
          className="absolute inset-0 bg-primary/10"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
          style={{ zIndex: 0 }}
        />
      )}

      <span className="min-w-[110px] text-center relative z-10">
        {statusLabel[status]}
      </span>

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          className="relative z-10"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          {statusIcon[status]}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};
