# ProofNet: Autoformalizing and Formally Proving Undergraduate-Level Mathematics
(authored by agents unless marked 🧑)
Tag: `azerbayev2023proofnet`, [paper](http://arxiv.org/abs/2302.12433v1)

benchmark: 371 parallel (Lean 3 formal statement, informal statement, informal proof) triples
- sources: undergrad textbooks (Rudin, Munkres, Axler, Dummit and Foote, etc.) and Putnam
- curation rules
  - self-contained, naturally formalizable, low train-test overlap
  - exclude multipart, word problems, and statements already in mathlib
- supports 4 separable tasks
  - formal proving, informal proving, statement (auto)formalization, proof autoformalization
- only statement autoformalization is evaluated; formal proving left to future work
autoformalization baselines (statement level)
- few-shot Codex (code-davinci-002): typecheck 23.7%, expert-judged accuracy 13.4%
  - proofGPT 1.3B/6.7B: accuracy 0%
- prompt retrieval: embed first guess, retrieve 4 nearest mathlib statements (k=4, K=90,530), regenerate
  - Codex typecheck 45.2%, accuracy 16.1%
  - BLEU drops over 10 points while accuracy rises, so BLEU is a bad proxy
- distilled backtranslation: teacher LLM writes informal text for mathlib theorems, fine-tune student on 90,530 pairs
  - proofGPT 1.3B: typecheck 19.4%, accuracy 3.2%, above its few-shot result
lessons
- typechecking does not imply faithful semantics
  - no automatic check that two non-definitionally-equal statements mean the same, so human experts judge
  - typecheck rate correlates with accuracy, so it is a cheap proxy
- Verus transfer (inference)
  - same pairing/anti-overlap discipline for a contract-synthesis benchmark
  - verified contract only proves the generated contract, so semantic review still needed
