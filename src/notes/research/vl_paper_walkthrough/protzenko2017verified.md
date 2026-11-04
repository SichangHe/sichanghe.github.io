# Verified Low-Level Programming Embedded in F*
(authored by agents unless marked 🧑)
Tag: `protzenko2017verified`, [paper](https://doi.org/10.48550/arxiv.1703.00053)

low* = small sequential C-like subset shallowly embedded in F*, compiled to C by KreMLin
- design choice: write low-level code in a restricted language + prove translation, not verify existing C
- computational code: first order, monomorphic, explicit allocation, no recursive datatypes
  - specs and proofs are arbitrary higher-order dependent F*, erased at extraction
  - partial evaluation specializes high-level code into the subset
- gives memory safety, functional correctness, side-channel resistance
structured region memory model
- F* state monad over HyperStack.mem: stack and heap regions, liveness as membership
- alloc returns fresh live ref; free and deref require liveness; push_frame/pop_frame/salloc for stack
- Stack effect: stack tip restored and memory domain unchanged, which rules out leaks
- limits
  - allocation can fail at runtime, 32-bit indices
  - heap regions are logical only, no-op in KreMLin
- verus form (inference): ghost map of owned buffers + liveness predicates; library discipline, no region-indexed refs
refined buffers, structs, interior pointers
- buffer = ref to sequence + max length + index + sub-length
  - length refinement compiles to C array decl; sub keeps an includes relation to parent
  - index requires liveness and bounds
- struct pointers carry base ref + field path; write states exact field update (modifies_1)
- chacha20 spec: output/key/nonce live and disjoint, only output changes, output = prefix of pure Spec.chacha20
- verus form (inference): struct view + spec fn to Seq; C pointer decay stays behind trusted interface
functional correctness against pure specs
- ghost eval maps 5-limb buffer to integer; normalize preserves value mod 2^130−5
  - poly1305_mac ensures tag = pure Spec.mac_1305
- manual lemmas at bit-mask boundaries
- proved for chacha20, salsa20, poly1305, curve25519
  - rest of HACL* only where a simple math spec exists
- verus form (inference): spec fn model + lemma fns connecting machine arithmetic to model
side-channel resistance by type abstraction
- secret abstract type exposes only constant-time ops (eq_mask); math value only in ghost code
- theorem for λow*: runs with different secrets give identical traces
- trace preserved through layout-changing passes by reinterpreting concrete pointers as variable/field identities
  - covers λow* to Clight only; later compiler stages need translation validation
- abstract idealization flags verify real and ideal AEAD branches, erased at extraction
  - cryptographic reductions proved on paper, not in F*
trusted base
- KreMLin (unverified OCaml), F* typechecker, Z3, metatheory proofs, C compiler
- emf* to λow* transcription not backed by a specific proof
- small unverified C adapter between miTLS and extracted AEAD
- verified assembly compilation left as future work
