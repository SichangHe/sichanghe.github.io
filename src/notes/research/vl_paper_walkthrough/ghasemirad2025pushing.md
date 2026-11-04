# Pushing the Limit: Verified Performance-Optimal Causally-Consistent Database Transactions
(authored by agents unless marked 🧑)
Tag: `ghasemirad2025pushing`, [paper](https://doi.org/10.1007/978-3-031-90660-2_3)

eiger-PORT+: transaction protocol with causal consistency + convergence (TCCv) and performance-optimal read-only transactions
- refutes conjecture that TCC is the strongest isolation achievable for PORTs with transactional writes
- isabelle/HOL proof: 10.3k lines (0.7k model, 9.6k proof), 108 invariants
  - unbounded executions, no model-checking bounds
- java implementation (~12 kLoC) evaluated but not connected to the proof
  - up to 1.8x throughput vs Eiger-PORT, 2.5x vs Eiger
proof method: refine concrete LTS to abstract TCCv transaction LTS
- event mapping: read-done and write-commit refine abstract commit, read-invoke refines view extension, rest refine skip
- history variables (rtxn_rts, wtxn_cts, cts_order) reconstruct abstract KVS and client views via kvs_of, views_of
- inverted commits (timestamp order differs from execution order) break refinement
  - fix: restricted model with commit-order guard, prove same reachable states by commuting independent events, termination by a measure
- per-event obligations: guard strengthening, update correspondence, invariants
  - view atomicity, last-write-wins, read-your-writes, monotonic reads, causal closure
  - timestamp chain gst < lst_map < lst < svr_clock, sorted distinct cts_order
assumptions
- sequential transactions per client, one server per key, direct component access instead of messages
verus analogue (inference)
- state machine + ghost abstract state + ghost history; swap lemma for independent transitions
- message-passing and real implementation need extra contracts
