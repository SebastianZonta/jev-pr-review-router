export interface ReviewConfig {
  needsHumanPaths: string[];
}

// shortcut: subset parser, not full YAML — only the needs-human-paths list.
// Upgrade to a YAML dependency if the config grows beyond one list.
export function loadConfig(text: string): ReviewConfig {
  const paths: string[] = [];
  let inList = false;
  for (const line of text.split("\n")) {
    if (!inList) {
      if (/^\s*needs-human-paths\s*:\s*$/.test(line)) inList = true;
      continue;
    }
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue;
    const item = /^\s*-\s+(.+?)\s*$/.exec(line);
    if (item) {
      paths.push(item[1].replace(/^["']|["']$/g, ""));
      continue;
    }
    break;
  }
  return { needsHumanPaths: paths };
}

function globToRegExp(pattern: string): RegExp {
  const rx = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join("\0");
  const withStars = rx.replaceAll("\0\0", ".*").replaceAll("\0", "[^/]*");
  return new RegExp(`^${withStars}$`);
}

export function matchedPatterns(files: string[], config: ReviewConfig): string[] {
  const res = config.needsHumanPaths.map((p) => ({ p, rx: globToRegExp(p) }));
  return res.filter(({ rx }) => files.some((f) => rx.test(f))).map(({ p }) => p);
}
