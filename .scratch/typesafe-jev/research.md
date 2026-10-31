# TypeSafe AI Jev — primary-source findings (2026-10-31)

## 1. What Jev is

- Jev is TypeSafe's flagship model and the first "System One model": it evaluates a `state` and returns typed answers + probabilities, never generated text. Source: https://docs.typesafe.ai/concepts/system-one
- "System One" name refers to fast, intuitive System 1 thinking (Kahneman, *Thinking, Fast and Slow*); "Jev" is named after William Stanley Jevons. Source: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- It is NOT a chat/code LLM: no replies, code, or reasoning explanations; answers are constrained to declared primitives. Source: https://docs.typesafe.ai/concepts/system-one and https://docs.typesafe.ai/introduction/coding-agents
- Training method is "Reinforcement Learning for Calibrated Decisions (RLCD)"; probabilities are calibrated across groups, not a per-answer correctness guarantee. Source: https://typesafe.ai/blog/introducing-system-one-models-and-jev and https://docs.typesafe.ai/concepts/system-one

## 2. Who makes it / official sources

- Vendor: TypeSafe AI (site: https://typesafe.ai). Founder named on launch post as Diogo Almeida (states prior OpenAI work on instruction-following/ChatGPT). Source: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- Official docs: https://docs.typesafe.ai/introduction ; API reference: https://docs.typesafe.ai/api/system-one ; launch post: https://typesafe.ai/blog/introducing-system-one-models-and-jev ; v1.14 post: https://typesafe.ai/blog/jev-1-14
- Official GitHub org: https://github.com/typesafe-ai — publishes SDKs, agent skill, eval/workflow code; does NOT publish Jev weights/training code/architecture. Verified via org listing and repos: https://github.com/typesafe-ai/typesafe-sdk-python, https://github.com/typesafe-ai/typesafe-sdk-js
- Official registries: Python `typesafe-sdk` (owner "TypeSafe AI", MIT, Python >=3.10): https://pypi.org/project/typesafe-sdk/ ; JS `@typesafe-ai/sdk` (MIT, repo typesafe-sdk-js): https://www.npmjs.com/package/@typesafe-ai/sdk
- Company claims "after two years in stealth" at Sep 15, 2026 launch. Source: https://typesafe.ai/blog/introducing-system-one-models-and-jev

## 3. Model versions, pricing, performance claims (vendor-stated)

- Current models (docs page fetched 2026-10-31): `jev-1.14.0` (released Oct 14, 2026) and `jev-1.13.0`; aliases `jev-latest` → `jev-1.14.0`, `jev-preview` → `jev-1.14.0` (no preview build at fetch time). Source: https://docs.typesafe.ai/models
- Price: $42/Btok = $0.042/Mtok input tokens; output tokens free. Source: https://docs.typesafe.ai/models
- Context: 64k per-request / 32k per-question default; opt-in 262k/262k via `TypeSafe-Danger-Zone-Long-Context: true` header (slower, less accurate). Source: https://docs.typesafe.ai/models
- Latency claim: 70–500 ms end-to-end; vendor comparison "193.6x faster, 444.6x cheaper" on its own 4-workflow evals vs. average of Astra + Fable; vendor notes possible capability-team bias. Source: https://typesafe.ai/blog/introducing-system-one-models-and-jev and https://typesafe.ai/
- Independent eval (peer, not vendor): `jev-1.13.0` zero-shot on 37 datasets / 346k requests for <$10; beats Qwen3-27B on 27/37, Gemma-4 on 37/37 within bootstrap intervals; choice probabilities well-calibrated. Source: https://arxiv.org/html/2609.37647v1 (cite as third-party, not vendor claim)

## 4. Capabilities / limits

- Primitives (stable): Choice (1–255 options), Score (2–10 ordered levels), Noul (yes/no probability 0–1). All questions in one request share `state`, answered in parallel. Source: https://docs.typesafe.ai/introduction/quickstart and https://docs.typesafe.ai/concepts/system-one
- Input: text only (string / JSON object / array of text); English primary, other/CJK languages weaker. Source: https://docs.typesafe.ai/models
- Experimental ("danger zone", not production-vouched): composable images (PNG/JPEG, via `assets`, header `TypeSafe-Danger-Zone-Images: true`), `box` bounding-box type (only `jev-1.14.0`/`jev-preview`), long context. Source: https://typesafe.ai/blog/jev-1-14 and https://www.npmjs.com/package/@typesafe-ai/sdk
- No fine-tuning/LoRA per customer; same weights serve all accounts; customize via `state` + `instructions`/`criteria` + decomposition in code. Source: https://docs.typesafe.ai/models
- Not trained on customer requests/responses; ZDR available for enterprise; SOC 2 Type II claimed on enterprise page. Source: https://docs.typesafe.ai/models and https://typesafe.ai/enterprise
- Is NOT a coding-agent LLM backend (no text streaming/tool-calls/edits); belongs inside app code for route/score/check decisions. Source: https://docs.typesafe.ai/introduction/coding-agents

## 5. How to access / use

- Direct: `POST https://api.typesafe.ai/v1/systemone` with `{"model": "jev-latest", "state": ..., "questions": {...}}`; key from https://console.typesafe.ai/keys ; `GET /v1/models` lists aliases. Source: https://docs.typesafe.ai/introduction/quickstart and https://docs.typesafe.ai/models
- SDKs: `uv add typesafe-sdk` / `pip install typesafe-sdk`; `npm install @typesafe-ai/sdk`; `TypeSafeClient.systemOne({state, questions})`. Source: https://docs.typesafe.ai/introduction/quickstart , https://pypi.org/project/typesafe-sdk/ , https://www.npmjs.com/package/@typesafe-ai/sdk
- Playground (browser, no code): https://console.typesafe.ai/playground . Source: https://docs.typesafe.ai/introduction/quickstart
- Agent skill: `typesafe-ai/skills` (`claude plugin marketplace add typesafe-ai/skills` / `npx skills add typesafe-ai/skills --skill typesafe-ai`); SKILL.md: https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md . Source: https://docs.typesafe.ai/introduction/quickstart
- `jev-1.13-free` is NOT a TypeSafe model ID — it is OpenCode Zen's limited-time free serving of `jev-1.13` at `https://opencode.ai/zen/v1/systemone` (free input/output, "limited time", no end date published). Vendor model is `typesafe/jev-1.13.0`. Distinguish the two. Source for Zen alias/pricing: third-party OpenCode docs mirror https://raw.githubusercontent.com/anomalyco/models.dev/dev/providers/opencode/models/jev-1.13-free.toml (primary Zen docs to be confirmed if relied upon in production)

## 6. Open questions / thin primary sources

- Founding date, HQ, headcount, and $40M/DCVC seed-round claim appear only in secondary coverage (e.g. Wikipedia/press); NOT confirmed on typesafe.ai or docs.typesafe.ai as of this investigation. Treat as unverified.
- No public architecture, weights, or training-data details on primary sources; only RLCD name + sampler claim. No independent reproducibility from vendor artifacts.
- `jev-1.13-free` terms (end date, training-data use for free tier, rate limits) live with OpenCode Zen, not TypeSafe; verify at Zen docs before production use.
- Vendor speed/cost Pareto claims rest on vendor's own 4 workflows; vendor itself flags possible bias. Prefer own evals + https://evals.typesafe.ai/ workflow code (https://github.com/typesafe-ai/WorkflowEvals).
