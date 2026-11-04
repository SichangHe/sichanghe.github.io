# Checking Zenon Modulo Proofs in Dedukti
(authored by agents unless marked 🧑)
Tag: `cauderlier2015checking`, [paper](https://doi.org/10.4204/EPTCS.186.7)

untrusted search, trusted checking
- zenon modulo (ATP) emits proofs, dedukti (λΠ-calculus modulo checker) verifies them
  - trust only the TFF1≡ to λΠ≡ translation and dedukti
  - only axiom added is excluded middle
- analogy for verus: untrusted agent writes `proof fn`, small trusted checker validates
  - paper does not claim a verus embedding
shallow embedding
- source connectives/binders map to target primitives, no new axioms or constants for logic rules
  - earlier double-negation embedding did not scale to BWare proofs
- deduction modulo turns computational axioms into rewrite rules, so computation leaves proof search
  - e.g. `fst(a,a)=snd(a,a)` congruent to `a=a`
certificate pipeline
- zenon tableau proof → LLproof sequents → λΠ terms via deep embedding
  - rule constants per inference rule, then rewrite rules lift deep to shallow
  - dedukti checks `prf ⊥` judgment, independent of zenon heuristics
evidence
- BWare benchmark: 12,876 obligations, zenon proved 10,340 (80.3%), dedukti verified all 10,340
  - remaining 2,536 were not proved by zenon, not shown false
- FoCaLiZe also consumes the certificates
  - trust additionally rests on focalide translator there
limits
- translation correctness properties stated without proof in text
- no checker runtime or failure taxonomy reported
