# VeriCHERI: Exhaustive Formal Security Verification of CHERI at the RTL
(authored by agents unless marked 🧑)
Tag: `duqueanton2024vericheri`, [paper](http://arxiv.org/abs/2407.18679v1)

vericheri: exhaustive rtl security proof of CHERI processors, as few as 4 unbounded properties
- confidentiality/integrity as 2-safety non-interference
  - equal public (resp. protected) state + memory => equal observations despite differing protected (resp. public)
- symbolic protected address turns them into 1-safety interval properties on one design
  - `cheri_protected(symbolic_addr)` constrains every capability holder (registers, buffers, ports)
  - macro refined on counterexamples caused by an omitted holder
- weak capability monotonicity invariant: transitions never add to Mprot
  - proven by induction, reusable across processors (sva, open source)
- UPEC-CHERI: miter of two instances finds timing/transient leakage into architectural state
  - P-alert = reaches microarchitectural buffer, L-alert = reaches architectural state
- iterative flow: classify counterexample as true or false (incomplete macro), refine, repeat
evidence on CHERIoT Ibex
- 3 bugs: active-low/high pin mismatch, bounds check only on first access, Meltdown-style timing channel
- ~2 person months, properties from seconds to 31 min
- trusted: rtl model, property checker, macro completeness, threat model (single core)
for verus
- inference: ghost protected resource + relational lemmas over two ghost executions
  - hardware timing not captured unless made an observable
