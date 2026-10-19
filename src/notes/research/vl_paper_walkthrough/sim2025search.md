# Search-Based Multi-Trajectory Refinement for Safe C-to-Rust Translation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `sim2025search`, [paper](http://arxiv.org/abs/2505.15858v3)

## what the paper measures

LAC2R starts with C2Rust's compilable but unsafe Rust, decomposes the program into functions ordered by a static dependency graph, and searches alternative LLM repair trajectories. Its objective is to maximize a safety score while preserving behavior on a fixed test suite. The paper defines test equivalence as equal observable behavior for every test in that suite (Section 2.2, p. 3). Inference: this validates behavior on those tests rather than proving equivalence for all inputs.

The main large-scale results are averages over seven GNU coreutils programs (maximum 14,423 LoC) and ten Laertes programs (maximum 95,560 LoC). On coreutils, LAC2R averages safety ratio 0.50, function compile rate 96.80%, function replacement rate 93.61%, 100% test-pass rate, 186 linter warnings, 16.27 LLM queries and 37,920 tokens (Table 2, average row, p. 7). On Laertes it averages safety ratio 0.54, function compile rate 88.30%, 100% project compilability, 541.50 linter warnings, 19.98 queries and 86,641 tokens (Table 3, average row, p. 8). The smaller TRACTOR Public-Tests set contains 124 programs: 38 organic, 85 synthetic, and one project-level program. There LAC2R reaches 0.95 safety ratio, 100% program compilation and 100% program test pass, with 439 linter warnings and 25 average queries (Table 4, p. 9). Inference: these denominators matter because the large-scale function rates and the small benchmark program rates measure different units.

## technique: function-wise decomposition and dependency ordering

What it is: translate an entire C project through an initial C2Rust pass, then replace one Rust function at a time in static dependency order. The paper says, “the Rust program is decomposed into functions and ordered according to a dependency graph constructed by a static analyzer” (Section 2.1, p. 3).

When to use it: Inference: use this when a repository exceeds the LLM context window or when changing one function at a time makes compiler/test feedback attributable. The method assumes C2Rust can produce a compilable starting point and that dependency analysis gives a workable order.

How to do it:

1. Run C2Rust on the target C program to obtain initial unsafe Rust (Section 2.1, p. 3).
2. Build a static dependency graph and order functions (Section 2.1, p. 3).
3. For each function, substitute an LLM candidate into the full Rust program.
4. Compile and run the available tests before accepting the replacement; failed candidates can be repaired while the original remains available (Algorithm 2, p. 5).

Verus form: Inference: keep this decomposition at the module level, with each Rust function carrying `requires` and `ensures` contracts. A `spec fn` can model dependency ordering, while proof functions can show that a replacement preserves a caller's pre/postcondition. Verus does not prove the C-to-Rust translation relation automatically; the relation must be stated as contracts or a refinement lemma.

Evidence and limits: On TRACTOR, C2Rust itself already has 100% PCR and PPR over all 124 programs, while LAC2R matches those rates and improves safety (Table 4, p. 9). The authors explain that C2SaferRust and LAC2R “start from C2Rust translations and refine them incrementally, so they can always fall back on the original if a chunk fails” (Section 3.2, p. 8). Inference: project-level success alone can therefore hide failed replacements. One reported failure is `ximalloc` from `tail`, a function shorter than 50 LoC whose external function signatures and behavioral contracts were absent from the prompt (Section 3.3, p. 9).

## technique: MCTS search over refinement trajectories

What it is: represent each intermediate Rust program as a tree node and each LLM refinement as an edge. LAC2R repeatedly performs UCT-guided selection, expansion, greedy simulation, and reward backpropagation. The authors state, “MCTS builds a search tree where each node represents a state of intermediate Rust code and each edge represents a refinement transition” (Section 2.3, p. 3).

When to use it: Inference: use this when one iterative LLM conversation may get stuck in a poor repair path and several plausible edits should be explored. It assumes enough calls and compile/test time for multiple branches.

How to do it:

1. Create an `Init` root containing the current function and full program.
2. For each rollout, select a leaf with UCT.
3. Expand it with one or more LLM-generated `Gen` or `Fix` children.
4. Greedily simulate from the leaf, then backpropagate rewards along the selected and simulated paths (Algorithm 1, p. 5).
5. Return the highest-safety `Success` node; return the root if no valid solution exists (Algorithm 1, p. 5).

The paper uses 10 rollouts per function, UCT exploration constant 1.5, depth 5, four root children (two GPT-4o and two DeepSeek V3), and safety weight `w=2` (Section 3.1, p. 6). The reward is the change in compile score plus `w` times the change in safety score. The compile score is `1 / (number of compile errors + 1)` (Equation 4, p. 4). Safety is the reduction in five unsafe-construct counts: raw-pointer declarations, raw-pointer dereferences, unsafe lines, unsafe calls, and unsafe casts; noncompiling candidates receive safety score zero through the multiplier `m` (Equation 3 and its explanation, pp. 3–4).

Verus form: Inference: a search orchestrator can be executable Rust, while a `spec fn` defines a candidate's safety predicate and proof functions establish that selected code satisfies explicit contracts. UCT itself need not be verified to use Verus, but the selected candidate should pass Verus verification before deployment. The paper's safety ratio counts syntax patterns; it is not a Verus proof of memory safety or functional correctness.

Evidence and limits: the coreutils average safety ratio is 0.50 versus 0.33 for C2SaferRust unit-wise, 0.32 function-wise, and 0.24 EvoC2Rust (Table 2, p. 7). LAC2R uses many more calls: 16.27 versus 2.63 and 2.51 for the two C2SaferRust variants (same denominator, average across seven coreutils). The longest coreutils run (`tail`) takes about 14 hours and the longest Laertes run (`optipng`) about 48 hours (Section 3.1, pp. 6–7).

