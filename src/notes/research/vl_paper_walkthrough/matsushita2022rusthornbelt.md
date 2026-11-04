# RustHornBelt: a semantic foundation for functional verification of Rust programs with unsafe code
(authored by agents unless marked 🧑)
Tag: `matsushita2022rusthornbelt`, [paper](https://doi.org/10.1145/3519939.3523704)

machine-checked foundation for RustHorn-style verification when safe APIs hide unsafe code
- extends RustBelt semantic typing from safety to functional correctness
- soundness only, no completeness (lost for interior-mutability invariants)
- not an automated verifier
- Coq ~19k lines, two implementors, ~6 months
prophecy specs for mutable borrows
- mutable borrow = (current, prophesied final)
  - write updates current, drop resolves final = current, lifetime end returns it to lender
- subdivision (index_mut): old prophecy partially resolved to a value mentioning the new one, v.2 = v.1{i := a'}
- same extension covers nested borrows
parametric prophecies
- Jung et al. prophecies can't resolve to values mentioning other prophecies
- fix: observations in a reader (clairvoyant) monad, valid under all prophecy assignments
  - resolution consumes fractional tokens of dependencies, ruling out paradoxes
semantic type-spec judgments
- developer picks a first-order spec Φ per API, model emits predicate-transformer obligations, proved in Iris/Coq
- covers Vec, SmallVec, Cell, Mutex, JoinHandle, MaybeUninit
  - Rc, Arc, RefCell, RwLock open (step-indexing issue)
- client verifiers such as Creusot reuse the specs
defunctionalized invariants for SMT
- higher-order invariant, such as cell holds even number, becomes a ghost type with `inv(&self, a)` predicate
  - Cell<T,I> carries the witness, get/set specs trusted
- 7 Creusot benchmarks, 407 lines, 1–28 VCs, 0.03–0.23 s average per VC
trust gaps
- Creusot is in the TCB, formal gap between Creusot/WhyML and λRust
inference for Verus
- relate pre-borrow state to final state via requires/ensures with old()
  - no prophecy primitive, prove API postconditions directly
