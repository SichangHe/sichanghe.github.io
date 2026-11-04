# Enhancing Word-Level Property Directed Reachability with LLM-Driven Semantic Guidance
(authored by agents unless marked 🧑)
Tag: `hu2026llm4pdr`, [paper](http://arxiv.org/abs/2609.30131v1)

LLM suggests word-level hints to PDR/IC3 for hardware model checking (Pono), never trusted as proofs
- problem: bit-blasting hides arithmetic relations (e.g. `y = x + 2`), PDR learns many local clauses
- hints are SMT-LIB2 `define-fun` with role prefix `predicate.*`, `clause.*`, `assertion.*`
  - parsed, width-checked, then validated per role
  - LLM never adds a fact to a frame directly
- GPT o3, fixed prompt, up to 5 declarations per request
Three mechanisms
- predicates: add atoms to the MIC cube
  - phase 1 freeze helpers, drop bit literals; phase 2 drop helpers that are redundant
- clauses: side-load into frame F1
  - must satisfy `UNSAT(Init ∧ ¬c)` and `UNSAT(Init ∧ T ∧ ¬c′)`
- assertions: temporarily strengthen P to P ∧ assertions
  - on counterexample, if P is false the design is unsafe, else drop only falsified assertions and restart
  - fallback is plain PDR on P
Prompt construction
- cone-of-influence slicing removes 52-82% of state variables on sample HWMCC instances
Results
- 33 arithmetic micro-benchmarks: Pono 13, AVR 11, LLM4PDR assertion mode 28, predicate and clause modes 23 each
- `intersymbol_conv`: Pono/AVR/DreamMiner time out, IC3ng without helpers 613.64 s, predicate guidance 3.06 s
- HLS Kalman3/4: baselines time out, LLM modes finish
- six RTL cases: predicate guidance best on five
- IC3ng without helpers sometimes regresses vs IC3bits, so gains are not just the engine
- no universally best helper type, they complement each other by design class
Takeaways for Verus
- LLM as hint generator, checker makes every decision
  - lemma must hold initially and after one transition before reuse
  - failed strengthening falls back to the original contract, never an unchecked `assume`
- trusted: Pono, SMT solvers, parser, transition-system encoding
