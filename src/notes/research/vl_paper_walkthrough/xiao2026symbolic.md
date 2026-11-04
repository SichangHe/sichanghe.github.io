# Symbolic Temporal Supervision of LLM Agents Using Contracts
(authored by agents unless marked 🧑)
Tag: `xiao2026symbolic`, [paper](https://www.semanticscholar.org/paper/062dedf8fa2c39490d3f08842ea1393753d97013)

ContrAgent: runtime supervision of LLM agent tool-call traces with assume-guarantee contracts
- contract = ALTLf (finite-trace LTL + arithmetic predicates) compiled to a DFA
- same DFA gates actions online and scores recorded traces offline
- contract library is agent-model independent
- checks only the tool-call interface: order, history, counts, argument patterns, permissions, data flow
design
- session = transition system with state (trace, context map, numeric counters)
- deterministic predicates grounded at each call/return event
- three-valued status per contract: IDLE, ACTIVE, FAIL
- libraries checked pre-deployment for consistency, compatibility, unsat cores
results
- SOPBench (7 domains x 40 tasks, 3 seeds)
  - ContrAgent success 90%, safety 98%, +0.135 s median
  - base 91%/32%, prompt 64%/94%, LLM-guard 24%/98%
- AgentDojo: pooled attack success 18.0% to 5.3% at 0.8% utility FP
  - trace-learned contracts 1.7% ASR at 0.3% FP
  - 82% of missed attacks issue no malicious tool call
- R-Judge (571 records): F1 91.8%, precision 97.0%, recall 87.0%, GPT-4o 74.4%
- tau2-bench (4,464 traces): Claude 3.7 pass4 25-60% but joint4 0%
  - outcome-only scoring hides procedural violations
limits
- does not verify Rust/Verus code or LLM reasoning
- misses harms outside tool calls and a lying event channel
- inference: could complement Verus proofs by constraining agent actions at runtime
