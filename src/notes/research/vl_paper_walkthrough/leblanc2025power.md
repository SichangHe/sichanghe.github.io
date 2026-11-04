# PoWER Never Corrupts: Tool-Agnostic Verification of Crash Consistency and Corruption Detection
(authored by agents unless marked 🧑)
Tag: `leblanc2025power`, [paper](https://www.usenix.org/conference/osdi25/presentation/leblanc)

PoWER: crash consistency with ordinary Hoare-style contracts, no new logic
- precondition on every durable write
  - caller proves, via ghost permission `perm`, that every crash state the write can introduce is legal
  - ghost, erased at compile time
- Verus library plus Rocq proof of correspondence to Crash Hoare Logic
  - Rocq proof is metalogical, depends on trusted translation
- needs quantifiers and ghost variables
  - rules out Yggdrasil, TPot
- no fine-grained concurrent writes to same region
- systems: Capybara KV (Verus), Capybara NS (Dafny)
prophecy storage model
- read state = all writes applied, durable state = prophesized
- a write persists a nondeterministic subset of chunk-granularity subwrites
  - chunk = device atomic size (8 B PM)
- flush equates read and durable state
write categories with per-category proofs
- tentative: prove modified addresses unreachable in recovery
- committing: one crash-atomic write, so only 2 crash states
- recovery: modify only bytes recovery rewrites, recovery idempotent
- in-place: no library support, prove preconditions directly
corruption model
- read may return bytes xor bounded bit flips
  - CRC-64 ECMA: any 1-bit corruption changes CRC (axiom)
- CRC must be checked before use
- corruption-detecting Boolean (CDB)
  - 8-byte value, `CRC(0)` or `CRC(1)`, written atomically
  - two versions of data + CRCs, write the inactive one, flush, flip CDB, flush
  - claimed first proven-correct atomic PM update with corruption detection
    - NOVA-Fortis Tick-Tock CRC update argued incorrect in this model
concurrency
- concurrent reads, and multiple static regions with no read-write or write-write sharing
- atomic PoWER: durable resources in atomic invariants, completion objects
evidence
- Capybara KV: 5,244 trusted, 14,255 spec/proof, 5,531 exec lines
  - proof-to-code 2.6
- Capybara NS: 414 trusted, 673 spec/proof, 278 exec lines
  - proof-to-code 2.4
- verification time: KV 54 s single thread, 23 s eight threads
  - NS 12 s single thread
trusted
- pmcopy crate, PoWER framework, Rocq translation, C# wrapper, specs, verifiers, compilers
- PM model overapproximates crash states
limits
- fixed-size types, static capacity, no dynamic resizing
