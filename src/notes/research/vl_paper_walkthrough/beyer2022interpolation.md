# Interpolation and SAT-Based Model Checking Revisited: Adoption to Software Verification
(authored by agents unless marked 🧑)
Tag: `beyer2022interpolation`, [paper](http://arxiv.org/abs/2208.05046v2)

## problem and result
The paper adapts McMillan’s interpolation-based model checking (IMC) from hardware to C software. IMC checks bounded model-checking (BMC) queries; when one is unsatisfiable, it extracts a Craig interpolant, unions interpolants into an overapproximation of reachable states, and stops at an inductive fixed point. A naïve software encoding with a symbolic program counter produces weak interpolants. The paper’s key technique is large-block encoding (LBE): summarize loop-free control-flow regions into formulas, then use those formulas as the initial predicate, loop transition, and safety predicate.

The abstract reports: “It derives interpolants from unsatisfiable BMC queries and collects them to construct an overapproximation of the set of reachable states.” (Abstract, PDF p. 1). The authors’ adoption uses LBE because “the proposed adoption avoids the usage of symbolic program counters in the formulas and hence often leads to more helpful interpolants.” (Section 5, PDF p. 14). They caution: “If any BMC query is satisfiable during the iteration in the second phase, we cannot conclude that the property is violated.” (Section 3.1.3, PDF p. 8).

## technique: IMC with large-block encoding

when to use it
- Use for reachability-safety properties of programs represented as control-flow automata (CFAs)
- Use when an SMT solver supports Craig interpolation over the program’s theories
- The implementation targets single-loop CFAs; multi-loop programs are first transformed to one loop (Sections 3.2 and 5, PDF pp. 9, 13)

how to do it
1. Represent the program as a CFA with locations, an initial location, operation-labeled edges, and an error location (Section 3.2, PDF p. 9)
2. Apply large-block encoding repeatedly so each loop-free subgraph becomes one edge annotated with a formula. For a single loop, obtain prefix formula φ0, loop condition C, loop-body formula φL, and error formulas φE and φ′E (Section 5, PDF pp. 13–14)
3. Treat φ0 as the initial-state predicate I(s), `C ∧ φL` as transition predicate T(s,s′), and `(¬C ∧ φE) ∨ (C ∧ φ′E)` as the negated safety predicate ¬P(s) (Section 5, PDF p. 14)
4. Unroll the summarized CFA k times and collect prefix, loop, and suffix formulas. The BMC query is their conjunction (Algorithm 1 and Section 6.2, PDF pp. 16–17)
5. If the query is satisfiable, return a real error path. If unsatisfiable, start fixed-point computation with `image = start = prefix` (Algorithms 1–2, PDF p. 16)
6. Repeatedly query `start ∧ loop ∧ suffix`. For an unsatisfiable query, obtain an interpolant τ between `start ∧ loop` and `suffix`, shift τ’s variable indices to the prefix state, and test whether τ implies image (Algorithm 2, PDF p. 16)
7. If τ implies image, return a proof: the union is a fixed point. Otherwise set `image := image ∨ τ`, `start := τ`, and continue (Algorithm 2, PDF p. 16)
8. If a fixed-point query becomes satisfiable, increase k and return to BMC; the interpolant overapproximation may contain unreachable states (Section 3.1.3, PDF p. 8)
9. For multiple loops, use the standard single-loop transformation. A location variable can track which old loop is entered; the authors found no significant empirical difference with a dedicated CPA for that variable (Section 5.1, PDF p. 14)

why symbolic counters fail
- A symbolic program counter mixes control-flow structure and semantics, allowing trivially infeasible paths. The resulting interpolants often mention only the counter and lose useful data invariants (Section 4.2, PDF pp. 11–12)
- In 723 ReachSafety-Loops tasks, 505 had no violation; symbolic-counter IMC proved only 11, and never found a fixed point by interpolation (Section 4.2, PDF p. 12)
- LBE’s query instead represents syntactically feasible paths. In the even-number example, the interpolant `x % 2 = 0` is forced to mention x and becomes the loop invariant (Sections 5 and 6.3, PDF pp. 14, 18)

implementation in CPACHECKER
- The Predicate CPA stores abstraction formula, location, path formula, and a block formula. Configuring its block-adjustment operator to abstract at loop heads and errors reproduces LBE (Section 6.1, PDF p. 15)
- The composite CPA contains Location, Predicate, and Loop-Bound CPAs; CPA++ performs bounded unrolling; Algorithms 1 and 2 collect formulas and run IMC (Section 6.2, PDF pp. 16–17)
- Backward interpolant derivation swaps the A and B labels, obtains an interpolant, and negates it. The authors use this by default because it often yields property-relevant invariants and slightly better performance (Section 6.5, PDF p. 19)

Verus form
Inference: A Verus implementation would model a loop’s transition relation with a ghost state and a loop `invariant`, then use proof lemmas to derive inductive facts analogous to IMC interpolants. Verus itself does not expose Craig-interpolant extraction or CPA++; an external generator could run an SMT interpolator and emit candidate `assert` and `invariant` clauses for Verus to check. LBE corresponds to summarizing straight-line Rust blocks into ghost transition predicates, while the executable Rust remains ordinary code. The paper’s theorem establishes soundness of its CFA/LBE/IMC composition, not correctness of Rust compilation or Verus’s proof erasure.

Evidence and limits
- Evaluation uses 6,024 SV-COMP ’22 reachability tasks: 1,793 with known violations and 4,231 assumed correct (Section 7.2, PDF p. 20)
- Each task had two CPU cores, 15 minutes CPU time, and 15 GB memory; experiments used MathSAT5 and CPACHECKER revision 43,042 (Section 7.3, PDF p. 20)
- IMC produced 2,766 correct results: 1,871 proofs and 895 alarms; it had 0 wrong proofs, 3 wrong alarms, 2,018 timeouts, 160 out-of-memory results, and 1,077 other inconclusive results (Table 2, PDF p. 21). The denominator is all 6,024 tasks.
- IMC solved 328 more programs safely and found 25 more bugs than IMPACT, increases of 21% and 3% respectively (Section 7.4, PDF p. 21). These percentages refer to the IMPACT comparison and the paper does not give the raw IMPACT denominators in that sentence.
- IMC uniquely solved 7 tasks for which all other approaches exhausted resources; it solved 1,199 tasks that PDR failed to solve within limits, 929 for BMC, 100 for k-induction, 323 for predicate abstraction, and 185 for IMPACT (Section 7.4, PDF p. 22)
- On 785 safe ECA tasks, IMC proved 423 and IMPACT 390. Of 382 tasks proved by both, IMC made fewer interpolation calls on 354 (Section 7.4, PDF pp. 23–24)
- The authors identify threats: all algorithms share CPACHECKER components, the benchmark is C reachability-heavy, and trace abstraction is omitted because its implementation was not mature (Section 7.5, PDF p. 25)

what is proved, trusted, and assumed
- Proved: Algorithm 1 is sound for a single-loop CFA when it returns true; the proof relies on sound LBE and original IMC (Theorem 1, PDF p. 18)
- Trusted: CPACHECKER parsing and CPA components, LBE and single-loop transformation, MathSAT5 interpolation, and the C-to-CFA encoding
- Assumed: safety is a reachability property, interpolants are available, resource bounds permit convergence, and the encoding accurately represents program behavior
- Inference: For agent-written verified Rust, IMC could generate candidate loop invariants and proof obligations, reducing manual invariant discovery. It remains a heuristic proof generator: a bad interpolant can diverge, and passing generated invariants still depends on the exact Verus specification and trusted Rust/FFI boundaries.

## techniques for the catalog
- large-block interpolation model checking: summarize loop-free control flow, derive interpolants from unsatisfiable unrollings, and union them to an inductive reachable-state overapproximation
- fixed-point interpolation loop: shift each interpolant to the initial-state variables, enlarge the image, and stop when the new interpolant implies the image
- backward interpolant derivation: swap interpolation partitions and negate the result to bias invariants toward the safety-property side
Checked 2026-10-13: audit record beyer2022interpolation; paper-study comparison complete; gate executed; experiments not rerun
