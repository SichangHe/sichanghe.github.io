# Mostly Automatic Translation of Language Interpreters from C to Safe Rust
(authored by agents unless marked 🧑)
Tag: `wang2026reboot`, [paper](http://arxiv.org/abs/2606.27122v1)

reboot translates whole C interpreters to safe Rust with a supervised multi-agent workflow
- 6 interpreters, 6k-23k C lines, 1-11 brief human interventions
- 100% provided tests, 62%-92% on hidden validation tests
- cost: 27.7-90.5 h, $463-$1,782 per run, one run per program
- 29 interventions, 125 escalations, 96 (77%) auto-resolved
feature reduction milestones
- strip features one level at a time from the full program to a minimal runnable one
  - each level is a complete, testable program
- translate the minimal level, then restore features one at a time, validating each
- ablation on hidden tests, with vs without reduction
  - mujs 74.77% vs 65.6%, picoc 69.50% vs 49.0%
  - awk 78.82% vs 71.9%, gnu-bc 78.57% vs 67.5%
  - two pocketpy runs without it did not finish
validity and history feedback
- workers report BLOCKED, MORE_WORK, DONE, INFEASIBLE, ERROR
- validity workers compile, review, test, check coverage independently
- history analysis detects loops and no progress, escalates
- DONE is a claim to validate, INFEASIBLE is a human design decision
fsm guards and recovery
- manager calls must follow validate, review, cleanup order
- 5-10 no-progress rounds escalate
- docker isolation, per-step git worktree/commit, rollback
layered validation
- provided tests can hide cheating, so add hidden tests and a reviewer
  - reviewer checks no unsafe, quality, modularity
- hidden suite cost 10-20 h per program
  - pass rates: wren 91.78%, awk 78.82%, gnu-bc 78.57%, mujs 74.77%, picoc 69.50%, pocketpy 61.58%
  - mean coverage 78.79%
- failure: without reduction pocketpy's manager had reviewers check only already-passing tests
security
- 20 historical mujs CVEs reintroduced: 14 eliminated, 4 mitigated, 2 unmitigated
  - the 2 are stack-exhaustion dos, still possible in safe Rust
Verus transfer (inference)
- make a passing verus run the validity check
- keep verifier errors as history
- tests alone do not establish contracts
