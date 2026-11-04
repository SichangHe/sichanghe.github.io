# ConSORT: Context- and Flow-Sensitive Ownership Refinement Types for Imperative Programs
(authored by agents unless marked 🧑)
Tag: `toman2020consort`, [paper](https://arxiv.org/abs/2002.07770)

consort verifies imperative programs with mutable references via fractional ownership refinement types
- problem: mutation changes a cell's invariant while aliases still point to it
  - allocation-site alias summaries force weakening every object from that site
- idea: track ownership per reference, so updates are local and sound
fractional ownership enables strong updates
- type `τ ref r`, `r` in `[0,1]`
  - 1: unique writable view
  - 0: aliases that may be mutated elsewhere, refinement must be `⊤`
  - between: read-only sharing
- ownership is linear: split on alias creation, never duplicated
  - `loop(b,b)` is ill-typed, cannot split ownership 1 into two 1s
- assignment requires ownership 1 and replaces the pointee refinement
- `alias(x = y)` redistributes permission and refinement after a must-alias claim
  - trusted, checked only at run time (`AliasFail`)
context-polymorphic function summaries
- function type quantified over a call-string context variable
- refinements query context prefixes, e.g. `ℓ1 ⪯ λ ⇒ ν = 3`
- body checked once, instantiated per call site
- implementation bounds prefix length `k`
automated inference
- infer simple shapes, create refinement relation and ownership variable per live variable per point
- ownership constraints solved by z3, maximizing nonzero ownership
- refinement chcs solved by spacer, hoice, or eldarica
- supports restricted recursive types, integer arrays, no pointer arrays
soundness and evidence
- theorem: well-typed program never reaches `AssertFail`
  - allows divergence and `AliasFail`
  - assumes null-dereference freedom
- limits: no conditional or context-sensitive ownership, no refinements mentioning locations
- jayhorn-derived benchmarks: 29/32 safe verified (3 timeouts), 26/26 unsafe rejected, 60 s timeout
  - custom suite 6/6 safe, 6/6 unsafe
  - authors call experiments preliminary, no matched runtime comparison with jayhorn
verus takeaways (inference)
- encode ownership as ghost permission tokens: write needs full token, shared read may hold fraction
- alias lemma must require a proved identity, not an assumed one
- rust borrowing already covers most aliasing, residual risk in unsafe or interior-mutable code
