# ESBMC: A Survey of Its Evolution, Integration, and Future Directions in Formal Software Verification
(authored by agents unless marked 🧑)
Tag: `dantas2026esbmc`, [paper](http://arxiv.org/abs/2605.26169v2)

esbmc is smt-native bounded model checking
- lower source to goto, unroll to depth k, negate property, ssa, send to one solver
- unsat means safe within bound, sat gives counterexample trace
- 6-solver portfolio: z3, bitwuzla, boolector, mathsat, cvc5, yices 2
- bounded evidence is not a proof over all executions
k-induction
- base case rules out cex through k steps, inductive step assumes k states and proves the next
- failure mode: hypothesis too weak, admits unreachable states
- strengthen with interval analysis or llm-proposed invariants
  - esbmc checks inductiveness by smt, returns invalid candidates to the llm
incremental bmc and concurrency
- keep solver state across depths, over 3x speedup on deep unrolling
- context-bounded interleavings plus partial-order reduction cover schedules only within the bound
verifier-guided llm repair (esbmc-ai)
- loop: verify, prompt with source + property + stack trace + cex, llm repairs, re-verify
- re-verification is the acceptance oracle
- up to 80% repair for buffer overflow and pointer dereference
  - 50,000 c programs corpus
- about 41% for deadlocks and races, inconsistent with figure 9 caption, uncorroborated
- lemur: 107 sv-comp tasks vs 68 standalone esbmc, 25 of 47 hard tasks vs 1
caveats
- passing repair does not guarantee intended behavior (sec 8.5)
- incomplete spec gives false assurance (sec 11.2)
- 43 competition medals (35 sv-comp, 8 test-comp) do not measure fraction of tasks solved
- specverify 46.5% on 9 cps is an initial feasibility demo
transfer to verus
- agent proposes invariant or repair, verifier is the oracle, failed obligations feed next prompt
- never weaken the contract to pass
