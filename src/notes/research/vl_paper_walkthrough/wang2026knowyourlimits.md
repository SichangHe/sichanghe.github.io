# Know Your Limits : On the Faithfulness of LLMs as Solvers and Autoformalizers in Legal Reasoning
(authored by agents unless marked 🧑)
Tag: `wang2026knowyourlimits`, [paper](https://arxiv.org/abs/2606.16118)

llm formal-looking reasoning is often unfaithful to the solver, even when accurate
- setup: ContractNLI contracts re-annotated, compare llm-only, llm over smt, llm-written Z3 run by solver
- three failure modes
  - scope laundering: llm reports entailment/contradiction while the solver gives neutral
    - 15.3% (GPT) to 52.5% (Qwen)
  - implicit constraint blindness: llm misses constraints in the formal input
    - 0.7% (GPT) to 4.4% (Claude)
  - program synthesis failures: wrong Z3 code despite structured prompts
    - error 25.5% (Claude) to 63.2% (Llama)
    - invalid after 3 fix rounds: 0% (Claude) to 28.7% (Llama)
- accuracy 610 examples, Claude: llm-over-smt 83.0%, solver 74.5%, majority baseline 48%
strict satisfiability labels
- entailment: P and not H unsat; contradiction: P and H unsat; else neutral
  - neutral covers irrelevant and needs-unstated-assumption
- 400 re-annotated, 610 with minimal pairs
- kappa 0.627, agreement 81.0%
  - hard part is whether H is supported, not logical inconsistency
staged autoformalization
- pick relevant clauses, normalize predicates, translate to fol, write assumptions explicitly, add global constraints
- still incomplete or incorrect: the main bottleneck
  - generated fol adds permissions and obligations absent from the premise
- z3 is sound only relative to the supplied fol
Verus transfer (inference)
- accept a proof only if verus actually passed, never the llm's claim
- distinguish proved H, proved not H, not proved
- silently added assumptions change the spec
- repaired proofs count only if the spec is not weakened
