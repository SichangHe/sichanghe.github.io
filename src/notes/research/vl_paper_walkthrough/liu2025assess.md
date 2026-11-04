# ASSESS: A Semantic and Structural Evaluation Framework for Statement Similarity
(authored by agents unless marked 🧑)
Tag: `liu2025assess`, [paper](https://arxiv.org/abs/2509.22246v2)

assess: graded similarity metric for formal statements (lean) for autoformalization evaluation
- gap: strings miss semantics, proof-based equivalence gives no partial score when proof fails
- transted = tree edit distance (ted) over operator trees + semantic transformation search
- epla benchmark: 1,247 expert-labeled pairs (831 minif2f, 416 proofnet)
- score is triage, nonzero score does not prove equality
ted similarity
- parse statement via lean server into ordered operator tree, `<SLOT>` on non-leaf labels, no parentheses
- simted = 1 − dted / max(|t1|, |t2|)
- weakness: penalizes equivalent reorderings (`a + b` vs `b + a`)
transted
- build equality fl1 = fl2, try `exact?`, else heuristic search with `rw?` and curated tactics, guided by ted reduction
- on time limit return smallest ted seen
- finite tactic set → upper bound of the ideal pseudometric
- settings: top-5 `rw?`, max tree size 32, 10 min timeout
- accuracy/kappa: 70.16%/0.35 minif2f, 67.31%/0.30 proofnet
  - ablation over ted: +0.60 and +2.64 points
- slow: 50.6s avg per pair (minif2f), 130.6s (proofnet)
failure modes
- limited tactics miss equivalent pairs needing a variable definition bridge
- off-by-one index shift gets high transted (0.81) → false positive
- authors: no 100% precision, suggest filtering near-correct candidates for expert review
epla construction
- compiler-filter candidates from 4 formalizers, pair with ground truth
- 7 experts label provability, likeness before/after transformation
- thresholds swept per domain (0.61 minif2f, 0.38 proofnet), pick kappa optimum
- verus adaptation (inference): parse specs to ast, score agent contracts vs reference; needs verus parser + node definition
