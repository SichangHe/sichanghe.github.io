# Reasoning About Incompletely Defined Programs
(authored by agents unless marked 🧑)
Tag: `walther2025reasoning`, [paper](https://doi.org/10.1007/s10817-025-09722-z)

Walther (J. Autom. Reason. 69:25, 2025): reason about terminating functional programs with undefined calls (1/0, hd(∅))
- undefined result ⋆ means arbitrary but fixed value
  - statement true in Th_Pr only if true for every completion of undefined calls
  - stuck computation models a runtime error
- refined theory Th*_Pr: interpreter never gets stuck on ground instances of proved statements
- proofs for terminating programs only; results via VeriFun
exception guards
- replace ⋆ with self-call, disable those calls so they stay stuck
- except_f: disjunction over ⋆ occurrences of path conditions (except_/ is y = 0)
- guard false does not imply defined (log(12,2) stuck), so not a domain test
determination guards and domain procedures ∇f
- dg[⋆] = false, variable true, constructors/equality conjoin argument guards
  - call f(t1..tn): all argument guards and ∇f(t1..tn)
- ∇f = determination guard of body after weak normalization, synthesized after termination of f
- soundness (Thm 2): ∇f true implies call not stuck
- exact (Thms 4, 5) when program is safe
  - unsafe: stuck subterm at a position never evaluated strictly, e.g. hd(0::tl(∅))
  - safeness not semi-decidable, author found no unsafe procedure in own case studies
  - hence abstract's "in almost all cases"
guard optimization
- weak simplification using context and verified lemmas (∇/ becomes ¬ y = 0)
- recursion elimination (Thm 6): ∇∈, ∇fib, ∇ack become true
- eliminate recursive result terms by clusters (Thm 7), proving formula R_{e,b}
  - ∇last becomes ¬ k = ∅
  - ∇min needs the cluster of both calls, single calls refuted
- cannot be eliminated: ∇− (x ≥ y), ∇log
- worst case (2^k − 1)·2 formulas for k recursive terms
  - one case study had 19 and none eliminable
  - limits N1 = 4 restrict, N2 = 8 disable search
well-formed lemmas
- true formula can still hit a runtime error on a ground instance
- lemma admitted into Th*_Pr only if lemma guard (∀x dg[body]) is valid (Thm 8)
  - lemma guard checked with Disprover before proof attempt
- conservative: rejects safe lemmas like x − y ≤ x, never-stuck hd(i::tl(k)) = i
- guard depends on connective order: dg[a ∨ b] ≠ dg[b ∨ a]
relation to Verus requires (§6)
- paper lists Verus, Dafny, F*, Liquid Haskell as requires-guard systems
- disadvantages: user writes req_f by hand, calls may run twice
- `requires req; R` equals `if req then R else ⋆`, no added expressiveness
- Walther adds guard synthesis, optimization, refined theory
evidence
- timing: 1 s for >, −, /, log (3 s with lemmas), under 1 s for ∈, fib, ack, last, min
- induction heuristic success above 95%
- no benchmark suite, no aggregate success rate
- trusted: symbolic evaluator soundness, VeriFun, Disprover, user termination functions, language L as model of programs
for Verus (inference)
- panic path explicit via `requires`, callers prove it
- `spec fn domain_f(args) -> bool` required in contract, with `decreases` for recursion
- prove a `no_panic` lemma before admitting spec lemmas
- never treat panics as arbitrary values without a guard
- synthesis would be a separate source transformation
- risk high if verifier panic model differs from executable Rust
