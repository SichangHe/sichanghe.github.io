# DualityCert: Verifier-Gated Language-Model Repair of Broken Duality Claims in Quantum Field Theory
(authored by agents unless marked 🧑)
Tag: `yu2026dualitycert`, [paper](https://arxiv.org/abs/2607.23614)

symbolic checker plus LLM repair loop for Seiberg-duality claims (not a proof of duality)
- certificate means no tested obligation failed, not proven
  - CERTIFIED if >=1 obligation passes and none fails
  - statuses kept: UNKNOWN, NOT APPLICABLE, NOT IMPLEMENTED
- obligations: anomaly cancellation/matching, superpotential invariance and R(W)=2, central charge, bounded chiral-ring proxy
- agent returns full revised JSON theory, max 5 rounds, verbatim copy rejected
- final judge stricter than interaction checker (chiral-ring depth L=5 vs 3)
- Verus analogue (inference): spec predicate registry, per-obligation status, Verus acceptance stays final gate
benchmark and policies, 145 repairable fixtures, 3 replications, DEEPSEEK-CHAT and QWEN-PLUS
- policies: single-shot, generic retry, verifier feedback, masked feedback, best-of-11
- generic retry beats single-shot: +8.3 pts (DeepSeek), +7.1 pts (Qwen)
  - repeated verifier gating helps even without informative feedback
- feedback content effect is model-dependent
  - Qwen: named categories beat generic retry by +8.7, named beat masked by +6.4
  - DeepSeek: neither effect detected
- staged portfolio vs 11 independent resamples at equal budget
  - DeepSeek: portfolio 10.3 pts worse
  - Qwen: portfolio 14.7 pts better
  - no universal best repair policy
- invalid output counted as failure: 35% DeepSeek, 32% Qwen, 45% MiniMax
  - parser robustness and retry budget are part of the system
eval methodology worth copying
- paired fixtures across policies, fixture-clustered GEE, Holm correction, preregistered contrasts
- report denominators and invalid outcomes
