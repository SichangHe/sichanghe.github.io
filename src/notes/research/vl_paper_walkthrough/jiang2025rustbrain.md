# Unlocking a New Rust Programming Experience: Fast and Slow Thinking with LLMs to Conquer Undefined Behaviors
(authored by agents unless marked 🧑)
Tag: `jiang2025rustbrain`, [paper](http://arxiv.org/abs/2503.02335v1)

## scope and result

Jiang et al. present RustBrain, an LLM framework for repairing undefined behavior (UB) in Unsafe Rust. It combines fast generation of multiple candidate repairs with slow decomposition, verification, rollback, abstract reasoning, and feedback-driven generalization. The implementation uses Miri to detect UB and accepts a repair only when it passes Miri and a semantic-acceptability judgment against developer-repaired code. The paper reports 94.3% pass and 80.4% execution rates for its best GPT-4 plus knowledge configuration, on its Miri dataset; these are percentages of the evaluated repair cases, with the exact dataset size not stated in the extracted text.

The abstract says: “Fast thinking extracts features to generate solutions, while slow thinking decomposes, verifies, and generalizes them abstractly.” (Abstract, p. 1). It also says: “Experimental results on Miri dataset show a 94.3% pass rate and 80.4% execution rate.” (Abstract, p. 1). Inference: the work is an automated dynamic-analysis and repair loop, not a formal proof of arbitrary Rust properties.

## technique 1: classify Unsafe Rust by repair strategy

what it is. The paper distinguishes five language-level unsafe operations—raw-pointer dereference, unsafe-function calls, unsafe-trait implementations, mutable-static access, and union-field access—and three repair strategies: safe replacement, assertions, and semantic modification. The paper says: “Unsafe Rust can be divided into five categories [1]: dereference raw pointers, call unsafe functions, implement unsafe traits, access/modify mutable static variables, and access union fields.” (Section III-A, p. 3).

when to use it. Use the classification to route each Miri error to a strategy-specific agent. A safe replacement is appropriate when an equivalent standard API exists; an assertion is appropriate when a boundary or type condition can be checked without changing intended behavior; semantic modification is needed when the code's logic or lifetime is wrong. Inference: this routing reduces prompt ambiguity but depends on correctly identifying the root cause.

how to do it. (1) Run Miri and record the error and location. (2) Identify the unsafe operation and its context. (3) Ask a replacement agent to find a safe API with the same functionality, an assertion agent to add a precondition check, or a modification agent to repair erroneous semantics while preserving intended behavior. (4) Submit each candidate to the slow stage. Figure 4 gives the three prompt forms: “Find Safe API with same functionally for replacement”; “Pre-assertion added before UB is possible, prevent it”; and “Add assertion and replace cannot resolve, logic issues.” (Figure 4, p. 4).

Verus form. Inference: Verus can express the intended precondition with `requires`, the result with `ensures`, and helper facts in `proof fn` lemmas. A safe replacement should preserve the same contract; an assertion repair can become a proved precondition; semantic modification requires a new specification and a proof that the changed code meets it. Inference: a Miri pass alone does not establish a Verus postcondition.

evidence and limits. The paper's Fig. 3 shows context-sensitive replacements: `mem::transmute::<[u8;2],u32>` becomes `u32::from_le_bytes`, while another transmute uses pointer casts. Inference: syntactic API matching is unsafe because the same API can require different repairs. Miri cannot detect errors outside its supported checks; the scope section says “Errors not detected by Miri are beyond the scope of this paper.” (Section II-A, p. 2).

## technique 2: fast thinking feature extraction and candidate generation

what it is. Fast thinking uses Miri's error, source code, and design hints. A general-knowledge LLM extracts features and another LLM generates multiple repair candidates. The paper says: “Firstly, RustBrain, based on five types of unsafe operations, employs a general-knowledge LLM to rapidly analyze code features, leveraging its generalization capability to identify typical error patterns and guide solution generation.” (Section III-A, p. 3).

when to use it. Use it as a high-recall first stage, before expensive semantic reasoning. Multiple candidates expose alternatives when a single direct fix would hallucinate or overfit.

how to do it. (1) Feed Rust code to Miri. (2) If no UB is reported, terminate with pass. (3) Otherwise send errors, code, and design hints to a feature-extraction LLM. (4) Combine extracted features with a second LLM prompt. (5) Generate solutions 1 through N and pass them to slow thinking. These steps are listed under Stage F1/F2 in Section II-B, p. 2.

Verus form. Inference: use this stage to propose candidate Rust and candidate contracts, then run Verus on each. The generated code must remain subject to ordinary Rust ownership and Verus checking; LLM output is not trusted evidence.

evidence and limits. The paper does not report candidate counts per case or the fraction discarded before slow thinking. Its evaluation uses Miri-source files and temporarily excludes code exceeding LLM token limits (Section II-A, p. 2). Inference: long, cross-module functions and unmodeled unsafe effects can be systematically omitted.

## technique 3: slow decomposition with specialized agents

what it is. Slow thinking decomposes each candidate into steps, validates steps with multiple agents, reasons about Rust semantics, and generalizes a successful repair. It includes three fixing agents, an adaptive rollback agent, and an abstract reasoning agent. The paper says: “First, RustBrain splits solutions into multiple steps, analyzing and addressing UBs layer by layer.” (Section III-B, p. 3).

when to use it. Use decomposition when a candidate mixes several unsafe operations or requires a sequence of dependent edits. Specialized agents let replacement, assertion, and semantic changes be evaluated separately.

how to do it. (1) Split the candidate into refined repair steps. (2) Execute and validate steps in order. (3) Use the three repair agents to check safe alternatives, assertions, and semantic changes. (4) Evaluate the result and adjust iteration count, parameters, or execution path. (5) Generalize the optimized repair into a feature-to-solution feedback entry. These stages are described in Sections II-B and III-B, pp. 2–5.

Verus form. Inference: each step can be a small Rust change with a contract-preserving lemma. Keep intermediate states compilable and prove the relevant invariant after each step. Inference: the paper's agents are orchestration components; Verus itself supplies the proof checker, not the decomposition policy.

evidence and limits. The paper gives the example error sequence `N1 = {1, 3, 4, 6, 9}` for worsening hallucinated repairs and `N2 = {3, 1, 5, 2, 0}` for fluctuating improvement (Section III-B2, p. 4). These are illustrative sequences, not an evaluation denominator.

## technique 4: adaptive rollback and optimal-state selection

what it is. Rather than always reverting to the initial code, RustBrain tracks error counts and rolls back to the best state before the next stage. The paper says: “before proceeding to the next stage, the process rollback to the optimal code state (the fewest detected errors) to prevent error propagation.” (Section III-B2, p. 4).

when to use it. Use adaptive rollback when later LLM edits can increase Miri errors while earlier edits remain valuable. It preserves partial progress and limits hallucination propagation.

how to do it. (1) Record each thought state `T_i` and its Miri error count `n_i`. (2) Compare the current count with prior states. (3) Before advancing, restore the state with the fewest errors. (4) Continue with the next repair stage from that state. (5) Feed the selected state and evaluation back into candidate generation. The sequence definitions and rollback procedure appear in Section III-B2, pp. 4–5.

Verus form. Inference: keep each candidate in a separate branch or commit and select only branches that pass Verus plus tests. A proof failure is a branch rejection; a lower Miri count is not evidence that a branch satisfies a contract.

evidence and limits. The paper contrasts direct rollback overhead `c * T_n` with retaining partial corrections (Section III-B2, p. 4), but gives no measured rollback count or cost breakdown.

## technique 5: AST-centered abstract reasoning and feedback generalization

what it is. The abstract reasoning agent extracts an AST with an LLM, prunes irrelevant nodes, records unsafe locations and error causes, compares vector representations, and supplies a focused AST prompt to a repair agent. The paper says: “RustBrain introduces a knowledge base centered on AST (Abstract Syntax Tree) and semantic analysis.” (Section III-B3, p. 5).

when to use it. Use it for repeated UB patterns where raw source context contains too much syntax noise and a fixed API-pattern knowledge base misses semantic combinations.

how to do it. (1) Extract the original AST and Miri errors. (2) Prune irrelevant nodes. (3) retain unsafe locations, error causes, and the relevant subtree. (4) compare the error AST with stored vectors. (5) query similar cases and generate a repair from the focused AST. (6) Store evaluated solutions and match them to future error features. Figure 6 and Section III-B3 describe these steps (p. 5); Stage S3 describes feedback generalization (p. 2).

Verus form. Inference: an AST index can retrieve candidate Verus contracts or lemmas, but the retrieved artifact must be checked in the current module. Inference: semantic vector similarity cannot replace a proof of representation invariants.

evidence and limits. The authors explicitly choose an LLM AST extractor over `syn` because they find `syn` overly complex and lacking higher-level semantic understanding (Section III-B3, p. 5). Inference: this introduces another model-dependent trusted component and possible parsing errors.

## evaluation, measurements, and assumptions

The dataset is collected from the official Miri repository and contains Rust code with UBs; errors not detected by Miri are excluded (Section II-A and IV, pp. 2, 5). Metrics are defined as pass rate, the percentage passing Miri, and execution rate, the percentage passing Miri with acceptable semantics (Section IV, p. 5). For GPT-4 plus RustBrain and its knowledge base, the paper reports 94.3% pass and 80.4% execution; GPT-4 plus RustBrain without the knowledge base is reported at 90.5% and 70.2% (Section IV, p. 5). The paper says the best temperature is 0.5, with 97% pass and 77% execution in its sampling experiment (Section IV, p. 6). Table I reports 12 error types; GPT-4+RustBrain with knowledge averages 84.9 seconds versus 442 seconds for humans, a 7.4x speedup, with per-type denominators one case category at a time (Table I, p. 6). The paper also reports “pass rate and execution rate ... increased by 33% and 41%, respectively” over RustAssistant (Section IV, p. 6), but the extracted text does not give the underlying fractions; the percentage-point versus relative interpretation is therefore unresolved.

Proved: no formal theorem is proved. Measured: Miri pass, semantic acceptability, and repair time. Trusted: Miri's detection coverage, developer-repaired-code semantic labels, LLM outputs, prompts, AST extraction, and the chosen dataset. Inference: product risk is that agent-written verified Rust may optimize the measured Miri oracle while missing UB classes, concurrency behavior, or semantics absent from the benchmark. Inference: Verus can add specification evidence, but only for properties written and proved.

## techniques for the catalog

- repair-strategy classification — route unsafe operations to safe replacement, assertion, or semantic-modification agents
- fast feature-to-candidate generation — use Miri diagnostics and LLM feature extraction to produce multiple repair candidates
- slow decomposed verification — split candidates into steps and validate them with specialized agents
- adaptive rollback — retain the state with the fewest detected errors instead of always resetting to the initial state
- AST feedback generalization — index focused semantic ASTs and feed evaluated fixes back into future generation

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
