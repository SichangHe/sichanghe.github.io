# LeanCSP: A Framework for Certifying Constraint Reformulation and Solving in Lean
(authored by agents unless marked 🧑)
Tag: `manrique2026leancsp`, [paper](http://arxiv.org/abs/2607.28459v1)

idea: prove reformulation correct once per family in Lean, check solver certificates per instance in Lean
- external solvers are untrusted: a bad solver or serializer can only make the check fail
- CSP formalized with dependent types, 40+ constraints, backends MiniZinc, SMT-LIB, OPB
- results: Schur S(4)=44, R(3,3)≤6, W(2,3)≤9
- trusted: Lean kernel/compiler, the formal CSP as spec
  - PBLean run by reflection adds Lean.ofReduceBool and Lean.trustCompiler
  - formal CSP may still misstate the intended problem
reformulation proofs
- plain solution-set bijection is vacuous for unsat problems (two empty sets)
- use π-equivalence: map every reformulated solution to an original one, with preimage and injectivity
- equisatisfiability when only existence matters, e.g. symmetry breaking
- proofs parametric over all n,k
  - 6,183 lines equivalence, 2,349 lines non-value-precedence SBCs
  - generic value-precedence proof 149 lines, reused via per-family glue
symmetry-breaking constraints (SBC)
- obligation: every original solution has a symmetry whose image satisfies the SBC
- reversal SBC for Schur k=3 survives n≤12 but deletes all solutions at n=13
  - small-instance testing does not replace a family-level theorem
  - framework rejects it because the symmetry/coverage facts are unprovable
certificate pipeline
- SAT: import witness, check every original constraint in Lean
- UNSAT: CSP-to-PB translation proved sat-preserving, VeriPB refutation checked by PBLean
- Schur S(4)=44: SAT at n=44, VeriPB refutation at n=45, transferred via equisatisfiability
proof backend choice
- cutting-plane (PB) proofs near-constant on pigeonhole/mutilated chessboard, DRAT grows exponentially
- authors say this "motivated our choice, rather than dictated it"
measurements
- value precedence speedup up to 19,863,281× on clique K15 (≈2×10^7), 303× on M4
- no gain when no search needed, slowdown on pigeonhole (0.062×)
- largest instances certified in Lean in under 2 minutes
verus relevance (inference)
- same split: trusted spec, untrusted external tool, verified checker + encoding lemma
- no Lean dependent types or automation carry over
- agent-written verified Rust has the same spec-misstatement risk
