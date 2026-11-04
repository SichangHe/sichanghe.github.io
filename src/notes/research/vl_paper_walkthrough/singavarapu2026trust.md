# A Trust Ledger and an Execution Check for CPG-Based C-to-Lean 4 Autoformalization: Separating Declined from Silently Incorrect Translations
(authored by agents unless marked 🧑)
Tag: `singavarapu2026trust`, [paper](https://doi.org/10.48550/arxiv.2609.38237)

core claim: declined constructs and wrongly handled constructs need separate accounting
- declined construct = explicit labeled hole, counted in coverage
- mishandled construct = well-typed output that counts as translated but computes the wrong answer
setup: deterministic Joern CPG → Core AST → fuel-indexed Lean interpreter
three-tier trust ledger
- hole-free: AST has no hole
- call-closed: hole-free and every callee resolves in the translated program
- dynamic-hole risk: may reach unmodeled behavior
- SQLite: 8,602 functions, 5,222 (60.7%) hole-free, 2,134 (24.8%) call-closed
  - 2.4x gap is a denominator effect, not a second experiment
- Joern parses C without preprocessing, so absent definitions can evade the ledger
differential execution as oracle
- run translated program vs real C compiler on one-feature fixtures, keep defective translation as negative control
- bugs found by execution, invisible to hole counts
  - char literal 'x' rendered as string: length 0 vs C's 3, hole count unchanged
  - do-while emitted as while: 0 vs 1
  - escaping struct-local pointer: statically hole-free, fails at evaluation
- claims are existential: no defect-frequency estimate
verus takeaways (inference)
- keep proofs and differential tests as separate evidence
  - a satisfiable contract can still encode the wrong operation
- track unresolved constructs in a ledger outside the Rust source
- attach every percentage to its exact population
