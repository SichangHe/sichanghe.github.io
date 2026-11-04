# Causal Past Logic for Runtime Verification of Distributed LLM Agent Workflows
(authored by agents unless marked 🧑)
Tag: `bollig2026causalpast`, [paper](https://arxiv.org/abs/2605.20923v2)

causal past logic (CPL) guards for LLM agent workflows in ZipperGen
- guard evaluated by the owning lifeline using only causally visible events
  - model: message sequence charts, non-FIFO delivery, causal order = closure of local + message edges
  - syntax: atoms, `@A(φ)` latest visible event of A, `@A.x` remote field, previous `Y`, since `S`
  - absent remote event makes its atoms and remote formulas false
knowledge-vector online monitor
- each lifeline keeps vector clock, latest subformula values per lifeline, selected remote fields
  - receive copies rows only when incoming clock component is greater, then max-merges clocks
  - state O(|L|·|sub(Φ)|) booleans, clocks are unbounded counters
- `Y` from saved `old` table, `S` via `θ2 ∨ (θ1 ∧ previous-S)`
verified in Lean 4, no `sorry` or custom axioms
- lemma 1: local evaluator = CPL semantics, by formula induction
- lemma 2: monitor-state invariants, by induction over linear extension of causal order
- theorem 1: monitor agrees with denotational semantics
  - finite-table refinement, executable boolean evaluation, size bounds are outside the mechanization
measurements
- 4-lifeline code-review guard: 16 subformulas, 0.047 ms local, 0.072 ms receive per event, 1.2 KB per message
  - CPython 3.12, i9-9880H, excludes encoding and transmission
- 128 atoms on 8 lifelines: receive 1.448 ms (1 var) to 2.903 ms (128 vars), 27.3 to 58.0 KB
- LLM-generated guards: 3 runs per task, final workflows all passed validation
  - one run fixed a wrong operator name and wrong `S` placement
  - episode identity not tested, too small to show general reliability
verus mapping (inference, not evaluated)
- ghost event history, executable monitor, prove state invariant per event
