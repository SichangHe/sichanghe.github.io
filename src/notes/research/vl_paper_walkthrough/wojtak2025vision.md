# Vision: An Extensible Methodology for Formal Software Verification in Microservice Systems
(authored by agents unless marked 🧑)
Tag: `wojtak2025vision`, [paper](https://arxiv.org/abs/2509.02860)

## what the paper proposes
Vision proposes reconstructing microservice source repositories into an intermediate mathematical model, deriving SMT constraints for multiple concerns, and asking a solver to verify the current system or propose changes. The abstract states: “We propose a novel methodology that statically reconstructs microservice source code into a formal system model.” (abstract, p.1) The paper formally defines architecture constraints and sketches authorization extensions. Its conclusion states: “For example, our methodology does not test functionality.” (sec. VI, p.6) It does not evaluate Rust or Verus. The worked example manually encodes three of TrainTicket's 45 services, with 21, 8, and 7 endpoints (36 total) and eight connections listed in Table II (sec. IV-A.2, p.5). It is not an empirical evaluation of an implemented extraction or repair tool.

## technique: source-to-intermediate-model extraction
What it is: use static analysis, such as abstract syntax tree traversal or pattern matching, to build `S = (M, E, E_parent, G, …)`. `M` is the set of services, `E` endpoints, `E_parent` maps each endpoint to its parent service, and `G ⊆ E×E` is the directed remote-call graph. Extensions add endpoint ordering, data entities, data accesses, operations, roles, and permitted-role maps (sec. III-A, pp.2–3).

Inference: When to use it: use this when cross-service properties are easier to state over a global graph than over individual source files. Add model attributes only when a concern needs them.

How: (1) identify services from project structure, manifests, and build files; (2) identify endpoints from REST controller definitions and route annotations or decorators; (3) map each endpoint to its service using controller location; (4) traverse the AST to connect endpoints to framework-specific REST calls; (5) extend the model with fields needed by other concerns. Table I supplies these extraction sources; endpoint ordering is supplied by the solver rather than extracted (sec. III-A, pp.2–3; sec. IV-A.1, Table I, p.5). Inference: preserve a trace from each extracted fact to its source. The authors caution: “the model will only be as accurate as the static analysis that extracts information from the source code.” (sec. IV-A.1, p.5)

Inference: Verus form: represent the extracted graph as ghost state or immutable `Map`/`Set` values and define `spec fn` predicates for architecture rules. Use `requires` for extraction assumptions and graph well-formedness. Verus proofs over this graph would remain conditional on extraction correctness; they would not establish that the parser found every possible call.

Evidence and limits: the authors manually encode the selected TrainTicket subset rather than measure an extractor's recall (sec. IV-A.2, p.5). They acknowledge that “it is difficult, if not impossible, to generate an exact call graph.” (sec. IV-A.1, p.5) Extraction tools generally need to target particular languages, frameworks, or libraries. Conditional calls are included as possible edges; the model does not retain their conditions unless extended (sec. III-A.1, p.3).

## technique: generate reusable SMT constraints
What it is: traverse the intermediate model to generate constraints for each concern, then combine them into a unified SMT constraint set. The three formally defined architecture examples prohibit intraservice remote calls, limit hub-like dependencies, and prohibit cycles. Authorization constraints are proposed but not formally defined (sec. III-B, p.4).

Inference: When to use it: use separate constraints when multiple concerns share model facts but have different repair variables. Fix facts that should not change during repair.

How: (1) define concern constraints over the model; (2) hold variables constant through explicit equalities or constraint generation that assumes their observed values; (3) for the architecture and security examples, allow changes to `G` and endpoint role sets; (4) combine the constraints; (5) supply them to an SMT solver such as Z3 or CVC5 (sec. III, p.2; secs. III-B–C, p.4). Only existing graph edges may be removed; the solver may not add edges. For each edge, the intraservice constraint requires different endpoint parents. The cycle constraint requires integer orders satisfying `L[e] < L[e′]` for every edge `e→e′`.

The hub formula and its explanation disagree. Section III-B.2 (p.4) prints the sum of inbound and outbound connection indicators for each service as `> τ`. Section IV-B.2 (p.6), Lemma 3, instead says the sum “is less than τ”, and Theorem 2 says no service can have a sum “that is greater than the threshold τ”. Inference: an implementation must resolve both the inequality direction and whether equality is permitted; the printed formula should not be treated as a verified upper bound.

Inference: Verus form: encode these as pure `spec fn` predicates over finite sequences or maps and prove lemmas with `proof fn`. Acyclicity can use a ranking function whose value strictly increases along each edge. Treat optimizer proposals as inputs requiring separate verification.

Evidence and limits: Section IV-B (p.6) presents Theorems 1–3 for cross-service calls, hub limits, and acyclicity. Inference: the hub proof does not establish the stated upper bound for the printed `> τ` formula. The paper reports no measured runtime, solver time, extraction precision, or repair success rate; comparisons and scaling experiments remain future work (sec. V, p.6).

## technique: verify or optimize repairs with an SMT solver
What it is: verify the observed system by fixing its variables to their actual values; if it fails the constraints, use an optimizer to find values satisfying them while minimizing changes. Section III-C (p.4) describes “an objective function that minimizes the number of changes that made to the existing microservice system.”

Inference: When to use it: use this when developers need candidate changes after a violation, but inspect suggestions because the objective lacks domain context.

How: (1) constrain variables to match the actual system and check satisfiability; (2) if the current system fails, solve the original constraint system with permitted variables free; (3) minimize the number of changes (sec. III-C, p.4). Inference: translate an accepted proposal into source edits, then rerun extraction and verification. The paper does not demonstrate automatic source patching or this validation loop. It warns that minimizing changes can suggest allowing regular users to access an admin-only endpoint, and presents suggested locations as starting points for developer investigation.

Inference: Verus form: use the optimizer to propose a patch, then rerun Verus on the patched Rust with explicit contracts and invariants. The SMT repair model does not itself prove implementation behavior.

## what remains trusted and threat to VL
The paper's claimed connection between model proofs and the actual system depends on extraction accuracy (sec. IV-A.1, p.5; sec. IV-B, p.6). Inference: applying this approach requires trusting the extractor, solver, selected rules, and thresholds, and checking that source changes implement the proposed model changes. Section V (p.6) leaves comparison with existing methods, scalability, and additional concerns as research questions. Section III-C (pp.4–5) suggests solving concerns separately if their combined constraint set becomes intractable. Inference: that fallback loses assurance that one repair satisfies every concern simultaneously. For VL's distributed Rust systems, the graph model could complement functional Verus proofs, but this paper supplies no measured threat reduction or Rust validation. Reuse model traceability and validate candidate repairs; do not infer source-level correctness from an unverified extractor.

## techniques for the catalog
- intermediate graph extraction — reconstruct services, endpoints, ownership, and calls from source repositories
- concern-specific model extension — add ordering, data, access, role, and operation fields as needed
- SMT constraint generation — combine architecture constraints and proposed authorization extensions in one model
- ranking-function cycle check — require a strict integer order along every edge
- solver-backed repair proposals — verify observed facts, then minimize changes for developer investigation

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We can create a verifier by taking a constraint system and holding all variables constant via constraints that assert the variables match the actual state of the microservice system."): checked all paper text, study quotations, counts, section and page references, model definitions, technique steps, and evaluation limits; changed the link to the paper's arXiv identifier, recorded the hub-inequality inconsistency, removed unsupported extraction claims, and marked added implementation and Verus advice as Inference; did not check cited works, TrainTicket source, tool execution, or empirical correctness.
