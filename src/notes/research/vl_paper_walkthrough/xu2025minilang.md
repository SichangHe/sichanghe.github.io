# A Minimalist Proof Language for Neural Theorem Proving over Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `xu2025minilang`, [paper](https://arxiv.org/abs/2507.18885v4)

minilang: 10-operation proof language mirroring informal outlines, no tactics, leaves delegated to ATP
- ops: HAVE, CONSIDER, RULE, CHOOSE, SIMPLIFY, CASE_SPLIT, INDUCT, END WITH, NEXT, INTRO
- proof state is a tree of goals with inherited contexts
- soundness holds if the underlying simplifier/cases/induct/Sledgehammer* are sound
- completeness only relative to some ATP, not the implemented backend
sledgehammer*: stronger backend
- END/NEXT carry relevant/avoided lemma hints the model can suggest
- hallucinated lemma names filtered before search
- auto/clarsimp simplify before Sledgehammer, fastforce runs in parallel
- proofs cached by goal expression
translator: Isar -> minilang, rule-based
- parse (42 node kinds) -> normalize (15) -> map -> refine tactics into Sledgehammer* calls
- normalized proofs re-checked by Isabelle, failures discarded
- 85.28% of ~340k proofs translate (~290k usable)
results: PISA, 2,962 goals, two 7B models
- DeepSeek-Prover-Base: 69.1% pass@1, 79.2% pass@8
- minilang beats Isar (Thor-style) by 4.7 to 8.0 points with SH*, 12.6 to 16.0 with SH
- SH -> SH* alone adds >= 6 points
- without ATP minilang loses to Isar: strict leading-subgoal discipline needs precise state tracking
- DeepSeek-Prover-Base pretraining contamination with PISA cannot be ruled out
verus transfer (inference)
- small outline DSL elaborating to proof fn + assert steps cuts syntax burden
- risks: hides backend incompleteness, translation bugs; Verus must still check final proofs
