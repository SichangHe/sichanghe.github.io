# Can Large Language Models Model Programs Formally?
(authored by agents unless marked 🧑)
Tag: `chen2026model`, [paper](https://doi.org/10.48550/arxiv.2604.01851)

## scope and contribution

Chen et al. introduce Model-Bench, a benchmark and pipeline for asking language models to turn Python programs into executable TLA+ model-checking specifications. The target checker is TLC. The paper's central motivation is that model checking has an automodeling bottleneck: a model must be finite and tractable while preserving the program behavior relevant to the property. The authors state: “Model-Bench comprises 400 Python programs derived from three well-known benchmarks (HumanEval, MBPP, and LiveCodeBench) by normalization, simplification, and rewrite.” (abstract, p. 1). The benchmark contains 1,639 test cases (p. 2). Inference: for Verus, the transferable object is an evaluation harness that checks generated specifications against executable reference behavior; TLA+ syntax and TLC traces do not carry over directly to Rust/Verus.

## technique: construct a reproducible program-to-model benchmark

When to use it: use this when measuring whether an LLM can generate formal models from code, rather than merely producing compilable snippets. The procedure is:

1. collect function-level Python problems and their tests from HumanEval, MBPP, and LiveCodeBench (Section 3.1, p. 3)
2. deduplicate each problem, normalize it, and place one function and its assertions in an isolated Python file (Section 3.1, p. 3)
3. remove unsupported dependencies: eliminate imports other than `typing` and `math`; retain `typing` because it does not change logic and retain `math` for simple mathematical functions (Section 3.1, p. 3)
4. rewrite difficult language features through a fixed prompt: list comprehensions, slices, classes, lambdas, generators, multiple declarations, and recursion (Section 3.1, p. 4; Figure 11, p. 19)
5. exclude complex types beyond `None`, numbers, strings, and derived lists, tuples, dictionaries, and iterators (Section 3.1, p. 4)
6. execute every resulting Python file and discard files that fail execution or cannot be processed by the transformer (Section 3.1, p. 4)

The paper reports the attrition after each stage. HumanEval goes from 164 origin problems to 156 after library filtering, 139 after language-feature handling, 122 after type filtering, and 105 after execution. MBPP goes from 427 to 356, 334, 309, and 262; LiveCodeBench goes from 92 to 73, 55, 48, and 33. The final total is 400 from 683, an overall elimination of 41.4% (Table 1, p. 6). The paper says: “Any instance of failed rewriting will be discarded.” (Figure 1 caption, p. 4).

Verus form (Inference): make a corpus of Rust functions with executable tests and a reference implementation, then restrict the input language to constructs for which a Verus specification can be written. Preserve ownership and integer semantics instead of translating to Python's dynamic values. For each case, keep a test oracle outside the proof and ask a model to produce a Verus contract and proof. The filtering and execution gates remain applicable; the TLA+ library/type restrictions do not.

Evidence and limits: the denominator for the final benchmark is 400 programs, not the 683 originals, and each program has at least one of the 1,639 retained test cases. This is a benchmark-construction technique, not evidence that all Python programs can be modeled. Inference: filtering out unsupported features makes results interpretable but can understate failures on real code using libraries, aliasing, asynchronous execution, or higher-order behavior, which the introduction identifies as difficult abstractions (p. 2).

## technique: lower imperative code to a state-machine-shaped representation

When to use it: use deterministic lowering when the target formalism is an explicit transition system and the source language's control flow is unlike the target. The paper first converts each Python abstract syntax tree into a control-flow graph (CFG). Basic blocks are maximal sequences of consecutive instructions; edges record conditional or unconditional jumps. It assigns each CFG node a numeric identifier (Section 3.2, p. 5). The authors explain: “Each basic block contains a sequence of consecutively executed instructions, which naturally corresponds to actions in TLA+ specifications.” (Section 3.2, p. 5).

The transformation has three concrete steps (Section 3.2, pp. 5–6):

1. CFG construction: identify `if/else`, `while/for`, `break`, and `continue`, partition the AST into blocks, and record edge conditions
2. code generation: declare all variables at the beginning, add a program-counter variable `pc`, and emit a `while True` loop with one conditional branch for every CFG node; each branch is enabled by `pc` and its transition condition
3. representation adjustment: lower Python strings to arrays of character ASCII values because TLA+ strings are immutable

Figure 2 (p. 5) shows `sum_even` lowered with `pc` values 0, 2, 3, 4, 5, 6, and 7. The generated TLA+ action has one disjunct per control-flow edge, for example a branch with `pc = 3 /\ i < n`, followed by `pc' = 5`, and a branch with `pc = 3 /\ i >= n` that assigns the return value and advances to the return state. The paper claims: “The whole transformation process is deterministic and does not alter the semantics of the program.” (Section 3.2, p. 6).

Verus form (Inference): represent the lowered control state as an enum or integer ghost/spec variable and prove a correspondence invariant between the original Rust loop and the lowered transition relation. In ordinary Verus code, retain the source loop and use `invariant` clauses on the loop; use `requires`, `ensures`, and `decreases` for contracts. A separate CFG interpreter could be executable Rust, but the proof must establish that each source step preserves the state relation. TLA+ primed variables and `UNCHANGED` actions do not carry over as Verus syntax.

Evidence and limits: the semantics-preservation sentence is a design claim; the paper does not give a separate mechanized equivalence proof for the transformer. Inference: a Verus adoption should treat the lowering pass as trusted unless it is itself verified or cross-checked against executions.

## technique: prompt variants and few-shot model generation

For every filtered program, the authors derive three prompt variants from one template (Section 3.1, p. 6): original code with two examples, original code without examples, and transformed code with two examples. The fixed template provides TLA+ operators, indexing guidance, variable-update rules, and a requirement to emit an `Assertion` action when the Python input has assertions (Figure 14, pp. 21–22). The rewriting prompt explicitly asks for direct code output and gives six feature-replacement rules (Figure 11, p. 19).

The experiment samples each setting three times and lets the model self-correct through error feedback and iterative multi-turn chats (Section 4, p. 6). Nucleus sampling uses temperature 0.7 (Section 5, p. 8). The fix prompt is deliberately simple: “The TLA+ specification has the following error: - error message - Please fix the specification while keeping the same logic.” (Figure 12, p. 20).

Verus form (Inference): use separate zero-shot and few-shot prompts, with examples of a Rust function, its `requires`/`ensures`, loop `invariant`, and a proof lemma. Run a bounded number of compiler/verifier feedback rounds and preserve each attempt for audit. A Verus prompt should explain ownership, integer types, and spec/executable separation rather than TLA+ temporal operators.

Evidence: on the 400-program benchmark, in the original-code/few-shot setting, DeepSeek-V3 reaches Runnable@1 51.75% (207/400 by the benchmark denominator), Runnable@3 66.25% (265/400), and average state similarity 49.55%; these are Table 2 percentages, p. 9. The table's averages are across the eight listed models, not additional programs. In the original-code/zero-shot setting, the corresponding all-model averages are 9.25% Runnable@1 and 2.42% similarity (Table 2, p. 9). The paper reports an average few-shot gain of 17.57 percentage points in Runnable@1 (26.82% versus 9.25%) and 31.44 points in similarity (33.86% versus 2.42%) across models (Section 5.1, p. 10). Inference: few-shot examples are useful supervision for proof shape, but these results do not establish that the examples are correct for Verus or that a model's proof is semantically adequate.

## technique: deterministic post-processing before checker evaluation

The authors normalize every generated TLA+ output before evaluation (Appendix A.1, p. 17): (1) import all built-in modules through `EXTENDS`; (2) define `None` and `Null` model values; and (3) complete `UNCHANGED` variables so each action gives a complete resulting state. They say: “These post-processing steps effectively eliminate common errors that would otherwise impede the validity of our experimental results.” (Appendix A.1, p. 17).

Verus form (Inference): an analogous harness can insert boilerplate imports or generated ghost declarations, but it must not silently alter a proof obligation. Keep transformations textual and deterministic, record the pre- and post-processed source, and run `verus` on the resulting file. Verus does not have TLA+'s `EXTENDS` or `UNCHANGED`; missing contracts should be reported rather than synthesized unless the synthesis rule is part of the benchmark definition.

## technique: checker-based metrics for runnable and behaviorally similar models

The authors manually create oracle TLA+ models with GPT-4o output followed by two months of comparison and refinement by three practitioners with more than three years of programming experience (Section 4.1, p. 7). TLC checks generated models. They define `Runnable@k` as the expected proportion of problems for which at least one of `k` sampled models passes TLC; they sample `n = 3` models and report `k = 1, 2, 3` (Section 4.1, p. 7). They define a state as the set of variable/value pairs at a time, collect all observed states, and measure similarity as the fraction of oracle states also present in the generated model. A generated state is considered sufficiently similar when at least a threshold θ of its variable values occur in an oracle state; they set θ = 1.0 (Definitions 1–4, pp. 7–8). The paper notes that extra auxiliary variables and variable reordering do not penalize the state matching example (p. 8).

Verus form (Inference): replace TLC pass/fail with successful Verus verification, and compare traces or postconditions of the verified Rust function against a separately executable reference on generated inputs. Preserve denominators: report verified cases over all cases, sampled attempts per case, model/version, and solver settings. A Verus proof passing is evidence for its written contract, not evidence that the contract captures the reference behavior; the oracle and contract-generation process remain trusted assumptions.

## technique: transform source code to improve semantic similarity

In the few-shot comparison, transformation lowers similarity less often than it lowers runnability. For DeepSeek-V3, transformed-code/few-shot similarity is 68.54% versus 49.55% for original-code/few-shot, a gain of 18.99 points, while Runnable@3 is 56.00% versus 66.25%, a decrease of 10.25 points (Table 2, p. 9; Section 5.2, p. 10). Across the eight models, transformed-code/few-shot averages are 54.20% similarity and 37.84% Runnable@3, compared with 33.86% and 40.81% for original-code/few-shot (Table 2, p. 9). Combining both prompt settings gives Qwen3-32B an additional 13.75% runnable models over original code alone (Section 5.2, p. 11). The paper attributes the tradeoff to fewer opportunities to bypass TLC by restructuring and to longer contexts causing “lost in the middle” effects (Section 5.2, p. 10).

Inference: a Verus pipeline can offer both idiomatic Rust and a proof-oriented normalized form, then ensemble or compare them. The transformed form should be judged by contract equivalence and proof success, not by textual similarity.

## technique: complexity stratification and failure diagnosis

The paper computes cyclomatic complexity with Radon, maximum loop depth, and variable count; it groups programs by each metric and computes the proportion whose Runnable@1 sample passes TLC (Section 5.3, p. 11). It also compares LiveCodeBench's problem-difficulty ratings with code complexity. Higher cyclomatic complexity, loop depth, and variable count are associated with lower Runnable@k and similarity (Finding 4, p. 12). The paper says this modeling difficulty is not reliably correlated with algorithmic difficulty but is associated with nested loops and data-structure complexity (abstract, p. 2).

Bad cases are classified by TLC outcome: compilation error, runtime error, or assertion error (Section 5.4, p. 12). Examples identify unknown operators such as Python `sort`, one-based TLA+ array indexing, omitted `.lower()` calls, and using a constant bound instead of `Len(arr)` (Sections 5.4 and Appendix A.3, pp. 12–19). Inference: for Verus, classify failures as parser/type errors, verifier-counterexample failures, and contract/test mismatches; preserve the minimal counterexample and the source location for repair. Complexity buckets should include quantifier count, mutable aliasing, loop nesting, and arithmetic nonlinearity, but those additional dimensions are an inference rather than measurements in this paper.

## what is proved, measured, and trusted

Measured: TLC runnability, state similarity, average fix count, prompt-setting effects, transformation effects, and correlations with syntactic complexity. The main denominator is 400 retained Python programs, with three samples per setting and `k` in {1,2,3}. Trusted: the GPT-4o-derived and human-refined oracle models; the deterministic source transformer; Python execution used to validate benchmark files; TLC and its semantics; model APIs and sampling; and the manually supplied assertions. The paper's oracle process is described, but it does not provide a formal proof that every oracle exactly matches Python.

Inference: the threat to a product that generates agent-written verified Rust is high for semantic translation and contract omission, but lower for syntax-only generation. The paper demonstrates that a checker can reject many outputs while still allowing a model to pass with a wrong or incomplete specification; Verus users therefore need reference tests, explicit contracts, and review of trusted assumptions. Existing work already covers theorem proving, retrieval-augmented proof generation, and natural-language-to-specification benchmarks (Section 2, pp. 2–3); VL should avoid rebuilding a generic benchmark without a Verus-specific gap.

## techniques for the catalog

- benchmark filtering and execution gate — normalize source programs, remove unsupported dependencies and types, rewrite difficult constructs, then execute and retain only valid cases
- CFG-to-state-machine lowering — map basic blocks to program-counter actions so imperative control flow resembles a transition-system specification
- prompt variants with examples — compare zero-shot, few-shot original code, and few-shot transformed code under a fixed formal-language prompt
- checker-based runnability metric — sample three candidates per case and report the fraction with at least one TLC-passing model at k = 1, 2, or 3
- state-set similarity metric — compare oracle and generated execution states with a variable-value matching threshold θ = 1.0
- deterministic specification post-processing — add built-in imports, null values, and unchanged-variable assignments before running TLC
- complexity-stratified failure analysis — correlate runnability with cyclomatic complexity, loop depth, variable count, and classify checker failures by compilation, runtime, or assertion cause
Checked 2026-10-15 against paper chen2026model: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
