# Numina-Lean-Agent: An Open and General Agentic Reasoning System for Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `liu2026numina`, [paper](https://arxiv.org/abs/2601.14027)

numina-lean-agent: claude code as controller + numina-lean-mcp tools for lean
- tools: lean-lsp-mcp (goals, diagnostics, run code, multi attempt, loogle, local search), leandex retrieval, informal prover, discussion partner
  - agent picks tools by query, no fixed pipeline
  - no ablation per tool, no retrieval quality or error rate measured
- result: 12/12 putnam 2025, plus >8,000-line brascamp-lieb formalization
  - table compares on 12 named problems, not a sample
- informal prover: generator + verifier loop before formalizing
  - accept only if 3 independent verification passes agree, cap 20 iterations
  - putnam B4: 5 rounds vs independent sampling failing in 10, a single problem
  - verus analogue: acceptance must be verus check, not llm votes
- discussion partner: ask other llms for alternative paths at bottlenecks
  - advisory only, suggestions tried via lean, no isolated measurement
- subagent decomposition for long context
  - A5: blocked lemma isolated, gpt-5.2 informal hint, formalized separately
  - A5 solved only with subagent row, ~$1,000 and 2,040 min, one problem
- blueprint plan-formalize-refine
  - definitions, lemmas, final theorem, dependency dag via \uses, revised from compiler feedback
  - no controlled comparison against direct proving
  - verus analogue: helper proof fn contracts as dag edges, verify leaves first
- human hints and statement self-correction
  - mathematician + lean expert + agent, <2 weeks, ~70 definitions/lemmas/theorems
  - agent fixes false statement (empty case, appendix A.2)
  - displayed main theorem still has by sorry
trust
- lean kernel, lean-lsp-mcp, mathlib, seed-prover 1.5 statements, model apis
- related: `forall_lean_agent_for_auditable_reasonin_20261013.md`
