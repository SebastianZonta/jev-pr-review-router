# jev-pr-review-router

Advisory PR router: Jev decides `ready-for-human` vs `ready-for-agent` and posts a label + one-line comment. Never blocks merge; failures route human.

## Where the API key goes

Secret `TYPESAFE_API_KEY` (get one at https://console.typesafe.ai/keys):

```bash
gh secret set TYPESAFE_API_KEY --repo <owner>/<repo>   # value prompt is hidden
```

See `.github/workflows/pr-review-router.yml` (env block) for the placeholder.

## Local test

```bash
JEV_API_KEY=<key> npm run smoke   # TypeSafe direct, model jev-latest
npm test && npm run typecheck
```

## Tune

`jev-review.yml` lists paths that force `needs-human`. Edit it in a PR.
