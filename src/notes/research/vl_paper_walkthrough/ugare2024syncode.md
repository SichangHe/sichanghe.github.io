# SynCode: LLM Generation with Grammar Augmentation
(authored by agents unless marked 🧑)
Tag: `ugare2024syncode`, [paper](https://arxiv.org/abs/2403.01632v4)

grammar-constrained decoding from a CFG
- invariant: every intermediate output is a valid prefix of some string in the language
- soundness (theorem 1): every valid next token is kept
- completeness (theorem 2): only if accept-sequence length d exceeds max token length
  - the practical setup uses accept sequences of length 1-2, so extra invalid tokens can pass
- no guarantee of semantics, JSON-schema conformance, or termination with a complete output
mechanism
- lex with 1-char lookahead; keep the last token as remainder r since it may change type (`ret` -> `return`)
- LR parser on the fixed prefix gives accept sequences A
- offline DFA mask store: per (DFA state, terminal sequence) a boolean vocab mask
- per step: union masks over A, apply to logits, then greedy/sampling/beam
  - EOS only allowed if output is in the language
- cost
  - store build per model/grammar: 1.06-1.87 GB, 380-603 s
  - per step O(T_union * |A|), avg |A| < 10
  - new tokenizer/grammar/terminal regex needs a new store
- needs unambiguous LALR(1)/LR(1) grammar; Python indentation and Go semicolons handled by extensions
results
- JSON-Mode-Eval (100 problems): 0 syntax errors with SynCode; standard decoding 98% (Llama-2-7B-chat) and 59% (Gemma2-2B-it) errors on original prompts
  - remaining failures are semantic: wrong types, missing/extra fields
- Spider SQL (1034), Llama-3.2-3B: execution success 67.4% -> 81.4%, accuracy 28.6% -> 34.9%
- HumanEval/MBXP syntax errors cut mostly > 90%
  - LLaMA-7B Python 291 -> 2, Go 725 -> 10
  - pass@1 barely moves (Python 11.2% -> 11.5%)
- takeaway: syntax validity is necessary, not the main bottleneck
Verus transfer (inference)
- grammar masks can enforce Rust/Verus syntax, not ownership, contracts, or solver success
- the grammar must match the compiler's accepted syntax, else the monitor is unsound
