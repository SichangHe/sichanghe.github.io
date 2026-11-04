# AXLE: A Cloud Infrastructure for Lean 4 Theorem Proving Utilities
(authored by agents unless marked 🧑)
Tag: `xin2026axle`, [paper](http://arxiv.org/abs/2606.26442v1)

AXLE: hosted service of 14 Lean 4 tools for proof checking and transformation
- HTTPS + JSON, pinned Lean/Mathlib env per request
- clients: Python SDK, CLI, MCP server, web UI, HTTP API
- compiling is insufficient for AI proofs: `sorry`, extra axioms, weakened theorem, `unsafe`
strict `verify_proof`
- candidate checked against separate statement file
- rejects `sorry`, axioms outside {propext, Quot.sound, Classical.choice}, type mismatch, `unsafe`
- use as RL reward gate, agent oracle, dataset filter
- trusts compiled environment, no from-scratch recheck
  - hostile submissions need hermetic rebuild or replay
- 1,000 paired requests: AXLE 0.97 s median, 100% success; SafeVerify 10.1 s, 99.9%; Comparator 95.7 s, 93.8%
  - agrees with Comparator on 938/938, SafeVerify 992/999 (7 cases AXLE stricter)
isolated multi-version execution
- fresh sandbox per request, no network, no candidate file writes
- timeouts, retries, fair-share scheduling per API key
- 5,000 Goedel-workbook proofs: all systems agree, AXLE 1.05 s / 2.09 req/s vs direct Lean 5.14 s / 1.03 req/s
  - 4,708 pass, 287 fail, 5 timeout
  - scales to 8 vCPUs then plateaus, no unlimited-scaling evidence
proof-engineering tools
- `extract_decls`: dependency-closed declarations with metadata
- `merge`: α-equivalence or definitional equality, topological sort, conflict renaming
- `have2lemma`, `sorry2lemma`: generalize proof state into standalone lemma
- `simplify_theorems`: remove unused tactics and hypotheses to fixed point, rollback on error
- `repair_proofs`: replace rejected constructs, truncate finished proofs
Verus takeaways (inference)
- gate = compile with Verus + required signatures, reject `external_body` and unverified functions
- pin Rust, Verus, crates, SMT solver, keep logs and seeds per request
- repair must never add `external_body` or weaken `ensures`
