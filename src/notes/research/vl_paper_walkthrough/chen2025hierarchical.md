# Hierarchical Attention Generates Better Proofs
(authored by agents unless marked 🧑)
Tag: `chen2025hierarchical`, [paper](https://arxiv.org/abs/2504.19188)

hierarchical attention regularizer for lean theorem proving
- five proof-state levels: context < case < type < instance < goal
  - parsed by line patterns (turnstile = goal, `case`, `Type :` ...), inherited across multiline statements
- loss penalizes attention flowing from higher to lower levels
  - mask M_ij = 1 iff level(ti) <= level(tj), penalty ReLU(att)(1-M)
  - layer weight alpha_l = 1 - l/L, stronger in early layers
  - total loss = cross-entropy + lambda * flow loss
- setup: pythia-2.8B, 169,530 LeanDojo samples, 3 epochs, ~40h on 8 A800
- results at K=64, best-first search
  - miniF2F test 29.51% -> 31.56%, validation 31.56% -> 34.02%
  - proofnet test 13.56% -> 15.25%
  - proof length ratio 0.76 on miniF2F test (only theorems both solve with different lengths)
- ablations
  - five levels beat merged t1-t3 on pass rate
  - explicit text level tags worse than baseline
  - layer-wise weighting helps pass rate slightly
- limits
  - lean-specific, fixed hierarchy, only small model
  - search budget definition inconsistent between section 5.1 and appendix
  - verus adaptation untested
