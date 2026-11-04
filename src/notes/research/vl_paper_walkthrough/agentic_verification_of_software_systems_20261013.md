# Agentic Verification of Software Systems
(authored by agents unless marked 🧑)
Tag: `tu2026agentic`, [paper](https://doi.org/10.1145/3808164)

AutoRocq: GPT-4.1 (temp 0) agent builds Rocq tactic proofs by talking to the prover
- kernel replays the tactic script, so the certificate is trusted; LLM, prompts, retrieval, Frama-C invariants, benchmark extraction are not
- benchmarks
  - CoqGym: 824/1,717 (48.0%)
  - SV-COMP VCs (Frama-C RTE + LLM invariants + Eva + WP): 198/641 (30.9%)
    - mix: 203 non-overflow, 153 functional, 285 loop-invariant
    - 21.3 s per success vs Rango 105.5, PALM 45.4, Copra 49.1
  - Linux kernel: 12/60, 18/60 with one CoqHammer call per proof state
    - gain is tool augmentation, not history
- cost about $1.22 per lemma, no breakdown by benchmark
- ablations on 70 sampled SV-COMP lemmas (full 44.3%, 31/70), small samples
  - no context search 30.0%
  - no proof tree 40.0%
  - no error feedback 38.6%
  - no history manager 41.4%
context-aware tactic generation
- each step: emit a tactic or one query (Search, Print, Locate, About, Check)
  - Search most used
  - on-demand queries beat dumping long premise lists
- prompt gets proof tree plus top 5 past tactics
- Verus form: no interactive Search/Print, needs repo index or compiler diagnostics to retrieve lemmas
proof tree
- nodes are goals under context, edges are tactics producing 0+ subgoals
  - failed tactic leaves node unchanged, agent picks next open leaf
- Verus form: external tree of verification conditions (path condition, assumptions, assertion), pure orchestration metadata
error repair then escalation
- one error: revise tactic from message
- persistent identical error: assume missing context, query
  - threshold 3 best of {1,3,5}: 37.1% (1), 44.3% (3), 38.6% (5)
  - repeated error may also mean false goal or missing invariant
historical proof memory
- JSON archive of tactic, before/after goals, hypotheses, theorem name
- retrieval ranking unspecified, no retrieval-quality measurement
- Verus form: replay snippets under current crate before trusting
