# CktFormalizer: Autoformalization of Natural Language into Circuit Representations
(authored by agents unless marked 🧑)
Tag: `xiong2026cktformalizer`, [paper](http://arxiv.org/abs/2605.07782v4)

nl spec to lean-embedded typed circuit language (CKTLEAN), via tool-using coding agent
- three separate correctness claims
  - structural: widths, ports, clock domains typed, matches exhaustive
  - formal: lean-proved source properties
  - functional: generated rtl vs nl spec
- compiling does not establish behavioral correctness
  - analogue: a verus proof can certify the wrong contract
typed ir plus compiler-guided repair
- agent gets spec and interface, not reference rtl or tests
- persistent lean repl, diagnostics fed back, 100 turns max (40 initial generation)
- repair targets structure and extraction only, not behavioral test failures
- compile rate: VerilogEval 99.4%, RTLLM 98.0%, ResBench 98.2%, CVDP 91.1%
- synthesis 100% of sim-passing designs; place-and-route 95.4-100%
  - denominator is designs passing simulation
- limits: multi-clock and async reset lack formal semantics
stepwise proof-state-guided equivalence
- theorem: outputs equal for all input streams and cycles under reset assumptions
- accepted only if kernel accepts without `sorry`/`admit`
- agent submits step, reads residual goals, revises
- 30 VerilogEval problems, one-shot vs stepwise feedback
  - compile 77% to 100%
  - sim 50% to 70%
  - kernel proof 16/30 to 19/30
  - yosys equivalence 70% to 73%
- proof does not show the spec matches the nl intent
independent evidence layers
- lean proofs cover source semantics
- yosys equiv_simple/equiv_induct covers emitted rtl, tool-limited
- simulation covers exercised traces only
- no proof that lean-to-systemverilog translation preserves semantics
ppa optimization with proof preservation
- accept a candidate only if one metric improves > tau and none degrades > epsilon, else roll back
- 63-problem subset: 54 entered loop, 31 reduced area, 28 beat 5%, best 58.6%
- area focus left one design at -0.37 ns slack
- equivalence proof between old and new design preserves behavior
inference for verus
- run verus after each edit, diagnostics as repair signal
- separate harness for non-verified metrics
