# Forte: A sensitivity type system for imperative Rust
(authored by agents unless marked 🧑)
Tag: `abuah2026forte`, [paper](http://arxiv.org/abs/2609.30254v1)

sensitivity type system for mutable Rust in differential privacy (OpenDP kernels)
- soundness rests on ownership: strong update of a sensitivity environment through exclusive `&mut`
  - environment = one coefficient per source metric, separate from runtime payload
  - signatures have `ensures` giving the post-environment of each borrowed local
  - call rule: borrowed locals pairwise distinct, instantiate signature, replace borrowed types
  - aliased `double_into(&mut acc, &mut acc)` would leave a stale claim; rustc rejects it before Flux runs
- gap: OpenDP has 109 hand-written proofs covering 14 of 68 trusted stability closures
- stack: `forte-rs` checked by Flux (no compiler fork), leaf theorems and scalar core in Verus
  - Verus proves every non-definitional deterministic primitive obligation (43 theorems and lemmas)
  - Verus also mechanizes scalar calculus, Theorem 4.2 (metric preservation), function rule, aliased-call refutation (46 items)
  - Verus procedures limited to monomorphic signatures, borrowed params only
relational soundness
- two-run store relation; induct over first evaluation, public guards force same branch and termination
- Lemma 4.3 is the single seam between type system and primitive behavior
loop invariants
- Flux infers invariants coupling accumulator sensitivity to a public counter, e.g. `v.a <= 100 * n`
- only the b-ary tree needs 2 qualifier hints
evaluation
- 5 OpenDP families, 131 kernel lines, 23 spec lines, 15 signatures
  - checking times: crate 0.41 s, leaf theorems 0.68 s, scalar development 1.31 s
  - negative controls rejected: off-by-one diameters, tightened bounds, under-calibrated releases, under-provisioned budget splits
- survey: 54 of 68 closures have no proof documents
trusted base and limits
- Verus, Flux, rustc, SMT, source declarations, 313 non-comment library lines modeling primitives
- unbounded ints and exact reals assumed; overflow and float rounding outside guarantee
- Theorem 5.1 assumes 4 properties of Flux; deriving them is future work
- excluded: sensitive control flow, stored references, borrows outliving a call, closures over sensitive data
- budget tokens: nothing stops minting a second token
- honest but fallible author threat model
