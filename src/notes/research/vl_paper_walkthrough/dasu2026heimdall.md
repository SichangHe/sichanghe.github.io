# Heimdall: Formally Verified Automated Migration of Legacy eBPF Programs to Rust
(authored by agents unless marked 🧑)
Tag: `dasu2026heimdall`, [paper](http://arxiv.org/abs/2605.25411v2)

goal: LLM migrates C eBPF to Aya Rust with layered checks
- no functional spec; enforces source-level obligations, not author intent
- an unsafe program reaches the kernel only if source safety checks and the kernel verifier both miss it
- trusted base: symbolic executor and equivalence checker
6-stage pipeline
- 1 LLM translation (prompt has Aya API mappings, hook macros, map patterns, example)
- 2 compile with lint guards and kernel-verify, errors loop back to the LLM
- 3 static safety analysis: typed Aya interfaces, explicit handling of fallible helper results, reject unsafe escapes
- 4 symbolic execution of both objects with angr
- 5 equivalence check on return values, map state, ordered output events
  - UNSAT: conditionally verified
  - SAT: counterexample goes to stage 6
- 6 LLM triage: translation mismatch goes back to repair, C-bug claim stops for developer
safe APIs eliminate verifier-accepted C bugs
- Rust init rules, `Result`, and unsafe-escape policy block uninitialized leaks and ignored helper returns
- Aya wrappers avoid raw pointer lengths
- `=` vs `==` bug blocked since assignment has unit type
- hook-specific constants avoid action-code confusion, e.g. `XDP_PASS` is 2 but `TC_ACT_SHOT` under TC
- 115-program dataset: 137 unchecked helper returns fixed
- 9 real bugs in 9 programs, 2 expose kernel addresses defeating KASLR, 8 fixed upstream
equivalence checks bytecode, not source
- symbolic map keys: if-then-else chains over ordered writes
- guarantee is conditional: helper calls succeed, uninitialized reads return zero
  - a C bug on a safe path needs the C reference fixed first
- map-value and state-representation differences dominate equivalence failures
evidence
- agentic Opus 4.6: 109/115 (94.8%) fully verified
  - mean 17.7 min and $3.04 per program, 2.91x bytecode size, 15.5 sanctioned unsafe ops
- runtime validation: 10 programs, 100 trials each, 1000/1000 outputs identical
  - mean Rust/C runtime ratio 0.44x to 1.89x
- retrieval and repair build candidates, the guarantee still depends on the checker
Verus relevance (inference)
- explicit result types for helper outcomes, contracts for buffer length and initialization
- Rust type checking does not replace a semantic contract or equivalence proof
