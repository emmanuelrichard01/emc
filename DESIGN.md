---
name: builtbyem
description: A studio monograph of shipped systems, printed on black stock.
colors:
  stock: "hsl(0 0% 4%)"
  ink: "hsl(60 6% 94%)"
  plate: "hsl(240 2% 6.5%)"
  popover: "hsl(240 2% 7%)"
  muted-surface: "hsl(240 2% 8%)"
  caption-grey: "hsl(240 2% 55%)"
  quiet-grey: "hsl(240 1% 50%)"
  ghost-grey: "hsl(240 1% 40%)"
  hairline: "hsl(240 3% 13%)"
  rule-strong: "hsl(240 2% 24%)"
  amber: "hsl(38 92% 50%)"
  amber-hover: "hsl(38 92% 55%)"
  amber-ink: "hsl(0 0% 2%)"
  status-ok: "hsl(158 52% 56%)"
  status-warn: "hsl(46 92% 66%)"
  status-error: "hsl(0 86% 71%)"
  paper-white: "hsl(0 0% 100%)"
typography:
  display:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 1.1rem + 5.6vw, 6rem)"
    fontWeight: 560
    lineHeight: 0.94
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 1.25rem + 2.9vw, 4rem)"
    fontWeight: 540
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.1rem + 0.9vw, 1.875rem)"
    fontWeight: 560
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  subhead:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 560
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 112"
  identity:
    fontFamily: "Archivo, Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 560
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  lede:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.125rem, 1rem + 0.45vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.011em"
    fontFeature: "'cv11', 'ss01'"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.006em"
  caption:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
  folio:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "'tnum'"
  figure:
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum'"
  terminal:
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  kbd:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1
rounded:
  none: "0px"
spacing:
  page-x-sm: "1.25rem"
  page-x-md: "2.5rem"
  page-x-lg: "3.5rem"
  page-max: "1440px"
  section-top: "clamp(6rem, 4rem + 8vw, 11rem)"
  section-bottom: "clamp(4rem, 3rem + 4vw, 7rem)"
  gutter: "1.5rem"
  head-gap: "3.5rem"
  plate-run: "10rem"
  tap-min: "44px"
components:
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-ink-hover:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.stock}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  link-ink:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  link-quiet:
    textColor: "{colors.caption-grey}"
  link-quiet-hover:
    textColor: "{colors.ink}"
  kbd:
    textColor: "{colors.caption-grey}"
    typography: "{typography.kbd}"
    rounded: "{rounded.none}"
    height: "1.375rem"
    padding: "0 0.3rem"
  field-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 0"
  running-head:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.caption-grey}"
    typography: "{typography.caption}"
    height: "64px"
  plate:
    backgroundColor: "{colors.plate}"
    rounded: "{rounded.none}"
  index-row:
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    padding: "24px 0"
  terminal-instrument:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    typography: "{typography.terminal}"
    rounded: "{rounded.none}"
    width: "42rem"
  floating-layer:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    width: "640px"
---

# Design System: builtbyem

## Overview

**Creative North Star: "The Night Monograph"**

The site is set like a studio's printed monograph of shipped systems, on black stock. Titles are cut in an expanded grotesque, reading text sits in a quiet sans, screenshots are mounted as square plates with captions under them, sections open on a drawn hairline, and the full body of work is a numbered index. Hierarchy comes from scale contrast, rules and space, never from boxes, chips or glow. The interface recedes so the work leads.

Colour is ink on stock. One accent, a telemetry amber, is reserved for what is live or active right now: a command running, the assistant answering, the section being read, the field being typed in. Because it appears rarely, it means something when it does. The first screen is page one of the same book: the same black, a faint starfield, a ray-traced black hole rising out of the bottom-right corner, and a working terminal prompt at the centre. Its one authored motion, the dive into the hole, is the only cinematic moment; every other entrance is a quiet print gesture (a rule drawn, a title rising from its baseline, a plate uncovered).

The world explicitly rejects the developer-portfolio default: glowing bento cards, tracked mono eyebrows, dashboard chrome, decorative terminals and boxed panels. Everything that looks interactive is interactive, and every figure on the page is derived from the site's own data.

**Key Characteristics:**
- Dark only. Black stock, near-white ink, three greys, one hairline.
- Amber marks live and active state only.
- Archivo expanded (118% width) for titles; Inter for reading; JetBrains Mono only for the terminal, code and measured figures.
- Square everything (0px radius). Rules instead of boxes.
- Plates with captions, a numbered index, a colophon footer.
- Built work set solid; design-stage work set in hairline outline under a dashed rule.
- Motion is a print gesture: drawn rules, rising lines, uncovered plates. Fully static under reduced motion.

