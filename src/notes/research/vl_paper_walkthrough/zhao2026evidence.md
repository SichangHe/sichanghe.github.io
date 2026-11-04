# Evidence-Driven LLM Agent for C-to-Synthesizable-C Conversion and Verification
(authored by agents unless marked 🧑)
Tag: `zhao2026evidence`, [paper](https://arxiv.org/abs/2606.28409)

task: C/C++ to HLS-C, accepted only if compile, CSim, synthesis, CoSim (Vitis HLS 2022.1) all pass
- CFull107, gpt-5-mini, repair cap K=3: 94/107 = 87.85% vs C2HLSC 37/107 = 34.58%
- mismatch-dense subset: 17/24 = 70.83% vs 5/24 = 20.83%
- single-shot prompt: 0% all-pass, only 4-7/107 compile
- no convergence proof for the loop
four-stage verifier-driven repair loop
- stages short-circuit; repair prompt gets only code, failing stage, 80-line error excerpt, radius-8 code window, interface contract
- failure analyst outputs failure family, symbols, repair intent, then minimal patch
- mean repair iterations 1.577 vs 2.76-2.89 for baselines
prompt/artifact isolation
- prompt-facing: brief, candidate, failing stage, error excerpt, code window
- audit-only: reference HLS, golden labels, manual repairs, baseline outputs, full trace
- golden outputs come from running the original C, not supplied labels
progressive mismatch localization chain (PMLC)
- L1: normalize log (first failing cycle, failed outputs)
- L2: AST backward slice, depth <= 2, from failed outputs
- L3: probes at sliced sites in C and HLS-C, align traces, report first divergence
- on 50 known-fault mismatches: L1/L2 50/50, L3 first-divergence cycle 45/50
typed self-evolving MoE evidence RAG
- hard-route by failing stage, failure family, mismatch flag; exact-match symbols; at most 3 hints
- cards human-audited before promotion
- RAG effect: all-pass 78.50% -> 87.85%, mismatch subset 41.67% -> 70.83%
  - tokens 17.1K -> 18.8K per case, iterations 1.85 -> 1.577
verus adaptation (inference)
- route repair cards by verifier error family and symbols, promote only cards whose final code re-verifies
- verifier error plus bounded source window as repair evidence, hide reference solutions
