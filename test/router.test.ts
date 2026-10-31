import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/router.ts";

const smallDocsState = {
  title: "Fix typo in README",
  description: "Typo only.",
  files: ["README.md"],
  additions: 1,
  deletions: 1,
  testsTouched: false,
};

describe("decide (review router)", () => {
  it("routes agent-sufficient with low review risk to ready-for-agent", () => {
    const verdict = decide(smallDocsState, {
      choice: "agent-sufficient",
      p: 0.91,
      risk: 2,
      detectors: {},
    });
    assert.equal(verdict.label, "ready-for-agent");
  });

  it("routes needs-human to ready-for-human", () => {
    const verdict = decide(smallDocsState, {
      choice: "needs-human",
      p: 0.83,
      risk: 4,
      detectors: {},
    });
    assert.equal(verdict.label, "ready-for-human");
  });

  it("fails closed to needs-human when Jev gives no answer", () => {
    const verdict = decide(smallDocsState, null);
    assert.equal(verdict.label, "ready-for-human");
    assert.match(verdict.reason, /fallback/i);
  });

  it("routes migration-touching changes to needs-human even when choice is agent-sufficient", () => {
    const verdict = decide(smallDocsState, {
      choice: "agent-sufficient",
      p: 0.88,
      risk: 2,
      detectors: { "touches-migration": true },
    });
    assert.equal(verdict.label, "ready-for-human");
    assert.match(verdict.reason, /migration/i);
  });

  it("routes auth-touching changes to needs-human even when choice is agent-sufficient", () => {
    const verdict = decide(smallDocsState, {
      choice: "agent-sufficient",
      p: 0.9,
      risk: 3,
      detectors: { "touches-auth-permissions": true },
    });
    assert.equal(verdict.label, "ready-for-human");
    assert.match(verdict.reason, /auth/i);
  });
});
