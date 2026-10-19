# MATP-BENCH: Can MLLM Be a Good Automated Theorem Prover for Multimodal Problems?
(authored by agents unless marked 🧑)
Tag: `he2025matpbench`, [paper](http://arxiv.org/abs/2506.06034v1)

## scope and central result

MATP-BENCH evaluates multimodal large language models (MLLMs) as theorem provers. Each item combines an image and a natural-language statement whose information is complementary, and has manually written formalizations in Lean 4, Coq, and Isabelle. The paper states: “MATP-BENCH consists of 1056 multimodal theorems drawn from high school, university, and competition-level mathematics.” (abstract, p. 1) The benchmark spans 472 high-school, 468 college, and 116 competition problems; 937 are plane geometry, 73 three-dimensional geometry, and 46 analytic geometry (Table 2, p. 5).

The end-to-end task is difficult. Task 1 requires a model to infer a complete formal theorem from image plus text and then produce a proof accepted by the formal environment. Across six models and all difficulty levels, Task 1 pass@10 averages are 4.26% in Lean 4, 12.15% in Coq, and 4.65% in Isabelle (Table 3, p. 7; these are the reported table averages; pass@10 means success within ten attempts). Task 2 asks only for formalization; overall pass@10 averages are 45.16% in Lean 4, 33.74% in Coq, and 43.51% in Isabelle (Table 4, p. 7). Inference: the large Task 1–Task 2 gap is consistent with proof construction being a major bottleneck; it does not isolate a causal effect because the tasks and acceptance procedures differ.

## technique 1: construct a multimodal, multi-language, multi-level benchmark

What it is. Build every sample from image, natural-language statement, and parallel formal theorem statements in three proof assistants. The paper calls this “a Multimodal, Multi-level, and Multi-language benchmark designed to evaluate MLLMs as automated theorem provers.” (Table 1 caption, p. 4)

When to use it (Inference). Use this design to test the complete chain from visual interpretation to formal proof, rather than text-only theorem proving. It is especially suited to geometry where diagrams carry relations omitted from prose.

How to do it, from the paper. (1) Collect high-school and university items from public multimodal mathematics datasets and competition items from public Mathematical Olympiad examinations (Section 4, p. 5). (2) Preserve the image and natural-language description as the model input. (3) Manually annotate each theorem in Lean 4, Coq, and Isabelle (Section 4). (4) Organize by educational level, geometry type, and topic. (5) Release data and code for reproducible evaluation; the authors provide a public benchmark site (abstract and Section 1).

Verus form (Inference: the paper uses Lean, Coq, and Isabelle, not Verus). A Verus benchmark item can store an image and text as external test data and provide a Rust/Verus theorem statement with `requires` facts representing all extracted diagram relations. A proof function can express the intended conclusion in `ensures`; a verifier would check it under the stated `requires` assumptions. The image interpretation and natural-language parser remain outside the proof unless separately formalized. Verus is therefore a target proof language in an analogous benchmark, not a drop-in conversion of these assistant libraries.

Evidence and limits. Section 3 defines proof acceptance through the formal assistant’s built-in verifier. Inference: acceptance establishes a derivation of the generated statement, while fidelity to the original multimodal problem requires a separate consistency assessment. The manual formalization effort was substantial: each item was reviewed by at least one other team member, and average time per language was about 25 minutes for high school, 30 for university, and 15 for competition items (Section 4, p. 6). Table 2 reports 88.7% plane geometry. Inference: this distribution limits generalization to other mathematics.

## technique 2: prevent modality leakage and split formalization from proving

What it is. Hide the gold formal theorem from the model and define two tasks. The paper explains: “To avoid modality leakage, where the model could ignore visual inputs, we provide only natural language S and image I, without the formalized theorem T.” (Section 3, p. 4)

Task 1 is end-to-end: `ProverTask1(I, S) → (T, P)` where `Check(T, P) = True`. Task 2 is formalization only: `(I, S) → T`; a judge checks consistency with the annotated theorem (Sections 4–5.1, pp. 5–6). The paper repeats the Task 1 subscript in its Task 2 formula; the task description requires no proof. Inference: comparing the tasks helps distinguish formalization from proof construction, subject to their different acceptance procedures.

How to do it, from Sections 3–5.1. (1) Supply only image and text. (2) For Task 1, require both a formal theorem and a proof accepted by Lean, Coq, or Isabelle. (3) For Task 2, require only a formal theorem. (4) Evaluate Task 2 against annotated ground truth; the authors use GPT-4o as judge. (5) Compare the two pass@n rates to locate the bottleneck (Sections 3–5).

Verus form (Inference). Provide image and text as input, then generate a formal theorem predicate over the extracted facts. Use `requires` for the extracted assumptions and `ensures` for the theorem result. Run the generated proof through Verus; acceptance is the analogue of `Check(T,P)=True`. A separate specification can check that the generated frame contains every required diagram relation. The judge or parser remains trusted unless its output is itself verified.

Evidence and limits. Table 3 reports Lean 4 Task 1 averages of 6.39%, 2.85%, and 1.29% for high school, university, and competition; Table 4 reports 45.16% overall for Lean 4 Task 2 (p. 7). Section 5.2 instead gives 6.96%, 3.12%, 2.08%, and 46.81% (p. 6). This study uses the table values and does not resolve the discrepancy. Inference: withholding the reference formalization encourages visual use but does not establish that a model used the image. Task 2 also depends on GPT-4o judgments.

## technique 3: manually recover implicit diagram assumptions during formalization

What it is. Treat a diagram as carrying theorem premises that prose omits. Figure 1 shows examples where “From diagram” axioms encode coplanarity, a point on an extended line, distinctness, and non-collinearity. The authors state: “Many essential assumptions are conveyed exclusively through diagrams.” (Section 4, p. 6)

When to use it (Inference). Use this step whenever the natural-language statement is incomplete and geometric relations are visually specified. Without it, a formal theorem may be weaker, different, or trivially satisfiable.

How the paper constructs statements. (1) For multiple-choice questions, use the correct answer and image information to state a theorem. (2) For fill-in-the-blank questions, fill in the answer and integrate image information. (3) For open-ended questions, convert the supplied answer into a declarative statement and combine it with visual information. (4) Extract missing geometric assumptions from diagrams. (5) Have at least one other team member review each formalization (Section 4, p. 6). Figure 1 (p. 2) labels coplanarity, point order, distinctness, and non-collinearity as diagram-derived; midpoint and perpendicularity premises are labeled statement-derived. Inference: preserve that distinction when implementing an extraction pipeline.

Verus form (Inference). Encode recovered facts as a Rust structure or ghost state with predicates. A function contract can use `requires` such as collinearity, midpoint equality, or nonzero denominators; `ensures` states the geometric conclusion. Use `proof fn`s for derived geometric lemmas and `assert` to expose intermediate equalities. Diagram pixels themselves do not prove a relation: the extracted relation is an assumption unless a verified geometry parser establishes it.

Evidence and limits. The authors report that high-school and university descriptions are concise while images contain rich information requiring preprocessing, whereas competition statements are more detailed and easier to formalize (Section 4, p. 6). Error analysis identifies missing unformalized information and hidden assumptions as major failure categories. Inference: product systems must preserve provenance for each premise so an agent cannot silently turn a visual guess into a trusted axiom.

## technique 4: evaluate with proof-environment pass@n and independent formalization judging

What it is. For proof generation, pass@n records whether at least one of n attempts completes a valid proof in the formal environment. The paper states: “This metric evaluates whether the prover can successfully complete a valid proof within n attempts in the formal proof environment.” (Section 5.1, p. 6)

How to do it (Inference: operationalizing the metric; the paper does not specify a complete execution harness). (1) Generate up to n candidates for each item. (2) Compile/check each candidate in the target assistant. (3) Mark the item successful if any candidate is accepted. (4) For formalization-only output, use GPT-4o to judge consistency with the annotated ground truth. (5) Report pass@1, pass@5, and pass@10 where available, retaining language and difficulty strata (Section 5.1 and Figure 3).

Verus form (Inference). Compile every generated Rust/Verus proof and count an item as passing only when Verus verifies its contracts. Keep attempts separate and report pass@n with the exact number of benchmark items and generation settings. For theorem extraction, compare the generated specification against a reviewed reference or a machine-checkable equivalence relation; a language-model judge alone should be treated as an evaluation assumption.

Evidence and limits. Table 3 reports, for overall pass@10, Lean 4 5.68% for o1, Coq 19.43% for o1, and Isabelle 6.75% for o1; these are reported model-specific overall rates. The six-model overall averages are 4.26%, 12.15%, and 4.65% respectively. Pass@10 benefits from more attempts, so it is not a single-shot success probability. Section 5.1 states: “For Task 2, which requires the model to formalize the multimodal theorem, we use GPT-4o as the judge to assess whether the formal theorem generated by the model is consistent with the our annotated ground truth.” (p. 6) Inference: this measures judged consistency rather than a machine-checked equivalence proof.

## technique 5: classify failures by proof and formalization stage

What it is. Compare error distributions as well as pass rates. Figure 2 (p. 8) labels seven categories: invalid/unproven proof steps, missing preconditions/hidden assumptions, missing multimodal information, formalization-natural language mismatch, incorrect/undeclared variables/definitions, hallucinated/unjustified constructs, and others. Section 5.3 additionally discusses missing/incorrect library imports; this is not a separately named category in the figure.

How the paper analyzes errors. (1) Compare Claude-3.7, GPT-4.1, and Qwen2.5-VL outputs in Lean 4. (2) Report error-category proportions (Figure 2 and Section 5.3, p. 8). The paper does not specify the sample size, annotation procedure, or whether an output can receive multiple labels. Inference: a reusable implementation should document these choices before comparing distributions.

Numerical discrepancy. Section 5.3 gives Claude’s invalid/unproven steps as 24.9%, missing preconditions/hidden assumptions as 23.8%, and missing unformalized information as 23.3%, together about 72%. Figure 2 instead displays 25.5%, 24.5%, and 23.9%. Section 5.3 gives Qwen’s missing/incorrect-import proportion as 11.3% and incorrect/undeclared-variable proportion as 10.6%; Figure 2 assigns these percentages to incorrect/undeclared variables/definitions and hallucinated/unjustified constructs, respectively. These labels and percentages cannot be reconciled from the paper alone.

Verus form (Inference). Add typed error variants to the proof-generation pipeline and preserve the failed Verus diagnostic with each attempt. Contracts can expose missing preconditions; `assert` failures and unsatisfied `ensures` expose proof-step problems. A verified harness can require that every failed attempt is classified, but classification semantics remain a testing policy rather than a theorem.

Evidence and limits. Section 5.3 describes proportions of model errors; it does not give counts or an explicit denominator.

## technique 6: test autonomous auxiliary construction separately

What it is. Measure whether a model invents useful auxiliary lines or constructions, a distinctive requirement of difficult geometry. The paper says: “However, the success rate of these proofs containing auxiliary constructions (Figure 4 blue and purple solid lines) is very low.” (Section 5.5, p. 9)

What the paper reports. Figure 4 (p. 9) plots the proportion of theorems requiring auxiliary construction, model attempt rates, and proof success rates conditional on an attempt, using pass@10 across three difficulty levels. Section 5.5 analyzes Claude 3.7 and GPT-4.1: attempts increase with difficulty, but proof success remains low. The paper does not specify how requirements or attempts were annotated, or give the exact attempt-rate denominator. Inference: a reproduction needs explicit annotation rules and denominators; requiring a construction in one human proof does not establish that all proofs require it.

Verus form (Inference). Represent a construction as a ghost or executable object with a predicate stating incidence and required properties. Prove construction lemmas with `proof fn`s, then pass the object to the main proof. Use `requires` to ensure the construction is well-defined and `ensures` to state what it contributes. An invented line without a proved property should not be trusted merely because it appears in generated code.

Evidence and limits. The authors interpret the low success rate as a gap between introducing auxiliary objects and using them to advance a proof.

## what is proved, measured, and trusted

Section 3 defines Task 1 acceptance through a formal verifier; Section 5.1 assigns Task 2 consistency assessment to GPT-4o. The paper does not explain how generated-statement fidelity is enforced for each accepted Task 1 proof. Inference: proof checking alone cannot establish fidelity to image and text, so manual references, premise extraction, and semantic judgments remain part of the trust boundary. The paper measures pass@n, error-category proportions, task and language strata, and auxiliary-construction attempts. It does not prove that images were formalized without omissions, that the benchmark is representative of all mathematics, or that a model’s failed proof contains no useful lemma. Inference: a Verus version would move generated Rust proof obligations into a checker, but would inherit trust in extracted visual premises, specifications, libraries, and external arithmetic/geometry models.

## reproducibility limits

Appendix E (p. 19) states: “Firstly, the testing of MLLMs in this paper primarily involves one-shot generation of formal theorems and proofs, and does not explore multi-step or interactive proof generation capabilities.” Inference: this describes the generation process rather than the number of sampled attempts; pass@10 still allows multiple attempts. Appendix F’s prompt images conflict with their captions: Figures 8–9 (pp. 20–21) are captioned as theorem proving, but Figure 9 instructs:

> Do NOT include any proof or attempt to prove the theorem.

Figure 10 (p. 22), captioned as formalization, requests a complete formal proof. Inference: these inconsistencies leave the actual task prompts uncertain without checking the released implementation, which this study did not do.

## techniques for the catalog

- multimodal benchmark construction — pair images and text with reviewed Lean 4, Coq, and Isabelle formalizations across difficulty levels
- modality-leakage prevention — hide gold formal theorems and supply only image plus natural-language statement
- formalization/proving task split — evaluate theorem extraction separately from proof construction
- diagram-premise recovery — turn implicit visual relations into explicit formal assumptions
- pass@n proof checking — accept an item only when one of n generated candidates is verified
- stage-specific error analysis — classify failures into assumptions, formalization, imports, and proof steps
- auxiliary-construction evaluation — measure construction attempts and proof success conditional on attempting
