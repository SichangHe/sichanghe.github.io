# A Linear First-Order Functional Intermediate Language for Verified Compilers
(authored by agents unless marked 🧑)
Tag: `schneider2015linear`, [paper](https://arxiv.org/abs/1503.08665)

Page numbers below are those of the arXiv version (arXiv:1503.08665v2, 19 pages), which is the text checked.

## result
Schneider, Smolka, and Hack define IL, a linear first-order functional intermediate language with calls to a nondeterministic environment. IL receives a functional and an imperative interpretation (IL/I). They define a decidable syntactic condition, coherence, that is sufficient for both interpretations to agree (Theorem 5), then verify a register-assignment algorithm that reaches a coherent program by consistent renaming. The abstract says, “We formulate a register assignment algorithm for IL and prove its correctness.” (abstract, p. 1) The abstract also says “The entire development is formalized in Coq.” The paper itself omits proofs: “We omit proofs in the paper for space reasons.” (section 1.2, p. 3) The proofs live in the Coq development.

The paper's key method, as the conclusion puts it: “Coherence allowed us to justify correctness without directly arguing about program semantics by proving that the algorithm α-renames to a coherent program.” (section 10, p. 15) Inference: the chain of results is: coherence is defined relative to a liveness judgment; coherence implies invariance (Theorem 5); a locally injective renaming of a renamed-apart program is coherent and α-equivalent (Theorems 6, 7); the algorithm `rassign` produces a locally injective renaming (Theorem 8) with a bounded number of names (Theorem 9).

## technique: dual semantics and trace equivalence
what it is
IL terms are interpreted functionally, with closures; IL/I interprets variable binding as assignment and function application as goto with parallel parameter assignment, with blocks instead of closures (section 3, p. 5). Program equivalence is defined through partial traces; bisimilarity is a sound and complete characterization of trace equivalence (Theorem 1, p. 7).

when to use it
Inference: use dual semantics when translating a high-level representation into an imperative one and the source term should preserve observable behavior.

how to do it
1. Define IL syntax and its functional semantics (section 2, pp. 3–5).
2. Define IL/I and its reduction system (section 3, pp. 5–6).
3. Define partial traces and trace equivalence (section 4.1, pp. 6–7).
4. Define bisimilarity and prove soundness and completeness with respect to trace equivalence (section 4.2, Theorem 1, p. 7).
5. Define invariance: a closed program s is invariant if ∀ V, (∅, V, s)F ≃ (∅, V, s)I (section 5, p. 8, Definition 4).

Verus form
Inference: Encode syntax as Rust enums in ghost/spec code and give `spec fn` evaluators for both semantics. Represent traces as ghost sequences and state observational equivalence in `ensures`; use `proof fn` bisimulation lemmas. Executable Rust can implement the imperative interpreter, while the functional model remains specification-only.

evidence and limits
The paper's semantic theorems are symbolic; it reports no benchmark or measurement. The semantics treat system calls as returning an arbitrary value (rule Extern, section 2, p. 5); the paper's text omits system-call arguments, which the formal development handles (section 2, p. 4). Inference: hardware, back-end code generation, and runtime behavior are outside the proof; the paper only says the Coq development extracts to a simple compiler (section 9, p. 14).

## technique: inductive liveness analysis
what it is
A variable x is significant to a program s and context L if some environment change at x changes the IL/I behavior; significance is not decidable (section 6, p. 8). Liveness over-approximates the significant variables. The judgment `Λ ⊢ live s : X` is defined inductively over syntax, with a context Λ recording the globals of each function. The paper says: “To the best of our knowledge, such an inductive definition is not in literature.” (section 6, p. 8) It is efficiently decidable (Theorem 2) with an extractable procedure.

when to use it
Inference: use a syntax-directed over-approximation when exact semantic dependence is undecidable but a conservative set is enough to preserve a compiler invariant.

how to do it
1. Annotate function definitions with a set of globals: `fun f x : X = s in t` (section 6, p. 8).
2. Live-Op: fv(η) ⊆ X, the continuation's live set X′ contains x, and X′ \ {x} ⊆ X (section 6.1, p. 9).
3. Define Live-Cond, Live-Exp, Live-App, and Live-Fun for conditionals, single expressions, calls, and function definitions (section 6.1, p. 9, Figure 4). Live-App requires the globals X1 of f to be live at the call site; Live-Fun requires X1 ∪ x to be a large enough live set for the body and X1 ∩ x = ∅.
4. Prove soundness (Theorem 3, section 6.2, p. 10): if Λ ⊢ live s : X, L |= Λ and V =X V′, then (L, V, s)I ≃ (L, V′, s)I. Here L |= Λ is defined by LiveCtx1 and LiveCtx2.
5. Extract the recursive decision procedure; the paper states, “The decision procedure recursively descends on the program structure, checking the conditions of the appropriate rule in every step.” (section 6.1.1 and following paragraph, p. 10)

Verus form
Inference: Store live sets as ghost `Set` values and state each rule as a `proof fn` lemma. A verifier-facing recursive checker can return a Boolean with an `ensures` relation to the judgment. Use `requires` for context assumptions and `ensures` for sound over-approximation. Keep proof-only functions erased from executable paths.

evidence and limits
Theorem 2 states liveness is efficiently decidable (section 6.1, p. 9), and Theorem 3 proves it approximates significance (p. 10). The paper gives no complexity bound or measured input sizes for “efficiently”. The paper says liveness is an over-approximation; it does not quantify how coarse it is. The paper says the inductive definition “factorizes the correctness aspect from the algorithmic aspect of liveness analysis.” (section 6, p. 8)

## technique: coherence as a decidable semantic bridge
what it is
Coherence tracks which functions remain available, meaning none of f's globals was redefined (section 7, p. 10). The judgment `Λ ⊢ coh s` removes functions whose globals are rebound and permits calls only to available functions. Theorem 4 states decidability; Theorem 5 states coherence implies invariance.

when to use it
Inference: use a local syntactic condition when the source and target semantics differ around environments, closures, or mutable assignment.

how to do it
1. Maintain Λ as a partial mapping from functions to their globals, mapping only available functions to globals and all others to ⊥ (section 7.1, pp. 10–11).
2. On `let x = η in s`, apply Coh-Op, which checks s under ⌊Λ⌋V\{x}, removing functions with x as a global; on calls f y, Coh-App requires Λf ≠ ⊥ (section 7.1.1, p. 11).
3. For `fun f x : X = s in t`, Coh-Fun checks t under Λ; f : X and checks s under ⌊Λ; f : X⌋X, which keeps only functions requiring at most the globals X (section 7.1.1, p. 11).
4. Define the agreement invariant F, V |= Λ (closure environment V′ agrees with V on f's globals), approximation Λ ≼ Λ′, and context coherence Λ ⊢ coh F via CohC-Emp, CohC-Bot, CohC-Con (section 7.2, pp. 11–12).
5. Apply Theorem 5: if Λ ⊢ coh s, Λ ⊢ coh F, Λ′ ⊢ live s : X with Λ ≼ Λ′, then for all V =X V′ with F, V |= Λ, (F, V, s)F ≃ (strip F, V′, s)I (section 7.2, p. 12).

Verus form
Inference: Model Λ and closure agreement as ghost maps and predicates. Encode Coh-Op/Coh-App as `proof fn` lemmas that update ghost context; state Theorem 5 as an `ensures` equality of abstract traces. Verus ownership can enforce executable environment updates, but the semantic relation remains a ghost proof.

evidence and limits
The paper gives two programs with globals {x} for f: one that rebinds x with `let x = 5` and is “not invariant”, and one that rebinds a fresh `y` and is coherent (section 7, p. 10); an earlier example shows 5 versus 7 results in IL/I versus IL (section 3, p. 6). The paper does not measure how often coherence rejects invariant programs, and does not claim that its liveness sets are minimal.

## technique: alpha-renaming and verified register assignment
what it is
A program is first renamed apart (so every function is always available, hence coherent; section 8, p. 12). The algorithm `rassign` then computes a renaming ρ by recursion on the annotated program, choosing fresh names relative to the live sets; renaming the program by ρ gives the final program (appendix 11.5, p. 18). Local injectivity of ρ on every live-set annotation yields α-equivalence and coherence (Theorems 6, 7). Theorem 8 states `rassign` yields a locally injective renaming for any `fresh` and `freshlist` satisfying their specifications; Theorem 9 bounds the number of names for the smallest-unused-variable choice of `fresh`.

when to use it
Inference: use this pipeline for verified SSA-style register assignment where names can be reused after values die.

how to do it
1. Rename bound variables apart with `apart`, which yields an α-equivalent renamed-apart program (appendix 11.3–11.4, pp. 17–18, Theorems 11 and 12; α-equivalence in 11.2, p. 16). The paper requires a renamed-apart input to `rassign` (section 8, p. 12).
2. Define local injectivity ρ ⊢ inj s, requiring ρ injective on every live set X annotating a subterm (section 8.1, p. 13). Prove that for renamed-apart programs satisfying side conditions, ρ ⊢ inj s implies ρ(⌊Λ⌋[s]) ⊢ coh (ρ s) (Theorem 6) and ρ, d ⊢ ρ s ∼α s (Theorem 7), both p. 13.
3. Define `fresh` (with fresh X ∉ X) and `freshlist` (n pairwise-distinct variables outside X); recurse on the annotated term with the displayed `rassign` equations. For `let x = η in s` the new name is y = fresh(ρ([s] \ {x})), and ρ[x ↦ y] is passed on (section 8.2, p. 14).
4. Prove Theorem 8: for a renamed-apart s with the stated assumptions and ρ injective on [s], rassign ρ s ⊢ inj s (section 8.2, p. 14).
5. For the smallest-unused-variable heuristic, prove Theorem 9: if fresh X yields a variable less or equal to |X|, k is the size of the largest live set in s, and ρ(fv(s)) ⊆ S(n), then ρ′(VO(s)) ⊆ S(max {n,k}) for ρ′ = rassign ρ s (section 8.2, p. 14).
6. Compose (appendix 11.5, p. 18): rename apart, run `rassign`, rename by ρ, then use Theorem 5 to read the result as an IL/I program.

Verus form
Inference: Implement `rassign` as executable Rust over an AST, with `spec fn` freshness and local-injectivity predicates. Add `requires` for renamed-apart and liveness assumptions and `ensures` for alpha-equivalence, coherence, and the register bound. Prove recursion with `decreases` clauses and `proof fn` induction lemmas.

evidence and limits
The only evidence is the Coq proofs and an extraction demo: “The development extracts to a simple compiler that, for instance, produces program (b) when given program (a) from the introduction as input.” (section 9, p. 14) The paper reports no compile-time or code-quality measurements. The bound in Theorem 9 depends on the maximum live set and on the assumption on `fresh`. The paper notes the bound lets register assignment “be considered separate from spilling” (section 1, p. 2), so spilling is outside this result. The paper says the formalization differs from the paper presentation in treatment of annotations, the definition of liveness, and the inductive generalizations of Theorems 6–9 (section 9, p. 14).

## techniques for the catalog
- dual semantic interpretations — compare functional and imperative executions through traces
- inductive liveness — derive a decidable conservative dependence set from syntax
- coherence invariant — track closure availability to bridge semantics
- verified register assignment — alpha-rename and allocate fresh names with a live-set bound
