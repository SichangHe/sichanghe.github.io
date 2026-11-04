# Cazamariposas: Automated Instability Debugging in SMT-Based Program Verification
(authored by agents unless marked 🧑)
Tag: `zhou2025cazamariposas`, [paper](https://doi.org/10.1007/978-3-031-99984-0_5)

proof instability: smt verifiers (Dafny, F*, Verus) fail after irrelevant edits e.g. renaming
- 61% of unstable queries blame a single quantified formula
- tool repairs 431/615 unstable queries (70%), 375 with one edit
  - 545 Dafny/F* + 70 Verus queries, 77% of the Verus ones repaired
  - denominators are unstable queries only, not all queries
differential diagnosis
- mariposa makes equivalent mutants: reorder assertions, alpha-rename, change seed
- compare quantifier instantiations of a passing vs a failing mutant
  - proof log from passing, trace log from failing
  - requires z3 trace access
- deficit = instantiations in proof but not in trace
- excess = instantiations in trace but not in proof
edit-and-test repair
- hypothesize quantified axiom ϕ is causal, edit it, rerun stability test
- 4 edits: del, inst, inst-del, sk (skolemize existential)
  - del = source-level hide, inst = source-level assert/annotation
  - sound for the goal since axiom context is no stronger
  - del/inst-del may lose completeness elsewhere
- search top 10 singleton edits, then 10 doubleton edits only if none works
failure triage
- quick unknown (qu) hypothesized to be missing instantiations, fix by inst ranked by deficit
- timeout (to) hypothesized to be excess instantiations, fix by del/inst-del ranked by excess weighted by graph impact
  - impact from instantiation dependency graph (triggers, rewrites, skolem, nesting)
  - hypotheses, not proven from elapsed time
verus findings
- unrelated imported definition (`make_stateful_set`) caused instability, hiding it fixed it
- missing instantiation bridging Verus `Euc_Div` and smt-lib division, fixed by skolemize + dependent quantifier
- lesson: debug imported axioms and arithmetic encoding before rewriting the algorithm
caveats
- 70% includes proof-production workarounds under z3 4.13.0, 180 mutants per query
- source-level translation of edits is future work
