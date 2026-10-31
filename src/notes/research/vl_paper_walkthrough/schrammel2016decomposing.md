# Challenges in Decomposing Encodings of Verification Problems
(authored by agents unless marked 🧑)
Tag: `schrammel2016decomposing`, [paper](https://doi.org/10.4204/EPTCS.219.3)

This four-page paper (EPTCS 219, pp. 29–32) discusses the challenges of splitting solver encodings of verification problems without losing precision. It uses universal termination as the running example. The problem is practical: the introduction says the generated formulae "are often too large to be directly handled by the back end solver" and that solving for multiple mutually dependent predicates "scales badly to large formulae" (Section 1, p. 29), but decomposition introduces extra abstractions that can make the result less precise. The abstract states: “However, decomposition introduces abstractions in addition to those required for finding the unknown predicates in the formula, and can hence deteriorate precision.” (Abstract, p. 29)

## technique: encode procedures as symbolic transition systems

What it is. The paper assumes programs are given as call graphs, with each procedure `f` given as a symbolic input/output transition system, a triple of characteristic predicates `(Init_f, Trans_f, Out_f)`: `Init_f(xin,x)` defines initial states and relates them to the inputs, `Trans_f(x,x')` is the transition relation, and `Out_f(x,xout)` connects the transition system to the outputs (Section 2, p. 29). Inputs are procedure parameters, global variables, and memory objects read by `f`; outputs are return values, global variables, and memory objects written by `f`. Internal states `x` are usually the values of variables at the loop heads in `f`. `H_f` is the set of calls in `f` to procedures `h` in `F`, at call sites `i`; the call's input and output argument vectors are intermediate variables in `Trans`. `RR_f` is the termination argument, "the conditions that ensure the termination of procedure f, such as a well-founded transition invariant" (Section 2, p. 29, paraphrased).

How to apply it.
1. Encode each procedure's semantics as first-order `Init`, `Trans`, and `Out` formulas (Section 2, p. 29).
2. Introduce second-order (existentially quantified predicate) unknowns `Summary_f`, `Inv_f`, and `RR_f` for each procedure. `Summary_f(xin,xout)` relates a procedure's inputs to its outputs; `Inv_f` is an invariant over the internal states; `RR_f` is a termination argument (Section 2, p. 30).
3. Constrain them with the paper's formula (1), the Hoare-style encoding whose satisfiability "guarantees universal termination of the program" (Section 2, p. 30): `Init_f` implies `Inv_f`; `Inv_f`, `Trans_f`, and the callee `Summary_h` predicates at the call sites imply `Inv_f` at the next state and `RR_f(x,x')`; `Init_f`, `Inv_f` at the next state, and `Out_f` imply `Summary_f`.
4. Solve for the existential predicates. The paper notes that "recursive procedures produce cyclic dependencies of their Summary f predicates", that if abstractions are used to lazily solve the formula `Inv_f` and `RR_f` become interdependent, and that "invariants of nested loops are dependent on each other" (Section 2, p. 30). Rewriting nested loops into one loop "only 'hides' these dependencies as relational dependencies between the loop variables".

Verus form. Inference: a Rust/Verus encoding would express `Init` and `Out` as `requires`/`ensures`, loop `Trans` through executable code plus `invariant`, and `RR` with `decreases`. A procedure summary is its function contract. Verus checks a supplied contract rather than synthesizing arbitrary second-order predicates, so this paper's synthesis engine corresponds to a design-time way of discovering candidate contracts. The paper uses second-order formulas and a synthesis engine, not Verus.

Evidence and assumptions. The encoding is a logical specification, not an implementation benchmark. The paper's example targets universal termination, not memory safety or functional correctness. Inference: soundness of a result also depends on the transition relation modeling the program accurately; the paper does not discuss this.

## technique: procedural divide-and-conquer with call contexts and summaries

What it is. In [3] (Chen et al., ASE 2015), the authors "emulate the traversal of the call graph top-down analysing each procedure separately and propagating the summaries back up" (Section 3, p. 30). This decomposition splits the `Summary_h` predicate for a call to `h` at call site `i` into “a calling context predicate CallCtxh that transfers information from the caller to the callee” and “a summary predicate Sumh that transfers information from the callee to the caller” (Section 3, pp. 30–31).

How to apply it. The paper describes this only briefly ("Without going into details (see [3])", p. 31); the steps below are a reading of Section 3 and footnote 2, not a procedure given in the paper.
1. Traverse the call graph from callers to callees and create a `CallCtx` at each call site (Section 3, p. 30).
2. Infer `CallCtx` from the caller invariant and transition relation. Footnote 2 says the calling context "can be inferred by synthesising a predicate CallCtx" such that `Inv_f(x_f) ∧ Trans_f(x_f,x'_f) ⇒ CallCtx_hi(xp_in_hi, xp_out_hi)` for all the variables (footnote 2, p. 31).
3. Inference: solve the callee under that context and export `Sum_h` to callers.
4. Propagate summaries back up the graph. `CallCtx_h` and `Sum_h` are mutually dependent, which forms a cycle in the dependency graph of Figure 1a; "The algorithm in [3] uses a greatest fixed point computation to resolve this dependency" (Section 3, p. 31).

Verus form.

Evidence and limits. The introduction says interprocedural work that follows the procedural structure "has been shown to significantly increase efficiency in comparison with monolithic solving" (Section 1, p. 29), and the abstract says decomposing the termination encoding "can significantly increase efficiency", but this paper reports no timing or denominator for that claim. It says the greatest-fixed-point resolution "is very imprecise for recursive procedures" (Section 3, p. 31). Inference: recursive call summaries may therefore need expansion or a stronger domain.

## technique: separate mutually dependent invariants and termination arguments

What it is. In the universal-termination encoding, `Inv_f` and `RR_f` can become interdependent (Section 2, p. 30). For the inference of sufficient preconditions for termination (Figure 1b), the paper points to "the dependency (red dashed ellipse) between the under-approximating summary Sumuf (of which the sufficient precondition is a projection), the termination argument, and the invariants – which is a maximisation problem" (Section 3, p. 31). The paper says decomposition can produce inference subproblems: “(B) The subproblems may be inference, and not verification problems; hence their solving requires optimisation (like our synthesis engine) instead of decision procedures.” (Section 3, p. 30) The other listed issue is “(A) It may introduce additional interdependent predicates.”

How to apply it. The paper gives no partitioning algorithm; steps 1 and 4 are inference, steps 2 and 3 follow the paper.
1. Inference: draw a dependency graph of unknown predicates before partitioning and mark cycles among summaries, contexts, invariants, and termination arguments. Figure 1 (p. 30) shows such graphs, but the paper does not prescribe this step.
2. In Figure 1a the authors "solve for invariants (green) and termination arguments (red) separately because our synthesis engine currently does not support product domains that could infer both at once" (Section 4, p. 31).
3. Soundness rests on "(1) the soundness of the analysis of individual subproblems, (2) the soundness of the combination of the subproblem results, (3) and induction over the decomposition hierarchy" (Section 3, p. 30).
4. Inference: if a partition creates an unusable cycle, the paper's remedies (Section 4) are re-partitioning by eliminating and introducing predicates, or expansion; do not silently accept a less precise abstraction.

Verus form. Inference: this maps to separating a Rust proof into loop invariants, ranking lemmas, and function contracts, then composing them through `requires`/`ensures`. A ranking proof with `decreases` may need facts from the functional invariant; keep those facts in a shared lemma rather than weakening either obligation. Verus's solver is a decision procedure for a given proof state, so any synthesis or optimization step remains outside the verified program.

Evidence and assumptions. The paper gives dependency diagrams and qualitative lessons, not a universal partition algorithm. It says "Some domains require least, others greatest fixed point computations, our engine is currently unable to combine both in a single query" (Section 4, p. 31).

## technique: choose decomposition dynamically and use expansion when capacity permits

What it is. Section 4 states two conflicting goals: "(1) Solving as large subformulae as possible to increase precision and reduce the need for later refinement. (2) Solving as small subformulae as possible to be scalable." The authors conclude that "we need a property-, precision-, and capacity-driven dynamic (de)composition", that "Re-partitioning the verification problem by eliminating predicates and introducing new ones seems essential", and that "precision can be increased by expansion, i.e. unrolling of loops and inlining of recursions, if the capacity allows it" (Section 4, p. 31). Their warning is direct: “Decompositions introducing cyclic dependencies should only be used if the solving capacity is exceeded.” (Section 4, p. 31)

How to apply it. The paper gives goals, not a procedure; the steps below are inference from Section 4.
1. Inference: start with the largest subformula the engine can solve and record which queries exceed capacity.
2. Inference: if capacity is exceeded, partition along procedure or property boundaries, keeping explicit interfaces (`CallCtx`, `Sum`) and documenting every new abstraction.
3. If precision drops, expand by inlining a call or unrolling a loop, which the paper says can increase precision "if the capacity allows it" (Section 4, p. 31). Inference: this removes an abstraction at the cost of a larger formula.
4. Inference: recompute the dependency graph after each repartition and stop when the property's required precision is recovered.

Verus form. Inference: apply this as proof engineering: expose a helper contract for a large function when the solver times out, then inline or unfold a helper when an abstraction is too weak. Keep the same mathematical postcondition while changing only proof boundaries. Verus has no automatic capacity-driven partitioner, so the policy must be measured externally and checked by ordinary proofs.

Evidence and limits. The paper gives no absolute solver limits, speedups, or case-study counts. Inference: its recommendations are grounded in the dependency structure of the termination encodings and may not transfer unchanged to every property. It does not claim that smaller or larger partitions are always better.

## what is proved, measured, and trusted

The paper presents a soundness recipe (Section 3, p. 30): sound analyses of individual subproblems, sound combination of the results, and induction over the decomposition hierarchy. It does not provide a mechanized artifact or numerical evaluation in these four pages. Inference: the trusted elements are the symbolic transition encoding, the synthesis engine's soundness, abstract-domain semantics, fixed-point computations, and the analyst's partition choices; the paper does not list them. Inference: for agent-written verified Rust, the threat is proof-scale and precision drift rather than an unsound Verus proof: splitting contracts can hide a missing relation, while over-inlining can make verification infeasible. A product should preserve explicit dependency graphs and check that each generated contract is actually strong enough for its caller.

## techniques for the catalog

- transition-system encoding: describe each procedure with `Init`, `Trans`, and `Out`, then synthesize invariants, summaries, and termination relations
- call-context decomposition: split a callee summary into caller-to-callee context and callee-to-caller summary, resolving their cycle with fixed points
- dependency-aware partitioning: map cycles among invariants, summaries, and ranking arguments before choosing solver subproblems
- sound composition: require sound subproblem analyses, sound result combination, and induction over the decomposition hierarchy
- dynamic precision control: partition only when capacity is exceeded, and expand loops or recursive calls when abstraction loses needed precision
