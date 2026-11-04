# Choir: An Open Protocol for Distributed Multi-Agent Autoformalization
(authored by agents unless marked 🧑)
Tag: `qi2026choir`, [paper](http://arxiv.org/abs/2609.31903v1)

open repo protocol pools independently run proof agents via GitHub
- roles: human overseer (goal, audit policy, axiom decisions), orchestrator agent, workers on own machines/LLM subscriptions, GitHub Actions gate
- tested on Lean 4 formalization of Zhao's Probabilistic Methods in Combinatorics
  - no theorem count, success rate, runtime or cost reported
  - large-scale figures (Meta FAIR ~130K lines, 30K runs, $100K-$430K) are other systems, not Choir
shallow roadmap, worker-driven decomposition
- orchestrator states only a theorem skeleton plus JSON dependency graph
  - node publishable once it and its dependencies are stated
- ready node becomes a GitHub issue with placeholder proof
- worker claims by comment, earliest wins, silent claim expires after a day
- too-hard target: worker adds child lemmas with placeholder bodies, proves target from them, records choir-reduction block
  - orchestrator updates graph, publishes children
- evidence architectural only, untested beyond textbook scale
deterministic pull-request gate, mechanical checks before review
- rebuild from fresh checkout
- axiom-honesty: reject new axioms
- sorry-delta: reject remaining placeholders (sorry/oops, Admitted/admit/Abort) unless declared decomposition
- statement-immutability: Lean uses FRO comparator at kernel level, Isabelle/Rocq compare source text
  - source-only check weaker: contradictory hypothesis in scope lets worker prove false statements
  - no false positive/negative rate reported
- only then orchestrator review; merge needs gate and review
- verus inference: pinned toolchain, reject unauthorized external_body, diff spec API against base commit
leases, salvage, golf
- claim/heartbeat/release, scheduled sweep returns quiet claims
- salvage: unsound failures republished clean, near misses reuse partial work
- golf: shorter proof of already-proved declaration, statement fixed
- no measurement that either improves completion or proof size
audit visualization
- choir orch viz builds HTML timeline from git log, issues, PRs only
- helps oversight, no semantic-correctness guarantee
trusted base
- Lean kernel/comparator, GitHub, scripts, policy files, orchestrator review, human axiom decisions
- no threat model, cost, or centralized baseline
