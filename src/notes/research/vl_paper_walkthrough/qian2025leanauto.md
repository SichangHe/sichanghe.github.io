# Lean-auto: An Interface between Lean 4 and Automated Theorem Provers
(authored by agents unless marked 🧑)
Tag: `qian2025leanauto`, [paper](https://arxiv.org/abs/2505.14929)

## scope and result

Lean-auto is a translation interface from Lean 4 to automated theorem provers (ATPs). The paper defines a hammer as having “three main components: premise selection, translation from ITP to ATP, and proof reconstruction from ATP to ITP” (Section 1, p. 1). Lean-auto mainly supplies translation, with reconstruction fully supported for its native prover path; for other ATPs, the paper says it “will generate a warning to indicate that Lean-auto trusts the ATPs’ output” (Section 1, p. 2). Inference: a verifier pipeline must distinguish reconstructed proofs from trusted ATP results.

The workflow is preprocessing Lean 4 into dependent type theory (λC), then monomorphization through quantifier instantiation, λ*→ abstraction, and universe lifting (Sections 1 and 4, pp. 2, 9). The central design choice is monomorphization: it instantiates quantifiers and abstracts suitable source instances into HOL* variables (Sections 4.1–4.2, pp. 10–11). The paper states that monomorphization “is sound, produces small translation results, and preserves term structures during translation” but “is incomplete” (Section 3, p. 8).

Inference: the directly reusable lesson for Verus is a staged lowering pass that preserves proof-relevant structure while eliminating polymorphism only where concrete instances are visible. The paper does not evaluate Verus.

## technique 1: monomorphization to monomorphic higher-order logic

Use case. Monomorphization translates dependent type theory through HOL* (HOL with universe levels) to ordinary monomorphic HOL. The paper states: “quantifier instantiation and λ∗→ abstraction translates λC into HOL∗, and universe lifting translates HOL∗ into HOL” (Section 2.2, p. 5; spacing normalized). Inference: use this approach when the proof needs suitable instances of generic functions and the ATP cannot consume dependent type theory directly.

How to do it. The paper's List example illustrates the procedure (Sections 4.1–4.2, pp. 9–11):

1. Preprocess the goal by introducing leading universal quantifiers and applying proof by contradiction. For the example, `A B`, `f`, and `xs` enter the context and `neg_goal : Not (...)` is added before the goal becomes `False` (Figure 3, p. 10).
2. Collect HOL* instances occurring in the hypotheses and negated goal. The example collects `@reverse A`, `@reverse B`, `@map A B`, and `@Eq (List B)` (Section 4.2, p. 11).
3. Match dependent arguments in hypothesis theorems against those instances. The paper enumerates six matches, including `@map α β` with `@map A B` and `@reverse α` with `@reverse A` and `@reverse B` (Section 4.2, p. 11).
4. Repeat matching in a saturation loop until no new instances appear or a threshold is reached. Algorithm 1 maintains active hypothesis and constant instances, queues new instances, and stops when the queue empties or their combined count exceeds `maxInsts`. It returns only hypothesis instances satisfying `QMono`, the condition required by abstraction (Section 6, pp. 14–16).
5. Abstract each resulting HOL* instance into a HOL* variable and retain a substitution mapping variables back to source instances. The λ*→ pass traverses the quasi-monomorphic term and performs exactly this replacement (Section 5, p. 14).
6. Lift universe levels to ordinary HOL and send the result to an ATP (Section 4, p. 9; Appendix E).

Verus form. Inference: a possible adaptation would generate concrete instances of generic proof lemmas, preserve a map back to the source terms, and reconstruct solver proofs. Its feasibility in Verus requires separate evaluation; this paper studies Lean 4.

Evidence. Section 8 reports 149,142 problems **after** excluding 27,762 of 176,904 user-declared theorems: “Therefore, our benchmark set consists of 149142 theorems (problems)” (p. 17). Figure 5 instead says “Our benchmark set contains 149135 problems” (p. 19). The paper leaves this seven-problem discrepancy unresolved. Section 8 uses Lean 4 v4.15.0 and Mathlib4 commit `29f9a66d622d9bab7f419120e22bb0d2598676ab` on an Amazon EC2 c5ad.16xlarge with 64 CPU cores and 128 GB memory (p. 17, footnote 28). The nominal time limit is 10 seconds: native tactics use 65,536 heartbeats, an approximation; external solvers additionally receive a 10-second timeout. Results taking over 10 seconds are counted as failures (Appendix L, p. 42).

Figure 5 reports 61,906 solves for Lean-auto's virtual best, 79,396 for the overall virtual best, 54,570 for Lean-auto + Duper, and 47,060 for Aesop (p. 19). A virtual best solver is “equivalent to running all the tools in the given category in parallel and taking the first success produced” (Section 8, p. 18, footnote 35). The text reports Duper's 36.6% success rate, calls it “5.0% better than the best previous tool” (p. 18), identifies that tool as Aesop (p. 20), and reports 53.2% for the overall virtual best (p. 20). Inference: the roughly five-point improvement over Aesop is in percentage points, rather than a 5% relative increase.

Limits. Premise selection is not evaluated: the paper supplies all theorems used by the human proof, an idealization (Section 8, p. 17). SMT backends receive a modified FOL translation; its extra incompleteness “might have given Z3 and CVC5 a slight disadvantage” (Section 8, p. 18). Monomorphization can fail when no suitable formula in the less expressive logic reflects the source; λ*→ abstraction only handles quasi-monomorphic terms (Section 5, p. 14). For unsupported inductive types or non-SMT ATPs, the paper offers manually supplied properties as a workaround: “users can always manually supply the properties related to the inductive types as a workaround” (Section 7, p. 16).

## technique 2: definitional-equality control and typeclass absorption

Use case. Full normalization can be too expensive, so Lean-auto combines controlled unfolding, fingerprints, and equality checks. The paper says full reduction “is prohibitively expensive on complex expressions in real-life Lean 4 projects” (Section 4.3, p. 12).

How to do it. During preprocessing, partially reduce with `Meta.transform` and `Meta.whnf`; let users select reducibility and provide definitional-equality or unfolding instructions. For the unfolding instruction, topologically sort the supplied constants and fail on cycles; generate equations for maximal nonlogical subexpressions (Section 7, p. 16). During abstraction, keep mutually definitionally unequal instances, compare fingerprints first, then call `isDefEq`; during instantiation, generate nontrivial equations between instance pairs (Section 4.3, pp. 12–13). Instantiate typeclass instance quantifiers and require HOL* instances to include their typeclass arguments, so expressions such as `HAdd.hAdd α β γ inst x y` become a small `h x* y*` (Sections 3 and 4.3, pp. 8, 13).

Verus form. Inference: an analogous Verus tool should normalize only selected spec definitions, cache structural fingerprints, and add explicit equality lemmas for chosen unfoldings. An adaptation could absorb trait implementation arguments when matching source instances, while retaining the laws needed by the proof. This proposal is not evaluated in the paper.

Evidence and limits. The evaluation reports average times on solved problems of 1,092.5 ms for Lean-auto + Duper, 774.9 ms for Lean-auto + Zipperposition, and 756.8 ms for the Lean-auto virtual best, versus 92.2 ms for Aesop VBS (Figure 5, p. 19). The paper offers a possible explanation: “This is potentially caused by Lean-auto’s verified checker and the frequent definitional equality testing in Lean-auto’s monomorphization” (Section 8, p. 20). Inference: this is a threat to interactive VL latency, especially when generated proofs repeatedly trigger normalization.

## what is proved, trusted, and still missing

The native-prover path uses a verified checker in Lean-auto; other ATP results are trusted with warnings (Section 8, p. 18). The experiment supplies premises from human proofs: “This simple procedure emulates an ideal premise selection algorithm” (Section 8, p. 17). Appendix L uses environments preceding each theorem declaration to avoid giving simplification tactics access to the theorem being tested (pp. 40–41). Inference: the results measure translation and solving with idealized premise selection; they do not establish end-to-end deployment performance. Inference: VL should not redo a generic translate polymorphism to ATP study without measuring Verus-specific contracts, Rust traits, ownership, and proof reconstruction. Inference: the product threat is moderate: automated solving can reduce proof effort, but ideal premise selection, incomplete translation, high latency, and trusted nonreconstructed ATP outputs limit unattended agent-written verified Rust.

## techniques for the catalog

- monomorphization saturation — instantiate concrete generic terms, repeatedly match them against hypotheses, abstract instances to HOL* variables, then call an ATP

- controlled definitional equality — combine selective unfolding, fingerprint filtering, `isDefEq`, and generated equations instead of full normalization

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The universe lifting procedure in Lean-auto is the translation of HOL∗ to HOL in the context of λC."): checked all study claims, quotations, numbers, page and section references, and technique steps against the entire paper including appendices; corrected the unrelated DOI to the paper’s arXiv link, the post-exclusion benchmark count, timing qualifications, percentage interpretation, reduction and inductive-type page references, typeclass handling, and unsupported Verus claims; did not run Lean-auto, reproduce experiments, or independently verify the paper’s proofs.
