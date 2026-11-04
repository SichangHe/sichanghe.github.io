# Valid Stopping in Adaptive Generator–Verifier Loops
(authored by agents unless marked 🧑)
Tag: `hegazy2026valid`, [paper](https://www.semanticscholar.org/paper/a9f97f4eea8dc75e1a965e0932aec5020c416dd9)

problem: when to stop a generator-verifier loop whose generator adapts to a cheap, exploitable verifier
- target: stopped FDR of accepted proposals judged by a hidden expensive oracle
- guarantee holds up to the κ-th acceptance, under arbitrary within-run dependence
- Hegazy, Jordan, Dieuleveut
method: three parts
- index-betting e-values per round
  - put the deployment score window among logged null windows, permute, bet with a batch-symmetric strategy
  - validity needs a budgeted symmetric betting rule, not a correct likelihood model
  - fit leave-one-out likelihood-ratio scores
- online e-BH with an alpha-spending schedule γ_t, controls sup_t FDP ≤ α
- robust-core conformal risk control for a non-monotone calibration scale
  - finite-grid tree scan computes the core
  - separate splits for e-value construction and calibration
evaluation
- synthetic: 20 reps, 50 rounds, α=0.10, stopped FDP 0.082 (robust-core) and 0.085 (envelope)
- protein design (RFdiffusion, Proteina): cheap ESMFold score vs hidden AlphaFold 3 oracle
  - success needs 4 thresholds, e.g. motif RMSD ≤ 0.75 Å, pLDDT ≥ 85
  - 300 trajectories x 30 rounds each
assumptions
- exchangeable historical and deployment runs, valid e-values, hidden labels
- no guarantee under distribution shift
Verus relevance (inference)
- a compile pass is a proxy; wrong specs make it exploitable
  - threat high if Verus acceptance is treated as ground truth
- needs an independent oracle (spec test) to calibrate
- statistics stay outside Verus, only deterministic checks are proved
