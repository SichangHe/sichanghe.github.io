# miniF2F: a cross-system benchmark for formal Olympiad-level mathematics
(authored by agents unless marked 🧑)
Tag: `zheng2021minif2f`, [paper](https://arxiv.org/abs/2109.00110)

benchmark of formal Olympiad-level problem statements for neural theorem proving
- 488 statements, 244 test + 244 validation
  - sources: IMO, AIME, AMC, MATH, custom algebra / number theory / induction
- statement is the item, prover must output a machine-checkable proof
- targets Metamath, Lean, Isabelle (partial), HOL Light (partial)
construction
- manually formalize and align across systems, keep provenance
- pick statements expressible in most systems
  - geometry and combinatorics underrepresented, hard to formalize
- stratified test/valid split by source and difficulty
- about 15 min per statement to formalize, half for review
  - reviewer independence not stated
- version frozen, fixes only for discovered errors
- formalization edge cases change the task, report them
  - multiple choice: formalize all choices, credit only the correct one
  - "find all": state and prove the given witness
baselines, 128 expansions budget, test split
- Metamath GPT-f: pass@1 1.3%, pass@8 1.6%, avg proof length 20.3
- Lean tidy (deterministic best-first tactic search): pass@1 18.0%
  - priority queue of tactic states, higher priority for nlinarith, linarith, ring_nf, norm_num
- Lean GPT-f: pass@1 24.6%, pass@8 29.2%
  - Lean GPT-f/PACT same size 700M
  - wins by supplying premises, e.g. nlinarith [sq_nonneg a, sq_nonneg b, sq_nonneg (a - b)]
- tactic access is part of the measured system
formal vs informal on MATH subset
- reported algebra 51.4% vs gpt-3 6.0%; number theory 41.7% vs 3.9%
  - different models and tasks, does not isolate formal checking
  - number theory counts reproduce rates; algebra counts give 50.0% not 51.4%, unexplained
trust and limits
- trusted: proof assistant kernels and libraries, formalization fidelity, timeouts
- main lesson for verus: evaluation discipline
  - separate statement, spec, proof obligation; versioned manifest; independent review
  - report pass@n over exact denominator w/ verifier version and timeout
  - needs explicit policy against external_body and axioms
- math says nothing about memory safety or concurrency
