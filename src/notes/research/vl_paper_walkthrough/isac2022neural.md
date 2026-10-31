# Neural Network Verification with Proof Production
(authored by agents unless marked 🧑)

Tag: `isac2022neural`, [paper](http://arxiv.org/abs/2206.00512v2)

## problem and result

The paper addresses a trust gap in search-based verification of ReLU neural networks. A verifier can report UNSAT (no input violates the safety property), yet its own implementation and floating-point arithmetic can be wrong. A SAT result carries a concrete input that can be reevaluated; an UNSAT result normally has no independently checkable witness. The authors add proof production to a Simplex-based verifier. The verifier emits a proof tree whose branches are ReLU case splits and whose leaves carry linear certificates. A small checker validates the tree without replaying the expensive search.

The paper's abstract states: “Our proof production is based on an efficient adaptation of the well-known Farkas’ lemma, combined with mechanisms for handling piecewise-linear functions and numerical precision errors.” (Abstract, PDF p. 1.) The central certificate is a Farkas vector: a linear combination of tableau equations that, under the current variable bounds, is strictly negative and therefore impossible. ReLU phases are made linear by splitting each ReLU into active and inactive children. Dynamic bound tightening is retained in compact form by storing one explanatory vector for each variable's lower and upper bound.

## technique 1: model a DNN query as LP plus piecewise-linear constraints

Use this when a feed-forward network has affine layers, ReLU (or another piecewise-linear activation), and a safety property expressible as linear input/output bounds. The paper defines a query as whether there are x and y satisfying the network equations and a property P; P generally encodes the negation of the desired safety claim. UNSAT of that query proves safety.

Steps from Sec. II (PDF pp. 2–3):

1. Introduce variables for network inputs, each affine pre-activation b, each activation output f, and network outputs.
2. Encode each affine layer as an equation, for example the toy network uses `b1 = x1 − x2`, `b2 = −2f1`, and `y = f2`.
3. Turn input and output ranges into lower and upper bounds on variables.
4. Keep each ReLU relation `f = ReLU(b)` as a piecewise-linear constraint alongside the resulting LP.
5. Invoke Simplex on the LP portion. If it finds a satisfying assignment, check whether that assignment satisfies every ReLU relation; otherwise split a ReLU phase.

The paper's example says: “The linear constraints of the network yield the linear equations b1 = x1 − x2, b2 = −2f1, and y = f2 (which we name e1, e2, and e3, respectively).” (Sec. II, PDF p. 3.) It then bounds the variables and obtains the LP shown in Fig. 2. Case splitting makes each branch linear: active adds `f = b` and `b ≥ 0`; inactive adds `b ≤ 0` and `0 ≤ f ≤ 0`.

Inference: represent the executable network as Rust functions over a fixed-point or otherwise modeled numeric type, and write `requires` for input ranges and `ensures` for the output safety relation. Inference: define mathematical `spec fn` relations for affine layers and ReLU, and prove each implementation step refines its relation. Inference: a loop over layers needs a loop `invariant` describing the current vector and the accumulated relation. Inference: the paper's LP/Simplex search is not a Verus construct; it would remain an external algorithm whose result must be connected to the Rust postcondition by a proof or a trusted contract. Inference: floating-point arithmetic cannot simply be treated as real arithmetic without an explicit model and rounding lemmas.

Evidence and limits: the formulation is exact for the stated linear bounds and piecewise-linear activations, but the paper says non-piecewise-linear functions such as sigmoid and tanh are left for future work (Sec. II, PDF p. 2). The resulting verification problem is NP-complete even for ReLU and simple linear properties (Sec. II). Exponential case trees therefore remain a performance limitation.

## technique 2: produce LP UNSAT certificates with Farkas vectors

Use this at every Simplex leaf that is declared UNSAT. The checker needs only the original tableau, current bounds, and a vector of coefficients. The vector combines rows into an equation whose maximum possible value under the bounds is negative.

Steps from Sec. IV-A (PDF pp. 4–5) and Appendices B–D:

1. Initialize the tableau from each input equation and keep a coefficient vector for every tableau row; the vector records its linear combination of original rows. (Appendix C, Theorem 4, adds that, with identity columns appended to the tableau, this vector is the last m entries of the row.)
2. Run ordinary Simplex pivots and assignment updates. Update row coefficient vectors with the same linear operations used on tableau rows.
3. When a variable has contradictory bounds, return that variable if the contradiction is explicit in the input.
4. Otherwise, when a row `xi = Σ cj xj` cannot satisfy the bounds of `xi`, return its maintained coefficient vector.
5. The checker multiplies the vector by the tableau, applies the current lower or upper bounds to each signed coefficient, and verifies that the resulting row is strictly negative for all assignments.

The paper states: “Given Lemma 1, our goal is to instrument the Simplex procedure so that whenever it returns UNSAT, we are able to produce a proof which indicates that l(xi) > u(xi) for some variable xi.” (Sec. IV-A, PDF p. 5.) Its adapted lemma says exactly one of SAT or a vector w exists such that every bounded assignment makes `wᵀ A V < 0`; the vector is the UNSAT proof.

The toy example uses `w = [−2, 1, 0, −2, 0]ᵀ`. Combining rows gives `−2x1 + 2x2 − b2 = 0`; the bounds make its largest value `−2`, proving contradiction. Inference: the checker does not need to trust the solver's pivot history, only the final vector and the equations it references. (Sec. VI describes the leaf check as confirming that the Farkas vector "does indeed lead to a contradiction when applied to the current LP".)

Inference: encode the tableau and bounds as ghost sequences or finite maps. Inference: a `spec fn` can compute a linear combination and its bound maximum. Inference: a `proof fn` can establish that the returned coefficient vector yields a strict-negative combination, with `ensures` stating the contradiction. Inference: the executable checker can recompute integer or rational combinations; the proof-only arithmetic and lemmas are erased. Inference: use `requires` to constrain dimensions and valid indices, and `ensures` to state that a certificate implies UNSAT. Inference: the paper's real-valued Farkas argument does not carry over automatically to machine floats; use exact integers/rationals or prove rounding bounds.

Evidence and limits: the certificate is checkable by elementary linear combinations and avoids division, which the paper identifies as an arithmetic-stability advantage (Sec. VI, PDF p. 7). Inference: it proves the encoded LP branch, not the correctness of the network model, the compiler, or the checker implementation.

## technique 3: retain compact proofs through dynamic bound tightening

Use this when the verifier derives tighter bounds by interval propagation. Saving a separate derivation for every intermediate bound can consume large memory. The paper stores, for every variable, one Farkas vector for its current lower bound and one for its current upper bound.

Steps from Sec. IV-B (PDF pp. 5–6; the worked example is on p. 6):

1. Distinguish ground bounds (input or branch constraints) from dynamic bounds derived during Simplex.
2. For a row `xi = Σ cj xj`, compute a new upper bound by using each positive coefficient with an upper bound and each negative coefficient with a lower bound; compute lower bounds symmetrically.
3. When a bound becomes tighter, update its stored explanatory vector by the same signed linear combination of the operands' vectors plus the coefficient vector of the row used for tightening.
4. At UNSAT, subtract the stored lower-bound vector from the stored upper-bound vector for a variable with `l′(xi) > u′(xi)`. The difference is a certificate vector for the contradiction.
5. Keep only these two vectors per variable. Theorem 3 states that they suffice to reconstruct every dynamic bound from ground bounds.

The paper explicitly motivates the representation: “In order to circumvent this issue, we propose a scheme in which we store, for each variable in the query, a single column vector that justifies its current lower bound, and another for its current upper bound.” (Sec. IV-B, PDF p. 5.) The paper says the proof "requires only O(n · m) space overall" (PDF p. 5); n is the number of variables and m the number of tableau rows (A is m×n). In the worked example, `l′(b1) = l(x1) − u(x2) = 1`; then the relation `f1 = b1` transfers that bound to f1, and `b2 = −2f1` derives `u′(b2) = −2`, contradicting the ground lower bound zero.

Inference: represent each bound as a ghost record containing a numeric bound and a coefficient sequence. Inference: prove a lemma that the sequence's linear combination equals the bound derivation, then maintain that lemma whenever a bound is tightened. Inference: a loop over propagation steps uses an `invariant` tying every stored vector to its bound. Inference: at the end, a `proof fn` proves that upper minus lower is negative. Inference: this is a ghost proof-data structure; an executable checker may store compact vectors, while Verus proves the update equations. Inference: the paper's asymptotic bound assumes dense vectors and exact arithmetic; actual Rust representation and overflow must be specified.

Evidence and limits: Theorem 3 and its constructive appendix provide the mathematical justification. The method covers interval propagation and linear Simplex rows. More complex nonlinear deductions need the next technique's explicit lemmas.

## technique 4: represent ReLU search as a proof tree

Use this for the full DNN query. Every solver case split becomes an internal tree node, and every branch inherits its ancestor constraints. Every leaf must contain a linear UNSAT certificate.

Steps from Sec. III and Sec. V-A (PDF pp. 3–4 and 6–7):

1. Create a root node containing the LP and all piecewise-linear relations.
2. When splitting `f = ReLU(b)`, create an active child with `f = b, b ≥ 0` and an inactive child with `b ≤ 0, 0 ≤ f ≤ 0`.
3. Treat newly added branch constraints as ground bounds for that child; reset their explanatory vectors to zero. Inherit dynamic bounds and their explanations from the parent.
4. Continue Simplex, bound tightening, and further splits in each child.
5. Mark each leaf with either a direct contradictory-bound symbol or a Farkas vector. The root is UNSAT only when every leaf is certified.

The paper summarizes the structure: “Within the proof tree, internal nodes will correspond to case splits, whereas each leaf node will contain a proof of unsatisfiability based on all splits performed on the path between itself and the root.” (Sec. III, PDF p. 3.) Its Fig. 3 (PDF p. 4) follows the toy query: the inactive v2 branch contradicts `f2 ≥ 0.25` with `f2 = 0`; the active-active branch obtains the Farkas vector `[-2, 1, 0, -2, 0]ᵀ`.

Inference: define a ghost inductive tree with branch constraints and leaf certificates. Inference: a recursive `proof fn` can establish that every certified leaf contradicts the constraints accumulated along its path, then conclude root UNSAT. Inference: use `ensures` for the recursive soundness claim and `invariant` for any iterative tree traversal. Inference: Rust's ownership can ensure each node is visited once, but the paper's tree search and backtracking remain executable logic whose certificate must be checked. Inference: a Verus proof over a bounded tree is feasible; an unbounded recursive search requires a termination measure and bounded data representation.

Evidence and limits: soundness follows if every leaf certificate and every branch encoding is checked. The paper says the search tree "can be exponential in the number of ReLU constraints" (Sec. II, PDF p. 3). Inference: proof production therefore does not remove the underlying search complexity. The implementation left Marabou's preprocessing unsupported (run before proof production starts) and ran with uninstrumented bound-propagation components turned off (Sec. VII, PDF p. 8); the conclusion lists preprocessing and additional abstract-interpretation steps as future work (Sec. IX). Inference: steps that are not instrumented cannot be covered by the certificate.

## technique 5: certify nonlinear bound deductions as lemmas

Use this when a bound tightening cannot be represented as a linear combination of tableau equations. For ReLU, the relation itself implies inequalities such as `b ≤ f`; applying a tighter bound on f can tighten b.

Steps from Sec. V-B (PDF p. 7):

1. Classify a deduction as Farkas-explainable or nonlinear.
2. For an explainable deduction, update the variable's stored vector as in technique 3.
3. For a nonlinear deduction, add a lemma to the current proof node. Record the rule name and Farkas vectors for all bounds used by the rule.
4. Introduce the deduced bound as a ground bound for subsequent certificates.
5. Have the checker verify that the rule is in a fixed permitted-rule list and that every premise vector is valid.

The paper gives the concrete rule: “For example, if f = ReLU(b) and u′(f) = 5 causes a bound tightening u′(b) = 5, then this new bound u′(b) = 5 is stored as a lemma.” (Sec. V-B, PDF p. 7.) The lemma stores the Farkas vector for `u′(f) = 5` and the rule `u′(b) ≤ u′(f)`.

Inference: define a finite enum of permitted deduction rules and a proof function for each rule, with `requires` expressing its premises and `ensures` expressing the new bound. Inference: store the rule and premise certificates in ghost data; a checker matches the enum and recomputes the rule. Inference: do not make a `proof fn` part of runtime control flow. Inference: the precise ReLU inequalities and numeric domains need explicit specifications.

Evidence and limits: the paper says the allowed tightening rules "must be agreed upon beforehand and provided to the checker" (Sec. V-B). Inference: the checker therefore trusts that rule set and its implementation, and a missing or incorrectly instrumented rule is outside the certificate. The authors report that, due to time restrictions, they did not instrument all of Marabou's bound-propagation components and ran the experiments with the unsupported components turned off (Sec. VII, PDF p. 8).

## technique 6: check certificates and recover from numerical failures

Use a separate checker after the search. It first validates the root query, then traverses the proof tree depth-first, maintaining equations and bounds. At each leaf it checks that the vector's linear combination is negative. This checker uses no division, reducing numerical instability.

If a leaf certificate fails, re-solve the query stored in that leaf with an external SMT solver, which the paper says typically uses sound arithmetic and is generally more reliable (Sec. VI, PDF p. 7). The authors use cvc5 (Sec. VII); the paper says that if a proof-producing SMT solver is used, its proof could replace the incorrect proof in the tree.

The checking procedure is stated directly: “The process of checking a proof certificate is thus much simpler than verifying a DNN using modern approaches, as it consists primarily of traversing a tree and computing linear combinations of the tableau’s columns.” (Sec. VI, PDF p. 7.) The paper notes there are "cases where the query is UNSAT, but only the proof produced by the verifier is flawed" (Sec. VI, PDF p. 7). It attributes failed leaves "probably" to numerical instability (Sec. VII, PDF p. 8) and only speculates about the cause for the one query with many failures.

Inference: verify the checker itself with a contract stating that accepted certificates imply UNSAT for the encoded query. Inference: keep the external SMT fallback behind an explicit trusted interface unless its proof format is parsed and checked in Verus. Inference: model the checker arithmetic exactly or add proved error bounds; accepting approximate floating-point negativity without such a bound weakens the claim.

Evidence from the evaluation (Sec. VII, PDF pp. 8–9): the benchmark has 45 ACAS Xu networks and 4 properties each, hence 180 queries. Marabou returned UNSAT on 113 queries, which are the evaluation denominator. Over 1.46 million proof-tree leaves were created and checked; checking failed for 77 leaves. All 77 corresponding leaf queries were independently shown UNSAT by cvc5 in under 20 seconds per query. Of the 113 original queries, 97 had every leaf checked successfully; the remaining 16 had at least one failed leaf. The paper reports an average proof-production overhead of 5.7% and says certification time is "non-negligible, but shorter than the time it takes to solve the queries by a factor of 66.5% on average" (Sec. VII, PDF p. 9). Inference: these averages are over the 113 UNSAT queries on which the evaluation focuses, not all 180 cases; the text does not state the denominator explicitly, and the meaning of "by a factor of 66.5%" is ambiguous.

The paper's implementation caveat is material: preprocessing was unsupported but run before proof production, and uninstrumented propagation components were disabled. Thus the measured artifact covers the instrumented Marabou path, not every production configuration.

## what is proved, trusted, and left open

Inference: the checker establishes that the encoded LP/ReLU query is UNSAT when it accepts every branch, vector, and lemma. The Simplex solver, proof producer, cvc5 recovery path, Rust/C++ implementation, arithmetic model, DNN weights, property encoding, and checker itself remain trusted to varying degrees. The paper proposes treating the checker as trusted code, "as is commonly done" (Sec. VI); a Verus implementation could reduce trust in that checker but would still need specifications for the numeric model and external components.

The contribution is not a proof that a DNN is safe in the physical world. It is a checkable proof that a particular mathematical query has no satisfying assignment.

Inference: a generic search-plus-certificate-checker architecture, per-variable lower/upper explanatory vectors, and branch proof trees are already explicit in this paper. Inference: new work should measure these ideas on Verus programs or integrate them with Verus’s existing `requires`, `ensures`, `invariant`, `spec fn`, and `proof fn` discipline rather than presenting them as novel algorithms.

## techniques for the catalog

- LP-plus-piecewise encoding — express a DNN safety query as affine equations, bounds, and piecewise-linear activation constraints
- Farkas leaf certificates — attach a coefficient vector whose bounded linear combination is strictly negative to each Simplex UNSAT leaf
- compact dynamic-bound proofs — maintain one explanatory vector per variable bound and derive the final contradiction from their difference
- ReLU proof trees — mirror each activation phase split in a certificate tree and require every leaf to be UNSAT
- nonlinear tightening lemmas — record permitted ReLU deduction rules with premise certificates when Farkas vectors do not suffice
- independent checking and fallback — traverse certificates with stable arithmetic and re-solve failed leaves using a sound SMT solver
