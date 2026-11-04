# Formal Specification and Verification of JDK’s Identity Hash Map Implementation
(authored by agents unless marked 🧑)
Tag: `deboer2023formal`, [paper](https://doi.org/10.1145/3594729)

result (Java/JML/KeY, not Verus)
- specified JDK IdentityHashMap in JML, proved 15 methods in KeY
  - 1,449,991 KeY steps, ~5 person-months (~800h), mostly writing specs
  - put + resize ≈ 1.2M steps
  - remove only bounded-proved (JJBMC, 4 mappings), not closed unbounded
- found 3 real bugs: deserialization invariant violation, JDK7u80 failure-atomicity, int-overflow capacity bug (~45% avg slowdown)
contract + class invariant specs
- contracts: requires/ensures/frame, loop invariant + variant
- class invariants tie array representation to map semantics
  - bounds, key uniqueness, size cardinality, even length, ≥1 empty slot, no-gap linear probing
- risk: wrong invariant can verify while describing wrong behavior
  - need independently reviewed abstract map contract
- Verus mapping (inference): spec fn view over Seq/Map, `invariant`, `decreases`; cardinality needs count lemma
bounded checking before unbounded proof
- JJBMC: unwind loops, inline calls to bound k, return counterexample or bounded proof
- loop: annotate top-level method, run, fix spec from counterexample, specify next callee, raise k
  - found missing `maskNull` in `get` contract in ~18s
- bounded runs used a modified program (constant int hashes, identity tests as hash compares)
  - no equivalence proof to original
- generated JML unit tests unusable, hand-translated quantifiers to loops + reflection
  - ~0.5 person-month, caught spec errors
hard proof targets
- resize: outer-loop invariant chain, prove in dependency order
  - copied cardinality, processed-entry correspondence, provenance, untouched old entries, uniqueness, empty slot, no-gap
- deletion: temporarily weaken no-gap invariant at removed slot, `closeDeletion` restores it
- cluster repair and quantified representation invariants are high-risk for agent-written verified code
proof-branching reductions
- merge branches with identical heap effect
- unroll outer loop that runs ≤2 times, avoids complex invariant
- chaining vs probing: no conclusive winner
  - NN totals 217,860 (chaining) vs 480,127 (probing) steps
  - easier individual methods ≠ easier strategy
