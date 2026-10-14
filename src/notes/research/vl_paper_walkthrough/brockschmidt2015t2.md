# T2: Temporal Property Verification
(authored by agents unless marked 🧑)
Tag: `brockschmidt2015t2`, [paper](http://arxiv.org/abs/1512.08689v2)

## scope and evidence
T2 is an open-source verifier for temporal properties of infinite-state integer programs. It accepts a native transition-graph format or C translated through LLVM, and reduces CTL, Fair-CTL, CTL*, and LTL properties to safety, termination, nontermination, and fair-termination procedures. The implementation uses F# and Z3. Its evaluation uses 1,222 termination benchmarks (300-second timeout, StarExec) and 56 CTL benchmarks (100-second timeout, Core i7-950). On the termination set, T2-GPDR solves 627 terminating, 442 nonterminating, and 153 failures (1,222 total), averaging 23.6 seconds; T2-GPDR-NoP solves 589/438/195 at 31.4 seconds. On the CTL set, T2 and Q’ARMC verify all 56; average times are 2.7 and 3.6 seconds respectively. The Fair-CTL and CTL* claims have no new benchmark denominator in this paper and refer to earlier work.

## technique: LLVM front end and integer transition systems
What it is: compile C to LLVM IR, simplify it, and translate basic blocks into T2 locations and guarded arithmetic transitions. Section 2 (p. 2) says: “T2 operates on an input format that can be automatically extracted from the LLVM compiler framework’s intermediate representation.”

How to apply it: (1) compile C with clang to LLVM bitcode (`clang -Wall -Wextra -c -emit-llvm -O0 ex0.c -o ex0.bc`, Appendix A, p. 7). (2) Run `llvm2kittel --eager-inline --t2 ex0.bc > ex0.t2`. (3) Map each basic block to a location and each branch to a transition; encode phi values on incoming transitions. (4) Simplify by inlining, dead-code elimination, constant propagation, and control-flow simplification. (5) Treat heap reads as nondeterministic integers and drop heap writes in this integer abstraction (Appendix A, pp. 7–8).

Verus form (Inference: T2 is not a Rust or Verus tool): model each supported Rust function as a transition system over ghost state, with `requires` as transition guards and `ensures` as updates. LLVM’s heap-to-integer abstraction is not semantics-preserving for arbitrary Rust ownership; a Verus encoding must state and prove the abstraction relation. `spec fn` predicates can represent locations and transitions; proof functions establish preservation.

Evidence and limits: T2 supports only linear integer arithmetic fragments of C and models numbers as mathematical integers; the C front end inserts normalization for machine-integer overflow (Section 1, p. 2). Heap and concurrency are future work in this paper. Thus the front end does not establish memory safety or exact Rust machine semantics.

## technique: safety proving with Horn clauses and interpolant refinement
What it is: reduce transition systems to constrained linear Horn clauses and call Impact, GPDR, or Spacer. A predicate is introduced for each program location; a transition becomes a Horn implication. Section 3 (p. 3) gives: “For this, we convert our transition systems into sets of linear Horn clauses with constraints in linear arithmetic, in which one predicate p` is introduced per program location.”

How to apply it: (1) create one predicate `p_l` per control location. (2) Translate each guarded assignment into a Horn clause; the loop transition in Figure 1 becomes `p_l2(x',k) <- p_l2(x,k) ∧ x'=x-k ∧ x>0`. (3) Run Impact or Z3’s GPDR/Spacer safety prover. (4) If a counterexample appears, refine predicates/invariants and repeat. (5) Use the resulting inductive predicates as premises for temporal reductions.

Verus form (Inference): a Verus proof uses executable state plus a loop invariant rather than an external Horn solver. Write a `while` loop with `invariant` clauses over variables and call proof lemmas to derive the inductive step; use `assert` to discharge arithmetic facts. Solver-backed Verus can discharge linear arithmetic, but the translation from Rust control flow to predicates remains the programmer’s responsibility.

Evidence: The paper reports no separate safety benchmark; safety is a subprocedure used by termination and temporal proving. The trust base includes Z3, the translation, and soundness of Impact/GPDR/Spacer.

## technique: termination by counterexample-guided lexicographic ranking synthesis
What it is: instrument a program so termination becomes alternating safety queries and rank-function synthesis. A candidate rank must decrease on every loop iteration; failed checks yield counterexamples used to synthesize a refined lexicographic ranking. Section 3 (p. 3) states: “This reduces the check of a speculated (possibly lexicographic) rank function f for a loop to asserting that the value of f after one loop iteration is smaller than before that iteration.”

How to apply it: (1) instrument loops with a candidate rank function. (2) Ask the safety prover to show strict decrease. (3) On failure, feed the counterexample to RF Synth and synthesize a linear or lexicographic rank using Z3 constraints. (4) Repeat until decrease is proved or synthesis fails. (5) Preprocess loops; in the reported termination benchmarks, this removes about 80% of loops that can be shown terminating directly (Section 3, p. 3). (6) Invoke `./T2 -termination -input t2 ex0.t2`; `-print proof` prints the rank and bound (Appendix B.1, p. 8).

Verus form (Inference): encode a well-founded measure as a ghost `spec fn` and put a decreasing condition in the loop invariant/termination proof. Prove the measure is nonnegative and strictly decreases each iteration; for lexicographic measures, prove tuple ordering by lemmas. Verus does not synthesize a rank automatically, so RF Synth’s search must be supplied externally or replaced by templates.

Evidence: On 1,222 Termination Competition 2015 integer-transition benchmarks, T2-GPDR solved 627 terminating and 442 nonterminating cases, with 153 failures (denominator 1,222), average 23.6 s under 300 s timeout (Fig. 3, p. 4). T2-GPDR-NoP solved 589/438/195, average 31.4 s. These are solver configurations on StarExec, not guarantees for Rust.

## technique: proving nontermination with recurrent sets
What it is: when ranking synthesis cannot establish termination, search for a recurrent set S of states that can return to S. Section 3 (p. 3) defines it as “a set of program states whose execution can eventually lead back to a state from S.”

How to apply it: retain the counterexample execution from failed rank refinement, generate constraints describing a candidate recurrent set, and solve them with Z3 (RS Synth). A satisfying set witnesses an infinite execution; otherwise the property remains unresolved.

Verus form (Inference): state a ghost predicate `S(state)` and prove existence of a successor in S for every state in S. This establishes possibility of nontermination, not that every execution diverges. Verus requires an explicit witness function or relation; it does not perform recurrent-set synthesis.

Evidence and limits: The paper reports nontermination counts in the 1,222-case table but does not separate recurrent-set successes from other outcomes. It assumes mathematical integer arithmetic and an accurate transition abstraction.

## technique: CTL verification by bottom-up precondition synthesis
What it is: compute quantifier-free preconditions for CTL subformulas, then verify the top-level formula after substitution. Section 3 (p. 3) says: “Given a CTL property ϕ, T2 first computes quantifier-free preconditions precondi for the subformulas of ϕ, and then verifies the formula obtained from ϕ by replacing the subformulas by their preconditions.” Counterexample-guided decomposition computes several location-specific preconditions simultaneously.

How to apply it: (1) parse a CTL formula such as `EFAG x <= 0`. (2) Recursively synthesize a precondition for each subformula at each program location. (3) Replace subformulas by these predicates. (4) Prove the resulting safety/termination obligations. (5) Run `./T2 -input_t2 ctl-ex.t2 -CTL "[EF]([AG](x <= 0))"`; `-print proof` emits location-specific predicates (Appendix C.1, p. 11).

Verus form (Inference): represent state predicates as `spec fn`s and prove temporal obligations over a transition-system state machine. Safety (`AG`) can map to an inductive invariant; eventuality (`EF`) needs a witness path and a ranking argument. Branching-time quantification over all successors is not implicit in Verus and requires explicit transition relations and lemmas.

Evidence: The CTL evaluation uses 56 Windows-driver, PostgreSQL, and SoftUpdates benchmarks; both T2 and Q’ARMC verify all 56, with average 2.7 s versus 3.6 s on a Core i7-950 and 100 s timeout (Section 4, p. 5). The denominator is 56, and the result is for the published benchmark set.

## technique: fairness and CTL* reductions
What it is: Fair-CTL is reduced to fairness-free CTL with prophecy variables that encode fair versus unfair paths; LTL is handled through automata-theoretic reduction to fair termination; CTL* uses precondition synthesis and explicit variables predicting future outcomes. Section 3 (p. 3) says: “This method reduces Fair-CTL to fairness-free CTL using prophecy variables to encode a partition of fair from unfair paths.”

How to apply it: (1) state a fairness condition, such as infinitely-often p implies infinitely-often q. (2) Add prophecy variables recording which future branch satisfies fairness. (3) Reduce the fair formula to CTL and invoke the CTL prover. (4) For CTL*, transform nondeterministic choices into explicit prediction variables, synthesize preconditions, and check the transformed formula. (5) Run the Appendix command with `-fairness "(P == 1, Q == 1)"` for Fair-CTL; use `-ctlstar` for CTL* (Appendix C.2, pp. 11–12).

Verus form (Inference): encode fairness as a ghost transition-system invariant plus a variant/ranking that forces recurring opportunities; prophecy variables become ghost state chosen existentially before a transition. CTL* path quantifiers require proof lemmas over all or witness traces and are outside ordinary sequential contracts.

Evidence and limits: The paper claims T2 is the only tool supporting CTL* for infinite-state programs at publication time, but gives no new CTL*/Fair-CTL experiment denominator and states the CTL* prover is incomplete. Fair-CTL is relatively complete only relative to its safety and termination subprocedures.

## trusted boundary and product threat
T2 trusts LLVM/llvm2kittel translation, arithmetic abstraction, Z3 and safety-prover soundness, rank and recurrent-set synthesis, and the temporal reduction implementation. It does not prove heap semantics, concurrency, compiler correctness, or that a temporal formula captures a product requirement. Inference: for VeruLaw, T2 is a strong precedent for decomposing liveness into safety plus ranking obligations, but a medium threat: an agent could emit Rust that satisfies local `requires`/`ensures` while failing global progress or fairness. Verus can encode state-machine invariants and ranking proofs, yet it will not automatically synthesize CTL* prophecy variables. VL should reuse these reduction ideas rather than rebuild a generic C temporal prover.

## techniques for the catalog
- llvm transition extraction: compile C through LLVM and translate basic blocks into integer guarded transitions
- horn-clause safety proving: reduce locations and assignments to constrained Horn clauses solved by Impact, GPDR, or Spacer
- lexicographic termination synthesis: alternate safety checks and rank-function synthesis using counterexamples
- recurrent-set nontermination: witness an infinite execution by finding a set that can return to itself
- CTL precondition synthesis: compute location predicates bottom-up and verify the reduced formula
- fairness and CTL-star reduction: use prophecy or prediction variables to reduce richer temporal logics
Checked 2026-10-14: audit record brockschmidt2015t2; paper-study comparison complete; gate executed; experiments not rerun
