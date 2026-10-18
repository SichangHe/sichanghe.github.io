# Verification of a Smart Contract for a Simple Casino
(authored by agents unless marked 🧑)
Tag: `utting2021verification`, [paper](http://arxiv.org/abs/2106.14457v1)

## scope and model
The case study translates a Solidity casino through Java/JML into Whiley, Boogie, and Z3. Its abstract says: “After finding and fixing several specification and code issues in the smart contract, we are able to verify all the operations of the smart contract.” (abstract, p. 1). In the casino, one player at a time wagers on whether a hidden coin is heads or tails; the owner can set the wager amount and deposit or withdraw money within constraints (section 2, p. 1). The Whiley model covers only the success case of each operation (section 3, p. 3).

## technique 1: model state as an immutable record transition
Use this when the source contract has mutable global state and the verifier works better with a functional style. The authors give two reasons for the style: Whiley "promotes the functional and imperative programming styles, and has limited support for object-orientation", and Whiley passes everything by value so "all aliasing is eliminated in order to make verification easier" (section 3, pp. 2–3). The Whiley model represents casino state as a `Casino` record; each operation accepts one record and returns the modified record. The paper says, “in our Whiley translation, we model the casino state as a Casino record ... and model each contract operation as a function that takes the Casino record as input and returns a Casino record as output” (section 3, p. 3).

The paper does not list numbered steps; this is what its Figures 2 and 3 show (section 3, pp. 3–4): a `Casino` record with invariants (Fig. 2, e.g. `state == BET_PLACED ==> pot + wager.value == address.balance`); each contract operation as a function from an input `Casino` to an output `Casino`; `requires`/`ensures` clauses relating the two. Figure 3 shows `playerWins`: preconditions require the bet-placed state, that twice the wager is at most the casino's balance, and that twice the wager plus the player's balance stays below `MAX256`; postconditions specify pot, player balance, wager value, and casino balance.

Inference: In Verus, use a Rust struct and a pure `spec fn` relation between old and new states, with `requires` for valid state and `ensures` relating return state to the pre-state. Verus has no Whiley record invariant syntax; prove a predicate about the struct at every public boundary. Rust ownership helps avoid aliasing, but blockchain persistence and serialization still need separate models.

Evidence: the final contract has 10 type definitions, 6 properties, 24 functions, and 360 lines, of which 182 are specification lines (section 3.2, p. 5). Verification averaged 3.6 seconds to translate and 4.1 seconds to verify with Boogie 2.8.26 and Z3 4.8.10 on an i7-7820HQ Windows laptop (section 3.2, p. 5).

Limit: the model omits rollback on invalid calls. The authors state, “We do not model the contract failure cases where a requirement for valid input is not satisfied and the contract state reverts to the state before the invalid call.” (section 3, p. 3).

## technique 2: bounded integer modeling without wraparound
Use this when source arithmetic uses fixed-width unsigned integers and the SMT backend handles mathematical integers. The paper defines `uint256` as a subrange of Whiley's unbounded `int`, with range 0 to 2^256 − 1, so "the back-end prover sees just a subrange of the standard int type, without wrapping, so it can easily use its standard linear arithmetic solver to check that calculations do not overflow or underflow" (section 3, p. 3). Preconditions explicitly require enough balance and that sums stay below `MAX256` (Figure 3, p. 4).

Steps as shown in the paper's code (Appendix A, Fig. 3): define a bounded integer type (`uint256`); add preconditions preventing underflow and overflow (e.g. `price <= sender.balance`, `receiver.balance + price < MAX256`); let the prover check the arithmetic. The paper reports that "The Whiley verifier complained that this could result in sender underflow" for `payable` and `transfer` (section 3.1, p. 5). The conclusion says the approach added value "by strengthening method preconditions in order to verify that 256-bit integer calculations never overflow or underflow" (section 5, p. 6).

Inference: In Verus, use `u64`, `u128`, or a mathematical integer specification with explicit bounds, and add `requires` for arithmetic safety before casts or additions. Also: the source's EVM 256-bit semantics require a dedicated type or lemmas; simply replacing it with Rust `u256` does not prove absence of wraparound.

## technique 3: proof-guided specification repair
Use iterative failed-proof diagnosis to find inconsistent contracts and strengthen missing assumptions. The authors write: “Typically, when the proof of a particular postcondition reported an error, we investigated that error and found that a precondition needed to be strengthened, or extra information was needed in the invariant, or there was an error in the code of a method or its specifications.” (section 3.1, p. 5).

The paper fixes three concrete issues, all in methods not verified by KeY: the Java specification of `decideBet` said the player gets back just the original wager, inconsistent with `playerWins` (which returns twice the wager), so it was changed to twice the wager, `removeFromPot` incorrectly called `payable`, and `payable`/`transfer` checked the receiver instead of sender balance (section 3.1, p. 5). Each correction was required for verification to succeed.

Inference: In Verus, treat every failed verification condition as a specification review trigger. Add only the precondition or invariant justified by the contract, then rerun proofs; a vacuous `requires false` would make the proof meaningless and should be rejected by review.

Evidence: the authors report that "the prover could easily verify all the functions of the contract" (section 3.2, p. 6); the contract has 24 functions (section 3.2, p. 5), and the paper text shows only some of them (Appendix A omits `call_removeFromPot`, `call_timeoutBet`, `call_updateTimeout`, `call_closeCasino`, `selfdestruct`; full code is on GitHub). The denominator is all functions, not only the two (`call_closeCasino`, `call_removeFromPot`) previously verified with KeY. Earlier KeY verification required 22,000 proof steps and 207 interactive steps for `call_removeFromPot` (section 2, p. 2).

## techniques for the catalog
- record-state transition: represent mutable contract state as input/output records with relational postconditions
- bounded arithmetic: model fixed-width integers with explicit ranges and preconditions against overflow and underflow
- proof-guided repair: use failed verification conditions to correct code, invariants, and preconditions
