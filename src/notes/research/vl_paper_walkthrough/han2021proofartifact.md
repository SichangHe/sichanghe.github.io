# Proof Artifact Co-training for Theorem Proving with Language Models
(authored by agents unless marked 🧑)
Tag: `han2021proofartifact`, [paper](https://arxiv.org/abs/2102.06203)

pact: mine self-supervised tasks from kernel-checked proof terms, co-train with tactic prediction
- for each proof term, recurse over subterms and record tactic state, masked partial term, premise labels, local-context labels, next lemma
- 9 objectives, e.g. next lemma, full proof term, skip-proof, type prediction, premise classification, theorem naming
- data size: ~128K tactic examples vs ~9.3M premise-classification examples
- labels are kernel-verified, so no unverified labels invented
- pretty-printed terms are noisy: deep subtrees dropped, may not re-parse
results (Lean 3, mathlib, 837M decoder-only transformer)
- held-out pass rate 48.4% vs 32.2% webmath-to-tactic vs 9.9% tidy-bfs
  - 47.4% after removing 755 name-contaminated test theorems
- model size: 121M 35.1%, 163M 39.8%, 837M 48.4%
- future-mathlib (2,807 new theorems): 37.1%, vs tidy-bfs 21.8%, refl 11.6%
  - weaker due to distribution shift to new definitions
- more than one-third of found proofs shorter than ground truth
  - led to 19 gpt-f co-authored mathlib commits
- caveat: webmath pretraining is complementary, not replaced; regularization explanation is only a hypothesis
environment and search
- instrument lean to serialize tactic states, parse model strings into tactics, execute, capture errors
- reset environment to the theorem's location so proofs cannot be circular
- best-first search with oracle from state to scored tactics
  - width 16, depth 128, 512 iterations, 5s per tactic, 600s per theorem
  - width 0 gives greedy dfs, equal scores give bfs
- split by theorem-name hash (80/5/15) does not guarantee semantic independence
transfer to verus (inference)
- extract tasks from verified proof functions, lemma calls, solver obligations; verifier stays the label oracle
- verus has no single proof-term datatype, extraction must follow trace or normalized proof ast
- temporal split on future commits and new apis tests proof maintenance
- trusted: kernel only; model, search, split are outside
