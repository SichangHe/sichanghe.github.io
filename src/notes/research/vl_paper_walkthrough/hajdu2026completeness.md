# Completeness of Synthesis under Realizability Assumptions using Superposition
(authored by agents unless marked 🧑)
Tag: `hajdu2026completeness`, [paper](http://arxiv.org/abs/2605.19683v1)

## scope and result
The paper studies first-order program synthesis where the specification may mention symbols that the generated program is forbidden to use. It defines a specification as a computable-symbol set plus a formula of the form ∀x̄∃y.F[x̄,y], and a solution as a computable conditional term that makes the formula valid. The central result is SUPRA with the Abs rule: “We prove completeness of our SUPRA calculus (Section 5). By completeness we mean that, if at least one computable program satisfying a given specification exists, our SUPRA calculus finds one such program.” (Section 1, p. 2)

Inference: this is a proof-producing synthesis architecture: the prover saturates clauses while carrying a candidate program, and an empty clause certifies the candidate. The guarantee is conditional on realizability (existence of a computable solution), first-order equality reasoning, and the calculus reaching saturation.

## technique 1: encode synthesis as answer-clause saturation
Use this when the desired function can be stated as a first-order existence problem and the implementation can be expressed with nested equality tests.

Steps from Sections 2–3:
1. Choose Σc, the computable symbols; put specification-only or forbidden symbols in Σu.
2. Write the specification as ∀x̄∃y.F[x̄,y]. A program term is a simple term or `ite(l ≈ r,p,q)` recursively.
3. Negate and Skolemize the goal, replacing the input variables with fresh constants ᾱ; clausify ¬F[ᾱ,y].
4. Extend every resulting clause C with an answer annotation `C⟦y⟧`; the annotation is replaced by substitutions during inference.
5. Saturate with inference rules. A derived empty answer clause `⊥⟦p[ᾱ]⟧` yields p[x̄].

The paper states: “The framework constructs a program for specification Λ in parallel with searching for a proof that specification (2) holds.” (Section 3, p. 6) Its motivating schedule example has computable constants f,s,p,v and uncomputable predicate w; the synthesized answers are “if x ≈ f then v else p” and “if x ≈ s then p else v.” (Section 1, p. 2)

Verus form (Inference): represent the synthesized function as executable Rust with `requires` assumptions and `ensures` for F; represent an `ite` as Rust `if`. The superposition proof itself does not carry over to Verus, whose proof functions and specifications are checked by Verus. The transferable idea is to separate symbols permitted in executable code from specification-only facts.

Evidence and limits: SUPRA soundness means a derived answer is a solution; the paper gives no implementation benchmark or success denominator. The earlier calculus can get stuck even when a solution exists, so this technique requires SUPRA’s ordering and abstraction conditions.

## technique 2: SUPRA’s dual superposition rules
Use this when equality reasoning must both branch on a condition and unify candidate answers. SUPRA replaces computable unifiers with most-general unifiers and permits an inference only when the substituted answer remains computable. Its `SupC` rule builds an `ite` answer; `SupU` unifies answer terms. The paper explains: “The two variants of Superposition are both needed in the synthesis setting.” (Section 4.1, p. 7)

Steps:
1. Select maximal literals using an ordering in which uncomputable symbols are greater than computable symbols.
2. Apply `SupC` to rewrite an equality branch and add `ite(l ≈ r,q,p)` (the paper’s rule uses the branch order shown in Figure 1).
3. Apply `SupU` when answer terms have a most-general unifier; require the resulting answer to be a computable simple term.
4. Apply equality resolution and factoring only under the stated computability and ordering side conditions.
5. Continue both branches in parallel because neither rule is uniformly dominant.

The Figure 1 side conditions include “ite(l ≈ r,q,p)σ is computable” for `SupC` and “pσ is a computable simple term” for `SupU` (Section 4.1, p. 8). In Example 2, selecting all maximal literals under an ordering headed by the uncomputable symbol w derives `⊥⟦ite(α ≈ f,v,p)⟧` (Section 4.1, p. 9).

Verus form (Inference): implement the branch as an ordinary Rust `if`, prove each branch’s postcondition, and use a Verus `assert` or lemma to discharge the equality condition. There is no Verus analogue of carrying an answer annotation through superposition; candidate generation remains an external synthesis phase.

## technique 3: abstraction of computable subterms
Use this when an uncomputable literal contains computable subterms and direct inferences would leave incompatible answers. Example 3 shows an answer `b` and an `ite` term that cannot unify because its condition is uncomputable. SUPRA therefore adds `Abs`, which abstracts computable subterms before other inferences.

Steps from Section 4.2:
1. Find an uncomputable literal containing a non-variable computable subterm.
2. Apply `Abs` exhaustively to replace that subterm with a fresh variable and add a condition recording the equality.
3. Saturate the abstracted clause set with `SupC`, `SupU`, equality resolution, and factoring.
4. Interpret conditional clauses by keeping the abstraction conditions as a list of literals; the paper defines `C ▽ L` as equivalent to `C ∨ ⋁L`.
5. Use the realizability proof to show that a ground computable solution induces a contradiction unless an empty answer clause is derived.

The paper states: “We apply Abs exhaustively on each clause before we allow any further inferences.” (Section 4.2, p. 10) Theorem 2 concludes: “If Λ is realizable, then SUPRA with Abs derives an answer clause of the form ⊥⟦p[ᾱ]⟧ from Λ where p[x̄] is a computable program term that is a solution to Λ.” (Section 5, p. 12)

Verus form (Inference): abstraction corresponds to introducing a ghost variable or lemma parameter for a subvalue and separately proving the equality that connects it to the concrete expression. Verus does not provide conditional-clause saturation, so this is a design pattern for an external proof-producing synthesizer rather than a direct Rust construct.

## trust, evidence, and product implications
The proved property is soundness and completeness under realizability, not termination or practical runtime. The paper’s formal proof uses a saturated set, a partitioned term ordering, conditional clauses, and a rewrite-system interpretation; no corpus size, runtime, or empirical success rate is reported. Trusted components therefore include the first-order prover, its implementation, and the correctness of the extraction from answer terms; the paper explicitly focuses on the calculus rather than a verified implementation.

## techniques for the catalog
- answer-clause saturation: carry a conditional program term through first-order clauses and extract it from an empty answer clause
- SUPRA dual rules: combine equality branching (`SupC`) with computable answer unification (`SupU`) under partitioned orderings
- abstraction rule: replace computable subterms inside uncomputable literals with variables and retain equality conditions for complete saturation
