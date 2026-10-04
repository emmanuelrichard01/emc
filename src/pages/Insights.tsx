import { useEffect, useMemo, useState } from "react";

import SEOHead from "@/components/SEOHead";

/* ==========================================================================
   INSIGHTS (private)

   Questions visitors asked that the site could not answer: what the
   assistant had to say "not covered" to, what found nothing in a search,
   and what went unanswered because no model was available. It is the list
   of what to write next. Stored without identities (api/insights.ts).

   Not linked from anywhere, not indexed. Opened with a private link of the
   form /insights#token=…: the token is read once from the fragment (which
   never reaches a server log), kept for this tab only, and removed from the
   address bar so it is not left on screen or in a screenshot.

   Expected response from GET /api/insights (Authorization: Bearer <token>):
     { items: [{ question, reason, count, lastAt }], since? }
   where reason is "not-covered" | "no-results" | "unavailable" and lastAt
   is an ISO date or epoch milliseconds. Read tolerantly.
   ========================================================================== */

const TOKEN_KEY = "emc-insights-token";

interface Row {
  question: string;
  reason: string;
  count: number;
  lastAt: number | null;
}

type Load =
  | { state: "loading" }
  | { state: "no-token" }
  | { state: "denied" }
  | { state: "error"; message: string }
  | { state: "ready"; rows: Row[]; since: string | null };

const REASONS: Record<string, string> = {
  "not-covered": "Not covered by the site",
  "no-results": "No search results",
  unavailable: "Models unavailable",
};

function readToken(): string | null {
  const match = window.location.hash.match(/token=([^&]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked: the token still works for this load */
    }
    // Off the address bar, out of history.
    history.replaceState(null, "", window.location.pathname + window.location.search);
    return token;
  }
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function toRow(raw: unknown): Row | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const question = typeof r.question === "string" ? r.question : typeof r.text === "string" ? r.text : "";
  if (!question) return null;
  const at = r.lastAt ?? r.last ?? r.at;
  const lastAt = typeof at === "number" ? at : typeof at === "string" && !Number.isNaN(Date.parse(at)) ? Date.parse(at) : null;
  return {
    question,
    reason: typeof r.reason === "string" ? r.reason : typeof r.why === "string" ? r.why : "",
    count: typeof r.count === "number" ? r.count : 1,
    lastAt,
  };
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Insights() {
  // Read once, on first render: from the link fragment, or from this tab.
  const [token] = useState(readToken);
  const [load, setLoad] = useState<Load>(() => (token ? { state: "loading" } : { state: "no-token" }));

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/insights", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (response.status === 401 || response.status === 403) {
          setLoad({ state: "denied" });
          return;
        }
        if (!response.ok) {
          setLoad({ state: "error", message: `The insights endpoint answered ${response.status}.` });
          return;
        }
        const data = (await response.json()) as { items?: unknown[]; since?: unknown };
        const rows = (data.items ?? []).map(toRow).filter((r): r is Row => r !== null);
        setLoad({ state: "ready", rows, since: typeof data.since === "string" ? data.since : null });
      } catch {
        if (!controller.signal.aborted) setLoad({ state: "error", message: "Could not reach the insights endpoint." });
      }
    })();
    return () => controller.abort();
  }, [token]);

  const rows = useMemo(
    () => (load.state === "ready" ? [...load.rows].sort((a, b) => b.count - a.count || (b.lastAt ?? 0) - (a.lastAt ?? 0)) : []),
    [load]
  );
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="min-h-dvh pt-28 md:pt-36 pb-24 bg-background">
      <SEOHead
        metadata={{ title: "Insights | Emmanuel Moghalu", description: "Private: questions the site could not answer.", robots: "noindex, nofollow" }}
      />
      <div className="page-x">
        <div className="page-max">
          <p className="t-caption">Private</p>
          <h1 className="mt-2 t-title text-foreground">Questions the site could not answer</h1>
          <p className="mt-6 t-lede text-muted-foreground max-w-[54ch]">
            What visitors asked the assistant that it had no answer for. Stored without names, addresses or anything else that identifies
            them. The most asked come first: each one is a gap in the write-ups.
          </p>

          <div className="mt-14" aria-live="polite">
            {load.state === "loading" && <p className="t-caption">Loading</p>}
            {(load.state === "no-token" || load.state === "denied") && (
              <p className="text-[15px] text-foreground">This page needs the private link.</p>
            )}
            {load.state === "error" && <p className="text-[15px] text-foreground">{load.message}</p>}
            {load.state === "ready" && (
              <>
                <p className="t-caption tabular-nums">
                  {rows.length} {rows.length === 1 ? "question" : "questions"}, asked {total} {total === 1 ? "time" : "times"}
                  {load.since ? `, since ${load.since}` : ""}
                </p>
                {rows.length === 0 ? (
                  <p className="mt-8 text-[15px] text-foreground">Nothing yet. Questions the site could not answer will appear here.</p>
                ) : (
                  <div className="mt-6 overflow-x-auto" data-lenis-prevent>
                    <table className="w-full min-w-[40rem] text-left border-b border-border">
                      <thead>
                        <tr className="border-b border-border">
                          <th scope="col" className="py-3 pr-6 t-caption font-normal">Question</th>
                          <th scope="col" className="py-3 pr-6 t-caption font-normal">Why</th>
                          <th scope="col" className="py-3 pr-6 t-caption font-normal text-right">Times asked</th>
                          <th scope="col" className="py-3 t-caption font-normal text-right">Last asked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={`${row.question}-${i}`} className="border-t border-border align-baseline">
                            <td className="py-4 pr-6 text-[15px] leading-[1.5] text-foreground max-w-[36rem]">{row.question}</td>
                            <td className="py-4 pr-6 text-[13px] text-muted-foreground whitespace-nowrap">{REASONS[row.reason] ?? (row.reason || "Unknown")}</td>
                            <td className="py-4 pr-6 t-figure text-[14px] text-foreground text-right">{row.count}</td>
                            <td className="py-4 text-[13px] text-muted-foreground text-right whitespace-nowrap tabular-nums">
                              {row.lastAt ? dateFormat.format(row.lastAt) : "Unknown"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
