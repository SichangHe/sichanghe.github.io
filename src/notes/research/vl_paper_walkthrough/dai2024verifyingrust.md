# Verifying Rust Implementation of Page Tables in a Software Enclave Hypervisor
(authored by agents unless marked 🧑)
Tag: `dai2024verifyingrust`, [paper](https://doi.org/10.1145/3620665.3640398)

MIRVerif: coq framework proving spatial isolation of HyperEnclave memory subsystem (early-2022 version)
- goal: enclave memory not readable/writable by primary OS or other enclaves, except marshalling buffer
- scale: 2,130 lines Rust, 49 of 77 Memory functions verified, 15 layers
  - 3 person-years: 20% framework, 30% invariants+noninterference, 10% page-table refinement, 40% code proofs
  - ~15,100 proof lines + ~4,500 spec/framework lines; 1.25 proof lines per MIR line
- trusted: unverified code (e.g. hypercall handling), rustc, MIR semantics validated by doc inspection
  - 105 unsafe blocks checked manually
layered refinement
- pure high-level spec per interface; functions in call-order layers
- each layer proved against lower-layer specs only, so verification is piecemeal
  - unverified functions stay in the TCB
- optional low spec: code to low spec to high spec, composed by transitivity
- verus transfer (inference): contracts expose only abstract state, prove representation-refinement lemmas per layer
lightweight MIR semantics
- deep-embed MIR in coq (28 expr types, 11 statements/terminators), small-step like CompCert
- MIR already type-checked, traits resolved, refs turned into pointers
- `mirlightgen` (modified rustc) dumps MIR as coq AST; split per function and layer semi-manually
- verus differs: verifies source via own lowering, compiler lowering is trusted
object-view memory
- non-overlapping objects addressed by path (id + projections), structs/enums as values
  - valid only with no aliasing or cycles, true for Rust-allocated memory here
- address-taken locals live in memory, temporaries in an environment
  - only 12 of 77 functions involve locals
  - soundness of this lifting is left unproved
pointer classes preserve module boundaries
- normal pointers passed downward by owner
- trusted pointers from bottom layer with getter/setter specs over abstract memory
- `RData` pointers: id + indices, no read/write, only passable back to owning layer
two-level page-table specs
- low spec: flat integer array of frame memory
- high spec: tree of nested `PTE` records, related by recursive `Rpte`
- ruled out an old shallow-copy init bug that would be unprovable
  - inference: paper does not say proof found the bug
invariants and noninterference
- 4 page-table invariants (106 coq lines): distinct enclave ELRANGE mappings, sharing only in marshalling buffer, EPCM coverage, ELRANGE/EPC consistency
- observation function per principal; prove indistinguishability preserved, rely-guarantee for combining
  - overall argument left informal, only lemmas proved in coq
  - 6,600 proof lines
- marshalling buffer modeled by data oracle: stores ignored, reads from arbitrary stream
- only `init` and `add_page` hypercalls modeled
