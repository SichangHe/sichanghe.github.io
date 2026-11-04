# Next Steps in LLM-Supported Java Verification
(authored by agents unless marked 🧑)
Tag: `teuber2025next`, [paper](https://doi.org/10.1109/nse66660.2025.00007)

setup
- llm fills one gap in a human-written top-level spec, key checks it
  - gap = one loop invariant or one subcontract for a called method
  - verified => human top-level spec holds; llm never writes the top-level spec
- loop: llm drafts jml, key checks, feedback, retry
  - parse failure: return parser error
  - proof failure: return open proof-branch labels e.g. "Invariant Initially Valid"
  - prompt: describe behavior first, then output only the annotation
- 27 invariant tasks, 14 subcontract tasks, gpt-4o, up to 10 attempts each
feedback vs independent sampling
- key feedback does not significantly beat restarting from scratch
  - hypothesis: model makes marginal edits to a wrong answer
- feedback costs more tokens: n(I+O) + n(n-1)(O+R)/2 vs n(I+O) for sampling
  - I prompt, O output, R feedback tokens; history grows quadratically
- mixed (5 groups of 10 feedback rounds) is best
  - invariants 24/27 vs 23/27 pure sampling
  - subcontracts 8/14 vs 7/14
  - restarting escapes stuck conversations
takeaways for verus
- keep human `ensures`, let llm fill one `invariant`/`requires`/lemma, run verus each time
- compare feedback vs fresh samples under equal token budget
- limits: one model, one gap per file, no new verifier
