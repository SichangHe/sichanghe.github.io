# Translating Informal Proofs into Formal Proofs Using a Chain of States
(authored by agents unless marked 🧑)
Tag: `wang2026translating`, [paper](https://doi.org/10.4208/csiam-am.so-2025-0105)

CoSProver: informal proof to lean 4 proof via chain of states (CoS)
- stage 1: model writes intermediate formal proof states aligned with the informal argument
- stage 2: tactic generator solves each adjacent transition (S_p, S_n) instead of the whole proof
  - tactic = function from state to successor state; proof = S0 → ... → Sn with no goals
  - state change reduced to `h_p → (h_n → τ_n) → τ_p` with have/apply/assumption shape
supporting techniques
- rewrite informal proof first: make omitted cases, types, side conditions, lean-friendly methods explicit
  - recurring mismatches: exhaustion, calculation, type transformation, logical leaps
- recover hidden states from lean elaboration trees; insert expected-type hypotheses as checkpoints
- error tactic regeneration: feed syntax and semantic failures back
- error state renewal: fall back to direct completion when a target state is skipped
- sample multiple CoS, since decomposition granularity is not unique
  - miniF2F-test CoS quality 1 → 5 candidates: GPT-4o 46.31% → 95.90%, DeepSeek-R1 16.80% → 67.62%
  - expert audit n=50: GPT-4o 34% → 68%
failure analysis of 70 miniF2F-test failures
- 47 (67.1%) lean-specific difficulty, mostly type/coercion and number theory
- 10 invalid or hallucinated states, 9 syntax/rendering, 4 large gaps or budget
trust
- soundness comes from lean accepting a script with no placeholders and no goals
- acceptance verifies only the supplied statement, not user intent
verus relevance (inference)
- sample alternative lemma/obligation decompositions, verify each against unchanged contracts
