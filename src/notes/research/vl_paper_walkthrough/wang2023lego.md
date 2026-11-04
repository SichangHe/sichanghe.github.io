# LEGO-Prover: Neural Theorem Proving with Growing Libraries
(authored by agents unless marked 🧑)
Tag: `wang2023lego`, [paper](http://arxiv.org/abs/2310.00656v3)

lego-prover: isabelle prover that grows a library of verified lemmas ("skills")
- sota on miniF2F: valid 48.0 -> 57.0, test 45.5 -> 50.0 (abstract); 244 problems each
  - table 1, 100 attempts: 55.3 / 50.0 with human informal proofs; 52.4 / 45.5 with gpt-4 informal proofs
- ~$300 per experiment of 100 attempts
prover: informal solver -> decomposer -> retrieval -> formalizer -> isabelle
- decomposer emits step-wise proof plus lemma requests
- valid proof = no sorry/oops and isabelle accepts
- failed `by` steps retried with 11 heuristic tactics + sledgehammer
- verified lemmas go to skill store; failed lemma statements go to request store
skill retrieval
- vector stores of lemmas, requests, problems; knn over embeddings
- 135 valid-solved problems: 24% used retrieved skills; 51% copied directly, 49% imitated
- retrieval helpful but not needed for most solves
evolver grows library
- request solver: proves pending requests (3 retrieved skills)
- directional transform: extend dimensions, key concepts, parameterize, complexity
  - keep only if verified and difflib similarity < 0.85
- library 22,532 skills: 10.8% prover, 38.2% request solver, 51.1% transform
  - 71% of directly copied skills came from request solving
ablation
- 50 attempts on valid: 50.4% full vs 47.1% without library and evolver
trust
- unchecked by isabelle: embeddings, vector db, prompts, orchestration, benchmark statements
verus transfer (inference)
- store verifier-clean proof fns with requires/ensures
- reject external_body
- dedupe by normalized ast, not raw text
- retrieval must preserve spec context
