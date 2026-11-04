# VIVERRA: Text-to-Code with Guarantees
(authored by agents unless marked 🧑)
Tag: `wu2026viverra`, [paper](https://www.semanticscholar.org/paper/9a9e8f60bbfed6802605efa0bd1d0ce28a411d46)

text-to-C with verified assertions as partial specs for user comprehension
- LLM writes C + assertions, bounded model checkers verify them
- guarantee: k-bounded, holds when every loop back-edge traversed ≤k times (k=5)
- not proof that program matches the task
partial co-specification
- one call elicits properties, one synthesizes verification-friendly C (no recursion), one inserts asserts
- each assertion mapped back to an elicited property
bound reduction
- LLM tightens loop-bound constants so no loop reaches iteration k+1, avoids spurious unwinding failures
- bounded-checking convenience, not applicable to verus unbounded proofs (inference)
call-graph-ordered compositional checking
- callee assertions precede caller assertions
- standalone check first, else retry with earlier assertions as assume -> C-VERIFIED(S) with recorded deps
- statuses: VERIFIED, C-VERIFIED, FALSIFIED, UNKNOWN
dependency closure
- recursively replace intermediate assumptions by root verified assertions
- facts embedded as //FACT[k=K, cond]
- theorems 1, 2: soundness assuming sound bounded model checker
engineering
- portfolio: CBMC (±Bitwuzla), ESBMC+Bitwuzla in parallel, 60s timeout
- gcc compile gate between LLM stages, re-prompt on errors
evidence
- 18 tasks, 545 assertions: 503 verified, 5 conditional, 37 unverified
- time 2.4s to 2077.6s (sudoku)
- mturk study, 10 questions: annotated programs more accurate on 8
  - supports comprehension only, not productivity
trusted
- task text, LLM code/properties, bound reduction, compiler, libclang, solvers
