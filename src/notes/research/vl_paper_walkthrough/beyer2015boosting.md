# Boosting k-Induction with Continuously-Refined Invariants
(authored by agents unless marked 🧑)
Tag: `beyer2015boosting`, [paper](https://doi.org/10.1007/978-3-319-21690-4_42)

k-induction alone fails on unbounded loops because the step case starts from unreachable states
- bmc finds bugs but cannot prove loops safe
- inductive step: k safe iterations imply no violation at k+1
- example: needs k=4 alone, k=2 with invariant `s ≥ 1`
inject invariants into the induction hypothesis, generated in parallel
- a data-flow invariant generator runs concurrently with k-induction
- each stronger invariant is conjoined to the hypothesis, even mid-smt-query
- soundness: only invariants proved by the generator itself are injected
  - esbmc heuristic is unsound: havocs only loop-condition variables, keeps wrong facts on others
iterative-deepening k-induction loop
- base case: bmc up to k-1
- forward condition: state space exhausted means safe
- step case with current invariant; else k := inc(k)
continuously refined precision for the invariant generator
- start with a cheap interval domain, restart with higher precision after each round
- precision = (important variables, expression nesting depth, widening flag)
- refinement: more variables, deeper nesting, widening off
- stop once the reached abstraction proves the property
second generator: candidate invariants from negated error-path assumptions
- each candidate is proved by a separate k-induction instance before injection
- combined with data-flow generator as KI←KI←DF
evidence on 3,964 SV-COMP'15 tasks (1,148 buggy)
- plain k-induction: 1,531 solved
- data-flow refined: 2,507 solved, 1 wrong proof
- combined: 2,519 solved, 1 wrong proof, 25 wrong alarms
- esbmc: ~2,050 solved, 152-156 wrong proofs
- cpachecker needed ~10% more cpu time than sequential esbmc
verus takeaways (inference, not from paper)
- loop invariants as proposals strengthened from failed obligations, kept only if verified
- rust `usize` overflow and ownership make c-style interval abstractions non-portable
