import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, matchedPatterns } from "../src/config.ts";

const yml = `needs-human-paths:
  - "db/migrations/**"
  - "src/auth/**"
  - "pnpm-lock.yaml"
`;

describe("review config", () => {
  it("loads needs-human paths from jev-review.yml", () => {
    assert.deepEqual(loadConfig(yml).needsHumanPaths, [
      "db/migrations/**",
      "src/auth/**",
      "pnpm-lock.yaml",
    ]);
  });

  it("flags a migration file by config pattern", () => {
    const config = loadConfig(yml);
    assert.deepEqual(matchedPatterns(["db/migrations/001_init.sql"], config), [
      "db/migrations/**",
    ]);
  });

  it("leaves an unrelated docs change unflagged", () => {
    const config = loadConfig(yml);
    assert.deepEqual(matchedPatterns(["README.md"], config), []);
  });
});
