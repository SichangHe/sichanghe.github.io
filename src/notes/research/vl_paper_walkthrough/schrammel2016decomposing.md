# Challenges in Decomposing Encodings of Verification Problems
(authored by agents unless marked 🧑)
Tag: `schrammel2016decomposing`, [paper](http://arxiv.org/abs/1607.04458v1)

This four-page paper studies how to split solver encodings of verification problems without losing precision or soundness. It uses universal termination as the running example. The problem is practical: a monolithic second-order formula can overwhelm a synthesis engine, but decomposition introduces extra predicates and abstractions that can make the result less precise. The abstract states: “However, decomposition introduces abstractions in addition to those required for finding the unknown predicates in the formula, and can hence deteriorate precision.” (Abstract, p. 29)

## technique: encode procedures as symbolic transition systems

What it is. Represent each procedure `f` by three first-order predicates: `Init_f(xin,x)` for initial states, `Trans_f(x,x')` for loop transitions, and `Out_f(x,xout)` for outputs (Section 2, p. 29). Inputs include parameters, globals, and read memory; outputs include returns, globals, and written memory. Internal states are values at loop heads. A call graph supplies call-site argument variables and a termination relation `RR_f` such as a well-founded transition invariant.

How to apply it.
1. Translate each procedure's semantics into `Init`, `Trans`, and `Out` formulas (Section 2, p. 29).
2. Introduce second-order predicates `Summary_f`, `Inv_f`, and `RR_f` for each procedure. `Summary_h` describes a callee's input/output relation; `Inv_f` is a loop invariant; `RR_f` is a termination argument.
3. Constrain them with the paper's formula (1): initialization implies `Inv_f`; an invariant state and transition plus summaries imply the next invariant state and `RR_f`; an invariant output state implies `Summary_f` (Section 2, pp. 29–30).
4. Solve for the existential predicates. Recursive calls create cyclic `Summary_f` dependencies, and nested loops create dependent invariants (Section 2, p. 30).

Verus form. Inference: a Rust/Verus encoding would express `Init` and `Out` as `requires`/`ensures`, loop `Trans` through executable code plus `invariant`, and `RR` with `decreases`. A procedure summary is its function contract. Verus checks a supplied contract rather than synthesizing arbitrary second-order predicates, so this paper's synthesis engine corresponds to a design-time way of discovering candidate contracts. This is an inference; the paper uses Horn/second-order formulas, not Verus.

Evidence and assumptions. The encoding is a logical specification, not an implementation benchmark. Soundness is conditional on solving the existential predicates and on the transition relation accurately modeling the program. The paper's example targets universal termination, not memory safety or functional correctness.

## technique: procedural divide-and-conquer with call contexts and summaries

What it is. Split a call-graph formula top-down, analyzing one procedure at a time. At a call from `f` to `h`, replace the monolithic `Summary_h` with a calling-context predicate `CallCtx_h` that transfers facts from caller to callee and a summary `Sum_h` that transfers results back (Section 3, p. 30). The authors report: “This decomposition splits the Summaryh predicate for a call to procedure h at call site i into a calling context predicate CallCtxh that transfers information from the caller to the callee, and a summary predicate Sumh that transfers information from the callee to the caller.” (Section 3, p. 30)

How to apply it.
1. Traverse the call graph from callers to callees and create a `CallCtx` at each call site (Section 3, p. 30).
2. Infer `CallCtx` from the caller invariant and transition relation; the paper's footnote gives the shape `Inv_f(x_f) ∧ Trans_f(x_f,x'_f) ⇒ CallCtx_hi(xin_hi,xout_hi)` (footnote 2, p. 32).
3. Solve the callee with that context and synthesize `Sum_h` as the relation exported to callers.
4. Propagate summaries back up the graph. Mutual dependencies form a cycle between `CallCtx_h` and `Sum_h`; the cited algorithm resolves it with a greatest-fixed-point computation (Section 3, p. 30).

Verus form. Inference: use modular Rust contracts as summaries and explicit wrapper lemmas to transfer caller facts into callee preconditions. A recursive function requires a `decreases` proof; an invariant can carry the caller's context. Verus does not infer contracts by greatest fixed point, so a VL workflow could use this decomposition offline to propose contracts, then check each contract mechanically.

Evidence and limits. The cited decomposition improves efficiency over monolithic solving, but the paper reports no timing or denominator for that claim. It says greatest-fixed-point resolution is “very imprecise for recursive procedures” (Section 3, p. 30). Thus recursive call summaries may need expansion or a stronger domain.

## technique: separate mutually dependent invariants and termination arguments

What it is. In the universal-termination encoding, loop invariant `Inv_f` and termination relation `RR_f` depend on each other; in the sufficient-precondition encoding, an under-approximating summary, the termination argument, and invariants form an optimization problem (Fig. 1 and Section 3, pp. 30–31). The paper emphasizes that decomposition can change a verification problem into an inference problem: “The subproblems may be inference, and not verification problems; hence their solving requires optimisation (like our synthesis engine) instead of decision procedures.” (Section 3, p. 30)

How to apply it.
1. Draw a dependency graph of unknown predicates before partitioning; mark cycles among summaries, contexts, invariants, and termination arguments (Fig. 1, p. 30).
2. Partition predicates whose domains can be optimized separately. The authors solve invariants and termination arguments separately because their engine lacks a product domain supporting both (Section 4, p. 31).
3. Ensure each subproblem remains sound and that the combination of subproblem results is sound; induction over the decomposition hierarchy supplies the global argument (Section 3, p. 30).
4. If a partition creates an unusable cycle, expand the subproblem or introduce a stronger relational predicate rather than silently accepting a less precise abstraction.

Verus form. Inference: this maps to separating a Rust proof into loop invariants, ranking lemmas, and function contracts, then composing them through `requires`/`ensures`. A ranking proof with `decreases` may need facts from the functional invariant; keep those facts in a shared lemma rather than weakening either obligation. Verus's solver is a decision procedure for a given proof state, so any synthesis or optimization step remains outside the verified program.

Evidence and assumptions. The paper gives dependency diagrams and qualitative lessons, not a universal partition algorithm. The choice of least versus greatest fixed points depends on the abstract domain and the analysis; mixing them in one query was beyond the described engine.

## technique: choose decomposition dynamically and use expansion when capacity permits

What it is. The final lesson treats partitioning as a capacity and precision tradeoff. Solving larger subformulas can preserve precision and avoid later refinement; solving smaller ones scales better. The authors recommend property-, precision-, and capacity-driven dynamic decomposition, re-partitioning by eliminating and introducing predicates, and expanding by unrolling loops or inlining recursion when the solver can handle it (Section 4, p. 31). Their warning is direct: “Decompositions introducing cyclic dependencies should only be used if the solving capacity is exceeded.” (Section 4, p. 31)

How to apply it.
1. Start with the largest subformula the engine can solve and record which predicates remain unknown or which query exceeds capacity (Section 4, p. 31).
2. If capacity is exceeded, partition along procedure or property boundaries, preserving explicit interfaces (`CallCtx`, `Sum`) and documenting every new abstraction.
3. If precision drops, expand by inlining a call or unrolling a loop; this removes an abstraction at the cost of a larger formula (Section 4, p. 31).
4. Recompute the dependency graph after each repartition. Stop when the combined result is sound and the precision required by the property is recovered.

Verus form. Inference: apply this as proof engineering: expose a helper contract for a large function when the solver times out, then inline or unfold a helper when an abstraction is too weak. Keep the same mathematical postcondition while changing only proof boundaries. Verus has no automatic capacity-driven partitioner, so the policy must be measured externally and checked by ordinary proofs.

Evidence and limits. The paper gives no absolute solver limits, speedups, or case-study counts. Its recommendations are grounded in the dependency structure of the termination encodings and may not transfer unchanged to every property. It does not claim that smaller or larger partitions are always better.

## what is proved, measured, and trusted

The paper presents a soundness recipe: individual subproblem analyses, sound combination, and induction over the decomposition hierarchy. It does not provide a new mechanized artifact or numerical evaluation in these four pages. Trusted elements are the symbolic transition encoding, the synthesis engine's soundness, abstract-domain semantics, fixed-point computations, and the analyst's partition choices. Inference: for agent-written verified Rust, the threat is proof-scale and precision drift rather than an unsound Verus proof: splitting contracts can hide a missing relation, while over-inlining can make verification infeasible. A product should preserve explicit dependency graphs and check that each generated contract is actually strong enough for its caller.

The paper already identifies the main decomposition failure modes and the expansion remedy. VL should not redo a generic “split large proofs” proposal. A useful application is to measure these tradeoffs on real Verus projects: track solver time, contract strength, and repair effort as helper boundaries change, while keeping the final Verus proof unchanged.

## techniques for the catalog

- transition-system encoding: describe each procedure with `Init`, `Trans`, and `Out`, then synthesize invariants, summaries, and termination relations
- call-context decomposition: split a callee summary into caller-to-callee context and callee-to-caller summary, resolving their cycle with fixed points
- dependency-aware partitioning: map cycles among invariants, summaries, and ranking arguments before choosing solver subproblems
- sound composition: require sound subproblem analyses, sound result combination, and induction over the decomposition hierarchy
- dynamic precision control: partition only when capacity is exceeded, and expand loops or recursive calls when abstraction loses needed precision
Checked 2026-10-14 against the paper by a Codex agent: audit record schrammel2016decomposing; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
