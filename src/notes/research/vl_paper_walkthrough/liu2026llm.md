# LLM-Assisted Automatic Security Proofs for Cryptographic Protocols: How Far Are We?
(authored by agents unless marked 🧑)
Tag: `liu2026llm`, [paper](http://arxiv.org/abs/2609.35434v1)

llms writing tamarin security lemmas for 18 crypto protocols (secrecy, authentication, sanity)
- crost = coverage rate of solve tree, tool-grounded metric instead of text similarity
  - run tamarin autoprove on reference and generated lemmas, normalize solve constraints (alpha-rename, canonical order)
  - target path covered if it is a subsequence of some generated path
  - crost = 1 only means sufficiency, not semantic equivalence of lemmas
  - needs fixed tamarin version and heuristics, else the tree changes
  - verus analogue would need a stable proof-obligation artifact, which is not established
- minimal-generator analysis models which solve items are prerequisites
  - predecessor hit then continuation probability, rho_b ≈ 0.513 in one experiment
- few-shot prompting (1-4 rule/lemma examples) raises syntax success
  - qwen3-coder-plus +30.4 points over zero-shot
  - grok-4 74/75 compile, gpt-5.2-codex 114/118
- crost validated against mutants that inject protocol flaws
  - correlation with mutation flip rate 0.75, p = 0.005
  - handcrafted mutants miss the full vulnerability spectrum
- capability is low and verification is costly
  - top 4 models mean crost 38.82%, only 14.4% of lemmas exceed 80% coverage
  - repeated sampling (deepseek-v3.2) 239 to 2672 lemmas gives ~+24 points, plateaus after run 8
  - failure mode: stage-point confusion, e.g. AcceptP2 matched to wrong phase's AcceptS
  - generated lemmas 4x-21x slower to verify than reference (2.51-6.79 s vs 0.66 s per lemma)
trust
- tamarin parser, semantics, fixed proof-search config, reference lemmas, mutation design
