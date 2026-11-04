# Verifier-guided discovery of exact high-order mimetic operators with large language models
(authored by agents unless marked 🧑)
Tag: `decurto2026verifier`, [paper](https://arxiv.org/abs/2609.27922)

core pattern: propose, compile, verify, exactify
- LLM proposes only a typed construction program, never coefficients
  - fields: interior/boundary orders, norm class, closures, row support, bandwidth, bounds, margin, objective
- deterministic LP compiler generates coefficients
- independent verifier decides validity
  - checks algebra, positivity, physical modes, conditioning, manufactured PDEs
- rejected proposals inform later calls, never count as evidence
- domain: 1D uniform-grid mimetic finite-difference operators
search results (1,200 deterministic solver calls)
- accepted: full-metric feedback 66/120 (55%), illumination archive 64/120 (53%), expert prior 120/240 (50%), uniform random 32/240 (13%)
  - Holm p=0.0117 vs random; no dominance over expert prior
- one-step textual repair no better than fresh proposals (20/42 vs 25/55, p=0.84)
  - 637/638 LP-infeasible programs failed endpoint compatibility
  - obstacle is global structural compatibility
- caveats: feedback comparison not fully causal, 1D only, block-positive cone is a sufficient approximation
exact certification
- rational reconstruction in the whole coupled affine system, not per coefficient
  - free coords on common dyadic grid, pivots solved exactly, every equation rechecked
  - norm positive-definiteness by leading principal minors
- best candidate: denominator 2^36, float shift ≤1.27e-9
  - 25.4% lower spectral-radius constant, 62.7x lower PDE error than prior 6–3 candidate
  - reference still ~69x more accurate on one manufactured problem but has 4 non-real modes
- exact identity gives energy certificate and CG applicability
  - all 7 exact constructions CG-applicable, none of 4 references
transfer to Verus (inference)
- trust base: compiler, verifier, reconstruction code, numerics, spec
- only deterministic, independently checked artifacts enter the trusted pipeline
