# A manifesto for applicable formal methods
(authored by agents unless marked 🧑)
Tag: `gleirscher2023applicable`, [paper](https://doi.org/10.1007/s10270-023-01124-2)

## paper contribution

The paper is an expert manifesto, not a new verifier or an experiment. It diagnoses weak adoption of formal methods and proposes ten principles for judging applicability. The authors define a formal method as “an explicit mathematical model and sound logical reasoning about critical properties” (section 2.1, p. 1738). Their central adoption claim is: “formal methods are less applied than expected, particularly in application domains with critical requirements” (Table 1, p. 1741). The principles are a reusable engineering checklist: scope, methodology, integration, explainability, automation, scalability, transfer, usefulness, ease of use, and evaluation.

### 1. scope the method

The paper's procedure is to state the application domain, the supported system class, and guidance for applying the method inside that boundary. It says: “A formal method should clearly define its scope of applicability, its domain specificity, and come with understandable guidance on how it is to be applied within that given scope” (section 4.2.1, p. 1740). The authors explain that limiting scope can reduce accidental model complexity and improve ease of use.

### 2. give a step-wise methodology

A user needs an operational recipe, not only a logic. The paper requires “a step-wise recipe and procedural guidance for method users regarding possible next steps in corresponding situations” (section 4.2.2, p. 1740). It names composition, modularity through contracts, refinement, sound abstraction or simplification, and modelling/specification guidelines.

### 3. integrate with existing engineering

The method should connect to a familiar design technique, modelling notation, programming language, or process. The paper lists “(i) a familiar design or engineering technique ... (ii) a widely used modelling technique ... (iii) a programming language ... or (iv) a process model” (section 4.2.3, p. 1741). Integration is expected to increase usefulness and ease of use.

### 4. explain exactly what was established

After verification, the claim must be precise and communicable. The paper says: “A minimal requirement is that it can precisely state which claim has been established (as in a mathematical theorem)” (section 4.2.4, p. 1741). It adds that a certificate should permit independent checking and that modelling assumptions must be explainable to domain experts and users.

Inference: emit a human-readable claim for each verified function, including its preconditions, postconditions, invariants, termination measure, and assumptions about external code. In Verus, `ensures` is the proved result and `requires` is the caller obligation; proof-only functions and lemmas justify intermediate facts and are erased from execution. Inference: do not report that the implementation is correct when only a contract was proved. Independent checking is provided by rerunning Verus and its solver, subject to the trusted verifier and solver.

### 5. automate tedious abstractions

The automation principle says tool support should prevent tedious work and automate “any obvious or useful abstraction required to apply the method to the maximum benefit” (section 4.2.5, p. 1741). Automation is aimed at difficult or repetitive work and is linked to industrial scale.

### 6. measure scale in a practical setting

The paper requires applicability at “a practically relevant scale, manageable with reasonable effort as a function of that scale” (section 4.2.6, p. 1741). It gives possible denominators: lines of code, fulfilled requirements, discharged theorems, state-space size, or complexity. It attributes scalability to methodology, abstraction, modularity, and automation.

### 7. make transfer teachable

A method needs a teaching and training strategy, prerequisites, examples, case studies, guides, and manuals. The authors say average graduate students and experienced engineers should learn and apply it with reasonable effort, while warning that merely publishing materials does not reach enough people (sections 4.2.7 and footnote 12, p. 1742).

### 8. demonstrate usefulness and ease of use separately

Usefulness asks whether formalisation changes outcomes. The paper recommends case studies or controlled experiments comparing what would differ under a conventional alternative, including fault avoidance/detection and economic impact (section 4.2.8, p. 1742). Ease of use asks for a good gain/effort ratio, such as low abstraction effort, low proof complexity, and high productivity (section 4.2.9, p. 1742). The paper explicitly treats these as distinct constructs.

### 9. evaluate applicability credibly

The final principle requires evidence beyond an attractive example: “Applicability could be demonstrated compellingly (e.g. with representative examples, with tools usable by other researchers or practitioners, perhaps even with qualified tools)” (section 4.2.10, p. 1742). A proposed method should state benefits and foreseen challenges, limitations, or barriers.

## evidence, trust, and limits

The paper's evidence is literature-backed motivation and illustrative success stories, explicitly “without any ambition to be complete” (section 5, p. 1742). It mentions industrial use of model checking, abstract interpretation, program verification, CompCert, seL4, chips, railways, Facebook, and AWS, but does not re-run those systems or provide a common comparison. Therefore it establishes a framework of claims and recommended evidence, not that every principle has been empirically validated.

Inference: for a product of agent-written verified Rust, the threat is high when agents optimize for a passing proof while omitting scope, assumptions, usability, or maintenance evidence. The manifesto directly covers that failure mode through explainability, usefulness, ease of use, and evaluation. It does not address LLM agents, Rust/Verus semantics, specification misstatement, solver unsoundness, or dependency drift in detail; those remain trusted or require separate studies. The paper also does not show that its ten principles are jointly necessary or sufficient, and says an optimal implementation of all simultaneously is not expected (section 4, p. 1740).

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