## Colors

A near-monochrome stock-and-ink palette with three calibrated greys and a single warm accent held back for live state.

### Primary
- **Telemetry Amber** (`{colors.amber}`, about #F59F0A): the live-state colour. Used for: the focus ring on every control (2px outline, 2px offset); the input caret; the prompt glyph and a running command's name in the terminal; the Shell/Ask switch underline; the reading-progress meter inside the current section's nav hairline; the mobile nav's active hairline; the travelling light in the hero's scroll cue; the hairline drawn under the destination name during a page turn; the assistant's thinking dots and its rotating border while a question is in flight. The assistant is the site's live instrument, so its sparkle glyph and its door ("Ask the assistant") also carry amber. Contrast on stock is 9.3:1.
- **Amber Hover** (`{colors.amber-hover}`): the accent's hover step. **Amber Ink** (`{colors.amber-ink}`) is the text colour on an amber fill (the skip link).
- The accent can be swapped from the command palette (Theme) to a purple (`hsl(271 91% 74%)`) or, by unlock only, a phosphor green (`hsl(145 72% 50%)`). A swap replaces only the accent and its focus ring; every rule below applies to whichever accent is active.

### Neutral
- **Black Stock** (`{colors.stock}`, about #0A0A0A): the page. Also the hero surface, so the first screen and the dive's last frame are the same black the next section starts on.
- **Ink** (`{colors.ink}`, about #F1F1EF): titles, ledes, links, active states, the ink button's fill. 17.5:1 on stock.
- **Plate Backing** (`{colors.plate}`, about #101011): one step off the stock, behind a screenshot while it loads or where its aspect leaves room. Never a card.
- **Popover** (`{colors.popover}`): floating layers only (command palette, assistant dock, compare dock, toasts, tooltips).
- **Muted Surface** (`{colors.muted-surface}`): code wells and the rare filled inset.
- **Caption Grey** (`{colors.caption-grey}`, about #8A8A8E): running text, captions, table heads, inactive nav. 5.8:1 on stock, 5.5:1 on a plate.
- **Quiet Grey** (`{colors.quiet-grey}`, about #7E7E81): folios, placeholders, secondary hints. 4.9:1 on stock, 4.7:1 on a plate. The floor for anything that is content.
- **Ghost Grey** (`{colors.ghost-grey}`): text that has not happened yet (the prompt's self-typing example and tab completion, both aria-hidden) and separator dots. About 3.4:1; never content.
- **Hairline** (`{colors.hairline}`, about #202022): the page's rule. Section rules, index row rules, caption-strip dividers, kbd outlines, scrollbars.
- **Strong Rule** (`{colors.rule-strong}`): a rule that has to be seen: a field's underline, a hovered row, the line button's outline, design-stage dashed rules.

### Status
- **Status OK** (`{colors.status-ok}`): a true, standing fact: online, deployed, available. The small square live dot beside "Open to new roles and projects", a live project's status, a sent message.
- **Status Warn** (`{colors.status-warn}`): caution, set yellower than the amber so a warning never reads as a highlight (the message-length counter near its limit).
- **Status Error** (`{colors.status-error}`): field errors and failed sends.

### Named Rules
**The Live Amber Rule.** Amber appears only where something is live or active at this moment, or on the assistant's door. It never decorates a heading, a border at rest, a tag or a background fill.

**The Quiet Floor Rule.** Quiet Grey is the dimmest colour any content may take. To make text quieter, use Quiet Grey or a smaller size, never an alpha on a grey.

**The Status Is Meaning Rule.** Status colours are independent of the accent and survive an accent swap. A live project gets a green square and the word "Live"; it does not get amber.

## Typography

**Display Font:** Archivo, set expanded at 118% width (with Inter, system-ui fallback)
**Body Font:** Inter (with system-ui, -apple-system fallback), features cv11 and ss01
**Label/Mono Font:** JetBrains Mono (with Menlo, Consolas fallback)

**Character:** A wide, assured grotesque for every title against a neutral, highly legible reading sans; the monospace appears only where something is literally typed or measured. All three are self-hosted (variable Archivo with a 62 to 125% width axis; Inter 300 to 700; JetBrains Mono 400 and 500).

### Hierarchy
The type is organised as four voices. A component picks a voice; it does not assemble one from utilities.

1. **The title voice** (Archivo, expanded):
   - **Display** (560, `clamp(2.75rem, 1.1rem + 5.6vw, 6rem)`, 0.94, -0.035em): the name on a title page, a case study's title, the Contact title, the 404 title, the page-turn label.
   - **Headline** (540, `clamp(2.125rem, 1.25rem + 2.9vw, 4rem)`, 1, -0.03em): a section's title ("Selected systems", "Career").
   - **Title** (560, `clamp(1.375rem, 1.1rem + 0.9vw, 1.875rem)`, 1.1, -0.02em): a plate's or a block's title.
   - **Subhead** (560, 1.0625rem, 1.25, -0.01em, width 112%): index row titles, small heads, the running-head name.
   - **Identity** (560, 1.375rem on phones, 1.625rem from sm, 1.875rem from lg, 1.1, -0.02em): the hero's h1 only, name and title at one size, held small so the prompt stays the thing in the middle.
2. **The reading voice** (Inter):
   - **Lede** (400, `clamp(1.125rem, 1rem + 0.45vw, 1.375rem)`, 1.5, -0.011em): a section's opening paragraph, set in ink because it is read.
   - **Body** (400, 1rem, 1.7): running text in Caption Grey, measure held at 30 to 60ch.
   - **Label** (500, 0.9375rem, -0.006em): button text.
3. **The caption voice** (Inter, small):
   - **Caption** (400, 0.8125rem, 1.55): under a plate, beside a figure, in a table head, in tier sub-heads.
   - **Folio** (400, 0.8125rem, 1, tabular figures, Quiet Grey): index numbers and counts. Never tracked out.
4. **The figure voice** (JetBrains Mono):
   - **Figure** (400, tabular, -0.02em): a measured value (a count, a duration, a latency, a web-vital).
   - **Terminal** (400, 16px on phones, 17px from md): the hero prompt line; scrollback at 12 to 13px with 2.0 leading; the build SHA at 11px.

Headings use `text-wrap: balance`; paragraphs, list items and captions use `text-wrap: pretty`. Tables and counters use tabular figures.

### Named Rules
**The Four Voices Rule.** Title, reading, caption, figure. Nothing else. No eyebrows, no kickers, no tracked uppercase labels above headings.

**The Mono Is A Measurement Rule.** JetBrains Mono is used only for the terminal, code, and measured figures. It is never a costume for headings, labels or navigation.

**The Outline Means Unbuilt Rule.** Design-stage work sets its title in a 1px Caption Grey outline (transparent fill) at title sizes from md up, so a blueprint never reads as something running. Below about 15px, or on phones, it falls back to solid Caption Grey; under forced colours it falls back to solid CanvasText. Built work is always set solid.

## Layout

The page is one measure with one left edge. Every section and the running head share a horizontal page margin (`{spacing.page-x-sm}` on phones, `{spacing.page-x-md}` from 768px, `{spacing.page-x-lg}` from 1280px) inside a centred container capped at `{spacing.page-max}`, so every left edge on the site lands on the same line.

Sections breathe asymmetrically: more air above a title than inside it (`{spacing.section-top}` above, `{spacing.section-bottom}` below). A section opens with a hairline drawn across the full measure (an optional quiet aside, such as a count, sits at its right end), then a 12-column grid with `{spacing.gutter}` gutters: the title in the first five or six columns, the lede from column 8. The title sits 2.5rem (3.5rem from md) below the opening rule.

The flagship plates run as alternating spreads on the 12-column grid: the plate across eight columns, the caption column across four, mirrored on every other plate, with `{spacing.plate-run}` (7rem on phones) between spreads. Below lg each spread stacks plate over caption. The full index is a table of ruled rows (folio, title and summary, status, built with, depth, year, arrow) that collapses to folio, title and status on phones.

The navigation is a running head at the top from md up (64px, hidden over the hero, steps away while reading down and returns on the first scroll up). Below md it becomes a fixed bottom bar, max 400px wide, with 48px-tall section targets.

Breakpoints follow Tailwind's defaults (640, 768, 1024, 1280px); a 360px threshold handles the smallest phones (the Home target steps aside so the other four section names fit whole).

### Named Rules
**The One Left Edge Rule.** Every section and the running head use the shared page margin and page-max container. Nothing invents its own side padding.

## Elevation & Depth

The page is flat. Depth on the page comes from tone (plate backing one step off the stock), from hairlines, and from scale. Shadows exist only on layers that genuinely float above the page: the command palette, the assistant dock, the compare dock, the mobile bottom bar, toasts, the selection-ask pill, and the index row's hover preview. Each floating shadow is paired with a 1px hairline ring so the layer's edge is drawn, not implied.

### Shadow Vocabulary
- **Floating, small** (`box-shadow: 0 0 0 1px hsl(240 3% 13%), 0 18px 48px -16px rgba(0,0,0,0.8)`): the mobile bottom bar, toasts, small popovers.
- **Floating, large** (`box-shadow: 0 0 0 1px hsl(240 3% 13%), 0 32px 80px -24px rgba(0,0,0,0.85)`): the command palette and full-screen dialogs.
- **Dock edge** (`box-shadow: -1px 0 0 hsl(240 3% 13%), -32px 0 80px -32px rgba(0,0,0,0.85)`): the assistant dock on its side of the screen (a top edge on phones).
- **Running head base** (`box-shadow: inset 0 -1px 0 hsl(240 3% 13%)`): the scrolled running head's bottom hairline over a 90% stock with backdrop blur.

The hero alone keeps two lights tied to state: an amber halo under the prompt while it is focused, and the assistant's rotating amber border with a soft bloom while Ask mode is open (it winds up while a question is in flight). Both belong to the hero instrument; they are not part of the page's vocabulary.

### Named Rules
**The Floating-Only Shadow Rule.** If it scrolls with the page, it has no shadow. Shadows mark layers that sit above the page, and every one is paired with a hairline ring.

## Shapes

Everything is square: buttons, plates, fields, dialogs, kbd keys, toasts, live dots (`{rounded.none}`). The only round marks on the site are the assistant's three thinking dots and the send button's spinner. Borders are 1px hairlines, drawn as inset box-shadows on buttons and keys so they never shift layout. Fields are a single bottom rule, not a box. Design-stage work is set apart by a dashed rule and a dashed hairline plate frame.

### Named Rules
**The Square Plate Rule.** Radius is 0 everywhere. A rounded corner reads as a different product.

**The Rule Not Box Rule.** Separate with a hairline across the measure, not with a bordered panel. A container gets a full outline only when it is a control (a line button, a kbd key, the terminal instrument, a phone action tile).

## Components

### Buttons
Ink on stock, square, set in the reading face. Two variants, and the arrow is the only thing that moves.
- **Shape:** square (0px).
- **Ink button** (primary): ink fill, stock text, Label voice, 12px by 20px padding, 10px gap to its icon. Hover lifts the fill to paper white; press scales to 0.98. Used once per decision: send the message, the 404's "Back to the home page", the error page's reload, the Contact section's "Describe your project".
- **Line button** (secondary): transparent, ink text, a 1px Strong Rule outline that turns ink on hover; press scales to 0.98.
- **Disabled:** 45% opacity, not-allowed cursor, no press.
- **Nudge:** an arrow inside a link or button moves 3px right on hover or focus (0.35s on the house ease); an outbound arrow moves 2px up-right.

### Links
- **Ink link:** ink text over a Strong Rule hairline; on hover or focus the underline is drawn in ink from the left over 0.5s.
- **Drawn link:** the same drawn underline for text inside a larger control, triggered by the control's hover or focus.
- **Quiet link:** Caption Grey until pointed at, then ink.

### Keyboard keys
A key is a 22px hairline square in the 11px reading face, Caption Grey: ⌘K, ⌘J, Esc, Tab, ↑, ↵. Shown only where a pointer and keyboard are likely (md up).

### Inputs / Fields
- **Style:** no box. Transparent background, ink text at 16px (17px from md), 12px vertical padding, a single bottom rule in Strong Rule. The label is a caption above it.
- **Hover / Focus:** the rule turns Caption Grey on hover and ink on focus; the caret is amber.
- **Error:** the rule and the inline message turn Status Error; the message sits in the label line, right-aligned.
- **Choice:** a radio group set as text options with an ink hairline under the selected one, not as chips.

### Navigation
- **Running head (md up):** the mark and the name (Subhead voice, 14px, width 112%) on the left; section links in 13px Caption Grey that turn ink on hover; the current section carries a Strong Rule hairline that fills with amber as the reader progresses through it; then a hairline divider, the amber-sparkle Ask button and the ⌘K keys.
- **Bottom bar (below md):** a fixed 400px bar on 95% stock with backdrop blur and a hairline ring; 48px-tall section targets, an amber hairline on top of the active one; Ask and search as square icon targets on the right.

### Plates
A screenshot or diagram is mounted as a plate: square, on the Plate Backing, 16:10 by default (a share card keeps its own 40:21). The image is held at 108% and settles to 100% as the plate is uncovered; on hover a linked plate's image scales to 102% over 1.2s and a square ink-on-stock arrow tile appears in its top-right corner. A plate always has a caption column or caption line: folio, title, one line of what it is, a definition list of facts (Status, Year, Built with, Depth) on hairline rows, then two ways in ("Read the case study" with a drawn underline, and "Ask about this").

### Index rows
The full body of work as a numbered list on hairline rules: a Quiet Grey folio, the title in the Subhead voice with a one-line summary in Caption, the status as a word (a green square only when live), stack, depth and year in 13px tabular Caption Grey that turn ink on row hover, and an arrow that nudges. Rows filter and rerank in place, keeping their identity. Tiers are separated by quiet sub-heads (name in ink caption, count as a folio), not banners. Design-stage rows sit under a dashed Strong Rule.

### Floating layers
The command palette (640px, query in the title face), the assistant dock (460px side sheet on desktop, 88dvh bottom sheet on phones), the compare dock and toasts: popover surface, square, hairline ring plus a floating shadow. They are the only places a shadow appears.

### The Hero (signature)
The first viewport is a fixed composition. These placements are user-confirmed and binding:
- **Terminal always centre.** The identity block and the terminal instrument share one centred column (max 56rem; the terminal, its output and the Ask suggestions keep 42rem inside it), vertically centred in the space between the top bar and the baseline. Nothing else competes for the middle of the screen; a soft dark pool sits behind the column so text never lands on disk light or a bright star.
- **Black hole bottom-right.** The ray-traced event horizon rises out of the bottom-right corner (centre at 92% across and 98% down, radius 31% of the screen, the disk rolled to a cinematic diagonal), at 72% opacity at rest, feathered into the stock by a radial mask. One shared position drives the shader, the mask and the starfield, so they never drift apart.
- **Identity block: one title line, then the whereabouts.** "Emmanuel Moghalu | Software & Data Engineer" is one line in the Identity voice at one size, the name in Ink and the title in Caption Grey with a Strong Rule hairline between them (from lg; below that the two halves stack at the same size). Then "Abuja, Nigeria · UTC+1 · Open to new roles and projects" in 13px, the availability in ink behind a green live square. The block folds away (height and opacity, text kept in the DOM) once the shell is in use.
- **The instrument.** A hairline-framed panel on 85% stock: a 40px caption strip (status square, the session name in 11.5px mono, the Shell/Ask switch with an amber underline under the live mode), the prompt line in the Terminal voice with an amber `~ $` and a stepped block caret, and a key strip of kbd hints. Focus raises the frame to Strong Rule with the amber halo; Ask mode replaces the frame with the rotating amber border.
- **Four actions below.** Ask the assistant (amber, with its sparkle), See the work, Download CV, Get in touch: dot-separated text with drawn underlines from md up, bordered square tap tiles on phones.
- **The edges.** Top: the amber mark and "E·MC", section links, Ask, ⌘K. Bottom: socials; a derived proof line at the centre from lg (systems built, live now, written up in full, numbers in the Figure voice); a Scroll cue whose hairline carries a travelling amber light; the Abuja clock behind a green live square; the build SHA in 11px mono.
- **The sky.** A faint, deterministic starfield at three depths in starlight tints (never accent), each star on a slow twinkle, a rare scintillation every couple of seconds and a faint meteor every 15 to 35 seconds, never over the prompt; thinned behind the prompt and around the hole; a few pixels of pointer parallax by depth. Under reduced motion it draws one still frame.

### Motion
The motion grammar is print gestures plus one authored moment. All entrances use one ease, `cubic-bezier(0.16, 1, 0.3, 1)` (fast out of the gate, long soft landing), run once when an element is 12% above the bottom edge, and never replay. Content is in the DOM from the start; only paint is staged.
- **RevealText:** a title rises into place word by word from behind its own baseline (each word 105% to 0 over 0.95s, 45ms stagger).
- **Reveal:** a block settles 14px up and in over 0.9s. Arrival, not flight.
- **Rule:** a hairline draws itself across the measure, left to right, over 1.4s.
- **Plate:** a clip-path wipe uncovers the plate top to bottom over 1.25s on `cubic-bezier(0.77, 0, 0.18, 1)` while the picture settles from 108% over 1.6s.
- **Smooth scroll (Lenis):** wheel and trackpad only, exponential settle (lerp 0.11); touch stays native; nested scroll areas scroll themselves; paused while an overlay locks the page.
- **The section veil (page turn):** a jump of more than 1.4 screens is a page turn, not a long scroll. The stock wipes up over the screen (380ms) with the destination's name in the Display voice and an amber hairline drawn under it, the page moves while covered (160ms hold), and the stock lifts away upwards (520ms). Shorter hops keep the smooth scroll.
- **The hero dive (the one authored moment):** scroll-driven and reversible. The hero pins for 0.7 screens: the edges fade first, the prompt softens where it stands, the hole zooms in the shader (a dolly zoom from 30 to about 5 Schwarzschild radii) until its shadow is the screen and deepens to the page's black. The next section, pinned for 0.45 screens, then grows out of the centre of the dark (scale 0.9 to 1 with opacity, eased out). Both pins are CSS sticky; script drives only opacity and scale.
- **Shared elements:** a plate's picture and title travel into the case study as a view transition (380ms on the house ease; the page cross-fades in 200ms underneath).
- **State:** live squares pulse on a 2s cycle; the terminal caret blinks stepped at 1.06s; the assistant's tool steps land 4px from the left in 180ms.

### Named Rules
**The One Movement Rule.** A button moves only by its arrow's nudge and a 0.98 press. Nothing lifts, glows or bounces on hover.

**The One Authored Moment Rule.** The hero dive is the site's only cinematic motion. Every other motion is a print gesture: a rule drawn, a line risen, a plate uncovered, a page turned.

**The Still Means Still Rule.** Under reduced motion every entrance renders its final state with no transition at all (not a faster one), Lenis is not mounted, the veil and the dive do not run, the hero is an ordinary first screen, the black hole and the starfield each render one still frame, and marquees become wrapped static lists.

## Do's and Don'ts

### Do:
- **Do** use amber only for live or active state: focus, caret, a running command, the assistant thinking, the current-section meter, the page-turn hairline, the assistant's door.
- **Do** separate content with 1px hairlines (`{colors.hairline}`) drawn across the measure, and use Strong Rule (`{colors.rule-strong}`) where a rule must be seen.
- **Do** set every title in Archivo at 118% width in one of the title-voice steps, every paragraph in Inter, and reserve JetBrains Mono for the terminal, code and measured figures.
- **Do** mount images as square plates with a caption, and set built work solid and design-stage work in hairline outline under a dashed rule.
- **Do** use the shared page margin, the 1440px page-max and the section rhythm (`{spacing.section-top}` above, `{spacing.section-bottom}` below) for every section.
- **Do** enter with RevealText, Reveal, Plate and Rule only, once, on the house ease.
- **Do** keep the hero's composition: terminal always at the centre, the black hole rising from the bottom-right corner, the identity block above the instrument: name and title on one line, then the whereabouts line (user-confirmed).
- **Do** keep text at or above Quiet Grey (4.9:1 on stock, 4.7:1 on a plate); Ghost Grey is only for aria-hidden, not-yet-typed text and separators.
- **Do** give every primary control on a coarse pointer a minimum 44px height, and every control a visible 2px amber focus outline with a 2px offset.
- **Do** honour reduced motion with no transition at all, including the WebGL hero.
- **Do** write in plain English and sentence case, and derive or attribute every figure on the page.

### Don't:
- **Don't** use amber for decoration: no amber headings, resting borders, tags, fills or gradients.
- **Don't** build boxed panels, cards, chips, bento grids or glowing surfaces; the monograph separates with rules and space.
- **Don't** round a corner. Radius is 0px.
- **Don't** set tracked uppercase eyebrows or kickers above headings, and don't use monospace as a costume for labels or navigation.
- **Don't** put a shadow on anything that scrolls with the page; shadows belong to floating layers only.
- **Don't** make text quieter with an alpha on a grey; use Quiet Grey or a smaller size.
- **Don't** add a second cinematic motion; the hero dive is the only one.
- **Don't** move the black hole back to the centre or push the terminal off the centre of the first screen (user-confirmed).
- **Don't** use em-dashes in visible copy (user-confirmed).
- **Don't** fabricate testimonials, client logos, press or figures.
