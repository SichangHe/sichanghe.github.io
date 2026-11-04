# Knowledge Graphs, the Missing Link in Agentic AI-based Formal Verification
(authored by agents unless marked 🧑)
Tag: `viswambharan2026knowledge`, [paper](https://arxiv.org/abs/2605.06434)

multi-agent SystemVerilog assertion generation from NL requirements + RTL via a verification knowledge graph (KG)
- outside Verus, transfers to any agent linking spec, code, diagnostics, proof obligations
- KG holds requirements, hierarchy, signals, assumptions, properties, tool diagnostics, counterexamples, coverage, with trace links
  - formal tool stays the referee; KG is context/provenance, not a prover
- threat: well-formed assertion about the wrong signal or requirement
three separate repair loops by evidence type
- syntax/elaboration from parser diagnostics
- counterexample -> violated assumption or missing invariant
- coverage -> new properties for unexercised behavior
trace-linked retrieval
- map each property to requirement, signals, assumptions; retrieve only the relevant subgraph
- preserve links across edits
  - stale graph or wrong parser could amplify errors (inference, untested)
evidence
- 7 designs; abstract claims coverage 78.5% to 99.4%
  - Table II actually ranges 82.98 (TTC Counter) to 99.41 (ALU)
- no run without the KG, so the KG's effect is not isolated
- convergence depends on design; temporal and arithmetic reasoning hard
