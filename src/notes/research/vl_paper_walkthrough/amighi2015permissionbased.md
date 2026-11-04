# Permission-Based Separation Logic for Multithreaded Java Programs
(authored by agents unless marked 🧑)
Tag: `amighi2015permissionbased`, [paper](https://doi.org/10.2168/LMCS-11(1:2)2015)

sound but incomplete concurrent separation logic for Java-like language
- covers heap-allocated threads, repeated joins, reentrant monitors, wait-notify
- data race freedom (Theorem 3.1) follows from permission accounting
fractional permissions as access tickets
- x.f ↦ v grants the ticket; read needs any permission, write needs full permission 1
- permissions are fractions 1/2^n; per-field sum must stay ≤ 1
- split/merge axiom shares reads, merge to 1 before writing
- verus inference: tracked ghost permissions, write consumes exclusive authority, duplicating a token is a proof error
frame rule and abstract predicates
- {F} c {F'} ⇒ {F*G} c {F'*G}, local reasoning
- abstract predicates hide representation; open/close only in the defining class
- verus inference: spec predicates + lemmas in trusted modules; rust references need explicit alias arguments
fork/join tickets
- allocating a Thread issues Join(o,1)
- fork requires preFork, run ensures postJoin<1>, join requires Join(this,p) and ensures postJoin<p>
- group predicate splits/merges multiple joiners
- verus inference: join token enabled only after child terminates; repeated joins need a ghost protocol
reentrant monitor invariants
- initial entry transfers inv to thread; final exit re-establishes it
- reentry does not transfer; Lockset(π) multiset distinguishes the two
- (Lock) needs lock not in lockset, which needs alias reasoning
  - lock-coupling solved with ownership-parameterized types Node<owner>
limits and trust
- proofs are sketches deferring to Hurlin's thesis
- boolean validity left to an external prover
- model language is not real Java: no arrays, constructors, casts
- mergesort proves memory safety and length preservation, not sortedness
- examples show expressiveness, not performance
