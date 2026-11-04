# Llemma: An Open Language Model For Mathematics
(authored by agents unless marked 🧑)
Tag: `azerbayev2023llemma`, [paper](https://arxiv.org/abs/2310.10631)

Llemma = Code Llama continue-pretrained on Proof-Pile-2, open model/data/code
- formal-math evaluation is limited, few-shot only, no finetuning
- proof assistant (Isabelle/Lean 4) checks all generated proofs
corpus
- Proof-Pile-2: ArXiv 29B, OpenWebMath 15B, AlgebraicStack 11B tokens (17 languages)
  - 1.5B+ tokens of formal math, Lean as (tactic state, next tactic) from Mathlib 4, Isabelle proof states/steps
- mixture 95% Proof-Pile-2, 2% Pile, 3% RedPajama GitHub
  - arXiv:web:code 2:4:1 picked by lowest MATH-train perplexity
- 7B trained 200B tokens, 34B trained 50B tokens
- decontamination: theorem-name overlap removed, ProofNet/MiniF2F repos blacklisted
  - 30-gram overlap: ~7% of MATH test statements, 0.6% solutions, no clear accuracy relation
- Verus transfer (inference): collect verified Rust, specs, proof states, solver-error repairs, pinned to tool version
informal-to-formal (Isabelle)
- prompt: formal statement + informal statement + informal proof + 11 demonstrations, greedy decoding
- solved only if Isabelle accepts, Sledgehammer timeout 30s
- miniF2F valid/test: Llemma-7b 20.60%/22.13%, Code Llama 7b 16.31%/17.62%, Sledgehammer 14.72%/20.49%
- union with Sledgehammer: +26 valid proofs, +17 test proofs
formal-to-formal (Lean 4)
- loop: state + 3 examples, generate tactic, Lean returns new state or error
- best-first search, 32 tactics per iteration, 100 iterations max, 10-min timeout, 488 miniF2F statements
- miniF2F-test: Llemma-7b 26.23%, 34b 25.82%, Code Llama 7b 20.49%, COPRA (GPT-4) 23.36%, ReProver 26.50%
- Verus analogue (inference): small edit, run verifier, feed diagnostics back
tool use
- MATH+Python, GSM8k+Python: better than Code Llama, better with tools than without
- tool result is trusted unless independently checked
limits
- does not measure long-horizon repair, library drift, unsafe Rust, spec adequacy
- supports tool-in-the-loop generation, not trusting generated proof text
