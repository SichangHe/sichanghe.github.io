# Adjoint Natural Deduction (Extended Version)
(authored by agents unless marked 🧑)
Tag: `jang2024adjoint`, [paper](http://arxiv.org/abs/2402.01428v1)

## scope and result

Jang, Roshal, Pfenning, and Pientka present a natural-deduction calculus for adjoint logic. A mode assigns each proposition structural permissions—weakening and contraction—and a preorder says which modes may depend on which others. The calculus combines linear, affine, strict, and intuitionistic reasoning while retaining a computational interpretation. “Adjoint logic is a general approach to combining multiple logics with different structural properties, including linear, affine, strict, and (ordinary) intuitionistic logics, where each proposition has an intrinsic mode of truth.” (Abstract, p. 1).

The paper gives (1) an implicit adjoint sequent calculus, (2) bidirectional natural deduction and proof-term syntax, (3) a verification/long-normal-form characterization, (4) an abstract machine with preservation, progress, freedom-from-garbage, strictness, and erasure theorems, (5) recursive and call-by-need extensions, and (6) an algorithmic type checker. The mode preorder must be monotone: if `m≥k`, then the structural permissions of `m` include those of `k`; this is needed for cut elimination (Section 2, pp. 3–5).

## technique 1: mode-indexed substructural contexts

what it is

A proposition has a mode `m`; each mode has `σ(m)⊆{W,C}`. `W` permits unused assumptions and `C` permits duplication. A context merge `Γ1;Γ2` nondeterministically splits assumptions between premises: an assumption goes to one premise, or to both only when `C∈σ(m)`. Assumptions left unused are allowed only through the weakening-only context `ΓW` in leaf rules (identity, `1R`, `↓R`), which requires `W∈σ(m)` for every antecedent. The paper notes: “Note that the context merge is a partial operation, which prevents, for example, the use of an antecedent without contraction in both premises of the ⊗R rule.” (Section 2, p. 4).

when to use it

Use mode-indexed contexts when a verified program must enforce resource usage statically: linear values exactly once, strict values at least once, affine values at most once, and unrestricted values arbitrarily. Use the mode preorder to control information flow between layers (for example, a linear computation depending on an unrestricted one).

how to do it

1. Declare modes and their `σ(m)` sets, then a preorder `≥` compatible with those sets.
2. Annotate every proposition and context binding with its mode.
3. For each multi-premise rule, split the context with `;`; reject a split that duplicates a non-contraction assumption or omits a non-weakening assumption.
4. For shifts `↑^m_k A` and `↓^m_n A`, check the required preorder inequalities (`m≥k` for up and `n≥m` for down).
5. Prove admissibility of weakening and contraction only under the mode permissions. Theorem 1 states these structural rules are admissible; Theorem 2 states cut and identity admissibility (pp. 4–5). Both are stated without proof here; the paper attributes the sequent-calculus theorems to Reed [2009], Pruiksma et al. [2018], and Pruiksma [2024] (p. 4).

Verus form

Inference: Encode a mode and ownership policy as ghost predicates on a resource environment. A function consuming a linear token takes it by value; affine tokens may be dropped; strictness requires a postcondition that the token was observed. Use Rust ownership for executable enforcement and Verus `requires`/`ensures` to expose the ghost invariant. Verus has no mode preorder or context merge, so define and prove the corresponding predicates; do not write `invariant(...)` as a call or attach `ensures` to a `spec fn`.

evidence and limits

Section 2 states admissibility of weakening, contraction, cut, and identity (Theorems 1–2) and gives no proof of them, citing prior work. Examples 3–5 (pp. 5–6) show that G3, LNL, DILL, and intuitionistic subexponential linear logic are obtained by specializing the modes; the paper says of LNL and DILL that “the rules of dual intuitionistic linear logic are modeled precisely.” The paper reports no empirical measurements. The paper says monotonicity “is required for cut elimination to hold” (p. 3). Inference: a mode graph that violates monotonicity would therefore invalidate the cut-elimination argument.

## technique 2: bidirectional natural deduction and verification

The natural-deduction layer uses checking `Δ ⊢ e ⇐ A^m` and synthesis `Δ ⊢ s ⇒ A^m`. Rules correspond to sequent right rules and upside-down left rules. The authors explain why this is needed: “The bidirectional nature will allow us to establish a precise relationship to the sequent calculus (Section 4), but it does not immediately yield a type checking algorithm since the context merge operation is highly nondeterministic when used to split contexts.” (Section 3, p. 6).

Apply it as follows. In the paper's syntax (Figure 2, p. 7), checkable expressions are the introductions (`λ`, `{ℓ ⇒ eℓ}`, `susp`, pairs, `()`, `ℓ(e)`, `down`), the `match` eliminations of positive types, and any synthesizable expression; synthesizable expressions are variables, application `s e`, projection `s.ℓ`, `force s`, and annotated expressions `(e : A)`. Maintain the invariant `Δ≥m` for both judgments. Treat a verification as a proof built bottom-up with introductions and top-down with eliminations: disallow `⇐/⇒` and restrict `⇒/⇐` to atoms. Such derivations have the subformula property. Theorem 12 translates sequent proofs to natural deduction; Theorem 13 translates back; Theorem 14 guarantees a verification for every derivable proposition (Section 4, pp. 10–15).

Inference: In Verus, checking corresponds to a proof function whose specification is fixed by the caller, while synthesis corresponds to inferred types supplied by a trusted library of lemmas. A “verification” is analogous to a proof term whose calls are all checked by Verus. Verus does not expose a bidirectional type checker for specifications, so mode and subformula invariants remain an external design discipline.

## technique 3: computational semantics and safety properties

The paper defines an abstract machine for expressions, environments, continuations, and modes, then proves type preservation and progress. “Theorem 15 (Preservation) If S : A and S −→ S ′ then S ′ : A.” (Section 5, p. 19). Canonical forms (Theorem 16) are used in the proof of progress (Theorem 17, p. 19). The machine keeps a global environment instead of closures (Section 5, p. 16).

Three resource-sensitive properties follow for a closed computation returning a purely positive type. Freedom from garbage says a final environment contains no binding with a linear mode (`σ(m)={}`). Strictness says every binding whose mode lacks weakening is a read value binding `[x↦v]` (Theorems 19–20, pp. 21–22). Theorem 21 (Dead Code) shows every state evaluates or returns at a mode `m ≥ r` for result mode `r`; Corollary 22 (Erasure) then replaces subterms of mode `k ≱ r` with `Ω` and states that evaluation still terminates in a final state that differs from `v` only by `Ω` at such subterms (p. 22).

Inference: A Verus encoding would define a machine state, `step` relation, and typing invariant, then prove preservation and progress as lemmas. Garbage freedom becomes an invariant that no linear resource remains in a terminal state; strictness becomes an existential “was used” ghost flag; erasure requires a simulation relation between original and erased executions. These are model-specific inferences, not claims made by the authors about Verus.

## technique 4: recursion and call-by-need

Add equirecursive type definitions `t^m=A^m` only when `A` is contractive. Add contextual recursive definitions `f[Δ]:A=e`, checked against a common signature. Contextual definitions permit mixed-mode parameters without inserting shifts; the paper gives `f[x:A^m,y:B^k]:C^r=e(x,y)` requiring `m,k≥r` (Section 6, pp. 22–23).

For call-by-need, environments hold unevaluated `x↦e`; forcing changes it to a value binding `[x↦v]`, and a temporary continuation frame prevents duplicate evaluation. The three new transition rules in Section 6 (p. 23) unfold a definition call `f[θ]` into the environment, demand a variable `x↦e` (pushing a frame `x↦_`), and update the binding to `[x↦v]` when the value returns. The paper says these “can further simplify” when the mode lacks contraction, dropping `[x↦e]` and `[x↦v]`, and that “black holes” can be modeled by rebinding `[x↦Ω]`.

Inference: In Verus, represent an unevaluated/value state with an enum and prove that forcing transitions `Unevaluated` to `Evaluated` once. A ghost token can enforce the no-contraction case. Recursive functions need a `decreases` measure; the paper’s contractiveness condition is a type-level termination assumption, not a Verus proof by itself.

## technique 5: algorithmic type checking with usage contexts

The declarative merge is nondeterministic, so the algorithm tracks used and provisional hypotheses in `Ξ`. The judgment is `Γ ⊢ e ⇔ A^m / Ξ`, with invariant `Ξ≥m`. Define `Ξ ⊒ Δ` for dropping provisional assumptions, `Δ≥Ξ` for selecting a legal subset, subtraction `Ξ\x:A`, restriction `Ξ^k_m`, optional-context `[Γ|m]`, and merge `Ξ1⊔Ξ2`. The merge combines usages; a hypothesis definitely used in one branch must be used in the other, or be available for weakening because it is provisional or because its mode admits weakening. (Section 7, pp. 23–26; rules in Figure 6, p. 32.)

Soundness (Theorem 23) says an algorithmic derivation and any legal concrete context yield a declarative derivation. Completeness (Theorem 24) constructs some `Ξ` from every declarative derivation. Apply the checker by recursively computing `Ξ`, rejecting illegal subtraction or mode restrictions, and merging branch usage contexts. Lemmas 25–27 state properties of subtraction, restriction, and merge, with no proofs given in the paper. Lemma 28 gives `Ξ≥m`; Lemma 29 is context extension; Corollary 30 states `· ⊢ e ⇐ A` iff `· ⊢ e ⇐ A / ·`. The proofs of Theorems 23 and 24 are one-line sketches (“By rule induction …”), and the text says “postponing the proof”.

Inference: A Verus front end could implement `Ξ` as a ghost map from variables to usage states and prove merge/subtraction lemmas. This checker is separate from Verus’s SMT verification and would need a trusted parser or a separately verified implementation.

## what is proved and trusted

Proved in the paper: substitution (Theorem 10), correspondence between sequent and natural deduction (Theorems 12–13, with sample cases), verification existence (Theorem 14), and the runtime properties of Theorems 19–22. Only sketched: preservation, progress, and soundness/completeness of the algorithmic checker (Theorems 15, 17, 23, 24). Stated without proof: Theorems 1–2 and Lemmas 25–27. Trusted: the formal calculus, mode declarations and preorder, operational semantics, and the metatheoretic proofs. No benchmark counts or runtime denominators are reported. Examples 3–9 (pp. 5–10) recover G3, LNL, DILL, intuitionistic subexponential logic, Church's λI (strict), the simply typed and linear λ-calculi, intuitionistic natural deduction, the fragment of intuitionistic S4 without possibility, and lax logic as instances; the paper gives no separate affine example. Inference: VL should reuse ownership and usage-context ideas rather than rederive each logic.

Inference: The threat to agent-written verified Rust is moderate at the specification layer: Verus checks generated proof terms, but mode policies, context merges, and erasure/strictness properties must be encoded correctly. A kernel-checked proof does not establish that the chosen resource modes match the product’s intended ownership policy.

## techniques for the catalog

- mode-indexed context merge — enforce weakening and contraction permissions while splitting contexts for multi-premise rules
- bidirectional adjoint typing — separate checking and synthesis while preserving mode-dependence invariants
- verification normal forms — restrict proof-term rules to obtain analytic, subformula-property derivations
- resource-aware abstract machine — prove preservation, progress, garbage freedom, strictness, and erasure from mode annotations
- call-by-need usage tracking — update unevaluated bindings exactly once and enforce contraction restrictions
- algorithmic usage contexts — compute legal hypothesis usage with subtraction, restriction, and branch merge operations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This means that x might also not be used because its only occurrence is in the value of y."): read the whole paper text and checked every quotation, theorem number, section and page reference, and the description of each technique against it; changed the ⊗R and Section 3 quotations to full wording, corrected page references (Theorem 15, Section 4, erasure, Section 6, Section 7), the synthesis/checking split, the call-by-need rule description, the merge condition (provisional hypotheses), and the claims about what is proved, sketched, or only stated; marked my own conclusions as Inference. Did not check the Verus encodings (they are labeled Inference and are not claims of the paper), the formal correctness of the paper's proofs, or the cited prior work; page numbers follow the paper's own page headers.
