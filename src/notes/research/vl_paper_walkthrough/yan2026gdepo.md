# GDEPO: Group Dual-dynamic and Equal-right Advantage Policy Optimization with Enhanced Training Data Utilization for Sample-Constrained Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `yan2026gdepo`, [paper](https://arxiv.org/abs/2601.06795)

GDEPO = GRPO for Lean provers with 3 changes, Lean verdict is the reward signal
dynamic additional sampling
- GRPO all-invalid group gives no binary signal
- resample same query until a Lean-verified proof appears or cap `n` rounds
- ablation (Goedel-Prover-V2-8B): MiniF2F 84.6 → 84.9%, MathOlympiadBench 60 → 63, PutnamBench 25 → 36
  - denominators 244 / 360 / 644 problems
- cost: more Lean calls; per-query round distribution and `n` not reported
equal-right advantage
- problem: composite reward can give a correct proof negative advantage (bad length/repetition)
- sign comes only from Lean label `l_i∈{1,-1}`; auxiliary reward (min-max normalized) sets magnitude
  - active when group pass rate ≤ τ; above τ falls back to standard GRPO advantage
- vs single-binary GRPO: MiniF2F 85.3 vs 84.8%, MathOlympiadBench 62 vs 61, PutnamBench 31 vs 27; fewer tokens, less repetition
- composite-reward GRPO without it: 83.2%, 59, 24
- sign guarantee is analysis of clipped objective, not convergence theorem
dynamic additional iterations
- prompts valid only after resampling (round k>1) get `m` consecutive updates; others get 1
- on top of dynamic sampling: MiniF2F 84.9 → 85.8%, 63 → 64, 36 → 41
- risks: extra compute, overfitting hard examples; difficulty = sampling round only
overall
- GDEPO-Prover-8B: MiniF2F 86.2%, MathOlympiadBench 65, PutnamBench 46 (baseline 84.6%, 60, 25)
  - setup: 30,000 problems (30% challenging), lr 1e-6, batch 32, 2 epochs, ε_low 0.2, ε_high 0.28, no KL
- "84% gain on PutnamBench" = relative (46−25)/25, not percentage points
- results averaged over 10 seeds but no std/CI
- no evidence of transfer to Verus, Rust ownership, or concurrency
techniques
- verifier-driven resampling of failed prompts
- verifier correctness sets update sign, shaping rewards only magnitude
- extra gradient passes for late-solved samples
