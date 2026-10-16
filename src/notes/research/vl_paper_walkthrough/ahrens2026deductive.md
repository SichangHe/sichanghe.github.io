# Towards a Deductive Verification Infrastructure for Weighted Programming
(authored by agents unless marked 🧑)
Tag: `ahrens2026deductive`, [paper](http://arxiv.org/abs/2608.18971v1)
## scope and core result
This paper defines a deductive infrastructure for weighted programs whose execution traces carry algebraic weights. Its source language is wGCL, its assertion language is wHeyLo, and its intermediate verification language is wHeyVL. The abstract states: “We present a deductive verification framework based on a weighted assertion language and an intermediate verification language.” (Abstract, p. 1). The framework targets costs, probabilities, security clearances, provenance, and formal trace languages through different monoid-modules. The paper’s prototype is implemented in Caesar and checks case studies for “probabilistic queueing costs, recursive database provenance with cyclic dependencies, clearance bounds for networks of arbitrary size, and formal-language reasoning about lock-freedom of a compare-and-swap counter.” (Abstract, p. 1).

The algebra is a prerequisite, not a modeling detail. A monoid M supplies sequential scalar multiplication and a module W supplies commutative aggregation. The tropical instance uses `(N∞, +, 0)` and `(N∞, min, ∞, +)` for optimization; the probability instance uses nonnegative real multiplication and addition; the formal-language instance uses concatenation and language union (Section 2.1, pp. 4–5). Weakest preweighting computes the aggregate weight of all executions from a state. The paper says: “For the tropical monoid-module, this is the minimal cost among all non-deterministic execution traces.” (Section 1, p. 2).

Inference: for VL, this is a design pattern for verifier infrastructure rather than a drop-in Rust library. Verus itself reasons about ordinary specifications, so the weighted algebra must be represented by ghost state, predicates, and lemmas.

## technique: weighted weakest-preweighting semantics

What it is and when to use it

Assign a monoid weight to each trace step and an additive module operation to alternatives, then reason backwards with `wp`. Use it when the desired property is quantitative or symbolic and ordinary Boolean postconditions lose the information of costs, probabilities, provenance, or traces.

How to do it

1. Choose a monoid-module and verify its algebraic laws and ω-continuity assumptions (Definitions 2.1–2.3, pp. 4–5)
2. Express weighted commands with `weigh m` (scalar multiplication) and `{C1} ⊕ {C2}` (trace aggregation), using the wGCL grammar in Figure 3 (Section 2.2, p. 5)
3. Define the state weighting and calculate `wp` backwards through assignment, sequencing, weighting, branching, and loops (Definitions 2.6–2.7, pp. 6–7)
4. Read the resulting weighting in the chosen domain: minimum cost for tropical, expected mass for probability, or a language for formal-language weights

The ski-rental example chooses renting for one day or buying for `y`; the weighted program returns the minimum cost over `n` days (Figure 1a, p. 2; Example 2.5, p. 6). The CAS example multiplies failures by `F_i` and successes by `S_i` and uses a language module to reason about lock-freedom (Figure 1b, p. 2).

Verus form

Inference: model the weight domain as a ghost datatype or mathematical function, represent trace aggregation with recursive ghost functions, and prove the backward transformer as a lemma relating a program’s postcondition to its precondition. Use `spec fn`, `requires`, `ensures`, and proof lemmas; keep the weighted interpretation in ghost/specification code. The paper’s `wp` is semantic mathematics, not a Verus runtime call.

Evidence and limits

The paper proves that `wp` is well-defined and ω-continuous (Theorem 2.9, p. 7). This is a semantic theorem, not a measured accuracy number. It assumes an ω-continuous or ω-bicontinuous module; unsupported algebras do not inherit the result. The source language and semantics remain trusted mathematical definitions.

## technique: quantitative assertions and dual verification language

What it is and when to use it

Use wHeyLo formulas over a bi-Heyting algebra to express both lower and upper bounds. Use wHeyVL to encode commands and proof obligations in an imperative intermediate form suitable for verification-condition generation.

How to do it

1. Instantiate the module as a bounded lattice with Heyting implication and coimplication (Section 3, pp. 8–10)
2. Write weighted assertions with conjunction/disjunction, implication/coimplication, quantitative infimum/supremum, and validation/covalidation (Definition 4.1, p. 11)
3. Translate loop-free wGCL commands with Figure 7: assignment stays assignment, `weigh` becomes `weigh`, weighted choice becomes `if (+)`, and ordinary conditionals become guarded demonic branches (Section 5, p. 13)
4. Use `proc` for lower-bound obligations `pre ρ; post ψ` and `coproc` for upper-bound obligations (Figure 6 and Definition 4.3, p. 13)
5. Generate the verification condition `⊤ ≡ ρ → vp⟦C⟧(ψ)` for a procedure or its dual for a coprocedure (Section 4, p. 13)

The semantics table gives the operational shapes: `assert ψ` takes a meet, `assume ψ` uses implication, `havoc x` takes an infimum over x, and `validate` booleanizes a quantitative check; the dual statements use joins, coimplication, supremum, and covalidation (Table 2, p. 12). Theorem 5.1 proves loop-free encodings exact: `vp⟦enc(C)⟧(φ) = wp⟦C⟧(φ)` (Section 5, p. 13).

Verus form

Inference: represent a lower-bound procedure as a Rust function with `requires` and `ensures`, and an upper-bound check as a separate lemma or predicate. Encode `havoc` as universally quantified ghost choices, while preserving frame conditions with explicit unchanged-state predicates. Verus has no wHeyVL `proc`/`coproc`; these are conceptual layers around ordinary verified functions.

Evidence and limits

Theorem 4.2 states that wHeyLo semantics are well-defined for an ω-bicontinuous bi-Heyting module (Section 4, p. 11). The exactness theorem covers loop-free code only; loops require the proof rules below. The prototype translates probability, Why provenance, clearance, and formal languages to Caesar (Section 7.1, pp. 22–23).

## technique: specification statements for modular abstraction

A specification statement `β : [ρ, ψ]` abstracts a block that modifies only variables β and satisfies a pre/post weighting relation (Definition 5.2, p. 14). Use it when verifying components separately or refining an abstract specification into implementation. The paper states that such statements “enable implementation abstraction” and are “key to modular verification” (Section 5.1, p. 14).

Apply it as follows: (1) list modified/local variables β; (2) assert the lower-bound preweighting ρ; (3) havoc β to quantify arbitrary reachable local states; (4) validate the postcondition implication; (5) assume ψ and continue. The encoding is `assert ρ; havoc β; validate; assume ψ` (Figure 7, p. 14). Reachability is defined by preserving every variable outside β (Definition 5.3, p. 14), and Lemma 5.4 gives the exact piecewise semantics: the result is ρ when ψ entails the desired post in every β-reachable state, otherwise bottom (p. 14).

Inference: in Verus, use a function contract and a frame predicate stating which fields may change; prove callers against the contract without exposing the body. A Rust ghost snapshot can represent unchanged variables. The paper’s arbitrary `havoc` is an abstraction, so concrete Rust implementations must separately prove refinement.

## technique: local Park induction

Park induction proves loop bounds by finding an invariant I that is a subinvariant. The local variant restricts reasoning to states closed under modifications β, excluding irrelevant constant variables (Section 5.3, pp. 16–18).

Steps: (1) identify loop-local variables β; (2) choose a state set Γ closed under β-reachability; (3) restrict weightings and the order pointwise to Γ (Definition 5.9, p. 17); (4) prove `I ⊑Γ Ψ_f(I)` for the loop characteristic transformer; (5) conclude `I ⊑Γ wlp⟦while b {C'}⟧(f)` by Theorem 5.11 (p. 17); (6) encode the check with `parkEnc` (Figure 8, p. 16).

The ski-rental counterexample shows why locality matters: with `n=4`, `y=6`, and unrelated `c=2`, global reasoning gives `4 ≰ 5`; restricting Γ to states with `c=1` makes the invariant valid (Section 5.3, p. 17). This is an exact example, not a benchmark percentage.

Inference: in Verus, maintain a loop invariant over mutable variables and include immutable parameters in the invariant’s assumptions without quantifying impossible states. Use `while` invariants and lemma calls; Verus does not have `parkEnc` or a weighting transformer.

## technique: local κ-induction and ω-rule

κ-induction strengthens loop reasoning by checking a finite κ-step characteristic transformer. The paper defines κ-induction in Definition 5.13 and proves soundness in Theorem 5.14 (pp. 18–19). Apply it by selecting κ, constructing an invariant I, proving the κ-step obligation with local state restriction, and using `κ-Enc` to encode the obligation. The queueing case uses κ=2, local variables `{k,e,b}`, and invariant `e + 4·k + 16·[b ≠ b0]`; it derives `wp⟦CQ⟧(e) ⊑ e0 + 4·k0` (Section 6.3, p. 22). The denominator here is not a benchmark; it is a symbolic bound for a queue of length k.

The ω-rule proves a bound from an infinite family of finite approximants. Define a sequence `I_n`, prove the base case and step relation for every n, and conclude the infimum/supremum bound using Theorem 5.15 (Section 5.5, pp. 20–21). For CAS, the paper defines languages `L_n` containing words with at most N consecutive failures in the first n steps, proves `wlp(CCAS)(⊥) ⊑ inf_n L_n`, and concludes lock-freedom (Section 6.2, pp. 21–22). This rule assumes the quantified family’s obligations are valid for all n.

Inference: encode κ-induction as a Verus lemma parameterized by a natural step count and encode the ω-rule as a quantified invariant over finite prefixes. Verus termination and quantifier triggers become additional proof obligations.

## technique: quantifier elimination for automation

Quantitative infimum and supremum quantifiers arise from `havoc` and loop encodings and are difficult for SMT solvers. The paper’s method prenexes supported quantifiers, strips leading infima for validity or suprema for covalidity, and recursively removes them with fresh variables (Section 7.2, pp. 23–25).

For a Park condition, first transform `ρ → (I ⊓ inf_x △(Ψ))` into `inf_x (ρ → (I ⊓ △(Ψ)))`; then use Quantifier Stripping Theorem 7.1, which says validity is preserved when the leading infimum is removed (p. 24). Figure 13 defines `qelim↓` for validity and `qelim↑` for covalidity. The procedures recurse once over each subformula, run in linear time, and replace eliminated variables with fresh free variables (Theorem 7.2 and following text, p. 25). Theorem 7.3 gives fragments where all quantifiers are eliminated.

Verus form

Inference: simplify quantified ghost formulas before sending them to Verus’s SMT backend, preserving validity conditions and introducing fresh ghost variables only when the equivalence is proved. Verus’s triggers and quantifier syntax differ; the paper’s qelim procedures cannot be copied as Rust code without re-proving their soundness.

## evidence, trust, and product implications

The Caesar prototype evaluates four case-study families: queueing costs, database provenance, security clearances, and CAS lock-freedom (Section 6, pp. 20–23). The paper reports proofs and derived symbolic bounds, not a denominator-based success rate. Trusted elements include the algebraic module instance, source semantics, translation correctness assumptions, Caesar, and SMT solver behavior. Inference: an agent-written Verus product should reuse modular contracts, local loop reasoning, finite-step induction, and verifier-oriented quantifier simplification. It should not treat weighted results as evidence of Rust memory safety or specification correctness. The main product threat is a wrong algebra/specification or an unsound translation layer; the paper’s soundness theorems address the stated mathematical semantics, not an arbitrary Rust implementation.

## techniques for the catalog
- weighted weakest-preweighting — compute quantitative or symbolic trace aggregates backwards over a monoid-module
- wHeyLo/wHeyVL dual contracts — encode lower and upper bounds with quantitative assertions and procedures/coprocedures
- specification statements — abstract modified variables with pre/post weightings and modular frame reasoning
- local Park induction — prove loop bounds on a state space closed under local-variable reachability
- κ-induction and ω-rule — establish finite-step and infinite-family loop bounds
- quantifier elimination — prenex, strip, and recursively remove supported quantitative quantifiers before SMT solving
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
