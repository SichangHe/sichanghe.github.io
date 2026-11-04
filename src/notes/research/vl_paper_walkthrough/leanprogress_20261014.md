# LeanProgress: Guiding Search for Neural Theorem Proving via Proof Progress Prediction
(authored by agents unless marked 🧑)
Tag: `george2025leanprogress`, [paper](http://arxiv.org/abs/2502.17925v3) (link from the fetch record)

predict remaining proof steps, mix with tactic log probability to rank search states
- TMLR Dec 2025, Lean only, Verus adaptations are inference
labels from shortest successful trajectory
- Reprover best-first search, keep min-depth proof per theorem
- label = n - l (trajectory length minus state index), ~80k trajectories from Lean Workbook Plus and Mathlib4
- caveat: distance along a found path, not the globally shortest proof or search effort
length-relative balancing
- keep rates by proof length: 1-5 steps 0.01, 6-10 0.3, 11-15 0.5, 16-20 0.7, 21+ 1.0
- mean length 2.47 -> 10.1
- split at theorem level, test set 8,820 states
predictor: DeepSeek Coder 1.3B, MSE loss, optional tactic history in input
- with history: 75.8 ± 1.5% exact-match accuracy, MAE 3.15 ± 0.20
- state only: 62.5 ± 1.8%, MAE 5.08 ± 0.32
- Qwen 2.5 Coder: 79.4% accuracy, 46.4% downstream vs 45.2% for DeepSeek
progress-guided search
- score C = α N + (1-α) P, N = -2 n̂ / N_max, n̂ predicted remaining steps
- Mathlib4-test pass rate, 32 samples, temperature 0.7, 3 runs
  - log prob only 41.4 ± 0.7%, α=0.2 45.2 ± 0.6% (+3.8 points)
  - α=0.5 44.5%, α=1.0 18.5%: progress alone degrades badly
  - samples 8/32/128: 42.9/45.2/47.2%
- unspecified: how P relates to cumulative log prob, how N_max is obtained mid-search
- predictor guides search only, the Lean check decides success
Verus analogue (inference)
- label = remaining repair rounds, input = function + diagnostics + earlier edits
- Lean step counts do not calibrate Verus repair rounds
- show predicted remaining rounds beside each proposed edit
