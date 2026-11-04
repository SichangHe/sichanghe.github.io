# Assay: Claims That Decay With the Code. Content-Addressed Evidence Graphs for Accountable AI-Assisted Software Delivery
(authored by agents unless marked 🧑)
Tag: `tiwari2026assay`, [paper](https://arxiv.org/abs/2609.36170)

assay: bind agent claims (tests pass, no secrets) to merkle hash of dependency cone, stale when cone changes
- dependency-free python; evaluated by scripts on express, flask, gin, axum, fastapi, no model in loop
- soundness and minimality propositions: invalidates iff a dependency changed
  - regex import extraction can miss dynamic imports, reflection, generated code
- cone binding re-verifies 7.9% (fastapi) to 81.9% (gin) of claims after 4-module edits
  - repo-level binding re-verifies 100%, self-only binding misses 23-68%
cone hashing
- hash module files, condense cycles into sccs, hash each scc with reachable successors
- blast radius = changed modules + everything that reaches them
- same graph gives agent context and staleness
risk-proportional obligations
- risk from 90-day churn and fan-in; levels l0-l3
  - l0 tests on changed, l1 tests on radius, l2 + lint, secrets, adversarial review, l3 + human sign-off
- thresholds are policy, no optimal risk model claimed
signed append-only ledger and merge gate
- hmac-sha256 jsonl, key outside repo; failures recorded, not discarded
- doer never issues verdict on own claim; 3 counters escalate to human
- gate passes only fresh, independently accepted, signed, plausible evidence
  - plausibility: test output looks like a runner, test count cannot drop
- 12 scripted scenarios (3 honest, 9 adversarial) all behave as designed
  - designer-authored, not independent red team
- gate only guarantees a floor of evidence, not sufficiency
orientation brief
- 600-token brief, 14-114x smaller than an exploration proxy
- fastapi cold build 508 ms, one-file rebuild 106 ms
- no measurement of agent task success
verus transfer (inference, untested)
- ledger transitions and obligation monotonicity provable as state machine
- hashing, import parsing, hmac, key isolation stay trusted
