# Verification of the Incremental Merkle Tree Algorithm with Dafny
(authored by agents unless marked 🧑)
Tag: `cassez2021incremental`, [paper](http://arxiv.org/abs/2105.06009v3)

## scope and result
The paper gives a machine-checked Dafny proof of the incremental Merkle tree algorithms used by Ethereum 2.0’s Deposit Smart Contract (DSC). Its design separates a functional recursive algorithm from the imperative Solidity-like implementation, proves total correctness of the recursive version, proves an index-based reformulation equivalent to the path-based one, and then uses the functional result as a loop invariant for the implementation. A Merkle tree has height `h`, `2^h` leaves, and `2^(h+1)-1` nodes; the incremental representation stores left-sibling values and default right-sibling hashes. The paper reports 3,538 lines of Dafny source, 1,030 lines of documentation, 12 person-weeks, and a trust base consisting of Dafny’s verification-condition generator and Z3 (sec. 5, PDF pp. 13–14).

## technique: path-based root computation
What: compute a Merkle root from a path bit-vector, the values of left and right siblings along the path, and the leaf value (`seed`). `computeRootUp` recursively hashes upward, choosing `hash(seed,right)` for a left node and `hash(left,seed)` for a right node.

When: use when a tree is represented by one path’s sibling vectors and a seed, rather than by all exponentially many nodes. The paper’s example uses path `[1,0,0]`, left `[-8,i1,i0]`, right `[-1,-1,0]`, and seed `4`, producing root `-12` for its illustrative hash.

How:
1. Define a generic binary `hash` and a path whose length equals tree height (sec. 2–3, PDF pp. 3–5).
2. Require `|p| == |left| == |right|`; recurse on `init(p)`, `init(left)`, and `init(right)` (Listing A.1, PDF p. 5).
3. If the final path bit is `0`, recurse with `hash(seed,last(right))`; otherwise recurse with `hash(last(left),seed)`.
4. Terminate at an empty path and return `seed`.
5. Prove the result equals the root value of a `MerkleTree` built by `buildMerkle`.

Verus form: Inference: implement the executable recursion in Rust and give it a `decreases` measure such as path length. Use `requires` for equal vector lengths and the path/tree relationship, and `ensures` for equality to a recursive/specification root function. Verus `proof fn` lemmas can establish the correspondence between bottom-up recursion and the tree definition; the paper’s Dafny syntax itself does not carry over.

Evidence and limits: Listing A.3 specifies `computeRootUpIsCorrectForTree` with preconditions for complete decoration, seed, sibling vectors, and path height, and an `ensures` clause equating the computed value with `r.rootv` (PDF pp. 7–8). The proof uses induction on the tree/path and intermediate lemmas. The hash is uninterpreted in the generic proof; collision resistance of a concrete cryptographic hash is outside this functional theorem.

Quote: “The total correctness proof for the computeRootUp function amounts to showing that 1) the algorithm always terminates and 2) the result of the computation is the same as the hash of the root of the tree.” (sec. 4, PDF p. 7)

## technique: incremental sibling-vector update
What: update the left-sibling vector when inserting the next leaf. If path `p1 = w.0.1^k`, its successor is `p2 = w.1.0^k`; only the first left node encountered while hashing upward receives a newly computed value.

How:
1. Represent the current path and sibling vectors top-down (sec. 3, PDF pp. 5–7).
2. Identify the successor path by binary increment. The common prefix keeps its left siblings; the suffix of left nodes reuses entries because those entries are right siblings on the successor path.
3. Recursively move upward while the final path bit is `1`, hashing the carried seed with the corresponding left sibling.
4. Stop at a `0` bit and return `init(left) + [seed]`; the one-bit base case returns `[seed]` for a left node or the old `left` for a right node (Listing A.2, PDF p. 7).
5. Prove that the returned entries equal the left siblings on `nextPath(p)` (Listing A.4, PDF pp. 8–9).

Verus form: Inference: use a recursive Rust function with a `decreases` path-length measure and sequence slicing operations represented by Verus sequences. State the successor-path sibling property as an `ensures` clause and prove it with lemmas about path bits and sequence prefixes. The paper’s use of Dafny sequence syntax requires translation to Verus `Seq` operations.

Evidence and limits: The paper says the proof needs intermediate verified calculations because built-in induction cannot discharge all path cases (sec. 4, PDF p. 8). It requires uniquely indexed leaves and excludes the rightmost leaf (`k < |leavesIn(r)|−1`) in Listing A.4. The algorithm assumes sibling vectors correspond to the stated path; malformed vectors are outside the contract.

