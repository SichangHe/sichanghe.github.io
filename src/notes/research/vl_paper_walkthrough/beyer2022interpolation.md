# Interpolation and SAT-Based Model Checking Revisited: Adoption to Software Verification
(authored by agents unless marked 🧑)
Tag: `beyer2022interpolation`, [paper](http://arxiv.org/abs/2208.05046v2)

## problem and result
The paper adapts McMillan’s interpolation-based model checking (IMC) from hardware to C software. IMC checks bounded model-checking (BMC) queries; when one is unsatisfiable, it extracts a Craig interpolant, unions interpolants into an overapproximation of reachable states, and stops at an inductive fixed point. A naïve software encoding with a symbolic program counter produces weak interpolants. The paper’s key technique is large-block encoding (LBE): summarize loop-free control-flow regions into formulas, then use those formulas as the initial predicate, loop transition, and safety predicate.

The abstract reports: “It derives interpolants from unsatisfiable BMC queries and collects them to construct an overapproximation of the set of reachable states.” (Abstract, PDF p. 1). The authors’ adoption uses LBE because “The adoption avoids the usage of symbolic program counters in the formulas and hence often leads to more helpful interpolants.” (Section 5, PDF p. 14). They caution: “If any BMC query is satisfiable during the iteration in the second phase, we cannot conclude that the property is violated.” (Section 3.1.3, PDF p. 8).

## technique: IMC with large-block encoding

when to use it
- Use for reachability-safety properties of programs represented as control-flow automata (CFAs)
- Use when an SMT solver supports Craig interpolation over the program’s theories
- Section 3.2 defines the program model as an imperative language whose variables are all integers (PDF p. 9)
- Algorithm 1 assumes single-loop CFAs; multi-loop programs are first transformed to one loop by a standard transformation (Sections 5 and 6.2, PDF pp. 13, 15–16)

how to do it
1. Represent the program as a CFA with locations, an initial location, operation-labeled edges, and an error location (Section 3.2, PDF p. 9)
2. Apply large-block encoding repeatedly so each loop-free subgraph becomes one edge annotated with a formula. For a single loop, obtain prefix formula φ0, loop condition C, loop-body formula φL, and error formulas φE and φ′E (Section 5 and Fig. 3a, PDF p. 13)
3. Treat φ0 as the initial-state predicate I(s), `C ∧ φL` as transition predicate T(s,s′), and `(¬C ∧ φE) ∨ (C ∧ φ′E)` as the negated safety predicate ¬P(s) (Section 5, PDF p. 13)
4. Unroll the summarized CFA with CPA++ and collect prefix, loop, and suffix formulas from the block formulas of the abstract states. The BMC query is their conjunction. Algorithm 1 uses the last unrolling only for the safety predicate, so only k − 1 copies of T appear (Algorithm 1, footnote 2 and Section 6.2, PDF pp. 16–17)
5. If the query is satisfiable, return false (error path found). If unsatisfiable and k > 1, start fixed-point computation (Algorithm 2) with `image = start = prefix` (Algorithms 1–2, PDF p. 16)
6. Repeatedly query `start ∧ loop ∧ suffix`. For an unsatisfiable query, obtain an interpolant τ between `start ∧ loop` and `suffix`, shift τ’s variable indices to the prefix state, and test whether τ implies image (Algorithm 2, PDF p. 16)
7. If τ implies image, return a proof: the union is a fixed point. Otherwise set `image := image ∨ τ`, `start := τ`, and continue (Algorithm 2, PDF p. 16)
8. If a fixed-point query becomes satisfiable, increase k and return to BMC; the interpolant overapproximation may contain unreachable states (Section 3.1.3, PDF p. 8)
9. For multiple loops, use the standard single-loop transformation. A location variable can track which old loop is entered; the authors found no significant empirical difference with a dedicated CPA for that variable (Section 5.1, PDF pp. 14–15)

why symbolic counters fail
- A symbolic program counter mixes control-flow structure and semantics, so BMC queries include syntactically infeasible paths. The paper says the resulting interpolants “tend to concern themselves mainly with the program counter pc but seldom mention the program variables” (Section 4.2, PDF p. 11)
- In 723 ReachSafety-Loops tasks, 505 had no violation; symbolic-counter IMC proved only 11, and never found a fixed point by interpolation (Section 4.2, PDF p. 12)
- LBE’s query instead represents syntactically feasible paths, so by Craig’s theorem the interpolant has to talk about x (Section 5, PDF p. 14). In the even-number example (Section 6.3, PDF p. 18) the walkthrough assumes the solver returns `x1 % 2 = 0`, which is the loop invariant; the paper does not claim a solver always returns it (Section 6.5 notes a solver could instead return `x1 = 2` and diverge)

implementation in CPACHECKER
- The Predicate CPA stores abstraction formula, location, path formula, and a block formula. Configuring its block-adjustment operator to abstract at loop heads and errors reproduces LBE (Section 6.1, PDF p. 15). Block formulas are collected from the abstraction states of the unrolled ARG
- The composite CPA contains Location, Predicate, and Loop-Bound CPAs; CPA++ performs bounded unrolling; Algorithms 1 and 2 collect formulas and run IMC (Section 6.2, PDF pp. 16–17)
- Backward interpolant derivation swaps the A and B labels, obtains an interpolant, and negates it, i.e. `¬get_interpolant(B, A)` instead of `get_interpolant(A, B)`. The authors “found that the backward derivation performs slightly better than the forward derivation” and use it by default. Their explanation, that it “might be attributed” to interpolants summarizing information more relevant to the property, is a hypothesis (Section 6.5, PDF p. 19)

Verus form
Inference (none of the Verus statements here come from the paper): A Verus implementation would model a loop’s transition relation with a ghost state and a loop `invariant`, then use proof lemmas to derive inductive facts analogous to IMC interpolants. Verus itself does not expose Craig-interpolant extraction or CPA++; an external generator could run an SMT interpolator and emit candidate `assert` and `invariant` clauses for Verus to check. LBE corresponds to summarizing straight-line Rust blocks into ghost transition predicates, while the executable Rust remains ordinary code. The paper’s theorem establishes soundness of its CFA/LBE/IMC composition, not correctness of Rust compilation or Verus’s proof erasure.

Evidence and limits
- Evaluation uses 6,024 SV-COMP ’22 reachability tasks: 1,793 with known violations and 4,231 assumed correct (Section 7.2, PDF p. 20)
- Each task had two CPU cores, 15 minutes CPU time, and 15 GB memory; experiments used MathSAT5 and CPACHECKER revision 43,042 (Section 7.3, PDF p. 21)
- IMC produced 2,766 correct results: 1,871 proofs and 895 alarms; it had 0 wrong proofs, 3 wrong alarms, 2,018 timeouts, 160 out-of-memory results, and 1,077 other inconclusive results (Table 2, PDF p. 21). The denominator is all 6,024 tasks.
- IMC solved 328 more programs safely and found 25 more bugs than IMPACT, “an increase of 21 % and 3 %, respectively” (Section 7.4, PDF p. 21). Table 2 gives the IMPACT bases (1,543 proofs, 870 alarms), consistent with those percentages.
- k-induction had more correct results than IMC: 3,157 (2,158 proofs, 999 alarms) against 2,766; BMC found more alarms (1,177). The authors write IMC “was second only to k-induction” (Section 7.4, PDF p. 21)
- IMC uniquely solved 7 tasks for which all other approaches exhausted resources; it solved 1,199 tasks that PDR failed to solve within limits, 929 for BMC, 100 for k-induction, 323 for predicate abstraction, and 185 for IMPACT (Section 7.4, PDF p. 22)
- On 785 safe ECA tasks, IMC proved 423 and IMPACT 390. Of 382 tasks proved by both, IMC made fewer interpolation calls on 354 (Section 7.4, PDF pp. 23–24)
- Section 7.5 (PDF p. 25) presents the shared CPACHECKER framework as limiting confounding variables, and the largest public benchmark set as limiting selection bias. It names the selection of compared approaches and of the framework as external threats; trace abstraction is missing because “the implementation in the framework is not yet mature enough”.
- Inference: the results cover C reachability tasks in one tool with one SMT solver (MathSAT5), so they may not transfer to other tools, solvers or languages.

what is proved, trusted, and assumed
- Proved: Algorithm 1 is sound for a single-loop CFA when it returns true (Theorem 1, Section 6.4, PDF pp. 18–19); the proof relies on sound LBE and the original IMC algorithm. For multiple loops, soundness also depends on the single-loop transformation. Algorithm 1 returning false means a satisfiable BMC query over all paths, so it does not give wrong alarms (Section 6.4)
- Trusted (paper statements): LBE, the single-loop transformation, the original IMC algorithm, and CPACHECKER components, which the authors call a “well-maintained software project” (Section 1.2, PDF p. 4). Inference: MathSAT5 interpolation and the C-to-CFA encoding are also trusted; the authors attribute the 3 wrong alarms to “the program encoding of CPACHECKER” (Section 7.4, PDF p. 21)
- Assumed: the property is reachability of an error location (Section 3.2); the 4,231 tasks without known violation are only “assumed to be correct” (Section 7.2). Inference: interpolants are available and resource limits permit convergence
- Inference: For agent-written verified Rust, IMC could generate candidate loop invariants and proof obligations, reducing manual invariant discovery. It remains a heuristic proof generator: a bad interpolant can diverge, and passing generated invariants still depends on the exact Verus specification and trusted Rust/FFI boundaries.

## techniques for the catalog
- large-block interpolation model checking: summarize loop-free control flow, derive interpolants from unsatisfiable unrollings, and union them to an inductive reachable-state overapproximation
- fixed-point interpolation loop: shift each interpolant to the initial-state variables, enlarge the image, and stop when the new interpolant implies the image
- backward interpolant derivation: swap interpolation partitions and negate the result; the authors hypothesize this yields interpolants more relevant to the safety property
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "As discussed in Sect. 3.1, the ith interpolant is an overapproximation of the reachable states after i loop iterations."): read the whole paper text and checked every quotation, Table 2 and evaluation numbers, algorithm steps and page references; changed the Section 5 quotation (it began with a wrong "the proposed"), page references for Sections 5, 6.4 and 7.3, the claim about when the fixed-point step runs (k > 1), the overclaim that x % 2 = 0 is forced rather than assumed in the example, the backward-derivation and threats-to-validity statements, and added the k-induction comparison; did not check the references, figures beyond their captions, or the Verus inference against Verus itself.
