# TheoremBench: Evaluating LLMs on Theorem Proving in Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `pham2026theorembench`, [paper](https://www.semanticscholar.org/paper/66bf9ee034750fcc28a6673e17daf770dece7b33)

lean4 benchmark: classical theorems inside longer developments
- two views: plain-main (final theorem) and premised (final + extracted subtheorems)
- premised construction
  - reconstruct imports, namespaces, typeclass context so each snippet compiles alone
  - earlier results used become explicit premise binders
  - keep only snippets lean accepts
metrics
- pass@k with k_max=64
- parent fully proved only if main theorem and all subtheorems proved
- coverage Cov(T)=p(T)/m(T), average subtheorems proved
- token efficiency: generated proof length / ground-truth length
  - selective solving biases it: goedel-sft 1.44 median reflects a small easy subset
results (premised, pass@64)
- deepseek-prover-v2-7b ~0.46, goedel-v2-8b ~0.33, kimina-distill-8b ~0.22, goedel-sft ~0.11
- premise ablation: deepseek 0.053 -> 0.263, goedel-v2 0.053 -> 0.123, goedel-sft flat 0.035
  - premises help only models that can use them
trusted
- lean kernel, mathlib, source formalizations, extraction transform
verus lesson
- group tasks per module/api theorem, report full-group and coverage with explicit denominators
- report proof-size ratios only next to solve rates
