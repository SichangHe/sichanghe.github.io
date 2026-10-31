# Unlocking a New Rust Programming Experience: Fast and Slow Thinking with LLMs to Conquer Undefined Behaviors
(authored by agents unless marked 🧑)
Tag: `jiang2025rustbrain`, [paper](https://arxiv.org/abs/2503.02335v1)

## scope and result

Jiang et al. present RustBrain, an LLM framework for repairing undefined behavior (UB) in Unsafe Rust. It combines fast generation of multiple candidate repairs with slow decomposition, verification, rollback, abstract reasoning, and feedback-driven generalization. The implementation uses Miri to detect UB. The evaluation distinguishes passing Miri from passing Miri with acceptable semantics, judged against developer-repaired code. The paper reports 94.3% pass and 80.4% execution rates for its best GPT-4 plus knowledge configuration, on its Miri dataset; these are percentages of the evaluated repair cases, with the exact dataset size not stated in the paper.

The abstract says: “Fast thinking extracts features to generate solutions, while slow thinking decomposes, verifies, and generalizes them abstractly.” (Abstract, p. 1). It also says: “Experimental results on Miri dataset show a 94.3% pass rate and 80.4% execution rate, improving flexibility and Rust projects safety.” (Abstract, p. 1). The authors describe Miri as a compiler and its use as static analysis at compile time (Sections II-A and III-A2, pp. 2–3). Inference: the reported Miri and semantic checks do not constitute a formal proof of arbitrary Rust properties.

## technique 1: classify Unsafe Rust by repair strategy

what it is. The paper distinguishes five language-level unsafe operations—raw-pointer dereference, unsafe-function calls, unsafe-trait implementations, mutable-static access, and union-field access—and three repair strategies: safe replacement, assertions, and semantic modification. The paper says: “Unsafe Rust can be divided into five categories [1]: dereference raw pointers, call unsafe functions, implement unsafe traits, access/modify mutable static variables, and access union fields.” (Section III-A, p. 3).

when to use it. Inference: use the classification to route each Miri error to a strategy-specific agent. A safe replacement is appropriate when an equivalent standard API exists; an assertion is appropriate when a boundary or type condition can be checked without changing intended behavior; semantic modification is needed when the code's logic or lifetime is wrong. Inference: this routing reduces prompt ambiguity but depends on correctly identifying the root cause.

how to do it. (1) Run Miri and record the error and location. (2) Identify the unsafe operation and its context. (3) Generate candidate repair strategies in fast thinking. (4) In slow thinking, execute the applicable strategy with a replacement agent to find a safe API, an assertion agent to add a check before UB, or a modification agent to repair erroneous semantics while preserving intended behavior. Figure 4 gives the three prompt forms: “Find Safe API with same functionally for replacement.”; “Pre-assertion added before UB is possible, prevent it .”; and “Add assertion and replace cannot resolve, logic issues. Keep functionally and semantic, avoidng UBs by modifications.” (Figure 4, p. 4).

Verus form. Inference: Verus can express the intended precondition with `requires`, the result with `ensures`, and helper facts in `proof fn` lemmas. A safe replacement should preserve the same contract; an assertion repair can become a proved precondition; semantic modification requires checking the changed code against its intended specification. Inference: a Miri pass alone does not establish a Verus postcondition.

evidence and limits. The paper's Fig. 3 shows context-sensitive replacements: `mem::transmute::<[u8;2],u32>` becomes `u32::from_le_bytes`, while another transmute uses pointer casts. Inference: syntactic API matching is unsafe because the same API can require different repairs. Miri cannot detect errors outside its supported checks; the scope section says “Errors not detected by Miri are beyond the scope of this paper.” (Section II-A, p. 2).

## technique 2: fast thinking feature extraction and candidate generation

what it is. Fast thinking uses Miri's error, source code, and design hints. A general-knowledge LLM extracts features and another LLM generates multiple repair candidates. The paper says: “Firstly, RustBrain, based on five types of unsafe operations, employs a general-knowledge LLM to rapidly analyze code features, leveraging its generalization capability to identify typical error patterns and guide solution generation.” (Section III-A, p. 3).

when to use it. Inference: use it to explore alternative repairs before deeper reasoning. Multiple candidates may help when a single proposed repair is wrong.

how to do it. (1) Feed Rust code to Miri. (2) If no UB is reported, terminate with pass. (3) Otherwise send errors, code, and design hints to a feature-extraction LLM. (4) Combine extracted features with a second LLM prompt. (5) Generate solutions 1 through N and pass them to slow thinking. These steps are listed under Stage F1/F2 in Section II-B, p. 2.

Verus form. Inference: use this stage to propose candidate Rust and candidate contracts, then run Verus on each. The generated code must remain subject to ordinary Rust ownership and Verus checking; LLM output is not trusted evidence.

evidence and limits. RQ1 generates ten solutions for one selected UB requiring semantic modification (Section IV, p. 5). The paper does not state a candidate count for every evaluated case or a fraction discarded before slow thinking. Its evaluation uses Miri-source files and temporarily excludes code exceeding LLM token limits (Section II-A, p. 2). Inference: the results do not establish coverage of code exceeding the token limit or errors Miri does not detect.

## technique 3: slow decomposition with specialized agents

what it is. Slow thinking decomposes each candidate into steps, validates steps with multiple agents, reasons about Rust semantics, and generalizes a successful repair. It includes three fixing agents, an adaptive rollback agent, and an abstract reasoning agent. The paper says: “First, RustBrain splits solutions into multiple steps, analyzing and addressing UBs layer by layer.” (Section III-B, p. 3).

when to use it. Inference: use decomposition when a candidate mixes several unsafe operations or requires a sequence of dependent edits. Specialized agents let replacement, assertion, and semantic changes be evaluated separately.

how to do it. (1) Split each solution into refined steps whose order represents a repair strategy. (2) Use the applicable replacement, assertion, and modification agents to execute and validate the steps. (3) Apply rollback and abstract reasoning as described below. (4) Evaluate the result and refine iteration count, parameters, or execution path. (5) Match error features with optimized solutions through feedback. Section II-B describes the stages (p. 2); Sections III-B and III-C describe the agents and feedback (pp. 3–5).

Verus form. Inference: each step can be a small Rust change with a contract-preserving lemma. Keep intermediate states compilable and prove the relevant invariant after each step. Inference: the paper's agents are orchestration components; Verus itself supplies the proof checker, not the decomposition policy.

evidence and limits. The paper gives the example error sequence `N1 = {1, 3, 4, 6, 9}` for worsening hallucinated repairs and `N2 = {3, 1, 5, 2, 0}` for fluctuating improvement (Section III-B2, p. 4). These are illustrative sequences, not an evaluation denominator.

## technique 4: adaptive rollback and optimal-state selection

what it is. Rather than always reverting to the initial code, RustBrain tracks error counts and rolls back to the best state before the next stage. The paper says: “before proceeding to the next stage, the process rollback to the optimal code state (the fewest detected errors) to prevent error propagation.” (Section III-B2, p. 4).

when to use it. Inference: use adaptive rollback when later LLM edits can increase Miri errors while earlier edits remain valuable. It preserves partial progress and limits hallucination propagation.

how to do it. (1) Track the thought sequence `T` and Miri error-count sequence `N`. (2) Before the next stage, select the intermediate code state with the fewest detected errors. (3) Continue from that state. The sequence definitions and rollback procedure appear in Section III-B2, p. 4. Section III-C separately describes feeding evaluation results into solution generation (p. 5).

Verus form. Inference: keep each candidate in a separate branch or commit and select only branches that pass Verus plus tests. A proof failure is a branch rejection; a lower Miri count is not evidence that a branch satisfies a contract.

evidence and limits. The paper contrasts direct rollback overhead `c * T_n` with its adaptive expression `c * T_(n-a)`, where it calls `a` the number of thoughts produced in the assertion (Section III-B2, p. 4). It gives no measured rollback count or separate rollback cost breakdown.

## technique 5: AST-centered abstract reasoning and feedback generalization

what it is. The abstract reasoning agent extracts an AST with an LLM, prunes irrelevant nodes, records unsafe locations and error causes, compares vector representations, and supplies a focused AST prompt to a repair agent. The paper says: “Therefore, RustBrain introduces a knowledge base centered on AST (Abstract Syntax Tree) and semantic analysis.” (Section III-B3, p. 4).

when to use it. Inference: use it for repeated UB patterns where raw source context contains too much syntax noise and a fixed API-pattern knowledge base misses semantic combinations.

how to do it. (1) Extract the code AST with an LLM. (2) Initialize an empty pruned AST and add nodes containing `unsafe`. (3) For each retained unsafe node, when Miri errors are nonzero, analyze the error context and remove context nodes irrelevant to the unsafe operation. (4) Vectorize the pruned AST and search the knowledge base by similarity. (5) Add retrieved repair solutions to the LLM prompt. Figure 6, Algorithm 1, and Section III-B3 describe this process (p. 4). Separately, feedback evaluates solutions using accuracy (passing Miri), acceptability (semantic consistency), and overhead (time and resource use), then uses the results to adjust solution generation (Section III-C, p. 5).

Verus form. Inference: an AST index can retrieve candidate Verus contracts or lemmas, but the retrieved artifact must be checked in the current module. Inference: semantic vector similarity cannot replace a proof of representation invariants.

evidence and limits. The authors explicitly choose an LLM AST extractor over `syn` because they find `syn` overly complex and lacking higher-level semantic understanding (Section III-B3, p. 4). Inference: LLM extraction may introduce AST errors that affect retrieval and repair.

## evaluation, measurements, and assumptions

The dataset is collected from the official Miri repository and contains Rust code with UBs; errors not detected by Miri are excluded (Section II-A and IV, pp. 2, 5). Metrics are defined as pass rate, the percentage passing Miri, and execution rate, the percentage passing Miri with acceptable semantics (Section IV, p. 5). For GPT-4 plus RustBrain and its knowledge base, the paper reports 94.3% pass and 80.4% execution; GPT-4 plus RustBrain without the knowledge base is reported at 90.5% and 70.2% (Section IV, p. 5). In its GPT-4 temperature sampling experiment, the paper reports the highest pass and execution rates at 0.5: 97% and 77%, respectively (Section IV, p. 5; Fig. 11, p. 6). Table I lists 12 error types and reports average times of 62.6 seconds without knowledge, 84.9 seconds with knowledge, and 442 seconds for humans; its average speedup entry is 7.4x (p. 6). Inference: 7.4x should not be presented as the ratio of 442 to 84.9. The largest listed speedup is 18.1x for function calls, although the adjacent prose attributes up to 18x to function pointer UBs. For comparison with RustAssistant, the authors write: “As shown in Fig. 12, compared to RustAssisant, the pass rate and execution rate of RustBrain increased by 33% and 41%, respectively.” (Section IV, p. 6). The paper does not tabulate the underlying case counts or explain whether these increases are relative percentages or percentage points.

The paper presents no formal theorem. It measures Miri pass rate, semantic acceptability, and repair time. Section II-A explicitly limits scope: “Errors not detected by Miri are beyond the scope of this paper.” (p. 2). It also warns that semantic judgment against developer-repaired benchmarks may be subjective because of benchmark coverage and other variables (Section II-A, p. 2). Inference: detection coverage, benchmark semantics, LLM repair choices, and AST extraction limit what these measurements establish. A successful measured repair may still miss behavior outside those checks. Inference: Verus can add specification evidence, but only for properties written and proved.

## techniques for the catalog

- repair-strategy classification — route unsafe operations to safe replacement, assertion, or semantic-modification agents
- fast feature-to-candidate generation — use Miri diagnostics and LLM feature extraction to produce multiple repair candidates
- slow decomposed verification — split candidates into steps and validate them with specialized agents
- adaptive rollback — retain the state with the fewest detected errors instead of always resetting to the initial state
- AST feedback generalization — index focused semantic ASTs and feed evaluated fixes back into future generation
