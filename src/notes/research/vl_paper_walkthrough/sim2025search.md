# Search-Based Multi-Trajectory Refinement for Safe C-to-Rust Translation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `sim2025search`, [paper](http://arxiv.org/abs/2505.15858v3)

## what the paper measures

LAC2R starts with C2Rust's compilable but unsafe Rust, decomposes the program into functions ordered by a static dependency graph, and searches alternative LLM repair trajectories. Its objective is to maximize a safety score while preserving behavior on a fixed test suite. The paper defines test equivalence as equal observable behavior for every test in that suite, so this is bounded behavioral validation rather than proof of equivalence for all inputs.

The main large-scale results are averages over seven GNU coreutils programs (maximum 14 KLoC) and ten Laertes programs (maximum 96 KLoC). On coreutils, LAC2R averages safety ratio 0.50, function compile rate 96.73%, function replacement rate 92.15%, 100% test-pass rate, 171 linter warnings, 16.27 LLM queries and 37,920 tokens (Table 2, average row, p. 7). On Laertes it averages safety ratio 0.54, function compile rate 88.30%, 100% project compilability, 541.50 linter warnings, 19.98 queries and 86,641 tokens (Table 3, average row, p. 8). The smaller TRACTOR Public-Tests set contains 124 programs: 38 organic, 85 synthetic, and one project-level program. There LAC2R reaches 0.95 safety ratio, 100% program compilation and 100% program test pass, with 439 linter warnings and 25 average queries (Table 4, p. 9). These denominators matter: the large-scale function rates and the small benchmark program rates are different metrics.

## technique: function-wise decomposition and dependency ordering

What it is: translate an entire C project through an initial C2Rust pass, then replace one Rust function at a time in static dependency order. The paper says, “the Rust program is decomposed into functions and ordered according to a dependency graph constructed by a static analyzer” (Section 2.1, p. 3).

When to use it: use this when a repository exceeds the LLM context window or when changing one function at a time makes compiler/test feedback attributable. The method assumes C2Rust can produce a compilable starting point and that dependency analysis gives a workable order.

How to do it:

1. Run C2Rust on the target C program to obtain initial unsafe Rust (Section 2.1, p. 3).
2. Build a static call/dependency graph and order functions.
3. For each function, substitute an LLM candidate into the full Rust program.
4. Compile and run the available tests before accepting the replacement; failed candidates can be repaired while the original remains available (Algorithm 2, p. 5).

Verus form: Inference: keep this decomposition at the module level, with each Rust function carrying `requires` and `ensures` contracts. A `spec fn` can model dependency ordering, while proof functions can show that a replacement preserves a caller's pre/postcondition. Verus does not prove the C-to-Rust translation relation automatically; the relation must be stated as contracts or a refinement lemma.

Evidence and limits: On TRACTOR, C2Rust itself already has 100% PCR and PPR over all 124 programs because it is the fallback, while LAC2R preserves those rates and improves safety (Table 4, p. 9). This fallback can hide failed replacements when project-level success is the only metric. The paper reports one failure on the long `tail` function because external definitions were absent from the prompt (Section 3.3, p. 10).

## technique: MCTS search over refinement trajectories

What it is: represent each intermediate Rust program as a tree node and each LLM refinement as an edge. LAC2R repeatedly performs UCT-guided selection, expansion, greedy simulation, and reward backpropagation. The authors state, “MCTS builds a search tree where each node represents a state of intermediate Rust code and each edge represents a refinement transition” (Section 2.3, p. 3).

When to use it: use this when one iterative LLM conversation may get stuck in a poor repair path and several plausible edits should be explored. It assumes enough calls and compile/test time for multiple branches.

How to do it:

1. Create an `Init` root containing the current function and full program.
2. For each rollout, select a leaf with UCT.
3. Expand it with one or more LLM-generated `Gen` or `Fix` children.
4. Greedily simulate from the leaf, then backpropagate rewards along the selected and simulated paths (Algorithm 1, p. 5).
5. Return the highest-safety `Success` node; return the root if no valid solution exists (Algorithm 1, p. 5).

The paper uses 10 rollouts per function, UCT exploration constant 1.5, depth 5, four root children (two GPT-4o and two DeepSeek V3), and safety weight `w=2` (Section 3.1, p. 6). The reward is the change in compile score plus `w` times the change in safety score. Safety is the reduction in five unsafe-construct counts: raw-pointer declarations, raw-pointer dereferences, unsafe lines, unsafe calls, and unsafe casts; noncompiling candidates receive safety score zero through the multiplier `m` (Equation 3, p. 3).

Verus form: Inference: a search orchestrator can be executable Rust, while a `spec fn` defines a candidate's safety predicate and proof functions establish that selected code satisfies explicit contracts. UCT itself need not be verified to use Verus, but the selected candidate should pass Verus verification before deployment. The paper's safety ratio counts syntax patterns; it is not a Verus proof of memory safety or functional correctness.

