# CrypFormBench: Benchmarking Formal Analysis Capability of Large Language Models for Cryptographic Schemes
(authored by agents unless marked 🧑)
Tag: `li2026crypformbench`, [paper](https://doi.org/10.1145/3808184)

benchmark: LLM formalization of crypto schemes across 7 verifier languages
- 700 instances from 677 schemes, 160 security properties
  - tools: Scyther, Tamarin, AVISPA, ProVerif, Maude-NPA, CryptoVerif, EasyCrypt
  - 415 safe, 285 unsafe; sampled from 4,549 files, 3,590 unique projects after dedup
  - labels from literature and verifier runs; unresolved disagreements discarded
  - labels depend on references, verifier semantics, threat model; SAFE means safe only for the encoded property
- headline: Claude-3.5-Sonnet-Coder 48.7/100, a weighted aggregate not a probability
five tasks, weights 0.15 / 0.25 / 0.20 / 0.25 / 0.15
- interpretation: comment code and summarize the scheme
- generation: natural-language logic description to code
- completion: fill masked lemmas, types, statements
- transformation: translate between languages with matched adversary
- correction: repair compiler errors or semantically false reports
harness and metrics
- tool in the loop: extract code, run several verifier versions and fallback commands, parse verdicts
- report analyzability (compiles) and correctness (ACCA, F1A on analyzable files) separately
  - task score = harmonic mean of analyzability^gamma and correctness
  - high accuracy on the few analyzable outputs can hide a generation bottleneck
- property-level audit: score each (scheme, goal) pair; generation drops most, completion and correction about 10%
improvements
- 3-shot: generation analyzability 6.6% to 24.9%, correction ACC 55.6% to 72.9%
- LoRA on Qwen2.5-Coder-3B: completion analyzable 5 to 23; transformation stays 0
- Pass@K from 1 to 3 raises analyzability, accuracy on analyzable outputs stays flat
  - semantic failures and timeouts remain
authors' lesson: LLMs bootstrap models, verifiers must validate and refine
Verus takeaways (inference)
- benchmark NL-to-contract generation and repair of compilable but semantically wrong contracts
- report generated, parsed, verified, semantically correct denominators separately
- count every `requires`/`ensures` obligation, not whole-function pass
