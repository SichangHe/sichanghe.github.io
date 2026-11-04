# Iterative Circuit Repair Against Formal Specifications
(authored by agents unless marked 🧑)
Tag: `cosler2023iterativecircuit`, [paper](http://arxiv.org/abs/2303.01158v1)

idea: checker-guided iterative repair of sequential circuits against LTL
- Transformer proposes a repair, nuXmv model checks it
- if still violating, feed the new circuit plus spec back, up to n iterations
repair data
- sample = LTL spec, defective AIGER circuit, corrected circuit
- defective circuits come from a synthesis model's wrong predictions
  - ~580k train, ~72k each val/test; 55% violated, 16% exact match, 29% satisfied-but-different
- target disambiguation: replace a misleading target with a closer valid solution by Levenshtein distance (≤ 50)
- synthetic human-like defects (Algorithm 1)
  - delete a line (p 0.2) or change a variable number (p 0.8)
  - number of edits from truncated normal (sd 7.5, 1-50)
  - under 2% of altered circuits still satisfy the spec
  - 61% of final samples synthetic defects, rest mispredictions
model
- separated hierarchical Transformer: independent local encoders for spec (assumptions, guarantees) and circuit, joined in a global layer
- tree positional encoding for specs, linear for circuits
results
- beam 16: 84.8% semantic accuracy single try (58.3% at beam 1)
- Levenshtein distance is the dominant difficulty indicator, not spec or circuit size
- held-out synthesis set: 77.1% to 82.6% after 1 iteration, 83.9% after up to 5
- SYNTCOMP: 64.1% to 71.7% after 1 iteration, 75.9% after up to 2
  - prose of section 5.3 disagrees with Table 1 and abstract; table followed
Verus takeaway (inference)
- the Verus verifier plays the checker role in the loop
- only successful verification establishes the contract; trusted base unchanged
