export interface PrState {
  title: string;
  description: string;
  files: string[];
  additions: number;
  deletions: number;
  testsTouched: boolean;
}

export interface JevAnswer {
  choice: "agent-sufficient" | "needs-human";
  p: number;
  risk: number;
  detectors: Record<string, boolean>;
  probabilities?: Record<string, number>;
}

export interface Verdict {
  label: "ready-for-human" | "ready-for-agent";
  reason: string;
}

// Routing rule (spec): needs-human when P(needs-human) >= 0.5, risk >= 4,
// any Noul detector fires, or the answer is missing/malformed. A top-pick of
// needs-human always routes human, even below 0.5 — caution over literalism.
export function decide(state: PrState, jev: JevAnswer | null): Verdict {
  void state;
  if (jev === null || (jev.choice !== "agent-sufficient" && jev.choice !== "needs-human")) {
    return { label: "ready-for-human", reason: "needs-human (fallback: no usable Jev answer)" };
  }
  const pNh =
    jev.probabilities?.["needs-human"] ?? (jev.choice === "needs-human" ? jev.p : 1 - jev.p);
  const fired = Object.keys(jev.detectors).filter((k) => jev.detectors[k]);
  if (jev.choice === "needs-human" || pNh >= 0.5 || jev.risk >= 4 || fired.length > 0) {
    const why = fired.length > 0 ? ` (${fired.join(", ")})` : "";
    return {
      label: "ready-for-human",
      reason: `needs-human P(needs-human)=${pNh.toFixed(2)} risk=${jev.risk}${why}`,
    };
  }
  return {
    label: "ready-for-agent",
    reason: `agent-sufficient P(needs-human)=${pNh.toFixed(2)} risk=${jev.risk}`,
  };
}
