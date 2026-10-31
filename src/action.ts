import { readFileSync } from "node:fs";
import { decide, type PrState } from "./router.ts";
import { loadConfig, matchedPatterns } from "./config.ts";
import { askJev } from "./jev.ts";

interface GhFile {
  filename: string;
  additions: number;
  deletions: number;
}

async function gh(path: string, token: string, method = "GET", body?: unknown): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function stateText(state: PrState, flagged: string[]): string {
  return [
    `Title: ${state.title}`,
    `Description: ${state.description}`,
    `Files: ${state.files.join(", ")} (+${state.additions}/-${state.deletions})`,
    `Tests touched: ${state.testsTouched ? "yes" : "no"}`,
    `Config-flagged paths: ${flagged.length > 0 ? flagged.join(", ") : "none"}`,
  ].join("\n");
}

// Advisory-only entrypoint for the pull_request workflow. Never blocks merge:
// it labels ready-for-human / ready-for-agent and leaves a one-line comment.
async function main(): Promise<void> {
  const eventPath = process.env["GITHUB_EVENT_PATH"];
  const token = process.env["GITHUB_TOKEN"];
  const apiKey = process.env["TYPESAFE_API_KEY"];
  if (!eventPath || !token || !apiKey) throw new Error("missing GITHUB_EVENT_PATH, GITHUB_TOKEN, or TYPESAFE_API_KEY");
  const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
    number: number;
    pull_request: { title: string; body: string | null };
    repository: { full_name: string };
  };
  const [owner, repo] = event.repository.full_name.split("/");
  const pr = event.number;

  const filesRes = await gh(`/repos/${owner}/${repo}/pulls/${pr}/files?per_page=100`, token);
  if (!filesRes.ok) throw new Error(`list files failed: ${filesRes.status}`);
  const files = (await filesRes.json()) as GhFile[];
  const names = files.map((f) => f.filename);
  const state: PrState = {
    title: event.pull_request.title,
    description: event.pull_request.body ?? "",
    files: names,
    additions: files.reduce((n, f) => n + f.additions, 0),
    deletions: files.reduce((n, f) => n + f.deletions, 0),
    testsTouched: names.some((n) => /(^|\/)tests?\//.test(n) || /\.test\.[a-z]+$/.test(n)),
  };
  const workspace = process.env["GITHUB_WORKSPACE"] ?? ".";
  let configText = "needs-human-paths: []\n";
  try {
    configText = readFileSync(`${workspace}/jev-review.yml`, "utf8");
  } catch {
    // fall through with empty config
  }
  const flagged = matchedPatterns(names, loadConfig(configText));

  const jev = await askJev(
    { ...state, description: `${state.description}\n${stateText(state, flagged)}` },
    { apiKey },
  );
  const verdict = decide(state, jev);

  const label = verdict.label;
  await gh(`/repos/${owner}/${repo}/issues/${pr}/labels`, token, "POST", { labels: [label] });
  const other = label === "ready-for-human" ? "ready-for-agent" : "ready-for-human";
  await gh(`/repos/${owner}/${repo}/issues/${pr}/labels/${other}`, token, "DELETE");
  await gh(`/repos/${owner}/${repo}/issues/${pr}/comments`, token, "POST", {
    body: `Jev router: \`${label}\` — ${verdict.reason}`,
  });
}

await main();
