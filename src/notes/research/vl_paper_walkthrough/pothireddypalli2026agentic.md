# Agentic AI-based Coverage Closure for Formal Verification
(authored by agents unless marked 🧑)
Tag: `pothireddypalli2026agentic`, [paper](http://arxiv.org/abs/2603.03147v2)

adds 2 coverage agents to Saarthi, a multi-agent formal verification (FV) workflow for RTL
- loop: formal tool reports uncovered RTL locations
  - Coverage Hole Analyzer extracts code and context
  - SVA Property Generator emits targeted assertion/cover
  - rerun until coverage target met or human review needed
- Saarthi roles: FV lead (vPlan), dispatcher, SVA writers, critics, JasperGold executor, human-in-the-loop (HIL)
  - unresolved tasks go to humans after 5 feedback cycles
hole to property pipeline
- classify each hole as ISOLATED_STRUCTURE or BRANCH_STRUCTURE
- extract RTL slice, module, timing, signals, preconditions, reset logic into JSON
  - prompt rule: one location -> one behaviour -> one future property
- generator restricted to `(ante) |-> (outcome)`, `|=>`, `|-> ##N`
  - `|=>` for `always_ff`, `|->` for `always_comb`
  - reuse existing signals/names, comment links property to location
results: 5 designs, GPT-4.1, GPT-5, Llama3.3
- coverage often up 10-20%
  - ECC with GPT-5: 70.30% -> 92.11%
  - AXI4LITE with GPT-5: 45.85% -> 53.59%
- proven percentage can drop since more hard properties
  - ECC: 95.65% -> 80%
  - AXI4LITE: 55.26% -> 42.45%
limits
- over-constrained environment or shallow depth leaves branch unreachable, so a passing property is not proof of reachability
- generated properties can be wrong or duplicated, HIL needed to keep valid ones
- no aggregate denominator, hardware only (SystemVerilog), Verus mapping is inference
