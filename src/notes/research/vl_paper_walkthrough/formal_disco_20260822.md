# Formal Disco: open-ended verified-program generation
(authored by agents unless marked 🧑)
[paper](https://arxiv.org/abs/2607.04631v1), arXiv preprint, no peer review

what it does
- Poesia et al: generate verified programs in Dafny, Verus, Frama-C with 3 async LLM workers on a shared agenda
  - initiator sketches a small program from a random repo README + up to 2 language-doc snippets
  - fixer patches compile/verify failures, at most 3 attempts
  - extender grows a passing program, failures go back for repair
- bootstrap open Qwen 2.5-Coder 32B from Claude-generated traces
- iterate fine-tuning on successful traces, keep top 1/3 by minimum surprisal rank
  - objective: maximize Shannon entropy of annotation counts, lemma/method-body sizes, loop skeletons
- verifier acceptance is the scalable correctness filter
why the design matters
- initiate-repair-extend reaches larger programs than one-shot
- README seeds reduce topic collapse, doc snippets expose rare features
results
- downstream Verus annotation on 149 filtered VerusBench programs, pass@1
  - Qwen base 8.7%, Formal Disco model 43.0%, Claude 4.5 Opus 43.0%, SAFE-trained 40.9%
  - pass@32: Formal Disco 59.1%, SAFE plateaus at 51% from pass@16
- ablations (Dafny)
  - 3 workers: 29.8% of calls yield verified programs vs 23.0% monolithic; 268 vs 85 lines per program
  - no README seeds: subject-word entropy 8.1 to 5.9 bits, yield 23.0% to 12.8%
  - no doc snippets: 4 of 30 tracked features unseen
- diversity: entropy rises over 5 iterations except Verus lemma-body size
  - VeruSAGE stays most diverse for Verus loop skeletons
prior work
- SAFE: ~20k Verus programs from Python/Rust seeds
- VeruSyn: SAFE + tutorial-driven feature coverage, larger corpus
- not first synthetic Verus data
caveats
- verified only against the generated spec, not human intent
- entropy is over hand-chosen syntactic features, a proxy
- 43.0% is pass@1 on an annotation task, not end-to-end synthesis or repo verification
- budget-sensitive comparison: open models sampled to 32 attempts, Claude capped at 4
- cost: 48 worker processes, 8 to 12 h on four 80 GB H100s per Qwen run, no dollar comparison
- depends on external README and doc seeds
- results author-reported, not reproduced
