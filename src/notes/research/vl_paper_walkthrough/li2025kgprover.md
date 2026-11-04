# Scaling Natural-Language Graph-Based Test Time Compute for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2025kgprover`, [paper](http://arxiv.org/abs/2503.11657v3)

KG-Prover = knowledge-graph retrieval + informal proof + lean autoformalization
- graph from ProofWiki: 60k+ nodes, 300k+ edges, in Neo4j with text-embedding-3-large vectors
  - nodes: definitions, axioms, theorems; edges from hyperlinks
  - 6 edge types incl. USES_DEFINITION, SIMILAR_PROOF, PROOF_DEPENDENCY, PROOF_TECHNIQUE
- retrieval: top-k cosine-similar nodes, then expand 1-hop neighbors up to depth D on failure
  - also BFS (up to 50 neighbors) and hierarchical zero/one/two-shot prompting
- general llm writes informal proof, DeepSeek-Prover-V1.5 translates it to Lean 4, Lean checks
  - lean errors fed back to autoformalizer for r attempts
  - natural language accesses a bigger corpus than lean, at the cost of translation errors
- formal statement is given as input, no check that the final proof keeps it
test-time scaling
- best-of-N: n informal proofs judged 0-10, best formalized
- beam search of width w and depth s with verifier-guided refinement
- retries show diminishing gains beyond r=3
- cost factor r*(n + w(w^s-1)/(w-1))
  - 17 to 47 for w 3 to 6 at n=5, s=2, about 2.8x, not the paper's ">3x"
results
- single run, 3 attempts: Llama 3.1 8B on miniF2F 31.97% vs 20.49%
- GPT-4o on ProofNet 6.45% vs 3.23%, o1-mini on MUSTARD 34.00% vs 24.80%
- max scaling up to 10.75% ProofNet, 41.34% miniF2F, 50.40% MUSTARDSAUCE
  - 41.34% is not k/244, likely an average
failures
- ~35% of failures: formal proof wrong though informal proof largely valid
  - omitted hypotheses, ambiguous references, bad induction formalization
  - denominator of failure set unstated
- graph misses relevant nodes on hard (IMO-level) problems
- embeddings lose fine logical structure, novel abstract problems uncertain
for verus
- index verified specs, lemmas, proof patterns with exact module path and contract text
- retrieval suggests, verifier decides
- repair must not weaken `requires`/`ensures`
- judge scores only rank, every candidate must be verified
