# Certifying optimal MEV strategies with Lean
(authored by agents unless marked 🧑)
Tag: `bartoletti2025mev`, [paper](https://arxiv.org/abs/2510.14480)

first Lean 4 mechanization of maximal extractable value (MEV), ~7000 lines
- MEV = max adversary gain by reordering/dropping/inserting txs
- first machine-checked optimality proof of sandwich attacks on Uniswap v2 style AMMs
system model
- System: Token, State, Move, partial semantics, honTokens, preserveTokens, tokenValue
- adversary wallet may go negative (wealthiness assumption)
- Move = adversary tx or mempool tx by id
- risk: omitting one adversarial move hides attacks
definitions
- MEV σ v: some trace gains exactly v, all traces gain ≤ v
- MEV may not exist (e.g. withdraw any amount < balance)
  - MEVsup = least upper bound, always exists, equals MEV when it exists
guess-function characterization theorem
- give invariant inv, guess function, coherent witness trace, one-step soundness
  - soundness: guess σ0 ≥ gain(σ0→σ1) + guess σ1
- completeness: sound coherent guess exists whenever MEV exists
- ~600 lines of Lean
case studies
- Airdrop: invariant True, guess = contract balance
- CoinPusher: empty or singleton mempool proved, general mempool only remarked
  - strategy: trigger, honest tx, trigger
- AMM: empty mempool guess (√(pr0·bal0) − √(pr1·bal1))²
  - singleton mempool: swap to tight state, run honest tx, rebalance
  - proof sizes ~500 and ~3200 lines
limits
- reals vs integers: rounding can change MEV a lot, integer port complicates proofs
- sqrt inequalities proved by manual algebra
- no swap fees, deposits, or withdrawals in AMM
- no experiments, only proofs
takeaways for Verus
- invariant + witness + one-step inequality lemma is expressible with recursive lemma over moves
- model all permitted actions explicitly, Verus proves only modeled transitions
- integers need explicit rounding spec
