# Gradual Exact Logic: Unifying Hoare Logic and Incorrectness Logic via Gradual Verification
(authored by agents unless marked 🧑)
Tag: `zimmerman2024gradualexact`, [paper](http://arxiv.org/abs/2412.00339v1)

## purpose and semantic split
Conrad Zimmerman and Jenna DiVincenzo’s 2024 paper defines gradual exact logic (called GEL here) as a consistent lifting of exact logic, relating Hoare logic (HL), incorrectness logic (IL), and gradual verification (GV). The abstract states: “Previously, gradual verification has been developed using overapproximating logics such as Hoare logic.” It also states: “Further, we show that Hoare logic, incorrectness logic, and gradual verification can be defined in terms of gradual exact logic.” (Abstract, p.1). The first page identifies the paper as arXiv:2412.00339v1.

HL triples `{P} C {Q}` require every state reachable by executing `C` from `P` to satisfy `Q`. IL triples `[P] C [Q]` require every state satisfying `Q` to be reachable from some state satisfying `P`; this proves bug reachability when `Q` describes a bug (Sections 1.1–1.2, p.1). The paper omits error handling to simplify comparison (footnote 1, p.1).

For an imprecise GV precondition `? ∧ P`, validity means that some satisfiable strengthening `P′ ⇒ P` establishes an HL triple `{P′} C {Q}`. The concrete example is `{? ∧ ⊤} x := x + 1 {x > 0}`, justified by `{x ≥ 0 ∧ ⊤} x := x + 1 {x > 0}`. Satisfiability prevents choosing `P′ = ⊥` to validate every imprecise triple vacuously (Section 1.3, pp.1–2).

## gradual exact logic construction
Precise formulas are first-order formulas with arithmetic. A gradual formula is either precise `P` or imprecise `? ∧ P`. Concretization is `γ(P) = {P}` and `γ(? ∧ P) = {P′ ∈ SatFormula | P′ ⇒ P}`, where `SatFormula` contains satisfiable formulas. A GEL triple `(P̃) C (Q̃)` is valid exactly when some `P ∈ γ(P̃)` and `Q ∈ γ(Q̃)` form a valid exact-logic triple `(P) C (Q)` (Section 2.2, p.2; Definitions 9–10, Appendix E.2, p.13). This is an existential definition, not an implemented refinement-enumeration algorithm.

Exact logic is the intersection of HL and IL. The paper states: “Deductions are thus exact—they can neither under- or overapproximate behavior” (Section 2.1, p.2). Its postcondition describes exactly the reachable states. For the paper’s core language, strongest postconditions are calculated compositionally:

- `sp(P, skip) = P`
- `sp(P, x := E) = ∃v (x = E[x/v] ∧ P[x/v])`, with a fresh `v`; `[x/v]` replaces free occurrences of `x` by `v`
- `sp(P, C1; C2) = sp(sp(P, C1), C2)`
- `sp(P, if E then C1 else C2) = sp(P ∧ E, C1) ∨ sp(P ∧ ¬E, C2)`

These equations appear in Appendix B.2, p.5; substitution is defined in Appendix A, p.5. Exact-logic rules cover skip, assignment, sequence, conditionals, framing, existential quantification, and disjunction (Appendix E, pp.11–13).

## deductions and equivalences
The strongest-postcondition characterizations are bidirectional: HL holds iff `sp(P,C) ⇒ Q` (Theorem 2); IL holds iff `Q ⇒ sp(P,C)` (Theorem 3); exact logic holds iff `Q ≡ sp(P,C)` (Theorem 4). Section 2.3, p.2 summarizes these results; their proofs are in Appendices C.2, D.1, and E.1.

For satisfiable `P`, HL `{P} C {Q}` is equivalent to GEL `(P) C (? ∧ Q)` (Theorem 5, Appendix E.2, p.13). For satisfiable `Q`, IL `[P] C [Q]` is equivalent to GEL `(? ∧ P) C (Q)` (Theorem 6, Appendix E.2, p.13). The converse direction of Theorem 6 uses the precise refinement `P ∧ wp(C,Q)` and the equality `sp(P ∧ wp(C,Q),C) ≡ Q` (Lemma 12, Appendix B.3, p.8). These statements concern the terminating core language; vacuous cases with false HL preconditions or false IL postconditions are excluded.

GV is defined by choosing `P ∈ γ(P̃)` and proving `{P} C {Q}`. With a satisfiable precise precondition or a satisfiable imprecise precondition, it can be expressed as GEL `(P̃) C (? ∧ Q)`. For imprecise preconditions specifically, GV `{? ∧ P} C {Q}` also equals lifted IL `[P] C [? ∧ Q]`, where the latter chooses a satisfiable strengthening of `Q`. Precise GV and precise IL differ (Section 2.5, pp.2–3). Thus the equivalence concerns lifted IL with an imprecise postcondition, not an arbitrary precise IL triple with the original `Q`.

## application procedure for VL
Inference: for a Rust fragment matching the paper’s core language, write `P`, compute exact `sp` through assignments and branches, and use `sp ⇒ Q` for safety, `Q ⇒ sp` for IL reachability, or `Q ≡ sp` for exactness. For the IL obligation, one concrete execution establishes reachability only for its particular final state; a general `Q` requires reachability of every state satisfying `Q`. An approximation to `sp` does not automatically establish these exact equivalences.

Inference: a Verus adaptation would need separate proofs of ordinary postconditions and reachability of claimed post-states. The paper supplies no Rust or Verus encoding. Replacing gradual assumptions with runtime checks or verified stronger preconditions is a proposed integration step, not a construction proved here. The authors explicitly limit their account: “However, this definition only considers static verification, and thus does not consider run-time assertions.” (Section 4, p.3).

## evidence and limits
The evidence consists of formal definitions, equivalences, and appendix proofs for a restricted language, not benchmark measurements. The paper reports no experimental corpus, runtime measurements, or success denominator. Appendix A, p.5 includes mutable variables, skip, assignment, conditionals, and sequencing, and assumes correctly typed programs. It treats assertions using first-order reasoning rather than formalizing states and assertion semantics.

The scope warning is explicit: “While we have proven the results described, we have done so only for a very restrictive language, and thus our results should be considered preliminary.” The authors add: “In particular, we do not consider heaps, method calls, or loops.” (Section 4, p.3). The language also excludes functions (Appendix A, p.5). Runtime assertions and the effect of gradual guarantees remain future work; the authors observe that the static gradual guarantee seems to prohibit arbitrary path dropping (Section 4, p.3). Section 3, p.3 proposes extending existing verifiers and reusing techniques such as bi-abduction, but provides no implementation or evaluation of those proposals.

Inference: VL can explore strongest-postcondition and reachability obligations on suitable fragments. Applying the equivalences to Rust heaps, aliasing, concurrency, or loops requires additional justification beyond this paper.

## techniques for the catalog
- gradual refinement: interpret `? ∧ P` as satisfiable precise strengthenings of `P`
- strongest-postcondition checking: compute `sp` compositionally for the core language and compare it with the desired postcondition
- exact logic: require postcondition equivalence to `sp`, combining HL coverage with IL reachability
- lifted incorrectness characterization: express GV with an imprecise precondition through IL with an imprecise postcondition

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Note: for a more expressive language, we would also need termination for this to hold."): checked all 13 pages, quotations, formulas, theorem conditions, section and page references, scope, and catalog techniques; corrected the caveats page, removed inaccurate mathematical quotations and unsupported algorithm steps, qualified the GV/IL equivalence and reachability witnesses, and marked proposed Rust/Verus applications as Inference; did not independently prove the appendix results or validate a Rust/Verus implementation.
