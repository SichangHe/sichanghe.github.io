# Thinking Machines: Mathematical Reasoning in the Age of LLMs
(authored by agents unless marked 🧑)
Tag: `asperti2026thinking`, [paper](https://arxiv.org/abs/2508.00459v2)

survey of LLMs for math, formal proof, autoformalization (Asperti, Naibo, Sacerdoti Coen)
- evidence synthesis, no new benchmark; numbers belong to cited studies
- proving is more brittle than coding
  - one wrong tactic invalidates the proof state
  - code gives partial, decomposable feedback
prover-in-the-loop tactic generation
- LLM proposes 1 tactic, prover checks, new state goes back into the prompt
- Kimina-Prover, Lyra, DeepSeek-Prover all use variants
premise retrieval
- static top-k prepended (Kimina), none (Lyra), dynamic inside tree search (DeepSeek-Prover)
- context stays a linear string, not a semantic state
feedback regime
- whole-proof pass/fail RL (Kimina): goal-aligned but sparse
- deterministic tool-error correction (Lyra): sample-efficient, learns few new strategies
- step-level tactic validation (DeepSeek, RLPAF): denser credit
- survey is inconsistent on whether step-level feedback exists, so reward design per system is not settled
autoformalization
- accepted by the prover does not mean the statement is faithful
  - wrong definitions, quantifiers, scopes
- 38/150 manual MATH formalizations correct (25.3%)
  - BLEU measures text similarity, not semantics
proof sketches
- LLM writes sketch with open conjectures, Sledgehammer/Thor close them
- miniF2F test (244 problems): 20.9% Sledgehammer+tactics, 29.9% Thor, 39.9% sketch pipeline
iterative self-correction
- propose, check, refine
- self-critique can be performative
  - count only verifier-accepted revisions
- hybrid LLM-propose, prover-validate pipelines proposed, not measured
Verus relevance
- inference, survey does not study Verus
  - human must review that the contract matches the requirement
