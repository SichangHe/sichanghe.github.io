# A Sequent Calculus For Trace Formula Implication
(authored by agents unless marked 🧑)
Tag: `heidler2025sequent`, [paper](http://arxiv.org/abs/2505.03693v3)

## problem and contribution
The paper studies implication between trace formulas for recursive imperative programs. Trace formulas use conjunction, disjunction, chop, binary state relations, and least fixed points. They denote sets of finite traces. Theorem 1 gives each Rec program a strongest formula denoting exactly its traces; consequently, `S:Φ` can be proved by showing `stf(S) |= Φ` (Sections 1 and 3, pp. 2, 4). The abstract says: “We present a sound sequent calculus for proving implication (i.e. trace inclusion) between trace formulas.” (Abstract, p. 1.) The paper does not establish completeness: “While this does not yet result in a complete calculus for trace formula implication, it is possible to prove many non-trivial properties.” (Abstract, p. 1.)

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
Inference: A possible Verus adaptation would define ghost states, finite traces, and formula semantics, then prove inclusion with proof functions. The paper studies Rec, not Rust or Verus, and does not supply this adaptation.

evidence and limits
The trace logic is at least as expressive as the Rec language because strongest formulas can be constructed effectively (Section 3, p. 4). Its consequence problem is highly undecidable because formulas are as expressive as recursive programs (Introduction, p. 2).

## technique 2: fixed-point unfolding, lengthening, and induction
what it is
The base calculus unfolds a µ-formula in the antecedent or succedent with UNFL and UNFR, and repeats its body with LENL and LENR. Unfolding handles concrete recursion bounds; lengthening substitutes repeated copies of the body inside a fixed point without changing its denotation (Section 4.2, pp. 7–8; Theorem 9, p. 23). For unknown or very high bounds, rule FPI uses an invariant `I` to prove inclusion between two fixed points.

when to use it
Use unfolding when the current state gives a finite recursion depth. Use induction when recursion depth is unknown; repeated unfolding may never terminate (Section 4.3, p. 8). Use lengthening before induction when recursive-variable positions or trace lengths differ.

how it is done
1. For a concrete bound, replace `µX.Φ` with `Φ[µX.Φ/X]` using UNFL or UNFR (Section 4.2, p. 7).
2. Define `repeat_0(Φ)=Φ` and `repeat_i(Φ)=Φ[repeat_(i−1)(Φ)/X]`. LENL/LENR replace `µX.Φ` by `µX.repeat_i(Φ)` for `i≥1` during backward proof search (Section 4.2, pp. 7–8).
3. Choose an invariant predicate `I` and prove the initial state satisfies it (`PΓ⊢I`) (Section 4.3, p. 9).
4. Under the recursion-variable assumption `(X1|I,X2)`, prove the body inclusion `I,Φ⊢Ψ` (Section 4.3, p. 9).
5. Conclude `Γ,µX1.Φ⊢µX2.Ψ` with FPI (Figure 6, p. 9).

The factorial example proves that `y` never decreases after initialization, or the initial value of `x` is negative. The derivation first lengthens the increment formula by three to align the recursive bodies, then applies FPI (Example 8, pp. 9–10). Theorem 3 states that the base rules are sound (Section 4.3, p. 10).

Verus form
Inference: A Verus adaptation would need a proved induction lemma over the chosen trace semantics. Its premises should represent the initial invariant and the conditional body inclusion; function pre/postconditions alone do not supply this semantic theorem.

evidence and limits
Theorem 2 proves the fixed-point induction rule semantically by induction over approximant sequences (Section 4.3, pp. 8–9). Unfolding alone is insufficient for unknown recursion bounds, and the overall calculus remains incomplete.

## technique 3: procedure contracts for non-tail recursion
what it is
A fixed point or recursion variable in a non-tail chop position changes the state before the remaining trace, but the base rules do not know that state. The paper adds Hoare-style contracts `(pre,post)` whose postcondition may use fresh `x_old` variables holding the pre-state (Section 5.1, p. 11). Definition 9 encodes contract validity as trace inclusion with initial-state predicates and matching copies of the formula on both sides (p. 11).

when to use it
Use contracts when a recursive computation appears before another trace formula, such as `(µX.Φ)⌢Ψ`, and the proof must know the state after the fixed point. Contracts summarize that state without exposing every recursive iteration.

how it is done
1. Choose a precondition and postcondition; for factorial, `(x≥1, y=y_old·x_old! ∧ x=1)` (Example 9, p. 11).
2. For all program variables `v_i` in `Φ`, introduce fresh `v_old_i` and prove `⟦(∧_i v_old_i=v_i) ∧ pre ∧ (Φ⌢true)⟧_V ⊆ ⟦Φ⌢post⟧_V`. The initial equalities and `pre` are conjoined with the trace formula; they are not extra chop segments (Definition 9, p. 11).
3. Add the contract to a contract table with MC or CH-MC; the left premise proves the contract for the body assuming the recursive contract, and the right premise continues the main sequent (Section 5.1, pp. 12–13).
4. Use CH-RVAR for a non-tail recursion variable, or CH-FPI for a non-tail fixed point. Prove the required recursion constraint or invariant together with `pre`; for the remaining trace, rename the variables in the current predicates to their old-variable names and add `post` (Figure 9 and its explanation, pp. 12–13).

Verus form
Inference: A possible Verus adaptation would use function pre/postconditions and explicit pre-state values to summarize recursive calls. It would still need to prove that those summaries preserve the intended trace properties; the paper does not establish a translation to Verus contracts.

evidence and limits
Theorem 4 establishes fixed-point induction on contracts, and Theorem 5 states soundness of the contract-extended calculus (Section 5.1, pp. 11–13). Contracts are restricted to procedure-generated fixed point formulas in `stf(P)` (p. 12). The authors state: “It is future work to extend the calculus to support multiple contracts for procedures by applying contracts in a hierarchical fashion.” (Section 5.1, p. 13.)

## technique 4: µ-formula synchronization by grammar inclusion
what it is
Recursive bodies can have the same traces but different chop positions for recursion variables. The synchronization rule maps chop formulas to context-free grammars and permits using a new succedent fixed point as a proof obligation when its grammar language is included in the original's language (Section 5.2, pp. 14–15). The paper says: “Rule SYNC permits to realign problematic fixed point formulas to synchronize with the antecedent.” (Section 5.2, p. 15.)

how it is done
1. Restrict both bodies `Ψ` and `Ψ′` to disjunctions of primitive chop sequences over the same fixed relation `R` and recursion variable `X`; occurrences of `X` are unbound in these bodies (Definition 12, p. 14).
2. Map each disjunctive primitive chop sequence to a grammar production `X→...` (Section 5.2, p. 14).
3. Establish `L(gr(Ψ′))⊆L(gr(Ψ))`. Each grammar has a single terminal symbol, so its language is regular by the paper's application of Parikh's theorem (p. 14; Figure 12, p. 15).
4. To prove a sequent with `µX.Ψ` in the succedent, prove the corresponding sequent with `µX.Ψ′` there instead. The language inclusion justifies this direction (Figure 12, p. 15).

Verus form
Inference: A Verus adaptation could represent grammar derivations as ghost data and prove the required inclusion and its connection to trace semantics. This is a proposed proof obligation, not a Verus implementation supplied or evaluated by the paper.

evidence and limits
Theorem 6 proves SYNC sound. The body restriction excludes nested fixed points. The authors state: “Direct generalization of grammar-based alignment leads to the inclusion problem of context-free grammars which is undecidable.” (Section 7, p. 16.)

## what is proved, measured, and trusted
Theorems 3, 5, and 6 establish soundness of the base, contract, and synchronization rules. Appendix examples prove nontrivial properties of decrementing, factorial, power, and non-tail recursive programs, but the paper reports no runtime benchmark or automation success rate. The soundness proofs are in Appendices B–D. Appendix B.1 also gives a counterexample to the proposed CH-∧R rule, whose unsoundness the authors report having formalized in Isabelle/HOL (Theorem 7, p. 21).

## techniques for the catalog
- trace-formula consequence: prove program behavior by inclusion between least-fixed-point trace specifications
- fixed-point induction: use an invariant to prove inclusion for unknown recursive bounds
- procedure contracts: summarize the state after non-tail recursive fixed points with pre/post conditions and old values
- µ-formula synchronization: align recursive bodies by grammar-derived trace-language inclusion
