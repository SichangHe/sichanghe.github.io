# Less Effort, Shorter Proofs: Reinforcement Learning for Security Protocol Analysis in Tamarin
(authored by agents unless marked 🧑)
Tag: `cosler2026less`, [paper](https://arxiv.org/abs/2605.23643)

rl proof search for tamarin (symbolic security protocol verifier)
- cosler, cremers, finkbeiner, ghanem, medinger
- claims more proofs found and shorter proofs than standard and human-engineered heuristics
- learning only proposes steps, tamarin still supplies rules and final proof checker
stateless proof-search api
- rest endpoints: `getInitialSystem`, `executeMethod`, `checkProof`
- client picks one method at a time, stores search itself, submits proof tree for check
- no benchmark of api latency, no correctness proof, delegates all to tamarin
- unbounded verification, search can still not terminate
- verus: external search may pick lemmas/invariants, verus must recheck final source
and/or monte carlo graph search
- constraint system = or node (any method may succeed), case split = and node
- puct selection with neural prior, backup mean at or, min at and
- merge equal states into dag, shared nodes 2–5% of search, up to 25%
- timeout method retried longer then excluded
- existential lemmas hard: solutions deeper, solved subproofs end search, contradictions rare
- verus: state hash must include all semantics-affecting facts
policy and value network
- observes only applicable methods, not full constraint system, graph encoding did not scale
- transformer encoder, pointer policy head, separate value head mean-pooled
- trained per protocol from self-generated data, no cross-protocol transfer
- network infers state from available actions only
heuristic mixing and reward shaping
- logits biased by tamarin heuristic rank, `λ=0` is pure learned
- reward `−(1+βb+αt+τh)`: step, branching, soft time, hard timeout
- shorter proofs are a proxy for easier to understand and maintain
- hyperparameters vary by protocol
- verus: never weaken a contract for reward, report proof size and time separately
online self-play from partial subproofs
- extract training tuple as soon as a subtree resolves
- targets recomputed without network estimates, avoids self-contamination
- fifo replay buffer, central trainer, parallel workers on separate servers
- budget grows geometrically on exhaustion
- expensive calls limit exploration: spdm, 5g handover xn up to 90 min per expansion
- verus: replay data must pin verus version and module deps
results (16 case studies)
- lemmas solved rl vs baseline: 5g eps n26 8/8 vs 3/8, signal 5/5 vs 2/5, 5g aka 13/13 vs 8/13, wpa2 73/85 vs 43/85
  - spdm 37/49 vs 38/49 (`c`), 43/49 (`s`), not better
- proof size on shared solved lemmas: wpa2 34.8 vs 903.7 steps, 5g eps n26 17.3 vs 9531.7
  - vs human heuristics: wpa2 52.0 vs 81.9
  - averages over intersections only
- wall-clock includes training, assumes max parallelism
  - 5g eps n26 3m25s vs 45m (`c`), but 4.5–20 h on hardest models
  - one a100, up to 64 cores, 250 GB ram
  - not a universal speedup, hardware and solved sets differ
