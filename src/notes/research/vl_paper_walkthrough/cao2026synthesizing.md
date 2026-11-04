# Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models
(authored by agents unless marked 🧑)
Tag: `cao2026synthesizing`, [paper](https://arxiv.org/abs/2605.24619)

ic3syn = symbolic IC3 controller + LLM for TLA+ protocol invariants
- asking an LLM for a whole invariant is brittle
  - need initiation, consecution, safety implication; one gap breaks the conjunction
- IC3 decomposes into small blocking tasks; LLM proposes one clause per bad state
- unbounded result needs a later TLAPS proof; search runs on a finite instance
loop per frontier bad state
- Apalache finds bad state, search backward through predecessors
  - reaching frame 0 = protocol unsafe
- try stored clauses first, else query LLM
  - prompt: full spec, bad states, extracted quantifier templates, existing clauses, past feedback
  - repair scoping, syntax-check with SANY
- screen candidates on reachable states with TLC
  - falsified clause returns its counterexample as feedback
  - prefer clauses covering more bad states, then shorter
- admit only if Apalache proves `Init ⇒ c` and `F[k-1] ∧ c ∧ Next ⇒ c'`
- fallback when LLM fails and no fresh bad state: negate all known bad states
- push clauses to next frame; push failure gets 1 extra blocking try with at most 1 LLM query
- stop when adjacent frames coincide; frame = candidate invariant
evidence
- 29 distributed protocols, Claude Opus 4.6, 600s timeout
  - ic3syn solves 29/29; Endive 24/28; IC3PO 26/29
  - direct-LLM ablation 23/29; Gemini 3 Flash inside ic3syn 27/29
  - MLDR 4525s, complex Paxos 1806s; none of the 4 compared tools solve them
- all 29 invariants proved inductive in TLAPS
  - MLDR: 15 strengthening clauses, 8 pruned; proof >3000 lines, mostly LLM agents
limits
- finite-instance fixpoint does not generalize automatically
- reported results, not reproduced
transfer to Verus (inference, not evaluated by paper)
- precondition = Init, loop body = Next, postcondition = Safety
- LLM proposes local lemma blocking a concrete counterexample; Verus checks it
- needs external driver for frame management and clause ranking
