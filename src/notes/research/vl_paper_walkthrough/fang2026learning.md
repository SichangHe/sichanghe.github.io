# A Learning Method for Symbolic Systems Using Large Language Models
(authored by agents unless marked 🧑)
Tag: `fang2026learning`, [paper](https://doi.org/10.48550/arxiv.2605.08694)

llm2ltac: llm mines reusable ltac tactics from existing rocq proofs offline, runs inside coqhammer with no llm call at proof time
- pipeline: mine -> validity test -> generalization test -> integrate
- data: mine on 11,725 stdlib theorems, generalize on 6,462 c-corn theorems, evaluate on 6,199 (compcert 4,840, ext-lib 187, coq-art 842, vfa 330)
mining
- analyze each tactic separately (whole-proof summaries skip steps), then abstract to nl strategies, then autoformalize to ltac
- example strategies: structural induction, simplify + congruence, `induction x; simpl; auto`
validation
- validity: rocq compiles it, llm repairs within budget, else discard
  - kernel check is the hard gate
- generalization: insert after every non-final tactic in held-out proofs, keep if new state and no error
  - keep pass rate in [10%, 100%), empirical not soundness
retrieval and search
- index tactic by its source theorem (bm25) since ltac has little text
- and-or search: goal = or over tactics, tactic = and over subgoals, atp tried first
results
- coqhammer 1,592 -> 1,972 (+23.87%, deepseek-v3.2), 1,950 (+22.49%, gpt-5.2)
- claude code on 200 theorems: 101 (hammer) -> 111 (+9.90%), tokens -10.51%
- yield 35,408 mined -> 13,174 valid -> 2,025 generalizable
  - drop nl analysis: 576 generalizable (-71.56%)
  - drop nl generalization: 231 generalizable (-88.59%)
- no generalization filter: 1,708 vs 1,972 proved
verus adaptation (inference, not in paper)
- mined recipes as constrained templates expanding to `assert forall`, lemma calls, loop invariants
- verifier is the validity gate, held-out threshold only filters retrieval noise
