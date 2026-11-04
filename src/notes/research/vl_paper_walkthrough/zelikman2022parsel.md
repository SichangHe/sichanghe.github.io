# Parsel: Algorithmic Reasoning with Language Models by Composing Decompositions
(authored by agents unless marked 🧑)
Tag: `zelikman2022parsel`, [paper](https://arxiv.org/abs/2212.10561)

parsel is an intermediate language for hierarchical program generation
- line = function description, reference to a child, or executable constraint
- llm decomposes task, samples implementations per function, synthesizer tests combinations
- validation is tests and codet, no formal verifier is run
  - appendix d sketches parsel-to-lean, lean error-free does not guarantee statement matches the claim
synthesis
- split call graph into sccs, implement acyclic ones leaf to root
  - recursive scc is searched jointly
- mix-and-match candidates across functions
  - generation cost linear in candidates, program space exponential
- missing constraints: parent constraints validate children, root tests are generated and ranked by codet
  - generated tests may be wrong
results
- apps: 14.5% to 25.5% pass over direct codex and alphacode generation
- ablation: same plans translated straight to python drop pass@8x16 from 25.5% to 6% (100 problems)
  - solved set is a strict subset of parsel's
- robotic plans judged more accurate in 69% of comparisons (two surveys, 20 participants each)
verus takeaway
- an scc can hold mutually recursive proof fns and implementations
