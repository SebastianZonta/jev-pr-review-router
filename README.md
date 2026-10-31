# jev-pr-review-router

Advisory PR router: Jev decides `ready-for-human` vs `ready-for-agent` and posts a label + one-line comment. Never blocks merge; failures route human.

## Where the API key goes

| Serving | Secret | Vars | Get a key |
|---|---|---|---|
| OpenCode free (default, `jev-1.13-free`) | `OPENCODE_API_KEY` | — | https://opencode.ai/console |
| TypeSafe direct (paid, `jev-latest`) | `TYPESAFE_API_KEY` | `JEV_BASE_URL=https://api.typesafe.ai`, `JEV_MODEL=jev-latest` | https://console.typesafe.ai/keys |

```bash
gh secret set OPENCODE_API_KEY --repo <owner>/<repo>   # value prompt is hidden
```

See `.github/workflows/pr-review-router.yml` (env block) for the placeholders.

## Local test

```bash
JEV_API_KEY=<key> npm run smoke                       # TypeSafe direct
JEV_API_KEY=<key> JEV_BASE_URL=https://opencode.ai/inference/systemone JEV_MODEL=jev-1.13-free npm run smoke
npm test && npm run typecheck
```

## Tune

`jev-review.yml` lists paths that force `needs-human`. Edit it in a PR.
