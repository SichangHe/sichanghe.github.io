# A Hybrid Approach to Semi-automated Rust Verification
(authored by agents unless marked 🧑)
Tag: `ayoun2025hybrid`, [paper](https://doi.org/10.1145/3729289)

split end-to-end rust proofs by safety boundary
- creusot proves safe code, gillian-rust proves unsafe code with separation logic
  - proof-of-concept, not a complete rust verifier
- creusot sees unsafe types as opaque via `ShallowModel`
  - gain: smt encoding, high automation, no separation logic for safe code
- internally unsafe modules (IUMs) get ownership predicates + functional contracts
- example: merge sort proved on abstract seq, doubly-linked-list ops proved in gillian-rust
unsafe rust via ownership predicates
- `Ownable` trait maps concrete type to pure `ReprTy`
  - `own(self, repr)` ties repr to a separation-logic heap predicate
  - `LinkedList<T>`: `ReprTy = Seq<T::ReprTy>`, `dllSeg(...) * len == repr.len()`
- `#[show_safety]` expands to: own(args) in pre, own(result) in post
  - proves type safety (TS) from local ownership invariants
- symbolic execution unfolds/folds predicates around pointer reads/writes
automated mutable borrows
- encode RustBelt lifetime tokens + full borrows as guarded predicates
  - unfold guard on first access, mutate, fold, `Mut-Update`, `MutRef-Resolve`
  - user only writes `mutref_auto_resolve!(self)` after unsafe helper call
- prophecy-based functional correctness
  - pearlite `*self` = entry value, `^self` = value at borrow expiry
  - e.g. push_front: `(^self)@ == (*self)@.prepend(e)`
one contract language for both engines
- shared `hybrid::requires`/`hybrid::ensures` compile to creusot and gilsonite specs
  - generated code often identical to handwritten gilsonite, no verification-time impact
evidence
- merge sort 6.3 s wall, gnome sort 2.6 s, right pad 0.6 s
- LinkedList TS 0.24 s, FC 0.45 s; Vec TS 1.08 s, FC 2.57 s; MiniVec FC 1.35 s
- claim: first TS and FC verification of unsafe std-lib code (subsets, minor source changes)
- 2019 macbook pro, single-threaded
trust and gaps
- trusted: creusot, gillian-rust, why3, rustbelt/rusthornbelt semantics, extern_spec contracts
  - extern_spec contracts assumed equivalent to ones gillian-rust proves
- soundness: meta-theory has small gaps, causal-loop obligation not formalised
- unsupported: closures, shared refs, fractional permissions, >1 lifetime, concurrency, ZST, allocators
relation to verus
- paper says verus lacks traditional raw pointers, tracks `PointsTo<T>` ghost objects
  - conflicts with verus papers (OOPSLA 2023, SOSP 2024) saying verus supports raw pointers via permissioned primitives
  - reading "traditional" as raw `*mut T` without ghost permissions is an inference
