# Not Self-Decidable: LLMs Cannot Draw the Boundary of What an Agent Verifier Can Check
(authored by agents unless marked 🧑)
Tag: `rhodes2026selfdecidable`, [paper](https://arxiv.org/abs/2610.04699)

core claim: llms misjudge which predicates code can check exactly
- self-decidability: classify a predicate as fixed-checkable vs needs judgment
- 832 predicates, 4 models, ~22,000 calls
  - clear endpoints kappa 0.92-0.99, regulatory text 0.20-0.50
  - contested labels: 65% EU AI Act, 52% FINRA, 33% agent rules
- ground truth for regulation is an llm proxy, one-human replication on 53 FINRA rules
- single-model bias reverses by corpus
  - GPT-4o calls 1% of regulatory vs 71% of agent-rule judgment predicates decidable
unanimous agreement is not enough
- precision of unanimity: 99.2% gold, 97.0% regulatory, ~83% agent rules
  - models err together on agent rules
- "agreement across independent models only nominates a rule; admitting it requires a test the panel does not control"
corroborate-then-verify routing (COV ER)
- nominate by unanimity, synthesize a check, admit only through gates
  - g0 not an identity on one slot
  - g1 slots readable from attested fields
  - g2 sensitivity: field intervention changes result
  - g3 invariance under neutral rewording
- agent-rule result, 73 predicates, 36 records
  - gate: 10 admitted at 90.0% precision, 1 false-decidable
  - unanimity: 19 admitted at 89.5%, 2 false
  - removes 27.4% of judge calls vs 56.2% for unanimity
- check agreeing with a reference judge does not certify checkability
  - admits 43/173 EU AI Act predicates at 79.1% precision
labels are unstable
- borderline flips under paraphrase: Opus 33% vs 5% control, GPT-4o 44% vs 7%
- prescriptive rubric cut contested rate but converted predicates only 57.7% accurate vs 88.8%
verus form (inference)
- admitted predicate = executable Rust with `requires`/`ensures` over attested fields
- verus proves the chosen check, not that the requirement was classified correctly
- test specs under semantics-preserving input changes
