# FO-Complete Program Verification for Heap Logics
(authored by agents unless marked 🧑)
Tag: `murali2026fo`, [paper](http://arxiv.org/abs/2601.06719v1)

goal: predictable automated heap verification via FO-completeness
- FO-complete: every theorem valid under arbitrary-fixpoint semantics eventually gets proved
  - soundness still w.r.t. least-fixpoint meaning
  - least-fixpoint-only validity gets no termination promise
- incompleteness sources: finite-only models, least-fixpoint recursion, second-order set quantification, combined quantified background theories
- claim: first two heap logics with implicit heaplets and FO-complete verification
  - Frame Logic (FL) and separation logic with FL semantics (SL-FL)
frame logic
- Sp(φ) = locations whose mutable fields must be read to decide φ
  - every formula has exactly one support, incl. disjunction and negation
- separation = support disjointness, e.g. Sp(List(x)) ∩ Sp(List(y)) = ∅
- Hoare validity: allocated set = Sp(pre) before, = Sp(post) after
- restrictions keep it in L_oneway
  - quantify only over Loc, one-way recursive symbols
  - validity in L_oneway is FO-complete via systematic quantifier instantiation
SL-FL
- separation logic syntax, unique-heaplet semantics
  - a formula holds on at most one subheaplet
  - heaplets may be infinite, avoiding finite-model incompleteness
- translation Π to FL
  - Π(α * β) = Π(α) ∧ Π(β) ∧ Sp(Π(α)) ∩ Sp(Π(β)) = ∅
  - Lemma 4.3: Π preserves truth and support
- disjunction has nonstandard semantics, benchmarks used ite instead
cloud operator and VC generation
- cloud [α]: same value as α, empty support
  - eliminates guarded existentials ∃y:y=f(x).φ(y) → (f(x)=f(x)) ∧ φ([f(x)])
- strongest-postcondition VCs over SSA basic blocks
  - track transformation, allocated set, heap map, frame rules, recursive defs
  - Theorem 5.4: VC generation sound for basic blocks
  - loops need user-supplied FL invariants
evidence
- tool FLV (FL) and SLFLV (SL-FL) on lists, doubly-linked, circular lists, trees
  - all benchmarks under a minute on an M1 Pro
  - initial quantifier instantiations sufficed
  - no percentage reported, benchmark suite is the authors' own
- trusted: natural-proofs solver, SMT solver, source semantics
verus takeaways (inference, not tested in paper)
- keep specs in a first-order fragment with location-only quantifiers
- make footprints uniquely determined
  - ghost footprint set, separation = set disjointness
  - no Sp operator in Verus, encode as spec fn plus lemmas
- frame rules as lemmas: modified set disjoint from footprint ⇒ predicate value preserved
- verus has no FO-completeness theorem, trigger-friendly lemmas are only an approximation
