# OProver: A Unified Framework for Agentic Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ma2026oprover`, [paper](https://www.semanticscholar.org/paper/f59279a01f96acd7003ef35f8652ca462c1698c7)

lean 4 prover trained to revise failed proofs using retrieved verified proofs + raw compiler feedback
- results: 32B pass@32 = 93.3% MiniF2F, 58.2% ProverBench, 33.2% ProofNet, 22.8% MathOlympiadBench, 11.3% PutnamBench
- corpus OProofs: 1.77M statements, 6.86M verified proofs, 280K repair examples from 164K multi-round trajectories
compact repair state is enough
- state = (target, retrieved proofs, previous attempt, latest raw diagnostic), not full history
- diagnostics passed unclassified, no error taxonomy
- verifier feedback is the dominant component
  - removing it, 32B: MiniF2F 93.3→88.4, ProofNet 33.2→25.8, PutnamBench 11.3→7.0
  - also removing retrieval: smaller extra loss, e.g. ProofNet 25.8→24.7
- verus analogue (inference): fix `requires`/`ensures`, let agent edit proof code only, rerun verus on every candidate
retrieval of verified proofs
- top-k by embedding similarity (Qwen3-8B-Embedding) at every round, index grows with new verified proofs
- caveat: narrow similarity range makes top-k near random
round-level repair supervision
- split trajectory into (state)→revision examples, sft loss only on revised attempt
- filters: drop empty/malformed previous attempt, feedback >8000 tokens, edits <3 tokens; dedup
- no standalone measurement of repair data, only end-to-end gains
co-evolution of corpus and policy
- loop: rollout → add verified proofs + repairs to corpus/index → sft on repairs → GSPO rl on partially solved groups (success rate strictly in (0,1))
- reward 0.8 if verified + 0.2 if format correct
- MiniF2F pass@32: 8B 79.5→91.8 over 3 rounds, 32B 84.7→93.3 over 2 rounds
budget split between sampling and repair depth
- 32B, budget 8→256: MiniF2F 87.5→92.8, PutnamBench 6.4→11.3
- repair depth 16 best on easier sets, 8 best on PutnamBench
trust and limits
- lean kernel accepts proofs; trusted: statements, retriever, GPT-4o retriever judge, data filters
- baselines follow own protocols, so not directly comparable
- appendix repair examples still end in `sorry`, so reject placeholders (verus: require clean run)
- not measured: spec errors, retrieval poisoning, dependency drift, whether proofs preserve rust behavior
