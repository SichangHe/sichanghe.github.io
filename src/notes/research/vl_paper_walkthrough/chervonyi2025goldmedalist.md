# Gold-medalist Performance in Solving Olympiad Geometry with AlphaGeometry2
(authored by agents unless marked 🧑)
Tag: `chervonyi2025goldmedalist`, [paper](https://arxiv.org/abs/2502.03544)

AlphaGeometry2 (AG2) = LM proposing auxiliary constructions + DDAR2 symbolic closure engine
- result: 42/50 on IMO-AG-50 (IMO 2000-2024), vs AG1 27/50, avg gold medalist 40.9/50
  - benchmark formalization done manually; language covers 88% of problems
  - 6 unsolved problems unformalizable (inequalities, variable point count)
  - 2 more need inversion/projective/radical axis, which DDAR lacks
- trust stays in formalization, diagram construction, LM, DDAR implementation
  - paper does not discuss DDAR soundness
double-point reformulation
- to prove a∩b lies on ω, build X' = a∩ω, prove X' on b, conclude X = X'
  - easier since angles can move along the circle
- DDAR1 cannot take 2 names with same coordinates, DDAR2 can
- no isolated ablation, only illustration + 1 appendix use
hashed symbolic closure (DDAR2)
- hash "shape" of point triples for similar triangles, (A,B,∠AXB) for cyclic quads
- angle/distance rules folded into the AR engine (symbolic normal forms)
- speed on 25 unsolved problems: DDAR1 1179.6 s vs DDAR2 3.45 s (~342x)
  - credited to C++ Gaussian elimination + new algorithm, not separated
greedy minimal-example extraction for training data
- prune points in reverse-topological order, keep if `check_provable` holds
- linear number of checks, inclusion-minimal (not min-cardinality)
  - AG1 exhaustive subset search is exponential
  - reverse-topological order fixes non-monotonicity from dependency closure
SKEST = shared-knowledge ensemble of search trees
- several beam-search trees with different LMs/configs run in parallel
  - failed node writes engine-proved facts (not node-specific aux points) to shared DB
- 38/50 single tree -> 42/50 full ensemble
  - confounded: trees, models, fact sharing all change, not an ablation of sharing
- sampling t=1.0 k=32 solves 9/26 aux-construction problems, vs 2/26 greedy
analysis-string interface
- S1 = facts from premises, S2 = with goal assumed, S3 = numerically true in diagram
- feed S1, S2−S1, S3−S2 + problem to LM, AG1 fed only problem
- no ablation reported
takeaway for Verus agents
- LM output stays untrusted, only engine-certified facts enter shared state
