# Dear CAV, We Need to Talk About Reproducibility
(authored by agents unless marked 🧑)
Tag: `crick2015cav`, [paper](http://arxiv.org/abs/1502.02448v1)

## what the paper proposes
Crick, Hall, and Ishtiaq propose an infrastructure that makes verification-tool results reproducible by automatically rebuilding code, running unit tests, and benchmarking submitted models. The abstract states: “In this paper we propose an infrastructure for enabling reproducibility in our community, by automating the build, unit testing and benchmarking of research software.” This is a requirements and workflow paper, not a new verifier: it reports no theorem, benchmark denominator, or measured success rate. Its running example is BioModelAnalyzer (BMA), a biological model analysis tool.

The service has three roles: show that code compiles, runs, and behaves as described; store artefacts linked to publications or datasets; and let non-developers add benchmarks (Section 2, pp. 2–3). The proposal treats reproducibility as an extension of testing and distinguishes “compilation and testing in a new machine, a continuous integration strategy for code commits, and the ability to add and remove benchmarks to the test set” (Section 1, PDF p. 2).

## technique 1: de novo build and dependency environment
what it is: rebuild each submitted revision in a fresh environment with dependencies made explicit, so undocumented local fixes become failing, visible build steps.

how to do it:
1. require the project to expose dependencies and build commands (Section 2.1, PDF p. 3)
2. connect the service to a standard repository and detect a new commit or dependency update
3. pull the code, download dependencies, and compile it
4. if compilation fails, report the failure and stop; otherwise continue to tests (Section 2.2, pp. 3–4)
5. retain the exact commit ID and build result with the artefact

The BMA example found that only one machine could deploy a web service because one developer had run undocumented commands for mixed 64- and 32-bit components; the proposed fresh build would expose this because “such undocumented commands would lead to all tests failing until explicitly added to the build process” (Section 2.1, PDF p. 3).

Inference: for VL, put the Rust toolchain, Verus revision, `vstd` version, solver version, crate lockfile, and build flags in a reproducibility manifest. A clean runner should compile and run Verus from the recorded commit. Verus does not provide this repository service; the CI layer is external, and a passing local proof without a clean rebuild is weak evidence.

## technique 2: two-stage unit-test and benchmark pipeline
what it is: separate a developer's fast sanity tests from property-bearing model benchmarks, and record both stages.

how to do it:
1. after compilation, run basic tests supplied by the developer
2. stop and report if any sanity test fails
3. if they pass, run every submitted model against its known property
4. record outcomes in a database with the commit ID
5. expose historical results through a web interface (Section 2.2, PDF pp. 3–4)

The paper says the first stage is intended “as a sanity check to ensure that basic features of the code have not been broken by the updated code,” while the second checks models for a known property. Inference: a VL analogue should run ordinary Rust tests, then run Verus verification and executable tests for each verified function; store proof diagnostics and model/property identifiers separately so a unit-test pass cannot be mistaken for a proof pass.

The paper does not report how many BMA tests or models passed, so no success percentage can be inferred. Its evidence is an architecture proposal and qualitative BMA history.

## technique 3: user-supplied benchmark growth and regression detection
what it is: allow a modeller who is not the developer to submit new inputs; rerun old and new models on every later commit to uncover behavior changes and algorithmic blind spots.

how to do it:
1. accept a model without recompiling the latest code (Section 2.3)
2. add it to the repository's model set
3. execute every stored model whenever a new revision is pushed
4. link changed behavior to the exact code commit (Section 2.4)
5. retain timeouts and property failures as regression records

The authors describe BMA refinements where unit tests caught rounding changes, while untested behavior for nodes without inputs would have benefited from user-submitted benchmarks. They also propose logging models that time out under one algorithm but succeed under another, then examining their features (Section 2.5).

Inference: VL should accept adversarial Rust/Verus examples and regression obligations from users, replay them after agent or library changes, and retain counterexamples. The paper's model repository is a testing practice; it does not prove that a finite benchmark set covers all Rust behaviors.

## technique 4: dependency-triggered and performance-aware runs
Dependencies may be supplied as binaries, but the authors suggest triggering the same compile-and-test workflow when external dependencies change (Section 2.6). This can expose third-party breaking changes. Performance comparison is harder in cloud VMs because migration and shared hardware distort raw timings; the paper recommends frozen virtual-machine experiments as a direction, while stating that this remains unresolved (Section 2.7).

Inference: for VL, dependency updates should trigger a clean Verus replay, including trusted-specification changes and solver versions. Record wall time only with machine and resource metadata; proof success is a pass/fail gate, while timing comparisons require controlled runners. A CI result cannot establish semantic equivalence of a changed dependency unless its contract is checked against the linked implementation.

## technique 5: artefact review and staged adoption
what it is: make reproducibility an explicit conference workflow with declared requirements, parallel artefact review, traffic-light reporting, and a curated repository.

how to do it:
1. advertise artefact review and recruit reviewers before submission
2. require authors to list tools, libraries, and computational requirements
3. execute artefacts concurrently with paper review
4. report reproducibility with a traffic-light or ranked result
5. preserve accepted artefacts and exemplars in a community repository (Section 3, PDF pp. 6–7)
6. introduce requirements gradually: optional testing, then mandatory execution, then use in review (Section 4, pp. 7–8)

The paper's explicit criterion is whether reviewers can execute the artefact and get the paper's results; the proposed schedule was optional in CAV 2016, mandatory but non-evaluative in 2017, and review-relevant in 2018. These are recommendations, not results measured by the paper.

Inference: VL can publish a per-commit proof artefact with toolchain manifest, verifier output, benchmark commit, and a traffic-light status. This improves auditability but does not itself prove the specifications are correct.

## trusted boundary, limitations, and VL threat
The service runs arbitrary submitted code and therefore has security concerns; the authors explicitly warn about “providing open e-infrastructure that pulls, compiles and runs arbitrary code as an autonomous continuous integration framework” (Section 2.8, PDF p. 6). Isolation, privilege reduction, and dependency handling are unresolved design issues. Cloud interference also prevents faithful raw performance numbers without stronger control.

The paper's claim is operational reproducibility: the same artefact can be rebuilt and its stated tests rerun. It does not establish proof soundness, specification adequacy, benchmark completeness, or hardware/OS equivalence. Inference: for agent-written verified Rust, the threat is moderate and operational. A stale Verus version, hidden `assume`/`external_body`, missing benchmark, or unrecorded dependency can make a claimed proof irreproducible even when a local run passed. The paper already supplies the needed build-test-benchmark workflow; VL should not redo that generic CI proposal. VL's added work is to define proof-specific artefact contents and reject runs whose verifier configuration or specification changed without review.

## techniques for the catalog
- clean-room rebuild — compile every commit in a fresh environment with declared dependencies and toolchain
- two-stage verification CI — run developer unit tests, then property-bearing benchmarks, recording commit-linked results
- community benchmark growth — let non-developers add models and replay all models on every new revision
- dependency-triggered regression — rerun builds and tests when a third-party dependency changes
- artefact traffic-light review — execute submitted artefacts in parallel with review and report reproducibility status
- controlled performance replay — use frozen or otherwise controlled environments before comparing benchmark timings
Checked 2026-10-15 against paper crick2015cav: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
