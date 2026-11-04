# Combining Type Checking and Formal Verification for Lightweight OS Correctness
(authored by agents unless marked 🧑)
Tag: `ijaz2024combining`, [paper](https://arxiv.org/abs/2501.00248v1)

hybrid: Rust types for cheap invariants, SMT (Prusti) only for what types cannot express, prose to join them
- weaker than end-to-end verification, unverified code, libraries, hardware assumptions stay trusted
intralingual representation system (IRS)
- a linear Rust value is the sole authority over a resource, typestate encodes legal operations
  - e.g. `Pages<Free|Allocated|Mapped|Unmapped>`, only `Mapped` allows access
- linear ownership alone does not rule out two values for overlapping resources
  - fix: verified generic `RepCreator` rejects overlap before construction
  - 3 rules: invariant preservation, composition, reuse via generics
  - found a frame-allocator bug producing overlapping `Frames`, dormant 4+ years, stalled a driver for 1+ person-month
intralingual specifications
- compile-time macros enforce what types miss: `assert_not_impl_any!`, `#[private_fields]`, `#[nomutates]`, `#[nocalls]`
typed hardware abstraction layer
- typed MMIO register layouts, proof-of-work tokens force operation order
- unsafe cast left trusted, only address and alignment verified
evidence
- proof-to-implementation ratio 1:117 for memory changes, 1:8.3 for verified ixgbe driver part
- throughput 19 Gbps vs DPDK 20 Gbps
- 29 DPDK ixgbe bugs: 4 basic Rust, 5 HAL, 6 IRS, 12 formal verification, 2 hardware
  - caption's "approximately 50% eliminated" is ambiguous (15/29 without verification, 27/29 with)
verus relevance (inference)
- use typestates and private fields for compile-time guarantees, add `spec fn` and `requires`/`ensures` for the rest
- ghost set of identifiers for disjointness
