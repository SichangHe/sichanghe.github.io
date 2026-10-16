# Industrial-Strength Verification of Solid State Interlocking Programs
(authored by agents unless marked 🧑)
Tag: `iliasov2021industrial`, [paper](http://arxiv.org/abs/2108.10091v2)

## result and system boundary

Inference: SafeCap verifies railway interlocking configurations as engineers already produce them. The paper's abstract reports, “In the last two years SafeCap has been successfully used to verify 26 real-world mainline interlockings, developed by different suppliers and design offices.” (abstract, p. 1) It is an industrial deployment report, not a new foundational logic.

SSI GDL resembles a procedural program and runs a loop that polls inputs, computes responses, and sends commands (section 1, pp. 2–3). SafeCap verifies the response-computation stage; generic hardware safety cases cover input/output stages (section 2, p. 5). Correctness is expressed as signalling principles, not an impossible absolute proof of collision absence. The tool verifies 55 such principles at the time of writing (section 2, p. 5).

## technique 1: domain-specific modelling and notation-preserving translation

Inference: Keep the signalling engineer's schema and GDL notations at the boundary, then translate them into a common mathematical model. SafeCap DSL is graph-oriented and extensible with plug-ins for signals, speed limits, stopping points, and other concepts (section 2, pp. 4–5). The design requirement is explicit: inputs and reports use existing industrial notation, while “formal methods” are hidden from engineers (section 2, p. 5).

Steps from the paper's process (Fig. 1, pp. 7–9):
1. prepare the schema from an electronic plan (step 0) and construct a mathematical model (step 1)
2. type the model and validate the SSI/schema pair (steps 2–3)
3. translate SSI GDL into the Generic Verification Framework (GVF) (step 4)
4. symbolically execute GVF into many simple state transitions (step 5)
5. retain metadata linking every transformation to its source schema and code (section 2, p. 9)
6. generate an engineer-readable report from violations (step 9)

The paper says, “All model transformations during steps 0-9 are traceable in both directions via meta-references created during the tool operation.” (section 2, p. 9) This traceability is a technique in its own right: findings can cite the relevant GDL fragment and plan fragment rather than exposing solver formulas.

Verus form (Inference): A Verus-based product can parse a domain DSL into Rust data structures and preserve source spans in ghost fields or external metadata. Verified transition code can then use `requires` and `ensures` over typed schema objects. The parser, importer, and report mapper remain trusted unless separately verified; source-span traceability improves review but does not prove semantic preservation.

## technique 2: inductive safety invariants and proof-obligation enumeration

Inference: Turn each signalling principle into an inductive invariant that must hold at boot and after every state update. The paper defines verification as checking whether an invariant holds before an update and after it; each conjecture is a sequent `H |- G` (section 2, pp. 5–7). One example requires point tracks to be clear whenever a point command changes; another requires all subroutes to be locked when a route is set (section 2, pp. 6–7).

Steps from the paper:
1. agree a semi-formal statement with signalling engineers, such as “for every point commanded to a new state … all point tracks are proved clear” (section 2, p. 6)
2. encode that statement as a quantified invariant over the SafeCap model (section 2, p. 6)
3. enumerate each possible state update and form a proof obligation from the prior invariant, update hypotheses, and post-state goal (section 2, p. 7)
4. discharge obligations with automated theorem proving and solving; classify unproved obligations as findings or false positives (section 2, pp. 7–8)
5. render a counterexample and its source trace in engineering notation (section 2, pp. 8–9)

The paper gives scale: with `m` safety invariants (about 50) and `n` possible updates (typically about 10,000), the number of conjectures is `m*n`; this is contrasted with about 22,000 potentially reachable states (section 2, p. 7). It reports that “less than 1 in 10,000” provable conjectures failed to prove in recent results, producing a false positive (section 2, p. 7). The denominator is provable conjectures, not all generated obligations; the paper gives no absolute count for that recent sample.

Verus form (Inference): Encode each signalling invariant as a predicate over a Rust state struct. For every transition function, put the pre-state invariant in `requires` and state preservation in `ensures`; prove a loop `invariant` for the global control loop. Quantified invariants may need ghost sets and lemmas. Verus does not provide SafeCap's domain prover or automatic enumeration, so a generator would emit transition obligations and invoke Verus per transition. Use only supported Verus constructs such as `requires`, `ensures`, `invariant`, and `proof fn`; proof functions are erased before runtime.

## technique 3: customised symbolic prover and proof tactics

Inference: Specialize the prover to the shape of railway transition models instead of using a general-purpose model checker. The authors removed SafeCap features unnecessary for SSI (animation, simulation, capacity measurement), simplified the architecture, and “replaced all its solvers and provers with a dedicated inference-based symbolic prover” (section 2, p. 4). They also built a library of proof tactics selected for project-specific structures (section 3, pp. 11–12).

Steps from the paper:
1. identify recurring SSI update patterns and signalling-principle dependencies (section 3, p. 10)
2. encode specialised inference rules and tactics for those patterns (sections 2–3, pp. 4, 11–12)
3. apply tactics across generated obligations; adjust tactics or properties when a project needs it (section 3, p. 11)
4. refine invariants to remove false positives and improve diagnostics (section 3, pp. 10–12)

Inference: This is a domain automation strategy: the state space may contain 1.5–2.5K Boolean and 100–200 integer variables, but SafeCap's proof-obligation method does not enumerate that state space (section 3, p. 11). Complexity is better predicted by maximum cyclomatic code complexity than by route or point counts (section 3, p. 11).

Verus form (Inference): A VL product can provide reusable proof lemmas for common state-update patterns and expose them through a domain library. A tactic generator can choose lemmas based on transition shape, while Verus remains the final checker. This can reduce proof effort, but the tactic library and generated preconditions are trusted engineering inputs unless independently validated.

## technique 4: industrial diagnostics and safety-case traceability

Inference: Treat reporting and deployment assumptions as part of verification, not as a separate user-interface concern. SafeCap categorizes violations as errors, vulnerabilities, intentional violations, or false positives (section 3, pp. 9–10). Manual railway and formal-methods experts interpret results and select counterexamples (section 3, p. 11).

Steps from the paper's safety-case method:
1. define the SafeCap system boundary, interfaces, environment, assumptions, and existing safety measures (section 4, p. 13)
2. maintain a hazard log; principal hazards include incorrect GDL interpretation and incorrect violation reporting (section 4, pp. 13–14)
3. trace each formal safety property to clauses in established signalling standards (section 4, p. 14)
4. when properties depend on one another, represent the argument with goal-structured notation (section 4, pp. 14–15)
5. document application constraints, including correct trackside wiring and agreement between plans and data (section 4, p. 15)
6. increase dependency on SafeCap only as the safety case is extended; current use is advisory and supplements manual checking (section 4, p. 13)

The paper states, “SafeCap is currently used in an advisory capacity, supplementing manual checking and testing processes.” (abstract, p. 1) Replacing those processes is considered a significant change requiring the European Common Safety Method for Risk Evaluation and Assessment (section 4, p. 13).

Verus form (Inference): A verified Rust product should preserve a machine-readable trace from each contract to the requirement and report. The safety case should list trusted parser, compiler, verifier, libraries, and deployment assumptions. Verus can prove transition invariants, but it cannot establish that railway wiring, hardware I/O, or the selected invariant set matches the physical railway without additional models and evidence.

## evidence and limits

Inference: Deployment evidence covers 26 UK interlockings: six trial applications found seeded and unintentional errors, while 20 were commercial applications on live projects (section 3, p. 9). The paper reports “minutes rather than weeks” for trial checking compared with manual checking, but gives no denominator for the time comparison (section 3, p. 9).

Table 1 gives three recent projects on a 16-core professional PC. Project X: 140 routes, 48 points, 83 signals, 55 invariants, 11,078 state transitions, 37 seconds, 42 GB peak RAM. Y: 64 routes, 29 points, 92 signals, 55 invariants, 4,462 transitions, 3 seconds, 4 GB. Z: 190 routes, 64 points, 84 signals, 55 invariants, 112,560 transitions, 265 seconds, 67 GB (section 3, Table 1, p. 11). These are three projects, not a statistical benchmark; the paper reports no failure percentage across all 26.

Inference: The main assumptions are that signalling standards correctly capture acceptable risk, that schema and GDL match installed equipment, and that the tool's interpretation and reporting are correct. False negatives are identified as the credible worst-case hazard in replacing manual checks (section 4, p. 13). The authors therefore keep manual processes while building the safety case.

Inference: For agent-written verified Rust, SafeCap is a high product-relevance precedent for domain-specific verification, traceability, and deployment governance. VL should reuse these patterns rather than inventing a generic verifier for every domain. The remaining risk is semantic coverage: a proof can be complete for 55 encoded invariants while a required property is absent or incorrectly formalized. A product that hides formal methods still needs explicit evidence about requirements, assumptions, and reporting.

## techniques for the catalog

- notation-preserving domain translation: import industrial schemas and programs into a common formal model with bidirectional source traceability
- inductive proof-obligation generation: express safety principles as invariants and check preservation over every generated state update
- domain-specialized automation: use a custom symbolic prover and reusable tactics tuned to recurring transition structures
- safety-case integration: trace invariants to standards, maintain hazard logs and assumptions, and stage deployment dependency
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
