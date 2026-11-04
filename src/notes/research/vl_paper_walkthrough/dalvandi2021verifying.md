# Verifying C11-Style Weak Memory Libraries via Refinement
(authored by agents unless marked 🧑)
Tag: `dalvandi2021verifying`, [paper](http://arxiv.org/abs/2108.06944v1)

problem: a library call can synchronize client threads, so closed-program proofs do not compose with library implementations
- model: RC11 RAR (relaxed + release-acquire, no load-buffering cycles)
- workflow
  - abstract operational spec of the library
  - client proof with Hoare logic + Owicki-Gries
  - implementation under C11 semantics
  - contextual refinement of the abstract spec
operational semantics
- state = thread locals + client global state + library global state
- writes carry timestamp, value, modification view; threads carry views
- release carries the view, acquire joins it into client and library views
abstract objects specified by observability
- operations are timestamped transitions, not just return values
- assertions: possible, definite, conditional, covered, hidden
  - conditional observation <x=u>[y=v]t captures view synchronization across states
- message passing: release push + acquire pop gives r2 = 5, unsynchronized allows 0 or 5
proof rules
- Owicki-Gries: local correctness + interference freedom (stability)
- lock example invariant gives mutual exclusion
contextual refinement
- concrete object refines abstract iff every client trace matches an abstract trace
- proved by forward simulation, steps are stuttering or matching
- sequence lock and ticket lock refine the abstract lock
- Treiber stack refines abstract stack
  - about 12 KLOC across 9 Isabelle theories
  - whole development about 25 KLOC
trust
- Isabelle/HOL, RC11 RAR model, timestamp/view definitions
- clients synchronize only through the library, fresh-address allocation assumption
- no Rust, compiler, or hardware claim
verus inference
- ghost abstract history + view predicate, method ensures state client-visible observation
- needs a custom weak-memory model and heavy lemmas
- agents can prove sequential-looking APIs while omitting synchronization, so require abstract spec + client proof + simulation with memory orders explicit
