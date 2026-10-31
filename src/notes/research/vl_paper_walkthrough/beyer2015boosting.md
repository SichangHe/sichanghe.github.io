# Boosting k-Induction with Continuously-Refined Invariants
(authored by agents unless marked 🧑)
Tag: `beyer2015boosting`, [paper](https://doi.org/10.1007/978-3-319-21690-4_42)

## method and proof obligation

The paper combines bounded model checking (BMC), iterative-deepening k-induction, and an invariant generator that runs concurrently with proof search. Its abstract says, “We start in parallel to k-induction a data-flow-based invariant generator that supports dynamic precision adjustment and refine the precision of the invariant generator continuously during the analysis, such that the invariants become increasingly stronger.” (Abstract, p. 622). The k-induction engine periodically picks up the invariant that the generator has constructed so far and conjoins it to the induction hypothesis (Section 2, p. 627).

Inference: use this when BMC can find bugs but cannot prove an unbounded loop, and the induction step fails because it starts from unreachable states; the paper says “k-induction alone does not distinguish between reachable and unreachable parts of the state space” (Section 1, p. 625). The paper's safe automaton example needs `k = 4` with invariant `s ≥ 1`; a stronger invariant reduces the proof to `k = 2` (Section 1, pp. 624–625). The key assumption is that every injected invariant has itself been proved by an invariant analysis; the paper contrasts this with Esbmc's unsound heuristic, which assigns non-deterministic values only to the loop-termination condition variables before the step case and so “retains potentially incorrect information about loop-modified variables” (Section 3, p. 636).

## technique: iterative-deepening split-case k-induction

Algorithm 1 starts at `kinit`, checks a BMC base case for paths of length at most `k−1`, checks a forward condition for finite state-space exhaustion, and then checks an inductive step for every sequence of `k` safe iterations followed by a violation at iteration `k+1` (Section 2, pp. 627–629). If all checks are inconclusive, it sets `k := inc(k)` and repeats until `kmax`.

Steps: (1) initialize `k`; (2) encode initial state, transitions, and `¬P` through `k−1` steps; (3) return false if satisfiable; (4) return true if the forward condition is unsatisfiable; (5) conjoin the current invariant `Inv(sn)` with the `k`-step induction hypothesis and `¬P(sn+k)`; (6) return true if unsatisfiable; (7) if a stronger invariant arrives during the SMT query, repeat the step check immediately; (8) otherwise increment `k`. The paper states, “The inductive-step case checks if, after every sequence of k loop iterations without a property violation, there is also no property violation before loop iteration k+1.” (Section 2, p. 629).

Inference: in Verus, this corresponds to checking a loop's safety postcondition with bounded unrolling plus a manually or automatically supplied loop invariant in `invariant` clauses. Verus does not expose the paper's SMT formulas or a built-in k-induction driver; a host tool would generate bounded variants and invoke Verus, while the final proof must use valid Verus syntax and verification. Inference: unlike C transitions, Rust ownership and aliasing become part of each bounded obligation.

## technique: continuously refined data-flow invariants

Algorithm 2 begins with `Inv := true` and a coarse precision. It runs a configurable program analysis (CPA), conjoins the invariant represented by reached abstract states, publishes it to k-induction, and refines precision before restarting (Section 2, pp. 629–631; Algorithm 2 is on p. 628). If the reached abstraction proves `P` for every state, generation terminates. The implementation uses an interval expression domain whose precision is `(Y,n,w)`: selected important variables `Y`, maximum expression nesting `n`, and a widening flag `w` (Section 2, p. 631).

Steps: (1) choose a cheap initial domain and precision; (2) compute an over-approximation of reachable states; (3) form the conjunction of facts describing those states; (4) inject that conjunction into the next k-induction check; (5) increase variable coverage, expression depth, or disable widening; (6) repeat until safety is proved or resources end. In the evaluated configuration, the first, third, fifth and any further refinements increment the number of important variables, the second increments the expression-nesting depth, and the fourth disables widening (Section 3, p. 632). The paper says, “After each strengthening of the invariant, it can be used as injection invariant by the k-induction procedure.” (Section 2, p. 629).

Inference: in Verus, start with simple arithmetic invariants over loop counters and lengths, then strengthen with relations among fields and sequence contents as failed verification conditions identify missing facts. Candidate invariants should be expressed in Verus `invariant` clauses or proved helper lemmas; the generator itself is an external proposal mechanism. Inference: interval facts over Rust `usize` require explicit overflow and cast handling, so C-style integer abstractions cannot be copied verbatim.

## technique: k-induction-generated candidate invariants

The authors also reimplement PKind's alternative generator. It extracts candidate invariants by negating assumptions on control-flow paths to error locations, then proves candidates with a separate instance of Algorithm 1; every proved candidate strengthens the known invariant (Section 2, p. 630). This generator can run alongside data-flow generation, giving the combined configuration `KI←KI←DF`.

Inference: a Verus analogue can mine predicates from failed proof paths or counterexamples, state each as a lemma about the loop state, and retain it only after Verus proves it from the function's preconditions and loop invariant. Inference: generating a candidate by negating a path assumption is language-independent in spirit but needs a Rust-aware representation of ownership and heap state.

## evidence and denominators

The evaluation uses 3,964 SV-COMP'15 verification tasks, of which 1,148 contain known specification violations. Each run had two CPU cores, a 15-minute CPU limit, and 15 GB memory (Section 3, pp. 631–632). Table 1 reports the continuously refined data-flow configuration (`KI←−DF`) as solving 2,507 tasks correctly (score 4,249), with one wrong proof, 26 wrong alarms, 320 CPU hours, and 190 wall hours; combining both generators (`KI←−KI←−DF`) solved 2,519 correctly (score 4,282), with one wrong proof, 25 wrong alarms, 320 CPU hours, and 170 wall hours. Plain k-induction without invariants (`KI`) solved 1,531 (score 2,246) in 530 CPU hours (Table 1, p. 633). These counts use all 3,964 tasks, not only safe tasks.

Against other k-induction tools on the same 3,964 tasks, the combined CPAchecker configuration solved 2,519 correctly, while sequential Esbmc solved 2,050 and parallel Esbmc 2,059; wrong proofs were 1, 156, and 152 respectively (Table 2, p. 635). The paper reports that CPAchecker needed only 10% more CPU time than sequential Esbmc while solving many more tasks (Section 3, p. 637). The safe automaton example is evidence of mechanism, not a benchmark denominator.

## techniques for the catalog

- iterative-deepening k-induction — alternate bounded base checks, forward checks, and invariant-strengthened step checks while increasing k
- continuous precision refinement — run a configurable analysis from coarse to precise settings and inject each stronger invariant
- interval expression invariants — represent reachable-state facts with selected variables, nesting depth, and optional widening
- k-induction candidate generation — prove path-derived candidate invariants with a separate induction engine before injection
- sound invariant injection — accept only invariants independently established by the trusted verification framework
