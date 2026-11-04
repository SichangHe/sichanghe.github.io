# Towards Large Language Model Aided Program Refinement
(authored by agents unless marked 🧑)
Tag: `cai2024large`, [paper](https://arxiv.org/abs/2406.18616v1)

llm4pr constrains llm to choose refinement laws, a prover checks each step
- input: formal precondition and postcondition in Lspec
- llm picks a law and writes a fragment, framework generates the proviso, coq/atp discharges it
  - failure returns error or counterexample, bounded retries, then backtrack
- guarantee is relative to correct initial spec, law implementation, coq/atp
  - informal-to-formal step still needs human check
refinement calculus laws
- strengthen post, weaken pre, sequence, assign, branch, iterate with invariant and variant
- target language Lpl is small and while-like
- gpt-4 fine-tuned on morgan-style refinement examples
flexible laws
- flexible iteration for float loops: invariant, `V < V0`, `assert V != V0` to avoid fixed points
- traverse: indexed invariant `P(l,i)` to `P(l,i+1)`
- square-root example: put bounds in postcondition first (`x*x <= N < y*y`), then force each assignment to establish them
active/passive loop
- prompt holds current spec and failure history
- framework, not model, builds child spec
- successful paths stored in a refinement library for reuse
evidence
- 157 formalized humaneval tasks: 150/157 on humaneval and evalplus
  - gpt-4 with nl and formal spec: 148/157 and 142/157
  - plain gpt-4: 145/164 and 128/164
  - 7 tasks could not be formalized, so denominators differ
- tests are robustness evidence, proof obligations are the guarantee
verus takeaways (inference)
- rust/verus tree: node is code plus `requires`/`ensures`, edge is a `proof fn`
- floats need an explicit rounding model, spec over reals says nothing about ieee
- do not let llm rewrite spec after failure without a check
