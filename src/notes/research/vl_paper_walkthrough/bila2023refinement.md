# Refinement Proofs in Rust Using Ghost Locks
(authored by agents unless marked 🧑)
Tag: `bila2023refinement`, [paper](http://arxiv.org/abs/2311.14452v1)

bottom-up refinement for existing Rust code, in Prusti
- embed an abstract transition system as erased ghost state beside the implementation
  - each concrete I/O step must match one abstract transition
- covers multithreaded and distributed systems, safety and liveness
- no required implementation structure
ghost lock
- proof-only, never synchronizes real threads
- acquire gives a view of model state, release names the action (or `release_stutter`)
  - critical section = one atomic model step, must be linearizable (implementation's duty)
  - model state havocked on re-acquire: only stable invariants survive
- cases: Memcached, producer/consumer queue, Paxos, lock-free hash set
  - Memcached v1: 117 impl, 225 model, 286 spec lines, 334.7 s
guards
- affine per-node or environment tokens
  - `guard_needed(action, guard)` rules out interfering transitions
  - preserve local knowledge across environment steps
- verus analog (inference): linear ghost token required by action lemmas
liveness
- deeply embedded LTL (always, eventually, quantifiers)
- obligations: linear resources with well-founded measure, must be discharged
- strong fairness assumed (repeated send implies delivery), attached to network I/O specs
  - Memcached liveness also assumes eventual client commands, ignores error handling
- verus has no built-in infinite-trace reasoning; needs explicit ghost obligation + `decreases`
verified interior mutability
- `VerifiedCell<T>` over `UnsafeCell`: non-atomic access safe given happens-before between operation ids
  - SeqCst queue: 247 proof lines, 392.8 s
  - acquire-release: 428 proof lines, 654.5 s
trusted
- abstract model matches intent, fairness holds in deployment, scheduler and environment correct
- memory-ordering axioms are part of the trusted model
