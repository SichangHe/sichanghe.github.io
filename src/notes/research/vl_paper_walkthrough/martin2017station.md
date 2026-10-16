# Formal Verification of Station Keeping Maneuvers for a Planar Autonomous Hybrid System
(authored by agents unless marked 🧑)
Tag: `martin2017station`, [paper](https://doi.org/10.4204/eptcs.257.9)

## result and model

Inference: The paper verifies a planar Dubins vehicle whose heading controller should reach and remain near a station. The authors state, “We formally verify a hybrid control law designed to perform a station keeping maneuver for a planar vehicle.” (abstract, p. 91) The two obligations are reachability (finite-time arrival) and safety (remaining in the station region). The plant uses position and heading, transformed to polar variables `(d, ϕ, α)`; the control is `u = 1` when `cos(ϕ) ≤ √2/2`, and `u = −sin(ϕ)` otherwise (section 2, pp. 92–93).

## technique 1: polynomial abstraction and Darboux invariant generation

Inference: Replace transcendental sine and cosine with algebraic state variables, then search for polynomial invariants. The paper introduces `g = cos(ϕ)`, `h = sin(ϕ)`, and `e = 1/d`, yielding polynomial dynamics (4). It warns that initial values must respect these meanings: “For the abstraction to be precise enough, one has to respect those functions initially.” (section 3, p. 93)

Steps from the paper:
1. rewrite the polar ODE using fresh variables `g`, `h`, and `e` (section 3, p. 93)
2. preserve coherence with `g²+h²=1` and `ed=1`, and keep `d>0` (sections 3–4, pp. 93, 96)
3. search templates of bounded-degree polynomials by deriving coefficient constraints and solving them; this is the algorithmic Darboux search described in section 3 (p. 94)
4. for each control mode, compute Darboux polynomial cofactors and combine equal cofactors; Table 1 gives `e` and `1+2eh` for `u=1`, and `e` and `h` for `u=−h` (section 3, p. 94)
5. divide the matched Darboux products to obtain `Vcst=(1+2eh)/e²`, equivalently `d²+2dh` under `ed=1` (section 3, pp. 94–95)

The paper's key algebraic fact is: “One can indeed easily check that the Lie derivative of Vcst vanishes for all t, that is V̇cst = 0, as long as the control input remains equal to 1.” (section 3, p. 94) In proportional mode it derives `V̇cst = −2g(h+1)/e ≤ 0` (section 3, p. 95), using `h+1≥0` and the control-region condition on `g`.

Verus form (Inference): Represent `d`, `g`, `h`, and `e` as real-valued state in a Verus model, with `requires d>0`, `g*g+h*h==1`, and `e*d==1`. State predicates can encode `Vcst<=0`; proof functions can establish derivative-sign lemmas for each mode. Verus does not natively integrate ODEs or provide Keymaera's differential-invariant rule, so the continuous dynamics and derivative reasoning would need a discrete-step model or trusted mathematical lemmas. This is an inference from the paper's hybrid-program proof, not a reported Verus implementation.

## technique 2: hybrid-program safety proof

Inference: Encode switching and continuous evolution as a hybrid program and prove an invariant with a box modality. Definition 3 gives `α := (Plant|u=1 & d>0 ∧ 2g≤√2 ∪ Plant|u=−h & d>0 ∧ 2g>√2)*` (section 4, p. 96). The star models any nonnegative number of control-loop iterations; the union is nondeterministic mode choice; evolution-domain constraints enforce the controller and polar-coordinate validity.

Steps from the paper:
1. define each ODE branch and its evolution domain (section 4, p. 96)
2. define the coherence condition `∆ := g²+h²=1 ∧ ed=1 ∧ d>0` (section 4, p. 96)
3. state the goal `Vcst≤0 ∧ ∆ → [α] Vcst≤0`, where the box quantifies over all runs (section 4, p. 96)
4. apply Keymaera X's differential-invariant (DI) rule to each branch; for `p≤0`, prove the Lie derivative `ṗ≤0` on the domain (section 4, Eq. (6), p. 96)
5. add `ed−1=0` to the evolution domain because Keymaera X lacked a Darboux proof rule, even though the polynomial is invariant mathematically (section 4, p. 96)

The reported reason DI succeeds is that in proportional mode `V̇cst = −2gd(h+1)` is negative when `g>0`, `d>0`, and `h≥−1` (section 4, p. 96). Figure 3 shows Keymaera X concluding the proof (p. 97).

Verus form (Inference): A Verus loop can model sampled controller steps with a state invariant for coherence and `Vcst≤0`; each branch uses `if` with branch-specific `requires` facts and a loop `invariant`. The proof must establish preservation after each discrete update. Continuous-time guarantees require a separate sound discretization theorem or an external ODE lemma; writing `invariant(...)` as a call or using unsupported differential rules would be incorrect Verus.

## technique 3: staging-set reachability

Inference: Prove finite-time arrival by chaining invariant staging regions and strictly decreasing progress functions. The paper explains: “The idea is to use special invariant sets, so called staging sets, that contains the initial set and from which the system can only escape to go to the target set one wants to prove reachable.” (section 5.2, p. 98)

Steps from the paper:
1. handle the singular case `ϕ=0` separately; `h=0` is invariant, `ḋ=−1`, and the polar model reaches `d=0` in finite time, where the coordinate singularity causes a jump to the generic case (section 5.1, pp. 97–98)
2. partition the generic phase space into four regions: `À` (`0<ϕ<π/4,d>0`), `Á` (`π/4≤ϕ≤7π/4,d>0,Vcst>0`), `Â` (`7π/4<ϕ<2π,d>0,Vcst>0`), and target `Ã` (`Vcst≤0`) (section 5.2, Eq. (9), p. 99)
3. apply the SP rule to `À→Á` with progress `p=d`, `ε=√2/2`, and invariant staging set `S=X0` (Lemma 1, p. 99)
4. apply SP to `Á→Â` with progress `p=−ϕ+7π/4`, `ε=1/2`; this premise needs manual transcendental-function reasoning (Lemma 2, p. 100)
5. apply SP to `Â→Ã` with progress `p=d`, `ε=√2/2` (Lemma 3, p. 100)
6. compose Propositions 1–3 to obtain `(0<ϕ<2π ∧ ∆) → ⟨α⟩(Vcst≤0)` (Theorem 2, p. 100)

The SP rule requires four premises: initial states are in `S`, `S` is invariant until target, the progress function decreases by at least `ε`, and the target is reached when the staging condition exits (Eq. (8), p. 98). The authors report that all premises except Lemma 2 were discharged with quantifier elimination (CAD and Reduce); Lemma 2 required manual transcendental manipulation (section 5.2, p. 101). Keymaera X did not yet implement SP (p. 101).

Evidence and limits: The theorem proves finite reachability but no universal time bound. The paper says, “Theorem 2 tells nothing about the time required to reach the target set, only that this time is finite.” (remark 1, p. 101) A bound can be derived from `ε`; for region `À`, the paper gives at most `√2 d0` seconds, with quality depending on the chosen progress bound (remark 1, p. 101). The authors also note a tighter attractor `Vcst≤−1/2`, but its reachability is more involved because of looping and a sliding mode (remark 2, p. 101).

Verus form (Inference): Encode each staging predicate and a monotone discrete progress measure, then prove termination of a loop that moves between phases. A `decreases` clause can express a well-founded discrete measure, but real-valued ODE progress and finite-time flow require a model-specific abstraction. The staging-chain structure transfers conceptually; the SP calculus and CAD automation do not transfer as Verus constructs.

## trusted scope, contradictions, and VL relevance

Inference: The proof trusts the polynomial abstraction's initial coherence, Keymaera X, CAD/Reduce, and the mathematical assumptions that trajectories exist as claimed. For `ϕ>0`, the paper assumes trajectories are defined for all `t≥0` (section 5.2, p. 98). The polar model is invalid at `d=0`; the paper explicitly analyses this finite-time singularity instead of silently ignoring it.

Inference: There is no benchmark denominator or success percentage: one controller and one Dubins model are analysed, with three staging lemmas and one safety theorem. The numerical comparison is qualitative against prior interval analysis; the paper says its zero-level set “describes more accurately the behavior” than that over-approximation (section 6, p. 101), but gives no common error metric.

Inference: Threat to agent-written verified Rust is indirect and moderate. The reusable ideas are invariant synthesis, branch-specific safety proofs, and staged liveness arguments. Existing VL work should not redo generic hybrid-system calculus; it could instead use the staging pattern for protocol phases and make singularity and existence assumptions explicit. The product risk is an unsound abstraction between continuous physical behavior and discrete Rust code.

## techniques for the catalog

- Darboux invariant synthesis: polynomialize transcendental dynamics, search bounded-degree Darboux polynomials, and combine equal cofactors into invariant functions
- differential-invariant safety: encode switched ODEs as hybrid programs and prove branch Lie-derivative conditions with a differential-invariant rule
- staging-set reachability: chain invariant regions with strictly decreasing progress functions to prove eventual target entry
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
