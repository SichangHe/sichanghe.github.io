# Gradual Exact Logic: Unifying Hoare Logic and Incorrectness Logic via Gradual Verification
(authored by agents unless marked 🧑)
Tag: `zimmerman2024gradualexact`, [paper](http://arxiv.org/abs/2412.00339v1)

## purpose and semantic split
The paper defines gradual exact logic (GEL) as a consistent lifting of exact logic, relating Hoare logic (HL), incorrectness logic (IL), and gradual verification (GV). The abstract says: “Previously, gradual verification has been developed using overapproximating logics such as Hoare logic.” (Abstract, p.1) and claims that “Hoare logic, incorrectness logic, and gradual verification can be defined in terms of gradual exact logic.” (Abstract, p.1)

HL triples `{P} C {Q}` overapproximate all states reachable from `P`; IL triples `[P] C [Q]` underapproximate reachable states and prove a bug state is reachable. GV uses an imprecise precondition `? ∧ P`, allowing a satisfiable strengthening `P′ ⇒ P` to make a Hoare proof. The paper’s concrete example is `{? ∧ ⊤} x := x + 1 {x > 0}`, justified by the precise assumption `x ≥ 0 ∧ ⊤` (Overview, pp.1–2). Use this split when a verifier must prove safety for all paths (HL), prove existence of a failing path (IL), or defer unknown assumptions while keeping them explicit (GV).

## gradual exact logic construction
Define precise formulas as ordinary first-order formulas and gradual formulas as either precise `P` or imprecise `? ∧ P`. Concretization maps `? ∧ P` to all satisfiable precise formulas `P′` such that `P′ ⇒ P`; the paper gives: “The concretization γ : Formula → P(Formula) interprets a gradual formulas as sets of precise formulas” (Section 2.2, p.2). Define a gradual-exact triple by choosing one precise precondition and postcondition from the two concretization sets and proving the exact-logic triple. Step by step: (1) choose the gradual annotations; (2) enumerate or symbolically represent allowed precise refinements; (3) prove exact reachability equality for the selected refinement; (4) retain the gradual triple as valid. Exact logic is the intersection of HL and IL, so its postcondition is both an over- and under-approximation.

The key operational tool is the strongest postcondition `sp(P,C)`, defined as the strongest predicate describing states after `C`. The paper states, “sp(P, C) denotes the strongest (WRT ⇒) Q for which {P } C {Q } is valid.” (Section 2.3, p.2). For the core language, calculate `sp(P, skip)=P`, `sp(P, x := E)=∃v (x = E[x/v] ∧ P[x/v])`, sequence by composition, and conditionals by joining branch postconditions (Appendix B.2, pp.5–6). These calculations give a mechanical way to test whether a proposed postcondition is exact.

## deductions and equivalences
Use exact-logic rules for assignment, skip, sequence, conditionals, frame, existential, and disjunction (Appendix E). The strongest-postcondition characterization is bidirectional: Theorem 2 gives HL iff `sp(P,C) ⇒ Q`; Theorem 3 gives IL iff `sp(P,C) ⇐ Q`; Theorem 4 gives exact logic iff `Q ≡ sp(P,C)` (Section 2.3, p.2). Thus a verifier can compute `sp` and compare rather than inventing an arbitrary invariant.

For imprecise specifications, characterize GV through exact logic by making the postcondition imprecise: valid GV `{P̃} C {Q}` iff a gradual-exact proof exists for `(P̃) C (? ∧ Q)`. Dually, with a satisfiable `Q`, IL is characterized by gradualizing the precondition: “Theorem 6. If Q ∈ SatFormula, ⊢ (? ∧ P) C (Q) ⇐⇒ ⊢ [P] C [Q]” (Appendix E.2, p.13). This gives a practical migration: a GV assumption is equivalent to IL path pruning, provided the bug postcondition is satisfiable.

Inference: in Verus, exact triples correspond to proving both a standard postcondition and a witness that every claimed post-state is reachable. Use `requires` and `ensures` for the HL side, ghost state and a `proof fn` for reachability witnesses, and `invariant`/`decreases` for loops. Verus has no built-in gradual formula or IL judgment, so `?` refinements must be explicit ghost predicates and any dynamic checks remain outside the proof.

## application procedure for VL
To apply the paper’s method to a Rust function: (1) write a precise precondition for known inputs; (2) mark unknown assumptions as an imprecise `? ∧ P`; (3) compute or approximate `sp` through each assignment, sequence, and branch; (4) for safety, prove `sp ⇒ Q` with Verus contracts; (5) for bug-finding, choose a satisfiable target `Q` and provide a concrete or symbolic witness showing `Q ⇒ sp`; (6) if exactness is required, prove `Q ≡ sp`; (7) replace each gradual assumption with a runtime check or a verified stronger precondition. Steps 1–6 follow the definitions and theorems; step 7 is Inference: a product integration choice, because the paper studies only static verification and explicitly leaves runtime assertions for future work.

## evidence and limits
The paper is a formal foundations result: theorems establish the equivalences, and appendices give inductive derivations for the restricted language. It reports no benchmark corpus, runtime, or success denominator. The language has mutable variables, assignments, conditionals, and sequencing, but no loops, functions, heaps, or method calls. The caveat is explicit: “While we have proven the results described, we have done so only for a very restrictive language, and thus our results should be considered preliminary.” (Section 4, p.4). Trusted elements are first-order logic semantics, the exact-logic derivation system, and the assumed termination of this core language. Inference: threat to agent-written verified Rust is moderate: gradual assumptions can reduce proof effort, but unsoundly dropping paths would undermine safety, and the paper’s equivalences do not cover Rust aliasing, concurrency, or loops. VL should reuse strongest-postcondition and witness ideas rather than redo the logic unification.

## techniques for the catalog
- gradual refinement: represent unknown assumptions as `? ∧ P`, then choose a satisfiable stronger precise precondition for a proof
- strongest-postcondition checking: calculate `sp` compositionally and compare it with the desired postcondition
- exact logic: require postcondition equivalence to `sp`, combining overapproximate safety and underapproximate reachability
- incorrectness migration: encode gradual preconditions as IL path-pruning deductions when the target postcondition is satisfiable
Checked 2026-10-15 against paper zimmerman2024gradualexact: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
