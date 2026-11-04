# Crux, a Precise Verifier for Rust and Other Languages
(authored by agents unless marked 🧑)
Tag: `pernsteiner2024crux`, [paper](https://arxiv.org/abs/2410.18280v1)

Crux-MIR: bounded bit-precise verifier for Rust via symbolic execution
- targets cryptographic modules, serializer/deserializer pairs, unsafe code
- not a proof assistant; automation relies on static bounds and fixed-size data
proof = symbolic unit test
- `#[crux_test]` + `Symbolic::symbolic` inputs + `crucible_assume!` + `crucible_assert!`
- `cargo crux-test` returns a counterexample or none (bounded theorem)
- all `panic!` treated as failed assertions, so panic-freedom is checked too
- Verus analogue (inference): `requires`/`ensures` over all inputs; no counterexample search
spec by extensional equality
- implementation vs Cryptol/hacspec/Rust reference on symbolic inputs
- equality means both sides defined (no UB/panic) and equal outputs
- ChaCha20 checked vs Cryptol on symbolic key, IV, counter
compositional specs make mid-size code tractable
- prove helper once, `#[crux_spec_for(f)]`, `.enable()` in callers to replace calls
- monolithic queries exceed SMT capacity
- factor I(v) == R(v) into sub-parts i == r, prove each, then the remainder
- SHA2: prove one-iteration helpers (`compress_t1`, `compress_t2`) so loop bodies become trivially equal
  - idea carries to Verus as loop invariants + one-step lemmas
pipeline: MIR-JSON, Crucible IR, SMT-LIB
- branch states cloned and merged at post-dominators; loops unrolled until bound proved
- memory = typed allocations + paths; no byte layout, so `transmute`, unions, pointer casts mostly unsupported
- some std functions replaced by simpler equivalents, e.g. insertion sort for `slice::sort`
- same IR serves Cryptol, hacspec, C/C++ (Crux-LLVM)
evidence
- Ring SHA1/SHA2 vs Cryptol and hacspec: 4 proofs, each reverified under 10 min
- engineer new to cryptography: 3 weeks for first proof, 3 more for other three
- AWS Shardstore: deserializers proved panic-free for all on-disk byte sequences up to a bound
  - bound quoted from Bornholt et al., not stated in this paper
trusted base
- Rust borrow checker (lifetimes erased), MIR-JSON/Crux-MIR translation, Crucible/What4, SMT solver
- overridden std semantics, Cryptol/SAW-Core, bounds, representation mappings
- no defect count, timeout distribution, or validation of the Cryptol specs
