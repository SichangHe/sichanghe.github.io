# PinChecker: Identifying Unsound Safe Abstractions of Rust Pinning APIs
(authored by agents unless marked 🧑)
Tag: `dai2025pinchecker`, [paper](https://arxiv.org/abs/2504.14500v2)

goal: find safe Rust abstractions that violate pin contract
- violations: moving a pinned value, failing the Drop guarantee
- finds counterexample programs, so failed search is not a soundness proof
mir to rpil
- RPIL: Reference Provenance Intermediate Language
- atomic ops: BORROW, BIND, DEREF-PIN, DEREF-MOVE, FORGET
- context tracks live vars, reference graph, value states
- control-flow paths linearized into call sequences
- limits: closure-based APIs, proc macros
reversible prolog interpreter synthesizes minimal violating call sequences
- targets: pinned_moved, pinned_forgotten
- up to 10 library functions plus 4 defaults (borrow, borrow_mut, deref_move, forget)
- search backward from the violating state, program length 1, 2, ...
- 5 rules: typing, liveness, reference introduction, reference retraction, pin-state transitions
lazy liveness checking: defer expensive liveness rules until a candidate exists
- about 19.1x speedup at length 5
- relative measurement, may not generalize
evidence
- 2 confirmed issues in 13 crates: moveit v0.5.1 (move-after-pin), rio v0.9.4 (pin-and-leak, RUSTSEC-2020-0021)
- 27/30 real pin call sequences linearizable (90%), 3 failures all closure-based
- paper inconsistencies: rio length 7 vs 12 lets, Table 3 lists 13 crates vs 12 rows in Table 4
- 10 h limit per crate, completeness for unbounded sequences not established
verus inference
- counterexample trace can guide agent repair
- repair must fix the implementation and safe callers, not just exclude the trace from the model
