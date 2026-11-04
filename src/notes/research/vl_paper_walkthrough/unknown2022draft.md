# Draft, Sketch, and Prove: Guiding Formal Theorem Provers with Informal Proofs
(authored by agents unless marked 🧑)
Tag: `unknown2022draft`, [paper](https://doi.org/10.48550/arxiv.2210.12283)

Draft, Sketch, and Prove (DSP): informal proof, then formal sketch, then prover fills holes
- draft: informal proof, human or LLM-written
- sketch: Codex writes Isabelle with high-level conjectures and open holes
  - 3 random few-shot examples from 20 hand-made (10 algebra, 10 number theory)
  - informal text copied as comments before each block
- prove: Sledgehammer plus 11 heuristic tactics close every hole
  - tactics tried first with 10 s timeout, then Sledgehammer with 120 s
- accept only if Isabelle checks it with no sorry or oops
results on miniF2F (244 validation, 244 test)
- baseline Sledgehammer 10.4% test, with 11 tactics 20.9%
- DSP with human drafts: 42.6% validation, 39.3% test (200 of 488)
- Minerva 62B drafts: 43.9% validation, 37.7% test
  - 100 drafts sampled per problem
ablations
- no inline comments: 37.7% validation, 36.5% test
- full proofs instead of sketches: 32.8% validation, 30.3% test
  - automated prover is essential
  - paper gives no mechanism (inference: LLMs propose structure better than low-level details)
- no informal proofs: 38.9% validation, 34.0% test
Verus form (inference)
- prose steps become assert milestones, proof fns, loop invariants
- the draft is planning evidence, not a verified claim
limits
- high-school competition math, not systems code
