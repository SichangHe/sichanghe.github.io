# Verifying Device Drivers with Pancake
(authored by agents unless marked 🧑)
Tag: `zhao2025verifying`, [paper](https://arxiv.org/abs/2501.08249)

goal: verified 1 Gb/s Ethernet driver for LionsOS, written in Pancake, compiled by verified CakeML-derived compiler
- annotated Pancake transpiled to Viper IL, verified by Silicon
- sizes: 411-line driver, 558 lines annotations, 391-line device model, 298-line OS model
- effort: ~3 person-months; full verification ~20 min on laptop
  - device model 10 min, each driver function ~1 min
- end-to-end gap: transpiler unverified, compiler theorem covers only main entry, no unified theorem
  - "incorrect source + verified compiler = incorrect machine code"
driver design
- single-threaded, single-purpose, no concurrency primitives, shape removes concurrency bugs
- Pancake: no malloc, no static types, simple formal semantics
  - motivation: Rust has no authoritative formal semantics
transpilation to Viper
- machine words as Viper integers, reject overflow, so no modular arithmetic in nonlinear theories
- rewrite bit ops (x&255 -> x%256), isolate device bit ops behind methods
- memory as word array with iterated separating conjunction permissions
- risk: bad translation could prove a false Pancake assertion
hardware and OS modeling
- map register ranges to Viper methods with requires/ensures
  - device invariant valid_device in both pre and post
  - nondeterministic loads constrained by ensures, e.g. bounded32(retval)
  - verifier rejects accesses not covered by a declared interface
- OS neighbors modeled as nondeterministic SPSC queue and semaphore contracts
  - driver checked against all allowed neighbor states
data integrity and isolation
- assert packet address and length preserved between OS metadata and hardware descriptors
- RX/TX regions separated by Viper permissions
performance: ~10% more driver CPU than C driver, same throughput, latency within variance
- one board, one driver; no general parity claim
verus adaptation (inference)
- device wrappers with valid_device ghost predicate, queue protocol as ghost state machine
- Verus ownership differs from Pancake, so raw device access needs an explicit trusted model
