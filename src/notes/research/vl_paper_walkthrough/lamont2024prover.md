# 3D-Prover: Diversity Driven Theorem Proving With Determinantal Point Processes
(authored by agents unless marked 🧑)
Tag: `lamont2024prover`, [paper](https://arxiv.org/abs/2410.11133)

filter lm tactic candidates before executing them in lean
- motivation: ~75-85% of tactics error on miniF2F; many are semantically equivalent
- augments existing generators: ReProver (300M), InternLM2.5-Step-Prover (7B)
learn transition-aware tactic embeddings
- train on synthetic traces: 498,236 goal-tactic transitions from one ReProver run on miniF2F-valid
  - transformer encodes goal + tactic, mean-pool tactic tokens to unit vector e
  - heads predict success (BCE), time (MSE), env output (decoder, CE)
- goal-aware beats tactic-only and no-tactic baselines
  - status F1 0.88 vs 0.22 no-tactic; time MSE 0.16 vs 0.37
k-DPP selection of high-quality diverse subset
- sample N=64 candidates, quality q = softmax score + λs * success + λτ * speed
  - L = BᵀB with columns q*φ, sample K by k-DPP, execute only those
- K trades breadth vs depth; θ flattens policy scores for more diversity
- main runs used λs=λτ=0, θ=1, untuned
results (pass@1 miniF2F-test, ReProver)
- K=8: 24.4% vs Top-K 22.4%, random 19.0%
- K=16: 27.3 vs 26.5; K=32: 28.2 vs 27.8
  - gain shrinks as K grows
- InternLM BFS K=8: 45.7 vs 44.3 Top-K; critic-guided pass@6 53.1 vs 49.0
secondary objectives
- tactic success 27.7% unfiltered to 43.3% (λs=0.1), 56.5% (λs=0.5) at K=8
- better secondary metric does not imply better proof rate
  - λτ 0.1 to 1: pass@1 25.0 to 22.5
- semantic embedding beats syntax-only autoencoder (25.0 vs 23.0 at K=8)
limits
- cannot add tactics absent from generator; one pass of trace data; lean only
- small gains, limited sweep, 4 runs for stochastic methods
verus transfer (inference)
- log (edit, diagnostics, status, time) from verus runs; train embedding on real transitions
- verus has multiple smt obligations, so keep exact diagnostics and locations
