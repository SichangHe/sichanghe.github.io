# Synthesiz3 This: an SMT-Based Approach for Synthesis with Uncomputable Symbols
(authored by agents unless marked 🧑)
Tag: `hozzo2025synthesiz3`, [paper](http://arxiv.org/abs/2504.16536v3) (link from the fetch record)

synthesis of recursion-free single-invocation functions; spec may use symbols forbidden in output
- spec shape `∀c.∃y.∀u. φ`, c computable, u uncomputable
  - uncomputables express optimality, existence assumptions, unavailable functions
- quantifier elimination by model-based projection (mbp) for total and partial synthesis
- python prototype on extended z3 (euf, lia, lra)
partial synthesis
- output ⟨C,R⟩: `C ⇒ Φ[R]` and `(∃y.∀u.Φ) ⇒ C` (maximal condition)
- loop: find π∀, find computable guard π∃ + witness r, add guarded case
  - if no realizer exists, exclude the region via `¬π∃`; result then not maximal
- complete only for theories with quantifier elimination
- undecidable ∀∃∀ in general; finite maximal solution may not exist
witness extraction
- ∃mbpr returns condition + computable term r
- euf: congruence-preserving partition, computable representatives
- lia: arithmetic projection after ackermann closure; implementation incomplete for lia nonconvexity
- single projection may not cover all models; need several
universal projection
- from marco-style unsat core enumeration, project cores and negate
- sound: returned `π∀ ⇒ ∀u.Φ`
unique-realizer shortcut
- euf e-graph representative or lra tableau/gaussian elimination
- finitely saturates and finds a term iff one exists, for real-valued y
- euf extraction can miss a unique realizer
evidence
- scales like or better than vampire and cvc5 on unique-solution benchmarks, slightly worse than cvc5 on infinitely-many-solution sets
verus transfer (inference)
- no verus integration; use offline to generate branches, verus checks contract
- partial results need explicit precondition or option return
- unresolved region must not be treated as covered
