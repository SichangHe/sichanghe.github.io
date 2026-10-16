# Vibe Building
(authored by agents unless marked 🧑)
Tag: `jiang2026vibe`, [paper](https://www.semanticscholar.org/paper/b0f87ca6ee664b5cef0f686e1aae1a5a886dacf5)

## what the paper builds
Vibe Building studies structural-design agents whose outputs must satisfy seismic, wind, code, and constructability constraints. PE-Loop lets an LLM propose discrete topology and section changes, while a deterministic physics engine computes constraint margins and alone accepts or rejects each candidate. The conclusion states: “The results locate reliability in who holds the verdict, not in the proposer’s strength.” (sec. 6, p.9) VB-Bench contains 3,577 physics-adjudicated buildings across six code families and 1,311 gradable tasks. The main comparison uses five systems, four LLM backbones, 260 instances, 130 topology-decision instances per system and seed, and three seeds.

## technique: margin oracle and certificate gates
What it is: turn each physical/code requirement `gj` into a signed normalized margin `ρj(θ)`, with `ρj≥0` exactly when the requirement holds. The worst margin `V(θ)=minj ρj(θ)` is the in-loop feasibility signal. A returned design is certified only when static compliance, held-out dynamic verification, and constructability all pass.

Inference: When to use it: use this whenever generated output has coupled numerical constraints and a proposer could misjudge its own result. Return per-constraint margins so repairs have a concrete target.

How: (1) define demand quantities and code limits; (2) normalize each signed difference; (3) reject zero-reference failures such as non-equilibrium before code checks; (4) evaluate every candidate; (5) record `ρ`, held-out `ρL4`, and detailing `ρbuild`; (6) accept only the conjunction. The paper defines the primary metric as certified success over an evaluation set and says: “The return of Eq. 2 is certified before it counts.” (sec. 2, p.3)

Inference: Verus form: encode each requirement as a pure `spec fn` over an abstract design and prove `ensures` that a returned design has nonnegative margins. Keep dynamic-analysis and constructability checks as separate trusted predicates unless their implementations are themselves verified. A Rust agent may propose values, but Verus should be the independent contract checker.

Evidence and limits: held-out checks use recorded ground motions and wind series never optimized in-loop. They still share the paper's physical model, so independence is partial. No claim is made that a certificate proves real-world safety beyond the modeled loads and code clauses.

## technique: physics-engine-in-the-loop proposer/adjudicator split
What it is: PE-Loop advances only when the deterministic margin oracle evaluates the candidate; the LLM changes the next candidate but never the verdict. The paper's method section states: “PE-Loop rests on one invariant: the only authority that advances a design is the deterministic margin oracle of Section 2, never the self-assessment of a language model.”

Inference: When to use it: use the split for agent-written systems where a fluent model could otherwise accept a plausible but invalid result. Keep the evaluator inaccessible to proposal text except through numerical feedback.

How: (1) parse text, sketch, or image into a massing estimate; (2) choose a topology action; (3) assemble a finite-element model; (4) run gravity, wind, and seismic analyses; (5) return the violated set and margins; (6) let the LLM select a discrete revision; (7) repeat until feasible, escalated, or budget exhausted; (8) run held-out dynamic checks and the constructability gate.

Inference: Verus form: use a separate Rust module or process whose public result is a verified margin record. The proposal module can be untrusted; acceptance should require Verus-checked postconditions over the record. The evaluator must not call model-generated proof code as evidence.

Evidence: replacing the margin oracle with an LLM judge caused 58.43% false acceptances for the same-LLM judge (49.44% self-reported PASS, 20.56% physics-verified) and 56.94% false positives for a stronger disjoint judge (40.00% accepted, 17.22% verified). The denominator is the 60 pre-registered instances in the ablation. These figures directly test verdict independence, not general LLM quality.

## technique: physics process reward with violated-set repair
What it is: use the sign and identity of violated margins as a process reward. The binary outcome is `R(θ)=1[V(θ)≥0]`; the violated set `J(θ)={j:ρj(θ)<0}` tells the next repair which constraints failed.

Inference: When to use it: use this when a sparse pass/fail reward is too weak for iterative search, but exact numerical optimization of all parameters is expensive.

How: (1) evaluate the current candidate; (2) compute `J`; (3) choose a topology or section action associated with those constraints; (4) reassemble and reevaluate; (5) retain only feasible, cheaper designs in the optional material loop. The method separates discrete decisions from one-dimensional column-side search and uses at most nine oracle calls per outer round under its stated assumptions.

Inference: Verus form: represent `J` as a ghost `Set` and prove that every returned candidate satisfies the postcondition for all elements of the set. A `while` loop needs a Verus `invariant` and a `decreases` clause for termination; the paper's search proofs do not transfer automatically to executable Rust.

Evidence and limits: with budget `B=15` and three outer rounds, PE-Loop's budget exhaustion never exceeded 6.41% across four backbones; baselines exhausted 58.19–91.81% under DeepSeek-V4-Flash. On identical 130 instances, success rose from 3.85% (light) to 73.85% (medium) to 91.54% (high). These are seed-0 rates for the stated budget tiers.

## technique: constructability projection
What it is: enforce analytic detailing constraints before simulation by projecting a candidate onto a compliant beam-depth and column-size grid, `Πbuild(θ)`. This prevents the search from spending simulator calls on designs that fail a known geometric clause.

Inference: When to use it: use it for constraints analytic in the design parameters and cheap to check exactly. Keep simulator-based constraints in the oracle.

How: (1) identify the detailing inequality; (2) clip section scales and cap the column grid; (3) evaluate the projected candidate; (4) compare with an ablation without projection. In Table 6 under DeepSeek-V4-Flash, adding `Πbuild` changed raw PASS from 91.28% to 61.54%, raised Verified PASS from 35.64% to 45.38%, and reduced concrete from 5,610.1 to 5,032.0 m³. The raw denominator is the 130 topology instances; the reported material is the corresponding mean volume.

Inference: Verus form: encode projection as a pure function and prove that its output satisfies the detailing predicate with `ensures`; then prove that simulation receives only projected designs. This can prevent vacuous “verified” results caused by unbuildable geometry, but it does not prove the physics model.

## technique: monotone one-dimensional bisection
What it is: for fixed discrete topology `θd`, search the square-column side `b` on a 45-point, 50-mm grid. Under Assumption 1, projected margin is monotone, so feasible sizes form an up-set and bisection finds the minimum feasible size.

Inference: When to use it: use this only when a design coordinate has a proved or tested monotone feasibility relation. If monotonicity fails, use the final confirmation as a feasibility check and treat minimality as unproved.

How: (1) evaluate the upper grid point; (2) if it fails, pass the violated set to the outer repair; (3) otherwise bisect the feasible/infeasible index interval; (4) confirm the candidate; (5) return PASS only after confirmation. The paper proves at most `⌈log2 45⌉=6` bisection evaluations, at most 8 for one C2 call and 9 for an outer round including probe, confirmation, and re-verification (Appendix D.5, pp.25–26).

Inference: Verus form: encode the grid index and a monotonicity lemma as `spec fn` facts; a `while` loop uses `invariant` and `decreases` to prove interval shrinkage. Do not claim minimum unless the monotonicity assumption is established for the actual model.

## technique: held-out dynamic verification
What it is: after in-loop equivalent-static analysis, run one recorded-ground-motion response history and one wind time-history analysis that never supplies optimization feedback. The paper calls this L4 and includes its margins in the certificate.

Inference: When to use it: use a held-out loading condition to catch overfitting to the in-loop load cases, while acknowledging that a shared physical model cannot detect model-form errors.

How: (1) choose a FEMA P-695 far-field record by spectral-shape misfit; (2) scale it to the site spectrum; (3) run elastic modal response history and check inter-story drift; (4) sample three wind series, rescale turbulence, run modal buffeting, and check drift and top-floor acceleration; (5) record `ρL4` and reject failures. The paper states that “Because the recorded-ground-motion condition never enters Gx, L4 is a held-out test on a loading condition unused inside the loop.” (Appendix D.10, p.28)

Inference: Verus form: model the held-out result as a separate postcondition and require it alongside the in-loop predicate. The numerical simulator and record-selection code remain trusted unless separately verified.

## techniques for the catalog
- margin oracle — normalize each physical/code demand and accept only when every margin is nonnegative
- certificate gates — require static, held-out dynamic, and constructability checks before counting success
- independent adjudicator — let a deterministic engine decide while the LLM only proposes revisions
- violated-set repair — feed failed constraint identities back as a process signal for discrete repairs
- constructability projection — enforce analytic geometry constraints before expensive simulation
