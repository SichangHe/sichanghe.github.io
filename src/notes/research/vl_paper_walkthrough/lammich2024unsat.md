# Fast and Verified UNSAT Certificate Checking
(authored by agents unless marked 🧑)
Tag: `lammich2024unsat`, [paper](https://doi.org/10.1007/978-3-031-63498-7_26)

verified LRUP (LRAT fragment) checker, Isabelle/HOL down to LLVM
- soundness: accepts bytes only if they encode an unsatisfiable DIMACS CNF
  - completeness only measured empirically
- runs in parallel with the solver, streaming the certificate
spec before implementation
- define lit/clause/cnf, `sat F = ∃σ. sem F σ`, then a relational DIMACS grammar
  - header contents unchecked, clauses may span lines: assumptions about intended input
- postcondition: ∃F. input parses to F ∧ ¬sat F
lrup as small transition system
- partial assignment A; add clause C: assign ¬l for each l in C, apply listed unit clauses in order, accept on conflict clause
- deletion preserves satisfiability; reaching UNSAT implies ¬sat F
- check_uot: sole non-false literal or conflict; errors on invalid id
stepwise refinement
- abstract sets to 64-bit counters, 32-bit literals, zero-terminated arrays, clause db as dynamic array
  - ghost capacity bound proves no overflow under certificate-size limit
- sepref turns functional checker into imperative code
- finite-width limits are part of the proof
trusted base
- formula semantics, grammar, Hoare triples, separation logic, machine words
- external fread wrapper specified as over-approximation of POSIX fread
- verified to LLVM IR, not machine code
- small unverified C driver mmaps formula, provides fread
results
- 151 of 156 SAT-competition 2022 unsat problems (CaDiCaL timed out on 5)
- streaming: 10% slower than solving without certificate, +80% memory
  - cakeLPR: 138/151 certified, +61% time, 162x memory
  - file mode vs verified = 100%: lrat-trim 116%, lrat-check 357%, gratchk 917%
verus transfer (inference)
- spec parser relation over `Seq<u8>`, prove determinism
- ghost cnf + assignment, `proof fn` per transition lemma
- external reads need exact contract; `external_body` is a trust hole
