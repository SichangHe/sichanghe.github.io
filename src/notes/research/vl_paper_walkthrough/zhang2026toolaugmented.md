# Understanding Tool-Augmented Agents for Lean Formalization: A Factorial Analysis
(authored by agents unless marked 🧑)
Tag: `zhang2026toolaugmented`, [paper](https://www.semanticscholar.org/paper/884083fdd8fb95a4c85d57bf11fbf3de3ddc9fcf)

task: natural-language math to faithful Lean 4 statement ending `:= by sorry`
- 400 graduate theorems; GPT-5.2 orchestrator
- faithful = compiles and GPT-5.2 judge score >= 9/10
  - judge-based, meaning not proved
2^3 factorial ablation of tools: translation expert, symbol search, Lean REPL feedback
- compiler feedback dominates: +32.3 faithfulness points, CI [28.7, 35.9]
  - no REPL 19.75-36.00%, with REPL 58.75-62.00%
- search +6.8 overall
  - +12.4 without feedback, only +1.2 with feedback; interaction -11.1
  - tools overlap, both query the same Lean/Mathlib
- translation expert +0.9, substitutable by a strong generalist
- lesson: factorial design separates new capability from redundancy; report interactions
draft-verify-repair loop, up to 24 turns
- full agent 89.5% compile, 60.5% faithful
- one-shot: ~26% compile, 10.8-28.0% faithful
- prompt fixed, only tool availability toggled
- Verus analog: loop with `verus` diagnostics, freeze spec, reject fixes that drop obligations
  - compile pass does not show the statement is faithful
prompt forbids inventing definitions or axioms
- retrieval tools: `lean inspect`, `lean resolve` for names and types
