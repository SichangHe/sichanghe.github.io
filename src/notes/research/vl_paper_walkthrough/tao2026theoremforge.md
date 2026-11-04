# TheoremForge: Scaling up Formal Data Synthesis with Low-Budget Agentic Workflow
(authored by agents unless marked 🧑)
Tag: `tao2026theoremforge`, [paper](https://www.semanticscholar.org/paper/c29ed881aaa11979a291145a372c16f49837c161)

lean data synthesis workflow, split into 5 sub-tasks
- statement formalization, proof generation, premise selection, proof correction, proof sketching
- benchmarks: 100 and 2,000 problems sampled from DeepMath and DeepTheorem
- lean results only, no Verus
decoupled extraction: keep every locally verified artifact even when the full theorem fails
- failed trajectories gave more data than successful ones (2,000 problems)
  - 1,338 vs 289 valid formalization samples
  - 1,129 vs 693 valid lemma proofs
- premise positives = premises used in successful code, unused retrievals = hard negatives
- only sketches that close a proof are guaranteed sound
- local compile is necessary but not sufficient for semantic correctness
statement formalization pipeline
- normalize and denoise the informal statement with a general llm
- llm writes ≤5 queries, LeanExplore returns top 5 mathlib constants per query, llm selects relevant ones
- sample 4 candidates, compile, one repair attempt per failure
- llm judge labels ALIGNED / NOT_ALIGNED, then selector picks one
- compiling statement can still be wrong
  - natural-number `k − 2c + 1` silently truncates at zero
  - a generated statement checked one solution but not that all solutions have that form
stateless proof correction
- each repair sees only the failed code and the current error, not the history
- every compiling repair is saved as a (code, error, fixed code) pair
- only 334 correction samples on 2,000 problems, the fewest of the 5 tasks
  - general llms are weak at diagnosing compiler errors
subgoal decomposition
- informal proof → formal sketch with `have` → extract each `have` as a lemma → solve → assemble
- per subgoal: 4 expert proofs, 1 correction, then general llm with 2 refinements
- early stop: cancel queued subgoals after one fails
  - of 5,763 subgoals: 1,372 proved, 161 recovered by refinement, 196 failed, 4,034 bypassed
- failure causes: proof sketching 47.8%, subgoal solving 30.3%
  - one sketch asserted a cardinality of 40 where 61 is correct, and a final arithmetic step masked it
majority-vote semantic verification
- 7 llm verifiers, generator identity excluded from the vote
- verified rate = proof valid and ≥ half of eligible voters say consistent
- large benchmark: 12.6% majority, 6.2% strict, 14.2% lenient
- pairwise agreement mostly > 0.75, lowest 0.54
results (2,000 problems)
- verified rate 12.6% vs 8.6% baseline
- $0.4806 per verified trajectory with Gemini-3-Flash
  - denominator wording is inconsistent between Figure 4 and Table 2
- small benchmark: Gemini-3-Pro 33.0% vs baseline 15.0%
Verus takeaways (inference)
- verus run is the only proof gate, llm votes only check spec vs requirement alignment
- save a lemma from a failed parent only with its own `requires`, never as a fact about the parent
- measure premise use by actual proof use, not retrieval rank
