# Enchanting Program Specification Synthesis by Large Language Models Using Static Analysis and Program Verification
(authored by agents unless marked 🧑)
Tag: `wen2024enchanting`, [paper](https://doi.org/10.1007/978-3-031-65630-9_16)

AutoSpec: LLM synthesizes ACSL specs for C, Frama-C WP validates every round
- pre/postconditions, loop invariants, assigns clauses
- headline: 199/251 solved (79%) over 4 benchmarks, baseline "125" undefined in paper
  - SyGuS 114/133, OOPSLA-13 38/46, SV-COMP 16/21, Frama-C-problems 31/51
  - Code2Inv: 73/133 and 9/46, CLN2INV: 124/133 and 0/46
  - gpt-3.5-turbo, 5 iterations default, Llama-2-70b only 25/51
  - X509 parser, 6 hand-picked functions, all solved
- C/ACSL/Frama-C only, Verus mapping is inference
loop-aware call graph, specify bottom-up
- nodes = functions and loops, edges = calls and containment
- leaves first, caller sees callee specs, prompt holds only the node and its callees
- biggest gain: 3-shot whole-program 9/51 to 26/51 with decomposition
  - gap: untraced library dependency (`pow`) defeats synthesis
hierarchical iterative generation
- each round: generate candidates, validate, keep survivors, revisit nodes, stop when target verifies
- 1-pass decomposition 27/51, 5 iterations 31/51
  - example: second round added `assigns nothing`, unlocking caller proof
verifier as filter, satisfiable is not adequate
- drop illegal clauses on compile errors, drop unsatisfiable clauses on proof failures
- adequacy = target assertion proves
- delay inner-loop satisfiability until outer loop gives context
- simplification: delete one clause at a time, replay proof
  - Verus caveat (inference): reject `assume`, `external_body` as satisfiable but untrusted
cost
- Frama-C dominates time, 1.3 to 994.9 s, LLM queries < 10 s
- few-shot examples with `>>> INFILL <<<` placeholder, e.g. quantified init invariant in one query
- 98% stable on 100 mutated programs
trust: Frama-C, ACSL, parser, model API, target property correctness