## technique: validator-driven expansion and repair

What it is: compile and test each generated child; on failure, append the compiler or test error to a repair prompt. The algorithm has `Gen`, `Fix`, and `Success` node types. The paper says, “When test suites are available, they are executed: if all tests pass, a Success child is added to the node; otherwise, Fix children are added with test-execution errors as feedback” (Section 2.3, p. 4; Algorithm 2, p. 5).

When to use it: Inference: use compiler feedback for syntax/type errors and test feedback for behavioral mismatches. If no test suite exists, LAC2R treats compilation as sufficient for a success node (Algorithm 2, p. 5). Inference: this provides less behavioral evidence than passing tests.

How to do it:

1. Insert the LLM response into the complete program.
2. Compile. If compilation fails, create `Fix` children whose prompt contains compiler errors.
3. If compilation succeeds and tests exist, run all tests.
4. Create `Success` if all tests pass; otherwise create `Fix` children containing test errors.
5. If no tests exist, mark a compiling child as `Success` (Algorithm 2, p. 5).

Verus form: Inference: require Verus verification in addition to compilation and tests, checking `requires`/`ensures`, loop invariants, and relevant `assert` proofs. A generated function should be accepted only after Verus discharges its obligations; test failures can remain an auxiliary feedback signal. Verus cannot infer the right contract from a failed test.

Evidence and limits: In TRACTOR, methods with test feedback (LAC2R and C2SaferRust) reach 100% PCR and PPR, while RustAssure reaches 74% PCR and 2.4% PPR and EvoC2Rust 42% PCR and 18% PPR (Table 4, p. 9). The authors conclude compiler feedback alone is insufficient to detect semantic discrepancies (Section 3.2, p. 8). They explicitly state, “passing all provided tests does not guarantee semantic equivalence on unseen inputs” (Section 4, p. 10).

## technique: heterogeneous LLM actions and prompt context

What it is: use GPT-4o and DeepSeek V3 to create diverse root candidates and choose feedback and no-feedback actions. The main prompt includes unsafe Rust, call sites, globals, and imports; separate prompts repair compile and test errors. The paper notes, “LAC2R uses heterogeneous LLMs, whose distinct training datasets encourage complementary refinement effects” (Section 2.3, p. 4).

When to use it: Inference: use heterogeneous models when independent candidates may expose different ownership or API repairs. Include call sites and global/import context whenever a function's types or aliases depend on surrounding code.

How to do it:

1. Build the prompt fields `{unsafe_rust}`, `{call_sites}`, `{globals}`, and `{imports}` shown in Figure 5 (p. 6). Section 2.3 (p. 4) instead spells the last two placeholders `{global}` and `{import}`.
2. At the root, generate multiple candidates from both LLMs.
3. At later nodes, choose feedback or no-feedback actions and preserve conversation history.
4. Delimit generated code with `<FUNC>` and `</FUNC>` as shown in Figure 5 (p. 6), then compile/test it.

Verus form: Inference: put the same context into a reviewed Rust module and express cross-function assumptions with contracts. Generated code must use Verus-supported constructs; unsafe operations should be replaced or wrapped with proven APIs. Model diversity may improve candidate coverage but adds no trust to the proof.

Evidence and limits: Table 5 (p. 9) reports average safety ratios of 0.50 for heterogeneous LLMs, 0.4945 for GPT-4o alone, and 0.3927 for DeepSeek alone; average FRR is 93.61%, 91.04%, and 88.01%, respectively. Average queries and tokens are higher with heterogeneous LLMs. Inference: these averages support an overall gain, but not superiority on every benchmark or metric; for example, GPT-4o alone achieves safety ratio 0.43 on `truncate`, versus 0.33 for heterogeneous LAC2R (Tables 2 and 5). A second `tail` failure depends on missing `Hash_table` and `Hash_tuning` definitions; the authors write, “Without these structural facts, LAC2R cannot determine field types, aliasing, or lifetimes, and MCTS fails to find a safe refinement” (Section 3.3, p. 9). Richer structural context, heuristic pruning, and token-budget-aware generation are proposed future work (Sections 3.3–4, p. 9).

## what remains trusted and threat to VeruLaw

Inference: LAC2R's evidence depends on C2Rust's initial translation, the static dependency analyzer, compiler and test harness, the five unsafe-construct counters, and the fixed tests. LLM-generated edits are checked through compilation and available tests, not a proof of C/Rust equivalence. A Verus adaptation would need explicit contracts and proofs for the translated Rust, plus a separately justified relation between those contracts and the C source. The paper evaluates no Verus adaptation. Its safety ratio and test pass rate therefore provide no direct evidence about success at generating Verus proofs or selecting correct specifications.

## techniques for the catalog

- function-wise dependency ordering — translate a C2Rust baseline one function at a time in static dependency order
- MCTS trajectory search — explore multiple LLM refinement paths with UCT and reward backpropagation
- safety-aware reward — combine compile-score change with twice-weighted reduction of five unsafe constructs
- validator-driven repair — feed compiler and test errors into `Fix` prompts and accept only passing children
- heterogeneous LLM generation — diversify root and intermediate candidates with GPT-4o and DeepSeek V3
- context-rich prompting — provide call sites, globals, imports, and conversation history to each refinement

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Table 2 also shows the translation cost, including the number of LLM queries and tokens consumed."): read the full paper; checked quotations, metrics, technique steps, section/page references, and the arXiv link; corrected coreutils averages, failure descriptions, references, prompt placeholders, and heterogeneous-model claims; marked recommendations as Inference; did not rerun experiments or validate the proposed Verus adaptations.