Evidence and limits: the coreutils average safety ratio is 0.50 versus 0.33 for C2SaferRust unit-wise, 0.32 function-wise, and 0.24 EvoC2Rust (Table 2, p. 7). LAC2R uses many more calls: 16.27 versus 2.63 and 2.51 for the two C2SaferRust variants (same denominator, average across seven coreutils). The longest coreutils run takes about 14 hours and the longest Laertes run about 48 hours (Section 3.1, p. 6).

## technique: validator-driven expansion and repair

What it is: compile and test each generated child; on failure, append the compiler or test error to a repair prompt. The algorithm has `Gen`, `Fix`, and `Success` node types. The paper says, “When test suites are available, they are executed: if all tests pass, a Success child is added to the node; otherwise, Fix children are added with test-execution errors as feedback” (Algorithm 2, p. 5).

When to use it: use compiler feedback for syntax/type errors and test feedback for behavioral mismatches. If no test suite exists, LAC2R treats compilation as sufficient for a success node (Algorithm 2, p. 5), which is a materially weaker condition.

How to do it:

1. Insert the LLM response into the complete program.
2. Compile. If compilation fails, create `Fix` children whose prompt contains compiler errors.
3. If compilation succeeds and tests exist, run all tests.
4. Create `Success` if all tests pass; otherwise create `Fix` children containing test errors.
5. If no tests exist, mark a compiling child as `Success` (Algorithm 2, p. 5).

Verus form: Inference: replace compile/test acceptance with `cargo verus` verification of `requires`/`ensures`, loop invariants, and relevant `assert` proofs. A generated function should be accepted only after Verus discharges its obligations; test failures can remain an auxiliary feedback signal. Verus cannot infer the right contract from a failed test.

Evidence and limits: In TRACTOR, methods with test feedback (LAC2R and C2SaferRust) reach 100% PCR and PPR, while RustAssure reaches 74% PCR and 2.4% PPR and EvoC2Rust 42% PCR and 18% PPR (Table 4, p. 9). The authors conclude compiler feedback alone cannot detect semantic discrepancies (Section 3.2, p. 9). Fixed tests remain an assumption: the paper explicitly states, “passing all provided tests does not guarantee semantic equivalence on unseen inputs” (Section 5, p. 10).

## technique: heterogeneous LLM actions and prompt context

What it is: use GPT-4o and DeepSeek V3 to create diverse root candidates and choose feedback and no-feedback actions. The main prompt includes unsafe Rust, call sites, globals, and imports; separate prompts repair compile and test errors. The paper notes, “LAC2R uses heterogeneous LLMs, whose distinct training datasets encourage complementary refinement effects” (Section 2.3, p. 4).

When to use it: use heterogeneous models when independent candidates may expose different ownership or API repairs. Include call sites and global/import context whenever a function's types or aliases depend on surrounding code.

How to do it:

1. Build the prompt fields `{unsafe_rust}`, `{call_sites}`, `{global}`, and `{import}` (Section 2.3, p. 4).
2. At the root, generate multiple candidates from both LLMs.
3. At later nodes, choose feedback or no-feedback actions and preserve conversation history.
4. Delimit generated code with `<FUNC>` and `</FUNC>`, then compile/test it.

Verus form: Inference: put the same context into a reviewed Rust module and express cross-function assumptions with contracts. Generated code must use Verus-supported constructs; unsafe operations should be replaced or wrapped with proven APIs. Model diversity may improve candidate coverage but adds no trust to the proof.

Evidence and limits: the paper's heterogeneous-LLM comparison attributes gains to complementary outputs but reports increased cost (Section 3.2, p. 9). The `tail` failure demonstrates a concrete context limit: absent external definitions prevented determining field types, aliasing, and lifetimes (Section 3.3, p. 10). The paper proposes richer structural context, heuristic pruning, and token-budget-aware generation as future work; these are suggestions, not evaluated techniques.

## what remains trusted and threat to VeruLaw

Inference: LAC2R trusts C2Rust's initial translation, the static dependency analyzer, compiler and test harness, the five unsafe-pattern counters, the fixed tests, and LLM-generated edits. It does not prove C/Rust equivalence, absence of undefined behavior in the C source, or correctness on inputs outside tests. Verus can reduce the threat after translation by checking explicit Rust contracts and memory-safety proofs, but it cannot recover omitted requirements or prove that the chosen contract matches C semantics. For agent-written verified Rust, the threat is high at the specification boundary and medium after independent Verus proofs: search improves the chance of finding compilable safe candidates, yet the reported 0.95 safety ratio and 100% test pass rate are not substitutes for proof.

## techniques for the catalog

- function-wise dependency ordering — translate a C2Rust baseline one function at a time in static dependency order
- MCTS trajectory search — explore multiple LLM refinement paths with UCT and reward backpropagation
- safety-aware reward — combine compile-score change with twice-weighted reduction of five unsafe constructs
- validator-driven repair — feed compiler and test errors into `Fix` prompts and accept only passing children
- heterogeneous LLM generation — diversify root and intermediate candidates with GPT-4o and DeepSeek V3
- context-rich prompting — provide call sites, globals, imports, and conversation history to each refinement

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
