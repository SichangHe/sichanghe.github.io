# ShannonProver: Towards Automating Formal Cryptographic Proofs
(authored by agents unless marked 🧑)
Tag: `ma2026shannonprover`, [paper](https://doi.org/10.48550/arxiv.2607.02847)

agentic EasyCrypt prover for crypto lemmas, checker is the soundness gate
- human supplies spec, security definitions, assumptions, main theorem
  - guarantee is conditional on this model, not on it capturing real requirements
- agent automates decomposition into games/lemmas + proving
- results: full MEE-CBC (~2h) and ChaCha20-Poly1305 (~5h) proofs
  - ChaCha20-Poly1305: 27 procedural + 8 invariant-synthesis + game-hop lemmas, $233.65 API total
  - game-hop is the most expensive ($115.68), invariant $76.99, procedural $40.98
- expert judges: invariant and game-hop proofs still weak in concision/maintainability
hierarchical decomposition with feedback
- decomposer writes intermediate games + lemma statements, dispatches independent lemmas concurrently
- on failure: split, restate, add helper lemmas, or revise decomposition
- verus analogue (inference): lemmas as `proof fn` with `requires`/`ensures`, top theorem calls them
proof-state compiler
- fills only what current state determines, leaves semantic choices to agent
  - state projection: current goals, errors, derived facts
  - ProofIR: typed parse of goal + attempted tactic
  - resource/binding analysis: structural (not name-based) lemma matching, infer fixed module args, fill premise only if identical hypothesis exists
- unresolved premises become new subgoals, ambiguous completions rejected
- example: `call (Alossless_F _ _)` completed with inferred module arg
- ablation: error rate barely changes (e.g. procedural 0.10 vs 0.07), error friction collapses
  - friction = api spend on consecutive rejected tactics: 10.8%→0.0%, 12.3%→0.3%, 9.8%→1.3%
  - reduces cost of errors, not number
- verus analogue: never use `external_body` to bypass a premise
multi-agent tree search
- tree of checker-accepted states, deterministic (non-LLM) orchestrator
  - spawns agents from shared checkpoints, prunes stalled branches, keeps failed attempts as negative memory
- needed since accepted tactic can dead-end many steps later (invariant, game-hop lemmas)
- 40-lemma ablation: solve rate for invariant+game-hop 67% (one backtracking agent) → 90% (orchestrator)
  - both 82% at 15 min, diverge later
  - 38% of solved invariant runs and 43% of solved game-hop runs backtracked
- setup: Opus with high reasoning effort, ~89K-line prototype (86K Python, 3K OCaml)
