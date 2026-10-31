Status: ready-for-agent

## Problem Statement

Maintainers spend reviewer attention evenly across all pull requests, including ones where agent review alone would suffice. There is no fast, calibrated signal that separates pull requests that are agent-sufficient from pull requests that are needs-human, so human review becomes the default queue for everything and high review risk changes wait behind low ones.

## Solution

A fast Jev router runs on each pull request and returns a routing verdict of agent-sufficient versus needs-human with a review risk score. The verdict is published as an advisory label plus a one-line comment. Version 1 never blocks merge and never approves; it only routes attention, and every failure or uncertain answer resolves to needs-human.

## User Stories

1. As a maintainer, I want pull requests that are needs-human to be labeled as such, so that I spend review time where review risk is highest.
2. As a maintainer, I want pull requests that are agent-sufficient to be labeled as such, so that I can let them proceed without opening every diff.
3. As a contributor, I want to see why my pull request was routed to needs-human, so that I can improve it or request review with context.
4. As a contributor, I want a one-line routing reason on my pull request, so that I am not left guessing what triggered human review.
5. As a reviewer, I want the router's probability and review risk score visible on the pull request, so that I can calibrate my trust in the label.
6. As a reviewer, I want uncertain router answers to arrive as needs-human, so that I never miss a pull request because the router was unsure.
7. As a maintainer, I want router failures (timeout, API error, malformed answer) to arrive as needs-human, so that outages degrade toward caution.
8. As a maintainer, I want migration-touching pull requests detected by the router, so that schema changes always get human eyes.
9. As a maintainer, I want permission and authentication-touching pull requests detected by the router, so that access changes always get human eyes.
10. As a maintainer, I want dependency-touching pull requests detected by the router, so that supply-chain changes always get human eyes.
11. As a maintainer, I want the list of paths that force needs-human to live in a repo config file, so that my team tunes routing with a pull request instead of editing automation.
12. As a maintainer, I want the routing threshold documented and tunable after calibration, so that we trade off missed humans against reviewer load deliberately.
13. As a maintainer, I want a backtest over past pull requests before live rollout, so that I see precision and recall on needs-human before trusting labels.
14. As a maintainer, I want an estimate of reviewer minutes saved from the backtest, so that I can judge whether the router earns its place.
15. As a maintainer, I want revert and incident rates tracked alongside routing, so that time saved is not bought with more breakage.
16. As a contributor, I want the router to run fast enough that the label appears while my pull request is fresh, so that routing does not slow my loop.
17. As a maintainer, I want routing cost bounded and predictable per pull request, so that the router stays cheaper than the review time it saves.
18. As a maintainer, I want generated files and renames to not dominate the verdict, so that large but low review risk diffs route to agent-sufficient.
19. As a bot author, I want automated dependency pull requests handled sensibly by the router, so that routine bumps do not flood the human queue.
20. As a maintainer, I want the router to read the pull request description and linked context, so that stated intent informs the verdict.
21. As a maintainer, I want test coverage signals included in the router input, so that untested behavior changes lean toward needs-human.
22. As a security reviewer, I want a documented path for adding new detectors later, so that coverage grows without redesigning the router.

## Implementation Decisions

