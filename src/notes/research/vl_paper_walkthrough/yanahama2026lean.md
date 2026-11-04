# Lean Atlas: An Integrated Proof Environment for Scalable Human-AI Collaborative Formalization
(authored by agents unless marked 🧑)
Tag: `yanahama2026lean`, [paper](https://arxiv.org/abs/2604.16347)

proof acceptance does not mean the statement is the intended one
- semantic hallucination = formalization type-checks (maybe proved) but not equivalent to intended statement
  - example: omitted annotation makes `3 / 2 = 1.5` infer `Nat`, giving `3 / 2 = 1`
- 5 recurring patterns
  - definition mismatch
  - missing or extra assumptions
  - goal substitution
  - quantifier and scope errors
  - type default semantics shift
- "aligned Lean code" = propositions and definitions humans semantically verified
- verus inference: wrong `ensures` can be verified just like `3 / 2 = 1`
  - review `requires`/`ensures`/`invariant`/types against intended behavior; mark aligned declarations in a manifest
- no automated semantic equivalence checker; human judgment is trusted
dependency graph with type vs value edges
- type dependency: B appears in A's type; value dependency: B only in A's value
  - theorem: type = proposition, value = proof term
- 8 edge kinds = theorem/definition source × type/value site × theorem/definition target
- Lean stdlib and Mathlib excluded as trusted base
Lean Compass pruning to shrink the human review set
- drop only theorem proof-value edges (`thm_value_to_def`, `thm_value_to_thm`)
- BFS from target theorems, keep all type edges and definition-value edges, always add axioms
- soundness is a proof sketch, conditional on reviewed nodes + trusted base being correct
  - pruned nodes not claimed correct; add to target set to check
- verus inference: roots = exported claims; keep specs, executable defs, `external_body`, trusted code; prune proof-only code
interactive viewer
- 12 AND-combined filters (kind, confidence, sorry status, edge kind)
- manual confidence metadata via Lean attributes, team tracking
evidence: node reduction in review cone, 6 Lean 4 projects
- proof-heavy: PrimeNumberTheoremAnd 99% (8 targets), Carleson 96.2% (9), Brownian Motion 94.4% (5)
- mixed: PhysLib 69.0%, FLT milestones 59.8%; definition-heavy XMSS 27.3%
- proxy for candidate set size, not review time or bugs caught
- limits: target set must cover all claims; review-time reduction unmeasured
techniques
- post type-check semantic review of statements
- type/value dependency classification
- Compass pruning + reachability
- aligned-code standard
