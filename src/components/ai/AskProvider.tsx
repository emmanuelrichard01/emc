import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useProjects } from '@/data/useProjects';
import { MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { isAudience, questionFromSearch, startersFor, type Audience } from '@/lib/aiStarters';
import { AI_SUGGESTIONS } from '@/lib/aiSuggestions';
import type { Project } from '@/types';
import { useBooted } from '@/components/hero/BootOverlay';
import { useAiSession, type AiSession } from '@/components/hero/useAiSession';
import SelectionAsk from './SelectionAsk';

/* ==========================================================================
   ASK — one assistant, many doors

   The assistant used to exist in two places: the hero terminal, which is
   gone the moment you scroll, and the foot of each case study, which is
   there only once you have read to the end. The questions occur everywhere
   in between — halfway down the experience ledger, mid-way through a
   trade-off — and there was nowhere to ask them.

   So the session lives here, above the routes, and everything that can ask
   is a door onto the same conversation:

     · the dock        — ⌘J / Ctrl+J, `/`, the nav, the mobile island
     · the terminal    — `ai` mode in the hero
     · a case study    — the panel at the end of the write-up
     · the palette     — "ask: …" for anything that is not a command
     · the footer      — the last prompt on the page
     · a selection     — highlight a sentence, ask about it
     · a link          — /?ask=… opens the dock and asks

   A question asked in the terminal is still there when the dock opens on a
   case study three pages later; it survives a reload (sessionStorage) and
   ends with the tab. The page context follows the visitor: on a case study,
   "this" means that project.
   ========================================================================== */

const SESSION_KEY = 'emc-ai-session';
const AUDIENCE_KEY = 'emc-ai-audience';

/* Loaded on first open. The dock is the largest piece of UI here that most
   visitors will never see, so it should not be in anyone's first download. */
const AskDock = lazy(() => import('./AskDock'));

interface OpenOptions {
  /** Asked as soon as the dock is open. */
  question?: string;
}

export interface AskState {
  open: boolean;
  openAsk: (options?: OpenOptions) => void;
  closeAsk: () => void;
  toggleAsk: () => void;
  /** Validate and send. Refusals appear in the transcript, not as exceptions. */
  ask: (question: string) => void;
  session: AiSession;
  audience: Audience;
  setAudience: (audience: Audience) => void;
  /** The case study on screen, if any — what "this" refers to. */
  project: Project | null;
  /** Opening questions for where the visitor is and who they said they are. */
  starters: string[];
}

const AskContext = createContext<AskState | null>(null);

function projectFromPath(pathname: string, projects: Project[] | null): Project | null {
  const match = /^\/projects\/([a-z0-9-]+)\/?$/.exec(pathname);
  return match && projects ? (projects.find((p) => p.id === match[1]) ?? null) : null;
}

function readAudience(): Audience {
  try {
    const stored = localStorage.getItem(AUDIENCE_KEY);
    return isAudience(stored) ? stored : 'general';
  } catch {
    return 'general';
  }
}

/** True when focus is somewhere typing happens, so a bare `/` is a character, not a shortcut. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function AskProvider({ children }: { children: React.ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const booted = useBooted();

  const projects = useProjects();
  const project = useMemo(() => projectFromPath(pathname, projects), [pathname, projects]);
  const [audience, setAudienceState] = useState<Audience>(readAudience);
  const session = useAiSession({ projectId: project?.id, audience, persistKey: SESSION_KEY });

  const [open, setOpen] = useState(false);
  /* Mounted from the first open onwards, then kept: unmounting on close
     would throw away scroll position and a half-typed question. */
  const [dockLoaded, setDockLoaded] = useState(false);

  const setAudience = useCallback((next: Audience) => {
    setAudienceState(next);
    try {
      localStorage.setItem(AUDIENCE_KEY, next);
    } catch {
      /* the lens still applies for this visit */
    }
  }, []);

  const { send, reject, busy } = session;
  const ask = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;
      // Caught here rather than as a 400 — the endpoint keeps its own cap as
      // the real boundary; this spares a round trip to be told it.
      if (trimmed.length > MAX_QUESTION_CHARS) {
        reject(`question is ${trimmed.length} characters — keep it under ${MAX_QUESTION_CHARS}.`);
        return;
      }
      void send(trimmed);
    },
    [busy, reject, send]
  );

  const openAsk = useCallback(
    (options: OpenOptions = {}) => {
      setDockLoaded(true);
      setOpen(true);
      if (options.question) ask(options.question);
    },
    [ask]
  );
  const closeAsk = useCallback(() => setOpen(false), []);
  const toggleAsk = useCallback(() => {
    setDockLoaded(true);
    setOpen((v) => !v);
  }, []);

  /* ⌘J / Ctrl+J from anywhere; `/` when not already typing. ⌘K stays the
     palette — "go somewhere" and "ask something" are different intents, and
     the palette hands over to here when what was typed is a question. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'j' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleAsk();
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        openAsk();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openAsk, toggleAsk]);

  /* /?ask=… — once per load, after the cold open has handed over (a question
     asked underneath a full-screen overlay would be answered unseen). The
     parameter is removed as it is consumed, so a reload does not ask again
     and the address bar goes back to the page's own URL. */
  const consumedRef = useRef(false);
  useEffect(() => {
    if (!booted || consumedRef.current) return;
    const question = questionFromSearch(search);
    if (!question) return;
    consumedRef.current = true;
    const params = new URLSearchParams(search);
    params.delete('ask');
    const rest = params.toString();
    navigate({ pathname, search: rest ? `?${rest}` : '', hash }, { replace: true });
    // Next task, not inline: opening sets state, and the URL change above
    // should land first so the dock opens on the clean address.
    setTimeout(() => openAsk({ question }), 0);
  }, [booted, hash, navigate, openAsk, pathname, search]);

  const starters = useMemo(() => startersFor({ project, audience }, AI_SUGGESTIONS), [project, audience]);

  const value = useMemo<AskState>(
    () => ({ open, openAsk, closeAsk, toggleAsk, ask, session, audience, setAudience, project, starters }),
    [open, openAsk, closeAsk, toggleAsk, ask, session, audience, setAudience, project, starters]
  );

  return (
    <AskContext.Provider value={value}>
      {children}
      <SelectionAsk onAsk={(question) => openAsk({ question })} disabled={open && busy} />
      {dockLoaded && (
        <Suspense fallback={null}>
          <AskDock />
        </Suspense>
      )}
    </AskContext.Provider>
  );
}

export const useAsk = (): AskState => {
  const context = useContext(AskContext);
  if (!context) throw new Error('useAsk must be used within an AskProvider');
  return context;
};
