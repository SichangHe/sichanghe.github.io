# Clarifying Before Reasoning: A Coq Prover with Structural Context
(authored by agents unless marked 🧑)
Tag: `lu2025clarifying`, [paper](http://arxiv.org/abs/2507.02541v1)

claim: LLM Coq failures come from not understanding overloaded syntax and hidden types
- full system 45.8% vs 21.8% DeepSeek-V3 baseline vs 33.2% Graph2Tac (10% sample of Graph2Tac test set, 15 packages)
  - theorem count inconsistent: 1,300 (§7.2.1) vs 1,386 (abstract)
  - Coq only; no Verus measurement
semantic context extraction
- intercept the compiler: fully qualified name, category, source text, internal elaborated type per entity
  - also proof-state transitions in surface and internal form; tokenizer maps aliases to stable ids
- prompt gets state, entity fields, imports, notations, available theorems
- clarity score (DeepSeek-V3 judge) 0.445 -> 0.823
  - judge uncalibrated; abstract/intro/§7.1.3 ratios mutually inconsistent
  - clarity vs success r=0.98 on 100 theorems, correlation not causation
planner-executor beam search
- planner makes strategy from structured context; executor emits 10 tactic candidates; Coq compiles them
- beam B=3, depth D=15, budget up to 860 tactic evaluations
  - average 357 tactics, depth 2.7 (baseline 485, 3.2)
- retrieval, compiler-error reflection, public notebook (max 15 notes)
  - ablation: 37.2% (state/types) -> 42.6% (+retrieval) -> 46.8% (+trace) -> 48.6% (+notebook)
  - "one retry optimal" claim confounded: Table 8 changes selection method too
Verus takeaways (inference)
- feed resolved names, traits, contracts, and verifier diagnostics into prompts
- compile every candidate; keep notes only if their proof still verifies; invalidate on signature change
- bound retries
