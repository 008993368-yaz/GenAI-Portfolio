import { useCallback, useState } from "react";
import { profile } from "../data/profile";
import { scrollToId } from "../lib/scroller";

export interface SearchResult {
  id: string;
  label: string;
  count: number;
  ms: string;
  ok: boolean;
  query: string;
}

/**
 * Tiny keyword retriever over the profile search index. Scores a typed query
 * against each section's keywords, jumps to the best match, and returns a
 * console-style readout (match label, result count, pseudo latency).
 */
export function useSearch() {
  const [result, setResult] = useState<SearchResult | null>(null);

  const run = useCallback((raw: string) => {
    const q = raw.trim().toLowerCase();
    if (!q) {
      setResult(null);
      return;
    }
    const t0 = performance.now();
    const tokens = q.split(/\s+/).filter(Boolean);

    let best: (typeof profile.searchIndex)[number] | null = null;
    let bestScore = 0;

    for (const entry of profile.searchIndex) {
      let score = 0;
      for (const kw of entry.keywords) {
        for (const tok of tokens) {
          if (kw === tok) score += 3;
          else if (kw.includes(tok) || tok.includes(kw)) score += 1.4;
        }
      }
      if (entry.label.includes(q)) score += 2.5;
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    const ms = (performance.now() - t0 + 4 + Math.random() * 9).toFixed(0);

    if (best && bestScore > 0) {
      const count = Math.max(1, Math.round(bestScore / 1.5));
      setResult({ id: best.id, label: best.label, count, ms, ok: true, query: q });
      scrollToId(best.id);
    } else {
      setResult({ id: "", label: q, count: 0, ms, ok: false, query: q });
    }
  }, []);

  return { result, run };
}
