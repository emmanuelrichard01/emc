import { Briefcase, FileText, Home, Mail, User, type LucideIcon } from 'lucide-react';

/* ==========================================================================
   SITE SECTIONS

   One list. The nav pill, the mobile island, the footer sitemap and the
   command palette all read from here.

   These were previously four separate literals, which is how the footer ends
   up saying "Experience" while the nav says "Exp" and the palette omits one
   entirely — nobody notices until a section is added and only three of the
   four learn about it.
   ========================================================================== */

export interface SiteSection {
  /** Matches the section's DOM id and its `data-section` attribute. */
  id: string;
  /** Full name — footer, command palette, assistive tech. */
  label: string;
  /** Abbreviated for the space-constrained nav pill. */
  short: string;
  icon: LucideIcon;
}

export const SECTIONS: SiteSection[] = [
  { id: 'home', label: 'Home', short: 'Home', icon: Home },
  { id: 'about', label: 'About', short: 'About', icon: User },
  { id: 'projects', label: 'Work', short: 'Work', icon: Briefcase },
  { id: 'experience', label: 'Experience', short: 'Exp', icon: FileText },
  { id: 'contact', label: 'Contact', short: 'Contact', icon: Mail },
];
