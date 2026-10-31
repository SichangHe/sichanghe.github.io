# Formal Verification of Station Keeping Maneuvers for a Planar Autonomous Hybrid System
(authored by agents unless marked 🧑)
Tag: `martin2017station`, [paper](https://doi.org/10.4204/EPTCS.257.9)

## result and model

Inference: The paper verifies a planar Dubins vehicle whose heading controller should reach and remain near a station. The authors state, “We formally verify a hybrid control law designed to perform a station keeping maneuver for a planar vehicle.” (abstract, p. 91) The abstract adds: “We use the theorem prover Keymaera X to discharge some of the generated proof obligations.” The two obligations are reachability (finite-time arrival) and safety (remaining in the station region). The control law is taken from Jaulin [8] (section 1, p. 91). The plant uses position and heading, transformed to polar variables `(d, ϕ, α)`; the control is `u = 1` when `cos(ϕ) ≤ √2/2`, and `u = −sin(ϕ)` otherwise (section 2, pp. 92–93).

## technique 1: polynomial abstraction and Darboux invariant generation

Inference: Replace transcendental sine and cosine with algebraic state variables, then search for polynomial invariants. The paper introduces `g = cos(ϕ)`, `h = sin(ϕ)`, and `e = 1/d`, yielding polynomial dynamics (4). It warns that initial values must respect these meanings: “For the abstraction to be precise enough, one has to respect those functions initially,” (section 3, pp. 93–94; the sentence continues on p. 94)

Steps from the paper:
1. rewrite the polar ODE using fresh variables `g`, `h`, and `e` (section 3, p. 93)
2. preserve coherence: the initial `g`, `h` must be a real cosine and sine, and `e` the inverse of `d` (section 3, pp. 93–94); this is stated as `∆ := g²+h²=1 ∧ ed=1 ∧ d>0` (section 4, p. 96)
3. search templates of bounded-degree polynomials by deriving coefficient constraints and solving them (section 3, p. 94); the authors restricted the search to the three-dimensional `(g, h, e)` system, which is a closed ODE on its own, then recovered Darboux polynomials of the five-dimensional system using the invariant `de=1` (section 3, p. 94)
4. for each control mode, compute Darboux polynomials and their cofactors; Table 1 gives `e` (cofactor `ge`) and `1+2eh` (cofactor `2ge`) for `u=1`, and `e` (cofactor `ge`) and `h` (cofactor `(e−1)g`) for `u=−h`. For `u=1` the cofactors match up to the integer factor 2, so `e` is squared to match (section 3, p. 94)
5. divide the two Darboux polynomials with the same cofactor to obtain `Vcst=(1+2eh)/e²`, equivalently `d²+2dh` under `ed=1` (section 3, p. 94)

The paper's key algebraic fact is: “One can indeed easily check that the Lie derivative of Vcst vanishes for all t, that is V̇cst = 0, as long as the control input remains equal to 1.” (section 3, p. 94) In proportional mode it derives `V̇cst = −2g(h+1)/e ≤ 0` (section 3, p. 95), using `h+1≥0` (h is a sine) and `g>√2/2` in that mode. The paper observes that `Vcst≤0` contains the equilibrium `(d, ϕ)=(1, 3π/2)` and that `d` is upper bounded by 2 on it (section 3, p. 95), and claims it is reachable from any initial condition with `d>0` and `ϕ≠0` (end of section 3, p. 95).

Verus form (Inference): Represent `d`, `g`, `h`, and `e` as real-valued state in a Verus model, with `requires d>0`, `g*g+h*h==1`, and `e*d==1`. State predicates can encode `Vcst<=0`; proof functions can establish derivative-sign lemmas for each mode. Verus does not natively integrate ODEs or provide Keymaera's differential-invariant rule, so the continuous dynamics and derivative reasoning would need a discrete-step model or trusted mathematical lemmas. This is an inference from the paper's hybrid-program proof, not a reported Verus implementation.

## technique 2: hybrid-program safety proof

Inference: Encode switching and continuous evolution as a hybrid program and prove an invariant with a box modality. Definition 3 gives `α := (Plant|u=1 & d>0 ∧ 2g≤√2 ∪ Plant|u=−h & d>0 ∧ 2g>√2)*` (section 4, p. 96). The star models any nonnegative number of control-loop iterations; the union is nondeterministic mode choice; evolution-domain constraints enforce the controller and polar-coordinate validity.

Steps from the paper:
1. define each ODE branch and its evolution domain (section 4, p. 96)
2. define the coherence condition `∆ := g²+h²=1 ∧ ed=1 ∧ d>0` (section 4, p. 96)
3. state the goal `Vcst≤0 ∧ ∆ → [α] Vcst≤0`, where the box quantifies over all runs (section 4, p. 96)
4. apply Keymaera X's differential-invariant (DI) rule to each branch; for `p≤0`, prove the Lie derivative `ṗ≤0` on the domain (section 4, Eq. (6), p. 96)
5. add `ed−1=0` to the evolution domain because Keymaera X lacks a proof rule based on the Darboux criterion, even though `de−1` is a Darboux polynomial for all inputs `u` (section 4, p. 96)

The reported reason DI succeeds is that in proportional mode `V̇cst = −2gd(h+1)` is negative since `g` is positive, `d` is positive, and `h ≥ −1` (section 4, p. 96; the paper there calls h a cosine, though h is the sine). Constant mode is covered by `V̇cst=0`. The paper describes DI as “essentially a conservative lifting of barrier certificates [13] to the boolean connectives” (section 4, p. 96). Figure 3 shows Keymaera X concluding the proof of Theorem 1 (p. 97).

Verus form (Inference): A Verus loop can model sampled controller steps with a state invariant for coherence and `Vcst≤0`; each branch uses `if` with branch-specific `requires` facts and a loop `invariant`. The proof must establish preservation after each discrete update. Continuous-time guarantees require a separate sound discretization theorem or an external ODE lemma; writing `invariant(...)` as a call or using unsupported differential rules would be incorrect Verus.

## technique 3: staging-set reachability

Inference: Prove finite-time arrival by chaining invariant staging regions and strictly decreasing progress functions. The paper explains: “The idea is to use special invariant sets, so called staging sets, that contains the initial set and from which the system can only escape to go to the target set one wants to prove reachable.” (section 5.2, p. 98)

Steps from the paper:
1. handle the singular case `ϕ=0` separately; `h=0` is invariant (a Darboux polynomial, Table 1), `ḋ=−1`, so the dynamics are defined only for `t∈[0, d0[`; at `t=d0` the polar model hits its singularity, and the paper argues `ϕ` jumps from 0 to π, switching `u` from `−h` to 1, after which the vehicle is in the generic case with small positive `d` and `ϕ=π` (section 5.1, pp. 97–98)
2. partition the generic phase space (found manually, section 5.2, p. 99) into four regions: `À` (`0<ϕ<π/4,d>0`), `Á` (`π/4≤ϕ≤7π/4,d>0,Vcst>0`), `Â` (`7π/4<ϕ<2π,d>0,Vcst>0`), and target `Ã` (`Vcst≤0`) (section 5.2, Eq. (9), p. 99). Inference: the Figure 4 caption (p. 99) says `u=1` in regions `À` and `Â` and `u=−h` in `Á`, which contradicts the lemmas (Lemma 1 uses `u=−h` in `À`; Lemma 2 uses `u=1` in `Á`) and the control law (3); the caption appears to be swapped.
3. apply the SP rule to `À→Á` with progress `p=d`, `ε=√2/2`, and invariant staging set `S=X0` (Lemma 1, p. 99)
4. apply SP to `Á→Â` with progress `p=−ϕ+7π/4`, `ε=1/2`; the premise `S → p≥0` needs the fact `(g,h)=(cos ϕ, sin ϕ)` and is done manually (Lemma 2, p. 100)
5. apply SP to `Â→Ã` with progress `p=d`, `ε=√2/2` (Lemma 3, p. 100)
6. compose Propositions 1–3 to obtain `(0<ϕ<2π ∧ ∆) → ⟨α⟩(Vcst≤0)` (Theorem 2, p. 100)

The SP rule (from Sogokon and Jackson [15]) has four premises (Eq. (8), p. 98): (i) `∃ε>0. ∀x. S → (p≥0 ∧ ṗ≤−ε)`; (ii) `X0 ∧ ¬XT ⊢ S`; (iii) `S` is invariant for the dynamics with domain `¬(H ∧ XT)`; (iv) `X0 ∨ S ⊢ H`. The paper says the first, second and fourth premises can be discharged by real quantifier elimination and that the third (invariance of `S`) is the most involved, but reducible to universal quantifier elimination via [9] (p. 100). The authors report using their own implementation of the procedure of [9] together with Reduce in Mathematica to discharge all premises except Lemma 2, where transcendental functions are involved (p. 101). SP is not yet available in Keymaera X (p. 101), so the reachability proof is not machine-checked in Keymaera X. The reachability statements use the diamond modality `⟨α⟩`, which means “at least one run leads to satisfying the post-conditions” (p. 98), and the SP rule assumes “the solution is defined for as long as needed to reach the target set” (p. 98).

Evidence and limits: The theorem proves finite reachability but no universal time bound. The paper says, “Theorem 2 tells nothing about the time required to reach the target set, only that this time is finite.” (remark 1, p. 101) A bound can be derived from `ε`; starting in region `À`, the paper says region `Á` is entered in at most `√2 d0` seconds (reading the garbled extraction as `√2 d0`; this equals `d0/(√2/2)`), with the bound's quality depending on the positive bound used for the progress function (remark 1, p. 101). The authors also note a tighter attractor `Vcst≤−1/2`, but its reachability is more involved because a trajectory may loop, there is a sliding mode at `ϕ=7π/4`, and Lambert W roots arise; they do not carry this proof in Keymaera X (remark 2, p. 101).

Verus form (Inference): Encode each staging predicate and a monotone discrete progress measure, then prove termination of a loop that moves between phases. A `decreases` clause can express a well-founded discrete measure, but real-valued ODE progress and finite-time flow require a model-specific abstraction. The staging-chain structure transfers conceptually; the SP calculus and CAD automation do not transfer as Verus constructs.

## techniques for the catalog

- Darboux invariant synthesis: polynomialize transcendental dynamics, search bounded-degree Darboux polynomials, and combine equal cofactors into invariant functions
- differential-invariant safety: encode switched ODEs as hybrid programs and prove branch Lie-derivative conditions with a differential-invariant rule
- staging-set reachability: chain invariant regions with strictly decreasing progress functions to prove eventual target entry
