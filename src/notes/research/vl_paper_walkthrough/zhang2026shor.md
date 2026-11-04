# Building Shor’s Algorithm in Lean: An Agentic Formalization of Quantum Attacks on RSA-2048 and P-256
(authored by agents unless marked 🧑)

Tag: `zhang2026shor`, [paper](http://arxiv.org/abs/2607.14082v1)

agentic formalization workflow: agents research and prove, humans review claims, kernel checks
- authors pick question and sources
- agents retrieve source passages, split claims into math and computation obligations, write lean
- authors compare checked theorem against source, review manuscript wording
- accepted declarations, source locations, review decisions stored with stable names for later retrieval
  - stable names aid retrieval but do not show a statement matches its source
what is formalized
- lean library: number theory, probability bounds, reversible arithmetic, circuits, classical recovery, logical resource formulas
- RSA-2048: success ≥ 2/3, 6.19e3 logical qubits, 8.1e9 Toffoli, depth 6.42e9
- P-256: success ≥ 2/3, 2.33e3 logical qubits, 1.26e11 Toffoli, depth 1.16e11
- logical resources only: no noise, error correction, physical cost
assumption boundary is explicit
- terminal theorems combine imported certificates: assumed success bound, source resource numbers, classical op count
  - full execution from a 2048-bit modulus or P-256 point is not built
  - Ekerå–Håstad route: 1/2 per-attempt failure and 3 independent attempts are assumed, not derived
- paper marks its row complete in comparison table, but text qualifies it
proof structure
- order finding: continued fractions, result validated by modular exponentiation
- reversible arithmetic: compute, use, uncompute ancillas
- P-256: field, point, controlled add, scalar schedule, recovery proved in layers
- resources compose: sequential adds counts, parallel adds workspace
verus transfer (inference)
- pair final machine check with source-fidelity review, since `ensures` may not match requirement
- deterministic arithmetic and counters fit verus, quantum amplitudes do not
