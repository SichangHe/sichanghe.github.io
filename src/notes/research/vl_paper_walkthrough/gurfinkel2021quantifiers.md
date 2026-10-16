# Quantifiers on Demand
(authored by agents unless marked 🧑)
Tag: `gurfinkel2021quantifiers`, [paper](http://arxiv.org/abs/2106.00664v1)

## what the paper proves

Gurfinkel, Shoham, and Vizel present QUIC3, an IC3/PDR procedure that infers universally quantified inductive invariants for transition systems over linear integer arithmetic (LIA) and arrays. The abstract states: “we present a new algorithm, Q UIC 3, that extends IC3 to infer universally quantified invariants over the combined theory of LIA and Arrays.” (Abstract, p. 1). The procedure either returns a quantified invariant proving safety or a counterexample. The paper explicitly says that “While Q UIC 3 is not guaranteed to converge, it is guaranteed to make progress by exploring longer and longer executions.” (Abstract, p. 1).

Inference: The result is most relevant to VL when a Rust function manipulates a `Vec` or array whose length is symbolic and the needed postcondition quantifies over every valid index. It supplies an algorithmic pattern for discovering such facts; it does not prove that Verus can automatically run QUIC3 or infer the same formulas.

The input is a quantifier-free safety problem `(Init, Tr, Bad)` in first-order logic over LIA and arrays. States are represented by uninterpreted constants, and array operations use `sel` and `store`. A safety proof is an inductive invariant satisfying initialization, preservation by `Tr`, and exclusion of `Bad` (Section 2, pp. 3–4). The implementation accepts CHCs in SMT-LIB and emits an invariant or counterexample (Section 1, p. 2).

## technique 1: quantified IC3 frames and proof obligations

What it is. QUIC3 keeps IC3's monotone frame sequence and proof-obligation queue, but each lemma has a formula with free integer variables plus a substitution recording the ground instance. The paper defines a proof obligation as “a triple hm, σ, ii, where m is a monomial over X such that FVars(m) are of sort int” (Section 3, p. 5). A frame pair `(ℓ, σ)` denotes the universally quantified lemma `∀ℓ` and its known instance `ℓσ` (Section 3, p. 6).

When to use it. Use this representation when a finite ground lemma is only one instance of a property that should hold for all integer indices. The running example initializes every array cell and then asserts an arbitrary in-range cell is zero (Figure 1, p. 7).

How to apply it, following the paper.

1. Encode `Init`, `Tr`, and `Bad` as quantifier-free ground formulas (Section 3, p. 5)
2. Initialize frame `Q0` with `Init`, set later frames empty, and maintain a queue of triples `(m, σ, i)` (Algorithm 1, p. 5)
3. For a candidate bad state at frame `N`, enqueue a proof obligation (Algorithm 1, p. 5)
4. Check the current frame's *known ground instances* together with `Tr` and a skolemized target; if satisfiable, compute a predecessor (Algorithm 1 and Figure 3, pp. 5, 10)
5. If unsatisfiable, interpolate to obtain a blocking lemma, abstract skolem constants back to variables, and add the lemma to all appropriate earlier frames (NewLemma, Section 3, pp. 6–7)
6. Push lemmas forward; if two consecutive quantified frames are equal, return Safe (Push and Safe, Algorithm 1, p. 5)

Verus form. Inference: encode the executable loop over a vector with ordinary Rust operations, state the desired quantified property in `ensures`, and carry the finite-index facts in `invariant` declarations. Inference: a proof helper can use `assert forall` and `proof fn` lemmas to establish preservation for arbitrary indices. QUIC3's frame queue, substitutions, and interpolation engine are verifier infrastructure, not Verus source constructs; Verus users would supply or generate the resulting lemmas.

Evidence and limits. QUIC3's soundness lemma says: “If Q UIC 3 returns Cex, then P is not safe (and there exists a counterexample). Otherwise, if Q UIC 3 returns Safe, then P is safe.” (Lemma 3, p. 9). The proof depends on the inductive-frame conditions and the soundness of predecessor and interpolation rules. Inference: it does not establish completeness because quantified LIA-plus-array safety is undecidable.

## technique 2: partial model-based projection for predecessors

What it is. A satisfiable predecessor query is generalized with partial model-based projection (MBP). The paper requires an MBP result `(ψ, W)` to be a ground monomial consistent with the model and to imply the existential projection; array constants must be eliminated even though the array theory has no complete quantifier elimination (Section 2, pp. 3–4).

How to apply it.

1. Skolemize the free variables of the target POB with deterministic constants `sk_i` (Predecessor, Section 3, p. 6)
2. Query satisfiability of the current frame instances, `Tr`, and the skolemized target (Algorithm 1, p. 5)
3. On a model `M`, call `MBP(X′ ∪ SK, Tr ∧ m′sk, M)` to obtain a predecessor monomial (Algorithm 1, p. 5)
4. Abstract any remaining post-state or skolem constants into fresh integer variables, retaining the substitution `σ` that maps them back (Section 3, p. 6)
5. Enqueue the resulting non-ground predecessor POB at the preceding frame

The paper defines the projection requirement as: “The underapproximation ψ is chosen such that it is consistent with the provided model M.” (Section 2, p. 4). In the array initialization example, the predecessor is `pc = 2 ∧ sel(A, v0) ≠ 0 ∧ 0 ≤ v0 < sz`, with substitution `v0 ↦ j` (Section 3, p. 7).

Verus form. Inference: the analogue is a ghost predecessor relation over an index and array snapshot, proved with `requires`/`ensures` and index-bound lemmas. Verus does not provide MBP; a generated proof lemma must justify that every state satisfying the predecessor predicate has a transition into the target predicate. Inference: the abstraction of an array index becomes a universally or existentially quantified specification variable, while executable Rust remains unchanged.

Where it fails. The paper says array theory “does not admit quantifier elimination it only admits a partial MBP” (Section 2, p. 4). Inference: projection can leave residual variables and may generate many POBs; it is not a complete elimination procedure.

## technique 3: quantifier instantiation managed on demand

What it is. Instead of asking an SMT solver to decide arbitrary quantified formulas, QUIC3 stores and generates a finite set of instances. The authors explain: “Instead of using an SMT solver as a black-box, Q UIC 3 generates and maintains a set of instantiations on demand.” (Section 1, p. 2). Blocking drives instance generation, supplemented by pattern triggers (Section 1, p. 2).

How to apply it.

1. Keep each quantified lemma together with the concrete substitution that caused it (Section 3, p. 6)
2. Use only the accumulated instances `qi(Qi)` in predecessor satisfiability checks (Algorithm 1, p. 5)
3. During pushing, combine existing instances with a finite trigger-based instantiation set (Section 4, p. 10)
4. Add instances discovered while blocking new proof obligations; reuse them in later frames
5. Increase the frame depth only after constructing an interpolation sequence for the current bound (Section 4, p. 10)

The progress argument relies on deterministic skolemization. The paper reports: “for each POB hm, ξ, ii, the number of POBs generated by applying Predecessor on hm, ξ, ii is finite.” (Lemma 5, p. 11). It then concludes that every fixed bound reaches the next depth, returns Safe, or finds a counterexample (Lemma 6, p. 11), and that a counterexample is shortest (Corollary 1, p. 11).

Verus form. Inference: expose only selected quantified facts to the solver with `assert forall` triggers or helper `proof fn` calls, and retain finite ground instances as ghost facts. Inference: this is an engineering analogue, not a theorem that Verus's solver uses the same completeness or progress argument. The paper itself notes the trade-off: finite instantiation “ensures progress ... at an expense of completeness” (Section 4, p. 10).

## technique 4: quantified generalization (QGen)

What it is. QGen strengthens a specific lemma by abstracting terms into fresh universally quantified variables, while checking that the stronger lemma is valid in the current frame. The rule requires `gσ ≡ ℓξ`, preservation of existing free variables, and validity of `F(qi(Qi)) → ∀g′` (Algorithm 2, p. 12).

Simple QGen. The procedure finds an array-index subterm with lower and upper bounds, replaces it with a fresh variable, and uses the bounds as guards. The paper's example is: “if ℓ is 0 < sz → (sel(A, 0) = 42) ... a candidate (g, σ) is 0 ≤ v0 < sz → sel(A, v0 ) = 42” (Section 5, p. 12). Apply it by enumerating eligible `sel` indices, abstracting one at a time, checking validity, and inserting the accepted lemma in frames through `i+1`.

Arithmetic QGen. For lemmas containing repeated instances of a relation `p(v)`, treat substitutions as data points, compute their convex hull (or polyhedral join for general linear terms), and replace the conclusion with a quantified relation over that hull. The paper's data points `sel(A,0)=42` and `sel(A,1)=44` produce `0 ≤ i ≤ 1 ∧ j = 2i + 42` (Section 5, p. 12). It further gives the simplified form `∀i · (0 ≤ i ≤ sz) → (sel(A, i) = 2i + 42)` (Section 5, p. 12).

Verus form. Inference: write the generalized relation as a `spec fn` over an index and prove it with a `proof fn`; use loop `invariant` clauses to establish bounds and the data-point facts, then call the lemma before the executable array access. Inference: convex-hull inference must occur outside the Verus proof or be emitted as candidate lemmas; Verus checks the resulting arithmetic relation but does not provide QGen as a built-in feature.

Limits. The authors report that their two heuristics were sufficient for their benchmarks, but state that “QGen only considers one candidate for abstraction, and generalization fails if that candidate fails.” (Section 6, p. 13). Inference: candidate ordering can cause avoidable timeouts even when another abstraction would work.

## measured evidence and trust

The implementation is in Z3's CHC engine and uses SeaHorn-converted SV-COMP array programs. Experiments used “a Linux machine with an Intel E3-1240V2 CPU and a timeout of 300 seconds.” (Section 6, p. 13). Table 1 compares QUIC3 with Z3/SPACER on 32 listed safe benchmarks (Table 1, p. 14). For example, `array-init-const` takes 0.14 seconds, discovers 24 lemmas and 7 invariant lemmas at depth 6; SPACER times out? No: its row reports depth 130 and 4,483 lemmas, with no time column shown for SPACER in that row. `array-mul-init-tuc` times out for QUIC3 after depth 129 and 8,136 lemmas; SPACER reaches depth 131 with 8,393 lemmas. The table reports QUIC3 timeouts on several benchmarks, so the result is not universal termination.

The paper says SPACER “times out on all of the benchmarks” in the comparison (Section 6, p. 13), but Table 1 contains finite SPACER depths and lemma counts. Inference: this is an internal presentation inconsistency; the table's finite depth/count entries cannot by themselves establish a timeout, and the sentence may refer to completing the instances within the reported 300-second limit. The denominator for the percentages is not supplied because the authors report per-benchmark counts, not aggregate success rates.

What is proved: soundness of returned Safe/Cex results, finite progress at each depth under deterministic skolemization, and shortest-counterexample termination when a counterexample exists (Lemmas 1–6 and Corollary 1, pp. 6–11). What stays trusted: the Z3 implementation, SMT satisfiability and interpolation/MBP procedures, SeaHorn's CHC translation, the C-to-CHC encoding, and the correctness of the supplied safety property. Inference: a Verus product would additionally trust the Rust compiler, Verus translation and erasure, solver behavior, external specifications, and the adequacy of the quantified contract.

Inference: the threat to a product that generates verified Rust is medium for array-heavy code. QUIC3 can discover index-general invariants that an agent might otherwise omit, but its undecidable theory, heuristic QGen, partial MBP, and implementation-specific CHC pipeline leave substantial integration work. Existing work means VL should not redo a generic IC3-with-quantifiers implementation; it should test whether the generated quantified lemmas improve Verus proof completion and whether finite instantiation remains stable under real Rust ownership and borrowing.

## techniques for the catalog

- quantified ic3 frames — store quantified lemmas with substitutions in monotone frames and block quantified proof obligations

- partial model-based projection — derive sound predecessor cubes while abstracting residual array and skolem constants

- on-demand instantiation — generate and reuse finite quantifier instances during blocking and pushing to guarantee progress at each depth

- simple qgen — replace bounded array-index terms with fresh universally quantified indices guarded by inferred bounds

- arithmetic qgen — generalize repeated arithmetic/index data points with convex hulls or polyhedral joins

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
