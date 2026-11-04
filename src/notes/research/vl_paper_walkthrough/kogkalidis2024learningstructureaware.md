# Learning Structure-Aware Representations of Dependent Types
(authored by agents unless marked 🧑)
Tag: `kogkalidis2024learningstructureaware`, [paper](https://arxiv.org/abs/2402.02104v2)

premise selection for Agda: rank in-scope lemmas likely to fill a proof hole
- AGDA2TRAIN: Agda backend dumping type-checked proof states as JSON
  - stops at every possible proof subterm, records missing term + full typing context
  - labels = lemmas occurring in the hole's filling term, an imperfect relevance proxy
  - limits: Agda 2.6.3/stdlib 1.7.2, exponential extraction cost on some modules, no decomposition of literals/sorts/levels
- QUILL: structure-based (not name-based) encoder of dependent-type ASTs
  - requires completeness and α-equivalence invariance
alpha-equivalent representation
- binarized type ASTs; hole context folded into nested dependent functions
- de Bruijn index resolved to binder node, relative-position matrix applied to a trainable embedding
- cross-lemma references via dynamic table, built in topological dependency levels
- limit: 18 files with mutual induction rejected (cyclic references)
efficient structured attention
- linearized attention with 2nd-degree Taylor feature map
- binary-tree positional encodings, relative AST paths via orthogonal matrices
- InfoNCE training, multiple positives, excludes lemmas not yet defined
results (481 train files/15,244 holes; 92 test files/4,120 holes)
- average precision 50.2 in-distribution, 38.7 stdlib OOD, 27.0 Unimath, 22.5 TypeTopology
  - R-precision 40.3 / 31.1 / 17.4 / 15.4
- ablations (in-distribution AP)
  - no Taylor 47.0, no tree positions 44.5, no variable resolution 35.8
  - all three removed 10.9, linear Transformer baseline collapses
- metrics measure lemma retrieval, not completed proofs
  - end-to-end proof completion left as future work
  - paper inconsistent on CI: four vs five runs, 95% vs 68%
for Verus
- inference: extract assert/lemma/`requires` state after successful verification as training data
- rank lemmas, instantiate top-k, run Verus; the model never bypasses a failed proof
