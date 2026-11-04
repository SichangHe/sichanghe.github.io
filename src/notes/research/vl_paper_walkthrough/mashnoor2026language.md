# From Language to Logic: Bridging LLMs & Formal Representations for RTL Assertion Generation
(authored by agents unless marked 🧑)
Tag: `mashnoor2026language`, [paper](https://doi.org/10.1109/vts69484.2026.11563398)

proofloop: react agent generating systemverilog assertions (sva) from nl spec, with jasperGold in the loop
- 3 parts: ast-indexed retrieval, jasperGold structural queries, solver repair loop
- accepted only after jasperGold parses and analyzes it
  - proven or undetermined results get a separate vacuity check, so unreachable antecedents are not accepted
- eval on 192 FVEval Design2SVA designs (96 pipeline, 96 fsm)
  - Qwen3.5-35B pipeline: syntax 93.7% vs 78.3% baseline, functionality 82.0% vs 43.2%
  - percentages are assertion-level aggregates, not design pass rates
ast-indexed retrieval
- parse rtl with `pyslang`, chunk into module interfaces, always blocks, instances, assigns
- embed per design, retrieve only relevant fragments instead of whole rtl
- inference for Verus: index modules, signatures, specs, invariants, call graphs
react context gathering
- up to 6 thought-action-observation rounds
- tools: retrieval, plus formal-tool fan-in/fan-out cones, clock, reset facts
- agent chooses queries, so simple designs stop early
  - case: 22 tool calls in 6 rounds on a 6-module fsm
solver-in-the-loop repair
- up to 3 verification rounds
- falsified: feed errors and counterexample traces back, make localized edits
  - not regenerate from scratch
- evidence
  - 59.3% of syntax failures corrected by solver feedback
  - only 20 of 101 initially falsified specs fully recover
  - syntax repair easier than temporal-logic repair
- inference for Verus: loop cannot catch a property that is itself too weak
ablation on 36 designs, syntax/functionality
- full 93.7/82.0
- no rag 90.9/70.9
- no verification loop 82.9/64.7
- no structural analysis 80.0/58.4
- no tools 70.3/36.1
