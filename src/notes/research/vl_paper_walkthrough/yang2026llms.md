# Can LLMs Prove Robotic Path Planning Optimality? A Benchmark for Research-Level Algorithm Verification
(authored by agents unless marked 🧑)
Tag: `yang2026llms`, [paper](http://arxiv.org/abs/2603.19464v3)

## scope and result

This paper tests whether language models can produce research-level approximation proofs for robotic path-planning algorithms. It curates 34 tasks from 11 peer-reviewed robotics papers. Each task contains a planning problem, algorithm, formal approximation guarantee, and optionally extracted lemmas and the oracle ratio. The benchmark asks for both a ratio and a proof, then evaluates final-answer correctness, reasoning correctness, and relevance to the supplied problem. The abstract describes “34 research-grade proof tasks spanning diverse planning problem types and complexity levels” (Abstract, p. 1). The authors report that “providing LLMs with task-specific in-context lemmas substantially improves reasoning quality” (Abstract, p. 1).

Inference: the paper is a warning for VL. A model can know a plausible high-level argument yet fail to check preconditions, constraints, or domain-specific invariants. Verus can mechanize those checks only after the planning problem and algorithm have been represented as explicit Rust data, contracts, and lemmas.

## technique 1: source-grounded extraction and anonymized benchmark construction

what it is

Experts select papers with nontrivial constrained planning algorithms and formal guarantees. An automated GPT-5.2 pipeline converts each PDF to structured LaTeX, extracts the problem definition, algorithm, ratio, proof, and invoked lemmas, and standardizes notation and tables. Four human annotators verify extracted data and the LLM-as-judge instructions. Algorithm and problem names are anonymized because familiar names can trigger memorized proofs rather than reasoning.

The paper says: “Given each paper PDF, the pipeline first converts the contents into a structured LaTeX document” (Section III-C, p. 3). It then extracts “(i) the formal problem definition(s) T , (ii) the algorithm definition A, (iii) the ground-truth approximation ratio α and its corresponding proof, and (iv) the key lemmas invoked by the ground truth proof C” (Section III-C, p. 3). On contamination control, it states: “To prevent this, we have anonymized all problem and algorithm names in our benchmark” (Section III-C, p. 3).

when to use it

Use source-grounded extraction when building a verification corpus from papers or requirements whose equations and tables must remain faithful. Anonymize retrieval cues when measuring reasoning rather than recall. Retain the original source and a machine-readable representation for audit.

how to do it

1. Expert-select papers with explicit approximation proofs and operational constraints (Section III-C, p. 3)
2. Convert each PDF to structured LaTeX, preserving mathematical expressions and tables (Section III-C, p. 3)
3. Extract T, A, α, the proof, and supporting lemmas C (Section III-C, p. 3)
4. Standardize notation and tables; anonymize names that could reveal a memorized solution (Section III-C, p. 3)
5. Have four human annotators verify extraction quality and judge prompts (Section III-C, p. 3)

Verus form

Inference: convert the extracted algorithm into executable Rust, the planning constraints into typed state and `requires` clauses, and each source lemma into a `proof fn` with explicit preconditions and `ensures`. Keep a source-to-contract record and test the extraction against the paper before generating proofs. Name anonymization has no direct Verus analogue; it is an evaluation-control measure.

what shows it works

The resulting corpus has 34 tasks from 11 papers (Sections I and III-B, pp. 1, 3). The authors manually verified data with four annotators (Section III-C, p. 3). These are dataset-quality controls, not evidence that every extracted theorem is machine-checked.

where it fails or assumes

The pipeline depends on PDF conversion and LLM extraction, so equations, tables, and implicit assumptions can be misread. Human review is a filter rather than a formal proof. Inference: a VL ingestion pipeline needs compilation or proof checks after extraction because a faithful-looking contract may still omit an operational condition.

## technique 2: context ablation with in-context lemmas and posterior ratio

what it is

The benchmark separates four information settings. Setting 1 gives only the problem and algorithm. Setting 2 adds key source lemmas C. Setting 3 gives the ground-truth approximation ratio α without lemmas. Setting 4 gives both C and α. Generic chain-of-thought (CoT) is optionally added. This factorial design distinguishes domain knowledge from a target answer and from prompting style.

The task definition says each input consists of “a problem description T , the given algorithm A to sovle T , an optional set of in-context lemmas C, and an optional posterior approximation ratio α” (Section III-A, p. 2). The authors conclude: “posterior information is not a substitute for domain knowledge; instead, it acts as a complementary signal that refines and stabilizes the derivation after the proof skeleton has been grounded by the provided lemmas” (Section IV-C, p. 5).

when to use it

Use this design to measure which supplied artifacts actually improve verification. Compare domain lemmas, a claimed result, and generic reasoning instructions separately; do not attribute gains to a prompt template when the model received new mathematical facts.

how to do it

1. Fix T and A for each task (Section III-A, p. 2)
2. Prepare C from the ground-truth proof and α from the source paper (Section III-A, p. 2)
3. Run the same models under no-context, context, posterior-only, and context-plus-posterior settings (Section IV-A, p. 3)
4. Optionally add the same CoT template and compare with its absence (Section IV-C, p. 5)
5. Score final answer, reasoning, and relevance under one rubric (Section IV-B, p. 4)

Verus form

Inference: provide a Verus agent with source-backed helper lemmas and contracts as retrieval context, while keeping the target function and specification fixed. A posterior ratio can become an `ensures` target or a consistency check, but it must not replace proofs of feasibility and approximation bounds. Compare runs with no lemmas, retrieved lemmas, and retrieved lemmas plus the target bound.

what shows it works

In Setting 1, GPT-5.2 reaches 26.47% success, where success requires both final-answer and reasoning scores of at least 7; Gemini 3 Pro reaches 11.76%, Grok 4.1 14.71%, and Qwen3.5 8.82% (Table I, p. 4). With context in Setting 2, the rates are GPT 5.2 32.35%, Gemini 3 Pro 35.29%, Grok 4.1 29.41%, and Qwen3.5 44.12% (Table I, p. 4). In Setting 4, with context and α, the rates are 50.00%, 38.24%, 41.18%, and 32.35% in the same model order (Table I, p. 4). The denominator is 34 tasks for each percentage, as stated by the benchmark size (Section III-B, p. 3).

where it fails or assumes

The benchmark uses an LLM judge for first-round scoring, followed by human verification (Section III-C, p. 3). Scores therefore remain partly evaluator-dependent. The source proof and lemmas may themselves contain abstraction choices that do not transfer to executable Rust.

## technique 3: three-axis grading and explicit error taxonomy

what it is

Each generated proof is scored from 1 to 10 on final answer (ratio exactness and parameter dependence), reasoning correctness (valid deductions and inequalities), and proof relevance (faithful use of supplied context). Errors are multi-label and divided into logical errors—overgeneralization, oversimplification, missing edge cases, skipped computation, uncited non-standard results, wrong inequality direction, unsupported inference—and hallucinations such as inserted assumptions, irrelevant problems, or omitted/contradicted constraints.

The paper defines the relevance score as rewarding “precise use of supplied lemmas and definitions while penalizing reliance on invented or irrelevant reasoning” (Section IV-B, p. 4). It reports: “multiple errors may exist in one LLM-generated proof” (Section IV-D, p. 5).

when to use it

Use separate axes when a scalar pass/fail hides whether a model got the ratio, the derivation, or the source conditions right. Use multi-label errors when one proof fails for several interacting reasons.

how to do it

1. Compare the predicted ratio with the source ratio, including constants and parameter dependence (Section IV-B, p. 4)
2. Check every derivation step for valid inequalities, feasibility, and justified transitions (Section IV-B, p. 4)
3. Check that cited lemmas and definitions match the supplied task (Section IV-B, p. 4)
4. Assign 1–10 scores and mark every applicable logical or hallucination error (Section IV-D, p. 5)
5. Aggregate errors by setting, retaining denominators and the multi-label rule (Table II, p. 5)

Verus form

Inference: implement three reports for a Verus result: contract-target correctness, proof-obligation validity, and source-trace relevance. Classify failures such as missing `requires`, an invalid inequality lemma, omitted edge cases, or an assumption that is stronger than the source. Keep labels multi-valued because one failed proof can have both a type error and a missing invariant.

what shows it works

For Setting 1 without CoT, Table II counts 160 unsupported inferences, 272 total logical errors, and 216 total hallucination errors across the evaluated proof outputs (p. 5). With in-context lemmas (Setting 2 without CoT), unsupported inferences fall to 136, logical errors to 230, and hallucinations to 154 (Table II, p. 5). The counts are error instances, not percentages and not necessarily distinct proofs because labels are multi-label.

where it fails or assumes

An LLM judge may miss subtle mathematical errors, while human review is expensive. Counts cannot be interpreted as independent probabilities because one proof contributes multiple labels. The rubric also evaluates natural-language proofs rather than kernel-checked artifacts.

## technique 4: first-error position as a long-horizon diagnostic

what it is

The authors normalize the position of the first detected error to 0–100% of proof length and compare it with average reasoning score. This detects error propagation: a wrong early abstraction can make later steps appear coherent while being invalid.

The paper reports that “overall score of LLM proof is positively correlated with the first-error position” (Section IV-D, p. 6). Across settings, average reasoning score and first-error position are 3.65/23.68% (no context), 4.86/29.68% (context), 4.30/28.08% (posterior), and 5.29/31.37% (context plus posterior) (Table IV, p. 6).

when to use it

Use first-error position to prioritize intervention. Early errors suggest the model needs better problem parsing or lemma preconditions; late errors suggest local algebra, edge-case, or bookkeeping repair.

how to do it

1. Mark the earliest invalid inference in each generated proof (Section IV-D, p. 6)
2. Divide its location by proof length and report a percentage (Table III, p. 6)
3. Pair this measure with reasoning score (Table IV, p. 6)
4. Compare interventions that move the first error later, not only those that improve the final ratio (Section IV-D, p. 6)

Verus form

Inference: record the first Verus diagnostic or failed assertion in a proof trace, normalized by declaration or proof-step count. A failure in an early invariant or precondition should trigger contract-context retrieval; a later arithmetic failure should trigger a local lemma or solver change. Verus does not expose exactly the paper’s natural-language position metric, so this transfer is an inference.

## what is proved, trusted, and still open

The benchmark establishes empirical model behavior under its scoring protocol; it does not machine-check the generated proofs. The source papers supply the ground-truth ratios and proof references, while GPT-5.2 judging and four human annotators supply evaluation and extraction checks. Inference: VL should treat such evidence as a diagnosis of agent behavior, then require Verus verification for product claims.

The strongest no-context success is 26.47% (GPT 5.2, 34-task denominator), while context raises Qwen3.5 to 44.12% and context-plus-ratio raises GPT 5.2 to 50.00% (Table I, p. 4). Generic CoT alone is not a reliable substitute for domain context; the paper says it “does not meaningfully reduce task difficulty across settings” when used alone (Section IV-C, p. 5). The paper’s key failure pattern is unsupported inference: a model invokes a relevant lemma without checking its preconditions, or silently changes a constrained routing problem into a simpler one (Section IV-E, p. 6).

Inference: the threat to agent-written verified Rust is high when agents receive only prose and API names. The likely failure is a plausible but overgeneralized contract that Verus cannot prove, or a contract strengthened until proof succeeds while no longer representing the source requirement. VL should build a reusable, source-linked lemma and contract library, retrieve it by task structure, and check every generated proof against executable constraints. The benchmark’s anonymization and ablation methods are already an evaluation pattern VL can reuse; VL should not redo a natural-language proof benchmark without adding kernel-checked Rust artifacts.

## techniques for the catalog

- source-grounded extraction — convert papers into structured problem, algorithm, ratio, proof, and lemma records with human audit
- anonymized benchmark tasks — remove algorithm and problem names that can act as memorized retrieval cues
- context ablation — compare no context, source lemmas, posterior target, and both under a fixed task
- three-axis proof grading — score answer, reasoning, and relevance separately with multi-label logical and hallucination errors
- first-error diagnostics — normalize the earliest proof error to expose long-horizon error propagation
Checked 2026-10-15 against paper yang2026llms: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
