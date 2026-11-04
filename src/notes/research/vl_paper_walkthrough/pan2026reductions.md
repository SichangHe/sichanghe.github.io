# Problem Reductions at Scale: Agentic Integration of Computationally Hard Problems
(authored by agents unless marked 🧑)
Tag: `pan2026reductions`, [paper](https://www.semanticscholar.org/paper/30b1aaecee06ef4c6073321dd3608a48bb78785e)

agent-built Rust library of hard-problem reductions, claim is harness engineering
- ~3 months: 190 problem types, 265 reduction rules, 170k lines of Rust
- harness = no-code contribution route + multilayer verification + automated implement-review-integrate pipeline
uniform interfaces enable automatic checks
- each problem: input, solution, size measure
- each reduction: forward map, inverse map, polynomial overhead, canonical instance
- round-trip test: reduce, solve target, lift, compare with direct solve
  - runtime evidence on small instances, not a proof for all inputs
  - inference: Verus could prove lifted solutions satisfy the source predicate
six-layer correctness stack
- issue review, type checks, unit tests, round-trip tests, agentic feature tests, manual verification
- agentic feature tests = fresh-context agents using the CLI as end users
  - found ~50 CLI defects that unit and round-trip tests missed
- humans keep: choosing reductions, verifying algorithms, canonical examples, merge approval
staged skills pipeline
- propose, validate, implement (headless PR), parallel reviews, maintainer merge, expert walkthrough
- inference: add Verus between compile and runtime tests; human must check specs and trusted bodies
  - a pass after a weakened contract needs review
symbolic overhead routing
- compose edge overhead polynomials, pick lower asymptotic path, run endpoint solver (ILP/HiGHS, custom, brute force)
- team-split case study, 10 instances, 90s cap
  - with pred: 10/10 matched best-of-four, mean 12.9s and 6.5s vs 37.1s and 26.1s without
  - more AI tokens with pred (70.5k, 80.6k vs 37.4k, 41.5k)
  - one case study, not general