Quote: “The main proof is based on several sub-lemmas that are not hard conceptually but cannot be easily discharged using solely the built-in Dafny induction strategies.” (sec. 4, PDF p. 8)

## technique: functional-to-imperative refinement with index algorithms
What: replace a path bit-vector by the integer index `k` of the next available leaf and tree height `h`, then prove the indexed algorithm computes the same value as the path algorithm. Use this functional indexed function as a ghost expected value and loop invariant for the DSC implementation.

How:
1. Encode `k` in binary over `h` bits with `natToBitList(k,h)` (sec. 4, PDF p. 9).
2. Define `computeRootUpWithIndex(h,k,left,right,seed)`; branch on `k % 2` and recurse with `k/2`, `h−1`, and truncated vectors (Listing A.5, PDF p. 9).
3. Prove equivalence to `computeRootUp(natToBitList(k,h),...)` under `k < power2(h)`.
4. In `get_deposit_root`, set a ghost expected root from the indexed function; loop while `h < TREE_HEIGHT`, maintain the indexed computation as `invariant`, update `r` with the branch/default hash, divide `size` by two, and increment `h` (Listing A.6, PDF pp. 10–11).
5. For `deposit(v)`, set a ghost expected next sibling vector, loop while `size % 2 == 1`, maintain the functional indexed sibling computation as the invariant, then write `branch[i]` and increment `count` (Listing A.7, PDF p. 11).

Verus form: Inference: this is a standard refinement pattern in Verus: a `ghost` value records the specification result, the executable loop carries an `invariant` equating concrete state to that value, and `decreases` proves termination. Use `old(...)` in postconditions where the pre-state is needed. Array bounds and sequence lengths require explicit `requires`/`assert` facts.

Evidence and limits: The paper proves termination with path length for recursive functions and `size` or `h` for loops; it separately proves memory safety of `branch[i]` (sec. 4, PDF pp. 9–12). The hardest proof is `deposit`, because it combines arithmetic constraints between `size` and `i`, array bounds, and the functional sibling invariant (sec. 5, PDF p. 13).

Quote: “The correctness proof of get deposit root() uses the functional (proved correct) algorithm computeRootUpWithIndex as an invariant.” (sec. 4, PDF p. 10)

## technique: proof-driven optimization
The verified development revealed two optimizations: the left-sibling vector need not be initialized, and the original deposit loop’s condition `C1` is always true while `C2` eventually becomes true, so the loop can be simplified to `while not(C2)`. This reduced gas cost in principle, although the deployed contract still used the unsimplified version when the paper was written (sec. 5, PDF p. 12).

Verus form: Inference: prove the loop-condition implication and termination as lemmas over the same state invariant before changing executable Rust. Keep the old and optimized implementations related by a refinement lemma and compare their postconditions.

Evidence and limits: The paper calls these “previously unknown/unconfirmed optimisations” and says the formal proof, rather than earlier audits, established them (sec. 5, PDF p. 12). The optimization depends on the exact DSC loop and may not generalize to other trees.

Quote: “Our formal machine-checkable proof revealed that indeed the condition C1 is always true and the loop always terminates because C2 eventually becomes true.” (sec. 5, PDF p. 12)

## evidence, trust, and product relevance
The paper measures code/documentation effort and line counts, not runtime benchmark accuracy: Table 1 reports 3,538 total Dafny lines and 1,030 documentation lines; 90% of lines are non-executable proofs and function definitions (sec. 5, PDF pp. 13–14). It proves functional correctness, termination, memory safety, and equivalence of representations under stated preconditions. It does not prove cryptographic collision resistance, correctness of Ethereum bytecode, or that the manually chosen Merkle specification matches every external protocol requirement. The paper explicitly states the trust base is Dafny’s verification engine and Z3.

Inference: a Verus port would substantially reduce the threat of agent-written Merkle-tree Rust when the tree specification and hash abstraction are reviewed, because every implementation step is checked against a functional model. Inference: remaining risks are wrong specifications, unchecked cryptographic assumptions, and trusted Verus/SMT infrastructure. The paper already demonstrates the refinement, ghost-invariant, and proof-driven optimization patterns VL should reuse rather than rediscover.

## techniques for the catalog
- path root computation — fold a sibling path upward with a generic hash and prove equality to the tree root
- sibling-vector insertion — update only the first affected left sibling while moving to the successor path
- functional-to-imperative refinement — use a proved recursive function as a ghost loop invariant for indexed code
- termination and memory-safety ranking — use path length, height, or size to discharge recursion and array bounds
- proof-driven optimization — simplify loops only after proving condition and termination properties

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
