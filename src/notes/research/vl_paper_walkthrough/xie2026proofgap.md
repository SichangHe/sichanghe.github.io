# ProofGap: Benchmarking Step-Level Formal Reasoning with Local Obligations Derived from Natural-Language Solutions
(authored by agents unless marked 🧑)
Tag: `xie2026proofgap`, [paper](https://www.semanticscholar.org/paper/40ba9037a532b4c46d707271fff34d093ae311a8)

benchmark of local proof gaps from textbook solutions, Lean only
- 3,015 analysis exercises -> 26,116 gaps (8.66/exercise, 8.33 assumptions/gap)
- gap = local goal under earlier-established facts, not whole theorem
- gap Pass@8 (all 26,116): Goedel-V2-8B 35.39%, DeepSeek-Prover-7B 33.27%, Kimina-Distill-8B 31.99%
  - same models on 3,015 parent theorems: 4.28%, 3.32%, 2.92%
- ProofGap-280: GPT-5.6-sol and Claude-Opus-4.8 87.86% gap Pass@8 but 21.43% and 13.93% parent Pass@8
  - local context makes steps far easier than whole proofs
pipeline: nl solution -> Relaxed NFL -> Core NFL -> gaps
- Relaxed NFL keeps proof structure (`GIVEN`, `TO PROVE`, `Have`, `Assume`, method hints)
  - screening checks consistency only, not full semantic equivalence
- elaboration to Core NFL: recover variable scopes, disambiguate notation, split compound claims
  - deterministic rewrites where possible, constrained LLM choice checked programmatically
- each constructor (Forward, Backward, Subgoal, QED) yields one `Γ ⊢ G` gap
  - each gap independently checkable, failure maps to a source step
- Lean translation cross-reviewed by multiple LLMs, ambiguity escalated to humans
replayable DSL + verifier-guided repair
- 18-command checker with capture-avoiding substitution, rejects unsupported solver input, all branches must close
- autosolve closes 2,838/26,116 (10.87%), workflow adds 4,889, total 7,727 (29.59%)
- workflow: pinned versions, isolated attempts, record first failure, FAST then DEEP escalation, admit-free replay, semantic audit
limits
- one analysis textbook, Lean only
- does not measure autoformalization, invalid-step detection, end-to-end proof composition
Verus takeaways (inference)
- one `proof fn` per source step with `requires` facts and `ensures` goal
- explicit binders and domains matter, Verus fails on implicit ones too
- pass is not evidence the spec matches intent
