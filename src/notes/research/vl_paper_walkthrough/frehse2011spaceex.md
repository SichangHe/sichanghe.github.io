# SpaceEx: Scalable Verification of Hybrid Systems
(authored by agents unless marked 🧑)
Tag: `frehse2011spaceex`, [paper](https://doi.org/10.1007/978-3-642-22110-1_30)

Link provenance: link from the fetch record.

## model and reachability

SpaceEx computes an over-approximation of reachable states for hybrid automata with piecewise affine dynamics and nondeterministic inputs. A state combines a discrete location and a real vector. Each location has an invariant and a differential equation `dx/dt = Ax + u(t)`, with `u(t)` in a closed, bounded convex set `U`. A transition has a guard and assignment `x' = Rx + w`, with `w` in a closed, bounded convex set `W` (section 2.1, pp. 381–382).

Apply this technique by defining the locations, initial states, invariants, flows, guards, assignments, and transition labels. Compute `R0 = postc(Init)` and `Rk+1 = Rk ∪ postc(postd(Rk))`. Here `postd` gives states reached by one discrete transition, and `postc` gives states reached by time elapse (section 2.2, p. 382). The paper states: “Our reachability algorithm is a classical fixed-point computation that operates on symbolic states.” A symbolic state pairs a location with a convex continuous set. Inference: an over-approximate fixed point excluding an unsafe region proves that region unreachable in the model; reaching that region in the approximation can be a false alarm.

Nonlinear hybridization is background work cited in the introduction (p. 380), not an implemented nonlinear feature established by this paper. The presented algorithm analyzes the affine model above.

## support functions and template polyhedra

For a closed, bounded set `S`, its support function is `ρ(l,S) = max(x in S) l·x`. For convex sets it is an exact representation. The algorithm computes linear maps by transforming the queried direction, Minkowski sums by adding support values, and convex hulls by taking their maximum (section 2.3, pp. 382–383). The implementation represents support functions as function objects that can compute values for any direction (p. 383).

Intersection and containment are harder in that representation. For these operations, use a template polyhedron, defined by a finite set of directions `D` and inequalities `l·x ≤ b_l`. Convert a set to its template hull by evaluating its support function in those directions. SpaceEx considers box, octagonal, and approximately uniform directions. Changing to this representation loses information about other directions, so conversion is delayed until needed (p. 383). The paper states: “By switching representations only when necessary (data-dependently) we remain as precise as possible.”

Inference: this is useful when the representation best suited to propagation is poor for intersection. A verified implementation must prove that each representation change contains the previous set, rather than assume that a finite direction sample is exact.

## flowpipe propagation and improved approximation

A flowpipe is a sequence of convex sets covering states reached over successive time intervals. For arbitrary positive steps `δk`, let `tk` be their cumulative time. Two approximation models cover the initial interval and the input contribution: `Reach[0,δ](X0) ⊆ Ω[0,δ](X0,U)` and `Reach[δ,δ]({0}) ⊆ Ψδ(U)` (section 3, p. 384). Starting with `Ψ0 = {0}`, propagate

- `Ψ(k+1) = Ψk ⊕ exp(A tk) Ψδk(U)`
- `Ωk = exp(A tk) Ω[0,δk](X0,U) ⊕ Ψk`

Proposition 1 establishes that their union covers reachability through the sum of the time steps. This is a containment result, not equality with the reachable set.

The improved model starts with `(1−λ)X0 ⊕ λ exp(Aδ)X0 ⊕ λδU`, where `λ` is normalized time. It adds the intersection of the forward interpolation-error box scaled by `λ` and the backward box scaled by `1−λ`, plus the input-error box scaled by `λ²`. It then takes the convex hull over `λ` in `[0,1]` (Lemma 3, pp. 385–386). Symmetric interval hulls and matrix functions `Φ1`, `Φ2` bound the error component by component. These matrix functions can be obtained from a block matrix exponential when `A` is singular. Support evaluation then reduces to maximizing a piecewise quadratic function in one variable on `[0,1]` (p. 387). The improvement over the earlier norm-based model is strict for the infinity norm; the authors do not claim dominance for every norm (p. 385).

To account for location invariants, stop when a segment is entirely outside the invariant and intersect computed segments with it. Invariant facet normals are automatically included among template directions. This can retain trajectories that an invariant would have blocked earlier, so it may add over-approximation (pp. 383–384).

## variable time steps with accumulated error

The error measure is the difference between computed and reachable-set support values in a selected direction, maximized over flowpipe segments. It measures uncertainty for linear constraints in that direction and does not capture all error introduced by replacing a nonconvex set with a convex one (section 3.2, p. 387).

Apply the adaptation procedure as follows (pp. 388–389):

1. Split a requested directional error tolerance between the accumulated input sequence and the interval approximation. A coarse preliminary computation can guide this split
2. Compute the input sequence first, constraining its cumulative error by a linearly increasing share of the input budget
3. Choose each input time step by dichotomic search, reusing already evaluated matrices and sets where possible
4. Compute the interval sequence afterward, choosing steps to keep its error plus accumulated input error within the total tolerance
5. Combine the sequences on the interval sequence's time grid, computing missing input values from the preceding input point without recomputing the whole sequence

This controls directional support-value error since the start of the current continuous evolution. The paper explains: “In our error calculation, we do not bound the error introduced at each step, but the overall error introduced since the beginning of the current continuous evolution.”

## transition successors and clustering

For a transition with guard `G` and target invariant `I+`, compute `PostAsgn(X ∩ G) ∩ I+` (section 4, p. 389). Intersect on a template hull; if guard normals are template directions, take minima of the corresponding coefficients. An affine nondeterministic assignment gives `RX ⊕ W`. For invertible deterministic assignments, the exact polyhedral image is efficient (p. 390).

Each segment can spawn a successor flowpipe. To limit growth, process the sets in order, adding the next set to the current hull while their support-value spread in every template direction is at most a chosen fraction `c` of the spread across all original sets. For sets `P1,…,Pz`, the spread in direction `l` is `max_i ρ(l,Pi) − min_i ρ(l,Pi)` (equation 20, p. 390). The paper considers template hulls, which are fast but coarser, and convex hulls, which are more precise but slower. They can be combined. In the eight-variable oscillator example, 57 sets can take the first transition; combined template clustering `cTH = 0.3` and convex clustering `cCH = 1` takes 3.64 seconds without a noticeable accuracy loss in that example (p. 390). Inference: this runtime and accuracy observation does not establish exactness.

## evidence, limits, and VeruLaw use

Table 1 reports a full fixed-point computation for a 198-variable filtered oscillator with box constraints: 7,822.5 seconds, 511 MB, and 57 iterations (p. 391). Its dynamics are only weakly coupled. The helicopter example combines an eight-dimensional plant and a twenty-dimensional controller; Tables 2–3 compare approximation models and time steps (pp. 392–393). At requested error 0.1, the new variable-step method takes 2,943 steps and 31.2 seconds, versus 3,418 steps and 26.6 seconds for an ideal fixed step. Thus fewer steps do not always mean less runtime.

Proofs are supplied in a separately linked appendix (p. 381); that appendix is not part of the extracted paper checked here. Experiments illustrate scalability rather than prove termination or practical efficiency for arbitrary hybrid systems. The authors identify automatic selection of suitable template directions as further research (p. 394).

Inference: for VeruLaw, the reusable ideas are containment invariants, delayed representation conversion, accumulated error budgets, and explicit precision/performance tradeoffs. A Verus implementation could specify set membership and prove preservation of containment across propagation, conversion, intersection, and clustering. Continuous mathematics, matrix exponentials, numerical error, and model-to-controller correspondence require separate justification. This paper supplies neither a Rust implementation nor Verus proofs.

## techniques for the catalog

- affine hybrid automata: combine discrete transitions with continuous affine dynamics and bounded convex inputs
- fixed-point reachability: alternate continuous and discrete successor computations
- mixed set representations: propagate with support functions and intersect with template polyhedra
- interpolation error bounds: intersect forward and backward approximation errors
- accumulated error adaptation: compute input and interval sequences with separate time grids and shared error tolerance
- transition clustering: replace groups of successor sets by template or convex hulls to reduce flowpipe growth

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "In our error calculation, we do not bound the error introduced at each step, but the overall error introduced since the beginning of the current continuous evolution."): read the complete paper and study; checked quotations, model assumptions, technique steps, numbers, section and printed-page references, and catalog entries; corrected transition-label terminology, completed a quotation, clarified the interpolation and clustering steps, marked an accuracy conclusion as inference, removed prior-edit history, and recorded link provenance; did not check the separate proof appendix, cited works, implementation, reproduce experiments, or independently verify the fetch-record link.
