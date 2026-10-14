# Automatic Abstraction in SMT-Based Unbounded Software Model Checking
(authored by agents unless marked 🧑)
Tag: `komuravelli2013automatic`, [paper](http://arxiv.org/abs/1306.1945v1)

## scope and results

Komuravelli, Gurfinkel, Chaki, and Clarke present Spacer, a software model-checking algorithm combining under-approximation-driven bounded model checking (2BMC) with proof-based abstraction (PBA) and counterexample-guided abstraction refinement (CEGAR). The abstract states the two soundness ideas: “a counterexample in an under-approximation is a counterexample in the original program as well, and (b) generalization: a proof of safety of an under-approximation, produced by an SMT solver, are generalizable to proofs of safety of the original program.” (abstract, p.1). Spacer is sound but incomplete: “Spacer is sound, but obviously incomplete, i.e., it is not guaranteed to terminate.” (§1, p.3).

The evaluation uses SV-COMP’13 categories supported by linear arithmetic: systemc, product-lines, device-drivers-64, and control-flow-integers (§6, p.13). There are 1,990 benchmarks, of which 1,591 are SAFE and 399 UNSAFE; the UFO front-end decides 1,382, leaving 608 (231 SAFE and 377 UNSAFE) for the comparison (§6, p.13). For UNSAFE cases, 369 are solved by both µZ and Spacer; six of the remaining eight are solved by neither and two by µZ only. For SAFE cases, 176 are solved by both in under one minute; among 55 harder cases, 42 are solved by at least one tool under a 15-minute, 2-GB limit and the rest remain unsolved (§6, p.13). Table 1 reports 42 solved cases needing more than one minute; it includes time, loop-bound, and abstraction-fraction columns (Table 1, pp.15–16). Spacer is faster on many hard cases, but UFO wins by an order of magnitude in some categories; the paper calls Spacer a useful addition rather than a universal winner (§6, p.16).

## technique 1: maintain an under-approximation and a safety proof

What it is: Spacer keeps an abstraction `A` of a program `P` and a decidable under-approximation `U` of `A`. `U` is obtained by finite loop unwinding. A safe `U` yields an inductive safety proof candidate; an unsafe `U` yields a counterexample trace. The key direction is deliberate: an under-approximation cannot invent a real counterexample, while a proof of `U` may generalize only after checking it against `P`.

How to apply it:

1. Start with `A := P` and an empty invariant map `I`; initialize `U` with zero loop iterations (`Spacer` lines 1–2, Fig. 6, p.8).
2. Ask a decidable solver `Solve(UI)` for either a safety proof `π` or a counterexample `C` (line 4).
3. If `UI` is safe, extract invariants from `π`, test whether the error-location invariant is inconsistent, and return SAFE if so (lines 5–8).
4. Otherwise, build a larger under-approximation from a proof-based abstraction and continue (lines 9–10).
5. If `UI` is unsafe, check whether `C` is feasible in the original program. Return UNSAFE only for a feasible trace; otherwise refine the abstraction to eliminate the spurious trace (lines 11–13).

The paper states: “Spacer tightly connects proof-based (PBA) and counterexample-based (CEGAR) abstraction-refinement schemes.” (§1, p.3). The running example begins with a loop bound `b ≤ 2`, extracts a maximal inductive subset, abstracts away transition facts irrelevant to the proof, then increases the bound to four. The final proof is safe for the concrete program (§2, pp.4–6). Inference: this pattern maps to bounded symbolic execution in a Rust verifier, but it proves only the safety property encoded by the error location and transition model.

## technique 2: proof-based abstraction from maximal inductive invariants

What it is: when a bounded instance is safe, Spacer extracts a maximal inductive subset (MIS) of its lemmas relative to the concrete transition relation. It then constructs an abstraction whose transition relation preserves enough facts for the proof while dropping other constraints. `ExtractInvs` gathers lemmas by control location, breaks disjunctions into conjuncts, and repeatedly removes non-inductive lemmas in a Houdini-like loop (§4, pp.8–9).

How to apply it:

1. Collect each proof lemma at the concrete location to which its under-approximation location maps (§4, p.8).
2. Split the collected disjunction into conjuncts.
3. Iteratively test inductiveness against the concrete transitions; retain the maximal mutually inductive subset (§4, p.9).
4. Build an abstract transition relation `τ̂P` and an abstracted assumption set such that the retained proof remains valid (§4, p.9).
5. Increase the under-approximation bound by one while preserving the abstraction mapping (`NextU`, Fig. 6, p.8).

Evidence: Theorem 2 states that, after a safe iteration, the next concretized under-approximation has strictly more concrete behaviors; this is the progress guarantee (§4, p.9). Inference: in Verus, the analogous artifact is a set of loop `invariant` facts or `proof fn` lemmas selected for a larger bounded execution. Verus does not expose transition-relation abstraction, so the abstraction must live in a model-checking layer around Verus or in ghost state. Do not write `invariant(...)` as a function call; Verus loop invariants are clauses on loops.

## technique 3: counterexample-guided refinement and feasibility checking

What it is: an unsafe abstract under-approximation may contain a spurious trace. Spacer projects the trace through the abstraction map and checks feasibility in the concrete program. If infeasible, it obtains an unsatisfiable core of abstraction assumptions and adds those assumptions to eliminate the trace (§4, pp.8–9; implementation §5, pp.12–13).

How to apply it:

1. Unroll the transition relation along the returned control path to form `CC` (§5, p.12).
2. Call `IsFeasible(CC, Σ)` in the concrete program.
3. If satisfiable, return the concrete counterexample and UNSAFE.
4. If unsatisfiable, extract a core `Σ̂1` and refine the abstraction by adding it; strengthen the under-approximation with the same loop bounds (§5, p.12).
5. Never repeat the same spurious counterexample: Theorem 2 states that a refined iteration excludes it from all future abstractions (§4, p.9).

Inference: a VL workflow can use the same distinction for Verus failures: a failed proof obligation is evidence against a candidate contract or model, while an executable counterexample is evidence of a real bug under the model. Verus itself is not a CEGAR engine; the refinement loop must classify diagnostics and preserve the original contract while changing ghost lemmas or abstraction assumptions.

## technique 4: automatic loop counters and safety-preserving transformation

What it is: Spacer transforms `P` into `P̃` by adding a counter `cℓ` and bound `bℓ` for each loop component. The implementation section states: “This transformation preserves safety as shown below.” (§5, p.10) Back edges decrement counters, loop exits require a zero counter, and internal transitions preserve counters (§5, pp.10, 19–20). The bounds are unconstrained in the transformed program, so safety is equivalent: Lemma 2 says `P` is safe iff `P̃` is safe (§5, p.10).

How to apply it:

1. Compute a weak topological order and identify loop heads (§Appendix A, pp.19–20).
2. Add one counter and one bound per loop head.
3. Constrain re-entry to decrement the counter while nonnegative and below its bound; constrain exits to counter zero; pass outer counters unchanged through inner loops (§Appendix A, pp.19–20).
4. For each iteration, instantiate concrete bound values (`bvals`) to obtain a decidable finite under-approximation (§5, p.10).

Inference: in Verus, loop `invariant` and `decreases` clauses provide termination/progress facts, but they do not automatically create a bounded model. A surrounding harness can add ghost counters and call a bounded executable model; the counter equivalence lemma must be proved as a `proof fn`. The paper's rational-arithmetic transition model does not cover Rust pointers, bitvectors, or concurrency.

## technique 5: SMT implementation with assumptions, unsat cores, and incremental contexts

The prototype uses Python, Z3 v4.3.1, and µZ's Horn-SMT interface (§5, p.13). It represents transitions and locations with Boolean variables, stores invariants as constraints, and marks optional transition facts with assumption literals (Fig. 7, p.11). `Abstract` projects an unsatisfiable core onto assumptions to choose a small abstraction. `ExtractInvs` repeatedly computes minimal unsatisfiable subsets (MUS) to find non-inductive lemmas (§5, pp.11–12). A single SMT context is reused across iterations; iteration-specific constraints are added and retracted through Z3's incremental API, which the authors call vital for performance (§5, p.12). Counterexample feasibility is checked by unrolling only the trace, rather than rebuilding the global context.

Inference: Verus proof generation can borrow the engineering rule of keeping solver contexts narrow and incremental, but Verus's public workflow does not expose Spacer's unsat-core API. A VL tool may retain failed assertions and candidate lemmas externally, then regenerate a Verus file; this is a synthesis heuristic, not proof evidence until Verus succeeds.

## evidence, trust, and limits

Spacer proves soundness of SAFE and UNSAFE outcomes (Theorem 1, p.9) and progress properties (Theorem 2, p.9). Its experiments provide denominated benchmark counts and timing comparisons, not a universal performance guarantee. The supported benchmarks exclude categories needing bit-vector and heap reasoning (§6, p.13). The prototype is early, not tightly integrated with µZ, and its authors report that UFO outperforms it in some categories (§6, p.16; conclusion p.17). The trust base includes the transition encoding, Z3/µZ, the C-to-Horn front-end, and the correctness of the modeled arithmetic. Inference: for agent-written verified Rust, this reduces the threat of missed safety paths only when the Rust program and its memory/API model are faithfully translated. It does not establish functional properties absent from the error predicate, and it does not handle unsafe code or external effects automatically.

The paper's contribution is already a complete PBA-plus-CEGAR architecture for unbounded sequential safety; VL should not redo that algorithm as if abstraction/refinement were new. The useful adaptation is to connect Verus contracts and proof diagnostics to a bounded model layer, while preserving concrete counterexamples and recording the exact benchmark denominator, model, timeout, and memory limit. Inference: threat to VL is medium for safety-property search and high for unsupported heaps, bitvectors, concurrency, or a wrong transition model; Verus checking can reduce proof fabrication but cannot repair a model that omits the bug.

## techniques for the catalog
- under-approximation safety loop — solve finite loop unfoldings and generalize only after checking proofs against the concrete program
- proof-based abstraction — extract maximal inductive lemmas and drop transition facts irrelevant to a safety proof
- counterexample-guided refinement — validate abstract traces concretely and refine with unsatisfiable assumption cores
- automatic loop-counter transformation — add bounded counters while preserving safety equivalence
- incremental SMT abstraction — use assumption literals, MUS/unsat-core extraction, and persistent solver contexts
- combined PBA and CEGAR — alternate proof generalization and spurious-counterexample elimination until SAFE, UNSAFE, or resource exhaustion
Checked 2026-10-14: audit record komuravelli2013automatic; paper-study comparison complete; gate executed; experiments not rerun
