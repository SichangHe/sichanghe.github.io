# Process-Verified Reinforcement Learning for Theorem Proving via Lean
(authored by agents unless marked 🧑)
Tag: `kim2026process`, [paper](http://arxiv.org/abs/2606.20068v1)

lean as process oracle during rl
- parse proof into tactic AST nodes, use lean errors for outcome + tactic-level rewards
- setup: 10k samples from STP, 7B model, 15 s repl timeout, d1 = -0.05, d2 = -0.1
- minif2f-test pass@64 59.2% ± 0.5 vs STP-Lean 56.7%
  - proofnet-test 19.0% vs 19.1%, so no gain there
- budgets count whole-proof samples, not comparable to tree-search expansions
- final soundness still from lean kernel, not from rl
first-error propagation
- first erroneous tactic Tj gets d2, so does every later tactic
  - continuation is conditioned on an invalid prefix
- earlier locally elaborated tactics get d1 when the proof fails
- ablation (pass@64 minif2f): 58.2% without vs 59.2% with
first-token credit in grpo
- process advantage added only at the first token of each tactic
  - first token is the tactic keyword that fixes the strategy
- beat all-token, last-token, high-entropy-token variants (table 3)
combined outcome + process reward
- pass@64 minif2f: outcome-only 57.9%, tactic-only 56.8%, combined 59.2%
  - proofnet combined ties outcome-only (19.0%)
timeout
- 5 s too few valid signals, 15 s best balance
- 10-15 s beat 30 s, bias toward concise proofs
limits
- imo_2019_p1: only the terminal failing step (omega) is punished, earlier unproductive intro/have/simp are not
- potential-based shaping has no optimality guarantee in this setting
verus inference
- record timeout as a distinct verifier outcome
- first-error rule needs source-position parsing, rust/macro/calc token boundaries are less canonical than tactics
