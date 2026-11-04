# Using LLMs to Facilitate Formal Verification of RTL
(authored by agents unless marked 🧑)
Tag: `orenesvera2023llmrtl`, [paper](https://arxiv.org/abs/2309.09437v2)

gpt-4 writes SystemVerilog assertions (SVA) from RTL alone, JasperGold (JG) checks them, human audits
- extends AutoSVA (AutoSVA2)
- result: exposed a previously fixed bug in an older RISC-V CVA6 page-table walker (PTW)
  - targeted at a known bug, not a general detection rate
  - 6 batches, 80 assertions, about 1 hour of engineering to the failing assertion
- caveat: full coverage does not imply correct assertions or RTL
  - assertions may share the RTL's bug, so audit all of them
fpv-guided prompt-rule refinement
- loop: generate SVA, run JG, classify failures, add plain-english rule, regenerate in clean context
- failure classes: internal-signal, syntax, wrong timing, wrong semantics
- FIFO: 23 iterations, about 8 hours to reach 8 assertions with 0 failures
  - single module, not a convergence rate
  - a new rule was still needed in robustness tests (`$countones`)
- verus analogue (inference): classify proof diagnostics, add narrow hints, rerun
timing was the hardest thing for gpt-4
- kept using same-cycle `|->` for updated register values
- rules that helped
  - `|->` same cycle, `|=>` next cycle
  - `$past` only in postconditions
  - `_reg` signals update next cycle, others are wires
  - bit-reduction semantics (`&bits`, `!(|bits)`)
- verus analogue (inference): explicit old/new state in transition lemmas
multiple batches plus AutoSVA annotations and liveness
- gpt-4 safety assertions complement AutoSVA interface and liveness properties
- coverage gain over AutoSVA alone, 1/3/6 batches
  - PTW statement 1.05x/1.23x/1.25x, toggle 1.24x/1.57x/1.57x
  - TLB statement 2x/6x/6x, toggle 2.12x/3.67x/3.74x
  - little gain after 3 batches
- coverage measures gain, not correctness
proof-guided RTL generation
- english spec to RTL, generate and audit SVA, append refined SVA to next prompt (not old RTL)
- FIFO converged to full proof after 2 RTL iterations
  - first RTL: 5 of 11 assertions failed from SVA issues, plus RTL-only and RTL+SVA failures
