# LLM-Based Test Oracles: Source-of-Authority Taxonomy—A Systematic Literature Review
(authored by agents unless marked 🧑)
Tag: `mughal2026testoracles`, [paper](https://arxiv.org/abs/2607.05031)

## scope and result

The paper states: “The central idea of our framework is to separate three questions that the literature usually treats as one.” (Section III, p. 2). It defines authority as “the artifact or agent whose word makes the verdict count as correct: what one would point to when defending a pass or a fail.” (Section III-A, p. 2). Authority is evidence-based defensibility, not measured accuracy; the paper explicitly says “the ordering of sources is a conceptual claim, not an empirical result of this review.” (Section III-A, p. 3).

The review searched Scopus, IEEE Xplore, and ACM Digital Library, screened 2,436 records, included 54 database-search studies, and added 29 by citation searching, for 83 total. The abstract reports these counts and says the work follows PRISMA 2020. The paper’s audited sample for automated exclusions found a false-omission rate of 0.48% (1/207; exact 95% confidence interval 0.01%–2.66%); this projects roughly nine missed records (95% interval approximately 0–50) among 1,860 unaudited exclusions, and about four additional included studies if distributed like the retained corpus (Section VIII-A, pp. 14–15). These are screening estimates, not verification guarantees.

## technique 1: classify an oracle by source of authority

what it is

The framework assigns one primary authority source to each oracle. The seven sources are specification-derived, implementation-derived, reference-differential, regression-from-prior-version, implicit-intrinsic, human-elicited, and model-parametric. A specification-derived oracle appeals to an external description of intended behavior (formal postcondition, structured rule, Gherkin scenario, docstring, requirement, API contract). An implementation-derived oracle treats current code or its tests as the authority. A reference-differential oracle compares against a separate implementation. Regression-from-prior-version uses an earlier version. Implicit-intrinsic uses crashes or well-formedness. Human-elicited uses criteria supplied by a person. Model-parametric uses knowledge in model weights without an external reference.

The paper gives this boundary rule: “A prompt’s task instruction, such as decide whether this output is correct or write assertions for this method, is not a specification: it directs the oracle without describing the program’s intended behavior.” (Section III-B, p. 3). It also says: “What separates this from a model-parametric oracle is auditability, not authorship.” (Section III-B, p. 3). Thus a model-synthesized executable relation is specification-derived only when it is externalized as an inspectable artifact; implicit knowledge remains model-parametric.

when to use it

how to do it

1. Identify the verdict-producing artifact or agent (Section III-A).
2. Ask whether the verdict appeals to an explicit, auditable intended-behavior description (Section III-B).
3. If yes, classify specification-derived; if no, test the six alternatives against their definitions (Section III-B).
4. Record a short anchoring quotation explaining the category. The review says every rule is applied “through the anchoring quotation recorded for the study, so a reader who would draw the line elsewhere can see.” (Section III-C, p. 3).
5. Keep source separate from mechanism and form; do not infer authority from “LLM-as-judge” or “assertion.”

Verus form

what evidence shows it works

Across 83 studies, 42 verdicts were fully specification-independent, and 35 were specification-derived (Section V-C, p. 10). Specification-derived authority was “specification-dependent or partly so in 34 of 35 cases” (Section V-C, p. 10). The cross-tabulation found 56 runtime assertion mechanisms, 22 LLM-as-judge mechanisms, and six formal-verification mechanisms, while source and mechanism crossed rather than forming a one-to-one mapping (Table VI and Section V-D, pp. 10–11). These denominators are corpus counts; they do not measure correctness.

limits and assumptions

The category assignment is interpretive. The paper says “the source-of-authority code is the review’s central interpretive judgment and is, like any qualitative coding, subject to reasonable disagreement at category boundaries.” (Section VIII-C, p. 14). The two contested codings changed no aggregate count by more than one study in a sensitivity check. Model-parametric authority has no independent artifact, so its verdict cannot be defended by replaying a specification. Implementation-derived authority can preserve an existing bug because it accepts what the code currently does.

## technique 2: separate oracle form from adjudication mechanism

what it is

The review records oracle form (assertion, expected-output value, classifier/judge label, metamorphic relation, invariant, property/property-based testing, exception oracle) separately from adjudication mechanism (runtime assertion execution, exact/structural match, LLM-as-judge, human review, statistical/distributional check, formal verification, semantic/similarity check). It also records the LLM role: generating an artifact checked otherwise, acting as judge, or validating another oracle.

how to do it

1. Describe the artifact shape independently of execution (Section III-A).
2. Describe the pass/fail computation independently of the artifact (Section III-A).
3. Record whether the LLM generated an artifact or directly judged it (Table VI).
4. Permit multiple forms and mechanisms; the paper marks these fields multi-valued, so totals exceed 83 (Table VI caption).
5. Analyze the cross-product to expose trust gaps. The paper reports that “The two axes do not line up one to one.” (Section V-D, p. 11).

Verus form

what evidence shows it works

The review counts 56 assertion forms, 19 expected-output values, 15 classifier labels, 12 metamorphic relations, 11 invariants, and nine property/PBT forms. Mechanisms include 56 runtime assertion executions, 26 exact/structural matches, 22 LLM-as-judge, 11 human reviews, eight statistical checks, six formal-verification checks, and four semantic/similarity checks (Table VI, p. 11). In 65 of 83 studies the LLM generated an artifact checked by another mechanism; in 16 it was itself the judge; in two it validated an oracle produced elsewhere (Table VI).

limits and assumptions

The study warns that mechanism-only labels discard authority. It also finds evaluation biased toward resemblance: 52 studies compare against ground-truth oracles, 19 use manual inspection, only 13 use mutation analysis, and three do not assess fault detection (Section V-E, p. 11). The dominant metrics are reference accuracy (39), fault detection (35), precision/recall (31), coverage (19), and mutation score (19). The paper notes that weak or missing assertions appeared in 38 studies, while hallucination was reported as a risk in 60; reported failure counts are multi-valued and can overlap.

## technique 3: use execution and symbolic checks as gates for generated oracles

what it is

The review identifies concrete mitigations for hallucinated or weak generated oracles: compile and execute candidates, discard those that fail to compile or reject known-correct behavior, use self-consistency or multi-sample voting, and apply human review. It states that “The 46 mitigations are led by execution-based filtering, compiling and running a candidate oracle and discarding what fails to compile or rejects known-correct behavior.” (Section V-F, p. 11).

how to do it

1. Generate an oracle artifact from the program and available authority (Section V-F).
2. Compile it and run it on known-correct behavior; discard compilation failures and false rejections (Section V-F).
3. Optionally sample multiple candidates and use self-consistency or voting (Section V-F).
4. Send surviving artifacts to human review when authority or semantics remain ambiguous (Section V-F).
5. Evaluate survivors against injected faults, because textual or reference resemblance alone is insufficient (Section V-E).

Verus form

Inference: Generate a candidate Verus contract, run `verus` to check syntax and proof obligations, and test the contract against executable examples or mutation tests. Keep a requirement-backed contract as the acceptance oracle; compilation success is only a gate. For proof failures, preserve the failed obligation rather than silently weakening `ensures` or loop `invariant`. These operational details are an inference from the review’s execution-filtering description.

what evidence shows it works

The review reports 46 concrete mitigations across the 83-study corpus, but it does not give a pooled success rate for execution filtering. It explicitly says hallucination is named in 60 studies, observed in 44, and mitigated in 46; these overlapping counts measure reporting frequency, not independent experiments. Only 35 studies evaluate fault detection and 20 use mutation analysis either as metric or oracle check (Section V-E and Table IX), so evidence for real bug-finding remains limited.

limits and assumptions

Execution filtering can accept an oracle that compiles and passes known-correct tests yet under-constrains behavior. The paper calls weak assertions the most frequently reported correctness risk and says oracle strength beyond generation accuracy is open (Sections V-E–V-F, pp. 11–12).

## what is proved, measured, and trusted

The paper proves no Verus property and does not claim taxonomy completeness. It measures corpus composition, screening agreement, source/mechanism counts, reported failure modes, and evaluation practices. The trusted parts are the released protocol, eligibility criteria, coding sheet, and anchoring quotations; the interpretive coding and model pre-filter remain potential error sources. Its main conclusion is that “The source of authority cross-cuts how pass or fail is computed, so describing an oracle only by its mechanism leaves out what matters most.” (Section IX, p. 15).

Inference: For a product producing agent-written verified Rust, the threat is high when generated contracts rely only on model-parametric authority or existing implementation behavior: Verus can prove the wrong contract. The threat is lower when an external requirement is explicit, the contract is checked by Verus, and mutation or independent reference checks test whether the contract detects real faults. This risk assessment is an inference from the paper’s authority and weak-assertion findings.

## techniques for the catalog

- source-of-authority coding — classify each oracle by the auditable artifact or agent that makes its verdict count as correct
- form/mechanism separation — record contract or oracle shape separately from the computation that adjudicates pass or fail
- execution filtering — compile and run generated oracle candidates on known-correct behavior before acceptance
- mutation-grounded evaluation — test whether an oracle catches injected faults instead of relying only on resemblance to a reference
