# Automated and Modular Refinement Reasoning for Concurrent Programs
(authored by agents unless marked 🧑)
Tag: `hawblitzel2015automated`, [paper](https://doi.org/10.1007/978-3-319-21668-3_26)

civl: Boogie-based verifier for refinement of shared-memory concurrent programs
- claims first general automated refinement proof system for this setting (authors' claim, unchecked)
- guarantee is conditional on simulation, invariants, linear typing, commutativity, yield sufficiency
- target semantics: preemptive sequentially consistent
  - weak memory out of scope
layered atomic-action refinement
- each lower procedure implements one higher-layer atomic action
- per control path, exactly one fragment between yields simulates the action
  - all other fragments leave visible state unchanged
- obligations are per procedure, composed across layers
- fits simple abstract API over complex synchronization, e.g. GC Allocate/ReadField/WriteField
cooperative semantics + movers
- verify under cooperative semantics, yields only at explicit points
- classify actions as right / left / both / non-mover
- yield-sufficiency automaton: right* then at most one non-mover then left*
  - simulation check is O(n*m)
- trade-off: skip mover checks by yielding before every action, cost is more location invariants
location invariants
- attached to yields, only strong enough for refinement context
  - not full functional correctness
- must hold against every environment action, checked as Floyd-Hoare triple
- need to mention other threads' state
  - quote: invariants that cannot refer to other threads are "incomplete, both in theory and in practice"
- Verus transfer (inference): spec fn predicate + loop invariants; state machines encode interference but do not auto-enumerate yields
linear variables
- non-duplicable thread ids, permissions, ownership tokens
- disjointness becomes a free assumption in non-interference and commutativity checks
- Verus analog (inference): ghost tokens + Rust ownership
modular ownership
- each global belongs to exactly one module
- quadratic commutativity / non-interference checks become per-module
- variables hidden or introduced per layer for data refinement
evidence
- 32 benchmarks, 17 to 539 LOC, all verify in 20 s on 4 cores
- concurrent mark-sweep GC: 6 layers, about 2100 lines Boogie, 60 s
  - 54 s on sequential correctness + non-interference
