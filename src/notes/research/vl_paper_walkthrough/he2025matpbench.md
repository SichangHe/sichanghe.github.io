# MATP-BENCH: Can MLLM Be a Good Automated Theorem Prover for Multimodal Problems?
(authored by agents unless marked 🧑)
Tag: `he2025matpbench`, [paper](http://arxiv.org/abs/2506.06034v1)

## scope and central result

MATP-BENCH evaluates multimodal large language models (MLLMs) as theorem provers. Each item combines an image and a natural-language statement whose information is complementary, and has manually written formalizations in Lean 4, Coq, and Isabelle. The paper states: “MATP-BENCH consists of 1056 multimodal theorems drawn from high school, university, and competition-level mathematics.” (abstract, p. 1) The benchmark spans 472 high-school, 468 college, and 116 competition problems; 937 are plane geometry, 73 three-dimensional geometry, and 46 analytic geometry (Table 2, p. 5).

The end-to-end task is difficult. Task 1 requires a model to infer a complete formal theorem from image plus text and then produce a proof accepted by the formal environment. Across six models and all difficulty levels, Task 1 pass@10 averages are 4.26% in Lean 4, 12.15% in Coq, and 4.65% in Isabelle (Table 3, p. 7; denominators are benchmark problems per level and model, with pass@10 meaning success within ten attempts). Task 2 asks only for formalization; overall pass@10 averages are 45.16% in Lean 4, 33.74% in Coq, and 43.51% in Isabelle (Table 4, p. 7). Inference: the large Task 1–Task 2 gap isolates proof construction as a major bottleneck after basic multimodal formalization.

## technique 1: construct a multimodal, multi-language, multi-level benchmark

What it is. Build every sample from image, natural-language statement, and parallel formal theorem statements in three proof assistants. The paper calls this “a Multimodal, Multi-level, and Multi-language benchmark designed to evaluate MLLMs as automated theorem provers.” (Section 4, p. 4)

When to use it. Use this design to test the complete chain from visual interpretation to formal proof, rather than text-only theorem proving. It is especially suited to geometry where diagrams carry relations omitted from prose.

How to do it, from the paper. (1) Collect high-school and university items from public multimodal mathematics datasets and competition items from public Mathematical Olympiad examinations (Section 4, p. 5). (2) Preserve the image and natural-language description as the model input. (3) Manually annotate each theorem in Lean 4, Coq, and Isabelle (Section 4). (4) Organize by educational level, geometry type, and topic. (5) Release data and code for reproducible evaluation; the authors provide a public benchmark site (abstract and Section 1).

Verus form (Inference: the paper uses Lean, Coq, and Isabelle, not Verus). A Verus benchmark item can store an image and text as external test data and provide a Rust/Verus theorem statement with `requires` facts representing all extracted diagram relations. A verified checker can use `ensures` to connect a proof result to the formal statement. The image interpretation and natural-language parser remain outside the proof unless separately formalized. Verus is therefore a target proof language in an analogous benchmark, not a drop-in conversion of these assistant libraries.

Evidence and limits. The benchmark’s 1,056 items and explicit parallel formalizations make proof acceptance mechanically checkable. The manual formalization effort was substantial: each item was reviewed by at least one other team member, and average time per language was about 25 minutes for high school, 30 for university, and 15 for competition items (Section 4, p. 5). The corpus is geometry-heavy (88.7% plane geometry), so its results do not represent all mathematics.

## technique 2: prevent modality leakage and split formalization from proving

What it is. Hide the gold formal theorem from the model and define two tasks. The paper explains: “To avoid modality leakage, where the model could ignore visual inputs, we provide only natural language S and image I, without the formalized theorem T.” (Section 3, p. 4)

Task 1 is end-to-end: `ProverTask1(I, S) → (T, P)` where `Check(T, P) = True`. Task 2 is formalization only: `ProverTask1(I, S) → T`; a judge checks consistency with the annotated theorem (Section 4, pp. 5–6). This separation distinguishes seeing and encoding the theorem from proving it.

How to do it. (1) Supply only image and text. (2) For Task 1, require both a formal theorem and a proof accepted by Lean, Coq, or Isabelle. (3) For Task 2, require only a formal theorem. (4) Evaluate Task 2 against annotated ground truth; the authors use GPT-4o as judge. (5) Compare the two pass@n rates to locate the bottleneck (Sections 3–5).

Verus form (Inference). Define a task input struct containing image-derived facts and text-derived claims, and a formal theorem predicate over those facts. Use `requires` for the extracted assumptions and `ensures` for the theorem result. Run the generated proof through Verus; acceptance is the analogue of `Check(T,P)=True`. A separate specification can check that the generated frame contains every required diagram relation. The judge or parser remains trusted unless its output is itself verified.

Evidence and limits. In Lean 4, Task 1 average pass@10 declines from 6.96% at high school to 3.12% university and 2.08% competition; Task 2 overall reaches 46.81% in the paper’s discussion (Section 5.2, p. 6). These percentages are model averages over the relevant benchmark strata, not per-item accuracy. GPT-4o judging introduces a model-based evaluation dependency for Task 2.

## technique 3: manually recover implicit diagram assumptions during formalization

What it is. Treat a diagram as carrying theorem premises that prose omits. Figure 1 shows examples where “From diagram” axioms encode coplanarity, a point on an extended line, distinctness, and non-collinearity. The authors state: “Many essential assumptions are conveyed exclusively through diagrams.” (Section 4, p. 5)

When to use it. Use this step whenever the natural-language statement is incomplete and geometric relations are visually specified. Without it, a formal theorem may be weaker, different, or trivially satisfiable.

How to do it. (1) Inspect the image for incidence, order, perpendicularity, midpoint, coplanarity, and distinctness facts. (2) Convert each fact into an explicit premise in the target assistant. (3) Combine those premises with textual hypotheses. (4) State the intended conclusion. (5) Have another team member review the formalization (Section 4, p. 5).

Verus form (Inference). Encode recovered facts as a Rust structure or ghost state with predicates. A function contract can use `requires` such as collinearity, midpoint equality, or nonzero denominators; `ensures` states the geometric conclusion. Use `proof fn`s for derived geometric lemmas and `assert` to expose intermediate equalities. Diagram pixels themselves do not prove a relation: the extracted relation is an assumption unless a verified geometry parser establishes it.

Evidence and limits. The authors report that high-school and university descriptions are concise while images contain rich information requiring preprocessing, whereas competition statements are more detailed and easier to formalize (Section 4, p. 5). Error analysis identifies missing unformalized information and hidden assumptions as major failure categories. Inference: product systems must preserve provenance for each premise so an agent cannot silently turn a visual guess into a trusted axiom.

## technique 4: evaluate with proof-environment pass@n and independent formalization judging

What it is. For proof generation, pass@n records whether at least one of n attempts completes a valid proof in the formal environment. The paper states: “This metric evaluates whether the prover can successfully complete a valid proof within n attempts in the formal proof environment.” (Section 5.1, p. 6)

How to do it. (1) Generate up to n candidates for each item. (2) Compile/check each candidate in the target assistant. (3) Mark the item successful if any candidate is accepted. (4) For formalization-only output, use GPT-4o to judge consistency with the annotated ground truth. (5) Report pass@1, pass@5, and pass@10 where available, retaining language and difficulty strata (Section 5.1 and Figure 3).

Verus form (Inference). Compile every generated Rust/Verus proof and count an item as passing only when Verus verifies its contracts. Keep attempts separate and report pass@n with the exact number of benchmark items and generation settings. For theorem extraction, compare the generated specification against a reviewed reference or a machine-checkable equivalence relation; a language-model judge alone should be treated as an evaluation assumption.

Evidence and limits. Table 3 reports, for overall pass@10, Lean 4 5.68% for o1, Coq 19.43% for o1, and Isabelle 6.75% for o1; these are model-specific rates over the full 1,056-item benchmark. The six-model overall averages are 4.26%, 12.15%, and 4.65% respectively. Pass@10 benefits from more attempts, so it is not a single-shot success probability. Task 2 uses a GPT-4o judge rather than proof checking and therefore measures judged consistency, not theorem-prover acceptance.

## technique 5: classify failures by proof and formalization stage

What it is. Count distinct error categories rather than reporting only pass rates. Figure 2 and Section 5.3 identify invalid or unproven proof steps, missing preconditions or hidden assumptions, missing multimodal information, formalization–natural-language mismatch, incorrect or undeclared variables/definitions, hallucinated or unjustified constructs, and missing or incorrect imports.

How to do it. (1) Collect failed outputs from competitive models. (2) Assign each failure to the most specific category. (3) Compare category proportions by model. (4) Use the distribution to decide whether to improve perception, formalization, library use, or proof search. Claude’s three largest categories are invalid/unproven steps (24.9%), missing preconditions/hidden assumptions (23.8%), and missing unformalized information (23.3%), together about 72% of its errors (Section 5.3, p. 8). Qwen’s reported missing-import rate is 11.3% and incorrect/undeclared-variable rate 10.6% (same section).

Verus form (Inference). Add typed error variants to the proof-generation pipeline and preserve the failed Verus diagnostic with each attempt. Contracts can expose missing preconditions; `assert` failures and unsatisfied `ensures` expose proof-step problems. A verified harness can require that every failed attempt is classified, but classification semantics remain a testing policy rather than a theorem.

Evidence and limits. Error percentages are within each model’s analyzed error set, not fractions of all 1,056 problems. The categories explain why formalization-only success can coexist with proof failure. Inference: this diagnosis is more actionable for VL than a single aggregate score because it maps directly to parser contracts, library coverage, and lemma-generation work.

## technique 6: test autonomous auxiliary construction separately

What it is. Measure whether a model invents useful auxiliary lines or constructions, a distinctive requirement of difficult geometry. The paper says: “However, the success rate of these proofs containing auxiliary constructions … is very low.” (Section 5.5, p. 9)

How to do it. (1) Identify items whose human proofs require auxiliary construction. (2) Measure the proportion of items where a model attempts one. (3) Among attempts, measure successful proofs. (4) Stratify by high-school, university, and competition difficulty and report pass@10 (Figure 4). The study finds that attempt rates increase with difficulty for Claude 3.7 and GPT-4.1, while success conditional on attempting remains low.

Verus form (Inference). Represent a construction as a ghost or executable object with a predicate stating incidence and required properties. Prove construction lemmas with `proof fn`s, then pass the object to the main proof. Use `requires` to ensure the construction is well-defined and `ensures` to state what it contributes. An invented line without a proved property should not be trusted merely because it appears in generated code.

Evidence and limits. The benchmark demonstrates a specific gap: models can mention or create auxiliary objects but often cannot use them to advance a proof. The paper does not provide a universal construction algorithm or prove that the attempted constructions are mathematically appropriate. Inference: VL should evaluate construction validity and downstream usefulness separately, rather than counting a syntactic auxiliary object as progress.

## what is proved, measured, and trusted

The formal assistants mechanically check accepted Task 1 proofs, but the benchmark construction, manual formalizations, image-to-premise interpretation, prompts, model outputs, and Task 2 GPT-4o judgments remain trusted or partially trusted. The paper measures pass@n, error-category proportions, task and language strata, and auxiliary-construction attempts. It does not prove that images were formalized without omissions, that the benchmark is representative of all mathematics, or that a model’s failed proof contains no useful lemma. Inference: a Verus version would move generated Rust proof obligations into a checker, but would inherit trust in extracted visual premises, specifications, libraries, and external arithmetic/geometry models.

## what VL should reuse and threat to a product

Inference: VL should reuse the two-stage interface (natural language and visual input to a normalized formal statement, then proof), modality-leakage prevention, proof-environment pass@n, explicit hidden-assumption tracking, and error categories tied to repair actions. VL should not redo the benchmark’s basic finding that multimodal formalization is easier than end-to-end proving; it should test agent-written Verus code with independent specifications and exact compiler/verifier logs. Inference: the product threat is high for agent proof generation capability claims because the benchmark shows very low end-to-end rates across three assistants, but low for a competing verified-Rust product because MATP-BENCH supplies evaluation evidence rather than a deployed system.

## techniques for the catalog

- multimodal benchmark construction — pair images and text with reviewed Lean 4, Coq, and Isabelle formalizations across difficulty levels
- modality-leakage prevention — hide gold formal theorems and supply only image plus natural-language statement
- formalization/proving task split — evaluate theorem extraction separately from proof construction
- diagram-premise recovery — turn implicit visual relations into explicit formal assumptions
- pass@n proof checking — accept an item only when one of n generated candidates is verified
- stage-specific error analysis — classify failures into assumptions, formalization, imports, and proof steps
- auxiliary-construction evaluation — measure construction attempts and proof success conditional on attempting
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
