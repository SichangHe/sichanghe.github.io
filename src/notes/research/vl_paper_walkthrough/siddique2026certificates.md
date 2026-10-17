# Machine-Checked Certificates for the Geometric Half of the Minimum Kochen–Specker Bound
(authored by agents unless marked 🧑)
Tag: `siddique2026certificates`, [paper](https://arxiv.org/abs/2607.26413)

## result and scope

Siddique and Mian replace the uncheckable geometric part of a computational Kochen–Specker (KS) lower-bound pipeline with exact rational certificates and two independent replay checkers. The published combinatorial half emits DRAT proofs, but Z3 nonlinear real arithmetic supplied no proof objects for non-embeddability. This paper certifies the blocking database: per Table 2 (p. 7), 291 source lines representing 180 distinct graphs, a total that already includes the seven order-13 Uijlen–Westerbaan minimal graphs (2 + 16 + 266 + 7 lines; 2 + 16 + 155 + 7 graphs). The introduction (Contribution 2, p. 2) words this as the order-10/11/12 lists "together with" the seven order-13 graphs, which reads as if the seven were extra; the table and abstract are the consistent reading. It does not yet compose a verified end-to-end lower bound of 24; two of the 44 final candidates remain unresolved.

The abstract states the gap precisely: “the non-embeddability of thousands of candidate graphs is established by Z3’s nonlinear real arithmetic, which produces no checkable proof objects.” (abstract, p. 1). The replacement is: “We introduce exact rational case-tree certificates of real non-embeddability.” (abstract, p. 1). The certificate generator may search; the checkers only replay structured polynomial identities with exact rational arithmetic (Section 3, p. 4).

## technique 1: define the semantic target with injectivity

what it is and when to use

Fix the exact embeddability proposition before designing certificates. A graph realization maps each vertex to a nonzero vector in R3, makes every edge orthogonal, and requires distinct vertices to be distinct as rays. This injectivity condition is load-bearing: some graphs have real orthogonality solutions only when two rays collapse.

how to do it

1. Define `Realization` with a vector function, nonzero obligations, edge orthogonality, and pairwise `¬ SameRay` (Definition 3.1, Section 3.1, p. 4; Figure 2, p. 6).
2. Define non-embeddability as the absence of any realization.
3. Use injectivity as the justification for `collide` leaves, for the pair-injectivity polynomials that `ideal` leaves may target, and for the positivity argument of `positiv` leaves (Section 3.3, p. 5). Inference: this step is a design rule drawn from those leaf types, not a quoted instruction.
4. Audit the source solver's constraints against this definition before claiming equivalence (Finding 1, Section 6, p. 8).

The paper reports: “PhysicsCheck’s Z3 encoding asserts cross(vj , vi ) ̸= 0 for all pairs i ̸= j, making pairwise ray-distinctness part of its embeddability notion.” (Finding 1, p. 8). Inference: a Verus specification for a graph or data structure must include non-aliasing and nonzero obligations explicitly; proving only the local algebraic equations can accept a degenerate object.

Verus form (inference)

Inference: encode a realization as ghost vectors and contracts requiring nonzero values, orthogonality for each edge, and a pairwise distinct-ray predicate. Prove non-embeddability by a `proof fn` that derives `false` from a checked certificate. The certificate checker can be executable, but its soundness theorem must connect acceptance to the semantic predicate. Verus cannot directly reproduce Lean's real algebra without a suitable modeled field and arithmetic lemmas.

## technique 2: WLOG anchors and propagation schedules

what it is and when to use

Use rotational symmetry and per-vertex scaling to normalize an anchor triad or edge, then derive every vertex vector as a polynomial in a small parameter set. This converts a geometric existence problem into a finite polynomial case analysis.

how to do it

1. For a graph with an orthogonal triangle, anchor its vertices to `(e1,e2,e3)`; for a triangle-free graph, anchor an edge to `(e1,e2)` (Section 3.2, p. 4).
2. Replay `cross(v,u,w)` steps: assign `v := u × w` when v is adjacent to both assigned vertices, and record the nonzero cross-product norm as an obligation (Section 3.2, p. 4).
3. Replay `plane(v,u,axis)` steps: set `v := s p + t q`, with `p = u × e_axis`, `q = u × p`, and record `||p||²` and `s²+t²` obligations (Section 3.2, p. 4).
4. Restrict edge-anchored plane axes to anchor-owned axes (e1, e2, never e3) so the parallel degeneracy can be discharged by injectivity against an anchor vertex (Section 3.2, p. 4).
5. Collect one dot-product polynomial per induced edge and replay inline linear eliminations with provenance naming the source polynomial (Section 3.2, p. 4).

The hidden case is substantive: “The orthoplane parametrization conceals a degenerate branch—parent vector parallel to the chosen basis vector—that must be discharged by injectivity against an anchor vertex.” (Finding 2, Section 6, pp. 8–9; Section 3.2, p. 4 says the same in other words). Inference: a Verus proof generator should record every side condition introduced by normalization or division; a tactic that drops a denominator or nonzero premise is unsound even if the main equation simplifies.

## technique 3: exact rational case-tree certificates

what it is and when to use

A certificate is a self-contained anchor, schedule, parameter list, and tree. Internal nodes split polynomial branches; leaves prove contradictions. Use this format when a search procedure can discover a proof but a small deterministic checker must validate it without a CAS or numerical tolerances.

how to do it

1. Encode polynomials as normalized monomial lists with rational coefficients.
2. At a factor split, record `p = ∏_k f_k`; the checker verifies the product identity by expansion and branches on each factor being zero (valid in an integral domain).
3. At an SOS split, record `p = Σ_k c_k m_k²` with `c_k` positive rationals; expansion verifies the identity and, over a formally real field, a vanishing sum of squares forces every summand to zero. The SOS witnesses are found offline by exact Gram-matrix LDLT decomposition, but only `(c_k, m_k)` is recorded and that discovery is not trusted.
4. Close leaves with `collide(i,j)` (two distinct vertices' vectors are provably parallel), `oblig` (an obligation polynomial or anchor basis component is identically zero), `ideal` (explicit cofactors with sum q_i p_i = g, g an obligation or pair-injectivity polynomial), or `one` (sum q_i p_i = 1, so the pool has no common zero over any field) (Section 3.3, p. 5).
5. Use a `positiv` leaf when every real point collapses some varying pair: record cofactors q_r, vertex pairs (i_l, j_l), and an SOS list (c_k, h_k) satisfying Equation (1), prod ||v_il × v_jl||² + sum c_k h_k² = sum q_r p_r, verified by expansion; at a real point of the branch the right side vanishes while the left is strictly positive (Section 3.3, p. 5).
6. Optionally restrict the certificate to a certified subgraph and lift non-embeddability to a larger graph by subgraph monotonicity (Section 3.3, p. 5).

The paper's order-10 example (graph #1) has a three-level tree: a factor split with three branches, one closing by ray collision, one by an `oblig` leaf (vertex 2 parallel to the anchor), and one an SOS split that closes by collision (Figure 1 and Section 3.4, p. 5). The positivity leaf is necessary because “some branch varieties are real-nonempty, but every real point collapses a varying vertex pair, so no single collision or ideal argument closes the branch.” (Section 3.3, p. 5).

Verus form (inference)

Inference: define a Rust certificate enum for factor, SOS, collision, obligation, ideal, one, positivity, and restriction nodes. Write an executable checker that normalizes rational polynomials and verifies identities by expansion. Prove in Verus that each accepted node preserves a semantic contradiction invariant, then prove tree recursion soundness. Use exact integer/rational encodings in the specification; do not rely on floating tolerances. The generator can remain untrusted if every generated object is replayed.

## technique 4: kernel-checked soundness and kernel-reducible verdicts

what it is and when to use

The Lean checker `Cert.check` is total and proved sound: acceptance implies no realization exists. To ensure each verdict is itself inside the trusted kernel, the authors replace non-reducible rational arithmetic and well-founded recursion with a gcd-free fraction layer and fuel-structural recursion.

how to do it

1. Implement `Cert.check` over the certificate's normalized polynomial representation (Section 4, p. 6).
2. Prove `check_sound`: if `check c = true`, any `Realization c` leads to `False` (Figure 2, p. 6).
3. Use KRat fractions with integer numerator/denominator, denominator nonzero, zero-testing by numerator, equality by cross multiplication, and sign by numerator times denominator (Section 4.2, p. 7).
4. Rewrite polynomial merging and tree traversal as fuel-structural functions; fuel exhaustion may reject but never accept (Section 4.2, p. 7).
5. Generate closed theorems such as `theorem c10_0_nonembeddable : ... := by decide` (Section 4.2, p. 7).
6. Pin each graph to an explicit edge list, replay the source binding in Python, and diff certificate transcription in CI (Section 4.2, p. 7).

The development uses toolchain Lean v4.32.0 and pinned Mathlib (Section 4, p. 6), with axiom closure `{propext, Classical.choice, Quot.sound}`, no native reduction, and no `native_decide` (Section 4.1, p. 6; Section 4.2, p. 7). Inference: the corresponding Verus design is an executable checker plus proof lemmas over the same syntax, with explicit bounds for recursion and no runtime calls to proof functions. Verus's trusted base then includes the Verus verifier, compiler, and any arithmetic model used by the checker.

## technique 5: coverage, subgraph lifting, and adversarial validation

what it measures

Table 2 records source lines, distinct graphs, replay status, and kernel theorems. Coverage is 291/291 source lines and 180/180 distinct graph theorems: order 10 has 2 lines/2 graphs, order 11 has 16/16, order 12 has 266 lines/155 graphs, and order 13 has 7/7 (Table 2, p. 7). Duplicate lines share a theorem, but line-to-graph binding is verified.

Seven order-13 certificates discharge 42 of 44 final order-22/23 candidates through general (non-induced) subgraph monotonicity; none of the 44 contains any of the 173 certified order-≤12 graphs, and the remaining two are recorded as explicit unresolved obligations (Section 5.1, p. 8). Kernel `decide` costs approximately 0.5 seconds per order-≤12 verdict and 1.8 seconds per order-13 verdict on a laptop (Section 4.2, p. 7); Table 3 (p. 8) gives the shard timings on laptop-class arm64 with Lean 4.32.0, with wall time dominated by about 76 seconds of olean loading. The extrapolated total for 173 order-≤12 certificates is about 90 seconds of CPU (Section 5.2, p. 8).

The adversarial suite mutates genuine certificates in 115 ways and requires both checkers to reject every mutant. The reported result is 115/115 rejected by both (Section 5.3, p. 8). Inference: for a Verus certificate checker, mutate branches, coefficients, normalization, leaf justifications, and source-object bindings, and report the denominator 115 (or the exact suite count) rather than only a success rate.

## findings revealed by formalization

The formalization found defects that solver output alone did not expose. Injectivity is load-bearing; an orthoplane WLOG branch was hidden; a half-ones noncolorability optimization was empirical rather than a proved lemma; and the order-12 list had 266 lines but only 155 distinct edge sets (Findings 1–2, pp. 8–9; Findings 3–4, p. 9). Most visibly, replay of pinned artifacts leaves 1 order-22 and 43 order-23 survivors, not the published “41”; classifying the 43 against the Uijlen–Westerbaan list, exactly 41 contain an order-13 minimal graph (seven distinct patterns suffice) and the two that do not match the pair in the published log (Finding 5, p. 9). The paper states that the verified chain "must carry 44 final candidates, not 42" (Finding 5, p. 9), while Section 5.1 (p. 8) says 42 of the 44 are discharged. Inference: the "41 of 43" in Finding 5 and "42 of 44" in Section 5.1 are consistent only if the one order-22 survivor also contains an order-13 minimal graph; the paper does not say so explicitly.

Inference: an agent-written verified-Rust product faces the same threat when a solver result, count, or optimization is treated as a theorem without a replayable object. Formalization should preserve discrepancies as explicit hypotheses and should strengthen a checker when a proof needs an unstated side condition. The paper's rule is operational: “whenever a proof needed a hypothesis the checker did not verify syntactically, the resolution was to strengthen the checker or report a finding—never to weaken a check or paper over a discrepancy.” (Section 6, p. 8).

## proved, measured, and trusted

Proved: certificate acceptance implies real non-embeddability under the stated realization definition; polynomial identities and tree semantics are checked exactly; theorem verdicts are kernel-reducible. Measured: database coverage, kernel timings, generator time (18 seconds of generator time for seven order-13 certificates, Section 5.1, p. 7), and adversarial rejection. Inference: what remains trusted is Lean's kernel and the three axioms, the statement of `Realization` and the deserialization semantics, the pinned source/artifact hashes, and the remaining published pipeline layers (the paper lists T1–T4 in Table 1, p. 3, as not closed here). The paper does not prove the complete ≥24 theorem: it says the work “does not yet compose a verified end-to-end bound ≥ 24 theorem” (Scope, p. 3).

Inference: in Verus, acceptance of a certificate similarly proves only the encoded theorem. Specifications, Rust/foreign code, compiler and erasure, external data, and any unmodeled numeric behavior remain outside the proof. The paper's dual independent replay is evidence against shared implementation bugs, but the two checkers still rely on the same certificate schema and semantic definition.

## techniques for the catalog

- injective realization semantics: define non-embeddability with nonzero vectors, orthogonality, and pairwise ray distinctness
- WLOG propagation: anchor a triad or edge and replay cross-product and orthoplane steps with explicit obligations
- case-tree certificates: close polynomial branches with factor, SOS, ideal, collision, obligation, one, or positivity leaves
- subgraph monotonicity: lift a certified non-embeddable subgraph to every graph containing it
- kernel-reducible checker: use exact rational arithmetic and fuel-structural recursion so verdicts reduce inside Lean's kernel
- dual replay: compare an independent exact-fraction checker with the Lean checker and bind source lines to theorems
- adversarial mutation testing: mutate certificates and require both checkers to reject every malformed object
- proof-surface audit: preserve unresolved candidates and expose hidden assumptions, count discrepancies, and empirical optimizations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Each generated theorem pins its graph to an explicit colex edge list by #guard, independently re-verified against the PhysicsCheck source files by the Python replay"): read the whole paper text (pp. 1–12) and checked every quotation, number, table value, section and page reference, and technique step against it; the tag, author names and arXiv link match the paper. Changed: the 291/180 totals (the seven order-13 graphs are inside them per Table 2, not extra); the page of the Scope quote (p. 3), Table 3 (p. 8), the 42-of-44 statement (p. 8) and the orthoplane quote (Finding 2, pp. 8–9, not Section 3.2); garbled factor/SOS split formulas; the leaf-type and positiv descriptions (vertex pairs, not norms); the order-10 example description; the trusted list (real-geometry lemmas are proved, not trusted); added the paper's 41-of-43 versus 42-of-44 inconsistency as an Inference. Not checked: the Lean development, certificates and GitHub repository (not in the paper text), the cited external works, and the PDF layout beyond the text extraction (page numbers taken from the text extraction page breaks).
