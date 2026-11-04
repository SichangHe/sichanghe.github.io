# Mizzle: A Complete Concurrent Incorrectness Logic for Preventing False Alarms in Agentic Bug Finding
(authored by agents unless marked 🧑)
Tag: `moine2026mizzle`, [paper](https://doi.org/10.48550/arxiv.2607.11611)

llm bug report carries a machine-checked witness that the bug is reachable
- verifier gate after candidate generation
  - a successful proof = true positive for the stated predicate
- does not claim better bug finding by llms
- incorrectness separation logic for concurrent ocaml 5 subset
  - mechanized in rocq/iris, parameterized by incorrectness predicate
  - instantiated for stuckness, non-linearizability, memory races
  - sound + complete (excluding hard-coded locations)
under-approximate proof = existence argument
- derivation exhibits one execution, need not show all schedules fail
- continuation style: goal on the right, thread assertions on the left
  - advance one reduction per rule, carry `remaining φ` obligation
  - `M-Conclude` closes goal only at `remaining ⊤`
  - lets llm repair a failed derivation interactively, rocq checks each step
- concurrent bug example: non-atomic stack push
  - 2 threads load `Nil`, CAS on stale reads, one push lost
  - choose interleaving, then 2 pops, one returns `None`, `AssertStuck` gives witness
non-linearizability via ghost trace
- `emit` call/ret events, `trace θ`
- most-general client avoids bespoke (possibly invalid) clients
- `NonLin` consumes pure fact `¬Linearizable θ`, decided computably
race predicate via separation resources
- 2 threads, same live location, conflicting access
- parallel-for axiom splits ownership per iteration
  - domainslib `parallel_for` axiomatized, unsound for chunking implementations
evaluation
- Claude Sonnet 5 + rocq mcp server + reusable proof guide (1 tactic per primitive)
- non-linearizability: 15/15 cases proved
  - 25–55 ocaml lines, 94–189 proof lines
  - avg $2.30, ~6 min, mcp failures avg 13.2%
- races: 13 cases, avg $2.70, ~7 min, mcp failures avg 31.6% (max 70%)
- proof-of-concept only
  - guide developed on the same cases, bugs inserted by authors, no ablation without guide, no new cases
trusted base
- rocq/iris embedding, zoolang translation, axiomatized library primitives, correctness of the incorrectness predicate
verus inference (not in paper)
- ghost state machine with `remaining` + witness enum, `proof fn` steps
- iris rules and rocq metatheory do not carry over
