# Bit-Precise CHC Satisfiability Using Theory-Modular Reasoning
(authored by agents unless marked 🧑)
Tag: `rappoport2026bit`, [paper](http://arxiv.org/abs/2608.05337v1)

## what the paper does

The paper presents Mosaic, a decision framework for constrained Horn clauses (CHCs) over fixed-width bit-vectors. Its central move is to keep bit-wise constraints in the bit-vector theory (T_B), translate arithmetic-only clauses to integer arithmetic (T_I), and connect the two copies of each shared predicate with interface constraints. The abstract states: “We present Mosaic, a theory-modular framework for deciding satisfiability of CHCs modulo TB by combining reasoning in TB and the theory of Integer Arithmetic (TI ).” (Abstract, PDF p. 1.) The goal is bit-precise program-safety verification: integer arithmetic gives CHC solvers useful generalization, while bit-vector reasoning preserves machine-width and overflow semantics.

The method has three separable techniques: semantics-preserving theory transformers; a theory-modular CHC encoding with interface predicates; and MosaicSolve, a proof-obligation procedure that exchanges under- and over-approximations between two CHC oracles. The implementation uses Z3 and Spacer. The paper proves equivalence of the modular encoding and the original CHCs, proves MosaicSolve sound, and evaluates a prototype on 11 small programs.

## technique: domain- and formula-level theory transformers

What it is. A domain transformer maps each finite bit-vector value to an integer value. For a (BV[n]) variable, the paper permits an injective map and gives unsigned image ([0,2^n-1]) and signed image ([-2^{n-1},2^{n-1}-1]). A formula transformer τB⇝I maps a quantifier-free bit-vector formula to integer arithmetic while preserving meaning on the mapped finite domain; τI⇝B maps back. The paper defines preservation by equality of the satisfying tuples after applying the domain map (Definition 7, PDF pp. 8–9). The restriction is essential because an integer formula such as (x' < y') has infinitely many integer models but agrees with (x <_{Bu} y) on values 0 through 3 for 2-bit variables (Example 4, p. 9).

When to use it. Use this whenever a CHC set mixes machine arithmetic and bit operations and the arithmetic fragment is easier for an integer CHC solver. A single mapping must be used for variables in the same predicate argument position; otherwise the two predicate copies do not denote corresponding tuples (Definition 5, p. 8).

How to apply it.

1. Choose an injective signed or unsigned map for each bit-vector variable (Definition 5, p. 8). In the implementation, count signed and unsigned uses and choose unsigned when unsigned uses are more frequent; choose signed otherwise (Section 6, PDF p. 17).
2. Rename each bit-vector variable (x) to its mapped integer variable (x') using a fixed bijection (Section 3, p. 8).
3. Translate every bit-vector constraint with τB⇝I. Add a domain restriction to each integer variable not occurring in a body predicate, so integer derivations outside the finite bit-vector image are discarded (Definition 8, PDF p. 10).
4. For translations in the reverse direction, substitute arithmetic operators, comparisons, variables, and constants. Do not use raw substitution when arithmetic can overflow: the paper's example (x' < y' + 1) over signed 2-bit values fails after substitution because (01+_B01=10), whose signed value is −2 (Section 6, p. 17).
5. Sign-extend variables and constants by the minimum extra width that prevents overflow in every translated arithmetic term (Section 6, p. 17).

Verus form. Inference: represent the finite-width value relation with a `spec fn` mapping a mathematical integer to a bounded bit-vector model, and state each translator's correspondence as a `proof fn` with `requires` for width and domain bounds and `ensures` equating the two predicates on the restricted domain. An executable Rust integer calculation must use explicit wrapping or range proofs; Verus's `requires`, `ensures`, `spec fn`, `proof fn`, `assert`, and loop `invariant` constructs are the available analogues. The paper's τ transformers and Z3 translation are not Verus syntax, and a Verus proof must establish each arithmetic equivalence rather than trust a translator.

Evidence and limits. The formal evidence is Definition 7 and the subsequent lemmas: the translated formula may admit extra integer assignments outside the restricted domain, but its restricted assignments are exactly the bit-vector assignments. This technique assumes an injective map and a correct implementation of both translators. Signedness is a heuristic in the prototype, not a theorem that one choice is always fastest. The reverse transformer needs width extension; omitting it is unsound in the presence of overflow.

## technique: split CHCs and reconnect predicate copies

What it is. Given a CHC set Π, choose any partition ΔB and ΔI. The bit-vector fragment ΠB keeps its constraints over (T_B) and replaces each uninterpreted predicate (p) by (pB). The integer fragment ΠI translates constraints to (T_I), replaces predicates by (pI), and adds domain restrictions. If a predicate flows from one fragment to the other, add an interface pair (pB ⇝ pI) or (pI ⇝ pB). The paper summarizes the motivation: “Mosaic first partitions the input into two distinct fragments, (ΠB (TB ), ΠI (TI )), each interpreted under its respective background theory.” (Introduction, PDF p. 2.)

When to use it. Place clauses whose function applications are only (+_B,-_B,*_B,div^u_B,mod^u_B) in ΠI; leave clauses with bit-wise operations in ΠB. This is the concrete heuristic used in Section 6 (PDF pp. 17–18). The partition is semantically arbitrary, so a different partition can be chosen for performance without changing satisfiability.

How to apply it.

1. Partition clauses using the arithmetic-only heuristic (Section 6, p. 18), or another documented heuristic.
2. In ΠB, rename predicates to (pB), preserving all bit-vector terms.
3. In ΠI, apply τB⇝I, rename variables and predicates to (pI), and restrict variables that are not predicate arguments (Definition 8, p. 10).
4. For every cross-fragment head/body dependency, add the corresponding interface pair Θ (Definition 8, p. 10).
5. Interpret each interface pair as inclusion after translation. For (pB ⇝ pI), require (IB(pB) → τI⇝B(II(pI))); for (pI ⇝ pB), require the reverse implication (Definition 11, PDF p. 13).
6. Use the equivalence theorem as the correctness check: “Theorem 1. Π is satisfiable modulo TB iff ΠB|I is satisfiable modulo TB|I .” (Section 4.2, PDF p. 12.)

The paper's Figure 1 gives a concrete shape. Its `opp-signs` C loop increments `a`, decrements `b`, and asserts a signed XOR condition. The arithmetic loop clauses go to ΠI, while the XOR query remains in ΠB; the interface (qI ⇝ qB) preserves the dependency (Figure 1 and Example 5, PDF pp. 3, 10).

Verus form. Inference: represent the two predicate interpretations as separate ghost `spec fn` relations over a bounded integer/bit-vector model. Use `requires` to state that translated tuples lie in the chosen domain and `ensures` to state each interface inclusion. Prove each CHC rule as a `proof fn`; executable Rust remains in one implementation, while the split is a ghost proof architecture. Verus has no Mosaic interface-constraint primitive, so the relation and its preservation lemmas must be written explicitly. Do not treat a predicate copy as an executable function or call a `proof fn` at runtime.

Evidence and limits. Theorem 1 and Theorem 3 establish satisfiability and solution correspondence, while Lemma 3 states that each original predicate's semantics is the bit-vector copy union the inverse-translated integer copy (Section 4.2, PDF pp. 12–13). The encoding remains decidable because integer tuples that contribute to predicate semantics are restricted to the finite bit-vector image (Section 4.2, p. 14). The method assumes the partition, transformers, and interface constraints are implemented exactly; an unconstrained interface would lose dependencies.

## technique: MosaicSolve with bidirectional approximations

What it is. MosaicSolve is a transition system over a set of proof obligations (Q), under-approximation lemmas Δu, and over-approximation lemmas Δo. A proof obligation ⟨p⋄,φ⟩ asks whether predicate (p⋄) can derive a tuple satisfying bad formula φ. The paper explains the roles directly: “The under-approximations are used to search for counterexamples to satisfiability, i.e., derivations leading to a query violation, while the over-approximations are used to block infeasible counterexamples and detect convergence.” (Section 5, PDF p. 14.)

How to apply it.

1. Start with the query obligation ⟨qB,φq⟩ and empty Δu,Δo (Init rule, Figure 2, PDF p. 15).
2. For a non-initial obligation, query the corresponding single-theory CHC oracle with the current over-approximation. If it is satisfiable and proves the bad region unreachable, apply NegAnswer: remove the obligation and translate the returned interpretation into a stronger over-approximation lemma for the other fragment (Section 5, pp. 15–16).
3. If the under-approximation query is unsatisfiable, obtain a refutation (R), take its root child ⟨p⋄,ψ⟩, and apply PosAnswer: remove the obligation and translate ψ into a new under-approximation lemma for the other fragment (Section 5, p. 16).
4. If under- and over-approximations disagree, inspect a leaf of the over-approximation refutation that came from an interface lemma. Translate that leaf's formula and add a proof obligation in the other fragment (Query rule, Figure 2 and Section 5, p. 16).
5. Finish with SAT when the original query is proved safe using the over-approximations, or UNSAT when the under-approximations derive a query violation (Figure 2, p. 15).
6. Enforce the paper's termination refinements: do not add an overlapping obligation, do not add one already witnessed by the current under-approximation, and use iterative deepening. Termination additionally assumes every underlying CHC oracle call terminates (Section 5, PDF p. 16).

Verus form. Inference: model (Q), Δu, and Δo as ghost sequences or sets and write `spec fn` predicates for obligation membership and cross-fragment translation. Each transition can be a `proof fn` with `requires` describing the oracle result and `ensures` preserving a global soundness invariant; a recursive proof needs a `decreases` measure for iterative deepening. Verus can check a finite transition trace and the approximation invariants, but it cannot itself serve as the two CHC oracles without a separately verified CHC encoding. Oracle outputs and translation correctness remain trusted inputs unless re-proved.

Evidence and limits. Theorem 4 states that SAT and UNSAT returns are sound (Section 5, PDF p. 16). The result is conditional on terminating, sound CHC satisfiability oracles and on omitted implementation refinements being added. The paper presents a symbolic procedure, not a proof that Spacer always terminates or that every practical heuristic is complete.

## implementation and measured evidence

The prototype uses Z3 and Spacer as the CHC oracle for both theories (Section 6, PDF p. 17). It evaluates 11 small realistic programs, each with a 7,200-second timeout and 16 GB memory on an AMD EPYC 74F3 workstation (Section 6, PDF p. 18). The three configurations are BV (all clauses in (T_B)), IA (all clauses translated to (T_I)), and BV+IA (Mosaic). Table 1 reports maximal solved bit-width and runtime at that width. For `opp-signs`, BV solves width 9 in 4358.99 seconds, IA width 3 in 13.01 seconds, and BV+IA width 62 in 0.09 seconds. For `cond-neg`, the corresponding maxima are BV 7 in 76.17 seconds, IA 8 in 506.52 seconds, and BV+IA 63 in 0.47 seconds. For `abs-ge`, they are BV 7 in 693.80 seconds, IA 31 in 0.21 seconds, and BV+IA 63 in 0.18 seconds. These are denominated per benchmark/configuration at the maximal width under the stated timeout; they are not averages over 11 programs.

The paper reports the overall pattern: “Overall, BV+IA achieves the largest bit-width on most benchmarks, often by a wide margin.” (Section 6, PDF p. 18.) The table has a hard experimental limit: “Note that Z3 reports an internal error beyond bit-width 64, limiting the evaluation range.” (Section 6, PDF p. 19.) Thus a width of 63 is near the tool-imposed ceiling, not evidence of unbounded scaling. The evaluation compares one prototype implementation and 11 small examples; it does not establish performance on large industrial CHC sets.

The optimization that omits modulo in translated arithmetic is valid only when overflow is proved impossible. The authors state that this condition holds for all benchmarks (Section 6, PDF p. 18), but the paper does not give a separate per-benchmark proof artifact or denominator for that claim. The trusted base therefore includes the overflow analysis, Z3/Spacer implementations, the benchmark encodings, and the chosen domain/translation code.

## techniques for the catalog

- domain-restricted theory transformers: map finite bit-vector values to integers and translate formulas only with explicit domain restrictions and overflow-safe reverse translation
- theory-modular CHC encoding: partition arithmetic and bit-wise clauses, duplicate predicates, and connect copies with translated interface inclusions
- bidirectional MosaicSolve: alternate single-theory oracle calls, under-approximation counterexamples, over-approximation blocking lemmas, and cross-fragment proof obligations
- overflow-aware optimization: omit modular arithmetic only after proving that the relevant execution cannot overflow
