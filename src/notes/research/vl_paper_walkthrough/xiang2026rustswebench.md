# Evaluating and Improving Automated Repository-Level Rust Issue Resolution with LLM-based Agents
(authored by agents unless marked 🧑)
Tag: `xiang2026rustswebench`, [paper](http://arxiv.org/abs/2602.22764v1)

## problem and benchmark
This paper evaluates autonomous agents that resolve real Rust repository issues and introduces Rust-SWE-bench. The benchmark contains 500 tasks from 34 repositories. Its construction starts from repositories with more than 1,000 stars, scrapes merged pull requests linked to issues, requires test modifications, checks a fail-to-pass transition, and manually filters issue quality, test integrity, and solution leakage (section 3.1, pp. 4–6). The paper states that “RustForger first constructs an isolated testing workspace, managing Cargo dependencies to create a reliable and sandboxed environment for issue reproduction.” (section 1, p. 2) The resulting tasks average 993.6 files and 128,126 lines per codebase, 9.8 files and 139.9 lines edited per fix (Table 2, p. 7). The paper reports that “issue reproduction is rather critical for task resolution” and that 44.5% of tasks fail at reproduction under the best studied configuration (abstract and introduction, pp. 1–2).

A task counts as resolved only when one generated patch applies and passes held-out developer tests (section 4.1.3, p. 8). Four agents (SWE-agent, OpenHands+CodeAct, Agentless, AutoCodeRover) and four LLMs (Claude-Sonnet-3.7, GPT-4o, o4-mini, Qwen3) are evaluated. The leading baseline, OpenHands with Claude-Sonnet-3.7, resolves 106/500 tasks (21.2%) (Table 3, p. 9). These are empirical patch-success rates, not formal correctness proofs.

## technique 1: reproducible benchmark construction
Use this when measuring an agent’s repository-level repair ability and needing failures to correspond to real regressions. The authors’ filtering procedure is reusable:

1. Select popular, maintained Rust repositories with extensive tests and PR history (section 3.1.1, p. 5).
2. Keep merged PRs explicitly linked to issues and modifying tests (section 3.1.2, p. 5).
3. Build a snapshot execution environment using Cargo index snapshots and separate repository and PR dependencies (section 3.1.3, p. 5).
4. Run the test patch on the base commit to obtain a failing state, then run the full test-plus-fix patch (section 3.1.4, p. 5).
5. Retain only tasks with at least one fail-to-pass test, no pass-to-pass regression, and no new build or runtime failure (section 3.1.4, p. 5).
6. Manually inspect issue clarity, deterministic nontrivial fail-to-pass behavior, and solution leakage (section 3.1.5, p. 6).

Inference: For Verus, a parallel benchmark would keep Rust modules plus specifications and require a baseline verification failure followed by a passing proof. Its acceptance oracle should run `cargo verus` and check the target proof obligations, while hidden tests can check executable behavior. The paper does not define Verus tasks; this is an inference.

Evidence is the final 500-task dataset from 34 repositories, with the three execution predicates and manual review. The benchmark’s limitation is scope: it measures issue repair in selected open-source projects and does not establish that a patch’s specification matches user intent.

## technique 2: ReAct and structured repair workflows
Use ReAct when an agent needs iterative repository search, editing, command execution, and observation. The paper describes ReAct as a “thought-act-observe” loop (section 2.2, p. 4). OpenHands and SWE-agent interleave reasoning with tool actions; Agentless instead uses a predefined localize-repair-validate pipeline; AutoCodeRover iteratively retrieves context and infers specifications (section 2.2, p. 4; section 4.1.1, p. 8).

Step by step for the structured workflow:
1. Give the agent the issue description and complete repository (section 2.2, p. 4).
2. Localize likely files and symbols using search or structure-aware retrieval (section 2.2, p. 4; section 4.2.1, p. 8).
3. Reproduce the issue in an isolated environment before editing (section 4.2.2, p. 8).
4. Generate and apply one patch, then run hidden acceptance tests (section 4.1.3, p. 8).
5. Count success only if the patch applies and all tests pass (section 4.1.3, p. 8).

Inference: In VL, the analogous loop should localize the Rust function and its Verus contracts, propose a proof edit, run the verifier, read diagnostics, and retry. Compilation and verification output should be the observation channel. A ReAct trace is process evidence only; the accepted artifact is the verified Rust patch.

The leading baseline’s denominator is all 500 tasks: 106/500 = 21.2%. The paper also reports 75/500 (15.0%) for SWE-agent with Claude-Sonnet-3.7 and 36/500 (7.2%) for Agentless with that model (Table 3, p. 9). Higher success comes with higher cost: OpenHands with Claude averages $3.81 per task, while SWE-agent averages $3.48 (section 4.4.1, p. 9).

## technique 3: isolated workspace plus dynamic Trace
Use this when repository build configuration prevents reliable reproduction or static inspection cannot expose the root cause. RustForger first creates an isolated testing workspace, manages Cargo dependencies, and links the target project as a local dependency (section 1, p. 2; section 5.1, p. 11). Its Trace command performs three functions: selective AST instrumentation, a tracing runtime, and a unified agent interface (section 5.2, pp. 11–12).

Step by step from section 5.2 (pp. 11–12):
1. Specify test workspace, target project, functions to instrument, output path, and execution command (Figure 11, p. 13).
2. Inject tracing macros into selected regular functions through AST modification; exclude closures, procedural macros, and tests (section 5.2, p. 11).
3. Preserve signatures, generics, and where clauses; use temporary scoped immutable references to respect borrowing and lifetimes (section 5.3.2, p. 12).
4. Serialize serializable values as JSON and use descriptive placeholders for nonserializable values (section 5.2, p. 12).
5. Execute the test in the isolated workspace and emit one JSON call graph (section 5.2, p. 12).
6. Restore the original project after tracing (section 5.2, p. 12).

The clap-rs case traces `get_required_usage_from` and `create_smart_usage`; the output reveals an incorrect argument list and enables a two-function patch (section 5.3.3, pp. 13–14). Inference: a VL analogue could instrument executable Rust around verified functions for counterexample diagnosis, but generated tracing code must preserve Verus specifications and should be removed before proof checking. The paper’s tracer is observational, not a proof of semantic equivalence.

RustForger with Claude resolves 143/500 tasks (28.6%), compared with 106/500 (21.2%) for OpenHands, a relative improvement of 34.9% as reported by the paper (Table 5, p. 13). On a 200-task ablation, full RustForger averages 30.3 solved tasks across four models, versus 25.0 without Trace and 22.0 without the reproduction workspace (Table 6, p. 14). Trace is used for 71.3% of RustForger’s 143 Claude successes (section 5.3.3, p. 13). Tracing adds about 1.65% of token usage, a 40-second initial build, and about 12 seconds per invocation (section 5.3.2, p. 12).

## proved, trusted, and product threat
The paper reports that “the remaining 44.5% of tasks fail at the reproduction stage and thus could not be successfully resolved even under the top-performing agent-model configuration.” (introduction, p. 2) The benchmark proves only that submitted patches pass its tests. Rust’s compiler provides memory and data-race guarantees, but the paper does not verify functional specifications with a theorem prover. The agent, benchmark construction, manually selected tests, and repository build scripts remain trusted. Inference: threat to agent-written verified Rust is high for specification mismatch and incomplete issue reproduction, while the isolated workspace and compiler feedback are useful safeguards. Existing Rust issue agents and Rust-SWE-bench already cover repository navigation, reproduction, and patch validation; VL should avoid redoing a generic SWE benchmark and instead measure proof completion, contract quality, and soundness-preserving edits.

## techniques for the catalog
- fail-to-pass benchmark filtering: retain real issues only when tests fail before a patch and pass after it without regressions
- reproducible Cargo environments: pin dependency snapshots and isolate task execution
- ReAct repair loop: alternate repository actions and observations to localize and patch issues
- isolated reproduction workspace: decouple tests from complex project build configurations
- AST Trace command: inject selective macros, capture cross-project calls, and restore source after diagnosis
Checked 2026-10-15 against paper xiang2026rustswebench: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
