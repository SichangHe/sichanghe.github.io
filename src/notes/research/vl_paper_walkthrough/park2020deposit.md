# End-to-End Formal Verification of Ethereum 2.0 Deposit Smart Contract
(authored by agents unless marked 🧑)
Tag: `park2020deposit`, [paper](https://doi.org/10.1007/978-3-030-53288-8_8)

## scope and contribution

Park, Zhang, and Rosu verify the Ethereum 2.0 deposit contract in the K framework. Their target is the compiled EVM bytecode, not merely Vyper source, and their method separates algorithm correctness from compiler translation validation. They state: “We take the compiled bytecode as the verification target to avoid the need to trust the compiler.” (section 1, PDF page 152). The verification covers one transaction and excludes transaction-level and off-chain behavior (section 1, PDF page 152).

Inference: VL should treat compiler output and runtime boundaries as explicit verification targets when a product’s safety claim includes deployed artifacts. A source proof alone leaves a compiler gap.

## technique: refinement from abstract algorithm to bytecode

What it is. The authors first model the business algorithm as a K state-transition system, prove its functional property with reachability logic, then refine every abstract transition into a bytecode-level reachability claim. Finally they prove that the abstraction function maps each concrete step to an abstract step. This avoids proving complicated loop invariants directly over bytecode. The paper says: “This refinement-based approach allows us to avoid reasoning about the complex algorithmic details, especially specifying and verifying loop invariants, directly at the bytecode level.” (section 1, PDF page 152).

How to do it.

1. Write an abstract transition model. Their `sum` example has initialization, a loop rule guarded by `i ≤ n`, and a return rule guarded by `i > n` (section 1.1, PDF page 153).
2. State a reachability claim, `sum(n) ⇒ return(n(n+1)/2)` when `n > 0` (section 1.1, PDF page 153).
3. Supply a loop invariant, `loop(s=i(i−1)/2, i:i, n:n) ⇒ return(n(n+1)/2)` when `0 < i ≤ n+1` (section 1.1, PDF page 153).
4. Refine each abstract rule into an EVM configuration claim over program counter, calldata, stack, output, and other state (section 1.1, PDF page 154).
5. Verify each bounded concrete claim with KEVM; no loop invariant is needed for a claim that covers one loop iteration (section 1.1, PDF page 154).
6. Prove refinement: for every concrete step `σ1 ⇒ σ2`, show `α(σ1) ⇒ α(σ2)` for the explicitly defined abstraction function `α` (section 1.1, PDF page 154).
7. Compose abstract correctness, concrete-vs-abstract refinement, and concrete verification to conclude the bytecode result (section 1.1, PDF page 154).

Verus form. Inference: define an abstract Rust/spec model and a concrete implementation, then prove a simulation lemma relating concrete states to abstract states. Use `requires` and `ensures` on the concrete step function; use `old(...)` for pre-state values and a `while` invariant for the abstract loop. Verus verifies Rust functions, so bytecode-level EVM semantics would require a separately modeled interpreter or a trusted external semantics. The paper’s abstraction-function proof pattern carries over; K reachability syntax does not.

Evidence and trust. The abstract model and compiler are excluded from the trust base because of refinement; the paper explicitly says: “the abstract model and the compiler are not in the trust base, thanks to the refinement, while the K reachability logic theorem prover [46,55] and the formal semantics of EVM [24] are.” (section 1.1, PDF page 154). Inference: this is a strong product pattern, but trust shifts to KEVM, its EVM semantics, and the correctness of the manually written abstraction and concrete specification.

## technique: incremental Merkle-tree correctness by full-model refinement

What it is. The contract stores a height-32 Merkle tree incrementally. The algorithm keeps only the siblings needed to recompute the path from a newly inserted leaf to the root, yielding O(h) time and space instead of O(2^h) for reconstruction (section 2.1, PDF pages 151 and 154–155). The authors compare the incremental result against an original full-construction algorithm, then refine the verified algorithm to bytecode.

How to do it.

1. Define a perfect binary tree whose leaves hold data hashes and internal nodes hash their children (section 2.1, PDF page 154).
2. Define a partial tree up to `m`, with the first `m` leaves filled and the rest zero-filled (section 2.1, PDF page 154).
3. Define insertion of a new hash at leaf `m+1` and recomputation of the path to the root using maintained left or right siblings (section 2.1, PDF page 155).
4. Prove that the incremental root equals the root of the full tree construction. The paper directs readers to a companion report because the formalization and proof are omitted for space (section 2.1, PDF page 154).
5. Verify bytecode operations that perform Merkleization, SHA2-256 input construction, and state updates against the refined specification (section 2.2, PDF page 156).

Verus form. Inference: represent the tree and a path-summary array in Rust, define a pure spec function for the full root, and prove an insertion lemma that the incremental root equals the full root. Use sequence/array invariants and lemmas for each tree level. The O(h) implementation can remain executable; the full tree function can be specification-only. Exact Merkle hash semantics and byte arrays must match the product’s cryptographic model.

Evidence and limitations. The paper does not report a denominator or timing for the algorithm proof; it says only that major lemmas are mechanized in K and non-mechanized proofs remain trusted (section 3.5, PDF page 159). Therefore no completion percentage can be inferred. The paper’s full algorithm proof is in an external technical report, so this article alone does not provide all steps needed to reproduce it.

## technique: verify positive and negative behaviors

What it is. The bytecode specification includes desired behavior on valid inputs and behavior on malformed or adversarial inputs. The authors state: “Our formal specification includes both positive and negative behaviors.” (section 2.2, PDF page 156). Negative behavior is used to expose security failures that ordinary functional tests may miss.

How to do it.

1. Specify valid deposits and expected state/root/event behavior (section 2.2, PDF page 156).
2. Specify malformed calldata, exceptional execution, and adversarial cases as explicit behaviors (section 2.2, PDF page 156).
3. Use KEVM to search all execution paths allowed by the EVM semantics, including corner cases (section 2.2, PDF page 155).
4. When a property fails, inspect the concrete trace and either fix code or revise the requirement with developers (sections 3.1–3.4, PDF pages 157–159).
5. Re-verify the fixed bytecode; the study reports repeated re-verification after each bug fix (section 3.5, PDF page 160).

Verus form. Inference: express valid input conditions with `requires` and invalid-input behavior with separate proof functions whose `ensures` specify rejection or error states. Add lemmas for bounds and byte decoding before proving the main operation. Verus does not automatically enumerate arbitrary EVM calldata; bounded test generation or explicit existential witnesses are needed for malformed-input examples.

Evidence. The method found four classes of issues. A full tree caused `get_deposit_root` to return the zero root; the workaround caps deposits at `2^h−1` (section 3.1, PDF page 157). A compiler bug returned a 96-byte deposit count with final byte `0x20` instead of zero padding (section 3.2, PDF page 157). A 196-byte malformed calldata input passed checks intended for 356-byte valid calldata and inserted garbage data, potentially losing funds (section 3.3, PDF page 158). A hard-coded gas amount broke future-hard-fork liveness despite arbitrary initial gas (section 3.4, PDF page 159). These are concrete counterexamples, not estimates.

## technique: specify environmental variation and liveness

What it is. The contract must accept valid deposits under future hard forks with changed gas schedules. The authors generalized bytecode execution semantics to include the gas schedule and discovered an out-of-gas failure (section 1, PDF page 153; section 3.4, PDF page 159).

How to do it.

1. State liveness as acceptance of a valid deposit whenever sufficient gas is supplied (section 2.2, PDF page 156).
2. Parameterize execution by the gas schedule, rather than fixing current Istanbul costs (sections 1 and 3.4, PDF pages 153 and 159).
3. Prove the property for every permitted schedule and inspect failures caused by hard-coded internal gas (section 3.4, PDF page 159).
4. Fix the source/compiled artifact and rerun the generalized proof (section 3.4, PDF page 159).

Verus form. Inference: make gas cost and environment parameters explicit in a spec function; quantify over an environment satisfying documented bounds, and prove that a valid operation cannot reach an out-of-gas result when the caller supplies the required amount. This is a specification-level argument; Verus cannot establish blockchain scheduler behavior unless modeled.

## effort, trust, and product implications

The complete effort was 7 person-weeks: 2 for algorithm correctness and 5 for bytecode verification. The bytecode specification is approximately 1,000 lines plus 200 auxiliary-lemma lines; source is approximately 100 lines and bytecode approximately 3,000 instructions (section 3.5, PDF page 159). About 20% of bytecode effort was re-verification after fixes (section 3.5, PDF page 160). These denominators are person-weeks and lines/instructions, not proof obligations.

The trusted base includes the bytecode specification, KEVM verifier, formal EVM semantics, and non-mechanized algorithm proofs; Vyper is excluded (section 3.5, PDF page 159). The authors also report that specifications tied to concrete program-counter values cause re-verification overhead when bytecode changes (section 3.5, PDF page 160). Inference: VL should keep specifications stable across generated-code changes by using semantic labels or abstraction boundaries rather than raw instruction positions.

What VL should not redo: the paper already demonstrates compiler-independent refinement, positive/negative behavior specifications, environmental liveness, and counterexample-guided repair on a real contract. Inference: VL should reuse these patterns and focus new work on Rust/Verus simulation libraries, cryptographic data-structure lemmas, malformed-input generators, and stable specification interfaces.

Inference: threat to agent-written verified Rust is high for deployed artifacts and medium for source-only claims. The study found bugs in the algorithm, compiler, calldata checks, and future gas assumptions despite tests and source assertions. Refinement to a verified target reduces compiler risk but leaves specification, semantics, and non-mechanized proof assumptions.

## techniques for the catalog

- refinement to deployed code — prove an abstract algorithm, refine transitions to bytecode, and prove a concrete-to-abstract simulation
- incremental Merkle-tree proof — compare an O(h) path update with a full-tree root specification
- positive and negative behavior specifications — verify valid operations together with malformed and adversarial executions
- parameterized liveness — quantify environmental parameters such as future gas schedules instead of fixing today’s setting
- counterexample-guided repair — use failed formal claims to expose bugs, fix the artifact, and re-verify
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
