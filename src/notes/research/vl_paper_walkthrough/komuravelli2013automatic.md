# Automatic Abstraction in SMT-Based Unbounded Software Model Checking
(authored by agents unless marked 🧑)
Tag: `komuravelli2013automatic`, [paper](http://arxiv.org/abs/1306.1945v1)

## scope and results

Komuravelli, Gurfinkel, Chaki, and Clarke present Spacer, a software model-checking algorithm combining under-approximation-driven bounded model checking (2BMC) with proof-based abstraction (PBA) and counterexample-guided abstraction refinement (CEGAR). The abstract states the two soundness ideas: “a counterexample in an under-approximation is a counterexample in the original program as well, and (b) generalization: a proof of safety of an under-approximation, produced by an SMT solver, are generalizable to proofs of safety of the original program.” (abstract, p.1). Spacer is sound but incomplete: “Spacer is sound, but obviously incomplete, i.e., it is not guaranteed to terminate.” (§1, p.3).

The evaluation uses four SV-COMP’13 categories: systemc, product-lines, device-drivers-64, and control-flow-integers; the paper says “Other categories require bit-vector and heap reasoning that are not supported by Spacer.” (§6, p.13). There are 1,990 benchmarks, of which 1,591 are SAFE and 399 UNSAFE; the UFO front-end decides 1,382, leaving 608 (231 SAFE and 377 UNSAFE) for the comparison (§6, p.13). For UNSAFE cases, 369 are solved by both µZ and Spacer; of the remaining eight, six are solved by neither tool and two by µZ but not Spacer (Spacer needs at most 3 minutes on the 369). For SAFE cases, 176 are solved by both in under one minute; among 55 harder cases, 42 are solved by at least one tool under a 15-minute, 2-GB limit and the rest remain unsolved (§6, p.13). Table 1 reports the 42 solved benchmarks needing more than a minute; it includes running times, final loop-bound values, and the fractions of assumption variables in the final and maximal abstractions (Table 1, p.15). The paper says the results are mixed up to a 300-second bound, but beyond 5 minutes “abstraction really helps with many benchmarks solved by Spacer when µZ runs out of time”, and that on elev_13_22, elev_13_29 and elev_13_30 Spacer succeeds while µZ runs out of memory (§6, p.15). It reports two variants besides default Spacer: abstracting only state variables (effective on ssh and ssh-simplified) and a PBA-like variant that concretizes whenever a spurious counterexample appears (significantly better in 14 cases, §6, pp.15–16). UFO, the SV-COMP’13 winner of these four categories, outperforms Spacer and µZ in ssh and product-lines by an order of magnitude; the authors conclude that “while Spacer itself is not the best tool for all benchmarks, it is a valuable addition to the state-of-the-art verification engines.” (§6, p.16).

## technique 1: maintain an under-approximation and a safety proof

What it is: Spacer keeps an abstraction `A` of a program `P` and a decidable under-approximation `U` of `A`. The paper says `U` “is obtained by considering finitely many finitary executions of A” (§1, p.3); the implementation bounds the iterations of every loop (§5, p.10). A safe `U` yields an inductive safety proof candidate; an unsafe `U` yields a counterexample trace. The key direction is deliberate: an under-approximation cannot invent a real counterexample, while a proof of `U` may generalize only after checking it against `P`.

How to apply it:

1. Start with `A := P` and an empty invariant map `I`; initialize `U` with all loop bounds zero (`Spacer` lines 1–2, Fig. 6, p.8; `InitU` in §5, p.11).
2. Ask a decidable solver `Solve(UI)` for either a safety proof `π` or a counterexample `C` (line 4).
3. If `UI` is safe, extract invariants from `π`, test whether the error-location invariant is inconsistent, and return SAFE if so (lines 5–8).
4. Otherwise, compute a new proof-based abstraction with `Abstract` and a new under-approximation with `NextU` (lines 9–10).
5. If `UI` is unsafe, check whether `C` is feasible in the original program. Return UNSAFE only for a feasible trace; otherwise refine the abstraction and the under-approximation to eliminate the spurious trace (lines 11–13 and 20–21).

The paper states: “Spacer tightly connects proof-based (PBA) and counterexample-based (CEGAR) abstraction-refinement schemes.” (§1, p.2). The running example (the authors say they chose the under-approximations to save space) begins with a loop bound `b ≤ 2`, extracts a maximal inductive subset, abstracts away transition facts irrelevant to the proof, finds a spurious counterexample at bound `b ≤ 4`, refines, and then obtains a proof that is a maximal inductive subset of itself and hence a safety proof for `P` (§2, pp.4–6). Inference: this pattern might map to bounded symbolic execution in a Rust verifier, but it proves only the safety property encoded by the error location and transition model.

## technique 2: proof-based abstraction from maximal inductive invariants

What it is: when a bounded instance is safe, Spacer extracts a maximal inductive subset (MIS) of its lemmas relative to the concrete transition relation. It then constructs an abstraction whose transition relation preserves enough facts for the proof while dropping other constraints. `ExtractInvs` gathers lemmas by control location, breaks disjunctions into conjuncts, and repeatedly removes non-inductive lemmas in a Houdini-like loop (§4, pp.8–9).

How to apply it:

1. Collect each proof lemma at the concrete location to which its under-approximation location maps (§4, p.8).
2. Split the collected disjunction into conjuncts.
3. Iteratively test inductiveness against the concrete transitions; retain the maximal mutually inductive subset (§4, p.9).
4. Build an abstract transition relation `τ̂P` (with `τP ⇒ τ̂P`) such that `π` is a safety proof of the abstracted under-approximation (`Abstract`, line 16, p.8; §4, p.9). In the implementation, find a subset `Σ̂1` of the assumptions `Σ` by projecting an unsatisfiable core, minimized with a MUS algorithm (§5, p.12).
5. Compute the next under-approximation, which has strictly more concrete behaviors and maps to the same abstraction (`NextU`, Fig. 6 line 15, p.8); the implementation increments every loop bound by one (§5, p.12).

Evidence: Theorem 2 states that, after a safe iteration, the next concretized under-approximation has strictly more concrete behaviors; this is the progress guarantee (§4, p.9). Inference: in Verus, the analogous artifact is a set of loop `invariant` facts or `proof fn` lemmas selected for a larger bounded execution. Verus does not expose transition-relation abstraction, so the abstraction must live in a model-checking layer around Verus or in ghost state. Do not write `invariant(...)` as a function call; Verus loop invariants are clauses on loops.

## technique 3: counterexample-guided refinement and feasibility checking

What it is: an unsafe abstract under-approximation may contain a spurious trace. Spacer projects the trace through the abstraction map and checks feasibility in the concrete program. If infeasible, it obtains an unsatisfiable core of abstraction assumptions and adds those assumptions to eliminate the trace (§4, p.9; implementation §5, p.12).

How to apply it:

1. Unroll the transition relation along the returned control path to form `CC` (§5, p.12).
2. Check `Sat(CC, Σ)`, i.e. feasibility of the path with all assumptions (the concrete program) (§5, p.12).
3. If satisfiable, return the concrete counterexample and UNSAFE.
4. If unsatisfiable, extract a core `Σ̂1` and refine the abstraction by adding it; strengthen the under-approximation with the same loop bounds (§5, p.12).
5. Never repeat the same spurious counterexample: Theorem 2(3) states that if `Ui` is unsafe, `Ci` “does not repeat in future”, i.e. `σj(Cj) ≠ σi(Ci)` for all `j > i` (§4, p.9).

Inference: a VL workflow can use the same distinction for Verus failures: a failed proof obligation is evidence against a candidate contract or model, while an executable counterexample is evidence of a real bug under the model. Verus itself is not a CEGAR engine; the refinement loop must classify diagnostics and preserve the original contract while changing ghost lemmas or abstraction assumptions.

## technique 4: automatic loop counters and safety-preserving transformation

What it is: Spacer transforms `P` into `P̃` by adding a counter `cℓ` and bound `bℓ` for each loop component. The implementation section states: “This transformation preserves safety as shown below.” (§5, p.10) Entering a loop assigns its counter non-deterministically, back edges decrement it, loop exits require it to be zero, and transitions inside a loop preserve it (§5, p.10; Appendix A, pp.19–20). The bounds are unconstrained in the transformed program, so safety is equivalent: Lemma 2 says `P` is safe iff `P̃` is safe (§5, p.10).

How to apply it:

1. Compute a weak topological order and identify loop heads (Appendix A, p.19).
2. Add one counter and one bound per loop head.
3. Let entry assign the counter non-deterministically; constrain re-entry to decrement the counter (`0 ≤ c′ ∧ c′ = c − 1 ∧ c ≤ b`); constrain exits to counter zero; pass counters of enclosing loops unchanged (Appendix A, pp.19–20).
4. For each iteration, instantiate concrete bound values (`bvals`) to obtain a decidable finite under-approximation (§5, p.10).

Inference: in Verus, loop `invariant` and `decreases` clauses provide termination/progress facts, but they do not automatically create a bounded model. A surrounding harness can add ghost counters and call a bounded executable model; the counter equivalence lemma must be proved as a `proof fn`. The paper's rational-arithmetic transition model does not cover Rust pointers, bitvectors, or concurrency.

## technique 5: SMT implementation with assumptions, unsat cores, and incremental contexts

The prototype is written in Python with Z3 v4.3.1 (§6, p.13) and passes the decidable under-approximation to µZ in Horn-SMT format (§5, p.10). It represents transitions and locations with fresh Boolean variables, stores invariants as constraints, and marks each lemma with assumption literals `Aℓ,ϕ` and `Bℓ,ϕ`; the optional transition facts are the assumptions `Σ` (Fig. 7, p.11; §5, p.10). `Abstract` projects an unsatisfiable core onto assumptions to choose a small abstraction. `ExtractInvs` repeatedly computes minimal unsatisfiable subsets (MUS) to find non-inductive lemmas (§5, pp.11–12). For `Abstract` and `ExtractInvs`, a single SMT context with one copy of the transition relation is preserved across iterations; iteration-specific constraints are added and retracted through Z3's incremental API, which the authors call “vital for performance” (§5, p.12). For `Refine` and `IsFeasible`, the transition relation is unrolled along the counterexample's control path; an alternative that validated each step in the shared context made each refinement faster but increased the number of refinements, “becoming inefficient overall” (§5, pp.12–13).

Inference: Verus proof generation can borrow the engineering rule of keeping solver contexts narrow and incremental, but Verus's public workflow does not expose Spacer's unsat-core API. A VL tool may retain failed assertions and candidate lemmas externally, then regenerate a Verus file; this is a synthesis heuristic, not proof evidence until Verus succeeds.

## evidence, trust, and limits

Spacer proves soundness of SAFE and UNSAFE outcomes (Theorem 1, p.9) and progress properties (Theorem 2, p.9). Its experiments provide denominated benchmark counts and timing comparisons, not a universal performance guarantee. The supported benchmarks exclude categories needing bit-vector and heap reasoning (§6, p.13). The prototype is early, not tightly integrated with µZ, and its authors report that UFO outperforms it in some categories (§6, p.16; conclusion p.17). Inference: the trust base includes the transition encoding, Z3/µZ, the C-to-Horn front-end (UFO), and the correctness of the modeled arithmetic. Inference: for agent-written verified Rust, this reduces the threat of missed safety paths only when the Rust program and its memory/API model are faithfully translated. It does not establish functional properties absent from the error predicate, and it does not handle unsafe code or external effects automatically.

Inference: the paper already gives a full PBA-plus-CEGAR algorithm for unbounded sequential safety (incomplete in the sense of possible non-termination), so VL should not redo it as if abstraction/refinement were new. Inference: the useful adaptation is to connect Verus contracts and proof diagnostics to a bounded model layer, while preserving concrete counterexamples and recording the exact benchmark denominator, model, timeout, and memory limit. Inference: threat to VL is medium for safety-property search and high for unsupported heaps, bitvectors, concurrency, or a wrong transition model; Verus checking can reduce proof fabrication but cannot repair a model that omits the bug.

## techniques for the catalog
- under-approximation safety loop — solve finite loop unfoldings and generalize only after checking proofs against the concrete program
- proof-based abstraction — extract maximal inductive lemmas and drop transition facts irrelevant to a safety proof
- counterexample-guided refinement — validate abstract traces concretely and refine with unsatisfiable assumption cores
- automatic loop-counter transformation — add bounded counters while preserving safety equivalence
- incremental SMT abstraction — use assumption literals, MUS/unsat-core extraction, and persistent solver contexts
- combined PBA and CEGAR — alternate proof generalization and spurious-counterexample elimination until SAFE, UNSAFE, or resource exhaustion
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Constraints specific to an iteration are added and retracted using the incremental solving API of Z3."): read the whole paper text (§1–8 and appendices A–E) and the whole study; checked every quotation, benchmark number, section/page reference, algorithm line reference, theorem statement and implementation step against it. Changed: fixed the page of the PBA/CEGAR quote (p.2, not p.3); replaced the unsupported linear-arithmetic reason for the category choice with the paper's bit-vector/heap statement; corrected the Theorem 2 claim in technique 3 (counterexamples do not repeat in future under-approximations, rather than being excluded from all future abstractions); replaced the IsFeasible call in technique 3 with the paper's Sat(CC, Σ) check; fixed the Abstract/NextU step descriptions and page cites; added the loop-entry rule and the actual refinement-comparison details; corrected the Python/Z3 and Horn-SMT cites; narrowed the incremental-context claim to Abstract and ExtractInvs; added the paper's variant and UFO comparison results; marked the trust-base and full-algorithm sentences as Inference. Not checked: the Verus/Rust applicability claims and the Verus syntax note (outside the paper), the individual rows of Table 1, the proofs in the appendix beyond reading them, figures 9–11 as images, and the external references.
