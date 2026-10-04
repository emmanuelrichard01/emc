// Relative imports only: api/command.ts bundles this module.

/* ==========================================================================
   SHELL MANUAL — the contract between the terminal and /api/command

   `? show me everything using kafka` sends the visitor's words to
   /api/command, which asks the model to propose ONE command line that this
   shell can actually run. The model is given COMMAND_REFERENCE (below) as
   the only commands, paths and flags that exist; the client then parses the
   proposal with the real parser and offers it only if it would run.

   The shell agent keeps COMMAND_REFERENCE in step with the registry (a test
   checks every registered command appears in it).

   Wire:
     POST /api/command  { text: string (<= 300 chars), cwd: string }
       → 200 { command: string, why: string }   one runnable line + one sentence
       → 200 { error: string }                   when nothing fits
   ========================================================================== */

export interface CommandSuggestion {
  /** One line, e.g. `ls /projects --stack=kafka | head 3`. */
  command: string;
  /** One plain sentence: what it will show. */
  why: string;
}

/**
 * Every command, its usage and flags, and the filesystem layout, as plain
 * text for a model to read. Command lines start at the left margin (the
 * server reads the first word of each as a command name); prose lines start
 * with a capital or a symbol, so they are never mistaken for one. The
 * locked query commands are indented past that margin on purpose: the model
 * is told they exist so it does not invent them, and the server will not
 * accept them.
 */
export const COMMAND_REFERENCE = `SYNTAX
Words split on spaces; quote text with spaces ('like this'). Flags: -l, --flag, --key=value.
Pipe output into another command with |. Run one command after another with && (it stops at the first failure).
Home (~) is the root (/). Paths may be absolute (/projects), relative (../career) or start with ~.
The current directory is given with each request; relative paths start there.

FILESYSTEM
  /projects/<id>/          One directory per project. Which files exist varies:
        readme             title, status, metrics, description (every project)
        problem  approach  outcome  tradeoffs  debugging  notice   (projects with a case study)
        stack              one technology per line (every project)
        code/<file>        source excerpts, e.g. /projects/mmr-engine/code/matching.py
  /career/<role-id>/       role  highlights  stack
  /about/                  principles  stack
  /contact                 how to get in touch
Project ids: vega-canva mmr-engine logistics-watchtower modern-warehouse medvax ultra-news caritas-scholar global-rate-limiter cloud-bill-hunter crypto-pipeline evanty cbn-data-residency smart-meter-telemetry
Role ids: mercor medvax setraco freelance tac-africa afrihub notap
Tiers: flagship production system design

COMMANDS (usage, then what it does)
Navigate:
pwd                                   print the working directory
cd [dir]                              change directory; cd .. goes up, cd - goes back, a project id works from anywhere
ls [-l] [path]                        list a directory; in /projects a table of id, tier, status, title
ls /projects --stack=<tech>[,<tech>] --tier=<tier>   projects using every given technology, of one tier
tree [-L depth] [path]                draw a directory as a tree
open <id|path|.>                      open a case study on the page (a file opens it at that section; a role opens it in the career list)
open /projects --stack=<tech> --tier=<tier>   open the Work index on the page, filtered
about                                 scroll to the about section
projects                              scroll to the work section
experience                            scroll to the career section
contact                               scroll to the contact section

Read:
cat <file|project-id>                 print a file; a project id prints its readme
whoami                                a card: role, location, live counts, stack
stack                                 the core tech stack
history                               recent commands
man <command>                         the manual page for a command
help [topic]                          commands grouped by topic (navigate, read, search, ask, site)
echo <text>                           print text

Search:
find [path] [-name <glob>] [--grep=<text>] [-type f|d]   find files by name or by what they contain
grep [-i] [-v] [-c] <pattern> [file]  keep matching lines (reads a pipe or a file)
head [-n N] [file]                    the first N lines
tail [-n N] [file]                    the last N lines
sort [-r] [-n] [-k column] [file]     sort lines, or a table by a named column (id, tier, status, title; with ls -l also year, tradeoffs)
uniq [-c] [file]                      drop repeated adjacent lines
wc [-l] [-w] [-c] [file]              count lines, words, characters

Ask:
ai [question]                         ask the site's assistant in plain English
queries [n]                           prepared questions about the work, answered with SQL
fit                                   check a job description against the work
brief                                 turn a project idea into a brief
tour                                  a guided tour of the work

Site:
theme <amber|purple>                  switch the accent colour
resume                                download the CV
email                                 copy the contact address
share [command]                       copy a link that types a command for someone
build                                 the deployed commit and build time
telemetry                             explain the live status numbers
watch                                 stream live frame-rate readings until stopped
ping                                  measure latency to the site
clear                                 clear the terminal

Locked behind a hidden unlock. Never propose these:
      schema   \\d   sql   lock

EXAMPLES (request, then command)
"what uses redis?"                          ls /projects --stack=Redis
"show the design studies"                   ls /projects --tier=design
"which projects weighed the most options?"  ls -l /projects | sort -k tradeoffs -r | head -n 5
"read the mmr trade-offs"                   cat /projects/mmr-engine/tradeoffs
"show me some python"                       find / -name "*.py"
"where is idempotency mentioned?"           find /projects --grep=idempotent
"how many projects are there?"              ls /projects | wc -l
"take me to the rate limiter"               open global-rate-limiter
"what did he do at medvax?"                 cat /career/medvax/highlights
"I'm hiring a data engineer"                fit`;
