# Verification of a Generational Garbage Collector
(authored by agents unless marked 🧑)
Tag: `wang2026generational`, [paper](http://arxiv.org/abs/2609.13186v1)

Wang, Stark, Appel verify a multi-generation copying GC in C with Rocq + VST
- supports mutable references and updatable arrays, OCaml-compatible values
- top result: collection preserves the root-reachable graph up to label-preserving isomorphism (`gc_graph_iso`)
  - addresses change, unreachable objects removed, remembered sets updated internally
- API spec independent of implementation (copying vs mark-sweep, generational or not)
  - remembered sets hidden from clients
client adequacy
- spec adequacy shown by verifying clients (CertiRocq int-to-Peano, packed bytestrings)
- bytestring client exposed a spec weakness, strengthening it exposed a real C bug
  - missing `No_scan` branch in `forward`, never hit by tests (no test combined depth>0 and no-scan)
  - "Program verification did exactly the job that it should have."
proof structure
- graph in separation logic via CertiGraph, big-star embedding, focus with magic wand
  - separation is "the antithesis of sharing", graph library needed
- functional model first: inductive relation per loop, C funspec says output equals relation result
  - graph theorem proved separately, bridged by lemmas
- allocation: `available` check, else save roots in top frame, collect, restore, re-prove headroom
- Cheney forwarding with `scan`/`next` queue, forwarding pointer in field 0 of old header
  - invariant `forward_condition`: enough space, valid generations, marked vertices forwarded, no dangling dst
- write barrier records source field of pointer stores
  - invariant: every old-to-young edge into generation i is in remembered-set component k, from ≤ k ≤ i
  - 4-line `forward_remset` took 452 lines of proof; verification found a bug (q used instead of p) missed by testing
- interior vs exterior pointers split, proof of `forward` doubly long
- generation loop by induction, isomorphisms composed by transitivity
trusted / limits
- axioms for tagged values and cross-block pointer comparisons
- address-space bound preventing MAX_SPACES "not actually proved"
- oversize allocation aborts, safe points and concurrency are future work
- many Rocq proofs not shown in paper, only file names
Verus analog (inference)
- logical heap as `spec` graph, `requires`/`ensures` on API, remembered set in ghost state, `while` invariants for loops
- VST `SEP`, wands, CertiGraph do not carry over, need own ownership predicates
