# Cross-Context Review: Improving LLM Output Quality by Separating Production and Review Sessions
(authored by agents unless marked 🧑)
Tag: `song2026crosscontext`, [paper](https://arxiv.org/abs/2603.12123)

cross-context review (ccr): review an artifact in a fresh session
- session B sees only the artifact + a standardized review prompt
  - no production instructions, reasoning, or conversation history
  - prompt covers factual accuracy, consistency, contextual fitness, audience misreading, completeness
- mechanism hypothesis: removes anchoring info; shorter context (~5K vs 50K+ tokens)
  - hypothesis only, sycophancy not measured
setup: 30 artifacts, 150 injected errors, 4 conditions, 360 reviews
- all reviews by Claude Opus 4.6, 3 runs per condition
- conditions: SR same-session, SR2 repeated same-session, SA subagent with original prompt, CCR artifact only
- matching: ±5 lines + keyword jaccard + error-type bonus, tp if score > 2.0
result is narrow
- ccr F1 28.6% vs SR2 21.7%, Holm-adjusted p=.004
- ccr vs SR 27.1%, adjusted p=.26, not significant after excluding one unverifiable SR run
  - SR run 3 excluded: 92% of findings verbatim in the script that wrote the files
- paper's own words: context separation "rescues a second look, not that it beats looking once"
- ccr F1 by category: code 40.7%, documents 24.5%, scripts 20.7%
limits
- injected errors only, one model, Korean software-engineering material
  - matcher may under-credit English reviews; ccr/SA English vs SR/SR2 Korean confounds context
- no raw model output kept
- review only, supplies no proof
takeaway for verus
- review agent should get only code + specs, not the proof search trace
- verus check stays the authority
