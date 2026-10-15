# The Best Programming Language for Tokenmaxxing: An Investigation of Coding Agent Behavior Across Programming Languages
(authored by agents unless marked 🧑)
Tag: `wu2026tokenmaxxing`, [paper](https://arxiv.org/abs/2607.22807)

## what the paper measures
The study asks how target language changes coding-agent token cost and trajectory behavior. It evaluates five models on Python, Java, Rust, and OCaml using 100 language-agnostic LiveCodeBench problems, yielding 2,000 sessions (§3.3, p. 3). Each agent runs in a container with fixed compiler and run commands, a 40-turn limit, 600-second wall-clock limit, 256 MB memory limit, and visible tests (Table 1; §3.2–3.3, pp. 3–4). The authors state, “We first re-execute every intermediate solution and abstract each trajectory as a sequence of test-outcome vectors.” (Abstract, p. 1.)

The language effect is measured with median output tokens because costs are heavy-tailed, and with per-model mixed-effects regressions that use Python as reference, language as fixed effect, and problem as random effect (§4.1, p. 4). Problem identity explains ICC 0.80–0.97 of token-cost variance (Table 2, p. 4). OCaml costs 1.28–1.69× Python across models with p<0.001; Rust and Java penalties vary by model (Table 2, p. 4). Accuracy is broadly similar by language except Gemma on OCaml (Figure 1, p. 3). These are output-token costs over all traces, including failures, not only successful solutions.

## technique: controlled multilingual agent benchmark
How to apply:
1. Select tasks whose semantics are language-neutral; the paper samples 100 from 499 such LiveCodeBench problems (§3.3, p. 3).
2. Use one agent scaffold and fixed model prompts across languages (§3.1, p. 3).
3. Pin language versions, package sets, compile commands, run commands, turn limits, timeouts, and memory limits (Table 1; §3.2, p. 3).
4. Expose a stable test script with per-test timeout and explicit PASS/FAIL output; recompile when needed (§3.3, p. 4).
5. Compare token cost and accuracy with mixed-effects models so problem difficulty does not confound language (§4.1, p. 4).

Verus form (Inference): use the same discipline for Verus-agent studies: pin the Verus toolchain, Rust version, solver settings, crate revision, proof timeout, and test corpus; record compile and verification failures separately from runtime failures. A mixed-effects model can estimate language or API effects, but it does not prove a Verus proof is semantically adequate.

The benchmark’s visible tests create a realistic iterative setting, but the authors report two cheating traces and note that tasks are contest-sized, not repository-scale (§3.3, p. 4; Limitations, p. 6). Inference: a VL benchmark should add hidden and adversarial tests for specification gaming and should not infer repository-level behavior from MiniLCB.

## technique: re-execute every intermediate snapshot
The paper writes every solution snapshot to disk and runs the external test harness on each snapshot, producing outcome vectors `s0,…,sn` (§4.2.2, p. 5). It explicitly states, “We test intermediate solutions after the agent concludes execution.” (§4.2.2, p. 4). Consecutive vectors receive labels: breakthrough, stay, improved, regressed, churn, broke, or stuck (§4.2.2, p. 5). A graph of these transitions reveals loops and failure modes; a snapshot span includes the resulting code, diff, test changes, reasoning, tool calls, and output up to the next write (§4.2.3, p. 5).

Verus form (Inference): record each Rust/Verus snapshot with verification diagnostics, solver time, runtime tests, and changed specification lines. Define transition labels over proof obligations and tests, for example `breakthrough` when all required proofs and tests newly pass, `regressed` when a previously passing obligation fails, and `stay` when a passing proof is rewritten. This is analysis instrumentation, not a proof construct.

The authors hand-developed a mutually exclusive 12-label taxonomy and then had GPT-5-Mini label all spans (§4.2.3, p. 5). Labels include implement, rewrite, execute plan, fix bug, debug failure, infra confusion, revert, verify, edge case, optimize performance, and cosmetic refactor (Table 4, p. 5). Inference: using an LLM labeler adds annotation error; report label agreement or manually audit a sample before treating category frequencies as causal explanations.

## technique: detect post-success waste
The authors split successful trajectories at the first correct solution and count tokens before and after it (Table 3, p. 4). Gemma’s median post-solution tokens are 3,554 Python, 4,546 Java, 7,311 Rust, and 1,173 OCaml; Qwen’s are 283, 272, 370, and 405 respectively; GLM’s are 117, 97, 122, and 109 (§4.2.1, p. 4). The paper observes, “agents continue to refine their solutions after they get it right, sometimes even after all tests pass.” (§4.2.1, p. 4.)

Verus form (Inference): add a verified stopping criterion that requires all designated proof obligations and tests to pass, then prevent the agent from rewriting verified code without a new failing obligation or an explicit optimization goal. A policy cannot be proved safe merely because a prior snapshot verified; a later edit needs a fresh verification run.

## technique: localize language-specific failure loops
The trajectory graph exposes that Gemma has 1,196 stuck self-loops on OCaml; 92% of failed snapshots are compile-time errors and 8% wrong-answer failures (§4.3, p. 5). Breakthrough transitions in that pair are dominated by `fix bug` at 60% (Table 5, p. 5). The paper’s example shows the agent cycling through identical OCaml code until it names the type error, then the unchanged algorithm compiles (§4.3, p. 5).

Inference: for Verus, classify failures into Rust compile errors, Verus specification errors, solver timeouts, proof regressions, and runtime failures. Feed the agent structured diagnostics and detect repeated identical snapshots; early-stop or revert loops when no obligation vector changes. This recommendation is a transfer from the measured loop pattern, not a technique evaluated by this paper.

## technique: inspect agent text for strategy shifts
The paper finds agents planning in comments, prototyping in Python before translating to OCaml or Rust, and distrusting provided tests in favor of invented inputs (§4.5, p. 6). One Qwen trace solves in Python for 12 turns, then translates to OCaml; one GLM trace tests Rust mathematics in Python for 11 turns before writing Rust (§4.5, p. 6). Gemma and Qwen use “wait” and “actually” frequently and often rewrite after passing tests (§4.5, p. 6).

Verus form (Inference): log prompts, proof edits, solver output, and test commands; detect translation detours and comments that propose a proof without corresponding executable specification. Require the agent to run the provided verifier and tests before self-authored stress tests, while still allowing additional tests after the required gate.

## evidence, trusted pieces, and threat to VL
The external test harness is the correctness oracle for every snapshot, and the task test cases are visible to the agent (§3.3, p. 4). The study assumes public pretraining distributions explain language familiarity; it does not measure repository-scale maintenance, hidden tests, or other agent scaffolds (footnote 1; Limitations, p. 6). The paper’s conclusion is that token consumption varies significantly by language and that lower-resource languages trigger syntax struggle, repeated correction, and Python detours (§5, p. 6).

Inference: threat to VL is high in engineering cost and moderate in direct safety. Rust is only 1.07× Python for Gemma, 1.20× for Qwen, and 1.57× for GLM in the reported mixed-effects contrasts (Table 2, p. 4), but Rust trajectories can still spend many turns on compile and proof-interface errors. Verus adds specification and solver costs absent from this benchmark, so these ratios cannot be reused as VL forecasts. The useful existing work is the snapshot-vector and transition-graph analysis; VL should not redo token counting without recording proof outcomes and post-success rewrites.

## techniques for the catalog
- controlled language comparison: hold tasks, scaffold, environment, limits, and tests fixed while varying language
- snapshot re-execution: run every intermediate artifact through an external checker and store outcome vectors
- transition graph: label changes between outcome vectors to expose stuck, regression, churn, and post-success loops
- post-success split: measure tokens and edits before and after the first fully passing artifact
- failure taxonomy: classify spans into implementation, debugging, infrastructure, verification, optimization, and cosmetic work
- strategy-text audit: inspect comments, test choices, and cross-language prototyping for recurring agent behaviors
- mixed-effects cost model: estimate language penalties with problem identity as a random effect
Checked 2026-10-15 against paper wu2026tokenmaxxing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
