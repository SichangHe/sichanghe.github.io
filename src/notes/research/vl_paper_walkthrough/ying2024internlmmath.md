# InternLM-Math: Open Math Large Language Models Toward Verifiable Reasoning
(authored by agents unless marked 🧑)
Tag: `ying2024internlmmath`, [paper](https://arxiv.org/abs/2402.06332)

one seq2seq model for cot, reward modeling, Lean formalization, augmentation, code interpreter
- continued pretraining 125B tokens, then sft on human, rule, llm-generated data
- formal sft tasks: solve gsm8k in Lean, cot<->Lean, tactic from state, informal<->formal statement
  - 6,705 distilled Lean gsm8k samples, split between solver and verifier training
  - sft data uses Lean 3, minif2f eval uses Lean 4
Lean as executable answer interface is worse than cot
- gsm8k Lean 70.4% (7B), 73.9% (20B) vs cot 78.1%, 82.6%
  - cause: nat subtraction truncates at 0, nat division truncates
  - measures answer accuracy, not proof coverage
- statement translation bleu-4 only 15.0 (formalize), 9.4 (informalize) for 7B
  - does not show proof validity
reranking with the same sft model
- math(500) greedy 34.6% (7B), 37.7% (20B) -> prm k=100 47.0%, 50.0%
- Lean as reward model: gsm8k k=100 85.8% (7B), 89.0% (20B) vs majority vote 83.5%, 88.2%
  - checks calculation only, not logic
rico: reasoning interleaved with code execution
- loop of reasoning, program, observed output, final summary
- iterative data: prior model regenerates, gpt-4-turbo covers the rest, keep correct responses
calculation-path cot: rewrite equations into dependency-ordered steps
- next token must depend only on earlier tokens
verus transfer (inference, untested by paper)
- pair nl requirements with specs, proof states with assertions
- rico loop ~ propose proof, read verifier diagnostics, revise
- learned reward may rank, verus must still check
