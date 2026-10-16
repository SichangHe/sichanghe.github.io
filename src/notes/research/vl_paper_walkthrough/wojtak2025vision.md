# Vision: An Extensible Methodology for Formal Software Verification in Microservice Systems
(authored by agents unless marked 🧑)
Tag: `wojtak2025vision`, [paper](https://www.semanticscholar.org/paper/50c6a1ec6c89b576f6c2d5cc362a1da2f0c67520)

## what the paper proposes
Vision reconstructs microservice source repositories into an intermediate mathematical model, derives SMT constraints for several concerns, and asks a solver either to verify the current system or optimize a small set of repairs. The abstract states: “We propose a novel methodology that statically reconstructs microservice source code into a formal system model.” (abstract, p.1) The paper focuses on architecture rules and sketches authorization constraints; it does not verify functional behavior or Rust code. Its formal validation uses a representative subset of the TrainTicket benchmark: three of 45 services, with 21, 8, and 7 endpoints (36 total), and the manually constructed model trace in Table II.

## technique: source-to-intermediate-model extraction
What it is: statically traverse abstract syntax trees, project files, manifests, route annotations, and framework-specific calls to build a tuple `S = (M, E, E_parent, G, …)`. `M` is the set of services, `E` endpoints, `E_parent` maps each endpoint to its parent service, and `G ⊆ E×E` is the directed remote-call graph. Extensions add endpoint ordering, data entities, operations, roles, and permitted-role maps.

Inference: When to use it: use this when cross-service properties are easier to state over a global graph than over individual source files. Add model attributes only when a concern needs them.

How: (1) parse each repository's AST and project metadata; (2) identify services and endpoint declarations; (3) map each endpoint to its service; (4) identify framework-specific remote calls and add graph edges; (5) add concern-specific fields such as data accesses and roles; (6) preserve a trace from every model field to its extraction source. Table I maps services to project structure and manifests, endpoints to REST controllers and route annotations, parents to controller location, and graph edges to AST traversal. The authors caution: “the model will only be as accurate as the static analysis that extracts information from the source code.” (sec. IV-A.1, p.5)

Inference: Verus form: represent the extracted graph as ghost state or immutable `Map`/`Set` values and define `spec fn` predicates for architecture rules. Use `requires` to state that extraction produced a well-formed graph and `ensures` to connect each Rust service call record to its graph edge. Verus can prove graph properties after extraction; it cannot prove that a parser found every dynamic call without a separate parser correctness proof.

Evidence and limits: the paper proves extraction is possible by manually encoding the selected TrainTicket subset, not by measuring an implementation's recall. Dynamic dispatch, conditional calls, languages, frameworks, and libraries can make the graph incomplete. The model treats a conditional call as a possible edge because the listed concerns do not need path conditions.

## technique: generate reusable SMT constraints
What it is: traverse the intermediate model and emit one constraint set per concern, then combine them into a unified SMT model. The architecture examples are no intraservice remote calls, no hub-like dependency above threshold `τ`, and no cycles.

Inference: When to use it: use separate constraints when multiple concerns share model facts but have different repair variables. Keep irrelevant variables fixed so the solver cannot “repair” a concern by changing unrelated system facts.

How: (1) define a constraint over the model; (2) hold extracted facts constant by equalities; (3) leave only permitted repair variables free, such as graph edges `G` or endpoint role sets; (4) conjoin all concern constraints; (5) submit to Z3 or CVC5. For intraservice calls, emit `E_parent(e1) ≠ E_parent(e2)` for each graph edge. For hub detection, sum inbound and outbound connection indicators for each service and require the sum to be below `τ`. For cycles, give each endpoint an integer order `L` and require `L[e] < L[e′]` for every edge `e→e′`.

Inference: Verus form: encode these as pure `spec fn` predicates over finite sequences/maps and prove lemmas with `proof fn`. Acyclicity can be represented by a ranking function and an `ensures` clause that every edge decreases or increases the rank consistently. Solver optimization is outside Verus's usual executable proof workflow; treat proposed repairs as inputs that must be checked by a separate proof.

Evidence and limits: the formal section gives Theorems 1–3. Theorem 1 derives cross-service calls from the parent inequality, Theorem 2 derives the hub threshold, and Theorem 3 derives acyclicity from the strict integer ordering. These are symbolic proofs over the model; the paper reports no runtime, solver-time, precision, or repair-success denominator.

## technique: verify or optimize repairs with an independent solver
What it is: run a verifier with every model variable constrained to its observed value; if unsatisfiable, run an optimizer that minimizes changes while satisfying the concern constraints. The paper says: “an optimizer ((9) in Figure 1) such as Z3’s optimizer can take the original constraint system and solve for a set of variables that makes the system conform to the constraints.” (sec. III-C, p.4)

Inference: When to use it: use this when developers need concrete candidate edits after a violation, but inspect every suggestion because the objective lacks domain context.

How: (1) freeze all facts to the extracted system and ask the SMT solver for satisfiable/unsatisfiable; (2) on failure, unfreeze only approved change variables; (3) minimize the number of changed edges or permissions; (4) map the model back to source edits; (5) rerun extraction and verification. The paper warns that an optimizer may suggest unsafe high-level changes, such as allowing regular users to access an admin endpoint, when that satisfies a constraint cheaply.

Inference: Verus form: use the optimizer only to propose a patch. Re-run Verus on the patched Rust with explicit contracts and invariants; the SMT repair model is not a Verus proof of implementation behavior.

## what remains trusted and threat to VL
The paper proves the constraint formulas relative to the intermediate model and its extraction assumptions. Trusted elements include AST parsers, framework call recognition, model-to-source traceability, Z3/CVC5, and the choice of architecture thresholds. The authors list three future research questions about runtime/resource scaling, code coverage, and additional concerns; no empirical comparison with static or dynamic baselines is reported. Inference: the pattern is a moderate threat reduction for VL's distributed Rust systems because it can catch graph-level deployment errors, but it does not replace functional Verus proofs and is vulnerable to missed edges. VL should reuse explicit traceability and independent repair validation rather than claim source-level soundness from an unproved extractor.

## techniques for the catalog
- intermediate graph extraction — reconstruct services, endpoints, ownership, and calls from source repositories
- concern-specific model extension — add ordering, data, role, and operation fields only when a property needs them
- SMT constraint generation — derive reusable architecture and authorization formulas from one model
- ranking-function cycle check — forbid cycles by requiring a strict integer order along every edge
- solver-backed repair — freeze observed facts, optimize approved edits, and re-verify the resulting source

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
