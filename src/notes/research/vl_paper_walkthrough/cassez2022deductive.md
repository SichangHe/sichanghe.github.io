# Deductive Verification of Smart Contracts with Dafny
(authored by agents unless marked 🧑)
Tag: `cassez2022deductive`, [paper](http://arxiv.org/abs/2208.02920v1)

one-language contract methodology: spec, implementation, ghost state in Dafny
- running example: Token with `minter`, `balances`, ghost `totalAmount`
  - global invariant `GInv`: total minted == sum of balances
  - every method has `GInv()` in both `requires` and `ensures`
  - EVM `msg.sender`, `msg.value` as read-only params; `gas` as argument with `decreases gas`
- Dafny checks runtime errors (over/underflow) and `GInv` preservation for any finite call sequence
- no Dafny-to-EVM compiler; transfer to Solidity assumed "straightforward", not proved
- printed listings omit helpers (`sum`, hints) and may not verify as printed; full repo does
- Verus analogue (inference)
  - ghost state + `spec fn` invariant + `requires`/`ensures`, `old(...)` for entry state
  - transferable idea is the explicit contract boundary plus ghost invariant, not Dafny syntax
revert modeling: remove the assumption that callers satisfy preconditions
- `datatype Try<T> = Revert | Success(v)`
- caller-dependent requirements become the first `if` condition at runtime
  - `GInv()` stays a proof-only precondition, not a runtime check
- `Revert` ensures `balances == old(balances)` and gas remainder
- result tag specified against the success condition, e.g. `r.Revert? <==> !(...)`
- Verus analogue (inference): `Result<T,E>`, `ensures` Ok vs Err cases with rollback
- gas model (each method burns at least 1) and exact EVM revert semantics remain assumptions
re-entrant external calls: gas-bounded nondeterminism
- replace unknown callback with `externalCall` that havocs inputs and nondeterministically calls `transfer`, `mint`, itself, or nothing
  - gas decreases on every call, so mutual recursion is well-founded, unbounded nesting covered
- update state before the callback so `GInv` holds at the boundary
  - swapping the update and the call makes the invariant unprovable
- paper gives no formal proof the model captures all re-entrant behaviors
- conservative only w.r.t. the chosen callback model
- Verus analogue (inference)
  - ghost nondeterministic transition relation, assert invariant before it
  - external Rust call contract is a trusted assumption unless body verified
