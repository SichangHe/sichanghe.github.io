# A Unit Proofing Framework for Code-level Verification: A Research Agenda
(authored by agents unless marked 🧑)
Tag: `amusuo2025unit`, [paper](https://doi.org/10.1109/icse-nier66352.2025.00013)

## contribution and scope

The paper proposes “a principled end-to-end unit proofing framework” (abstract, PDF p.1). Unit proofing decomposes a program, verifies each function with a model of its environment, repairs faulty proofs, and updates them as code changes. The paper is a research agenda plus an exploratory FreeRTOS study; its proposed tools are not yet a completed system.

## technique 1: decompose code into verifiable units

What it is: select function-sized units so bounded model checking (BMC) remains tractable while the models do not make proof work excessive. The paper states that “Unit proofing comprise four stages” (II-B, PDF p.2): decomposition; creating proofs and environment models; investigating and repairing faulty proofs; and maintenance.

How to apply it (paper’s method, II-B and IV-A, PDF pp.2,4):

1. Build a call/dependency view of the software and choose function units (II-B).
2. For each candidate unit, account for input structures, shared resources, and called or undefined functions (II-B).
3. Estimate verification time and proofing effort (open question OQ1), then split or combine units to minimize total effort while keeping each unit solvable (IV-A).
4. The proposed software decomposer estimates model complexity and verification time and may partition call graphs bottom-up; it iteratively replaces expensive functions with models (IV-B1).

Inference: in Verus, a unit can be a Rust function with a `requires`/`ensures` contract, while calls outside the unit are represented by specified functions or ghost abstractions. Verus does not automatically choose an optimal decomposition; the engineer must expose ownership, resource, and state invariants in Rust/Verus types and proof functions. The decomposition principle carries over, but CBMC’s bounded search and Verus’s contract-based proving are different back ends.

Evidence and limits: the agenda reports no implementation evaluation for the decomposer. Its rationale is a tradeoff: small units are easier to solve but increase the number of proofs and models (IV-A, PDF p.4). The threat is that a product can obtain many locally passing proofs while omitting a caller or shared-state path; the paper’s own open questions treat decomposition quality as unresolved.

## technique 2: model inputs, resources, and replaced functions

What it is: write an executable unit proof harness that supplies broad enough inputs and faithful models for interactions. Listing 1 shows `assume(valid_pointer(ipv6_str));`, assertions on `buffer`, a modeled `MODEL_get_max_len`, and a postcondition assertion (II-A, PDF p.2). BMC translates the implementation and properties to logic and checks all states within a bound.

How to apply it (II-A, II-B, III-C, IV-A/B2):

1. Specify developer properties and enable tool-generated safety checks (II-A).
2. Model every input broadly enough to include all call sites, but constrain it enough to avoid spurious behavior (III-C).
3. Replace expensive or unavailable callees with models that preserve the behaviors and safety properties relevant to the unit (III-C).
4. Model shared resources and state, including effects of caller sequences when stateful (IV-A).
5. Run the verifier and inspect reachable coverage and violations; refine assumptions and models until coverage is achieved and reported violations are resolved (IV-B2).
6. Propagate learned model assertions to components so violations identify paths that trigger defects (IV-B2).

The paper documents concrete failures. For CVE-2018-16527, the proof “incorrectly assumed the input packet always contained the header” (III-C, PDF p.3), hiding a truncated-header bug. For CVE-2018-16524, a replacement model “failed to check the pointer’s validity” (III-C, PDF p.3), so an out-of-bounds pointer was missed.

Inference: in Verus, represent input assumptions with `requires`, outputs with `ensures`, and mutable resources through Rust ownership and explicit invariants. A modeled callee should be a specification/proof abstraction whose contract is proved or explicitly trusted; do not mark the function under verification `external_body`. Verus proofs are generally unbounded relative to BMC’s chosen loop/recursion bound, but they still depend on the accuracy of contracts and abstractions.

Evidence: the authors recreated 11 FreeRTOS memory-safety CVEs from 21 total CVEs collected as of March 2024, then ran CBMC v5.95.1 (III-A/B, PDF p.3). Default proofs exposed 5/11; after repairing models and configurations, all 11 were exposed and one new high-severity CVE (CVE-2024-38373) was found (III-B/C, PDF p.3). The denominator is the 11 recreated, reproducible memory-safety cases, not all FreeRTOS bugs. Under-constrained models can create false positives; over-constrained models hide defects (IV-A).

## technique 3: validate and repair proof faults

What it is: treat a passing proof as an artifact that must be audited for enabled properties, assumptions, models, coverage, and synchronization with code. The four observed fault classes are insufficient verification properties, insufficient input modeling, insufficient function modeling, and out-of-date proofs (III-C, PDF p.3).

Steps from the paper (III-A/C and IV-A/B3):

1. Recreate a known defect by removing the fix’s input validation (III-A).
2. Execute the existing unit proof and record whether the defect is reported (III-A).
3. If it is missed, classify the cause: disabled property, over-constrained input, unsound callee model, or stale signature/proof (III-C).
4. Repair the harness/model/configuration and rerun; compare coverage and violation reports (III-A, IV-B3).
5. Build a fault taxonomy and interventions from empirical proof studies (IV-B3).
6. The proposed repairer combines fast program analysis with LLM code reasoning; the paper proposes search-based repair with LLM fallback or analysis tools enhanced by LLM insights (IV-B3).

Inference: a Verus repairer could inspect failed proof obligations, missing `requires` cases, and stale contracts, then propose lemmas or invariant changes. Any generated repair must be reverified and reviewed against the intended specification; a solver success alone does not show that the specification is adequate.

Evidence: the 5/11 versus 11/11 result demonstrates that proof-harness faults, rather than the BMC engine alone, determined defect exposure. The paper gives no precision, recall, repair-time, or LLM evaluation numbers for the proposed repairer; those remain open research.

## technique 4: maintain proofs as code evolves

What it is: detect which unit proofs become invalid when signatures or implementations change, update the affected proofs, and reverify. In CVE-2018-16525, “the vulnerable function’s signature was changed but the new signature was not propagated to the unit proof” (III-C, PDF p.3); CBMC then treated the function as undefined and no longer verified the changed code.

Paper’s updater plan (IV-A/B4, PDF pp.4–5): identify affected proofs, assess validity, apply updates, reverify affected functions, and compare coverage and violation reports with prior data. Initially the repairer supplies updates; a future LLM agent proposes synchronized changes.

Inference: Verus CI should treat contract, datatype, and ownership changes as proof dependencies, rerun affected functions, and reject stale specifications. Verus has no paper-described automatic updater here; dependency tracking and update synthesis are engineering work.

## what is proved, trusted, and threatened

The experiments establish only that the selected FreeRTOS unit proofs, run with CBMC v5.95.1, missed 6/11 recreated vulnerabilities before repair and exposed all 11 after repair. They do not prove that unit proofing finds every defect, that the proposed four tools work, or that BMC is superior for a Verus product. Trust includes CBMC, the solver, the harness assumptions, the chosen properties, models, and the software/version reconstruction. Inference: agent-written verified Rust is threatened mainly by false confidence from over-constrained models, omitted safety properties, and stale contracts; these are direct analogues of the paper’s four failure classes.

## techniques for the catalog

- unit decomposition — partition a call graph into solvable function units while minimizing model and proof effort

- input/resource modeling — specify broad inputs, shared state, and behavior-preserving callee models, then refine from coverage and violations

- proof-fault validation and repair — recreate defects, classify missed detections, repair harnesses or properties, and rerun

- proof evolution — track code/proof dependencies, update affected models and contracts, and compare re-verification evidence
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
