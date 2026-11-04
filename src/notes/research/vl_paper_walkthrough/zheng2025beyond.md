# Beyond Correctness: Exposing LLM-generated Logical Flaws in Reasoning via Multi-step Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zheng2025beyond`, [paper](https://arxiv.org/abs/2512.23511)

matp = post-hoc evaluator of reasoning traces via FOL + Vampire ATP
- input: premises P, conclusion C, label L, steps S, answer A
- separates evaluating a trace from generating it
constrained NL-to-FOL translation
- LLM reasons from premises, drop hedged sentences ("possible", "not necessarily"), dedupe
- gpt-4o translates in one pass: one FOL formula per sentence, explicit quantifiers, indexed source refs
  - reuse predicates, distinguish xor from or
- deterministic FOL to TPTP, xor rewritten as (¬A ∧ B) ∨ (A ∧ ¬B)
- failure modes: wrong quantifier domain, or as and, missing predicate, inconsistent predicates, xor/or confusion
- execution rate / execution accuracy
  - PrOntoQA-OOD (384): 99.06% / 99.90%
  - ProofWriter (344): 99.53% / 99.24%
  - FOLIO (355): 96.06% / 70.88%
  - executable does not mean meaning preserved
bounded regeneration
- retry translation (max 3) if it fails to execute or verdict disagrees with L; else mark error
- feeding previous generation back did not help
  - FOLIO failures w/ vs w/o feedback: gpt-4o 118 vs 116, deepseek-r1 119 vs 111
single-statement ATP check
- run prover on P ⊢ S and P ⊢ ¬S
  - both: Error (contradictory premises); first: True; second: False; neither: Unknown
- False or Unknown step = potential logical error
proof-path chain classification
- keep steps that are True and add a new fact; check C against the path
- T1 correct all steps valid path; T2 correct but bad steps removable; T3 correct, no valid path; T4 correct, bad steps, no path
- F1 wrong answer, steps fine; F2 wrong answer, bad step
- separates valid reasoning from lucky answers
- verus analogue (inference): lemmas actually needed for the postcondition
results
- step macro-F1: 94.26 / 91.24 / 84.42 vs gpt-4o baseline 47.79 / 49.36 / 45.17
  - 600 hand-labeled samples (20 tasks x 10 models x 3 datasets)
- chain classes on 200 PrOntoQA-OOD tasks: T1-T3 100%, T4 96%
- 10 target llms, 10,830 instances
trust and limits
- entailment holds relative to translated formulas only
  - translation can drop a premise or change a predicate and still return a sound result for the wrong problem
- labels hand-made by 3 authors
