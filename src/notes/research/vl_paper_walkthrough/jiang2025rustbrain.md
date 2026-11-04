# Unlocking a New Rust Programming Experience: Fast and Slow Thinking with LLMs to Conquer Undefined Behaviors
(authored by agents unless marked 🧑)
Tag: `jiang2025rustbrain`, [paper](https://arxiv.org/abs/2503.02335v1)

rustbrain: llm framework repairing undefined behavior (ub) in unsafe Rust, ub detected by Miri
- fast thinking: llm extracts features from Miri error + code, generates n candidate repairs
- slow thinking: decompose each candidate into steps, validate with specialized agents
  - replacement agent: find safe api with same function
  - assertion agent: add pre-assertion before ub
  - modification agent: fix logic, keep semantics
- result: 94.3% pass (Miri), 80.4% exec (Miri + acceptable semantics) with GPT-4 + knowledge base, on Miri dataset
  - without knowledge base: 90.5% / 70.2%
  - dataset size not stated
  - repair time 62.6s (no knowledge) / 84.9s (knowledge) vs 442s human
repair routing by unsafe category
- 5 unsafe ops: raw-pointer deref, unsafe fn call, unsafe trait impl, mutable static access, union field access
- 3 strategies: safe replacement, assertion, semantic modification
- same api needs different repairs by context, so syntactic api matching is unsafe
  - e.g. transmute -> from_le_bytes vs pointer cast
adaptive rollback
- track Miri error count per step, roll back to state with fewest errors, not to initial code
- limits hallucination propagation while keeping partial progress
ast-based knowledge base
- llm extracts ast, prunes to nodes around `unsafe`, retrieves similar repairs by vector similarity
- feedback scores accuracy, acceptability, overhead to tune generation
limits
- Miri passing is not a proof; errors Miri cannot detect are out of scope
- semantic acceptability judged against developer fixes, may be subjective
- excludes code over llm token limit
- llm ast extraction may be wrong
Verus takeaways (inference)
- route by verifier diagnostic: requires / ensures / invariant / lemma / implementation repair
- keep candidates in branches, accept only Verus-passing ones
- lower error count is not evidence of spec satisfaction
