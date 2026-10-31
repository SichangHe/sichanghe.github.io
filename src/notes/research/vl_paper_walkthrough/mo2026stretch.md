# The Stretch Factor of Planar Delaunay Triangulations Is Less Than 1.65
(authored by agents unless marked 🧑)
Tag: `mo2026stretch`, [paper](https://arxiv.org/abs/2609.07979) (arXiv id 2609.07979v3 taken from the paper text; the paper gives no DOI of its own)

## result and proof architecture

The paper proves that every specified straight-line Delaunay triangulation has stretch factor at most `33/20 = 1.65`. It improves Xia's 1.998 upper bound; the best cited lower bound is 1.5932. The proof is a pen-and-paper reduction plus a computer-assisted certificate; the paper gives no verifier code (Section 6.3: "we describe the mathematical content and omit the implementation", p. 28). It reduces shortest paths through circumdisks to a local Bellman recursion, fits a one-variable potential built from an even `C²` profile (quadratic base plus cubic B-spline correction), and certifies the resulting inequalities with exact rational Bernstein expansions and outward interval arithmetic. Section 8 (p. 30) also says a later version will improve the bound to 1.5949 ("The explicit potential and its certification will be presented in a later version of this paper."); that improvement is not proved in this version. The abstract states: “Our main idea is to measure the path against the progress it makes along the segment joining the two sites.” (abstract, p. 1). It also states: “The smallest feasible potential is the value function of that recursion, so searching for a potential becomes the problem of fitting this value function from above.” (abstract, p. 1).

Theorem 1.1 says: “Let S ⊂ R2 be a finite set of distinct points not contained in a line, and let D be any specified straight-line Delaunay triangulation of S: every triangular face of D has an open circumdisk containing no point of S.” (Theorem 1.1, p. 2). The conclusion is `st(D) ≤ 33/20 = 1.65`; Theorem 6.4 states `dD(p,q) ≤ 33/20 ||p−q||` for all sites p, q, includes arbitrary choices of the diagonals of a cocircular polygon, and its proof also gives the strict `st(D) < 33/20` (p. 27).

## technique 1: reduce Delaunay distance to a circumdisk ladder

What it is. Follow the segment `[p,q]` and list circumdisks of crossed faces. Consecutive disks overlap in a chord called a gate. The two boundary arcs between incoming and outgoing gates are rails. Rails plus gates form a weighted ladder; its shortest path `P_O` upper-bounds the Delaunay graph distance because every gate is a Delaunay edge and every rail can be replaced by no-longer Delaunay edges (Sections 1.2 and 3.1, pp. 2, 6–8).

How to apply it.

1. Fix the point pair and a specified triangulation (Section 3, p. 6).
2. Record the ordered closed circumdisks crossed by the query segment, including repeated occurrences and tangencies (Definition in Section 3.1, p. 6).
3. For each consecutive pair, record the two circle intersections and their chord gate; on every disk record upper and lower rails between cap endpoints (Section 3.1, p. 6).
4. Build the finite weighted ladder from rail arc lengths and gate chord lengths, and compute its shortest terminal-to-terminal walk `P_O` (Section 3.1, p. 6).
5. Replace each rail by a Delaunay walk of no greater length and each gate by its edge; then `dD(p,q)≤P_O` (Proposition 3.3, pp. 8–9; Lemma A.3, p. 31, which bounds each cell-boundary chord by its arc, `2r sin(η/2) ≤ rη`).

For chains crossed by a query line, the paper imposes proper disk intersection, gates straddling the line, forward-directed centers, and ordered crossings (Definition 3.1, p. 7). The crossing intervals add exactly to the Euclidean distance: “The lengths of the resulting segments add up to” `x(v) − x(u) = ||u − v||` (Equation (4), p. 7), because u and v both lie on the query line.

Verus form (Inference: this geometry paper is not about Rust or Verus). Define immutable disk, chord, arc, and ladder records as Rust datatypes. Use `spec fn` for circle membership, gate validity, rail lengths, and ladder path length; use `requires`/`ensures` to state that a rail replacement is no longer than the arc. A finite shortest-path algorithm can carry a loop `invariant` saying every discovered distance is the length of an actual ladder walk. Verus does not supply computational geometry predicates or transcendental circle arithmetic, so those specifications and arithmetic lemmas must be supplied and proved or trusted.

Evidence and limits. The reduction is proved by Lemmas A.2–A.5 and Proposition 3.3, not sampled experimentally. It assumes a finite non-collinear point set and a specified Delaunay triangulation; cocircular choices are allowed. It does not itself prove that an input graph is Delaunay unless the circumdisk conditions are established.

## technique 2: exact local shortest-path recursion

What it is. At gate `i`, retain the two shortest prefix distances `d_i^+` and `d_i^-`. Store their average (ledger) `μ_i` separately and their difference (balance) `δ_i=d_i^+−d_i^-` in the local gate state (Definition 3.2, p. 8). When a new disk is added, only its two rail lengths, new gate length, and the previous balance are needed.

How to apply it.

1. Initialize `μ_i=(d_i^+ + d_i^-)/2` and `δ_i=d_i^+−d_i^-`, observing `|δ_i|≤g_i` because the gate itself connects endpoints (Equation (5), p. 8).
2. For new upper/lower rails `α,β` and gate length `g`, update distances by the exact minima `d'⁺=min(d⁺+α,d⁻+β+g)` and `d'⁻=min(d⁻+β,d⁺+α+g)` (Lemma 4.5, Equation (8), p. 12).
3. Compute `δ'=clip[-g,g](δ+α−β)` and `μ'=μ+j`, where `j=(α+β−ω)/2` and `ω=(|δ+α−β|−g)^+` (Equations (9)–(10), pp. 13–14).
4. At termination, use the two terminal rails and take the smaller candidate, giving `P_O=μ+κ_end` (Equations (12)–(13), p. 14).

The paper justifies the recurrence with a two-edge cut: every simple path from the source to the target uses exactly one of the two rails on each disk (Lemma 4.4, p. 12). Lemma 4.8 (p. 16) shows the operations available at a state do not depend on which disk preceded it. Inference: together these are why the state needs only the disk, gate and balance, with the ledger kept separately.

Verus form (Inference). Implement the min/clip recurrence as pure `spec fn`s and prove it with `assert` lemmas split into the three cases `δ+α−β < −g`, within `[-g,g]`, and `>g`. A runtime dynamic-programming implementation can expose `ensures` that its stored pair equals the specification. Loop `invariant`s preserve `|δ|≤g` and that `μ±δ/2` are realizable path lengths. This is a suitable Verus target because the recursion is finite and algebraic.

## technique 3: Bellman potential and telescoping certificate

What it is. For a proposed stretch `U≥π/2`, define a potential `W` on gate states. Require three inequalities: initialization, each step, and termination. Each step compares added ladder cost `j` with `U` times query-line progress `Δx`; potential differences pay the excess. Summing the inequalities cancels every intermediate potential and yields `P_O≤U||u−v||` (Definition 4.6, Figure 3, Theorem 4.7, pp. 14–15).

How to apply it.

1. Select a homogeneous, isometry-invariant `W` on all admissible gate states (Definition 4.6, p. 14).
2. Check initialization `μ_1−U(x(c_1)−x(u))+W(s_1)≤0` for every first gate.
3. Check step `j_i−UΔx_i+W(s_{i+1})−W(s_i)≤0` for every state and admissible successor.
4. Check termination `κ_end−UL_+−W(s)≤0` for every terminal (Definition 4.6, p. 14).
5. Add the inequalities along a chain; all `W` terms cancel, and use the additive progress identity from Equation (4) (Theorem 4.7, p. 15).

The paper proves the converse in Appendix B: when the chain bound holds, a feasible potential exists and the Bellman value function is the pointwise smallest one (Section 1.4, p. 3; Theorem B.2). This turns proof discovery into fitting a potential from above.

Verus form (Inference). Encode `W` as a pure `spec fn` and prove the three inequalities as lemmas parameterized by state and successor. A chain-folding loop uses `invariant` to maintain the telescoping prefix inequality; the final `assert` derives the stretch bound. Verus can check rational profiles and algebraic inequalities, but it does not automatically quantify over all real geometric states or reason about arbitrary transcendental functions.

## technique 4: normalize geometry and reduce the potential to a linear program

The authors normalize radius to one and query line to `y=0`. A gate state becomes four angles `(γ,φ,θ,ψ)`: `γ = arcsin(y(o)/r)` for center height, `φ` the direction of the gate normal, `θ` with `sin θ = g/(2r)` for how much of the circle the gate cuts off, and `ψ = φ + δ/(2r)` the normalized balance (Section 5.1, pp. 17–18). The closed angular domain `C` adds boundary faces so interval certification can cover a compact set. They move between disks sharing a fixed gate (a “gate pencil”) and require the potential to be nonincreasing along that one-parameter family (Section 5.2, p. 18).

The reduction has four explicit steps: “First, invariance and homogeneity compress a gate state to four angles ranging over a compact set … Second, the disks through the outgoing gate form a one-parameter family … Third, requiring this derivative to be nonpositive controls the change of disk … Fourth, fixing the shape of the potential … makes all the conditions affine in that function and its derivative, which is the linear program.” (Section 5 opening, p. 17).

They write `W` as a fixed geometric part plus a free function `H`; the step residual `E` is affine in `U`, the profile value `w(γ)`, and derivative `w'(γ)` (Equations (22)–(24), (37)–(38), pp. 19–24). Theorem 5.7 states sufficient profile conditions and implies the global Delaunay bound. Thus an infinite-dimensional, semi-infinite linear program remains: choose one function of `γ` satisfying affine inequalities indexed by `C`.

Verus form (Inference). Represent the normalized state with bounded rational approximations only if the product accepts a discretized certificate; otherwise retain real-number specifications and prove analytic lemmas externally. Encode the affine residual as a `spec fn`; a verified checker can evaluate a rational spline and interval bounds. Sampling `C` is not a proof, so a Verus integration must consume a separately checked exhaustive certificate or formalize the interval arithmetic.

## technique 5: spline potential and exact certification

The feasible profile is the even `C²` function `w(γ) = 39/200 + (28/125)γ² + Σ λ_i B_i(|γ|/(π/2))` (Equation (41), p. 26): a quadratic base plus a correction made of seven cubic clamped B-splines on the knot vector `0,0,0,0,1/4,1/2,3/4,1,1,1,1` (Equation (39), p. 26), with `λ0 = λ1` so that evenness holds (Lemma 6.3). Theorem 6.4 fixes `ε=1/20`, `U=33/20`, and seven exact rational coefficients (Equation (42), p. 26). It proves all Theorem 5.7 conditions and hence `dD(p,q)≤1.65||p−q||` (Theorem 6.4, p. 26).

Certification is exhaustive and exact. Polynomial nonnegativity is checked using rational Bernstein coefficients; transcendental residuals are enclosed with outward-directed interval arithmetic over closed rational boxes. A box is closed when a required predicate is refuted by a strictly negative outward upper bound, when the residual has a nonpositive outward upper bound, or by one of two mean-value rules (one integrating a certified derivative sign out from a face where the residual is exactly zero, one a centered enclosure); otherwise it is bisected at its exact rational midpoint (Section 6.3, pp. 27–29). The paper states: “An exhausted queue therefore proves the property on the entire initial domain, since the union of the closed leaves is the initial box.” (Section 6.3, p. 28).

The candidate profile was found by a GPT-based multi-agent search, but the search is not the proof. It sampled the compact constraints, solved a finite floating-point LP, rationalized the result, and then ran the exhaustive exact certificate. The authors emphasize: “A sampled optimum is not a bound: the reduction is what makes the difference between the two a finite, checkable list of conditions.” (Section 7, p. 29).

Verus form (Inference). A rational B-spline and Bernstein positivity proof fit Verus's `spec fn`, `lemma`, `assert`, and `invariant` constructs. Interval arithmetic requires a verified interval datatype with sound `ensures` for every operation; transcendental enclosures would need imported, separately proved libraries. The GPT search can propose coefficients, but only the exact checker should be admitted as evidence.

## what is proved, measured, and trusted

The result is a mathematical universal bound over finite point sets and specified triangulations. The paper reports no runtime benchmark; its evidence is theorem derivations and the described exhaustive arithmetic certification, whose implementation is not included in the paper. Inference: trusted ingredients include the definitions of Delaunay triangulation, Euclidean and circle arithmetic, the exact interval/Bernstein checker, and the correctness of the transcription from the displayed spline to the checker. The GPT search, floating-point sampled optimum near 1.633, and agent-generated candidate are discovery aids, not proof evidence.

## techniques for the catalog

- Circumdisk ladder reduction — replace a Delaunay shortest path by a weighted rail-and-gate ladder generated by a query segment
- Local balance/ledger recursion — update two shortest gate distances with min and clip formulas while retaining only a local balance
- Bellman potential certificate — prove initialization, step, and termination inequalities whose potential terms telescope
- Profile linear-program reduction — normalize gate states to four angles and make residual constraints affine in one profile and its derivative
- Spline potential construction — fit an even C² cubic B-spline with exact rational coefficients at `U=33/20`
- Exact exhaustive certification — combine Bernstein positivity, outward interval arithmetic, box bisection, and boundary derivative rules
- Agent-assisted candidate search — use sampled LP optimization only to propose coefficients, then require an exact certificate for validity
