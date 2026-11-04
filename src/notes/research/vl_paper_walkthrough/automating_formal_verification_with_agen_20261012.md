# Automating Formal Verification with Agent-Guided Tree Search
(authored by agents unless marked 🧑)
Tag: `yao2026automating`, [paper](https://arxiv.org/abs/2605.27485)

setup: fill `sorry` holes in Lean specs, 423 tasks
- subsets: 62 bignum, 172 VerifiedCogen, 189 Verina
  - GitHub-scraped and autoformalized sources excluded
- success counted only if Lean verifies and bypass check passes
  - reject `sorry`, `admit`, axioms, `unsafe`, `Unchecked.cast`, `@[extern]`
  - trusted: Lean kernel, anti-cheat filter, benchmark specs, parser, APIs
vericoder baseline: restart-per-round replacement with compiler feedback
- model returns JSON array, 1 replacement per hole; applied to unchanged original file
- 5 attempts per spec
- GPT-5.4 no reasoning: 24.6% (104/423); 10-model union 32.2%
  - first-code-block parser discarded later self-corrections: Sonnet 4.6 gave multiple JSON blocks in 53.9% of 1,817 responses
- Verus form (inference): protocol transfers, Lean tactic names do not
persistent agent loop with mathlib search
- 1 conversation, `submit_code` tool + `search_mathlib` (LeanFinder, Loogle via Lean-LSP-MCP)
  - call budget K, stop at first verified submission
- K=10, medium reasoning: 6-model union 62.2% (263/423) vs 31.7% for vericoder
  - bundles reasoning, loop, search; no ablation
  - GPT-5.4: 24.6% to 60.3%
- K=50: GPT-5.4 95.0% (402/423)
  - bignum 87.1% (54/62), VerifiedCogen 96.5%, Verina 96.3%
  - bignum cumulative 12/62 at K=10, 20 at K=20, 42 at K=30, 54 at K=50
- search/submit ratio: GPT-5.4 5.29, mini 7.17, Gemini Flash-Lite 0.28
- caveats: likely saturation and contamination (p. 64); cost assumes free cache reads
- Verus form (inference): `search_verus` over verified lemmas plus `submit_code`
state-based tree search: parent + subagents on partial proof states
- parent: `explore_variations` (up to 4 subagents, 5 turns each), `update_base`, `undo_base`
  - subagents get distinct advice from 5-class strategy palette, return debriefs
- K=50: GPT-5.4 67.8% (287/423), mini 49.6%; both below persistent agent
  - fresh branches redo searches: ratio 11.47 vs 5.29
  - `resume_variations` made it worse: 66.4%, mini 47.0%
  - dynamic budgets, skeptical reviewer, Elo ranking: no gain beyond noise
context-based tree search: save the path (transcript), not the node
- `dispatch_subagent` (10 turns, optionally branched from an endpoint), `resume_endpoint`
  - new branch inherits endpoint history plus fresh advice
- round-2 GPT-5.4: resumed contexts 38.7% vs empty-context dispatch 17.9%
  - searches 2.3 vs 15.1 per run
- K=50: GPT-5.4 88.2% (373/423), mini 54.8%
  - beats state-based by 20.4 points but below agent 95.0%
  - bignum 72.6% vs agent 87.1%
- authors infer width/depth tradeoff: branching finds strategies, parent decisions interrupt deep iteration
  - limited to 2 models, 3 Lean subsets (inference)
numbers to handle with care
- 95.0% is the persistent agent, not tree search; tree-search headline is 88.2%
- subset and total denominators must not be merged
inference: threat to agent-written verified Rust is high
- high for boilerplate and local invariant repair, medium for composed modules with fixed contracts, unresolved for end-to-end security properties
- 95% on 423 synthetic specs shows automation capability, not safe contract design
