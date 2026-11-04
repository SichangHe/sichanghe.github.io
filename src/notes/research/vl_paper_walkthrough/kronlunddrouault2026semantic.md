# Semantic Prefix Oracles for LLM Decoding: Contracts and Differential Validation
(authored by agents unless marked 🧑)
Tag: `kronlunddrouault2026semantic`, [paper](https://www.semanticscholar.org/paper/98f868f0f9264c217efcfa01c0ec1f70d48f319f)

semantic prefix oracle (aufbau, p7) masks tokens during llm decoding using semantic constraints, not just syntax
- grammar: cfg + first-order terms, unification, context membership, scoped effects, right-bound constraints
- earley parse each prefix, verdict per branch: lost / live / satisfied
- mask a token only when all compatible branches are lost
safe pruning vs dead-end freedom
- safe pruning: never reject a prefix that has a valid continuation
  - proved for stable contradictions (thm 2.4)
  - stable: constructor clash, empty regex intersection, occurs-check failure, failed lookup in fixed left context
- dead-end freedom: every retained prefix has a continuation, a property of the grammar, not the oracle
  - sufficient conditions (thm 2.6): surface productivity, type coverage, left-to-right constraint flow
  - holds for finite lambda, core ml, c-like fragments
  - fails for plain stlc (unrestricted base types) and the tool dsl
- live does not mean completable
tokenizer lifting (lemma 3.1)
- character-level witness implies token-level witness
- needs exact spelling (oracle consumes the bytes the model sees) and vocabulary coverage
- stop tokens stay admissible, so the mask prunes but cannot force completion
- coverage must be checked per vocabulary and grammar
differential validation
- compare every prefix of compiler-valid programs against ocamlc and cc -fsyntax-only
- 0 false prunes over 65 programs (40 ml, 25 c)
  - wilson 95% upper bounds 8.8% (ml), 13.3% (c), 5.6% pooled
- 25/30 invalid programs caught mid-stream (12/17 ml, 13/13 c), syntax-only 0/30
- recursion probe found a false-prune bug: inference-mode recursive declarations excluded, checking mode kept
- hand-selected finite cohorts, validate rather than certify
  - no slow reference evaluator
semantic vs syntactic ablation
- 12 open models, 52 tasks, greedy, one attempt, nine models ran both arms
- semantic minus syntactic nonnegative for every model-language pair
  - max +15.2 points stlc correctness, +14.3 ml validity
- c gains zero in matched cells, format control may explain them
- tool episodes: 8/14 vs 4/18 for qwen3.5-4b-base, small unpaired cells
- mask prunes, cannot repair a semantically wrong final program
verus analogue (inference)
- use a verified spec checker as the semantic oracle, its own soundness must be established
- grade only machine-checked proofs
