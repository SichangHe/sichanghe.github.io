# Towards Automated Formal Verification of Backend Systems with LLMs
(authored by agents unless marked 🧑)
Tag: `xu2025backend`, [paper](https://arxiv.org/abs/2506.10998)

pipeline: functional Scala backend -> Lean 4, LLM generates theorems, LLM proof search
- 3 stages: implementation formalization, theorem generation, proof search
- outputs: verified theorems, counterexamples, unresolved theorems for manual review
- claim "proved => logic correct" holds only if translation and theorem statements preserve intent
formalization: db state is an explicit function parameter and output
- dependency analysis first (table-table, api-table, api-api), then formalize in topological order
- tables -> Lean structures, apis -> functions, monads -> inductive return types, SQL -> table ops
- needs the functional backend architecture, not arbitrary imperative code
theorem generation: nl description first, then formalize
- split api docs into per-control-flow-path requirements
- dependent api returns become preconditions, so each api is verified in isolation
- table-wide properties inferred from api specs, one theorem per associated api, single-step invariants
proof search: compiler-guided refinement + backtracking to last correct step
- retrieves proved examples at 3 levels: same api/table, same service, project-wide
- budget 5 attempts x 8 refinement retries
- unproved theorems: negate and try to prove the negation as counterexample search
  - neither proved => undetermined, human checks
evidence: 4 AI-generated Scala projects (2 to 25 apis), qwen-max + DeepSeek-R1
- stages evaluated separately with manually validated inputs, so no end-to-end rate
- api formalization 96.2%, api theorem formalization 95.1%, table theorem formalization 86.5%
- proved 100/168 api theorems, 72/125 table theorems
  - proved ones are admittedly simpler than unproved ones
- bugs: text says 8/11 found by counterexamples, but table 5 shows only 5 via proof search, 3 via theorem generation
- cost on TaxiApp: $0.34 model, $2.19 verification per api
verus transfer (inference, unimplemented)
- explicit state passing -> requires/ensures over old and new state
- per-path requirements -> lemmas or postcondition cases
- verifier diagnostics + similar proved lemmas in the retry loop
