import type { JevAnswer, PrState } from "./router.ts";

export interface JevOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

const QUESTIONS = {
  route: {
    type: "choice",
    instructions: "Does this pull request need human review before merge?",
    criteria: {
      "agent-sufficient": "May proceed on agent review alone; low review risk.",
      "needs-human": "Requires human review before merge; notable review risk.",
    },
  },
  risk: {
    type: "score",
    instructions: "How high is the review risk if this merges without human review?",
    criteria: ["Low", "Elevated", "High", "Severe"],
  },
  "touches-migration": {
    type: "noul",
    instructions: "Does this pull request touch database migrations or schema?",
  },
  "touches-auth-permissions": {
    type: "noul",
    instructions: "Does this pull request touch authentication, authorization, or permissions?",
  },
  "touches-dependencies": {
    type: "noul",
    instructions: "Does this pull request touch dependencies, lockfiles, or package manifests?",
  },
} as const;

// Raw score levels are 0..3; mapped to the spec risk scale 2..5.
function toRisk(raw: number): number {
  return Math.min(5, Math.max(2, Math.round(raw) + 2));
}

// Any transport or shape problem returns null; decide() fails closed to needs-human.
export async function askJev(state: PrState, opts: JevOptions): Promise<JevAnswer | null> {
  try {
    const res = await (opts.fetchImpl ?? fetch)(
      `${opts.baseUrl ?? "https://api.typesafe.ai"}/v1/systemone`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({ model: opts.model ?? "jev-latest", state, questions: QUESTIONS }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      answers?: Record<string, Record<string, unknown>>;
    };
    const answers = data.answers;
    if (!answers) return null;
    const route = answers["route"];
    const risk = answers["risk"];
    if (route?.["choice"] !== "agent-sufficient" && route?.["choice"] !== "needs-human") return null;
    const probs = (route?.["probabilities"] as Record<string, number> | undefined) ?? {};
    const p = probs[route["choice"] as string] ?? (route?.["confidence"] as number | undefined);
    if (typeof p !== "number" || typeof risk?.["score"] !== "number") return null;
    const detectors: Record<string, boolean> = {};
    for (const key of ["touches-migration", "touches-auth-permissions", "touches-dependencies"]) {
      const n = answers[key]?.["noul"];
      if (typeof n === "number") detectors[key] = n >= 0.5;
    }
    return { choice: route["choice"] as JevAnswer["choice"], p, risk: toRisk(risk["score"] as number), detectors };
  } catch {
    return null;
  }
}
