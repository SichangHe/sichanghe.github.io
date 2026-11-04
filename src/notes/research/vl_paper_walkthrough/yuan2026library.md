# Let the Library Speak: Self-Advertised Method Selection for Formal Proving
(authored by agents unless marked 🧑)
Tag: `yuan2026library`, [paper](https://www.semanticscholar.org/paper/08041a4b9e74e0c97e53e315d343304688150a76)

claim: retrieve proof methods by applicability, not similarity
- method = prerequisites, target, intended action, residual obligations
method contract
- selection side: description, target class, prerequisites, prohibited uses, checked-material manifest
- execution side: Lean scaffold, worked instance, Mathlib anchors, hypotheses, residual obligations
- built 82 contracts from Putnam 2000–2014 solutions
  - model drafts, authors review every extraction and merge
  - all compile with pinned Lean + Mathlib, scaffold stated for arbitrary parameters
- selector sees only selection side, prover gets execution side after selection
- Proposition 1: hole-free parameterized term + proved premises gives checked proof of target
  - says nothing about whether the proposal applies or matches user intent
self-advertisement
- one batched call, every contract commits to target, action, required facts, evidence, role, score
- commitment gate: main nomination needs offer ∧ concrete target ∧ concrete action ∧ nonempty evidence
  - failed ones demoted to support
  - rank by tier (passing main, other offer, no offer), then score
- optional pairwise runoff over top-q for rank one, heuristic only
evidence (GPT-5.6 Luna)
- hit@5 on 120 Putnam 2015–2025: .950 vs best reranker .842
- hit@5 on 60 IMO ProofBench: .917, .933 with runoff
- proving with top contract, 10 Lean compilations per problem
  - Putnam 5.8% → 12.5%
  - IMO 10.0% → 15.0%
  - whole contract supplied, so gain not isolated to selection
  - metrics: hit@k, recall@k against human-checked labels
for Verus (inference)
- contract = description + requires + ensures + verified proof fn scaffold + residual obligations
- gate nominations outside Verus, Verus still discharges every obligation
- runoff only orders which lemma to try first