- Single router verdict per pull request: a Jev Choice between agent-sufficient and needs-human, a review risk Score on a 2–5 scale, and three Noul detectors (touches-migration, touches-auth-permissions, touches-dependencies). All questions share one pull request state and are answered in parallel in a single Jev call.
- Routing rule: verdict is needs-human when the probability of needs-human is at or above 0.5, or when the review risk Score is at or above 4. The probability is read from the Jev probabilities map when present, otherwise derived (1 minus the chosen probability for agent-sufficient). A top-pick of needs-human always routes human, even below 0.5. Any fired Noul detector also forces needs-human, with the detector named in the reason. Thresholds are documented as tunable after the backtest, not fixed forever.
- Serving is TypeSafe direct (`jev-latest` at `https://api.typesafe.ai`, key from https://console.typesafe.ai/keys); `JEV_BASE_URL`/`JEV_MODEL` override the endpoint without code changes.
- Fail-closed posture: any Jev error, timeout, low-confidence answer, or malformed response routes to needs-human with a reason noting the fallback.
- Router input state: diff statistics (counts of files, additions, deletions), path signals (which areas changed, matched against the repo config), test signals (whether tests were touched), dependency and migration signals, and pull request text (title, description). Raw counts are inputs only; they never decide the verdict alone.
- Repo config: a routing config file at the repo root declares the path groups that imply needs-human (migration areas, authentication and permission areas, payment areas, deployment and CI areas, lockfiles). The automation reads it on every run; there is no hardcoded path list in the workflow itself.
- Automation surface: a pull request-triggered workflow calls the router and publishes exactly two artifacts — a routing label (ready-for-human or ready-for-agent) and a one-line comment carrying the probability, the review risk score, and the top reason. No approve action, no merge block, no reviewer assignment in version 1.
- Advisory-first rollout: labels and comments ship first so calibration can be observed on live pull requests; any merge gating or automatic reviewer assignment is deferred to a later version after backtest evidence.
- Backtest gate: before live enablement, the router is run over a recorded set of roughly 50 past pull requests mixing clean merges, reverted or incident-linked pull requests, and heavily commented ones. Measured outcomes are precision and recall on needs-human plus estimated reviewer minutes saved, with revert and incident rates tracked alongside.
- Vocabulary discipline: all user-facing text (labels excluded, which follow the triage vocabulary) uses the domain glossary terms needs-human, agent-sufficient, and review risk. Synonyms from the glossary avoid-list are not used in routing reasons or comments.
- No stored architecture or weights work: the router consumes the hosted Jev model through its decision API; there is no model training, fine-tuning, or local model artifact in this feature.

## Testing Decisions

- What makes a good test here: assert the externally visible routing behavior (given a pull request state, the verdict label and the comment reason), never the internals of prompt wording or API wire shape. A test that breaks when wording changes but routing stays correct is a bad test and should be rewritten to the verdict level.
- Modules under test: exactly one seam — the router decision function from pull request state to verdict (label plus reason). Everything else (fetching pull request data, posting labels and comments, parsing config) is thin plumbing exercised through that seam with recorded fixtures, not unit-tested in isolation in version 1.
- Prior art: there is none in this repo (greenfield, no existing test suite). The backtest corpus of recorded past pull requests doubles as the fixture set: each fixture is a frozen pull request state with a known post-hoc outcome (clean merge, revert or incident, heavy review discussion). New detectors must add at least one fixture demonstrating the routed outcome.
- Calibration tests: threshold behavior is pinned by tests at the boundary (probability just below and above 0.5, score 3 versus 4) so future threshold tuning is a deliberate test update, not a silent drift.
- Fallback tests: Jev error, timeout, and malformed-answer cases each have a fixture asserting needs-human with a fallback reason.
- Live verification is manual and bounded: one dry-run on a real pull request confirming label plus comment appear, then the backtest numbers decide rollout. No standing end-to-end suite against the hosted API in version 1.

## Out of Scope

- Merge blocking, required checks, or required reviewers driven by the verdict (deferred to version 2 after backtest evidence).
- Automatic approval or automatic merge on agent-sufficient.
- Automatic reviewer assignment or review requesting.
- New model training, fine-tuning, or self-hosted model artifacts.
- IDE integrations, chat bots, or dashboards beyond the label plus one-line comment.
- Historical rewrite: relabeling old pull requests or backfilling metrics beyond the backtest corpus.
- Policy for repositories other than the one adopting the router; each repo owns its own config file.

## Further Notes

- Design source: grill-with-docs session concluding in nine confirmed decisions (advisory router, rich state, config-driven paths, Choice plus Score plus three Nouls, 0.5 and 4 thresholds, 50 pull request backtest). Primary Jev capabilities, limits, pricing, and access details are recorded in the repo research note on TypeSafe AI Jev.
- The central claim to validate is leverage: reviewer minutes saved with revert and incident rates flat or better. If the backtest does not show that, the correct outcome is to not roll out, not to lower the threshold until the numbers pass.
- Known weak spots carried into implementation: the detector list (migration, auth-permissions, dependencies) is a starting set and will miss other high review risk areas; the config path list is where false negatives will hide and needs team review; free-tier serving terms for the model must be re-checked before any production reliance.
