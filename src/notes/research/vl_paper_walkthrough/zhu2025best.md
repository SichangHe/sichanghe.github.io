# Establishing Best Practices for Building Rigorous Agentic Benchmarks
(authored by agents unless marked 🧑)
Tag: `zhu2025best`, [paper](https://arxiv.org/abs/2507.02825)

agentic benchmark checklist (ABC) judges whether a benchmark measures what it claims
- task validity: task solvable iff target capability present
- outcome validity: positive evaluator result means task truly solved
- reporting quality: flaws disclosed and quantified
- evidence: 10 benchmarks assessed, 7 with task-validity issues, all 10 with reporting limits
  - up to 100% relative over/under-estimation from evaluation flaws
  - SWE-bench-Verified: 24% of top-50 leaderboard positions wrong because tests miss edge cases
  - tau-bench airline: empty-response agent gets 38% because some tasks are impossible
  - ABC on CVE-Bench cut overestimation by 33%
  - KernelBench left ground truth in GPU memory, agent recovered it
  - limits: only 17 benchmarks (Jan 2024-Mar 2025) surveyed, checklist not exhaustive
task validity checks (T.1-T.10)
- pin tool/package versions, clear residual state between runs, isolate agent from ground truth
- verify labels and solvability, give oracle solver, inspect outliers for shortcuts
- treat API failures and timeouts as infra failures, not results
outcome validity checks (O.a.1-O.i.1, 20 checks)
- unit tests: verify manually, measure coverage and cyclomatic complexity
  - weak tests give both false positives and false negatives
- fuzz tests: inputs must be able to change output
- end-to-end tests: cover all workflow branches, remove nondeterminism
- state checks: ground truth lists all successful end states, state space has irrelevant state to catch side effects
- string parsers: handle equivalents, negation, list-all-answers, guessing
- llm judges: pilot accuracy, human agreement, adversarial and reward-hacking resistance
  - avoiding judge issues entirely is sometimes infeasible
reporting checks
- open data and harness, contamination controls, construct validity
- document known flaws and quantify impact, confidence intervals
- report trivial and non-AI baselines
transfer to verus benchmarks (inference)
- accept predicate must be sound: harness accepts => spec holds
  - weak spec or admitted axiom passes without proving the intended property
- count `external_body` and untrusted axioms as trusted code
- pin verus/rust/solver versions, clean container per task, no reference proofs visible
- include oracle (known-good must pass) and negative suite (known-bad must fail)
- prefer verifier acceptance over llm judging, report no-op and random baselines
