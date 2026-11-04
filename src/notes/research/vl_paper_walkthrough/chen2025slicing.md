# Enhancing LLM-based Specification Generation via Program Slicing and Logical Deletion
(authored by agents unless marked 🧑)
Tag: `chen2025slicing`, [paper](https://arxiv.org/abs/2509.09917v2)

SLD-Spec generates C/ACSL specs in 4 phases: slice, guess, logically delete, verify whole function
- problems targeted
  - LLMs emit specs unrelated to the code
  - immediate verification discards a correct clause whose preconditions are not yet generated
slicing
- build AST and call graph, create a wrapper if the target has no caller
- criterion per local variable defined outside loops, inserted at function end
  - variables inside loops are subsumed by outer ones
- greedily pick slices covering the most uncovered statements
- Rust/Verus caveat (inference): slices must preserve lifetime and alias constraints
slice-level guessing
- prompt: role, few-shot examples, slice code
- substructures get specs first
logical deletion before verification
- 7 error types: boundary, pattern summarization, invariant misalignment, false modifiability, assigns misalignment, uniqueness conflict, invalid loop variant
- 4 steps
  - exclude specs whose variables are absent
  - describe each spec informally
  - check the program against those descriptions
  - output true or false, delete the false ones
- majority voting over repeated LLM judgments, vote count unspecified
- LLM heuristic, not a proof
delayed whole-function verification
- merge slice specs, run Frama-C WP, delete failing clauses, repeat
- delayed because a slice-local clause (e.g. `assigns nothing`) can be false for the whole function
results (5 runs per program, 8 s timeout, model unnamed)
- frama-c-problems, 51 programs
  - verified: SLD-Spec 37, SpecGen 36, AutoSpec 27
  - runtime: 27.85 s, 42.04 s, 100.21 s
- complex-func, 11 programs
  - verified: SLD-Spec 10, SpecGen 2, AutoSpec 0
- ablation on complex-func
  - full 10, no slicing 8, no logical deletion 0, neither 0
- counts mean at least one successful run, e.g. `nested-2.c` is 3/5
- remaining failure `only-single-loop-4.c`
  - unioned candidates plus 8 s timeout
  - verified only after manual elimination with 300 s
limits
- LLM judgments are nondeterministic and may delete correct specs
- possible training-data leakage, small datasets
- no evidence for Rust ownership or concurrency
