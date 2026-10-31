import { readFileSync } from "node:fs";
import { decide, type PrState } from "./router.ts";
import { loadConfig, matchedPatterns } from "./config.ts";
import { askJev } from "./jev.ts";

interface GhFile {
  filename: string;
  additions: number;
  deletions: number;
}

async function ghApi(path: string, token: string, method = "GET", body?: unknown): Promise<Response> {
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
// Defaults to OpenCode's free Jev serving; set JEV_BASE_URL/JEV_MODEL to use
// TypeSafe direct instead.
async function main(): Promise<void> {
  const eventPath = process.env["GITHUB_EVENT_PATH"];
  const token = process.env["GITHUB_TOKEN"];
  const apiKey = process.env["TYPESAFE_API_KEY"];
  if (!eventPath || !token || !apiKey) throw new Error("missing event payload, GITHUB_TOKEN, or API key");
  const event = JSON.parse(readFileSync(eventPath, "utf8")) as {
    number: number;
    pull_request: { title: string; body: string | null };
    repository: { full_name: string };
  };
  const [owner, repo] = event.repository.full_name.split("/");
  const pr = event.number;

  const publish = async (label: string, reason: string): Promise<void> => {
    await ghApi(`/repos/${owner}/${repo}/issues/${pr}/labels`, token, "POST", { labels: [label] });
    const other = label === "ready-for-human" ? "ready-for-agent" : "ready-for-human";
    await ghApi(`/repos/${owner}/${repo}/issues/${pr}/labels/${other}`, token, "DELETE");
    await ghApi(`/repos/${owner}/${repo}/issues/${pr}/comments`, token, "POST", {
      body: `Jev router: \`${label}\` — ${reason}`,
    });
    const assignee = process.env["JEV_ASSIGNEE"];
    if (label === "ready-for-human" && assignee) {
      await ghApi(`/repos/${owner}/${repo}/issues/${pr}/assignees`, token, "POST", {
        assignees: [assignee],
      });
    }
    if (label === "ready-for-agent") {
      await ghApi(`/repos/${owner}/${repo}/pulls/${pr}/reviews`, token, "POST", {
        event: "APPROVE",
        body: `Jev router approved: ${reason}`,
      });
    }
  };

  try {
    const filesRes = await ghApi(`/repos/${owner}/${repo}/pulls/${pr}/files?per_page=100`, token);
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
      {
        apiKey,
        baseUrl: process.env["JEV_BASE_URL"] ?? "https://api.typesafe.ai",
        model: process.env["JEV_MODEL"] ?? "jev-latest",
      },
    );
    const verdict = decide(state, jev);
    await publish(verdict.label, verdict.reason);
  } catch (err) {
    // Fail-closed: any router failure still lands a needs-human label.
    await publish("ready-for-human", `needs-human (router error: ${(err as Error).message})`);
    throw err;
  }
}

await main();
