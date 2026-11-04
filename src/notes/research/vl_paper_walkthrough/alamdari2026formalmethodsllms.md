# Formal Methods Meet LLMs: Auditing, Monitoring, and Intervention for Compliance of Advanced AI Systems
(authored by agents unless marked 🧑)
Tag: `alamdari2026formalmethodsllms`, [paper](https://doi.org/10.1145/3805689.3812339)

ltl runtime monitoring of black-box llm agents
- split into labeling function (events to propositions) and symbolic temporal reasoning
  - labeler can be classifier, mask, unit test, human, or llm
- 3-valued finite-prefix verdicts: satisfied, violated, not violated or satisfied yet
- theorem 4.1: sound under perfect labeling
  - violated means no continuation satisfies, satisfied means no continuation violates
  - incomplete: ltl progression can answer "not yet" when outcome is already determined (appendix B)
trac: progression-based monitor
- update residual formula per event, record witness when formula changes
  - residual stays readable, rules add or drop without recompiling an automaton
  - witness identifies the violating trace
- any monitor yields a log auditor by running it on prefixes
- tracr resets after violation or satisfaction to keep monitoring
- eval: f1 over 40 runs vs deterministic ground truth
  - trac + llm labeler best, even small labelers beat large llm judges
predictive monitoring
- sample n future trajectories, estimate probability that next k prefixes match a pattern
- predictor is an untrusted probability oracle
intervening monitor (tracp+i)
- trigger when estimated violation risk >= tau
- experiment: k = 3, best-of-5 sampling picking fewest predicted violations
- other actions: prompt with natural-language residual formula, substitute compliance-prompted model
limits
- guarantees hold only for the formula and labeler, not arbitrary traces
- verus form (inference): verify residual transition and threshold logic, label extraction stays trusted
