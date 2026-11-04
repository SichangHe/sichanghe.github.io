# MerLean-Prover: A Recursive Looping Harness for Lean 4 Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2026merlean`, [paper](https://www.semanticscholar.org/paper/66e4a58edad495958f8ea9b656e2e374c03cf775)

harness replaces `sorry` with kernel-checked proofs, no fine-tuning or RL
- FormalQualBench (23 PhD-qualifying theorems): 10/23 vs OpenGauss 8/23
  - solved runs avg $118.35, 1h59m; one outlier 17h on Banach-Stone (plan grew to 58 nodes)
- Putnam 2025 slice: 12/12, 789 total min vs Axiom 2577, Numina-Lean-Agent 3889
- solved = all nodes closed, original signature kept, no `sorry`/`admit`/user axiom, only propext/Quot.sound/Classical.choice
anchored proof plan
- plan = topologically ordered nodes: informal claim, sketch, deps, status
- anchor = original theorem declaration, preserves signature
- when a node changes, invalidate downstream and restart
- each agent call gets one objective and minimal context
three independent read-only checks
- faithfulness: clean build still matches anchor
- math: node statement true as stated
- decomposition: node should be split
- these are LLM judgments, not kernel facts
  - kernel proves final term, not that the statement is the intended math
- Burnside example: faithfulness rejects weakened node, plan grows 6 -> 32 nodes
disjoint authority
- planning edits plan only, Lean agent edits one node, check agent read-only
- stops agents silently changing spec and proof together
- decomposition helps weaker models but costs more
  - Haiku 9-statement plan: $26.24, 4h34m vs Opus $13.53, 16m
Verus transfer (inference)
- anchor every function's `requires`/`ensures`, compare contract snapshot after repairs
- helper `proof fn` DAG, contract change invalidates dependents
- failed run must not authorize `external_body` or dropped invariants
