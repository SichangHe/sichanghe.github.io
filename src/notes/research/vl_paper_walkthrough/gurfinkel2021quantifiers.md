# Quantifiers on Demand
(authored by agents unless marked 🧑)
Tag: `gurfinkel2021quantifiers`, [paper](http://arxiv.org/abs/2106.00664v1)

QUIC3: IC3/PDR inferring universally quantified inductive invariants over LIA + arrays
- returns Safe with an invariant, or Cex, but may run forever
  - guaranteed progress: explores ever longer executions
  - soundness proved, completeness impossible (undecidable)
- input is a quantifier-free (Init, Tr, Bad) problem, taken as CHCs; implemented in Z3's CHC engine
quantified frames
- each lemma = formula with free int variables + the ground instance (substitution) that caused it
- predecessor queries use only the accumulated ground instances
- lemma obtained by interpolation, skolem constants abstracted back to variables
partial model-based projection (MBP) generalizes predecessors
- array theory has no quantifier elimination, so only partial MBP
- result is a ground monomial consistent with the model
instances generated on demand, not by a black-box solver
- driven by blocking, plus pattern triggers when pushing
- deterministic skolemization makes each proof obligation (POB) yield finitely many predecessor POBs
  - so every depth is reached, or Safe, or a shortest Cex
- cost: finite instantiation trades completeness for progress
quantified generalization (QGen) strengthens lemmas
- simple: abstract a bounded array index into a fresh variable guarded by its bounds
  - 0 < sz -> A[0] = 42 becomes 0 <= v < sz -> A[v] = 42
- arithmetic: convex hull of data points
  - A[0]=42, A[1]=44 gives j = 2i + 42
- limit: only one abstraction candidate is tried, failure if it is wrong
evidence
- 44 safe array benchmarks (SV-COMP + fluid updates, bounds made symbolic by hand), 300 s timeout
  - QUIC3 times out on 10 of 44
  - Spacer times out on all (only baseline; other tools unavailable)
  - e.g. array-init-const: QUIC3 0.14 s, 7 invariant lemmas
- trusted: Z3, interpolation/MBP, SeaHorn CHC translation, the safety property
verus analogues (all inference)
- quantified loop invariants + assert forall / proof fn lemmas carry finite-index facts
- QGen = emit candidate spec fn lemmas, Verus checks them
- MBP, frames, interpolation are verifier internals, not Verus constructs
