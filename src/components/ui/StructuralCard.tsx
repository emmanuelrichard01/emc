import React from "react";

interface StructuralCardProps {
  children: React.ReactNode;
  className?: string;
}

/* Bordered card with animated corner accents on hover — the shared
   "structural" card treatment used across About and project detail pages. */
export const StructuralCard = ({ children, className = "" }: StructuralCardProps) => (
  <div
    className={`border border-border bg-card p-6 relative group transition-all duration-300 hover:border-foreground/20 ${className}`}
    style={{ boxShadow: 'var(--shadow-sm)' }}
  >
    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative z-10 h-full w-full">{children}</div>
  </div>
);
