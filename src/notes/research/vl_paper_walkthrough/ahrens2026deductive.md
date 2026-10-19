# Towards a Deductive Verification Infrastructure for Weighted Programming
(authored by agents unless marked 🧑)
Tag: `ahrens2026deductive`, [paper](http://arxiv.org/abs/2608.18971v1)
## scope and core result
This paper defines a deductive infrastructure for weighted programs whose execution traces carry algebraic weights. Its source language is wGCL, its assertion language is wHeyLo, and its intermediate verification language is wHeyVL. The abstract states: “We present a deductive verification framework based on a weighted assertion language and an intermediate verification language.” (Abstract, p. 1). The framework targets costs, probabilities, security clearances, provenance, and formal trace languages through different monoid-modules. The paper reports a prototype using Caesar and case studies for “probabilistic queueing costs, recursive database provenance with cyclic dependencies, clearance bounds for networks of arbitrary size, and formal-language reasoning about lock-freedom of a compare-and-swap counter.” (Abstract, p. 1).

A monoid M supplies trace-weight multiplication; a module W supplies commutative aggregation and scalar multiplication by elements of M. The tropical instance uses `(N∞, +, 0)` and `(N∞, min, ∞, +)` for optimization; the probability instance uses finite nonnegative real scalars and extended nonnegative real module values, with multiplication and addition; the formal-language instance uses concatenation and language union (Section 2.1, pp. 4–5). Weakest preweighting `wp` combines terminating executions and their final postweightings; `wlp` also accounts for nontermination (Section 2.3, p. 7). The paper says: “For the tropical monoid-module, this is the minimal cost among all non-deterministic execution traces.” (Section 1, p. 2).

## technique: weighted weakest-preweighting semantics

What it is and when to use it

Assign a monoid weight to each trace step and an additive module operation to alternatives, then reason backwards with `wp`. Use it when the desired property is quantitative or symbolic and ordinary Boolean postconditions lose the information of costs, probabilities, provenance, or traces.

How to do it

1. Choose a monoid-module and verify its algebraic laws and ω-continuity for `wp`; the framework requires ω-bicontinuity for both bound directions (Definitions 2.1–2.3, pp. 4–5)
2. Express weighted commands with `⊗ m` (scalar multiplication) and `{C1} ⊕ {C2}` (trace aggregation), using the wGCL grammar in Figure 3 (Section 2.2, p. 5)
3. Define the state weighting and calculate `wp` backwards through assignment, sequencing, weighting, branching, and loops (Definitions 2.6–2.7, pp. 6–7)
4. Read the resulting weighting in the chosen domain: minimum cost for tropical, a weighted sum of postvalues for probability, or a language for formal-language weights

The ski-rental example chooses renting for one day or buying for `y`; with daily rental cost 1 and postweighting 0, the optimal cost is `min{n,y}` (Figure 1a, p. 2; Section 5.3, p. 17). The CAS example multiplies failures by `F_i` and successes by `S_i` and uses a language module to reason about lock-freedom (Figure 1b, p. 2).

Verus form

Inference: model the weight domain as a ghost datatype or mathematical function, represent trace aggregation with recursive ghost functions, and prove the backward transformer as a lemma relating a program’s postcondition to its precondition. Use `spec fn`, `requires`, `ensures`, and proof lemmas; keep the weighted interpretation in ghost/specification code. The paper’s `wp` is semantic mathematics, not a Verus runtime call.

Evidence and limits

The paper proves that `wp` is well-defined and ω-continuous (Theorem 2.9, p. 7). This is a semantic theorem, not a measured accuracy number. Theorem 2.9 assumes ω-continuity; the liberal counterpart uses ω-cocontinuity (Definition A.7 and Theorem A.8, pp. 30–31). Inference: an implementation must separately establish that its algebra and transformer represent these definitions.

## technique: quantitative assertions and dual verification language

What it is and when to use it

Use wHeyLo formulas over a bi-Heyting algebra to express both lower and upper bounds. Use wHeyVL to encode commands and proof obligations in an imperative intermediate form suitable for verification-condition generation.

How to do it

1. Use an ω-bicontinuous module whose natural order forms a bounded lattice with Heyting implication and coimplication (Sections 3–4, pp. 7–11)
2. Write weighted assertions with conjunction/disjunction, implication/coimplication, quantitative infimum/supremum, and validation/covalidation (Definition 4.1, p. 11)
3. Translate loop-free wGCL commands with Figure 7: assignment stays assignment, `⊗ m` becomes `weigh m`, weighted choice becomes `if (+)`, and ordinary conditionals become guarded demonic branches (Figure 7, p. 14)
4. Use `proc` for lower-bound obligations `pre ρ; post ψ` and `coproc` for upper-bound obligations (Figure 6 and Definition 4.3, p. 13)
5. Generate the verification condition `⊤ ≡ ρ → vp⟦C⟧(ψ)` for a procedure or `⊥ ≡ ρ ← vp⟦C⟧(ψ)` for a coprocedure (Section 4, p. 13)

The verification-preweighting table defines: `assert ψ` takes a meet, `assume ψ` uses implication, `havoc x` takes an infimum over x, and `validate` booleanizes a quantitative check; the dual statements use joins, coimplication, supremum, and covalidation (Table 2, p. 12). Theorem 5.1 proves loop-free encodings exact: `vp⟦enc(C)⟧(φ) = wp⟦C⟧(φ)` (Section 5, p. 13).

Verus form

Inference: represent a lower-bound procedure as a Rust function with `requires` and `ensures`, and an upper-bound check as a separate lemma or predicate. Encode `havoc` as universally quantified ghost choices, while preserving frame conditions with explicit unchanged-state predicates. Verus has no wHeyVL `proc`/`coproc`; these are conceptual layers around ordinary verified functions.

Evidence and limits

Theorem 4.2 states that wHeyLo semantics are well-defined for an ω-bicontinuous bi-Heyting module (Section 4, p. 11). The exactness theorem covers loop-free code only; loops require the proof rules below. Section 7.1 describes translations of selected instances into Caesar (pp. 22–23); Appendix E also covers tropical costs. The Why translation supports a restricted fragment, and the language translations distinguish exact rules from one-sided approximations (Table 3, p. 73).

## technique: specification statements for modular abstraction

A specification statement `β : [ρ, ψ]` abstracts a block that modifies only variables β and satisfies a pre/post weighting relation (Definition 5.2, p. 14). Use it when verifying components separately or refining an abstract specification into implementation. The paper explains: “This is key to modular verification, where we verify components of a program separately and then analyse the derived specification statements to verify the whole program.” (Section 5.1, p. 14).

Apply it as follows: (1) list modified/local variables β; (2) assert the lower-bound preweighting ρ; (3) havoc β to quantify arbitrary reachable local states; (4) validate the postcondition implication; (5) assume ψ and continue. The encoding is `assert ρ; havoc β; validate; assume ψ` (Figure 7, p. 14). Reachability is defined by preserving every variable outside β (Definition 5.3, p. 14), and Lemma 5.4 gives the exact piecewise semantics: the result is ρ when ψ entails the desired post in every β-reachable state, otherwise bottom (p. 14).

Inference: in Verus, use a function contract and a frame predicate stating which fields may change; prove callers against the contract without exposing the body. A Rust ghost snapshot can represent unchanged variables. The paper’s arbitrary `havoc` is an abstraction, so concrete Rust implementations must separately prove refinement.

## technique: local Park induction

Park induction proves a lower bound on `wlp` from a subinvariant, or an upper bound on `wp` from a superinvariant. The local variant restricts reasoning to a state set closed under modifications of β; variables outside β retain their values (Section 5.3, pp. 16–17).

Steps: (1) identify loop-local variables β; (2) choose a state set Γ closed under β-reachability; (3) restrict weightings and the order pointwise to Γ (Definition 5.9, p. 16); (4) prove `I ⊑Γ Ψ_f(I)` for the loop characteristic transformer; (5) conclude `I ⊑Γ wlp⟦while b {C'}⟧(f)` by Theorem 5.11 (p. 17); (6) encode the check with `parkEnc` (Figure 8, p. 15).

The ski-rental counterexample shows why locality matters: with `n=4`, `y=6`, and daily rental cost `c=2`, the candidate invariant has value 4 but its characteristic-transformer image has value 5. The required tropical-order inequality fails: `4 ≱ 5`. Restricting Γ to states with `c=1` makes the invariant valid (Section 5.3, p. 17). Here the fixed rental cost is essential to the invariant.

Inference: in Verus, maintain a loop invariant over mutable variables and include immutable parameters in the invariant’s assumptions without quantifying impossible states. Use `while` invariants and lemma calls; Verus does not have `parkEnc` or a weighting transformer.

## technique: local κ-induction and ω-rule

κ-induction relaxes one-step inductivity. For lower bounds on `wlp`, define `Λ(X) = I ⊔ Ψ_f(X)` and prove `I ⊑Γ Ψ_f(Λ^κ(I))` on a state set Γ closed under β-reachability; Theorem 5.14 then yields `I ⊑Γ wlp⟦C⟧(f)` (Definition 5.13 and Theorem 5.14, p. 18). Encode this with `specEnc(β:[I,I]); κ-unrollEnc(C,β,I)`, which inserts `coassert I` during unrolling (Figure 9, p. 18; Section 5.4, p. 19). The dual gives upper bounds on `wp`. The queueing case uses κ=2, local variables `{k,e,b}`, and invariant `e + 4·k + 16·[b ≠ b0]`; it derives `wp⟦CQ⟧(e) ⊑ e0 + 4·k0` (Section 6.3, p. 22). This is a symbolic expected-cost bound for a queue of length k.

Finite loop unrolling yields lower bounds on `wp` from `Φ_f^n(⊥)`; the dual yields upper bounds on `wlp` (Lemma 5.6, p. 15; Section 5.2, p. 16). The ω-rule extends this to an infinite family: choose an ascending chain `I_n`, prove `I_0 = ⊥` and `I_(n+1) ⊑ Φ_f(I_n)` for every n, and conclude `sup_n I_n ⊑ wp⟦C⟧(f)` (Theorem 5.15, p. 19). The encoding checks separate base and step procedures and takes a supremum with `cohavoc n; assert I(n); assume ?(false)` (Figure 10, p. 19; Section 5.5, p. 20). Dually, a descending chain with `I_0 = ⊤` and `Ψ_f(I_n) ⊑ I_(n+1)` gives an infimum upper bound on `wlp`. For CAS, the paper defines languages `L_n` containing words with at most N consecutive failures in the first n steps, proves `wlp(CCAS)(⊥) ⊑ inf_n L_n`, and concludes lock-freedom (Section 6.2, p. 21). This rule assumes the quantified family’s obligations are valid for all n.

Inference: encode κ-induction as a Verus lemma parameterized by a natural step count and encode the ω-rule as a quantified invariant over finite prefixes. Verus termination and quantifier triggers become additional proof obligations.

## technique: quantifier elimination for automation

Quantitative infimum and supremum quantifiers arise from `havoc` and loop encodings and are difficult for SMT solvers. The proof moves supported quantifiers to the front and strips leading infima for validity or suprema for covalidity. The implemented procedure instead traverses top-down, replaces eliminated bound variables with fresh free variables, switches direction in implication antecedents, and stops at unsupported constructs (Section 7.2, pp. 23–25; Figure 13, p. 24).

For a Park condition, first transform `ρ → (I ⊓ inf_x △(Ψ))` into `inf_x (ρ → (I ⊓ △(Ψ)))`; then use Quantifier Stripping Theorem 7.1, which says validity is preserved when the leading infimum is removed (p. 24). Rename bound variables first, and require that x is not free in ρ or I (Section 7.2, p. 23). Figure 13 defines `qelim↓` for validity and `qelim↑` for covalidity. Theorem 7.2 preserves validity/covalidity under `always`, `W+`, `Wx`, and `extra`: weighted addition preserves binary meets and joins, and scalar maps preserve binary joins and meets (p. 24, footnote 10). These extra preservation laws do not follow merely from the bi-Heyting structure (Appendix D.1.2, pp. 57–65). The procedures run in linear time when fresh-variable renaming is combined with traversal (p. 25, footnote 11). Theorem 7.3 gives fragments where all quantifiers are eliminated, including quantifiers introduced by the specification-statement, Park, and κ-induction encodings (p. 25).

Verus form

Inference: simplify quantified ghost formulas before sending them to Verus’s SMT backend, preserving validity conditions and introducing fresh ghost variables only when the equivalence is proved. Verus’s triggers and quantifier syntax differ; the paper’s qelim procedures cannot be copied as Rust code without re-proving their soundness.

## evidence, trust, and product implications

The four case-study families are queueing costs, database provenance, security clearances, and CAS lock-freedom (Section 6, pp. 20–22). Section 6.1 derives clearance P at distance 0, C at distance 1, and S at distances at least 2 (p. 21). Section 6.4 proves the provenance lower bound `X1 ∧ X2 ∧ X3 ∧ X4 ⊑ wlp⟦C_GR⟧(⊤)` (p. 22); Inference: this lower bound establishes one explanation; it does not establish equality with the full provenance. The conclusion states: “Future work includes a native implementation, automated invariant generation, and support for higher moments and multiple objectives.” (Section 9, p. 26). The CAS lowering also has a concrete limitation: “In Caesar, this example still has to be instantiated to a concrete finite nondeterministic choice.” (Appendix E.1.2, p. 78).

Inference: a Verus implementation could reuse modular contracts, local loop reasoning, finite-step induction, and quantifier simplification. Its correctness would still depend on faithful algebra, specifications, translations, and verification tools. The paper’s theorems do not establish Rust memory safety or validate an arbitrary Verus implementation.

## techniques for the catalog
- weighted weakest-preweighting — compute quantitative or symbolic trace aggregates backwards over a monoid-module
- wHeyLo/wHeyVL dual contracts — encode lower and upper bounds with quantitative assertions and procedures/coprocedures
- specification statements — abstract modified variables with pre/post weightings and modular frame reasoning
- local Park induction — prove loop bounds on a state space closed under local-variable reachability
- κ-induction and ω-rule — establish finite-step and infinite-family loop bounds
- quantifier elimination — prenex, strip, and recursively remove supported quantitative quantifiers before SMT solving
