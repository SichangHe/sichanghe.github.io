# CertiKOS: An extensible architecture for building certified concurrent OS kernels
(authored by agents unless marked 🧑)
Tag: `gu2016certikos`, [paper](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/gu)

compositional proof of concurrent OS kernel mC2 (6,500 lines C + x86 asm)
- contextual refinement: safe on spec under all configs => impl safe, behaviors permitted by spec
- Coq, every refinement step machine-checked (CompCert-style simulation)
- < 2 person-years for concurrency
- sizes
  - 943 lines hardware spec, 450 abstract syscalls, 5,249 function specs
  - ~40,000 auxiliary lines, 50,000 Coq proof lines for new concurrency features
certified abstraction layer (underlay, module, overlay)
- overlay = deep spec capturing all observable behavior
- "no need to ever look at M again" once certified
- Verus (inference): ghost state machine + requires/ensures; layer calculus must be encoded
- limits
  - x86 subset only, assembler unverified, bootloader/ELF loader unverified
  - proofs over sequential consistency, not x86 TSO
environment contexts
- machine parameterized by active set A and environment ε for outside events
- semantics = all runs over valid ε
- disjoint-set composition (Lemma 3), singleton CPU acts sequential
- Verus (inference): ε as response function over ghost event log, untested
local-copy machine for data-race freedom
- pull copies global to local and validates, push returns it
- invalid access goes wrong, safe for all schedulers => race-free
- logical only, no runtime overhead
- Verus (inference): ghost permission held across critical section
ticket lock
- fairness: other threads ≤ m events between one thread's events, holder releases within k steps
- ≤ n×m×k iterations to acquire
- real bug found: while(now < t) fails on 2^32 ticket wraparound
  - fixed to now != t
- MCS lock release needs progress proof (waits for successor to link)
layered objects via event-log replay
- physical allocator with quotas against memory-exhaustion DoS
- page-map invariants, kernel-only permissions, private memory isolation
- shared queues, scheduler with per-CPU ready and shared pending/sleeping queues
- FIFO bounded buffer: textbook bug fixed
  - waiter's CV removed only after its work
  - remover removes itself and wakes the next in rmvQ
