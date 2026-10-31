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
}

export interface Verdict {
  label: "ready-for-agent" | "ready-for-human";
  reason: string;
}

// Thresholds from spec: P(needs-human) >= 0.5 or risk >= 4 routes to human.
export function decide(state: PrState, jev: JevAnswer | null): Verdict {
  void state;
  if (jev === null || jev.p < 0.5) {
    const why = jev === null ? "no Jev answer" : `uncertain p=${jev.p}`;
    return { label: "ready-for-human", reason: `needs-human (fallback: ${why})` };
  }
  if (jev.choice === "needs-human" || jev.risk >= 4) {
    return { label: "ready-for-human", reason: `needs-human p=${jev.p} risk=${jev.risk}` };
  }
  const fired = Object.keys(jev.detectors).filter((k) => jev.detectors[k]);
  if (fired.length > 0) {
    return {
      label: "ready-for-human",
      reason: `needs-human p=${jev.p} risk=${jev.risk} (${fired.join(", ")})`,
    };
  }
  return { label: "ready-for-agent", reason: `agent-sufficient p=${jev.p} risk=${jev.risk}` };
}
