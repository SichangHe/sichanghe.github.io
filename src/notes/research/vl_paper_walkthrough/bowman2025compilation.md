# Compilation as Multi-Language Semantics
(authored by agents unless marked 🧑)
Tag: `bowman2021compilation`, [paper](https://arxiv.org/abs/2509.19613v1)

## purpose and model
This three-page extended abstract presents a work-in-progress reduction system that models source execution, compilation, and target execution together. Its reference format gives 2021; the arXiv upload is dated 23 September 2025 (p. 1). The concrete instance translates a Scheme-like source language to A-normal form (ANF), within a five-pass model compiler from a Scheme-like language to an x86-64-like language. Bowman writes: “We introduce a novel work-in-progress approach to uniformly model both variants as a single reduction system on open terms in a multi-language semantics.” The two variants are syntactic translation on open terms and run-time translation of closed terms at language boundaries (p. 1, §1).

## technique 1: embed languages with explicit boundaries
Extend the syntax with `(SA A.e)` (source outside, ANF inside) and `(AS S.e)` (ANF outside, source inside). The source language has a heap-based call-by-value small-step semantics. In ANF, computations take values as operands, and expressions explicitly sequence intermediate computations; its reduction relation does not require a control stack (p. 1, §1, Fig. 1).

Steps: embed both languages in one syntax; add the boundary constructors; combine source execution, target execution, and translation in the multi-language reduction relation. Cancel adjacent opposite boundaries using `C[(AS (SA A.e))] →ˢᵗ C[A.e]` and `C[(SA (AS S.e))] →ˢᵗ C[S.e]`. Here `C` is any multi-language context. Bowman states: “These apply under any multi-language context C.” (p. 1, §1; p. 2, Figs. 3 and 5).

Inference: for a Verus model of an interacting source and target language, explicit boundary constructors could make language crossings visible in the modeled state. The paper supplies no Verus encoding.

## technique 2: treat compilation as normalization
Define A-reductions `→ᵃ` that rewrite source expressions in source evaluation contexts while making boundary transitions explicit. Figure 2 includes A-normal, let and begin merging, conditional joining, and computation lifting. Bowman explains: “Each A-reduction rewrites a source expression in a source evaluation context, transforming the control stack into a data stack.” Lifting introduces a fresh let-bound name; joining introduces fresh names for a function that represents the evaluation context. Side conditions prevent A-reductions of target redexes and in empty evaluation contexts (p. 1, §1; p. 2, Fig. 2).

Extend A-reductions under translation contexts `T` and include boundary cancellation, giving the distinct translation relation `ˢ→ᵃ` (p. 2, Fig. 4). Define AOT compilation `S.e ⇓ᵃⁿᶠ A.e` by requiring both `(AS S.e) ˢ→ᵃ* A.e` and that `A.e` admits no further translation reduction (p. 2, Definition 1). Bowman writes: “For example, we get a model of ahead-of-time (AOT) compilation by normalizing cross-language redexes; the normal form with respect to these redexes is a target language term.” (p. 1, §1).

Inference: a verified compiler following this definition would need to establish that its chosen translation strategy reaches the required normal form; reaching an intermediate term alone does not satisfy Definition 1.

## technique 3: model JIT as nondeterministic multi-language reduction
Figure 5 combines source interpretation, target execution, execution inside a boundary, and translation. Bowman writes: “We model just-in-time (JIT) compilation as nondeterministic evaluation in the multi-language: a term can either step in the source, or translate then step in the target.” (p. 1, §1; p. 2, Fig. 5).

Steps: start with a heap and a multi-language term; choose an applicable source, translation, or target step; continue using the combined relation. Translation leaves the heap unchanged, while source and target execution may update it. The model assumes identical language memory models: “Note that terms already in the heap are not translated, which corresponds to an assumption that the language memory models are identical.” The proposed extension is to add boundaries to heap values and allow translation within the heap. Speculative optimization is not modeled; adding assumption instructions “might support modeling this.” (p. 2, discussion following Fig. 5).

Inference: a Verus model using this approach should state the shared-memory assumption explicitly. Different source and target memory representations would require additional modeling.

## technique 4: derive compiler theorems from confluence and subject reduction
Subject reduction for the translation relation preserves a term's type under translation. Theorem 1 states that this property implies type preservation of ANF compilation: a typed source expression that compiles has some target typing context and target type under which its result is typed (p. 2, Theorem 1). Bowman states: “Subject reduction of the multi-language semantics implies type-preservation of the compiler.” (p. 2).

Confluence means that any two finite reduction paths from the same configuration can reach a common configuration. The paper labels this property “Conjecture 1 (Confluence).” It derives compiler correctness conditionally: “Note the multi-language semantics can reduce open terms, so confluence implies correctness of both the AOT and the JIT compiler.” Corollary 2 states that if a source program evaluates from an empty heap to a value and compiles to an ANF expression, that expression evaluates from an empty heap to the same heap and an equal value (p. 2).

Define contextual equivalence by co-termination in every multi-language context (p. 3, Definition 2). Theorem 3 states that this equivalence is preserved and reflected when each configuration takes a multi-language step. The paper attributes this part of full abstraction to confluence, but leaves another obligation open: “The hard part, showing any multi-language context (attacker) is emulated by a source context, remains.” (p. 3).

Inference: a Verus development could reuse these proof obligations, but it would still need a proof of confluence or an explicit assumption. The stated multi-language result does not discharge the remaining source-context obligation.

## what is proved, assumed, and left open
The abstract states Theorem 1, Corollary 2, and Theorem 3 without detailed proofs; confluence is explicitly a conjecture. It describes a five-pass model compiler but presents only the ANF pass. It reports no implementation-size, runtime, or proof-time measurements. Its memory-model restriction and suggested extensions appear on p. 2. The unresolved source-context argument appears on p. 3. The paper's own scope is “a novel work-in-progress approach” (p. 1, §1).

Inference: the paper offers a proof structure for compiler interoperability. It does not establish that an implementation in verified Rust follows this semantics; that correspondence would need its own argument.

## techniques for the catalog
- embed source and target syntax with explicit boundary constructors in one open-term reduction system
- define AOT compilation as normalization under translation reductions, including irreducibility of the result
- model JIT with a relation combining source execution, translation, and target execution
- derive type preservation from subject reduction and compiler correctness and part of full abstraction conditionally on confluence

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Note that terms already in the heap are not translated, which corresponds to an assumption that the language memory models are identical."): checked all three pages, quotations, numbers, references, and technique steps; corrected the tag year, quotations, translation notation and normal-form condition, heap behavior, conjecture status, and full-abstraction limits; removed unsupported implementation advice; did not check external references, an implementation, or mechanized proofs.
