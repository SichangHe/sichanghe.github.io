# Verification of a Smart Contract for a Simple Casino
(authored by agents unless marked 🧑)
Tag: `utting2021verification`, [paper](http://arxiv.org/abs/2106.14457v1)

## scope and model
The case study translates a Solidity casino through Java/JML into Whiley, Boogie, and Z3. Its abstract says: “After finding and fixing several specification and code issues in the smart contract, we are able to verify all the operations of the smart contract.” (abstract, p. 1). The casino maintains balances, wagers, states, and a hidden coin outcome.

## technique 1: model state as an immutable record transition
Use this when the source contract has mutable global state but the verifier handles functional updates more naturally. The Whiley model represents casino state as a `Casino` record; each operation accepts one record and returns the modified record. The paper says, “in our Whiley translation, we model the casino state as a Casino record ... and model each contract operation as a function that takes the Casino record as input and returns a Casino record as output” (section 3, p. 3).

Steps in the paper: define record fields and a record invariant; define each operation as a function from input state to output state; express state transitions with postconditions; retain the contract's functional behavior while changing object structure (section 3, pp. 3–4). Figure 3 shows `playerWins`: preconditions require the bet state, sufficient player balance, and no 256-bit overflow; postconditions specify pot, player balance, wager, and address balance.

Inference: In Verus, use a Rust struct and a pure `spec fn` relation between old and new states, with `requires` for valid state and `ensures` relating return state to the pre-state. Verus has no Whiley record invariant syntax; prove a predicate about the struct at every public boundary. Rust ownership helps avoid aliasing, but blockchain persistence and serialization still need separate models.

Evidence: the final contract has 10 type definitions, 6 properties, 24 functions, and 360 lines, of which 182 are specification lines (section 3.2, p. 5). Verification averaged 3.6 seconds to translate and 4.1 seconds to verify with Boogie 2.8.26 and Z3 4.8.10 on an i7-7820HQ Windows laptop (section 3.2, p. 5).

Limit: the model omits rollback on invalid calls. The authors state, “we do not model the contract failure cases where a requirement for valid input is not satisfied and the contract state reverts to the state before the invalid call” (section 3, p. 3). Inference: this omission is a direct threat for VL if it verifies only successful Rust paths while deployed code can reject and roll back.

## technique 2: bounded integer modeling without wraparound
Use this when source arithmetic uses fixed-width unsigned integers and the SMT backend handles mathematical integers. The paper maps `uint256` to a Whiley integer subrange from zero to `2^256 − 1`; the prover then checks linear arithmetic without modular wrapping (section 3, p. 3). Preconditions explicitly require enough balance and that sums stay below `MAX256` (Figure 3, p. 4).

Steps: define a bounded integer type; put range facts in state/type invariants; add preconditions preventing underflow and overflow; let the prover discharge arithmetic obligations. The paper reports that failed proofs exposed sender-underflow conditions in `payable` and `transfer` (section 3.1, p. 5).

Inference: In Verus, use `u64`, `u128`, or a mathematical integer specification with explicit bounds, and add `requires` for arithmetic safety before casts or additions. The source's EVM 256-bit semantics require a dedicated type or lemmas; simply replacing it with Rust `u256` does not prove absence of wraparound.

## technique 3: proof-guided specification repair
Use iterative failed-proof diagnosis to find inconsistent contracts and strengthen missing assumptions. The authors write: “Typically, when the proof of a particular postcondition reported an error, we investigated that error and found that a precondition needed to be strengthened, or extra information was needed in the invariant, or there was an error in the code of a method or its specifications.” (section 3.1, p. 5).

The paper fixes three concrete issues: `decideBet` returned twice the wager, `removeFromPot` incorrectly called `payable`, and `payable`/`transfer` checked the receiver instead of sender balance (section 3.1, p. 5). Each correction was required for verification to succeed.

Inference: In Verus, treat every failed verification condition as a specification review trigger. Add only the precondition or invariant justified by the contract, then rerun proofs; a vacuous `requires false` would make the proof meaningless and should be rejected by review.

Evidence: all 24 operations verify automatically after repairs (section 3.2, p. 6). The denominator is 24 functions, not only the two previously verified with KeY. Earlier KeY verification required 22,000 proof steps and 207 interactive steps for `call_removeFromPot` (section 2, p. 2).

## trusted boundary and VL relevance
The paper proves Whiley source-level functional behavior for normal execution. Trusted elements include the Solidity-to-Java-to-Whiley translation, Whiley compiler, Boogie, Z3, and the unverified connection to EVM bytecode. The authors explicitly conclude that they “do not address here the issue of having some verified connection between the Whiley contract and the low-level EVM bytecode” (section 4, p. 6).

Inference: For agent-written verified Rust, the main threat is semantic mismatch between Rust model and deployed environment, especially rollback and arithmetic. VL should reuse the repair loop and explicit state invariants, but must add an execution/refinement proof before claiming deployed-code correctness. The paper already demonstrates full automation for straight-line contract operations; redoing that experiment without rollback or a refinement target adds little.

## techniques for the catalog
- record-state transition: represent mutable contract state as input/output records with relational postconditions
- bounded arithmetic: model fixed-width integers with explicit ranges and preconditions against overflow and underflow
- proof-guided repair: use failed verification conditions to correct code, invariants, and preconditions
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
