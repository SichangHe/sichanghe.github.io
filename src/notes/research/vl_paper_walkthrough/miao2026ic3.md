# IC3-Evolve: Proof-/Witness-Gated Offline LLM-Driven Heuristic Evolution for IC3 Hardware Model Checking
(authored by agents unless marked 🧑)
Tag: `miao2026ic3`, [paper](https://arxiv.org/abs/2604.03232)

## core method and correctness boundary

IC3-Evolve uses an LLM offline to propose small patches to an IC3 hardware model checker, each confined to a named group of heuristics called a slot. HWMCC is the hardware model checking competition whose benchmarks the paper uses. A challenger is promoted only after independent validation: SAFE must emit a checkable inductive invariant; UNSAFE must emit a replayable counterexample trace. The deployed checker contains no model or runtime inference. The paper states: “every candidate patch is admitted only through proof-/witness-gated validation.” (Abstract)

IC3 itself is proof-producing. It maintains frames F0…Fk, blocks counterexample-to-induction cubes with clauses, pushes clauses forward, and returns SAFE when adjacent frames become equal or UNSAFE when a proof obligation reaches level 0 (Section 2.1, Algorithms 1–2). Heuristics change search order and resource allocation but should not change soundness if SAT checks and terminal certificates remain validated (Section 2.2).

## technique 1: slot-restricted propose–validate–promote loop

Use this when evolving a verifier's heuristics while keeping edits auditable and easy to revert.

1. Start from a champion checker and define editable slots: proof-obligation handling, inductive generalization, predecessor generalization, push and propagation of clauses, and small multi-slot (cross-slot) changes (Section 3.2, Table 1)
2. Give each slot a knowledge pack containing relevant code, solver references, and papers; retrieve only slot-relevant context (Section 3.2)
3. Select one slot in Compass mode or 2–3 distinct slots in Jump mode using a ranked MoveSet, the evaluator's list of suggested next edits (Sections 3.2, 3.3 and 3.5, Algorithm 3)
4. Ask a programmer agent for one minimal patch, a hypothesis, and a fallback plan; preserve slot discipline and an 80-added-line/three-file limit from the prompt (Appendix 6.1)
5. Build the challenger and run proof/witness hard checks on every solved benchmark instance (Section 3.4)
6. Run fixed-timeout benchmark evaluation, calculate PAR2 (average solving time, with each timeout counted as twice the 1,800-second limit; Section 4.1) and the solved and timeout counts, and have an evaluator diagnose the diff and return the next MoveSet (Sections 3.3–3.5)
7. Promote only if all hard gates pass and performance improves without unacceptable regressions (the paper gives no threshold; Figure 2 calls it a regression budget); otherwise revert to the champion (Section 3.3)

Compass&Jump ranks move m=(slot,direction,confidence,risk,cost) by `wc·conf − wr·risk − wk·cost`; Jump probability decreases under steady improvement and increases under stagnation (Section 3.5). The policy controls search scope only. The paper emphasizes: “correctness is guaranteed solely by the proof-/witness-gated validation.” (Section 3.5)

Inference: VL can apply the same loop to Verus verifier or proof-generation infrastructure: constrain a patch to a named module or function, require a hypothesis and a rollback plan, run `verus` and product regression tests, and promote only after all proof obligations pass and no regression budget is exceeded. Verus does not provide IC3 certificates, AIGSIM, or CERTIFAIGER; those are replaced by the exact Rust/Verus validation artifacts.

## technique 2: independent SAFE and UNSAFE certificates

For each benchmark instance solved within 1,800 seconds, require an artifact independent of the evolved solver. An UNSAFE result dumps a counterexample trace replayed by AIGSIM; a SAFE result dumps an inductive invariant checked by CERTIFAIGER. A missing artifact, a failed replay or check, or an inconsistent return code rejects the challenger before performance scoring (Section 3.4). The evaluator prompt also reverts a challenger whose build fails (Appendix 6.1). AIGSIM is a simulator from the AIGER library and CERTIFAIGER is a certificate checker; both are existing tools, not part of the evolved solver.

This gate caught a real counterfactual: in rounds r093–r094, a clause-cleaning patch would have improved the evolution workload by nine solved instances under performance-only selection but failed independent witness validation and was rejected (Section 4.4). Inference: this one reported case is evidence that performance-only promotion can deploy unsound code; it is not evidence that every rejected patch is unsound.

Inference: A Verus analogue should export verifier-checked proof results plus replayable functional witnesses for negative tests or counterexamples. The independent checker must be separate enough to catch a bug in the evolving implementation; rerunning the same code path is not equivalent to independent validation.

## technique 3: staged heuristic evolution and case-study pattern

The experiment evolves IC3ref for 200 offline iterations: a one-slot sweep for the first 100 iterations, then Compass&Jump with occasional multi-slot edits for the next 100 (Section 4.1). The detailed Push Clauses case study illustrates an instrument–gate–adapt pattern. Stage r002 records push progress and calls expensive simplification only after a push or periodic checkpoint; r004 skips repeatedly stalled frames; r013 assigns adaptive budgets based on stall/success history and early termination (Appendix 6.3). On HWMCC Set A, PAR2/timeouts progress from 1050.61 seconds/25 at r000 to 1050.42/25 at r002, 983.73/22 at r004, and 943.07/21 at r013 (Table 4). The paper explains: “Across the three accepted edits, PAR2 decreases from 1050.61 s to 943.07 s and timeouts drop from 25 to 21.” (Section 4.2)

## evidence, assumptions, and threat

Evolution uses 100 public HWMCC instances; transfer uses 100 unseen HWMCC instances and 302 industrial instances, all under 1,800-second timeouts (Section 4.1). On Set A, IC3-Evolve solves 92/100 with PAR2 490.67 seconds; on unseen Set B it solves 94/100 with PAR2 464.56; on industry it solves 225/302 with PAR2 1044.26 (Table 2). The table also splits the solved instances into UNSAFE and SAFE: Set A 24 and 68, Set B 28 and 66, industry 36 and 189. Baseline rIC3-CaDiCaL gives 86/100, 89/100, and 182/302 respectively, with PAR2 639.61, 524.35, and 1449.78 seconds (Table 2). Single-slot ablations underperform: on Set B PO-only 75/100 and 1093.42 seconds, PredGen-only 78/100 and 970.38, IndGen-only 84/100 and 803.73, Push-only 75/100 and 1139.22; Naive-Compose reaches 85/100 and 775.19, versus full 94/100 and 464.56 (Table 3).

Inference: the trusted boundary includes SAT, IC3 certificate logic, AIGSIM, CERTIFAIGER, benchmark labels, timeout/PAR2 accounting, and the independent checkers. The LLM, knowledge packs, evaluator diagnosis, slot definitions, and promotion threshold are not covered by the gate, so they remain heuristic. The paper does not establish that all industrial hardware semantics are captured by the benchmark, or that broader edit spaces preserve the same safety.

Inference: Threat to agent-written verified Rust is high if VL lets an LLM change verifier or proof infrastructure without an independent gate, and lower if every change must pass Verus plus separate executable tests and artifact checks. The product should adopt slot restrictions, provenance logs, rollback, regression budgets, and independent proof/witness validation. VL should not redo the paper's basic result that performance-only evolution can accept an unsound improvement; the paper's r093–r094 counterfactual already reports one such case.

## techniques for the catalog

- slot-restricted code evolution — constrain each patch to named verifier heuristic slots with a small auditable diff
- proof/witness-gated promotion — independently check SAFE certificates and replay UNSAFE traces before scoring performance
- Compass&Jump search — rank evaluator moves by confidence, risk, and cost, then explore one or a few slots adaptively
- instrument–gate–adapt heuristic design — measure progress, skip stalled work, and allocate budgets by observed yield
- regression-aware champion loop — benchmark under fixed timeouts, promote only improvements, and revert all failures with provenance
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
