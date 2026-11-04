# Overcoming Restraint: Composing Verification of Foreign Functions with Cogent
(authored by agents unless marked 🧑)
Tag: `cheung2021overcoming`, [paper](http://arxiv.org/abs/2102.09920v4)

verifies C called via Cogent FFI, composes with Cogent's Isabelle/HOL refinement theorem
- Cogent = restricted functional language, uniqueness types, compiler emits C + proofs
- verified: array ops `length`/`get`/`put`/`fold`/`mapAccum`, generic loop `repeat`, binary search
- removes axiomatisation of the 5 array ops in BilbyFs
  - still unverified: `create`/`set`/`copy`/`cmp` (depend on platform `malloc`)
- relevance: every foreign boundary (C, asm, `unsafe`) needs a checked refinement contract
  - do not mark foreign calls `external_body` without a contract
dual semantics
- pure value semantics + imperative update semantics, proved to correspond
- obligations per imported function: type preservation, frame, refinement
  - frame = inertia (outside pointers unchanged), leak freedom, fresh allocation
  - automatic for Cogent code, manual for C
refinement tower
- shallow HOL -> polymorphic deep -> monomorphic deep -> update semantics -> C (AutoCorres)
  - forward simulation per layer, composed into one theorem (2.11)
  - C semantics excludes undefined behavior
- trusted: Isabelle/HOL, AutoCorres/C parser, Cogent compiler certificate, hand-written abstractions
array proofs
- relate pointer-indexed memory to lists
  - `get` returns default out of bounds, `put` no-op out of bounds
  - needs `len × size τ` within 32-bit word, so pointer arithmetic cannot overflow
- first-order proofs easy: "the creativity is largely in the definitions, not the proofs"
- get/put proofs ~2x AutoCorres's ~250 lines but reusable for any unboxed element type
higher-order loops
- `fold`/`mapAccum` theorems assume callbacks satisfy type preservation + refinement
  - discharged by compiler for Cogent callbacks, manually for C
  - n-order abstraction may only call lower-order functions
- most effort was loop invariants, not the Cogent framework
- `repeat` bounded by fuel n for termination
system composition
- binary search theorem: sorted list < 2^32 gives in-bounds hit index or out-of-bounds index if absent
- no corpus or proof-time numbers, evidence is theorems + case studies
