/* ==========================================================================
   ASSISTANT MODES

   The dock is one frame with several modes, chosen by a tab row at its top:

     Ask          the conversation (owned by the dock itself)
     Role fit     paste a job description; get requirement-by-requirement
                  evidence from the site, or an honest "not shown here"
     Project      describe a project; a few questions, then a drafted brief
                  with relevant past work, which can be sent to Emmanuel
     Tour         a guided two-minute tour of the site for a chosen audience

   Each mode below is a component the dock mounts in its body. The contract:
     · it fills the body and scrolls itself (mark the scroller with
       data-lenis-prevent so the page's smooth scroll leaves it alone);
     · `onClose` closes the whole dock (used when a mode hands the visitor
       to the page, e.g. "Send to Emmanuel" moves to the contact form);
     · `onAsk` switches the dock to Ask and asks a question there;
     · it keeps its own state for the session, so switching tabs and back
       does not lose a half-written description.
   ========================================================================== */

export interface ModeProps {
  onClose: () => void;
  onAsk?: (question: string) => void;
}

export type DockMode = 'ask' | 'fit' | 'brief' | 'tour';
