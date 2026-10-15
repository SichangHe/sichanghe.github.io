# Quantitative Comparison of Credible Compilation and Verification In Coding Agent Compiler Development
(authored by agents unless marked 🧑)
Tag: `rinard2026quantitative`, [paper](https://arxiv.org/abs/2605.08927)

## result and experimental question

This paper measures the engineering and runtime tradeoff between credible compilation (also called translation validation or checked computation) and full verification when a coding agent implements compiler optimizations. Credible compilation permits an unverified transformation to emit a certificate; a separately verified checker rejects the result if the certificate does not establish semantic preservation. Full verification proves the transformation itself. The authors supervise Claude Code Opus 4.7 in Lean 4 and implement both versions of unreachable-code elimination (UCE), dead-assignment elimination (DAE), and constant propagation/folding (CP) in the Axon compiler.

The abstract reports four findings: “verification requires roughly an order of magnitude more development effort than credible compilation,” verified versions choose less efficient algorithms and data structures, the agent repeatedly narrows verified optimization scope to ease proofs, and certificate checking dominates optimization and certificate-generation time for these cases (abstract, p. 1). These are measurements of three Axon TAC optimizations under one supervisor, model, machine, and benchmark family. The limitations section says the results may not generalize exactly to other intermediate representations, compilers, agents, or supervision strategies (Sec. 8, p. 9).

## technique: credible compilation with verified certificate checking

Use this when transformation algorithms are complex or changing, but a relational certificate can be checked by a small trusted component. The unverified optimizer computes a transformed program and a certificate that relates original and transformed behavior; the verified Axon checker accepts only certificates that prove semantic preservation.

Steps from Secs. 1 and 3 (pp. 1, 3–4):

1. Represent the source and optimized programs in Axon's three-address code (TAC).
2. Run an analysis and transformation, such as a depth-first reachability pass for UCE or backwards liveness for DAE.
3. Generate a certificate (for example, a relational invariant) describing why each transformed instruction preserves behavior.
4. Run the verified certificate checker on the original TAC, transformed TAC, and certificate.
5. Reject the optimization if checking fails; otherwise compile the optimized program.
6. For composite transformations, generate one certificate after applying multiple passes so checker cost is amortized.

The paper states: “Credible compilation optimizations include certificate generators and use the Axon certificate checker.” (Sec. 3, p. 3). The approach tolerates an incorrect optimizer because an incorrect certificate should be rejected by the checker. In the UCE+DAE implementation, one certificate covers both passes.

Inference: a Verus product could put an agent-written transformation behind a verified checker whose `spec fn` relates source and output states, while leaving the transformation executable and untrusted. The checker would need a proved soundness theorem in Verus. This is not a direct Verus feature in the paper; it is an architectural mapping.

Evidence: CC UCE required one session, 0:18 active time, 0.49M generated tokens, 42 added code lines, no proof lines, and one supervisor prompt (Table 1, p. 4). CC UCE+DAE required four sessions and 1:05 active time; CC CP required three sessions and 1:10. The denominator is one completed implementation per optimization, not repeated independent agent runs.

## technique: full verification of the transformation

Use this when the transformation itself must carry a machine-checked proof and certificate generation is undesirable at deployment. The agent proves that the analysis, transformation, and output preserve semantics in Lean.

Steps from the measured workflow (Secs. 3 and 5, pp. 3, 6–8):

1. Implement the TAC analysis and transformation in Lean.
2. State a semantic-preservation theorem connecting original and transformed programs.
3. Prove dataflow facts and fixed-point properties needed by the theorem.
4. Integrate the pass into Axon and run the Livermore kernels.
5. When functionality or data structures change, update the proof and rerun the theorem checks.
6. Optimize proof-friendly implementations only after correctness is established.

For UCE, the agent first replaced unreachable instructions with halts to avoid branch-target proof complexity, then a runtime check, then (under supervision) removed instructions and verified reachability. It initially used an (O(N^2)) repeated-sweep reachability algorithm and later replaced it with a worklist algorithm; each change required proof updates (Sec. 5.1, p. 6). For DAE, the verified version initially used no-ops, supported only three of nine assignment kinds, and required no reads anywhere in the whole program; supervision removed these restrictions, but proofs had to be repaired (Sec. 5.2, p. 7).

Inference: in Verus, this corresponds to proving the Rust transformation function against a semantic relation with `requires`, `ensures`, loop invariants, and proof lemmas. The paper uses Lean, so its theorem statements and tactics do not carry over. The engineering lesson does: algorithm and data-structure choices affect proof cost, and ordinary refactoring can invalidate many proof obligations.

Evidence: verified UCE took eight sessions, 5:58 active time, 12.27M generated tokens, 549 added code lines, and 4,348 proof lines. Verified UCE+DAE took 14 sessions, 8:11 active time, 16.35M tokens, 734 code lines, and 8,158 proof lines. Verified CP took 15 sessions, 9:40 active time, 17.86M tokens, 1,079 code lines, and 6,131 proof lines (Table 1, p. 4). Relative active-time ratios against the corresponding CC rows are 19.9 (UCE), 7.6 (UCE+DAE), and 8.3 (CP); token ratios are 25.0, 8.8, and 10.2. Including certificate-checker update rows reduces ratios to 3.5–4.3, but the paper still attributes most verified effort to proofs (Sec. 4.1, p. 5).

## technique: worklist and fixed-point optimization under proof constraints

Use this when dataflow analyses repeatedly traverse the entire program. The agent initially chose repeated complete passes because they were easier to prove, then introduced worklists for speed while retaining a final fixed-point check to satisfy existing proofs.

For DAE, replacing full sweeps with a worklist made analysis 35–393 times faster across Livermore kernels, geometric mean 137 times (Sec. 5.2, p. 7). For CP, the worklist version ran 4.7–12 times faster, geometric mean 7.27 times (Sec. 5.3, p. 8). The final complete traversal was later removed after proving that the worklist itself reaches a fixed point. These ratios are ranges and geometric means over the Livermore kernel executions; the paper does not claim a universal speedup.

Inference: for Verus, prove a reusable fixed-point lemma for the worklist and expose the invariant that every queued node is either processed or stable. This can avoid retaining a redundant full traversal solely to make automation succeed. The paper does not give Verus code or establish that such lemmas are easy in Verus.

## runtime and certificate overhead evidence

The paper reports: “The verified optimizations have substantially larger execution times than the corresponding credible compilation optimizations (VF column vs CC opt column).” (Sec. 4.2, p. 5). It also observes: “The development time for the verified optimizations is significantly larger than for the credible compilation optimizations because of the proof overhead.” (Sec. 6, p. 8).

Compile-time measurements use 20 executions per kernel; minimum and maximum are discarded and the mean of the remaining 18 is reported (Sec. 4.2, p. 5). Table 2 contains 24 Livermore kernels. For each CC optimization it reports optimization (`opt`), certificate generation (`gen`), and certificate checking (`chk`) times; VF reports the verified optimization time. Certificate checking dominates optimization and generation for the simple transformations. For example, CP on `k01_hydro` is 0.091 seconds optimization, 0.101 generation, and 9.09 checking, whereas VF is 5.36 seconds (Table 2, p. 5). The denominator is the 18 retained runs for that kernel/column.

The paper notes that verified optimizations run substantially slower than CC transformations, attributing this to proof-friendly lists and repeated traversals. CC can optimize behind the certificate, allowing more complex algorithms while retaining a checked boundary. Composite CC optimizations such as UCE+DAE amortize certificate checking. Inference: a VL workflow could similarly use a verified small checker around agent-written Rust passes when full proof latency would block iteration, but only if the checker and semantic relation are themselves within the trusted base.

## trust boundary and threat to agent-written verified Rust

Fact: the study's all-code-and-proof agent work was supervised by a human, and all data was processed with scripts provided by or generated by the agent (Sec. 4, p. 4). Fact: credible compilation trusts the verified certificate checker and its semantics; full verification trusts Lean, the formal semantics, compiler extraction/runtime assumptions, and the correctness specifications. Fact: the experiments cover three optimizations, Axon TAC, and Livermore computational kernels, not complete applications.

Inference: for agent-written verified Rust, full verification has a direct productivity threat: proof maintenance can dominate implementation and encourage weaker functionality or slower algorithms. Credible compilation offers a practical alternative for complex, changing components, but shifts trust to a checker and certificate semantics. VL should not redo the generic comparison; its relevant question is which Verus components admit compact verified checkers and which require direct proofs, measured on real product changes and dependency upgrades.

## techniques for the catalog

- credible compilation: let an unverified transformation emit a certificate and reject it with a verified semantic checker
- full transformation verification: prove the optimizer, analysis, and semantic-preservation theorem directly in a proof assistant
- composite certificates: combine several passes under one relational certificate to amortize checking cost
- proof-friendly dataflow: use worklists and fixed-point lemmas to recover performance without abandoning machine-checked proofs

Checked 2026-10-15 against the paper by a Codex agent for quantitative_comparison_of_credible_comp_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
