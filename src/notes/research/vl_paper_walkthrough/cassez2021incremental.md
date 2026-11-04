# Verification of the Incremental Merkle Tree Algorithm with Dafny
(authored by agents unless marked 🧑)
Tag: `cassez2021incremental`, [paper](http://arxiv.org/abs/2105.06009v3)

machine-checked Dafny proof of Ethereum 2.0 deposit contract (DSC) incremental Merkle tree
- design: prove a functional recursive algorithm, then use it as the invariant of the imperative implementation
- effort: 3,538 Dafny lines, 1,030 doc lines, 12 person-weeks
  - almost 90% of lines are non-executable proofs and proof definitions
- proves functional correctness, termination, memory safety, representation equivalence
- trust base: Dafny VC generator + Z3; hash is uninterpreted, collision resistance out of scope
path-based root computation
- fold a sibling path upward with a generic hash from a seed leaf
  - last path bit 0 hashes `(seed,right)`, bit 1 hashes `(left,seed)`
- proved equal to the root of the attributed tree
  - all proofs by induction on tree or path
  - key step: bottom-up computation equals top-down definition
- Verus analogue (inference): `decreases` path length, `requires` equal vector lengths, `proof fn` for the correspondence
incremental sibling-vector update
- successor path `w.0.1^k` to `w.1.0^k`: only the first left node gets a new value
- sub-lemmas not dischargeable by built-in induction
  - needed verified calculations as hints over all path nodes
- lemma requires well-formed sibling vectors and excludes the rightmost leaf
index-based refinement
- replace path bit-vector by leaf index `k` and height `h`
  - prove equivalence with `natToBitList(k,h)` under `k < 2^h`
- ghost expected value + loop invariant in `get_deposit_root` and `deposit`
  - `deposit` is the hardest proof: arithmetic on `size` and `i`, array bounds, functional sibling invariant
- Verus analogue (inference): ghost spec result, loop `invariant` equating concrete state, `old(...)` in postconditions
proof-driven optimization
- left-sibling vector need not be initialized
- deposit loop condition C1 always true, so loop simplifies to `while not(C2)`
  - missed by prior audits; deployed code still unoptimized when written
- Verus analogue (inference): prove the implication and termination first, relate old and new code by a refinement lemma
