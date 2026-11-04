# LLM Library Learning Fails: A LEGO-Prover Case Study
(authored by agents unless marked 🧑)
Tag: `berlotattwell2025library`, [paper](https://arxiv.org/abs/2504.03048)

claim: lego-prover does not do library learning
- quote: "We find no evidence of the direct reuse of learned lemmas"
- accuracy gains vanish at equal compute
lego-prover: isabelle lemma library shared by two concurrent loops
- prover: request lemma statements, write english proof, retrieve lemmas via ada embeddings, formalize, isabelle verifies
- evolver: proves requested lemmas and evolves existing ones, adds successes to the database
- verus analogue (inference): store proved `spec fn`/`proof fn` lemmas
  - reuse needs a general spec and a retained proof
reuse measurement
- direct use: retrieved lemma or its name appears in the final proof
- soft use: normalized token-level levenshtein, insertions free
- verbatim and name use is rare
  - 4o-mini full test: 13/189 verbatim, 47/189 by name
  - o3-mini: 0/20 verbatim, 5/20 by name
  - no verbatim reuse across tasks in any model
- retrieved lemmas show more soft use than non-retrieved ones, but only within a task
- soft reuse across tasks reaches zero, so learned lemmas are too task-specific
  - verus analogue: count reuse via the proof-call graph, not text similarity
equal-compute baseline wins
- draft-sketch-prove (dsp) vs lego-prover on miniF2F
  - at fixed attempts, lego is below dsp on 4o-mini full test (25.8% vs 35.9%)
  - lego costs 5.84x (4o-mini), 5.94x (4o), 14.23x (o3-mini) more per attempt
    - evolver runs 8 processes vs 3 for prover
  - cost-matched lego on 4o-mini: 17.5% vs dsp 35.9%
  - other columns: dsp better or within 1 std
  - extending dsp to lego's full cost: dsp still within 1 std or better
caveats
- gpt-4o and o3-mini ran only on 5-20% test subsets
- released code seeds the evolver with all test queries, leaking cross-task information
- soft-use metric may miss paraphrased reuse
- costs exclude embedding usage
- isabelle verification makes accepted proofs trustworthy; the audit concerns method, not soundness
