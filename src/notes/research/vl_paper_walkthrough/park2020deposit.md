# End-to-End Formal Verification of Ethereum 2.0 Deposit Smart Contract
(authored by agents unless marked 🧑)
Tag: `park2020deposit`, [paper](https://doi.org/10.1007/978-3-030-53288-8_8)

## scope and contribution

Park, Zhang, and Rosu verify the Ethereum 2.0 deposit contract in the K framework. Page numbers below are the printed LNCS page numbers (151–164); section numbers are the paper's. Their target is the compiled EVM bytecode, not merely Vyper source, and their method separates algorithm correctness from compiler translation validation. They state: “We take the compiled bytecode as the verification target to avoid the need to trust the compiler.” (section 1, page 152). The verification covers one transaction and excludes transaction-level and off-chain behavior (section 1, page 152).

Inference: VL should treat compiler output and runtime boundaries as explicit verification targets when a product’s safety claim includes deployed artifacts. A source proof alone leaves a compiler gap.

## technique: refinement from abstract algorithm to bytecode

What it is. The authors first model the business algorithm as a K state-transition system, prove its functional property with reachability logic, then refine every abstract transition into a bytecode-level reachability claim. Finally they manually prove the soundness of the refinement: an abstraction function maps each concrete step to an abstract step. This avoids proving complicated loop invariants directly over bytecode. The paper says: “This refinement-based approach allows us to avoid reasoning about the complex algorithmic details, especially specifying and verifying loop invariants, directly at the bytecode level.” (section 1, page 152).

How to do it.

1. Write an abstract transition model. Their `sum` example has initialization, a loop rule guarded by `i ≤ n`, and a return rule guarded by `i > n` (section 1.1, page 153).
2. State a reachability claim, `sum(n) ⇒ return(n(n+1)/2)` when `n > 0` (section 1.1, page 153).
3. Supply a loop invariant, `loop(s: i(i−1)/2, i: i, n: n) ⇒ return(n(n+1)/2)` when `0 < i ≤ n+1` (section 1.1, page 153).
4. Refine each abstract rule into an EVM configuration claim over program counter, calldata, stack, output, and other state (section 1.1, page 154).
5. Verify each bounded concrete claim with KEVM; no loop invariant is needed for a claim that covers one loop iteration (section 1.1, page 154).
6. Prove refinement: for every concrete step `σ1 ⇒ σ2`, show `α(σ1) ⇒ α(σ2)` for the explicitly defined abstraction function `α` (section 1.1, page 154).
7. Put the results together to conclude that the compiled bytecode returns `#bytes(32, n(n+1)/2)` (section 1.1, page 154).

Verus form. Inference: define an abstract Rust/spec model and a concrete implementation, then prove a simulation lemma relating concrete states to abstract states. Use `requires` and `ensures` on the concrete step function; use `old(...)` for pre-state values and a `while` invariant for the abstract loop. Verus verifies Rust functions, so bytecode-level EVM semantics would require a separately modeled interpreter or a trusted external semantics. The paper’s abstraction-function proof pattern carries over; K reachability syntax does not.

Evidence and trust. The paper says the abstract model and compiler are excluded from the trust base because of refinement: “the abstract model and the compiler are not in the trust base, thanks to the refinement, while the K reachability logic theorem prover [46,55] and the formal semantics of EVM [24] are.” (section 1.1, page 154). Inference: this is a strong product pattern, but trust shifts to KEVM, its EVM semantics, and the correctness of the manually written abstraction and concrete specification.

## technique: incremental Merkle-tree correctness by full-model refinement

What it is. The contract stores a height-32 Merkle tree incrementally. The algorithm keeps only the siblings needed to recompute the path from a newly inserted leaf to the root, yielding O(h) time and space, where a naive algorithm would need O(2^h) time or space (section 1, pages 151–152; section 2.1, page 155). The authors verify the incremental algorithm against the original full-construction algorithm (section 1, page 152), then refine the verified model to bytecode (section 2, page 154).

How to do it.

1. Define a perfect binary tree whose leaves hold data hashes and internal nodes hash their children (section 2.1, page 154).
2. Define a partial tree up to `m`, with the first `m` leaves filled and the rest zero-filled (section 2.1, pages 154–155).
3. Define insertion of a new hash at leaf `m+1` and recomputation of the path to the root using maintained left or right siblings (section 2.1, page 155).
4. Prove the incremental algorithm correct with respect to the full-construction algorithm (section 1, page 152). The paper omits the formalization and proof for space and refers readers to a companion technical report (section 2.1, page 154); this paper does not state the theorem.
5. Verify the bytecode against the refined specification, including the SSZ Merkleization hash, DepositEvent log encoding, zero-padding, big-endian to little-endian conversion, SHA2-256 input construction, and ABI return-value serialization (section 2.2, page 156).

Verus form. Inference: represent the tree and a path-summary array in Rust, define a pure spec function for the full root, and prove an insertion lemma that the incremental root equals the full root. Use sequence/array invariants and lemmas for each tree level. The O(h) implementation can remain executable; the full tree function can be specification-only. Exact Merkle hash semantics and byte arrays must match the product’s cryptographic model.

Evidence and limitations. The algorithm correctness proof took 2 person-weeks, and it is only partially mechanized: “only the proof of major lemmas are mechanized in the K framework” and the non-mechanized proofs are in the trust base (section 3.5, page 159). The full algorithm proof is in an external technical report, so this paper alone does not provide all steps needed to reproduce it.

## technique: verify positive and negative behaviors

What it is. The bytecode specification includes desired behavior on valid inputs and behavior on malformed or adversarial inputs. The authors state: “Our formal specification includes both positive and negative behaviors.” (section 2.2, page 156). Negative behavior is used to expose security failures that ordinary functional tests may miss.

How to do it.

1. Specify valid deposits and expected state/root/event behavior (section 2.2, page 156).
2. Specify malformed calldata, exceptional execution, and adversarial cases as explicit behaviors (section 2.2, page 156).
3. Use the KEVM verifier, derived from the complete formal EVM semantics, to “reason about all possible corner-case behaviors of the compiled bytecode” (section 2.2, page 155).
4. Use failures to find bugs and missing requirements. A failed proof attempt exposed a missing premise (section 3.1, page 157), a counterexample calldata exposed the calldata bug (section 3.3, page 158), and discussion with developers exposed a missing future-hard-fork requirement (section 3.4, page 159).
5. Re-verify the fixed bytecode; the paper reports re-verifying newly compiled bytecode each time a bug was found (section 3.5, page 160).

Verus form. Inference: express valid input conditions with `requires` and invalid-input behavior with separate proof functions whose `ensures` specify rejection or error states. Add lemmas for bounds and byte decoding before proving the main operation. Verus does not automatically enumerate arbitrary EVM calldata; bounded test generation or explicit existential witnesses are needed for malformed-input examples.

Evidence. The paper reports four classes of issues. In the original version, a completely filled tree made `get_deposit_root` return the zero root hash; the fix caps deposits at `2^h−1`, and the authors note that triggering this is infeasible in practice for height 32 (section 3.1, page 157). A compiler bug returned a 96-byte deposit count with final byte `0x20` instead of zero padding (section 3.2, page 157). A 196-byte ill-formed calldata (well-formed is 356 bytes) was not rejected and inserted garbage deposit data, so the depositor could lose the fund, even though the function has argument-size assertions that “turned out to not work as expected” (section 3.3, page 158). A hard-coded gas amount for precompiled-contract calls could make a future hard fork with a higher gas schedule fail with out-of-gas “regardless of how much gas is initially supplied” (section 3.4, page 159). Inference: the first three are concrete defects in the audited versions, while the fourth is a failure under a hypothetical future gas schedule.

## technique: specify environmental variation and liveness

What it is. The contract must accept valid deposits under future hard forks with changed gas schedules. The authors had to “generalize the semantics of bytecode execution” to consider future gas schedules, and found a liveness bug (section 1, page 153; section 3.4, page 159). They admit they found it only after the contract developers reviewed the formal specification, because they had initially considered only the current hard fork (section 3.4, page 159).

How to do it.

1. State liveness as acceptance of a valid deposit whenever sufficient gas is supplied (section 2.2, page 156).
2. Do not fix the current (Istanbul) gas costs; the paper says the semantics were generalized for a different gas fee schedule (sections 1 and 3.4, pages 153 and 159). Inference: this amounts to parameterizing execution by the gas schedule; the paper does not show the formalization.
3. Check that the bytecode works in any future version with a different gas schedule (section 1, page 153); the failure found was a hard-coded gas amount supplied to precompiled contracts (section 3.4, page 159).
4. Fix the bug and re-verify the newly compiled bytecode (section 3.5, page 160). This paper does not describe the specific fix for the gas bug; it points to Vyper issue [44].

Verus form. Inference: make gas cost and environment parameters explicit in a spec function; quantify over an environment satisfying documented bounds, and prove that a valid operation cannot reach an out-of-gas result when the caller supplies the required amount. This is a specification-level argument; Verus cannot establish blockchain scheduler behavior unless modeled.

## effort, trust, and product implications

The net effort was 7 person-weeks, excluding discussions with developers and bug reporting: 2 for algorithm correctness and 5 for bytecode verification, including writing specifications. The bytecode specification is approximately 1,000 lines plus 200 auxiliary-lemma lines; source is approximately 100 lines and bytecode approximately 3,000 instructions (section 3.5, page 159). About 20% of bytecode effort was re-verification after fixes (section 3.5, page 160). These denominators are person-weeks and lines/instructions, not proof obligations.

The paper says the trusted base includes the bytecode specification, the KEVM verifier, and the non-mechanized algorithm proofs, and excludes the Vyper compiler (section 3.5, page 159); it also lists the formal EVM semantics as trusted (section 1.1, page 154). The authors also report that specifications tied to concrete program-counter values cause re-verification overhead when bytecode changes (section 3.5, page 160). Inference: VL should keep specifications stable across generated-code changes by using semantic labels or abstraction boundaries rather than raw instruction positions.

Inference: what VL need not redo is the pattern the paper demonstrates on a real contract (refinement that avoids trusting the compiler, positive and negative behavior specifications, liveness under changed gas schedules, and repair driven by failed proofs). VL should reuse these patterns and focus new work on Rust/Verus simulation libraries, cryptographic data-structure lemmas, malformed-input generators, and stable specification interfaces.

Inference: threat to agent-written verified Rust is high for deployed artifacts and medium for source-only claims. The paper reports bugs in the algorithm (not detected by existing tests, page 152), the compiler, calldata checks (despite source assertions, page 158), and future gas assumptions. Refinement to a verified target reduces compiler risk but leaves specification, semantics, and non-mechanized proof assumptions.

## techniques for the catalog

- refinement to deployed code — prove an abstract algorithm, refine transitions to bytecode, and prove a concrete-to-abstract simulation
- incremental Merkle-tree proof — compare an O(h) path update with a full-tree root specification
- positive and negative behavior specifications — verify valid operations together with malformed and adversarial executions
- parameterized liveness — quantify environmental parameters such as future gas schedules instead of fixing today’s setting
- counterexample-guided repair — use failed formal claims to expose bugs, fix the artifact, and re-verify
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since the invalid deposit data cannot pass the signature validation later, no one can claim the deposited fund associated with this, and the deposit owner loses the fund."): read the whole paper text (pages 151–164, including references) and checked every quotation, number, section and page reference, and the sum example, against it; changed page labels to printed LNCS page numbers, fixed the invariant notation, the Merkle-tree section and page citations, the claim that no timing was given for the algorithm proof (the paper gives 2 person-weeks), steps that the paper does not state (compare-trace inspection, parameterized gas proof, gas-bug fix, state updates), the trust-base citation, and added the paper's admission that the liveness bug was found only after developer review; did not check the companion technical report [45], the cited GitHub issues, or the figure beyond its caption and text; the Verus-form paragraphs are Inference and were not checked against any Verus documentation.
