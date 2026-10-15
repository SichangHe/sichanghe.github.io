# Growing an Agent/Prover Interface: Evolutionary Tool Design for Cost-Efficient Theorem Proving in Rocq and Lean
(authored by agents unless marked 🧑)
Tag: `viennot2026growinginterface`, [paper](https://arxiv.org/abs/2609.39544)

## what is evolved and what is measured

This paper treats the prover interface as an object to optimize. A frontier model (the orchestrator) mutates an MCP server one feature at a time; smaller models test each mutation on fixed theorem-proving tasks; acceptance follows preset accuracy, cost, and wall-time rules. The resulting ROCQ-MCP-EVOLVE server exposes an interactive Rocq session, proof-state and tactic tools, search/hints, automation, backtracking, and verification. A Lean port tests transfer.

The abstract states the method plainly: “We propose an evolutionary method where a frontier model incrementally proposes new features and only keeps the ones that improve the overall performance of smaller models.” (Abstract, p. 1.) The three objectives are accuracy (pass@1), dollar cost per solved problem, and wall time per solved problem (Section 2, p. 3). Costs and times are averages over solved problems unless stated otherwise, so they are conditional metrics rather than cost per attempted problem.

Phase 1 starts from CONTROL, an MCP server exposing only whole-file compilation. The orchestrator proposes a tool, output refinement, or configuration change, then testers run it under fixed budgets. Validation uses dev60: 60 Rocq Workbook problems, 20 each in easy, medium, and hard buckets, with two runs per problem. A mutation is accepted when the net success difference is at least +2 in one bucket and no bucket falls below −2; cost and time are secondary (Section 2.1, p. 3). Additional sets test hard collaboration (70 hard problems), MathComp library retrieval (35 lemmas), and automation preloading on the 244-problem miniF2F-Rocq valid split.

Phase 2 targets five project-scale autoformalization tasks (tropical algebra, closed intervals, an append-only ledger, finite automata, and a divisor-sum exercise). Four runs per project give 20 runs. A mutation needs more than two additional successes, is reverted after more than two losses, and, for a difference under three, needs at least a 20% cost or wall-time reduction (Section 2.2, p. 4). Testers have 900 seconds and 200 calls per project; the phase budget is $150.

The held-out miniF2F-Rocq test has 130 easy, 79 medium, and 35 hard problems, two runs each. Table 2 reports ROCQ-MCP-EVOLVE accuracy of .48, .80, .76, and .88 for Haiku, Sonnet, Opus, and Terra, versus CONTROL .17, .50, .43, and .54. These are averages over the 244 problems and two runs; the table's parenthesized values are bucket accuracies. For costs, the same table averages only the subset solved by all three servers at least once, whose per-model bucket sizes are shown in parentheses (for example, Sonnet uses 90/28/7 shared problems). On the project tasks, Table 4 reports success counts explicitly: with Sonnet, evolved tools solve 14/20 runs versus CONTROL 10/20; Opus 6/10 versus 3/10; Terra 10/20 versus 8/20. The paper says, “ROCQ - MCP - EVOLVE lowers the number of input tokens by 24 % and divides by four the number of output tokens compared to the CONTROL server.” (Section 4.1, p. 7.)

## technique: evolutionary feature search for an agent/prover interface

What it is. The orchestrator uses logs and statistics from prior trials to propose one mutation to the current server. Testers are fixed models with fixed prompts or documentation, budgets, and datasets. Only a mutation that passes the predeclared rule survives. The process is open-ended in the sense that the authors do not hand-design the final feature list; they set objectives, budgets, and validation rules.

How to apply it.

1. Define a minimal compiler-only interface and freeze the problem sets, models, budgets, objectives, and acceptance rules (Section 2, pp. 3–4).
2. Ask a frontier model to propose one concrete mutation: a new tool, richer output, configuration change, or control-flow feature (Section 2, p. 3).
3. Run smaller tester models on the fixed validation problems, recording pass@1, cost, time, tool calls, and tokens.
4. Compare the mutation with the immediately previous server using the phase-specific thresholds; keep or revert it.
5. Feed logs and the resulting state to the next proposal, and freeze the selected server before evaluating the held-out test set.

The authors' mutations include `step, rollback, state`, compact rendering, search, Lean-ism hints, auto close, near-miss hints, preloading, a “team of three,” checks for false winners, real-arithmetic help, and MathComp-specific hints/retrieval (Table 1 and Appendix Table 8, pp. 6 and 15). Five project-scale mutations were rejected; the final Phase-1 server was reused to test transfer to projects.

Inference: For Verus, evolve an MCP or command-line interface around `verify`, proof-state extraction, counterexample/error display, lemma search, bounded retries, and state rollback. Keep the Verus compiler as the acceptance oracle. A mutation should be retained only when it improves fixed Rust verification tasks under a stated success definition; this is an adaptation, because the paper evolves Rocq tools and does not test Verus.

Evidence and limits. On miniF2F-Rocq, evolved tools beat CONTROL by at least 30 percentage points for every model and solve more attempts than CONTROL on 91–104 problems while losing on at most four; sign-test p<10⁻²¹ (Section 4.1, p. 7). The final server was selected with smaller testers, and the orchestrator itself chose every mutation and ended Phase 2 early; the outcome is therefore not deterministic. The paper says, “Since the process is driven by a frontier model, its outcome cannot be replayed deterministically, but it can be audited.” (Reproducibility statement, p. 10.)

## technique: live proof session and information-dense tools

What it is. The evolved server maintains a live Rocq session so each tactic call updates an existing proof state rather than recompiling the whole file. It supports tactic application, backtracking, current-state inspection, simple automation, and verification of a proof or project. The paper reports a call falling from 266 ms for full compilation to about 1 ms with the session mechanism (Section 3, p. 5).

How to apply it.

1. Open a file into an interactive prover session.
2. Return the current proof state and accept a tactic/tool call that advances it.
3. Permit rollback when a tactic branch fails.
4. Expose compact diagnostics, search results, near-miss hints, and automation commands.
5. Offer a final proof/project verifier separate from incremental interaction.

Inference: A Verus interface can maintain a workspace snapshot, run verification on changed modules, expose the failing verification condition and counterexample, and restore a prior Rust/spec state. Incremental latency does not itself establish soundness; final verification must run from a clean build.

Evidence. Averaged over four models on common solved attempts, evolved tools use 5.6 calls, 59.9k input tokens, and 1.6k output tokens, versus CONTROL's 5.9 calls, 79.0k input, and 6.6k output (Table 3, p. 7). The authors attribute cost/time gains to the 300-second/30-call tester budget forcing fewer calls and denser tool output; this is a consequence of the harness, not an independently optimized cost objective.

## technique: anti-cheating proof and project validation

What it is. The harness treats an agent report as untrusted. For a proof, it checks that imports and the theorem statement prefix are unchanged, rejects axioms and partial-proof commands (`Axiom`, `Parameter`, `admit`, `Admitted`, `Abort`, and similar), rejects additional imports, recompiles the file alone in a clean directory, and audits theorem assumptions with `Print Assumptions` against standard-library axioms (Section 2.3, p. 4). A project must build from scratch, pass its test suite, and pass the same anti-cheating protocol.

How to apply it.

1. Snapshot the task's protected prefix and allowed imports.
2. Reject forbidden axioms, admits, aborts, partial proofs, and imports before judging success.
3. Recompile the proof in a clean directory, independent of the agent's session.
4. Inspect assumptions and compare them to an allowlist.
5. For a project, rebuild from scratch and run its tests; count success only when all checks pass.

Inference: For Verus, protect the specification and dependency manifest, reject `external_body` or other unsound escape hatches allowed by the project's policy, compile in a fresh environment, and inspect the verifier's trusted assumptions and external dependencies. The exact forbidden list must follow Verus policy; the paper's Rocq commands do not transfer verbatim.

Evidence and limits. The authors state, “No output reported by an agent or by its tools is trusted: every proof and project counted as a success was recompiled from scratch in a clean directory and audited with Print Assumptions.” (AI-use review, p. 10.) This establishes the experiment's success criterion, not that the compiler or standard-library axioms are philosophically assumption-free.

## transfer to Lean and product threat

The authors port the exact tool set to Lean as LEAN-MCP-EVOLVE and compare it with a compiler-only server and LEAN-LSP-MCP on 60 PutnamBench problems (20 per difficulty bucket, two runs each). LEAN-LSP-MCP has the highest accuracy; LEAN-MCP-EVOLVE and CONTROL tie in accuracy, while the evolved port has the best cost and wall time (Table 5, p. 8). The paper warns that Sonnet may have seen PutnamBench or LEAN-LSP-MCP in training, so this transfer result is contaminated-risk evidence rather than a clean generalization claim.

Inference: Threat to VeruLaw is medium to high at the agent-interface layer. Evolution can discover which diagnostics, state controls, search tools, and automation wrappers make agents cheaper and more successful on verified Rust. It does not replace specification review or the Verus checker. The anti-cheating protocol and clean rebuild are directly valuable; the frontier-model mutation process is non-repeatable and can overfit validation tasks or optimize token budgets instead of proof quality.

## techniques for the catalog

- evolutionary interface search — propose one prover-tool mutation at a time and retain it only under fixed accuracy, cost, and time validation rules
- live proof-state interaction — maintain an incremental prover session with tactic execution, rollback, compact diagnostics, and final verification
- budget-driven information density — use fixed time/call budgets and measure tokens and calls so useful diagnostics reduce interaction cost
- anti-cheating proof harness — protect statements/imports, reject unsound commands, rebuild cleanly, and audit assumptions before counting success
- cross-prover interface transfer — port an evolved tool set to another proof assistant and report accuracy, cost, and time with contamination caveats
Checked 2026-10-15 against paper viennot2026growinginterface: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
