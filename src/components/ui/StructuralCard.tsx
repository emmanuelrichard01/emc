import React from "react";

interface StructuralCardProps {
  children: React.ReactNode;
  className?: string;
}

/* A hairline-bounded area on the stock — the monograph has no raised cards.
   The rule brightens under the pointer; nothing else moves. */
export const StructuralCard = ({ children, className = "" }: StructuralCardProps) => (
  <div className={`relative border border-border p-6 transition-colors duration-300 hover:border-rule-strong ${className}`}>
    {children}
  </div>
);
