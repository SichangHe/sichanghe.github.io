# Deductive Verification of Smart Contracts with Dafny
(authored by agents unless marked 🧑)
Tag: `cassez2022deductive`, [paper](http://arxiv.org/abs/2208.02920v1)


## what the paper proves or measures

The paper presents a Dafny methodology for smart contracts. Its central claim is that one can put the contract, its specification, and its implementation in one verification-oriented language, then model failures and arbitrary callbacks while preserving a global invariant. The abstract states: “We present a methodology to develop verified smart contracts.” (Abstract, p. 1.) The paper does not provide a Dafny-to-EVM compiler; it argues that the translation to Solidity is straightforward, so the Dafny result is evidence about the intended Solidity contract. This transfer is an assumption, not a proved compiler-correctness theorem.

The running Token contract tracks `minter`, a map `balances`, a ghost `totalAmount`, and a global predicate `GInv` saying that total minted tokens equal the sum of balances (Section 2, pp. 4–7). A method has `requires` preconditions, `ensures` postconditions, and a gas argument. The authors explain the induction boundary exactly: “The global invariant must be maintained by each method call.” (Section 2, p. 5.) Dafny reports no errors for the example, which establishes runtime-safety checks and preservation of `GInv` for every finite sequence of calls, assuming every call begins with its listed preconditions (Section 2, pp. 5–7).

## technique 1: put executable contract and proof contract in Dafny

what it is: write data types for messages and accounts, executable methods, preconditions, postconditions, and ghost state in one language. The EVM transaction values are explicit read-only parameters (`msg.sender`, `msg.value`) and gas is an argument. The authors use a class for the contract, a constructor for initial state, a `predicate GInv()` for the global invariant, and ghost members for proof-only accounting.

when to use: use this organization when a stateful API has safety conditions, arithmetic bounds, and a persistent relationship among fields. It avoids maintaining a separate Solidity program and specification model.

how to do it (paper steps):
1. define `Msg(sender, value)`, an account trait, and address abstraction (Listing A.1, p. 4)
2. define contract fields and a ghost total; write `GInv()` as `totalAmount == sum(balances)` (Listing A.2, pp. 5–6)
3. initialize the fields in a constructor and require `GInv()` in every method contract (Section 2, pp. 5–6)
4. give `transfer` and `mint` preconditions for authorization, map membership, arithmetic overflow, and `gas >= 1`; give postconditions for balances, totals, and `GInv()` (Listing A.2, pp. 6–7)
5. run Dafny, which checks both specifications and runtime errors such as underflow/overflow (Section 2, p. 5)

The token example uses `old(balances[from])` in a postcondition to relate the result to the entry state and uses `decreases gas` to establish termination (Listing A.2, p. 6). “Ghost members are only used in proofs and do not need to be executable.” (Section 2, p. 5.)

Verus form (Inference: the paper is about Dafny): represent the state with a Rust struct and the mathematical total with ghost state; write a `spec fn` for the balance-sum invariant, `requires` and `ensures` on proof-aware Rust functions, `invariant` clauses for loops, and `decreases` for recursive calls. Verus uses `old(...)` in postconditions for entry-state values. A `proof fn` can establish arithmetic/map lemmas, and `assert(...)` can expose intermediate facts. The Dafny `modifies` frame syntax and class semantics do not carry over as source syntax; Rust ownership and Verus-supported ghost/tracked mechanisms must express the frame. Inference: the key transferable design is one explicit contract boundary plus a ghost invariant, not a direct translation of Dafny code.

evidence and limits: the paper says the complete listing omits helper functions such as `sum` and proof hints and “may not be directly verifiable with Dafny” (Section 3.2, p. 12). The repository contains the full contracts and reproduction instructions. Thus the reported “no errors” result applies to the authors' complete artifact, while the printed listing is explanatory pseudocode. The preconditions are initially assumptions about callers; the next technique removes that assumption.

## technique 2: turn call preconditions into explicit revert behavior

what it is: model an EVM revert by checking the conjunction of a method's preconditions at runtime and returning a tagged result. The paper introduces `datatype Try<T> = Revert | Success(v:T)`. On failure, the method returns `Revert`, leaves contract state unchanged, and consumes at most the available gas; on success, it returns `Success` and establishes the normal postconditions.

when to use: use this when an untrusted caller can submit arbitrary transaction arguments and the implementation must remain safe without assuming the preconditions.

how to do it (paper steps):
1. lift each return value to `Try<T>` and add a status result (Section 3.1, p. 7)
2. keep the global invariant as a proof precondition, but move caller-dependent requirements into the first `if` condition (Listing A.3, pp. 7–8)
3. if the condition is false, return `Revert` and the gas remainder without changing balances (Listing A.3, lines 22–25 and 47–50)
4. otherwise execute the old body and return `Success`; specify that `Revert` implies state equality to `old(balances)` (Listing A.3, pp. 7–8)
5. verify that the result tag is equivalent to the success condition and that `GInv()` is preserved (Section 3.1, p. 8)

The paper distinguishes executable checks from proof-only invariants: “The pre-condition GInv() remains in the code. It is not a runtime check but a property of the contract that has to be preserved.” (Section 3.1, p. 7.)

Verus form (Inference): return `Result<T, E>` in executable Rust, with `ensures` cases that relate `Ok` to successful state changes and `Err` to unchanged ghost-visible state. Use `old(...)` in `ensures` to state rollback and retain a `spec fn` invariant as a function precondition/postcondition. Rust's ordinary early return implements the branch; a Verus proof function can establish that the error branch preserves the invariant. The EVM's exact revert semantics and gas accounting remain a model assumption unless the Rust target implements and verifies them.

evidence and limits: Dafny verifies the lifted Token implementation and the authors conclude the invariant holds after any number of calls (Section 3.1, p. 8). This conclusion depends on the runtime checks being faithful to every method precondition and on the abstract gas model, where each method consumes at least one unit. It does not verify Solidity bytecode generation.

## technique 3: abstract arbitrary external and re-entrant calls with gas-bounded nondeterminism

what it is: replace an unknown callback such as `to.notify(...)` with an `externalCall` method that nondeterministically invokes `transfer`, `mint`, another `externalCall`, or no callback. Inputs are generated by `havoc`. Every recursive call receives less gas, so mutually recursive calls are well-founded.

when to use: use this when a contract calls code whose implementation is unavailable or adversarial and callbacks can re-enter the original contract. Update state before the callback so the invariant holds at the callback boundary.

how to do it (paper steps):
1. identify the external call and state the EVM assumptions: termination, a status and remaining gas, at least one unit consumed, and arbitrary nested callbacks (Section 3.2, pp. 9–10)
2. update the Token balances before invoking the abstraction; the listing explicitly warns that swapping the update and callback loses invariant preservation (Listing A.5, pp. 11–12)
3. choose a natural `k` with `havoc`; use `k mod 3` to select transfer, mint, or no re-entrant call (Section 3.2, p. 10; Listing A.5, lines 41–59)
4. havoc callback arguments and call the selected method with `gas - 1` (Listing A.5, lines 45–57)
5. havoc a Boolean `b`; if true, recursively call `externalCall(gas - 1)`, otherwise return a nondeterministic status and one-unit-lower gas (Listing A.5, lines 61–69)
6. require and ensure `GInv()` on `externalCall`, and put `decreases gas` on both mutually recursive methods (Listing A.5, lines 33–38)

The paper describes the purpose precisely: “The re-entrant calls can be executed with arbitrary inputs and thus the input parameters are havoced i.e., non-deterministically chosen.” (Section 3.2, p. 10.) The model can represent sequences such as `mint*` and nested transfer/mint calls by suitable `k` and `b` choices, but “We do not provide a formal proof that this captures all the possible re-entrant calls” (Section 3.2, p. 10). That is a stated limitation.

Verus form (Inference): define a proof-facing callback abstraction as a `spec fn` or proof function over an abstract state transition, with `requires` and `ensures` that preserve the contract invariant; use a ghost nondeterministic-state relation rather than executable `havoc`. For recursive executable models, use a decreasing natural argument and a `decreases` clause. At each callback boundary, assert the invariant before calling the abstract transition. Verus cannot treat an arbitrary external Rust call as verified merely because it has a contract: the external function's contract becomes a trusted assumption unless its body is verified. The paper's Dafny `havoc<T>()` and `modifies` syntax therefore do not carry over directly.

evidence and limits: Dafny proves `GInv()` for the mutually recursive model, including an unbounded number of nested calls, because gas decreases strictly (Section 3.2, pp. 10–11). The proof is conservative with respect to the chosen callback model, not a proof that every EVM behavior is represented. If more callback knowledge is available, the authors say `externalCall` can be adjusted; if state is changed after the callback, the proof fails on their example (Section 3.2, p. 10).

## trusted boundary, contradictions, and product threat

The verified claims are Dafny's contracts, invariant preservation, arithmetic safety, rollback behavior, and termination of the abstract model. The Solidity translation, EVM semantics abstraction, `havoc` coverage of all callbacks, omitted helper proofs, and correctness of Dafny/Z3 remain trusted assumptions or tools. The paper reports that Token, Simple Auction, and Bank contracts verify “within seconds on a standard laptop” (Section 3.2, p. 12), but gives no denominator, timings, code-size table, or failure count. Its auction example adds ghost history sequences to state temporal properties, including that once `ended` is true it stays true (Section 3.2, p. 12).

Inference: VL should reuse the three-stage decomposition—closed state proof, explicit error result, then adversarial callback abstraction—and require the agent to state which callback assumptions its Verus contract makes. VL should not redo the paper's already-demonstrated point that global invariants and gas-bounded recursion can express re-entrancy reasoning. Inference: the threat to agent-written verified Rust is high when agents omit rollback, callback ordering, or external-code assumptions; it is lower for the mechanical arithmetic and invariant checks after those contracts are explicit. A Verus acceptance result still proves only the written model.

## techniques for the catalog

- single-language contract specification — put executable state, preconditions, postconditions, ghost accounting, and a global invariant in one verification-oriented program
- runtime revert modeling — check caller conditions, return a tagged success/error result, and prove state is unchanged on error
- gas-bounded callback abstraction — model unknown and re-entrant calls with havoced inputs and mutually recursive transitions decreasing gas
- invariant-before-callback discipline — update state until the invariant holds before an external call, then require and re-establish it across the abstraction
Checked 2026-10-15 against paper cassez2022deductive: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
