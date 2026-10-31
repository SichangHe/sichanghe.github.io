# A Unit Proofing Framework for Code-level Verification: A Research Agenda
(authored by agents unless marked 🧑)
Tag: `amusuo2025unit`, [paper](https://arxiv.org/abs/2410.14818v2)

## contribution and scope

The paper proposes “a principled end-to-end unit proofing framework” (I, PDF p.1). Unit proofing decomposes a program, verifies each function with a model of its environment, repairs faulty proofs, and updates them as code changes. The paper is a research agenda plus an exploratory FreeRTOS study; its proposed tools are not yet a completed system.

## technique 1: decompose code into verifiable units

What it is: select function-sized units so bounded model checking (BMC) remains tractable while the models do not make proof work excessive. The paper states that “Unit proofing comprise four stages” (II-B, PDF p.2): decomposition; creating proofs and environment models; investigating and repairing faulty proofs; and maintenance.

Decomposition requirements and proposed approaches (II-B, PDF p.2; IV-A, PDF p.3; IV-B1, PDF p.4):

1. Decompose the software into manageable units for individual verification (II-B).
2. For each candidate unit, account for input structures, shared resources, and called or undefined functions (II-B).
3. Investigate how to estimate verification time and proofing effort (open question OQ1) and choose a decomposition that minimizes effort while keeping each unit solvable (IV-A).
4. The proposed decomposer would estimate model complexity and verification time, then iteratively replace the most expensive functions with models. A separate proposed bottom-up approach would partition call graphs (IV-B1).

Inference: decomposition is relevant to function-level verification in Verus, but this paper does not evaluate a Verus decomposition method.

Evidence and limits: the agenda reports no implementation evaluation for the decomposer. Its rationale is a tradeoff: small units are easier to solve but increase the number of proofs and models (IV-A, PDF p.3). Inference: locally passing proofs can still omit a caller or shared-state path; the paper’s own open questions treat decomposition quality as unresolved.

## technique 2: model inputs, resources, and replaced functions

What it is: write an executable unit proof harness that supplies broad enough inputs and faithful models for interactions. Listing 1 shows `assume(valid_pointer(ipv6_str));`, assertions on `buffer`, a modeled `MODEL_get_max_len`, and a postcondition assertion (II-A, PDF p.2). BMC translates the implementation and properties to logic and checks all states within a bound.

Modeling requirements and proposed builder (II-A/B, PDF p.2; III-C and IV-A, PDF p.3; IV-B2, PDF p.4):

1. Specify developer properties and enable tool-generated safety checks (II-A).
2. Model every input broadly enough to include all call sites, but constrain it enough to avoid spurious behavior (III-C).
3. Replace expensive or unavailable callees with models that preserve the behaviors and safety properties relevant to the unit (III-C).
4. Model shared resources and state, accounting for prior execution sequences when stateful (IV-B2).
5. The proposed builder would start from generic proof models and refine them until all reachable code is covered and reported violations are resolved, using interventions from the proposed repairer (IV-B2).
6. The builder would propagate learned models as assertions to the respective components, with violations indicating defects and helping identify triggering paths (IV-B2).

The paper documents concrete failures. For CVE-2018-16527, the proof “incorrectly assumed the input packet always contained the header” (III-C, PDF p.3), hiding a truncated-header bug. For CVE-2018-16524, a replacement model “failed to check the pointer’s validity” (III-C, PDF p.3), so an out-of-bounds pointer was missed.

Inference: for verified Rust, inspect whether input assumptions and callee specifications exclude real executions or omit relevant behavior. This transfers the paper’s modeling concern; the paper does not evaluate Verus contracts or Rust ownership models.

Evidence: the authors recreated 11 FreeRTOS memory-safety CVEs from 21 total CVEs collected as of March 2024, then ran CBMC v5.95.1 (III-A/B, PDF p.2). The authors recreated vulnerabilities by removing input validations that fixed them; attempts to evaluate pre-fix versions failed, mostly because of dependency problems (III-A, PDF p.2). Default proofs exposed 5/11; after repairing models and configurations, all 11 were exposed and one new high-severity CVE (CVE-2024-38373) was found (III-B, PDF p.2; III-C, PDF p.3). The denominator is the 11 recreated, reproducible memory-safety cases, not all FreeRTOS bugs. Under-constrained models can create false positives; over-constrained models hide defects (IV-A).

## technique 3: validate and repair proof faults

What it is: treat a passing proof as an artifact that must be audited for enabled properties, assumptions, models, coverage, and synchronization with code. The four observed fault classes are insufficient verification properties, insufficient input modeling, insufficient function modeling, and out-of-date proofs (III-C, PDF p.3).

Observed assessment procedure followed by the proposed repairer (III-A, PDF p.2; III-C, PDF p.3; IV-B3, PDF p.4):

1. Recreate a known defect by removing the fix’s input validation (III-A).
2. Execute the existing unit proof and record whether the defect is reported (III-A).
3. Investigate missed detections. The four observed causes were a disabled property, insufficient input modeling, insufficient function modeling, and out-of-date proofs (III-C).
4. Repair the unit proof as needed and reassess whether it exposes the vulnerability (III-A/B).
5. The proposed repairer would use a taxonomy of faults and interventions from empirical proof studies assessing coverage, violation reports, and bug detection (IV-B3).
6. The proposed repairer combines fast program analysis with LLM code reasoning; the paper proposes search-based repair with LLM fallback or repair tools enhanced by LLM insights (IV-B3).

Inference: a passing verifier result alone does not establish that the proof models intended behavior. An agent proposing repairs should check whether a repair excludes a real defect rather than merely eliminating a reported violation.

Evidence: “When fixed, all 11 CVEs were exposed.” (III-C, PDF p.3). Inference: proof faults affected defect exposure in this sample. The paper gives no precision, recall, repair-time, or LLM evaluation numbers for the proposed repairer; those remain open research.

## technique 4: maintain proofs as code evolves

What it is: detect which unit proofs become invalid when signatures or implementations change, update the affected proofs, and reverify. For CVE-2018-16525, the paper reports, “The vulnerable function’s signature was changed but the new signature was not propagated to the unit proof.” (III-C, PDF p.3). CBMC permitted calls to undefined functions and reported coverage only for reachable code, so the updated function was no longer verified. Footnote 2 reports that the disclosure led CBMC to report errors instead of warnings for undefined functions; footnote 1 separately notes that the division-by-zero property is enabled by default from CBMC v6 (PDF p.3).

Paper’s updater plan (IV-A, PDF p.4; IV-B4, PDF p.4): identify affected proofs, assess validity, apply updates, reverify affected functions, and compare coverage and violation reports with prior data. The initial plan uses the repairer to resolve invalidated proofs; a future LLM agent would propose updates informed by an empirical study of software changes and proof invalidation.

Inference: verified Rust workflows should track changes that invalidate specifications or proof assumptions and reverify the affected code. The paper does not establish automatic update synthesis for Verus.

## what is proved, trusted, and threatened

The experiments establish only that the selected FreeRTOS unit proofs, run with CBMC v5.95.1, missed 6/11 recreated vulnerabilities before repair and exposed all 11 after repair. They do not prove that unit proofing finds every defect, that the proposed four tools work, or that BMC is superior for a Verus product. Inference: trust includes CBMC, the solver, the harness assumptions, the chosen properties, models, and the software/version reconstruction. Inference: risks for agent-written verified Rust include false confidence from over-constrained models, omitted safety properties, and stale contracts; these are direct analogues of the paper’s four failure classes.

## techniques for the catalog

- unit decomposition — estimate verification and modeling costs, replace expensive functions with models, or explore call-graph partitioning

- input/resource modeling — model inputs, shared state, and replaced functions; the proposed builder refines models using coverage and violations

- proof-fault validation and repair — recreate defects, classify missed detections, repair harnesses or properties, and rerun

- proof evolution — track code/proof dependencies, update affected models and contracts, and compare re-verification evidence
