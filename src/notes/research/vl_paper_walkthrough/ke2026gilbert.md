# Towards Solving the Gilbert-Pollak Conjecture via Large Language Models
(authored by agents unless marked 🧑)
Tag: `ke2026gilbert`, [paper](https://arxiv.org/abs/2601.22365)

## problem and result

The paper uses an LLM to propose constrained geometric lemmas, translates accepted lemmas into executable verification functions, and uses exact symbolic computation to certify a lower bound for the Steiner ratio. The Gilbert–Pollak conjecture says the ratio of Steiner Minimal Tree length to Euclidean Minimum Spanning Tree length is at least √3/2≈0.866 (abstract, p. 1; §2.1, p. 2). Earlier work established 0.824 (Chung & Graham, 1985); the paper reports a certified 0.8559 (abstract, p. 1; §1, p. 2; §4, p. 8; §H.4, p. 55). The paper's own baseline, built only from classical Du & Hwang lemmas, already reached 0.8282 because of a finer topology enumeration and exact computation (Appendix D.1, p. 26; Table 2, p. 28). The LLM-driven gain is therefore 0.8282 to 0.8559 over nine steps (Table 2, p. 28).

The system does not ask an LLM to produce an end-to-end proof. It searches a structured space of two lemma families, checks their algebraic consequences with Mathematica, and composes the surviving functions into a global certificate. The authors state: “rather than relying solely on a scalar reward signal, our reflection mechanism returns mathematically structured feedback to the LLM, enabling more effective and targeted iterative refinement.” (§1, p. 2)

## technique 1: induction through splitting functions

What it is. For a point set V, remove a subset V* from a Steiner tree, reconnect the removed part through regular points, and rebuild a smaller Steiner tree on V′=V\V*. A split is τ=(V*, S−, S+, t*), where S− is removed structure, S+ is a replacement Steiner tree, and t* is a reconnection forest (§2.2, pp. 3–4; Definition 13, Appendix B.1.2, p. 16).

The inductive requirement is ΔLS/ΔLm≥ρ. The paper defines the splitting function

Fτ(w,ρ)=ρ·Lt*+LS+−LS−

and states that ρ is a valid lower bound when the maximum over w in W of the minimum over F in the split-function family F of F(w,ρ) is at most zero (Theorem 4, p. 4). The three construction steps are: “(1) Steiner Tree Pruning: Remove a subset of edges S− from the SMT”; “(2) Spanning Tree Connection: Restore connectivity between V* and the remaining points”; and “(3) Steiner Tree Reconstruction: Connect the remaining points using a new Steiner tree S+” (§2.2, p. 3).

How to apply it. Enumerate topologically valid splits; compute the length terms from edge parameters w; prove or bound each Fτ; and seek a family whose pointwise minimum is non-positive over all parameter values. Appendix F.4’s split enumeration has three phases: choose V* and incident S−, compute residual components and S+ representatives, then enumerate reconnection forests and accept a candidate when contraction produces a spanning tree (Algorithm 3, pp. 38–39). The induction rests on the Du & Hwang (1983) reduction (Lemma 14, p. 16) and on restricting attention to full Steiner trees with a base case of at most four points from Pollak (1978) (Appendix B.1.1, p. 15).

Verus form. Inference: encode a split as a Verus ghost state containing removed edges, replacement edges, and a connector forest. Use `requires` for topology and nonnegative lengths, `ensures` for the algebraic inequality, and proof lemmas to compose the reduced tree with the inductive hypothesis. The geometric SMT solver is not replaced by Verus; its result would remain a trusted specification or external oracle unless formalized.

## technique 2: verification functions and vertex certification

What it is. A verification function f upper-bounds a splitting function g and is unimodal along every coordinate-parallel line: first non-increasing, then non-decreasing (Definition 5, p. 5). Theorem 6 proves a vertex maximum property: on a bounded axis-aligned hyperrectangle H, the maximum of f occurs at a vertex. Checking f≤0 at every vertex therefore proves g≤0 throughout H (Theorem 6, p. 5; Appendix H.2.1, p. 49). The proof (Appendix C.2, pp. 20–21) shows the sublevel set of f is orthogonally convex and that an orthogonally convex set containing all vertices of H contains H (Lemma 19). Basic splitting functions with |S+|≤3 are convex in w and serve as the initial verification functions (Appendix C.3, pp. 22–23).

How to apply it. Construct f with the shape and bounding constraints; partition the parameter domain into hyperrectangles; evaluate f at each region’s vertices; and retain a region when all vertex values are non-positive. This changes an infinite pointwise check into finitely many evaluations, provided the theorem’s hypotheses hold.

Verus form. Inference: represent a bounded parameter box as a ghost datatype and prove coordinate-wise shape lemmas. A Verus `proof fn` can establish that a vertex bound implies an interval bound for a specified arithmetic function. The proof only carries over after the geometric length expressions and shape properties are specified in a Verus-supported form.

## technique 3: branch-and-bound plus binary search

What it is. The reward model computes the largest feasible ρ by binary search. Its feasibility oracle recursively partitions the unbounded parameter space W into axis-aligned boxes (§3.1, pp. 4–5; Algorithm 1, Appendix F.1, p. 36).

How to apply it.

1. Initialize the queue with orthant splits [0,1] and [1,+∞) in each coordinate (Algorithm 1, line 1, p. 36).
2. Pop a region and identify unbounded dimensions.
3. For each verification function, check monotonicity on unbounded dimensions and then check all finite vertices (Algorithm 1, lines 6–9, p. 36).
4. If no function certifies the region, split along the longest dimension (an unbounded dimension has “logical length” 1/l). An unbounded [l,+∞) dimension uses [l,2l] and [2l,+∞) (Algorithm 1, lines 10–13, p. 36; Appendix F.1 text, p. 36).
5. Return infeasible if the iteration threshold is exceeded (Algorithm 1, lines 3–4, p. 36); return feasible when the queue is exhausted (line 14). The main text states the same stopping rule as a region-number threshold and a budget (§3.1, p. 5; §H.2.2, p. 50).
6. Binary-search ρ, using the oracle as its feasibility test (§3.1, p. 5).

Verus form. Inference: encode the queue and coverage invariant in a Verus proof state; prove that subdivision preserves domain coverage and that each certified box satisfies the target inequality. Termination requires a bound on subdivisions or a separately proved well-founded measure. Verus does not make an unbounded real search terminate automatically.

## technique 4: monotonicity reduction for unbounded regions

What it is. Vertex checking applies only to bounded boxes. For an unbounded coordinate x, the paper checks that ∂Fτ/∂x≤0; the maximum then occurs at the finite lower boundary. Algorithm 2 computes a sufficient condition from three contributions: whether x is in S−, the number of connector paths using x, and whether x lies on a path in S+ (Appendix F.2, pp. 36–37).

How to apply it. Set δS− to one when the edge is removed, count Nt* connector paths, and set δS+ to one when the edge lies on a path between terminals in S+. Return true when all contributions are zero or when Nt*+δS+≤1 and δS−=1 (Algorithm 2, p. 37). Proposition 37 proves the returned condition implies the derivative is non-positive when S+ has at most three terminals or x is the f parameter (p. 37). For f>d cases, substitute f=d and verify the reduced boundary function (Appendix D.2, p. 26; Appendix H.5, p. 55). The paper applies the check conservatively: for splits with implicit regular points, only variables on which the implicit edge lengths do not depend are checked (Appendix F.3.1, p. 38; Table 3).

Verus form. Inference: use a ghost derivative bound and prove monotonicity as an arithmetic lemma over a restricted parameter domain. This is a proof of a supplied differentiable model; it does not verify floating-point implementation behavior without additional numerical assumptions.

## technique 5: two formal lemma families

The authors state that richer verification functions can be obtained from two kinds of lemmas (Theorem 20; statement in Appendix H.3.2, pp. 51–52; proof in Appendix C.2, pp. 21–22).

Trapped regular point. A Steiner spiral chain A0,…,An has 120° internal angles at each Steiner point. Type-A predicates (Lemma 7) encode intrinsic distance inequalities; Type-B predicates (Lemma 8) state sufficient projection and distance conditions that trap An inside a polygon; Theorem 9 combines them (pp. 6, 18–22, 52). To generate one, provide the LLM all Type-A and Type-B predicates, ask it to select a concise subset (typically 1–3 items), use Mathematica `Reduce` to derive the feasible region, simplify it to linear constraints, verify the implication, and output a boolean condition function plus a distance upper-bound function (§3.2.1, pp. 6–7). The prompt says: “If the result is non-linear, relax it to a linear inequality that still covers the Box.” (Appendix G.1, p. 42; also shown in §3.2.1, p. 6)

Valid four-point Steiner tree. For a convex quadrilateral and (AB)-(CD) topology, Theorem 16 requires convexity, four angle bounds at most 120°, and a diagonal intersection angle at most 120° (Appendix B.2, p. 16; Appendix H.3.2, p. 51). Lemma 17 computes its length as |UV| after 60° rotations (p. 17). The LLM translates these conditions to algebraic constraints, simplifies them to an orthogonally convex region, verifies that the region implies all validity conditions, and emits `steiner_cond` and `steiner_length` functions (§3.2.2, p. 7; Appendix H.3.3, pp. 52–53; prompt in Appendix G.2, pp. 44–46).

Verus form. Inference: encode each lemma as a pure specification predicate and prove the geometric implication with `proof fn`s. Executable Rust should calculate only quantities whose numeric model is specified; proof-only lemmas must not be called at runtime. The paper’s generated code is a candidate artifact, and the paper says its correctness comes from Mathematica and manual verification (§4, p. 8).

## technique 6: bottleneck reflection loop

What it is. After the current functions are checked, the oracle tries ρ+δ. If subregions remain uncertified, it takes their smallest axis-aligned enclosing hyperrectangle as the bottleneck region (called B⋆ in §3.3 and Ωk in Appendix H.4) and feeds its coordinate intervals to the LLM (§3.3, pp. 7–8; Appendix H.4, p. 54).

How to apply it. Evaluate the current lower bound; extract uncovered boxes; enclose them in the bottleneck box; prompt the LLM to target it; manually validate the proposed lemma; translate it into verification functions; augment the family; and rerun the feasibility test. The paper’s loop is explicitly “Evaluate,” “Reflection,” “Propose,” and “Translate” (§3.3, pp. 7–8). In Appendix E’s trajectory the bound moves 0.8282, 0.8500, 0.8502, 0.8519, 0.8536, 0.8540, 0.8542, 0.8558, 0.8559 over nine steps (Table 2, p. 28).

Evidence. Across approximately 100 rounds, more than 80% of LLM-proposed lemmas were “effective (both mathematically correct and helpful in improving the lower bound for the current step)” when instantiated as verification functions (§4, p. 8). With GPT-5 and Gemini 3 Pro, the system after roughly a dozen rounds converged to approximately 0.8559. Without the reflection bottleneck, the system failed to improve the lower bound over 10 iterative rounds (§4, p. 8). These are author-reported figures. The paper gives no count of proposed lemmas behind the 80% figure and no per-backbone breakdown.

Verus form. Inference: use failed proof obligations or counterexample regions as the reflection signal, then ask the model for a lemma over that region. The signal should identify a bounded missing case; it is not itself evidence that the generated lemma is valid.

## technique 7: dual verification and exact symbolic checking

The system uses Mathematica for exact computations and independent manual proof review. The authors write: “First, the LLM acts solely as a reasoning engine, offloading all validation tasks to Mathematica to perform exact computations.” (§4, p. 8) “Second, we performed independent manual verification of the generated proofs to confirm that the overall logical argument is sound.” (§4, p. 8) They also report that all lemmas proposed along the final trajectory were manually checked (§4, pp. 8–9). In Appendix E, Cylindrical Algebraic Decomposition (CAD) in Mathematica verifies the four-point validity conditions: quadrilateral convexity by cross products, angle conditions after conversion to the scalar-product inequality 2(u·v)+|u||v|≥0, and, via symbolic differentiation, orthogonal convexity of each defining inequality (Lemmas 31, 32, 34, 35, pp. 29–35). The trapped-point lemmas (Steps 2, 3, 6, 9) are proved by hand from Theorem 9 and Lemma 18 (pp. 28–35).

This division of labor is a formal-verification pattern. Inference: the LLM proposes; a symbolic engine discharges algebraic obligations; a human checks the mathematical interpretation; the final certificate is checked over the whole parameter space. The paper claims the 0.8559 bound has been “rigorously verified across the entire parameter space” (§4, pp. 8–9). Its final certificate is checked separately in the four cases of Appendix H.5 (p. 55), and the authors publish the certificate code for independent checking (p. 56).

Verus form. Inference: replace Mathematica with Verus proofs only when all real-number, geometry, and CAD obligations are encoded in supported theories. Otherwise treat the symbolic engine and manual review as trusted components. A Verus proof of a Rust implementation would not automatically validate the paper’s continuous geometric theorem.

## what is proved, trusted, and left open

The paper does not prove the conjectured 0.866 bound. It claims a lower bound of 0.8559 for the Steiner ratio. Inference: this claim holds only if the splitting theorem, verification-function properties, generated lemmas, and symbolic computations are all correct. The paper reports approximately 0.5M LLM tokens (about 35K per round), 4.6 hours of LLM reasoning, and roughly 11.7 hours of reward-model computation for the representative trajectory (§4, pp. 8–9). The paper says the entire effort used thousands of calls and a few hundred dollars (§1, p. 2), but it does not give a call-count denominator or a complete cost table.

The paper states its own limits. CAD scales poorly with variables and algebraic degree; the authors exclude high-complexity four-point lemmas from regimes with unbounded parameters and name interval arithmetic and sum-of-squares relaxations as lighter-weight alternatives (§6, p. 9). Four-point lemmas were verified only under f=d, so they are not used in Cases 1 and 3 (f≤d) (Appendix E, p. 28). Verification is human-in-the-loop: “The framework is therefore not fully autonomous.” (§6, p. 9) The authors name formal proof assistants such as Lean as a way to reduce the dependence on human checking (§6, p. 9).

Inference: the main trusted boundaries are Mathematica/CAD, manual lemma verification, floating-point or symbolic implementation details, the formal correspondence between geometric definitions and code, and the proof that the enumerated split family covers all required cases. 

## techniques for the catalog

- splitting induction — reduce a Steiner tree and prove a marginal length inequality for the removed and reconstructed parts
- verification functions — upper-bound splitting functions with coordinate-wise unimodal functions
- vertex maximum checking — certify bounded boxes by evaluating all vertices
- branch-and-bound feasibility — recursively partition parameter space and binary-search the best certified bound
- monotonicity reduction — collapse unbounded dimensions to finite boundaries after proving non-increasing derivatives
- structured lemma generation — search trapped-point and four-point-topology lemmas in a constrained predicate space
- bottleneck reflection — feed uncertified parameter boxes back to the lemma generator
- dual exact verification — combine Mathematica/CAD checks with independent manual proof review
- global certificate assembly — augment a finite function family and certify the final lower bound over the full domain
