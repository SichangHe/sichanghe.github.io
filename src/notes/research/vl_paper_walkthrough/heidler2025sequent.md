# A Sequent Calculus For Trace Formula Implication
(authored by agents unless marked 🧑)
Tag: `heidler2025sequent`, [paper](http://arxiv.org/abs/2505.03693v3)

## problem and contribution
The paper studies implication between trace formulas for recursive imperative programs. Trace formulas use conjunction, disjunction, chop, binary state relations, and least fixed points. They characterize complete finite traces of a program, so proving a program judgment `S:Φ` requires proving a consequence relation between formulas. The abstract says: “We present a sound sequent calculus for proving implication (i.e. trace inclusion) between trace formulas.” (Abstract, p. 1.) The calculus is intentionally incomplete: “While this does not yet result in a complete calculus for trace formula implication, it is possible to prove many non-trivial properties.” (Abstract, p. 1.)

The central difficulties are unbounded recursion, state changes hidden inside fixed points, and misaligned recursive bodies. The paper addresses them with fixed-point induction, procedure contracts, and µ-formula synchronization (Introduction, pp. 2–3).

## technique 1: trace-formula representation and sequent judgments
what it is
A trace formula denotes a set of finite execution traces. Its syntax is `p | R | Φ∧Φ | Φ∨Φ | Φ⌢Φ | X | µX.Φ`, where `p` is a state predicate, `R` a binary state relation, `⌢` chop, `X` a recursion variable, and `µ` a least fixed point (Section 3, p. 4). A Rec program satisfies `Φ` when all program traces are included in the formula's trace set (Definition 4, p. 5).

when to use it
Use this representation when pre/postconditions lose temporal information. The paper's `Sdown` example specifies that a variable never increases and that, from suitable initial states, it eventually reaches 0 and then -1; these properties cannot be expressed by ordinary Hoare pre/postconditions (Section 3, p. 5).

how it is done
1. Define the program's state relations for assignments and skips (`Sbax` and `Id`) (Section 3, p. 4).
2. Compose relations and predicates with chop to describe trace segments (Section 3, p. 4).
3. Bind recursive behavior with a least fixed point `µX.Φ`; its semantics is the least fixed point in the powerset lattice (Section 3, p. 4).
4. Prove trace inclusion with sequents `ξ⋄Γ⊢∆`, where `Γ` is the antecedent, `∆` the succedent, and `ξ` records assumptions relating recursion variables under state predicates (Section 4.1, p. 5).

The strongest trace formula theorem gives each Rec program a formula denoting exactly its traces (Section 3, p. 4). This allows either direct program-calculus proofs or formula-consequence proofs.

Verus form
Inference: In Verus, executable Rust remains the program, while a `spec fn` can define an abstract trace predicate or state relation. A `proof fn` can establish trace inclusion and compositional lemmas. Recursive functions would need explicit `requires`, `ensures`, and termination arguments; a Verus `invariant` is appropriate for loops, but the paper's chop and least-fixed-point semantics are mathematical ghost specifications rather than direct runtime constructs.

evidence and limits
The trace logic is at least as expressive as the Rec language because strongest formulas can be constructed effectively (Section 3, p. 4). Its consequence problem is highly undecidable because formulas are as expressive as recursive programs (Introduction, p. 2).

## technique 2: fixed-point unfolding, lengthening, and induction
what it is
The base calculus unfolds a µ-formula in the antecedent or succedent with UNFL and UNFR, and repeats its body with LENL and LENR. Unfolding handles concrete recursion bounds; lengthening aligns a bounded number of recursive iterations (Section 4.2, pp. 7–8). For unknown or very high bounds, rule FPI uses an invariant `I` to prove inclusion between two fixed points.

when to use it
Use unfolding when the current state gives a finite recursion depth. Use induction when recursion depth is unknown; repeated unfolding may never terminate (Section 4.3, p. 8). Use lengthening before induction when recursive-variable positions or trace lengths differ.

how it is done
1. For a concrete bound, replace `µX.Φ` with `Φ[µX.Φ/X]` using UNFL or UNFR (Section 4.2, p. 7).
2. For a bounded repeated body, use `repeat_i(Φ)` and LENL/LENR with `i≥1` (Section 4.2, p. 7).
3. Choose an invariant predicate `I` and prove the initial state satisfies it (`PΓ⊢I`) (Section 4.3, p. 9).
4. Under the recursion-variable assumption `(X1|I,X2)`, prove the body inclusion `I,Φ⊢Ψ` (Section 4.3, p. 9).
5. Conclude `Γ,µX1.Φ⊢µX2.Ψ` with FPI (Figure 6, p. 9).

The factorial example proves that `y` never decreases after initialization. The derivation first lengthens the increment formula by three to align the recursive bodies, then applies FPI (Example 8, pp. 9–10). Theorem 3 states that the base rules are sound (Section 4.3, p. 10).

Verus form
Inference: Encode the induction predicate as a ghost `spec fn` and expose the body-preservation fact through a `proof fn`. For recursive Rust, use `requires` for the induction precondition and `ensures` for the postcondition; for iterative encodings, carry `I` in a loop `invariant`. The paper's sequent context `ξ` has no direct Verus syntax, so it becomes explicit ghost assumptions passed to proof lemmas.

evidence and limits
Theorem 2 proves the fixed-point induction rule semantically by induction over approximant sequences (Section 4.3, pp. 8–9). Unfolding alone is insufficient for unknown recursion bounds, and the overall calculus remains incomplete.

## technique 3: procedure contracts for non-tail recursion
what it is
A fixed point or recursion variable in a non-tail chop position changes the state before the remaining trace, but the base rules do not know that state. The paper adds Hoare-style contracts `(pre,post)` whose postcondition may use fresh `x_old` variables holding the pre-state (Section 5.1, p. 11). Contract validity is encoded as trace inclusion from `pre` through the formula to `post`.

when to use it
Use contracts when a recursive computation appears before another trace formula, such as `µX.Φ⌢Ψ`, and the proof must know the state after `Φ`. Contracts summarize that state without exposing every recursive iteration.

how it is done
1. Choose a precondition and postcondition; for factorial, `(x≥1, y=y_old·x_old! ∧ x=1)` (Example 9, p. 11).
2. Encode validity by copying old variables into the initial state and requiring `pre⌢Φ⌢true` to be included in `Φ⌢post` (Definition 9, p. 11).
3. Add the contract to a contract table with MC or CH-MC; the left premise proves the contract for the body assuming the recursive contract, and the right premise continues the main sequent (Section 5.1, pp. 12–13).
4. Apply a stored contract at a non-tail recursion variable with CH-RVAR or CH-FPI, proving the precondition and substituting old variables into the post-state (Section 5.1, p. 13).

Verus form
Inference: A Verus function contract maps directly to `requires` and `ensures`; old values in postconditions are expressed with Verus's `old(...)` in an `ensures` clause. A ghost proof function can establish recursive contract validity, while executable code remains unchanged. The contract table is an inference-level organization of lemmas, not a Verus keyword.

evidence and limits
Theorem 4 establishes fixed-point induction on contracts, and Theorem 5 states soundness of the contract-extended calculus (Section 5.1, pp. 11–13). The authors note that one contract per procedure is supported; hierarchical multiple contracts are future work (Section 5.1, p. 13).

## technique 4: µ-formula synchronization by grammar inclusion
what it is
Recursive bodies can have the same traces but different chop positions for recursion variables. The synchronization rule maps chop formulas to context-free grammars and permits replacing a succedent fixed point when its regular trace language is included in the original's language (Section 5.2, pp. 14–15). The paper says: “Rule SYNC permits to realign problematic fixed point formulas to synchronize with the antecedent.” (Section 5.2, p. 15.)

how it is done
1. Restrict the formula to a chop formula containing one relation `R` and one free recursion variable `X` (Definition 12, p. 14).
2. Map each disjunctive primitive chop sequence to a grammar production `X→...` (Section 5.2, p. 14).
3. Use the induced regular language to test `L(gr(Ψ′))⊆L(gr(Ψ))` (Figure 12, p. 15).
4. Apply SYNC to replace the succedent fixed point and continue the sequent proof (Section 5.2, p. 15).

Verus form
Inference: Represent the grammar and its language as ghost algebraic data, and prove inclusion with a `proof fn` over finite derivations or a separately verified automaton checker. Verus can verify the resulting inclusion theorem, but the paper's context-free-to-regular construction is not an existing Verus library primitive.

evidence and limits
Theorem 6 proves SYNC sound. It cannot be applied to nested fixed points or arbitrary formulas; general grammar inclusion becomes undecidable, which is a stated source of incompleteness (Section 5.2, pp. 15–16).

## what is proved, measured, and trusted
Theorems 3, 5, and 6 establish soundness of the base, contract, and synchronization rules. Appendix examples prove nontrivial properties of decrementing, factorial, power, and non-tail recursive programs, but the paper reports no runtime benchmark or automation success rate. The calculus trusts the semantic definitions of trace sets, least fixed points, state predicates, and relation interpretations; its soundness proofs are in appendices B–D. Inference: a VL integration would need to decide whether its executable Rust trace model and ghost trace formulas are faithful to actual runtime behavior.

## implications for VL
The paper already covers fixed-point induction, contract summaries for recursive state changes, and grammar-based alignment. Inference: VL should reuse these proof patterns for recursive Rust specifications instead of relying only on pre/postconditions. Inference: threat to agent-written verified Rust is medium: soundness protects each derivation, but incompleteness can make proofs fail or encourage unsound shortcuts if agents replace missing rules with assumptions. No earlier local walkthrough study covers this exact combination of chop, contracts, and µ-synchronization.

## techniques for the catalog
- trace-formula consequence: prove program behavior by inclusion between least-fixed-point trace specifications
- fixed-point induction: use an invariant to prove inclusion for unknown recursive bounds
- procedure contracts: summarize the state after non-tail recursive fixed points with pre/post conditions and old values
- µ-formula synchronization: align recursive bodies by grammar-derived trace-language inclusion
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
