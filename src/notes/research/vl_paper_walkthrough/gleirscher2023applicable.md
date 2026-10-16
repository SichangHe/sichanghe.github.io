# A manifesto for applicable formal methods
(authored by agents unless marked 🧑)
Tag: `gleirscher2023applicable`, [paper](https://doi.org/10.1007/s10270-023-01124-2)

## paper contribution

The paper is an expert manifesto, not a new verifier or an experiment. It diagnoses weak adoption of formal methods and proposes ten principles for judging applicability. The authors define a formal method as “an explicit mathematical model and sound logical reasoning about critical properties” (section 2.1, p. 1738). Their central adoption claim is: “formal methods are less applied than expected, particularly in application domains with critical requirements” (Table 1, p. 1741). The principles are a reusable engineering checklist: scope, methodology, integration, explainability, automation, scalability, transfer, usefulness, ease of use, and evaluation.

The paper's applicability test is economic as well as logical. It says a method is directly applicable when “the expected benefit from using the method in a task ... justifies the expected cost of applying it” (section 2.4, p. 1739), and indirectly applicable when the cost of not applying it is unacceptable. This matters for VeruLaw: a proof that is mathematically valid can still fail as a product if users cannot specify, run, understand, and maintain it at a justified cost.

## techniques and how to apply them

### 1. scope the method

The paper's procedure is to state the application domain, the supported system class, and guidance for applying the method inside that boundary. It says: “A formal method should clearly define its scope of applicability, its domain specificity, and come with understandable guidance on how it is to be applied within that given scope” (section 4.2.1, p. 1740). The authors explain that limiting scope can reduce accidental model complexity and improve ease of use.

Inference: in Verus, write the supported Rust subset, memory/concurrency model, specification boundary, and trusted external assumptions before accepting a VL job. Use `requires`, `ensures`, `invariant`, and `decreases` only where the Verus language supports them; put unsupported code behind an explicitly documented interface rather than claiming it was proved. Step by step: (1) identify the product property and Rust boundary; (2) state preconditions and postconditions; (3) list libraries, unsafe operations, and environment assumptions; (4) reject or isolate code outside that scope. The paper supplies no Verus example or quantitative scope experiment.

### 2. give a step-wise methodology

A user needs an operational recipe, not only a logic. The paper requires “a step-wise recipe and procedural guidance for method users regarding possible next steps in corresponding situations” (section 4.2.2, p. 1740). It names composition, modularity through contracts, refinement, sound abstraction or simplification, and modelling/specification guidelines.

Inference: a VL workflow should turn a Rust task into a sequence: choose the model; write a contract; verify straight-line code; add loop `invariant`s and `decreases`; prove reusable facts with `proof fn`/`lemma` declarations; then compose verified modules through contracts. This is an inference from the paper's recipe requirement, not a procedure stated by the paper. The evidence offered is the principle itself; no denominator, benchmark, or controlled comparison is reported. The assumption is that a recipe reduces user search effort.

### 3. integrate with existing engineering

The method should connect to a familiar design technique, modelling notation, programming language, or process. The paper lists “(i) a familiar design or engineering technique ... (ii) a widely used modelling technique ... (iii) a programming language ... or (iv) a process model” (section 4.2.3, p. 1741). Integration is expected to increase usefulness and ease of use.

Inference: VeruLaw should preserve ordinary Rust modules, ownership, tests, and build tooling while adding Verus specifications and proof functions. A practical integration sequence is (1) select the existing API and requirement; (2) add contracts at module boundaries; (3) verify implementation bodies; (4) retain executable tests for behavior outside the formal model; (5) run verification in the normal build pipeline. This carries over the paper's integration criterion; the Rust and Verus details are inference. The paper reports no integration rate or sample denominator.

### 4. explain exactly what was established

After verification, the claim must be precise and communicable. The paper says: “A minimal requirement is that it can precisely state which claim has been established (as in a mathematical theorem)” (section 4.2.4, p. 1741). It adds that a certificate should permit independent checking and that modelling assumptions must be explainable to domain experts and users.

Inference: emit a human-readable claim for each verified function, including its preconditions, postconditions, invariants, termination measure, and assumptions about external code. In Verus, `ensures` is the proved result and `requires` is the caller obligation; proof-only functions and lemmas justify intermediate facts and are erased from execution. Inference: do not report that the implementation is correct when only a contract was proved. Independent checking is provided by rerunning Verus and its solver, subject to the trusted verifier and solver.

### 5. automate tedious abstractions

The automation principle says tool support should prevent tedious work and automate “any obvious or useful abstraction required to apply the method to the maximum benefit” (section 4.2.5, p. 1741). Automation is aimed at difficult or repetitive work and is linked to industrial scale.

Inference: VL can generate contract skeletons, loop-invariant candidates, lemma calls, and solver context, while leaving the final specification and proof checked by Verus. The safe sequence is (1) generate a candidate; (2) compile and verify it; (3) expose failed obligations; (4) ask for or synthesize a local lemma/invariant; (5) rerun verification; (6) record the exact accepted proof. The paper does not claim that automation is complete, nor does it measure generated-proof success.

### 6. measure scale in a practical setting

The paper requires applicability at “a practically relevant scale, manageable with reasonable effort as a function of that scale” (section 4.2.6, p. 1741). It gives possible denominators: lines of code, fulfilled requirements, discharged theorems, state-space size, or complexity. It attributes scalability to methodology, abstraction, modularity, and automation.

Inference: evaluate VL on complete repositories or representative services, reporting code lines, number of requirements, theorem/obligation counts, solver time, proof-edit time, and failed obligations. Preserve the model and hardware setting for each number; a single toy function is not evidence of product scale. The paper gives no threshold and no numerical result, so a product threshold would be a new policy.

### 7. make transfer teachable

A method needs a teaching and training strategy, prerequisites, examples, case studies, guides, and manuals. The authors say average graduate students and experienced engineers should learn and apply it with reasonable effort, while warning that merely publishing materials does not reach enough people (sections 4.2.7 and footnote 12, p. 1742).

Inference: VL should teach one concept at a time through compilable Rust/Verus examples, show the failed obligation before the repair, and provide domain-specific recipes. Measure time-to-first-verified-function and completion rate with a stated learner denominator and background. Those measurements are not in the paper.

### 8. demonstrate usefulness and ease of use separately

Usefulness asks whether formalisation changes outcomes. The paper recommends case studies or controlled experiments comparing what would differ under a conventional alternative, including fault avoidance/detection and economic impact (section 4.2.8, p. 1742). Ease of use asks for a good gain/effort ratio, such as low abstraction effort, low proof complexity, and high productivity (section 4.2.9, p. 1742). The paper explicitly treats these as distinct constructs.

Inference: for VL, usefulness measurements should compare defects or assurance found with and without Verus on the same tasks; ease measurements should report engineer minutes, proof lines, solver time, and repair effort. Never substitute pass rate for usefulness or solver runtime for user effort. No experiment in this manifesto supplies denominators or effect sizes.

### 9. evaluate applicability credibly

The final principle requires evidence beyond an attractive example: “Applicability could be demonstrated compellingly (e.g. with representative examples, with tools usable by other researchers or practitioners, perhaps even with qualified tools)” (section 4.2.10, p. 1742). A proposed method should state benefits and foreseen challenges, limitations, or barriers.

Inference: a VL evaluation should publish runnable repositories, exact Verus/tool versions, specifications, hardware, timeouts, failed cases, and the trust boundary. Report every success over its total attempted cases and distinguish generated, repaired, and human-written proofs. The paper itself supplies no empirical denominator; its contribution is the evaluation standard.

## evidence, trust, and limits

The paper's evidence is literature-backed motivation and illustrative success stories, explicitly “without any ambition to be complete” (section 5, p. 1742). It mentions industrial use of model checking, abstract interpretation, program verification, CompCert, seL4, chips, railways, Facebook, and AWS, but does not re-run those systems or provide a common comparison. Therefore it establishes a framework of claims and recommended evidence, not that every principle has been empirically validated.

Inference: for a product of agent-written verified Rust, the threat is high when agents optimize for a passing proof while omitting scope, assumptions, usability, or maintenance evidence. The manifesto directly covers that failure mode through explainability, usefulness, ease of use, and evaluation. It does not address LLM agents, Rust/Verus semantics, specification misstatement, solver unsoundness, or dependency drift in detail; those remain trusted or require separate studies. The paper also does not show that its ten principles are jointly necessary or sufficient, and says an optimal implementation of all simultaneously is not expected (section 4, p. 1740).

What VL should not redo: the paper has already articulated the adoption checklist and the distinction between usefulness and ease of use. VL can operationalise and measure those criteria for Rust verification rather than restating them. Inference: the missing contribution is a reproducible, repository-scale evaluation of agent-produced Verus proofs with explicit denominators, costs, assumptions, and failures.

## techniques for the catalog

- scoped applicability: define supported domains, models, assumptions, and user guidance before claiming a proof
- procedural verification: give users a step-wise recipe covering contracts, abstraction, refinement, and composition
- engineering integration: connect formal specifications to existing languages, models, tools, and development processes
- explainable claims: state the exact theorem, assumptions, and independently checkable evidence
- abstraction automation: automate tedious proof and modelling work while checking generated artifacts
- practical scalability: measure effort and results against code, obligations, requirements, or system complexity
- transfer strategy: provide prerequisites, examples, training, and manuals that ordinary engineers can use
- usefulness evidence: compare faults, requirements, or economic outcomes with a conventional alternative
- ease-of-use evidence: measure user gain/effort separately from tool runtime
- credible evaluation: publish representative, runnable artifacts, limits, barriers, and complete denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
