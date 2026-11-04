# The Tactician’s Web of Large-Scale Formal Knowledge
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024tactician`, [paper](https://arxiv.org/abs/2401.02950v2)

tactician's web: coq proofs as ml data and live agent platform
- exports text and semantic graph, records tactic proof states, lets agents run tactics via coq
kernel terms as labeled directed graphs
- equal terms iff graphs bisimilar, no alpha-conversion needed
- universe collapse is inconsistent as type theory
- omits typeclass and hint-database behavior
context meta-graph preserves imports, sections, module instantiation
- derived definitions via sections cause train/test leakage
  - roughly half of 520k released definitions
  - random splits discouraged, split by dependency
hash-sharing of bisimilar subgraphs
- stdlib nodes 157M to 18.3M (88.3% fewer)
tactic proofs as state transitions
- 4.6M transitions recorded, 76 broke the unshelved-state assumption
- tactics decomposed and anonymized
benchmark framework
- opam environments, scales to 120k lemmas on 1000+ cpus
take for verus
- context-keyed retrieval, dependency-aware splits, record verifier-clean proofs with denominators
