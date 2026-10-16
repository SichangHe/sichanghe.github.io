# Engineering as Code: Bringing Software Engineering Methodology to Engineering Design
(authored by agents unless marked 🧑)
Tag: `song2026engineeringcode`, [paper](https://doi.org/10.1007/s10664-023-10407-1)

## what is established

Engineering as Code (EaC) proposes a text-native source of truth for physical engineering. Its two concrete mechanisms are Assembly Definition Language (ADL) and Engineering Static Analysis (ESA). The paper's thesis is explicit: “The bottleneck is representation infrastructure, not algorithmic capability.” (section 1, PDF p. 2). The prototype piki is evidence of feasibility, not a proof that all engineering designs or physical behavior are captured.

## technique 1: separate identity, relationships and layout in ADL

what it is and when to use it

Use ADL when a design needs versioned, machine-checkable intent before geometry and simulation. ADL has three orthogonal sublanguages: PDL defines Parts, PML defines Mates and Connections, and PLL defines spatial layout (section 4, PDF pp. 10–13). The design goal is to let a change in one dimension avoid rewriting unrelated files.

how to do it

1. Define a Part Family as a typed schema with value constraints; define concrete Models with defaults and deployed Instances with overrides (section 4.3, PDF p. 10).
2. Keep layout out of Instance files and resolve `Model.defaults + Instance.overrides` against the Family schema.
3. Declare a Mate in its own YAML file with parent, child, mate type, placement and field constraints; use Connection instances for signal, energy or material flow (section 4.4, PDF p. 11).
4. Put absolute, relative or grid poses in separate PLL files; let the mating solver determine child pose where a Mate exists and use PLL for remaining degrees of freedom (section 4.5, PDF p. 12).
5. Validate each dimension incrementally and review semantic diffs: an Instance change means identity/attribute change, a Mate change means relationship change and a Layout change means position change (section 4.6, PDF p. 12).

The paper summarizes the intent as: “ADL is the declarative design representation of Engineering as Code.” (section 4, PDF p. 10). An example Mate constrains a rack-mounted server's depth, while a Connection identifies source and destination ports and cable type (section 4.4, PDF p. 11).

Verus form

Inference: ADL's Family and Instance schemas map to Rust structs and enums; Mate constraints map to `spec fn` predicates over those structs; a verified loader can use `requires` and `ensures` to establish that references resolve and values satisfy domains. Use `proof fn` lemmas for relation properties and `invariant` clauses while traversing assemblies. Inference: Verus does not validate YAML parsing or CAD geometry automatically, so parser correctness and downstream transforms need separate models or trusted implementations.

evidence and limits

The prototype uses pydantic schemas and YAML, not a formal proof assistant. Layout precision is principal-axis approximation and does not yet cover 1D continuous paths such as piping/cabling (section 4.5, PDF p. 12). Therefore ADL's separation improves checking but does not remove geometric or physical-model assumptions.

## technique 2: layered Engineering Static Analysis (ESA)

what it is and when to use it

ESA checks declarations rather than completed CAD/BIM geometry. Its layers are L0 lexical syntax, L1 schema, L2 semantic references, L3 business rules, L4a lightweight AABB geometry, L4b precise CAD geometry, L5 physical simulation and L6 expert sign-off (Table 3, PDF p. 17). The paper says, “ESA is the mechanism that makes EaC’s shift-left quality strategy executable.” (section 5, PDF p. 16)

how to do it

1. Run L0 and L1 on every commit for syntax and required-field/type validity.
2. Run L2 on pull requests for reference existence, interface compatibility and Mate consistency.
3. Run L3 for deterministic business rules such as PDU power, U-slot overlap, rack capacity and load bearing.
4. Run L4a for inexpensive AABB collision and clearance checks; send L4b precise geometry, L5 CAE/CFD and L6 professional sign-off downstream (Table 3, PDF p. 17).
5. Register rules with `@rule(rule_id, name, priority, severity)` and enable only appropriate layers for the design phase (section 5.4, PDF p. 17).
6. Return the same structured diagnostics to terminals, CI, IDEs, JUnit and GitHub Checks (section 5.6, PDF p. 18).

The paper's operational rationale is: “Just as lint and type checking cannot replace unit tests, ESA cannot replace CAE/CFD or human review.” (section 5.2, PDF p. 16). This keeps deterministic, cheap errors upstream while preserving expensive physical validation.

Verus form

Inference: implement L0–L3 checks as executable Rust functions with `requires`/`ensures`; express rule predicates as `spec fn`; prove traversal and aggregation lemmas with `proof fn`; and use loop `invariant` clauses for sums such as total power. L4a collision checks can be verified for an AABB model, but L4b–L6 remain trusted boundaries unless their solvers and human decisions are modeled. Inference: structured diagnostics should include the exact violated predicate and source object so an agent can repair a proof obligation rather than guess.

evidence and limits

In the telecom sample, piki checks 64 rules in under 200ms according to the contribution summary (PDF p. 3). The completed violation-injection experiment puts 15 known violations into correct declarations; ESA detects 15/15 (100%) with zero false positives, and all L0–L4a checks complete within 200ms on a laptop with hot cache and median of five runs (section 6.3, PDF pp. 21–22). The paper did not run a quantitative ACC comparison because seven violations are semantically unreachable from IFC geometry and inputs are heterogeneous (section 6.3.1, PDF p. 22). Inference: 15/15 is a controlled injection denominator, not a field error rate.

## technique 3: auditable waivers and CI gating

Physical rules are finite, so ESA permits authorized waivers. A waiver records rule ID, target, scope, rationale, author, approver, optional expiry, downstream verification tasks and Git audit data (Table 5, PDF p. 18). The paper states, “A waiver is not a bypass of the rule—it is a transfer of responsibility from the deterministic rule engine to higher-cost verification activities.” (section 5.5, PDF p. 18)

Steps: commit the waiver beside ADL; review it in a pull request; run downstream tasks named by the waiver; reconsider it if those tasks fail. The CI sequence is lint, parse, schema, link, rule check, artifact build and nightly regression, with blocking policies for early failures and warnings for artifact/nightly stages (Table 6, PDF p. 19). Inference: a Verus project can encode waived proof obligations as explicit assumptions with expiry metadata and require a separate proof or test task before release. Do not silently weaken `ensures`; retain the waiver as a trusted assumption.

## technique 4: violation-injection evaluation and agent benchmark design

The paper evaluates expressiveness, latency, rule coverage, detection accuracy and deliverable generation on three piki samples (section 6.1, PDF p. 20). Telecom has 42 ADL files and 30 applicable rules; modular datacenter has 38 files and 34 rules; mechanical keyboard has 29 files and 28 rules (Table 7, PDF pp. 20–21). Samples 02 and 03 passed all L2–L4a checks with 13 and 27 passes respectively (section 6.2, PDF p. 21).

SD-HWE-Bench is designed to test agents generating ADL from natural-language requirements. Its metrics are Pass@1, Pass@k, latency, requirement coverage and human sign-off; the initial domain uses discrete rack slots, algebraic constraints and enumerable interfaces to keep piki feedback near 200ms (section 6.4, PDF p. 23).

## techniques for the catalog

- orthogonal declarative representation: separate typed identity, explicit relationships and spatial layout into versioned files
- layered static analysis: gate syntax, schemas, references, business rules and lightweight geometry before expensive downstream checks
- structured waivers: record ownership, rationale, expiry and downstream verification instead of silently bypassing rules
- diagnostic CI integration: emit machine-readable failures with stage-specific blocking policies
- violation injection: evaluate detection with known semantic edits and report denominator, latency and false positives
- agent benchmark design: score pass@k, latency, requirement coverage and human sign-off on generated declarations
