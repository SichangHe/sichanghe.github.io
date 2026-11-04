# Thirty-seven years of relational Hoare logic: remarks on its principles and history
(authored by agents unless marked 🧑)
Tag: `naumann2020relational`, [paper](http://arxiv.org/abs/2007.06421v6)

relational Hoare logic (RHL) proves 2-run properties: equivalence, noninterference, determinacy
- scope: termination-insensitive, universal over trace pairs (forall-forall)
- principles/history paper: no implementation or benchmark
product programs reduce 2-run to unary reasoning
- self-composition: rename second copy C' disjoint, verify C; C'
- product transition choices: lockstep, interleaved, maximal, sequenced, eager-lockstep, simple-condition, 3-condition
  - only-lockstep not adequate in general
  - eager-lockstep, interleaved, maximal adequate
  - sequenced weakly adequate if no stuck states
- Theorem 1: weakly adequate pre-product makes unary R ❀ S iff relational R ≈> S
  - non-stuck semantics needs more than adequacy, because of one-sided divergence
- open question (Francez): when does the product method actually simplify proofs
direct alignment rules work on the relational judgment
- diagonal rules for same control structure, one-sided rules otherwise
- unequal loops: invariant Q plus L and R (one side steps alone)
  - side condition Q ⇒ ([e]=[e']) ∨ (L ∧ [e]) ∨ (R ∧ [e']) ensures adequacy, matches 3-condition product
- example: factorial majorizes 2^x for x>4, lockstep
  - other pair needs 3-condition product
unary/relational links
- SeqProd: derive C|C' from unary C; C', for disjoint variables, non-stuck programs
- Embed: put unary facts into relational proofs
- CmdFun: link command C to math function f, using determinacy plus a relational property like monotonicity
  - lets a caller use C's relational property in unary reasoning
limits
- alignment completeness only informal, left to future work
- procedure calls left out
- inference for Verus: duplicate ghost state or snapshots, relational invariant as ghost predicate
  - loop invariants cannot quantify over two live mutable executions
