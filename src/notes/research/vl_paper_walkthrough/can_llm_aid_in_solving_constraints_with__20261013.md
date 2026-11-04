# Can LLM Aid in Solving Constraints with Inductive Definitions?
(authored by agents unless marked 🧑)
Tag: `feng2026llm`, [paper](https://arxiv.org/abs/2603.03668)

LLM4Ind: LLM proposes auxiliary lemmas, SMT solver (cvc5/Vampire) checks them
- goal: prove A → P with recursive definitions over ADTs, no human, solver induction stuck
- result (Qwen3-235B, cvc5 backend, 1200s): 525/706 vs cvc5 293, Vampire 343
  - Vampire beats it on IndBen (122 vs 114)
- cost about $4 per full run (11.5M tokens), avg 97s per solved task vs cvc5 3.4s
- trust: only the solver; LLM output is a conjecture until proved
  - no proof object or independent check
- Verus needs more: no built-in induction, so the model must also write the decreases/match/recursive-call skeleton
search loop
- run solver alone 60s first
  - cvc5 results identical at 360s and 1200s, so short first attempt loses nothing
- recursive proof tree, max depth 3
  - per node: 2 prompts x 3 queries, up to 3 conjectures each
- sufficiency before truth: check A ∧ ¬P ∧ conjectures unsat first
  - only then recurse (in parallel) on each conjecture as a new goal
- a failed sub-goal discards the whole conjecture set, no caching
- Verus form: helper proof fn with admit() to test sufficiency, then replace each admit with a real proof
conjecture taxonomy, a different check for each
- incorrect: contradicts axioms, makes the goal provable for the wrong reason
  - Verus: false ensures assumed via admit lets any caller verify
- correct but useless: true yet goal still fails, includes copies of the goal
- useful but unproved: goal follows, needs its own proof
cheap consistency filter, 1s per conjecture
- reject if parse error, identical to goal, or A ∧ c unsat
- test inconsistency not validity: A ∧ c is universal only, A ∧ ¬c adds existentials
- evidence is weak: avg 520.7 with vs 513.7 without (of 706), run ranges overlap
- Verus: requires conjecture, ensures false, with a ground instance in the body since triggers will not fire
prompt strategies
- strategy 1: rewrite the inductive case step by step, label each justification, emit the unjustified step as conjecture
  - Verus: calc! block, the failing step becomes a helper proof fn
- strategy 2: generalize a term shared by both sides into a fresh variable, add a bridge lemma back
  - fits Verus: the helper no longer mentions the hard function
- both vs naive prompt in the same loop: Qwen 525 vs 379, GPT-5 552 vs 450
  - no ablation between strategies
- labelled problem file (data types, functions, goal under comments) helps the model
robustness
- temperature 0.1 to 1.3: totals 514 to 527, std under 5
- Vampire backend: 453/706
- model differences within noise except GPT-5
caveats
- goals are closed first-order statements about pure recursive functions from 1996-2013 suites, likely in training data
- nothing on lemmas needing preconditions from program context or on loop invariants
- table totals inconsistent: cvc5 column sums to 294 vs 293, Gemini 519 vs 514
- "at least 25% higher" holds only for totals
