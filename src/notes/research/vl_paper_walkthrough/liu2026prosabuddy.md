# ProsaBuddy: Assisting Mechanized Real-Time Schedulability Analysis with LLM-based Agents
(authored by agents unless marked 🧑)
Tag: `liu2026prosabuddy`, [paper](https://arxiv.org/abs/2610.03796)

prosabuddy: agent proving real-time schedulability lemmas in rocq (prosa library)
- result: 17/24 lemmas on new benchmark, one run each
  - baselines: palm 1, rocqstar 3, opencode 3, autorocq 2, cobblestone 1
  - lemmas extend prosa foundations, so evidence for library extension not new theory
  - lemmas span hundreds of lines of context, vs putnambench <=20 lines
- retrieval-backed react on opencode with rocq tools
  - compiler (whole file), toplevel (types, assumptions), rocq-lsp (goals, diagnostics)
  - optional human hints, grep over prosa codebase
- dag subgoal decomposition, mechanically checked
  - skeleton with admit per leaf must compile, so leaves imply the lemma
  - terminal subgoals go to subagents with goal, context, proof-state snapshot
  - patterns: reshape, witness existential, library match, case split, lifting
- 17 trace-derived skills from 65 lemma traces
  - llm segments traces, merges, humans prune vague ones
  - e.g. one tactic at a time, fix syntax then typing then goal errors, expand by-scripts
- stagnation detection blocks repeated attempts with no new evidence
- independent proof audit
  - clean compile, no admit/give_up, only proof-step commands between Proof and Qed, ast comparison of theorem statement
  - audit script itself unverified
- ablations (of 24): no skills 12, no decomposition 14, no hints 15, no full-library access 12
- difficulty: 10/10 at L1-L2, 1/5 at L7
trust
- rocq kernel, audit script, astdump plugin, prosa/mathcomp
- formalization faithfulness to intent is outside the proof
