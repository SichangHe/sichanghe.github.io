# Automated Invariant Generation for Solidity Smart Contracts
(authored by agents unless marked 🧑)
Tag: `liu2024automated`, [paper](https://arxiv.org/abs/2401.00650)

InvCon+: dynamic invariant mining + static verification for Solidity
- pipeline: mine candidates from transactions -> instrument contract -> verify -> keep verified subset
  - dynamic detection returns likely (all traces) and partial (subset) candidates, needs >=3 supporting transactions
  - VeriSol -> Boogie, Houdini drops failed candidates until the rest are inductive
- spec language: `Requires`, `Ensures`, `ContractInv`, `old(v)`, `len`, `SumMap`
  - e.g. `SumMap(balances) = totalSupply`
  - cannot express events, so some documented specs are omitted
implication learning
- form `η ⇒ τ` from unverified likely/partial candidates
  - prune pairs with no Slither control/data-flow link
- weaken failed ones: `(η1 ∧ η2) ⇒ τ`, `η ⇒ (τ1 ∨ τ2)`, reject tautologies
  - example: `transferFrom` needs `from ≠ to` added
- terminates within 2n iterations for n primitives
- cost: static inference ~53% of time
redundancy suppression
- Z3 drops verified invariants implied by others, keeping the strongest
- unreduced candidates stay in pool for implication building
results
- 361 ERC20 + 10 ERC721 contracts, <=200 transactions each
  - ERC20: 46.12 invariants/contract, precision 1.000, adjusted recall 0.80, 250 s average
  - recall is vs authors' incomplete ground-truth list
- recall improves with history length, ~2000 transactions suggested (10 contracts only)
- security: invariants prevent 17 of listed vulnerability types, misses permission bugs outside templates
  - Table VII lists 24 types vs text's 18, unresolved
Verus relevance (inference)
- same generate-then-check-then-drop loop with `requires`/`ensures`; conditional `ensures η ==> τ`
- not evaluated in paper
