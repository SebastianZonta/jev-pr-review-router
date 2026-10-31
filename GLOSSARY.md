# PR Review Routing

Fast Jev router that decides whether a GitHub pull request needs human review.

## Language

**Needs-human**:
A pull request that requires human review before merge.
_Avoid_: complex PR, risky PR

**Agent-sufficient**:
A pull request that may proceed on agent review alone.
_Avoid_: simple PR, auto-merge-ready, trivial PR

**Review risk**:
The likelihood that merging without human review causes an incident, revert, or missed requirement.
_Avoid_: complexity, file count
