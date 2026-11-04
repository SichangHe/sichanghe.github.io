# Partial Contracts Suffice: Sound, LLM-Inferred Regression Verification
(authored by agents unless marked 🧑)
Tag: `charalambous2026partial`, [paper](https://arxiv.org/abs/2607.10291)

trust model: llm proposes, verifier enforces
- llm-inferred contract for old function is checked by ESBMC against the old body
  - only enforced contracts are used, a wrong guess is rejected not believed
- target: safety-preserving conditional equivalence of C functions
  - on inputs where old satisfies property, terminating old and new runs agree on observed outputs
  - termination regressions out of scope
partial one-sided contract
- contract = requires + ensures + assigns, over-approximates only the old function
  - enforce `[[f_old]] ⊆ [[C]]`, then replace old by contract and run new concretely
  - assert observed-output equality for every contract-permitted old output vs new output
- needs precision only on the output the property observes
  - e.g. contract constrains `o.w`, leaves `o.h` free, so a height fix passes
- loose contract may admit outputs old never produces, so a divergence can be spurious
- vacuity probe: unsatisfiable precondition is reported inconclusive
- assumes terminating runs, sound frame rule, sound verifier
depth-bounded contract closure
- depth < N: inferred contracts, enforced callee-to-caller
- depth = N: boundary contract (true pre/post, frame covers all reachable locations), no enforcement needed
- deeper functions: no contract, not expanded
- bound trades precision for cost, iterative deepening can refine
counterexample-guided inference (SCRIBE)
- feed concrete offending write (file, line, address expr) into next prompt, not bare VC failure
- at most 5 refinement iterations, most targets pass in 1
- Opus 4.8, Kimi K2.6, Qwen3.6-27B, temperature 0, 300 s limits
semantic tightness ordering (JUDGE)
- compare admit sets by SMT implication both ways, since syntactic clause counts are inflatable
- T2: tighter enforced contract discharges every obligation the looser one does
- failed implication can be spurious (frame dropped), ~40% of comparisons unorderable (quantified or pointer postconditions)
results
- EqBench-C, 272 pairs: contract-free baseline decided 70 (14 false positives)
  - with contracts, decided 102-106, about 38-40 false positives, ≤1 false negative
- Frama-C-Problems 51 programs: 70.6% Opus, 78.4% Kimi, 70.6% Qwen (non-results count as failures)
- X509: 5/6, 5/6, 3/6 vs AutoSpec published 6/6, function sets not identical
- caveats
  - small benchmarks, cross-tool comparison uses published numbers
  - 9 EqBench pairs mislabeled equivalent
  - no large production C
verus transfer (inference, not validated by paper)
- prove old body meets spec, then relational old/new harness using that spec
- boundary contract needs conservative frame of reachable mutable state
- return verifier failures to model, accept only after verification
