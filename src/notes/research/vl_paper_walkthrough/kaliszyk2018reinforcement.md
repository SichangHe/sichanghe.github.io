# Reinforcement Learning of Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kaliszyk2018reinforcement`, [paper](https://arxiv.org/abs/1805.07563)

rlCoP = connection-tableau prover guided by MCTS + RL from its own past proof attempts
- first-order logic in clause normal form, Mizar-derived problems, not Rust/Verus
- drops iterative deepening (so incomplete), uses practically no domain heuristics
- failing to solve is not a refutation
search
- UCT: w_i/n_i + c p_i sqrt(ln N/n_i), c = 2 when learned
- nonlearned state value 0.95^(open goals)
- bigstep commits one inference after b playouts
learning
- policy: regress relative UCT action frequencies, softmax (temp 2.5) gives priors
- value: 1 if proved else 0, discounted by 0.99^(inferences to closed tableau)
- XGBoost on sparse features (term walks, tableau stats)
- iterate: run prover, log, retrain on all past runs, no extra human labels
results (fixed inference budget 200k)
- M2k: 1,235 proved at iteration 20, 19.4% over mlCoP with 4M inferences
  - policy-only 1,087, value-only 856
- Miz40 held-out (3,252 test): iteration 5 proves 1,624, 42.1% over mlCoP (1,143)
  - bare prover 431, unguided UCT 804
- guidance is slower: 16.2k vs 64.3k inferences/s, equal inferences ≠ equal time
trust
- calculus is the evidence, MCTS and learned priors are untrusted ordering
- Verus analogue: Verus check as terminal reward, learned prior only orders candidate lemmas/asserts
  - constants (0.95, UCT c) need retuning for Rust proof states
