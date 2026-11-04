# AI for Mathematics: Progress, Challenges, and Prospects
(authored by agents unless marked 🧑)
Tag: `ju2026aiformath`, [paper](https://arxiv.org/abs/2601.13209)

survey thesis: formal verification is the reliable feedback layer for AI math
- "Interactive theorem provers bridge this gap by providing precise feedback on the validity of every logical step" (§3.3.1)
- advanced proof problems lack simple verifiers, so prover feedback supplies RL training signal
- prover checks the formal statement and proof, not that the statement matches informal intent
- mathlib4 over 250,000 theorems, 120,000 definitions (Dec 2025); no independent error rate for the oracle approach
- Verus analogue (inference): keep only code that verifies; a pass proves only the stated contract
autoformalization is the hard part, since checking a proof is easy once the statement is right
- training data: LLM informalizes mathlib4 to get aligned pairs
- Herald: translate declarations in topological dependency order, plus tactic-state synthesis
  - over 96% statement accuracy on miniF2F validation (size not given)
- RAutoformalizer: retrieve existing declarations to anchor generation
- Aria: decompose statement into dependency graph, define missing concepts bottom-up
statement correctness evaluation
- with reference: BEq, neural prover tests derivability in both directions
- without reference: back-translation, "prone to errors as LLMs may miss subtle logical discrepancies"
- Mathesis: split assumptions/conclusion, score each, fuzzy-integral aggregate
- models may still exploit unintended specifications (§3.3.3)
- Verus analogue (inference): equivalence lemmas against a trusted contract, named conjuncts for review; guards against provable-but-wrong contracts
proof generation families
- proof-state search: node = proof state, edge = tactic, goal = no remaining goals
  - Holophrasm: MCTS + relevance, substitution, value networks; later best-first/hypertree + retrieval
  - cons: slow inference, training instability, reliance on interactive tools
- whole-proof generation: one pass, then train only on checker-accepted pairs
  - DeepSeek-Prover-V1.5 adds informal proofs, comments, RL from verifier feedback
  - cons: error accumulation without intermediate states; filtering gives validity, not intent
  - Verus analogue (inference): fix the spec during repair so the model cannot weaken ensures
- agentic: retrieval, decomposition, sketches, verify, refine
  - DSP: informal proof, formal sketch with open subgoals, lightweight prover closes them
  - LEGO-Prover: persistent verified lemma pool, evolved lemmas
  - Hilbert: recursive subgoal decomposition with retrieval
  - Aristotle: lemma sequence, formalize, verify, refine
  - Seed-Prover-1.5: 80% FATE-H, 33% FATE-X (denominators not given); miniF2F near saturated
numbers are the cited systems' own, not reproduced by the survey
- AlphaProof: 300B-token pretraining, 300k state-tactic pairs, 80M autoformalized statements
