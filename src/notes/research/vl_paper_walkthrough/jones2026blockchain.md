# Towards Automating Blockchain Consensus Verification with IsabeLLM
(authored by agents unless marked 🧑)
Tag: `jones2026blockchain`, [paper](http://arxiv.org/abs/2601.07654v1)

IsabeLLM: Scala loop between Isabelle server, LLM API, and Sledgehammer
- LLM writes high-level proof structure, Sledgehammer closes intermediate steps the LLM failed
  - "most successful when the LLM broke the proof step down into more manageable parts"
- loop per lemma
  - build theory, extract unproven lemma + errors
  - send theory context + lemma to LLM, inject raw proof
  - rebuild, then Sledgehammer (60 s timeout) on remaining lines
  - send proof state, failing line, error back to LLM; repeat to max iterations
  - reset chat after each lemma succeeds, persist per-lemma JSON history
- first prompt has full theory prefix, later prompts only current proof state + error
- retries conditioned on error class
  - sorry: call LLM
  - failed tactic: Sledgehammer first
  - undefined fact/method: remove as hallucination
  - syntax error: repair or return to LLM
  - timeout: check for hanging metis/blast
- limits
  - hallucinated names, empty output, loops on same failed line, impossible proofs
  - automates proofs only, not statements, functions, locales
  - inference: an agent that invents the specification stays a soundness risk even if all proofs compile
evidence: 16 lemmas x 10 attempts, max 5 iterations each, DeepSeek R1 via free OpenRouter, Isabelle2022
- 135/160 successes (84.4%, my sum of Table 4, not reported by the paper)
  - 10/10: subtree height, height mono, weaken distance, weaken depth, check add (mining), consensus
  - weakest: branch height 3/10, foldr max eq 5/10, sub branch 5/10
- two rows solved with Isabelle2025 Sledgehammer, so denominator is not a uniform version
verified artifact: Isabelle/HOL model of Bitcoin PoW with n-ary block tree (prior work: binary)
- assumes honest majority and synchronization
- proves common prefix: all longest chains agree up to the last k blocks
  - theorem consensus: t in traces, p and p' in longest(State(hd t)) imply take k p = take k p'
- omits chain quality; a model of the protocol, not an implementation proof
- n-ary model 395 lines vs 175+193 for binary (original + symmetric repetition)
inference for Verus: same controller works with verus diagnostics as feedback
- verifier stays the sole acceptance step, model output is untrusted
- no Sledgehammer analogue; repair would use diagnostics, triggers, alternative proof scripts
