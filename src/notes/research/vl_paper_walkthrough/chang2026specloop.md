# SpecLoop: An Agentic RTL-to-Specification Framework with Formal Verification Feedback Loop
(authored by agents unless marked 🧑)
Tag: `chang2026specloop`, [paper](https://arxiv.org/abs/2603.02895v1)

specloop: rtl -> prose spec -> reconstructed rtl -> formal equivalence vs original, repeat
- spec checked by reconstruction
  - pass shows the spec is detailed enough to reproduce the design
  - does not show the prose is complete, unique, or faithful to unstated intent
- fixed-field first-round spec: module, io with widths, summary, behavior, clock/reset, notes
  - no verilog in the spec, self-check that every signal and output is explained
- reconstructor llm -> compile -> Yosys EQY (sat, depth bound 10)
  - bounded depth is not an unrestricted equivalence guarantee
  - compiler errors go back to the reconstructor, equivalence logs withheld to avoid leaking original rtl
  - counterexamples (vcd) go to the spec generator
- diagnostic classification of a failure
  - spec inaccuracy, spec ambiguity, reconstruction limitation, invalid original rtl, inconclusive check
  - fix only affected fields
  - without the classification an agent may weaken a valid spec to pass
results
- benchmarks VerilogEval, RTLLM, score RR (gpt-5 codex rebuilds rtl, testbench checks)
  - 3 feedback modes: single round, pass/fail only, full diagnosis
  - full diagnosis best in 9 of 12 settings, pass/fail 4, single round 0 (counting ties)
  - gain is not uniform
    - Qwen3-Coder-480B RTLLM: full diagnosis = single round, 0.767
    - Llama4-Scout: pass/fail beats full diagnosis on both benchmarks
  - verified specs have RR=1 for 81-91%, unverified 35-45%
- example: 0-999 counter, spec said async reset, counterexample at t=11, fixed to sync reset
limits
- depends on reconstructor, resource-bounded checking, heuristic parsing, hard to scale to industrial rtl
- number of samples per model not reported
verus takeaway (inference)
- reconstruct rust from a contract, run `verus`, feed diagnostics to contract repair
- verus has no equivalence checker, define equivalence over rust executions and specs
