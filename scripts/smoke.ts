import { decide, type PrState } from "../src/router.ts";
import { askJev } from "../src/jev.ts";

// Usage:
//   JEV_API_KEY=... npm run smoke
// Optional: JEV_BASE_URL (default TypeSafe direct), JEV_MODEL (default jev-latest).
const state: PrState = {
  title: "Add password reset endpoint",
  description: "New POST /auth/reset-password without rate limiting yet.",
  files: ["src/auth/reset.ts", "src/auth/routes.ts"],
  additions: 120,
  deletions: 8,
  testsTouched: false,
};

const jev = await askJev(state, {
  apiKey: process.env["JEV_API_KEY"] ?? "",
  baseUrl: process.env["JEV_BASE_URL"] ?? "https://api.typesafe.ai",
  model: process.env["JEV_MODEL"] ?? "jev-latest",
});
console.log(JSON.stringify({ jev, verdict: decide(state, jev) }, null, 2));
