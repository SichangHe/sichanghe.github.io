# From human intent to a specification worth proving
(authored by agents unless marked 🧑)

**My recommendation:** first agree on the desired outcome through concrete examples and explicit assumptions. Write a short specification linked to those decisions, audit it for omissions, then prove the implementation satisfies it. An agent can prove that code follows a specification while missing what the human wanted. The workflow therefore has two separate obligations: elicit an interpretation that the stakeholder validates, then prove that the implementation satisfies its fixed formal specification. Formal comparison can check agreement with an audited reference; it cannot establish agreement with unexpressed intent. An implementation proof does not settle that interpretation. The concrete evidence is the IronFleet/Chapar audit [P01](#p01), IronSpec [P02](#p02), and Scope [P03](#p03).

“Strong enough” should mean sufficient for a chosen guarantee visible to callers under explicit assumptions. It should not mean describing every implementation detail. Lamport explains why abstraction depends on purpose [P39](#p39); requirements engineering separates desired outcomes from facts about the environment ([P43](#p43), [P46](#p46)); partial contracts can suffice for a particular caller [P42](#p42). Choosing the outcome remains a substantive part of the work. For a read after a completed write, a chosen sequential store spec may require the written value when no later write intervenes; it can intentionally leave memory layout and message batching unspecified. This is my example of being strong enough for a particular observable guarantee.

This is research input for the project, not a request to approve a workflow or pilot. **Scope limit:** I found no evaluated system demonstrating the whole chain from genuinely vague distributed intent through clarification, independently audited safety/liveness specifications, and executable-system proofs.

Read the workflow and evaluation sections for the recommendations. Appendices A–D contain the paper catalogue, concrete systems, search coverage, and PDFs:

- **Why audit the specification:** Fonseca’s verified-systems study, IronSpec, and Scope ([P01](#p01)–[P03](#p03)).
- **How to evaluate it:** VERINA, CLEVER, and Verus-SpecGym ([P17](#p17)–[P19](#p19)).
- **How to clarify meaning:** TiCoder, nl2spec, and PROPEL ([P23](#p23), [P27](#p27), [P45](#p45)).
- **How to choose the guarantee:** IronFleet, Anvil, Four Dark Corners, and goal-oriented requirements ([P36](#p36), [P38](#p38), [P43](#p43), [P46](#p46)).

## A proposed intent-to-specification loop

This is a design recommendation inferred from the literature, rather than a workflow already demonstrated end to end for arbitrary distributed systems.

1. **Write the desired outcome where the caller observes it.** Identify operations, observations, actors, failures, and what the software can control. Separate assumptions from promises. Keep each assumption attached to the guarantee that needs it ([Four Dark Corners](#p43)). Output: the observable promises and the assumptions they need.
2. **Clarify through distinguishable examples.** Offer two small histories that differ on one choice: repeated request identity, acknowledgment before persistence, reads during a partition, reconciliation after a crash, or whether “eventually” means once or permanently. Ask which behaviors are acceptable. TiCoder uses test feedback; PROPEL exposes semantic alternatives; nl2spec links phrases to subformulas ([PROPEL](#p45)). Output: examples labelled required, forbidden, or unspecified, and recorded stakeholder choices.
3. **Keep a short, independent top-level specification.** Independent means it was written from the agreed requirement, rather than copied from the implementation being checked. A state machine is often useful for replicated services; temporal properties are needed for progress and controllers. Link each formal clause to its requirement and assumptions. Do not derive the only reference from the implementation being judged ([IronFleet](#p36), [Anvil](#p38)). Output: a formal specification with links to each agreed requirement and example.
4. **Challenge the specification before investing in the proof.** Check that some behavior satisfies the specification and that its progress assumptions can occur; test accepted and rejected behaviors; run vacuity checks; mutate both code and specification; inspect missing dependencies. A surviving mutation is a deliberate change that the checks still accept. Present changes that alter required behavior as intent questions, not automatic bugs ([IronSpec](#p02)). Output: the check results, counterexamples, and unresolved choices.
5. **Audit the boundary of the theorem.** Record trusted code, I/O and crash models, storage/network behavior, foreign APIs, compiler/runtime assumptions, fairness, and which client actions the theorem covers. Verify the executable code against the audited specification ([Fonseca’s audit](#p01)). Output: the exact theorem, fault model, and list of trusted dependencies.
6. **Evaluate clarification, specification, and proof separately.** Freeze the evaluation reference and assumptions. Preserve rejected interpretations, counterexamples, and unknown outcomes. Recheck specification changes independently before accepting a newly easier proof ([P17](#p17), [P19](#p19), [P31](#p31)).

For example, “a payment must never be charged twice” needs a definition of one payment across timeout and retry. Ordering individual RPCs consistently leaves that identity question open. A useful clarification presents a lost reply followed by a retry with the same payment identifier, and another payment with a new identifier. Ask the stakeholder to label each history required, forbidden, or unspecified. They can do this without reading logic. This is my example, motivated by the disputed exactly-once boundary in P01; it is not a claim that linearizability alone universally promises application-level deduplication.

For “the controller eventually reaches the desired state,” ask whether the desired state eventually stops changing, whether relevant external failures eventually cease, whether pending work gets scheduled, and whether the result must remain correct. For example, a controller might eventually create three replicas but repeatedly delete one thereafter. “Reaches three” permits that behavior; “eventually reaches three and remains there” excludes it. This is my illustration. Anvil’s ESR theorem makes these choices explicit, while additional safety properties remain controller-specific [P38](#p38).

## What “right” and “strong enough” should measure

Terms used below: **safety** rules out bad behavior; **liveness** promises eventual progress. **Refinement** means the detailed system’s observable behaviors are allowed by a simpler specification. **Fairness** limits indefinitely ignored work or messages; each theorem must state which fairness it assumes. The **trusted boundary** consists of assumptions and components whose correctness the proof relies on without establishing it. A temporal **atomic proposition** is a named true/false fact about the system.

The stakeholder supplies the desired outcome and labels examples; the agent proposes questions and formal clauses; independent evaluators compare those clauses with the agreed reference. A caller is the program or person using the resulting service.

The following is my proposed vocabulary, not a claim that the papers agree on terminology. Let `P(x)` describe intended valid inputs, and `Q(x,y)` describe intended acceptable outputs. `P̂` is the input condition written by the agent, and `Q̂` is the acceptable-output relation it writes; neither is the implementation’s observed behavior. For example, the intent is to return all common elements of two lists. For inputs `[1,2]` and `[2,3]`, the empty result `[]` is wrong. A generated clause saying only “every returned element is common” still permits `[]`; it fails the wrong-output check below. These compare what the formal contract permits; “reject” below means the contract rules out a case, not that the running program returns an error. In the formulas, `⇒` means “implies” and `∧` means “and”. Treat a timeout or failed proof search as **unknown**, unless a concrete counterexample establishes failure.

| Question | Obligation, when a trusted reference exists |
|---|---|
| Does it admit every valid input? | `P ⇒ P̂` |
| Does its precondition exclude unintended inputs? | `P̂ ⇒ P` |
| Does it reject wrong outputs on valid inputs? | `P ∧ Q̂ ⇒ Q` |
| Does it allow all intended acceptable outputs? | `P ∧ Q ⇒ Q̂` |

These checks require a fixed reference. Before one exists, use stakeholder-labelled examples and explicit choices to construct it, then independently review the formal translation. Examples support that review; they do not magically prove correspondence with unexpressed intent. A precondition states the domain of a promise; it need not implement runtime rejection.

Exact input-domain matching is an evaluation choice. Some APIs deliberately promise behavior only on a narrower domain. Requiring deterministic equality is also inappropriate if the human allows several outputs. For a distributed system, replace input/output pairs with histories or infinite behaviors, and fix the allowed faults and scheduling assumptions before comparing specifications.

There is a real terminology trap. **VERINA’s program-set definition** calls `P ⇒ P̂` precondition *soundness* and `P̂ ⇒ P` precondition *completeness*; its postcondition directions are as above. An overrestrictive precondition makes more incorrect programs satisfy a contract because fewer executions are constrained. Other papers call rejection of bad output pairs “completeness” or “soundness”. I therefore report the actual check rather than comparing those labels across papers ([P11](#p11)–[P19](#p19)).

An **oracle** is the source used to decide whether a behavior is right, such as an independently reviewed specification or a stakeholder’s answer. These are distinct kinds of evidence:

- **Equivalence or implication proof:** compares two formal meanings, subject to the reference, language semantics, and proof checker. CLEVER and VERINA make this useful, but the reference still needs auditing ([P17](#p17), [P18](#p18)).
- **Positive and negative behavior tests:** detect excluded valid behavior and admitted invalid behavior. Passing a finite set does not establish universal equivalence ([P16](#p16), [P19](#p19)).
- **Mutation:** deliberately alters a specification or implementation to expose omissions. The score depends on which mutations were tried and whether survivors actually change relevant behavior ([P02](#p02), [P06](#p06), [P10](#p10)–[P12](#p12)).
- **Vacuity and coverage:** vacuity checks whether a property passed for an irrelevant reason (for example, there are no reachable requests to answer); coverage checks what parts of the system the properties constrain. These provide additional evidence after verification succeeds ([P07](#p07)–[P09](#p09)).
- **Consistency:** compares several accounts of the same intent. Independent accounts can expose disagreement; accounts generated from one mistaken interpretation can agree ([P03](#p03)–[P05](#p05), [P13](#p13)). This last limitation is my inference.

## Evaluation design for the project

The following is my recommendation, built from the preceding sources. It is not an existing benchmark result.

**Use several task types rather than one solve rate.** Start with ordinary deterministic contracts where equivalence and negative outputs are easy to check; add distributed histories where operation identity and failure semantics matter; then add temporal controller tasks where eventual stability and assumptions matter. Include intentionally ambiguous prompts and prompts omitting essential assumptions. A good outcome can be a well-targeted clarification that identifies an impossible or conflicting guarantee.

**Keep the evaluator independent.** Experts should prepare a goal statement, intended alternatives, allowed behavior examples, forbidden examples, assumptions, and a reference specification before seeing agent solutions. Freeze the test configuration. A reference can contain errors too, so audit it through independent behavior examples and review. Generated code must not be the only oracle for the generated specification.

| Evaluation component | What to record |
|---|---|
| Intent clarification | Did the questions expose the actual missing choice? Did the final interpretation preserve the stakeholder’s answers? Measure human time and unnecessary questions separately. |
| Input domain | Valid inputs wrongly excluded; invalid inputs admitted where the reference intentionally excludes them; implication proofs or concrete witnesses. |
| Output or trace meaning | Wrong behaviors admitted; valid alternatives excluded; equivalence/implication results and unknowns. Include retry identities and intermediate states, not just final output. |
| Strength and vacuity | Surviving non-equivalent mutants; omitted requirement clauses; unreachable triggers; unsatisfiable initial states; progress assumptions that make the theorem trivial. |
| Assumptions and trust | Assumptions added by the agent; whether each is accepted by the stakeholder and supported by the environment; trusted APIs, I/O, extraction/runtime, and proof checker. |
| Proof | Completed proof against the frozen audited spec; conditional theorem; finite model-checking pass; timeout; failed proof with/without a counterexample. Keep these distinct. |

**Pilot research question:** does clarification improve faithful specification relative to generating it directly, under the same tools and budget? Compare both approaches on each task. The primary outcome is a specification matching the fixed reference; clarification quality and proof completion are separate outcomes. Report differences with uncertainty rather than setting an unsupported universal success threshold.

**A pilot protocol.** I propose ten tasks in each of four task categories: deterministic function contracts, distributed-service histories, controller progress, and ambiguous or inconsistent requests. This is a proposed forty-task pilot, not a dataset already assembled. Two experts independently review each hidden goal/assumption/reference package and adjudicate disagreements before the run. Give the agent the prompt and permitted tools, at most five clarification exchanges, and a fixed run time declared before evaluation. End at a submitted spec/proof, an explained impossibility, or the budget limit. The stakeholder answers questions without revealing the hidden reference. Score each obligation as proved, refuted by a witness, or unknown; additionally record test pass/fail separately. A useful impossibility response passes only when an independent reviewer confirms a conflicting obligation and the agent identifies it without quietly weakening the request. Report each task group’s separate results, completed end-to-end tasks, unanswered choices, time, and cost. Do not merge unknowns with demonstrated semantic errors.

**A concrete clarification experiment.** Before each run, an expert records unresolved choices and the behavior examples that distinguish their alternatives. A real stakeholder picks the intended alternatives; a scripted oracle is permitted only in a separately labelled synthetic study. Give the agent a fixed time/question budget and prevent it from seeing the choices list. Record every question, answer, resulting clause, and assumption. Have reviewers who did not see the agent identify which choice each question resolves. Score (a) fraction of preidentified necessary choices resolved, (b) fraction of final decisions matching the stakeholder’s answers, and (c) fraction of added assumptions the stakeholder accepts. Report raw counts, questions, and elapsed human time, alongside unanswered choices. Discovering a valid choice missing from the expert list triggers independent adjudication; it is not automatically penalized. These are proposed metrics, not published results.

Useful adversarial cases are a contract impossible to call (`requires false`), a contract permitting every answer (output relation `true`), a transition system admitting no useful work, a response theorem with no reachable requests, a reconciliation theorem that drops “remains,” an unmentioned assumption that crashes never occur, and a replicated-payment history with two retries of one payment. In TLA+, even a model allowing only repeated unchanged states can have infinite behaviors. Test both whether useful work is possible and whether the whole set of behaviors is empty; they are different failures.

Checking a few successful runs cannot prove that every permitted long-running execution eventually makes progress. Finite-state exhaustive checking can establish temporal properties of the configured finite model when its fairness and cycle checks are correctly set up; applying that result to arbitrary configurations or executable systems needs a separate argument. Require a meaningful failure scenario and a witness of promised progress in addition to the proof/model-checking result. This is my evaluation proposal, not a completeness theorem for the test suite.

## Appendix A: Evidence catalogue

Short quotations below identify the original wording supporting each entry. Surrounding explanations are scoped summaries or explicitly marked inferences. Short excerpts identify the source claim without reproducing long copyrighted passages. An entry marked **abstract only** has weaker reading coverage than an entry with method/evaluation references.

### Specification errors and auditing

<a id="p01"></a>

**P01. An Empirical Study on the Correctness of Formally Verified Distributed Systems.** Pedro Fonseca, Kaiyuan Zhang, Xi Wang, Arvind Krishnamurthy. EuroSys, 2017. [Paper / DOI](https://doi.org/10.1145/3064176.3064183). Local full text consulted, especially §5 and §7.

The authors audited IronFleet, Verdi, and Chapar using code review and testing. The abstract reports “16 bugs”. These include tools, unverified components, and environment mismatches; they are not sixteen protocol or specification bugs. §5 has two specification cases: IronFleet omitted request deduplication from the guarantee; Chapar’s client assertion checked the already-known post rather than the fetched photo. The fix was “asserting that photo (instead of post) is non-null” (§5, PDF p.9). The IronFleet patch disabled implemented deduplication, yet “patched implementation still verified” (§5, PDF p.9). The developers said “does not include exactly-once semantics” (§5). They acknowledged the omission but disputed its classification as a bug. **Relevance:** test the meaning of the top theorem and its client boundary; preserve disagreements about intended scope rather than silently choosing a definition.

<a id="p02"></a>

**P02. IronSpec: Increasing the Reliability of Formal Specifications.** Eli Goldweber, Weixin Yu, Seyed Armin Vakil Ghahani, Manos Kapritsos. OSDI, 2024, pp.875–890. [Paper](https://www.usenix.org/conference/osdi24/presentation/goldweber); [artifact](https://github.com/GLaDOS-Michigan/IronSpec). Local full text consulted.

IronSpec combines dependency sanity checks, manually written specification-testing proofs, and specification mutation. The abstract (p.875) reports “ten specification bugs” across all six real-world verified systems. It asks whether a specification is useful, accepts expected behavior, supports intended proofs, and excludes counterexamples (§3). Strengthening a predicate while the implementation still verifies can reveal a missing intended obligation, after checks for vacuity and semantic difference (§4). §3.3, PDF p.6: Mutation testing does not provide “complete coverage” of spec testing. **Relevance:** the most directly reusable audit workflow here. A suspicious surviving mutation is a question for the domain expert, not proof that the original specification is wrong.

<a id="p03"></a>

**P03. Detecting Inconsistencies in Arm CCA’s Formally Verified Specification (Scope).** Changho Choi, Xiang Cheng, Bokdeuk Jeong, Taesoo Kim. ASPLOS, 2026, volume 2, pp.583–601. [Paper / DOI](https://doi.org/10.1145/3779212.3790152); [artifact](https://github.com/islet-project/scope). Local full text consulted.

Scope translates the Realm Management Monitor (RMM) specification into a Verus model checked with an SMT solver (a solver for logical formulas) and applies rules to success/failure conditions, dependencies, and state transitions. The abstract (p.583) reports “35 previously unknown bugs” and “all confirmed by Arm”. An example is disagreement between a summary dependency chart and the detailed command conditions. It uses the specification itself rather than a reference implementation as its starting point (§3–§5). **Relevance:** an independent audit of different views of a large specification. **Inference:** internal consistency alone cannot rule out an omission shared by every view; translation and rule coverage also belong in the trusted boundary.

<a id="p04"></a>

**P04. Who Guards the Guards? Formal Validation of the Arm v8-M Architecture Specification.** Alastair Reid. PACMPL 1, OOPSLA, Article 88, 2017. [Author paper page](https://alastairreid.github.io/papers/OOPSLA_17/); [DOI](https://doi.org/10.1145/3133912). Full text consulted, especially §2–§4.

Reid constructs a higher-level account of architectural security, designed for review by processor designers, then formally compares it with detailed processor behavior. Abstract: “twelve bugs (including two security bugs)”. The paper explicitly addresses independence of the two specifications: “How to avoid common-mode failures between the specifications” (abstract, p.88:1). Checks constrain both forbidden access and intended permitted access. **Relevance:** a strong predecessor for generating a simple, independently reviewed specification above a complicated one. The trusted secondary specification still needs expert validation.

<a id="p05"></a>

**P05. Trustworthy Specifications of ARM v8-A and v8-M System Level Architecture.** Alastair Reid. FMCAD, 2016, pp.161–168. [Author paper page](https://alastairreid.github.io/papers/FMCAD_16/). Full text consulted.

This describes executable architecture specifications generated alongside architecture documentation and validated against separate simulators, processor models, and tests. Abstract: “defend against common-mode failure”. System-level features, including exceptions and protection, matter when a specification is used to verify an OS rather than only user programs (§I). **Relevance:** agreement with another artifact is useful only after checking how independently it was built. Specification applicability and scope are separate from logical consistency.

### Testing strength, mutations, and vacuity

<a id="p06"></a>

**P06. How much Specification is Enough? Mutation Analysis for Software Contracts.** Alexander Knüppel, Leon Schaer, Ina Schaefer. FormaliSE, 2021, pp.42–53. [Official conference abstract](https://conf.researchr.org/details/Formalise-2021/formalise-2021-papers/9/How-much-Specification-is-Enough-Mutation-Analysis-for-Software-Contracts). **Abstract only; open full PDF not obtained.**

The work uses implementation mutation and deductive verification to assess JML contracts with KeY. The abstract describes “the degree of incomplete specifications by means of mutation analysis”. **Relevance:** an earlier contract-strength approach to compare with IronSpec’s specification mutation. **Inference:** the result is relative to the chosen mutants; equivalent mutants and verifier failures need separate handling. I do not report its numerical evaluation without the full paper.

<a id="p07"></a>

**P07. Vacuity Detection in Temporal Model Checking.** Orna Kupferman, Moshe Y. Vardi. CHARME, 1999; extended journal version, STTT, 2003. [Author institution record](https://cris.huji.ac.il/en/publications/vacuity-detection-in-temporal-model-checking-13/). **Primary abstract read; full text not obtained in PDF form.**

The abstract asks “whether all the subformulas of the specification affect its truth value in the system”. A request-implies-eventual-response property may pass merely because no request can occur. **Relevance:** essential for progress specifications. **Inference:** checking the antecedent can occur, and examining accepted witness behaviors, should accompany a successful temporal check; vacuity freedom is not completeness.

<a id="p08"></a>

**P08. Sanity Checks in Formal Verification.** Orna Kupferman. CONCUR, 2006, pp.37–51. [Primary institution abstract](https://cris.huji.ac.il/en/publications/sanity-checks-in-formal-verification/); [DOI](https://doi.org/10.1007/11817949_3). **Abstract only.**

This surveys vacuity and coverage after model checking succeeds. The abstract says coverage detects “components of the system that do not play a role in verification process”. Vacuity changes the specification; coverage changes the system and repeats checking. **Relevance:** successful verification needs a second round of scrutiny. **Inference:** coverage should be measured against client-relevant behavior, not merely the number of constrained model variables.

<a id="p09"></a>

**P09. A Theory of Mutations with Applications to Vacuity, Coverage, and Fault Tolerance.** Orna Kupferman, Wenchao Li, Sanjit A. Seshia. FMCAD, 2008. [Author publication record](https://people.eecs.berkeley.edu/~sseshia/pubs/b2hd-kupferman-fmcad08.html). **Primary abstract read; full PDF not obtained.**

The abstract states: “Both checks involve mutations to the specification or the circuit implementation”. This unifies questions about irrelevant property parts and unconstrained implementation parts. **Relevance:** helps distinguish specification mutation, implementation mutation, and coverage rather than treating every mutation score as the same quantity. **Inference:** applications to hardware do not by themselves establish coverage of infinite distributed-system fault histories.

<a id="p10"></a>

**P10. MutDafny: A Mutation-Based Approach to Assess Dafny Specifications.** Isabel Amaral, Alexandra Mendes, José Campos. ICSE, 2026; arXiv v1, 2025, v2, 2026. [Current preprint](https://arxiv.org/abs/2511.15403v2); [tool](https://github.com/MutDafny/mutdafny). Current PDF consulted.

MutDafny changes implementation code and uses Dafny verification to see whether the specification detects the change. The current abstract reports “40 mutation operators” and “identifying five weak real-world specifications” (abstract, PDF p.1). The older version had a different operator count; these results refer to v2. **Relevance:** a practical mutation-based audit for Dafny and a model for testing agent-written contracts. **Inference:** a surviving mutation is meaningful only if it changes required behavior; solver uncertainty and equivalent mutations must not be credited as evidence of strength or weakness without investigation.

<a id="p11"></a>

**P11. Can Large Language Models Transform Natural Language Intent into Formal Method Postconditions? (nl2postcond).** Madeline Endres, Sarah Fakhoury, Saikat Chakraborty, Shuvendu K. Lahiri. PACMSE / FSE, 2024. [Paper](https://arxiv.org/abs/2310.01831v2); [artifact](https://github.com/microsoft/nl-2-postcond); [DOI](https://doi.org/10.1145/3660791). Full text consulted, especially §2.1.

The authors generate executable postconditions from descriptions and assess correctness and ability to distinguish buggy implementations. Abstract: “catch 64 real-world historical bugs from Defects4J”. Their bug-completeness measure is the fraction of known buggy implementations rejected by a candidate postcondition (§2.1, PDF pp.4–5). **Relevance:** a usable empirical strength measure with historical bugs, beyond verifier success. **Inference:** rejection of these bugs is neither a full description of acceptable outputs nor universal agreement with the human’s intent; reference programs and tests remain part of the oracle.

<a id="p12"></a>

**P12. Evaluating LLM-driven User-Intent Formalization for Verification-Aware Languages.** Shuvendu K. Lahiri. FMCAD, 2024, pp.142–147. [Paper](https://arxiv.org/abs/2406.09757v2); [artifact](https://github.com/microsoft/intent-formalization). Full text consulted.

This evaluates generated Dafny specifications through concrete input/output pairs checked symbolically, including deliberately incorrect outputs. A set-intersection example exposes a contract that only says every result belongs to both inputs; it fails to require every common element (§II). The paper cautions that a “unknown outcome” (§II, PDF p.4; sentence spans columns in extraction). **Relevance:** tests can be expressed as formal obligations, but failed proof search must not be confused with a witnessed mismatch. Rejection of bad pairs measures only the selected test population.

### Generated contracts and independent evaluation

<a id="p13"></a>

**P13. Clover: Closed-Loop Verifiable Code Generation.** Chuyue Sun, Ying Sheng, Oded Padon, Clark Barrett. SAIV, 2024; revised arXiv version, November 2024. [Paper](https://arxiv.org/abs/2310.17807). Full text consulted, especially algorithms in §3.

Clover checks agreement among code, formal annotations, and documentation. Its verification phase applies “consistency checks” to those artifacts (§2, PDF p.3). For annotation completeness, it regenerates code from annotations and checks equivalence with the original code (§3, PDF p.7), alongside Dafny verification and language-based checks. **Relevance:** an agent can cross-check several representations instead of relying on a single proof pass. **Inference:** successful regeneration is evidence relative to the generator; a generator may supply facts missing from a weak contract. Shared misunderstanding can also survive all round trips.

<a id="p14"></a>

**P14. SpecGen: Automated Generation of Formal Program Specifications via Large Language Models.** Lezhi Ma, Shangqing Liu, Yi Li, Xiaofei Xie, Lei Bu. ICSE, 2025, pp.16–28. [DOI](https://doi.org/10.1109/ICSE55347.2025.00129); [artifact](https://github.com/Lezhi-Ma/SpecGen-Artifact). Local full text consulted.

SpecGen generates annotations, then mutates and selects candidates using verification feedback. Abstract: “selects verifiable specifications”. Its mutations repair candidate specifications rather than using independent human intent as a fixed gold specification (§III). **Relevance:** useful machinery for making annotations accepted by a verifier. **Inference:** verifier-driven repair needs an additional strength/intent check; otherwise removing an obligation can look like progress. Do not compare its verification rate directly with specification-equivalence rates.

<a id="p15"></a>

**P15. VeriAct: Beyond Verifiability — Agentic Synthesis of Correct and Complete Formal Specifications.** Md Rakib Hossain Misu, Iris Ma, Cristina V. Lopes. arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2604.00280). Local full text consulted.

VeriAct adds agent repair around JML generation and evaluates contracts using Spec-Harness. Abstract: “over- or under-constraining both inputs and outputs” (abstract, PDF p.1). The harness separates admission/rejection of inputs and outputs using positive cases, altered cases, and OpenJML obligations (§3–§5). **Relevance:** a direct response to specifications that verify while being weak or excluding required behavior. **Inference:** measured success remains relative to generated cases and the underlying reference behavior; it does not establish universal correctness of vague human intent. The task also gives existing code, so behavior extraction and intent elicitation should be evaluated separately.

<a id="p16"></a>

**P16. Expecto: Extracting Formal Specifications from Natural Language Description for Trustworthy Oracles.** Dongjae Lee, Kihong Heo. PACMPL 10, PLDI, Article 254, 2026. [DOI](https://doi.org/10.1145/3808332); [artifact](https://github.com/prosyslab/expecto-artifact). Local full text consulted.

Expecto builds specifications top down with recursively defined helpers in a Dafny-based language. It can check examples before every helper is fully formalized, then produce executable oracles (§3). Its main evaluation labels soundness by rejection of enough generated negative output pairs: “We set 𝑋 to 50 in our primary experiments,” and “we exclude test cases where the SMT solver times out” (§4.1.4, p.254:13). **Relevance:** staged construction is useful, but the reported soundness criterion is empirical and thresholded. **Inference:** it should not be reported as a theorem that all wrong outputs are excluded; negative-pair ambiguity and timeout exclusion affect the metric.

<a id="p17"></a>

**P17. VERINA: Benchmarking Verifiable Code Generation.** Zhe Ye, Zhengxu Yan, Jingxuan He, Timothé Kasriel, Kaiyu Yang, Dawn Song. ICLR, 2026; arXiv v1, 2025, v3, March 2026. [Paper](https://arxiv.org/abs/2505.23135v3); [artifact](https://github.com/sunblaze-ucb/verina). Local full text consulted, especially §4.1 and specification-testing appendix.

The abstract reports “189 manually curated coding tasks in Lean”. The benchmark separates code, specification, and proof generation. Specification evaluation checks implications against reference pre/postconditions; inconclusive proving can fall back to tests. Its program-set meaning of precondition soundness/completeness differs from naive input-pair naming, as explained above. **Relevance:** a useful modular evaluation design and an explicit check on overrestriction. **Inference:** count successful formal implications, counterexamples, fallback test passes, and unknowns separately; a test pass is weaker than an implication proof, and even a proved comparison trusts the reference specification.

<a id="p18"></a>

**P18. CLEVER: A Curated Benchmark for Formally Verified Code Generation.** Amitayush Thakur, Jasper Lee, George Tsoukalas, Meghana Sistla, Matthew Zhao, Stefan Zetzsche, Greg Durrett, Yisong Yue, Swarat Chaudhuri. NeurIPS Datasets and Benchmarks, 2025; revised arXiv v4 read. [Proceedings](https://proceedings.neurips.cc/paper_files/paper/2025/hash/a7f67788f7b4d77fa7cd6887de3dcbe7-Abstract-Datasets_and_Benchmarks_Track.html); [Paper](https://arxiv.org/abs/2505.13938v4); [artifact](https://github.com/trishullab/clever). Local full text consulted.

CLEVER has “161 problems for end-to-end verified code generation in Lean” (abstract, PDF p.1). The generated specification must match a held-out human specification through a proof, then the generated code must satisfy it. The reference can be noncomputable, allowing a simple mathematical statement above implementation detail (§3). **Relevance:** closer to evaluating faithful specification than scoring only whether generated code proves against its own contract. **Inference:** proof failure can mean prover incapacity, and formal equivalence still depends on correct types, correspondence between representations, and the audited reference.

<a id="p19"></a>

**P19. Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization.** Anmol Agarwal, Natalie Neamtu, Pranjal Aggarwal, Seungone Kim, Jannis Limperg, Cedric Flamant, Kanna Shimizu, Bryan Parno, Sean Welleck. arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2605.26457); [artifact](https://github.com/formal-verif-is-cool/verus-spec-gym). Local full text consulted.

The associated Verus-SpecBench contains “581 specification-writing tasks derived from Codeforces” (abstract, PDF p.1). Specifications execute through an extended `exec_spec` mechanism and are tested against official cases and adversarial competition hacks. The authors report an LLM judge “misses 26% of the failures our evaluator catches” (abstract, PDF p.1). Their failure categories distinguish input assumptions and acceptance/rejection of outputs (§3–§5). **Relevance:** the closest target-language environment for this project. **Inference:** competitive-programming cases provide strong finite functional tests, but adapting them to infinite distributed behaviors requires a different oracle and trace/fault coverage.

<a id="p20"></a>

**P20. Intent-aligned Formal Specification Synthesis via Traceable Refinement (VeriSpecGen).** Zhe Ye, Aidan Z.H. Yang, Huangyuan Su, Zhenyu Liao, Samuel Tenka, Zhizhen Qin, Udaya Ghai, Dawn Song, Soonho Kong. arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2604.10392). Full text consulted.

The method decomposes descriptions into requirements, relates tests and Lean clauses to them, and repairs the implicated parts. Abstract: “requirement-level attribution and localized repair” (abstract, PDF p.1). Reference implementations supply expected behavior for test-based evaluation (§3–§4). **Relevance:** traceability makes a failed check useful for repairing intent translation, instead of replacing the whole specification. **Inference:** its oracle is an existing implementation; deriving labels from that implementation cannot establish that its behavior is what the stakeholder intended.

<a id="p21"></a>

**P21. SpecRL: Reinforcement Learning with Test-Based Completeness Rewards for Formal Specification Synthesis.** Zhechong Huang, Zhao Zhang, Zeyu Sun, Huifeng Sun, Yingfei Xiong. arXiv preprint, 2026, v2 July; the PDF uses a journal template, which does not establish acceptance. [Paper](https://arxiv.org/abs/2604.05820v2). Full text consulted.

SpecRL rewards Dafny contracts for rejecting “implementation-impossible input-output pairs” (abstract, PDF p.1). The reward supplements verification, which alone cannot distinguish useful contracts from `ensures true`. Negative examples are constrained by the source program (§3). **Relevance:** trains directly against weak specifications rather than only prover success. **Inference:** this learns the given program’s behavior; if that program is wrong relative to human intent, strong behavior capture may faithfully encode the wrong thing.

<a id="p22"></a>

**P22. KBSpec: LLM-driven Formal Specification Generation with Evolving Domain Knowledge Base.** Wenhan Wang, Zeyu Sun. arXiv preprint, 2026, v2 August. [Paper](https://arxiv.org/abs/2606.21339v2). Full text consulted.

KBSpec combines “external knowledge from official documentation” with “internal knowledge distilled from verifier feedback” (abstract, PDF p.1). It records successful generation and repair trajectories to support JML specification generation (§3). **Relevance:** helps with formal-language usage and known repair patterns. **Inference:** a knowledge base of verifier success needs independent intent tests, since easily verified but weak contracts are otherwise reusable examples too. I do not treat its evolving knowledge base as independent evidence that a guarantee is complete.

### Clarification and stakeholder requirements

<a id="p23"></a>

**P23. LLM-Based Test-Driven Interactive Code Generation: User Study and Empirical Evaluation (TiCoder).** Sarah Fakhoury, Aaditya Naik, Georgios Sakkas, Saikat Chakraborty, Shuvendu K. Lahiri. IEEE TSE 50(9), 2024, pp.2254–2268. [Paper](https://arxiv.org/abs/2404.10100v2); [DOI](https://doi.org/10.1109/TSE.2024.3428972); [artifact](https://github.com/microsoft/TiCoder). Full text consulted.

TiCoder asks the user about tests to refine and rank generated programs. The abstract describes a “mixed methods user study with 15 programmers”. Its larger benchmark evaluation is separate, “using an idealized proxy for a user feedback” (abstract, PDF p.1). **Relevance:** acceptance/rejection of concrete cases can clarify intent with less logic knowledge. **Inference:** automated answers from a gold solution are not evidence of real stakeholder clarification quality; tests should expose competing interpretations rather than ask the user to debug large programs.

<a id="p24"></a>

**P24. ClarifyGPT: A Framework for Enhancing LLM-Based Code Generation via Requirements Clarification.** Fangwen Mu, Lin Shi, Song Wang, Zhuohao Yu, Binquan Zhang, Chenxue Wang, Shichao Liu, Qing Wang. PACMSE / FSE, 2024. [DOI](https://doi.org/10.1145/3660810); [author final PDF](https://linshi-website.github.io/paper/ClarifyGPT.pdf); [earlier preprint](https://arxiv.org/abs/2310.10996).

The earlier preprint is titled *Empowering LLM-Based Code Generation with Intention Clarification*. Its abstract says “identify ambiguous requirements and ask targeted clarifying questions”. The framework detects disagreement between candidate programs on generated tests and asks questions to refine the requirement (§3). The final and early versions have different evaluation populations; I do not mix their headline results. **Relevance:** a way to prioritize ambiguity questions. **Inference:** agreement among candidates cannot establish that an ambiguous description has only one intended meaning; models may share the same assumption.

<a id="p25"></a>

**P25. Supporting Stakeholder Requirements Expression with LLM Revisions: An Empirical Evaluation.** Michael Mircea, Emre Gevrek, Elisa Schmid, Kurt Schneider. arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2601.16699). Full text consulted.

Participants expressed requirements, then assessed generated revisions. Abstract: “26 participants who produced 130 requirement statements” (abstract, PDF p.1); their ratings cover “perceived completeness, clarity, and alignment” (abstract, PDF p.1). **Relevance:** clarification interfaces need evaluation with actual people and attention to preservation of intent. **Inference:** perceived clarity and completeness are not formal semantic completeness, and a fluent revision may still change an unrecognized requirement. This study contributes a human outcome measure, not a proof oracle.

<a id="p26"></a>

**P26. Collaborative and AI-Supported Requirements Elicitation: An Empirical Study.** Manoel Salgado Neto, Allan Araujo, Ronnie de Souza Santos. arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2606.24060). Full text consulted.

This compares elicitation approaches, including direct AI use and stakeholder collaboration with AI synthesis. Abstract: “approaches combining stakeholder collaboration and AI-supported synthesis produced the highest-rated requirements artifacts” (abstract, PDF p.1). Requirements are assessed using quality criteria and participant experience (§3–§5). **Relevance:** elicitation can involve stakeholders negotiating and correcting the interpretation, rather than an LLM unilaterally rewriting a prompt. **Inference:** artifact ratings cannot establish formal guarantee strength or replace behavioral validation with the affected users.

### Natural language to temporal logic and TLA+

<a id="p27"></a>

**P27. nl2spec: Interactively Translating Unstructured Natural Language to Temporal Logics with Large Language Models.** Matthias Cosler, Christopher Hahn, Daniel Mendoza, Frederik Schmitt, Caroline Trippel. CAV, 2023. [Paper](https://arxiv.org/abs/2303.04864); [DOI](https://doi.org/10.1007/978-3-031-37703-7_18); [artifact](https://github.com/realChrisHahn2/nl2spec). Full text consulted.

The tool keeps a dictionary connecting language fragments to temporal subformulas; users edit the local interpretation and iterate. The conclusion says “interactively formalize unstructured and ambigous natural language” (PDF p.11, spelling as printed). **Relevance:** a useful interface for exposing what a generated formula means. **Inference:** textual explanations and generation consistency are not calibrated guarantees of semantic correctness; a user needs small accepted/rejected behaviors and definitions of atomic propositions too.

<a id="p28"></a>

**P28. Bridging Natural Language and Formal Specification — Automated Translation of Software Requirements to LTL via Hierarchical Semantics Decomposition Using LLMs (Req2LTL).** Zhi Ma, Cheng Wen, Zhexin Su, Xiao Liang, Cong Tian, Shengchao Qin, Mengfei Yang. ASE, 2025, pp.1208–1220. [Paper](https://arxiv.org/abs/2512.17334); [DOI](https://doi.org/10.1109/ASE63991.2025.00104); [artifact](https://github.com/Meng-Nan-MZ/Req2LTL). Full text consulted.

Req2LTL separates semantic decomposition in an intermediate language from rule-based construction of LTL. **Evaluation caveat:** its binary accuracy compares formula strings “without normalization or semantic equivalence checking” (§III, PDF p.8), although the abstract describes semantic translation accuracy. **Relevance:** decomposition can make complex temporal structure easier to inspect. **Inference:** exact-string accuracy penalizes equivalent alternatives and does not directly measure intended meaning; use a semantic comparison or behavior witnesses for the proposed project.

<a id="p29"></a>

**P29. Automated LTL Specification Generation from Industrial Aerospace Requirements (AeroReq2LTL).** Zhi Ma, Xiao Liang, Cheng Wen, Rui Chen, Bin Gu, Shengchao Qin, Cong Tian, Mengfei Yang. FM, 2026. [Publisher](https://link.springer.com/chapter/10.1007/978-3-032-26220-2_33); [Paper](https://arxiv.org/abs/2604.21715). Full text consulted.

This adds a domain data dictionary and controlled requirement templates before LTL translation. Abstract: “85% precision and 88% recall” (abstract, PDF p.1). The evaluation compares with expert formalizations of aerospace requirements, allowing proposition renaming but requiring intended logical and temporal structure (§4.2–§4.3). It distinguishes correct, wrong, missing, and spurious properties. **Relevance:** resolving what propositions mean is part of translation; some requirements should yield no temporal property. **Inference:** one industrial domain and an overlapping author group with Req2LTL do not establish generality to distributed-service intent.

<a id="p30"></a>

**P30. Can LLMs Write Correct TLA+ Specifications? Evaluating Natural-Language-to-TLA+ Generation.** Arslan Bisharat, Brian Ortiz, Eric Spencer, Khushboo Bhadauria, TaiNing Wang, George K. Thiruvathukal, Konstantin Läufer, Mohammed Abuhamad. ICSOFT, 2026, pp.39–50. [Paper](https://arxiv.org/abs/2606.05792); [DOI](https://doi.org/10.5220/0015070400004088). Existing local PDF consulted.

The initial collection is larger than the evaluated subset: preprocessing “yields 26 usable test specifications” (§3, PDF p.4). Generated TLA+ is checked with SANY and TLC. The authors separate infrastructure failures, including “Module Not Found,” from behavioral failures (Table 3, PDF p.5). **Relevance:** parser success, a configured model-checking run, and faithful intent translation are separate outcomes. **Inference:** the headline TLC rate is sensitive to configuration and execution plumbing; it should not be read as pure semantic-equivalence accuracy or proof of an unbounded system.

<a id="p31"></a>

**P31. TLA+-Bench: An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA+ Specification Generation.** Arslan Bisharat, Eric Spencer, Brian Ortiz, Khushboo Bhadauria, Mujtaba Nazari, Beatriz Santos, Anisa Ramos, TaiNing Wang, George K. Thiruvathukal, Konstantin Läufer, Mohammed Abuhamad. arXiv preprint, July 2026. [Paper](https://arxiv.org/abs/2607.23425); [artifact](https://github.com/LUC-AI4FM/tla_benchmark/tree/reviewer-release). Full text consulted. A future conference template in the PDF does not establish publication there.

Gold specifications have fixed executable configurations; silver examples are parse-only. Grading choices on fixed model outputs move correctness “from 10.0% to 1.7%” (abstract, PDF p.1). The study examines interface names, oracle settings, and stricter checks including vacuity (§4–§7). **Relevance:** preserve configurations and property names, and record how grading rejects trivial specifications. **Inference:** exhaustive checking within a finite configured model is exact for those checks, not equivalence with the original intent or an unbounded liveness theorem. A generated transition relation can admit too little behavior while passing stated invariants.

<a id="p32"></a>

**P32. From Informal to Formal — Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs.** Jialun Cao, Yaojie Lu, Meiziniu Li, Haoyang Ma, Haokun Li, Mengda He, Cheng Wen, Le Sun, Hongyu Zhang, Shengchao Qin, Shing-Chi Cheung, Cong Tian. ACL, 2025, pp.26984–27003. [Paper](https://aclanthology.org/2025.acl-long.1310/). Full text consulted.

The work assembles FM-Alpaca data and separates formal-method tasks across “Coq, Lean4, Dafny, ACSL, and TLA+” (§3). Task-specific evaluation is useful for locating whether translation, annotations, or proving failed. Some descriptions are derived from existing formal artifacts and model-generated explanations (§3). **Relevance:** broader language/task coverage than a single code benchmark. **Inference:** reverse-generated descriptions may already encode a chosen formal interpretation, making this easier than discovering requirements missing from vague stakeholder intent.

<a id="p33"></a>

**P33. Grounding Complex Natural Language Commands for Temporal Tasks in Unseen Environments (Lang2LTL).** Jason Xinyu Liu, Ziyi Yang, Ifrah Idrees, Sam Liang, Benjamin Schornstein, Stefanie Tellex, Ankit Shah. CoRL, 2023, PMLR 229, pp.1084–1110. [Paper](https://proceedings.mlr.press/v229/liu23d.html); [artifact](https://github.com/h2r/Lang2LTL). Full text consulted.

Lang2LTL separates referring expressions and landmarks from the temporal formula, then reconnects them to the environment. Abstract: “ground temporal navigational commands to LTL specifications”. The experiments include navigation in new environments and physical robot demonstrations (§4). **Relevance:** the formula can be structurally right while its predicates refer to the wrong object. **Inference:** distributed-system propositions need equally explicit grounding, such as distinguishing accepted, committed, persisted, and observed operations. Navigation success does not establish general software-contract completeness.

<a id="p34"></a>

**P34. Grammar-Forced Translation of Natural Language to Temporal Logic using LLMs (GraFT).** William H. English, Dominic Simon, Sumit Kumar Jha, Rickard Ewetz. ICML, 2025, PMLR 267, pp.15370–15383. [Paper](https://proceedings.mlr.press/v267/english25a.html). Full text consulted.

GraFT constrains decoding during proposition grounding and temporal translation. Abstract: “restricting the set of valid output tokens”. Grammar restrictions and a limited candidate vocabulary reduce the translation search space (§3). **Relevance:** useful for reliably producing a well-formed intermediate language or temporal formula after clarification. **Inference:** grammatical correctness cannot discover missing requirements or determine whether a temporal operator expresses the user’s chosen meaning. Its translation datasets should not be substituted for a distributed-system spec audit.

### Choosing top-level distributed guarantees and trusted boundaries

<a id="p35"></a>

**P35. Linearizability: A Correctness Condition for Concurrent Objects.** Maurice P. Herlihy, Jeannette M. Wing. ACM TOPLAS 12(3), 1990, pp.463–492. [DOI](https://doi.org/10.1145/78969.78972); [Author-hosted PDF](https://cs.brown.edu/~mph/HerlihyW90/p463-herlihy.pdf). Full text consulted.

Abstract: each operation “takes effect instantaneously at some point between its invocation and its response”. The concurrent history must match an allowed sequential object history and preserve order between nonoverlapping operations (§3). **Relevance:** gives a reusable shape for a service’s safety theorem, but the sequential object semantics must still be chosen. **Inference:** this ordering condition alone is not a promise that requests finish, data survives crashes, or two retries count as one application operation. State those obligations and identities separately.

<a id="p36"></a>

**P36. IronFleet: Proving Practical Distributed Systems Correct.** Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob R. Lorch, Bryan Parno, Michael L. Roberts, Srinath Setty, Brian Zill. SOSP, 2015. [Paper](https://www.microsoft.com/en-us/research/publication/ironfleet-proving-practical-distributed-systems-correct/); [source](https://github.com/microsoft/Ironclad/tree/master/ironfleet). Local full text consulted.

IronFleet proves refinement through a distributed protocol to a small high-level state machine and uses Dafny Hoare reasoning for the implementation. Progress is separate and assumes appropriate fairness, timing, and surviving hosts (§4). IronRSL proves eventual replies when a client repeatedly sends its request to all replicas, under eventual synchrony/live-quorum assumptions; IronKV’s progress theorem concerns reliable message delivery under fair network behavior, not termination of every application request. Figure 12 and §7.1 report high-level specs of “85 SLOC” and “34,” measured in source lines of code, and total methodology/system effort of “approximately 3.7 person-years”. **Relevance:** keep the trusted top specification simple enough to inspect, then audit omissions as in P01.

<a id="p37"></a>

**P37. Verdi: A Framework for Implementing and Verifying Distributed Systems.** James R. Wilcox, Doug Woos, Pavel Panchekha, Zachary Tatlock, Xi Wang, Michael D. Ernst, Thomas Anderson. PLDI, 2015, pp.357–368. [Project](https://verdi.uwplse.org/); [source](https://github.com/uwplse/verdi). Local full text consulted.

Verdi uses Coq network semantics and verified system transformers to preserve guarantees when adding mechanisms such as sequence numbering and replication. For Raft, the paper proves state-machine safety implies linearizability but states: “our proof of state machine safety is still in progress” (§7, p.365). **Relevance:** do not silently treat a conditional theorem as a completed end-to-end implementation proof. The framework separates fault-model assumptions and transformer guarantees; the original paper focuses on safety rather than liveness. Later Verdi results must be cited separately when claiming the completed Raft proof.

<a id="p38"></a>

**P38. Anvil: Verifying Liveness of Cluster Management Controllers.** Xudong Sun, Wenjie Ma, Jiawei Tyler Gu, Zicheng Ma, Tej Chajed, Jon Howell, Andrea Lattuada, Oded Padon, Lalith Suresh, Adriana Szekeres, Tianyin Xu. OSDI, 2024, pp.649–666. [Paper](https://www.usenix.org/conference/osdi24/presentation/sun-xudong); [source](https://github.com/anvil-verifier/anvil/tree/osdi24). Local full text consulted.

Anvil formalizes eventually-stable reconciliation (ESR): once the desired state persists, the cluster eventually matches it and continues to match. The theorem needs fairness, compatible environmental actions, and a fault assumption: “an arbitrary number of faults can happen, but eventually faults stop happening” (§1, p.650). It verifies ZooKeeper, RabbitMQ, and FluentBit controllers using temporal logic embedded in Verus; RabbitMQ also has a specific no-scale-down safety property (§6). **Relevance:** a strong example of turning an informal controller expectation into a quantified progress theorem with explicit environment assumptions. ESR alone does not rule out all unwanted intermediate states (§8).

<a id="p39"></a>

**P39. TLA+ chapter in Software Specification Methods: An Overview Using a Case Study.** Leslie Lamport; volume edited by Henri Habrias and Marc Frappier. Hermes/Lavoisier, 2006, chapter 7. [Author PDF](https://lamport.org/pubs/spec-book-chap.pdf). Full text consulted, especially §7.2–§7.3.

Lamport writes: “There is no such thing as the specification of a system” (§7.2, p.123 / PDF p.6). To begin choosing atomicity, he suggests “writing a single correct behavior of the system” (§7.3, p.124 / PDF p.7). The chapter develops different abstractions of an invoicing problem. **Relevance:** experts select a specification by the question it should answer and the observations it should expose. **Inference:** ask an agent for explicit alternative abstractions and a sample behavior before asking it to produce a large TLA+ module.

<a id="p40"></a>

**P40. End-To-End Arguments in System Design.** Jerome H. Saltzer, David P. Reed, David D. Clark. ACM TOCS 2(4), 1984, pp.277–288; earlier conference version, 1981. [Author PDF](https://web.mit.edu/Saltzer/www/publications/endtoend/endtoend.pdf). Existing local full text consulted.

On functions such as reliable delivery and duplicate suppression, the authors write: “only with the knowledge and help of the application standing at the endpoints” (§1, p.278). Lower layers can help, but the application’s desired outcome determines where a complete check belongs. **Relevance:** choose the theorem boundary at the outcome the human actually cares about. **Inference:** transport delivery, replicated-log order, and successful database writes can each fall short of a payment or workflow guarantee; a proof chain should expose the remaining application obligations.

<a id="p41"></a>

**P41. Multi-Grained Specifications for Distributed System Model Checking and Verification.** Lingzhi Ouyang, Xudong Sun, Ruize Tang, Yu Huang, Madhav Jivrajani, Xiaoxing Ma, Tianyin Xu. EuroSys, 2025. [DOI](https://doi.org/10.1145/3689031.3696069); [Author PDF](https://tianyin.github.io/pub/mspec.pdf); [spec source](https://github.com/Disalg-ICS-NJU/zookeeper-tla-spec); [Remix checker](https://github.com/Lingzhi-Ouyang/Remix). Local full text consulted.

The work refines coarse protocol actions into detailed actions for concurrency and validates model behavior against implementation executions. Abstract: “six severe bugs that violate five types of invariants” (abstract, PDF p.1). Mixing specification detail makes model checking more practical while retaining relevant concurrency (§3–§5). **Relevance:** even a good top-level specification needs a checked relationship to implementation behavior. **Inference:** implementation conformance and model-checked fixes do not independently validate the chosen client guarantee or prove unbounded liveness.

<a id="p42"></a>

**P42. Partial Contracts Suffice: Sound, LLM-Inferred Regression Verification.** Yiannis Charalambous, Rafael Menezes, Youcheng Sun, Lucas C. Cordeiro. arXiv preprint, July 2026. [Paper](https://arxiv.org/abs/2607.10291). Full text consulted.

This asks whether “a partial, caller-sufficient contract” is enough (abstract, PDF p.1). Contracts are enforced against the old program and used to prove a property-relative regression relation with the new program. A callee may leave an output field unspecified when the caller’s target property does not observe it (Figure 1; §II–§IV). **Relevance:** strength is relative to the intended theorem; complete behavior extraction is sometimes unnecessary. **Inference:** use this modularly beneath an independently chosen top-level guarantee, rather than treating caller sufficiency as evidence that all stakeholder requirements were found.

### Requirements methods predating LLMs

<a id="p43"></a>

**P43. Four Dark Corners of Requirements Engineering.** Pamela Zave, Michael Jackson. ACM TOSEM 6(1), 1997, pp.1–30. [DOI](https://doi.org/10.1145/237432.237434); [Open teaching copy](https://www.cse.msu.edu/~chengb/RE-491/Papers/dark-corners-re-zave-jackson.pdf). Full text consulted.

The authors distinguish desired facts about the environment, facts assumed about it, and behavior enforceable at the machine/environment interface. Their refinement obligation is that specification and domain knowledge together imply requirements (§5, p.19). §1 describes “refinement of requirements to implementable specifications”. **Relevance:** a formal specification can control only what the software can observe and affect. **Inference:** represent sensing, external APIs, crash recovery, and human actions as explicit domain assumptions; proving software correct cannot establish those assumptions by itself.

<a id="p44"></a>

**P44. Property Specification Patterns for Finite-State Verification.** Matthew B. Dwyer, George S. Avrunin, James C. Corbett. FMSP, 1998, pp.7–15. [DOI](https://doi.org/10.1145/298595.298598); [Open teaching PDF](https://www.cs.colostate.edu/~france/CS614/Readings/Readings2011/propPatterns1-p7-dwyer.pdf). Full text consulted.

The paper supplies reusable patterns and scopes for properties such as absence, response, and precedence, with mappings to formal languages. It observes that users must be “expert enough to accurately express the requirements” (§1, p.8). **Relevance:** pattern libraries can reduce notation work after the behavior and its scope are chosen. **Inference:** a pattern cannot tell the agent which guarantee the human omitted, and scope/end-of-execution choices remain meaningful. P45 develops those choices explicitly.

<a id="p45"></a>

**P45. PROPEL: An Approach Supporting Property Elucidation.** Rachel L. Smith, George S. Avrunin, Lori A. Clarke, Leon J. Osterweil. ICSE, 2002, pp.11–21. [DOI](https://doi.org/10.1145/581339.581345); [Author technical report](https://web.cs.umass.edu/publication/docs/2001/UM-CS-2001-046.pdf). Author report consulted; saved PDF is the report, not typeset proceedings.

PROPEL presents patterns as both disciplined natural language and finite-state automata. It exposes alternatives, rather than hiding a subtle semantic decision inside a template: “alternative options that are explicitly shown to the specifier” (§1, report p.1). Examples distinguish repeated occurrences, response obligations, and scope boundaries (§3–§5). **Relevance:** a particularly direct predecessor for intent clarification through semantic choices. **Inference:** an LLM could propose the questions and examples, while an automaton or formula maintains a precise meaning behind each choice.

<a id="p46"></a>

**P46. Goal-Oriented Requirements Engineering: A Guided Tour.** Axel van Lamsweerde. IEEE RE, 2001, pp.249–263. [Author PDF](https://webperso.info.ucl.ac.be/~avl/files/RE01.pdf); [DOI](https://doi.org/10.1109/ISRE.2001.948567). Full text consulted, especially §2 and §5.

Goals are refined into smaller obligations and assigned to software or environmental actors; obstacles and conflicts help discover missing requirements. A specification is “complete with respect to a set of goals” when the goals follow from it and the domain properties (§2, PDF p.2). **Relevance:** “complete” has a target: the selected goals. Refinement correctness, consistency, operationalization, and environmental responsibility are separate checks. **Inference:** agents should retain the goal graph and failed-obstacle scenarios, while the stakeholder validates whether the goal set itself captures the desired outcome.

### Additional tools, not counted as papers

**T01. Kiro specs, Analyze Requirements, and Correctness with Property-Based Tests.** AWS / Kiro team. Living product documentation, checked October 2026. [Requirements analysis](https://kiro.dev/docs/specs/analyze-requirements/); [Correctness](https://kiro.dev/docs/specs/correctness/); [Specs](https://kiro.dev/docs/specs/).

Kiro organizes requirements, design, and implementation tasks; its analysis asks about “logical inconsistencies, ambiguities, and gaps” (Analyze Requirements). Current correctness documentation includes extraction of executable properties from EARS requirements (a standard sentence structure for requirements) and property-based testing. It explicitly says: “It provides evidence of correctness, not a proof” (Correctness, “Strengths and limitations,” page updated August 4, 2026). **Relevance:** an existing product workflow for clarification and traceability, not a demonstrated formal guarantee of faithful intent translation. **Inference:** generated properties need the same strength checks as generated contracts; passing tests derived from a wrong requirement can preserve the wrong behavior.

**T02. TLAiBench.** TLA+ community contributors / `tlaplus` GitHub organization. Public benchmark repository, checked October 2026. [Repository](https://github.com/tlaplus/TLAiBench).

The repository supplies natural-language-to-TLA+ tasks and material for evaluating generated specifications. Its README describes a “dataset and benchmark suite” for the task; treat the checked-out tasks and grading instructions as the reproducibility artifact rather than assuming a single stable published score. **Relevance:** another source of tasks and instructions to compare with TLA+-Bench. **Inference:** benchmark configurations, permitted edits, and whether a model can weaken the checked property must be recorded before using a reported success rate. This entry is repository-level coverage, not a full reproduction.

## Appendix B: Concrete systems and theorem scope

This table supports comparison of published guarantee scope and reported proof effort; it is not a ranking by lines of code. These rows distinguish completed guarantees from conditional proofs and specification/model audits. P-numbers identify the full bibliographic entry above; repositories are linked in each row. Sizes are from the quoted table or figure, in its original units. LOC means lines of code; SLOC means source lines of code. Those papers use different counting conventions. “Not extracted” means I am not supplying a number, not that no number exists anywhere.

| Problem and source | Guarantee, tool, and authors | Size and effort evidence |
|---|---|---|
| IronRSL, [P36](#p36); [source](https://github.com/microsoft/Ironclad/tree/master/ironfleet) | Hawblitzel et al.; Dafny. Refinement to a sequential state machine; reply progress for repeatedly submitted requests under eventual synchrony and a live quorum. [P01](#p01) audits omitted application request deduplication. | High-level spec: “85 SLOC” (§7.1). Figure 12 implementation row: “6 2941 7535” = spec / executable / proof SLOC at that layer. Total effort shared with IronKV and framework: “approximately 3.7 person-years” (§7.1). |
| IronKV, [P36](#p36); [source](https://github.com/microsoft/Ironclad/tree/master/ironfleet) | Hawblitzel et al.; Dafny. Sharded-store state-machine refinement. Liveness includes reliable message transmission under fair delivery; do not inflate this to all operations eventually terminating. | High-level spec: “34” (§7.1). Figure 12 implementation row: “6 1340 2937”. The shared effort above is not a per-system estimate. |
| Verdi primary-backup key-value store, [P37](#p37); [source](https://github.com/uwplse/verdi) | Wilcox et al.; Coq. Transformer preserves the underlying store’s trace behavior under its fault semantics; put replies correctly reflect the put (§6). | Table 2, p.366: KV “41 138 337”; primary-backup “20 134 1155”; composition “5 N/A 19” = spec / implementation / proof LOC, including blanks/comments. Human effort not extracted. |
| Verdi Raft, [P37](#p37); [source](https://github.com/uwplse/verdi) | Wilcox et al.; Coq. **Conditional result in the 2015 paper:** Raft state-machine safety implies linearizability; the state-machine safety proof was still in progress (§7). No general liveness theorem in this source. | Table 2: “170 520 4144” = spec / implementation / proof LOC for Raft linearizability. This is not the size of a completed end-to-end Raft proof. Human effort not extracted. |
| ZooKeeper controller, [P38](#p38); [source](https://github.com/anvil-verifier/anvil/tree/osdi24) | Sun et al.; Verus with embedded temporal logic. ESR for desired ZooKeeper state, subject to fault/fairness assumptions and trusted external ZooKeeper API. | Table 1, p.660: “950 1134 8352” = trusted / executable / proof source lines. §7.1: each controller around “2.5 person-months” to implement and verify. Shared library/model costs are additional. |
| RabbitMQ controller, [P38](#p38); [source](https://github.com/anvil-verifier/anvil/tree/osdi24) | Sun et al.; Verus. ESR plus a controller-specific safety guarantee preventing replica-count decrease, including interference from garbage collection (§6.2). | Table 1: “548 1598 7228”. Same stated per-controller effort. |
| FluentBit controller, [P38](#p38); [source](https://github.com/anvil-verifier/anvil/tree/osdi24) | Sun et al.; Verus. ESR for managed logging daemons; added features require corresponding proof repairs (§6.3). | Table 1: “828 1208 8395”. Same stated per-controller effort. |
| Chapar photo client, audited in [P01](#p01); [source](https://github.com/rocq-community/chapar) | Fonseca et al. audit Lesani et al.’s Coq/model-checking system. Client causal-consistency assertion mistakenly checked a post, leaving the photo obligation uncovered (§5). This row records a specification defect, not a newly proved theorem. | The supporting quotation is the client assertion discussion in [P01](#p01). Size/effort not extracted. |
| QBFT, audited in [P02](#p02); [source](https://github.com/Consensys/qbft-formal-spec-and-verification) | Goldweber et al.; Dafny. Declared safety property: “Blockchain Consistency”. Tests expose incorrectly restricted and underspecified adversary behavior (§5.2.2). This is an audit of the existing model/proof. | Table 4, p.886: AdversaryNext target / full proof+implementation LOC: “48 15071.” The target size is not the whole specification size. Audit effort not extracted. |
| Distributed Validator Technology (DVT), audited in [P02](#p02); [source](https://github.com/Consensys/distributed-validator-formal-specs-and-verification) | Goldweber et al.; Dafny. Declared guarantee: “non-slashable attestation”. Mutation and test proofs expose incorrect assumptions about adversary-created attestations (§5.3.2). | Table 4: AdversaryNext target / full proof+implementation LOC: “23 24747.” Audit effort not extracted. |
| TrueSat, audited in [P02](#p02); [source](https://github.com/andricicezar/truesat) | Goldweber et al. audit Andrici and Ciobâcă’s Dafny SAT solver. Constructor/Start contracts omit dependencies or output fields, allowing incorrect replacements to verify (Table 3, §5.1). | Size/effort not extracted. This is contract auditing, not a new claim of solver correctness. |
| Eth2.0, audited in [P02](#p02); [source](https://github.com/Consensys/eth2.0-dafny/tree/master) | Goldweber et al.; Dafny. The on_block contract leaves output fields unconstrained (Table 3, §5.1). The audit addresses that contract omission; no whole-protocol liveness result is claimed here. | Size/effort not extracted. |
| daisy-nfsd, audited in [P02](#p02); [source](https://github.com/mit-pdos/daisy-nfsd) | Goldweber et al. audit Chajed et al.’s Dafny NFS API contracts. GETATTR/WRITE could permit an implementation to “always return an error” (§5.3.2, p.887). | Table 4: GETATTR target / proof+implementation LOC: “4 18”; WRITE: “7 54.” These are method-level counts, not complete file-system size. Audit effort not extracted. |
| AWS Encryption SDK for Dafny, audited in [P02](#p02); [source](https://github.com/aws/aws-encryption-sdk-dafny) | Goldweber et al.; Dafny. Encrypt/Decrypt outputs are too weakly constrained, allowing a replacement returning a “zero byte” regardless of input (§5.1, p.883). | Size/effort not extracted. The audit concerns the reference SDK’s top contracts, not breaking the cryptographic algorithm. |
| Arm CCA RMM, audited in [P03](#p03); [Scope artifact](https://github.com/islet-project/scope) | Choi et al.; Verus/SMT. Checks agreement of application binary interface (ABI) conditions, dependencies, and state transitions; it does not prove all RMM implementation properties. | No total source/proof size or human effort extracted. Discovery count quoted in [P03](#p03). |
| Arm v8-M architecture, audited in [P04](#p04); [author project](https://alastairreid.github.io/papers/OOPSLA_17/) | Reid; SMT/formal models. Detailed behavior checked against independently reviewable high-level security requirements. | No public complete source repository located; size/effort not extracted. Bug count quoted in [P04](#p04). |
| ZooKeeper concurrency and protocol models, [P41](#p41); [spec](https://github.com/Disalg-ICS-NJU/zookeeper-tla-spec), [Remix](https://github.com/Lingzhi-Ouyang/Remix) | Ouyang et al.; TLA+/PlusCal and model checking with execution validation. Checks invariants in models of protocol and detailed concurrency and validates fixes. | No complete spec/proof/code/effort tuple extracted. Model-checked invariant results are not an unbounded implementation liveness proof. |

Anvil’s “Trusted” table column includes verified theorem statements as well as assumptions and unverified implementation; it is not synonymous with unchecked executable code (Table 1 caption). The three size quotations and effort above, together with the fault-assumption excerpt in P38, use the same paper’s short excerpt allowance. IronFleet’s implementation-layer numbers omit protocol and library proof costs; Figure 12 gives the full decomposition.

## Appendix C: Search coverage and gaps

Prepared 6 October 2026 PDT / 7 October 2026 UTC; research cutoff: 7 October 2026 UTC. This review covers **46 papers and two additional tools**, with **27 new PDFs saved** in the paper collection. Preprints are identified as such. The collection already held the central systems papers; I read those local copies. The PDF inventory at the end links each downloaded paper; versions are stated in the relevant entries. Download source notes include checksums. Page references mean printed pages where available; “PDF p.” means the page counted from the first PDF page.


I searched web results, author and publisher pages, USENIX, arXiv, ACL Anthology, PMLR, official repositories, and local collection contents. Searches included the user’s named sources plus combinations of *specification correctness / strength / mutation / auditing / soundness / completeness*, *intent formalization*, *requirements clarification*, *natural language LTL/TLA+*, *linearizability / refinement / reconciliation*, and explicit 2025–2026 filters. Direct PDF downloads and local `pdftotext` supplied the substantive reading.

Backward references followed include IronSpec → Fonseca, Knüppel, and Reid; specification benchmarks → nl2postcond, Lahiri, Clover, and VeriAct; nl2spec/Req2LTL → temporal patterns, Lang2LTL, and GraFT; requirements elicitation → PROPEL, Zave/Jackson, and goal-oriented requirements. Forward discovery used title/author searches with 2025–2026 terms, including IronSpec → Scope/MutDafny and specification evaluation → SpecGym/VeriSpecGen/SpecRL. These are reference and forward-title searches, **not an exhaustive “cited by” graph**. Google Scholar and API retrieval attempts did not yield a reliable complete citation traversal; no citation counts are used as evidence.

Representative exact queries from this session (7 October 2026 UTC), with the primary result retained:

| Query | Primary result / use |
|---|---|
| `"Sanity Checks in Formal Verification" Kupferman 2006` | Hebrew University author record; P08 abstract-only coverage |
| `"Multi-Grained Specifications" EuroSys 2025 github` | Author paper and public spec/Remix repositories; P41 |
| `"Four Dark Corners" DOI 1997` | DOI confirmed, then open full text consulted; P43 |
| `"AeroReq2LTL" "2026"` and `AeroReq2LTL "10.1007/978-3-032-26220-2_33"` | Springer chapter confirms FM2026; P29 |
| `"PROPEL" "property" "Smith" "Avrunin" 2002` | Proceedings metadata and author report; P45 |
| `Lang2LTL grounding language temporal logic robot 2023 2025` | PMLR Lang2LTL and ICML2025 GraFT; P33–P34. Lang2LTL-2 retained as an unassessed lead. |
| `"CLEVER" "Curated Benchmark" 2026 ICLR` | NeurIPS2025 proceedings found; corrected venue rather than assuming ICLR. P18 |
| `Chapar Lesani Bell Falcone github` and `"Chapar" "github.com" causal` | Rocq-community verified-store repository; unrelated API-testing project rejected. |
| `TrueSAT Dafny github Andric` and `daisy nfsd github Dafny spec MIT` | Original repositories for separate P02 audited-system rows. |

This is a representative log, not a saved transcript of every query. The failed direct DBLP/arXiv-API routes and incomplete cited-by access did not supply assessment evidence. Unversioned live links record the source checked on this date; saved PDF checksums identify the exact downloaded bytes. Repository experiments were not rerun.

The central unresolved gap is an evaluated agent that starts with genuinely vague distributed-system intent, elicits the missing domain and fault assumptions, independently audits a sufficiently strong safety-and-liveness specification, and completes an executable-system proof. The pieces above cover parts of that chain. I found no source establishing the whole chain for arbitrary systems.

Other gaps:

- Open full PDFs were not obtained for P06–P09. Their entries use primary abstracts and make no numerical evaluation claims.
- P24’s saved PDF is the earlier preprint; the final author PDF and publication record were checked online. Results across those versions must not be mixed.
- Later completed Verdi Raft proofs are a separate follow-up to P37. The row here deliberately records what the 2015 source actually proves; it is not a claim that later Verdi Raft work remained incomplete.
- The numerical size/effort database is incomplete outside IronFleet, Verdi, and Anvil. Missing numbers are marked, rather than estimated.
- Most contract benchmarks involve finite functions, known code, or reverse-generated descriptions. They offer limited evidence about discovering omitted requirements, nondeterminism, or infinite fault histories.
- Robot and aerospace temporal translation provide domain grounding examples; they do not establish general distributed-system specification completeness.
- Additional leads include the local *An Empirical Study of LLM-Generated Specifications for VeriFast* (2026), *Verifying Verified Code* (2022), KAOS obstacle-analysis papers, Lang2LTL-2, and later requirements-completion studies. These are not included in the paper count because I did not complete the same source assessment.

Delivery note: the separate personal-notes copy remains unmet because that directory is outside the writable roots.

## Appendix D: PDF inventory

The following inventory is generated from the successful download manifests for this task. Existing local PDFs used for P01–P03, P14–P19, P30, P36–P38, P40–P41 were read without redownloading. Downloaded PDFs were checked for the `%PDF` signature. Local links below are direct to the collection; source URLs are recorded beside them. Each saved PDF has a sibling `source-provenance.md` containing its download URL/date and SHA-256 checksum. One technical-report version is explicitly identified above.

- [Automated LTL Specification Generation from Industrial Aerospace Requirements, Zhi Ma et al., FM, 2026](</hdd1/sichanghe/paper_collection/Automated LTL Specification Generation from Industrial Aerospace Requirements, Zhi Ma et al., FM, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2604.21715).
- [Bridging Natural Language and Formal Specification- Automated Translation of Software Requirements to LTL via Hierarchical Semantics Decomposition Using LLMs, Zhi Ma et al., ASE, 2025](</hdd1/sichanghe/paper_collection/Bridging Natural Language and Formal Specification- Automated Translation of Software Requirements to LTL via Hierarchical Semantics Decomposition Using LLMs, Zhi Ma et al., ASE, 2025/paper.pdf>) — [download source](https://arxiv.org/pdf/2512.17334).
- [Can Large Language Models Transform Natural Language Intent into Formal Method Postconditions, Madeline Endres, Sarah Fakhoury, Saikat Chakraborty, Shuvendu K. Lahiri, FSE, 2024](</hdd1/sichanghe/paper_collection/Can Large Language Models Transform Natural Language Intent into Formal Method Postconditions, Madeline Endres, Sarah Fakhoury, Saikat Chakraborty, Shuvendu K. Lahiri, FSE, 2024/paper.pdf>) — [download source](https://arxiv.org/pdf/2310.01831).
- [ClarifyGPT- Empowering LLM-based Code Generation with Intention Clarification, Fangwen Mu et al., arXiv, 2023](</hdd1/sichanghe/paper_collection/ClarifyGPT- Empowering LLM-based Code Generation with Intention Clarification, Fangwen Mu et al., arXiv, 2023/paper.pdf>) — [download source](https://arxiv.org/pdf/2310.10996).
- [Clover- Closed-Loop Verifiable Code Generation, Chuyue Sun, Ying Sheng, Oded Padon, Clark Barrett, SAIV, 2024](</hdd1/sichanghe/paper_collection/Clover- Closed-Loop Verifiable Code Generation, Chuyue Sun, Ying Sheng, Oded Padon, Clark Barrett, SAIV, 2024/paper.pdf>) — [download source](https://arxiv.org/pdf/2310.17807).
- [Collaborative and AI-Supported Requirements Elicitation- An Empirical Study, Manoel Salgado Neto, Allan Araujo, Ronnie de Souza Santos, arXiv, 2026](</hdd1/sichanghe/paper_collection/Collaborative and AI-Supported Requirements Elicitation- An Empirical Study, Manoel Salgado Neto, Allan Araujo, Ronnie de Souza Santos, arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2606.24060).
- [Evaluating LLM-driven User-Intent Formalization for Verification-Aware Languages, Shuvendu K. Lahiri, FMCAD, 2024](</hdd1/sichanghe/paper_collection/Evaluating LLM-driven User-Intent Formalization for Verification-Aware Languages, Shuvendu K. Lahiri, FMCAD, 2024/paper.pdf>) — [download source](https://arxiv.org/pdf/2406.09757).
- [Four Dark Corners of Requirements Engineering, Pamela Zave, Michael Jackson, TOSEM, 1997](</hdd1/sichanghe/paper_collection/Four Dark Corners of Requirements Engineering, Pamela Zave, Michael Jackson, TOSEM, 1997/paper.pdf>) — [download source](https://www.cse.msu.edu/~chengb/RE-491/Papers/dark-corners-re-zave-jackson.pdf).
- [From Informal to Formal- Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs, Jialun Cao et al., ACL, 2025](</hdd1/sichanghe/paper_collection/From Informal to Formal- Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs, Jialun Cao et al., ACL, 2025/paper.pdf>) — [download source](https://aclanthology.org/2025.acl-long.1310.pdf).
- [Goal-Oriented Requirements Engineering- A Guided Tour, Axel van Lamsweerde, RE, 2001](</hdd1/sichanghe/paper_collection/Goal-Oriented Requirements Engineering- A Guided Tour, Axel van Lamsweerde, RE, 2001/paper.pdf>) — [download source](https://webperso.info.ucl.ac.be/~avl/files/RE01.pdf).
- [Grammar-Forced Translation of Natural Language to Temporal Logic using LLMs, William H. English, Dominic Simon, Sumit Kumar Jha, Rickard Ewetz, ICML, 2025](</hdd1/sichanghe/paper_collection/Grammar-Forced Translation of Natural Language to Temporal Logic using LLMs, William H. English, Dominic Simon, Sumit Kumar Jha, Rickard Ewetz, ICML, 2025/paper.pdf>) — [download source](https://raw.githubusercontent.com/mlresearch/v267/main/assets/english25a/english25a.pdf).
- [Grounding Complex Natural Language Commands for Temporal Tasks in Unseen Environments, Jason Xinyu Liu et al., CoRL, 2023](</hdd1/sichanghe/paper_collection/Grounding Complex Natural Language Commands for Temporal Tasks in Unseen Environments, Jason Xinyu Liu et al., CoRL, 2023/paper.pdf>) — [download source](https://jasonxyliu.github.io/paper/lang2ltl_corl23.pdf).
- [Intent-aligned Formal Specification Synthesis via Traceable Refinement, Zhe Ye et al., arXiv, 2026](</hdd1/sichanghe/paper_collection/Intent-aligned Formal Specification Synthesis via Traceable Refinement, Zhe Ye et al., arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2604.10392).
- [KBSpec- LLM-driven Formal Specification Generation with Evolving Domain Knowledge Base, Wenhan Wang, Zeyu Sun, arXiv, 2026](</hdd1/sichanghe/paper_collection/KBSpec- LLM-driven Formal Specification Generation with Evolving Domain Knowledge Base, Wenhan Wang, Zeyu Sun, arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2606.21339).
- [LLM-Based Test-Driven Interactive Code Generation- User Study and Empirical Evaluation, Sarah Fakhoury, Aaditya Naik, Georgios Sakkas, Saikat Chakraborty, Shuvendu K. Lahiri, TSE, 2024](</hdd1/sichanghe/paper_collection/LLM-Based Test-Driven Interactive Code Generation- User Study and Empirical Evaluation, Sarah Fakhoury, Aaditya Naik, Georgios Sakkas, Saikat Chakraborty, Shuvendu K. Lahiri, TSE, 2024/paper.pdf>) — [download source](https://arxiv.org/pdf/2404.10100).
- [Linearizability- A Correctness Condition for Concurrent Objects, Maurice Herlihy, Jeannette M. Wing, TOPLAS, 1990](</hdd1/sichanghe/paper_collection/Linearizability- A Correctness Condition for Concurrent Objects, Maurice Herlihy, Jeannette M. Wing, TOPLAS, 1990/paper.pdf>) — [download source](https://cs.brown.edu/~mph/HerlihyW90/p463-herlihy.pdf).
- [MutDafny- A Mutation-Based Approach to Assess Dafny Specifications, Isabel Amaral, Alexandra Mendes, Jose Campos, ICSE, 2026](</hdd1/sichanghe/paper_collection/MutDafny- A Mutation-Based Approach to Assess Dafny Specifications, Isabel Amaral, Alexandra Mendes, Jose Campos, ICSE, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2511.15403).
- [PROPEL- An Approach Supporting Property Elucidation, Rachel L. Smith, George S. Avrunin, Lori A. Clarke, Leon J. Osterweil, ICSE, 2002](</hdd1/sichanghe/paper_collection/PROPEL- An Approach Supporting Property Elucidation, Rachel L. Smith, George S. Avrunin, Lori A. Clarke, Leon J. Osterweil, ICSE, 2002/paper.pdf>) — [download source](https://web.cs.umass.edu/publication/docs/2001/UM-CS-2001-046.pdf).
- [Partial Contracts Suffice- Sound, LLM-Inferred Regression Verification, Yiannis Charalambous, Rafael Menezes, Youcheng Sun, Lucas C. Cordeiro, arXiv, 2026](</hdd1/sichanghe/paper_collection/Partial Contracts Suffice- Sound, LLM-Inferred Regression Verification, Yiannis Charalambous, Rafael Menezes, Youcheng Sun, Lucas C. Cordeiro, arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2607.10291).
- [Property Specification Patterns for Finite-State Verification, Matthew B. Dwyer, George S. Avrunin, James C. Corbett, FMSP, 1998](</hdd1/sichanghe/paper_collection/Property Specification Patterns for Finite-State Verification, Matthew B. Dwyer, George S. Avrunin, James C. Corbett, FMSP, 1998/paper.pdf>) — [download source](https://www.cs.colostate.edu/~france/CS614/Readings/Readings2011/propPatterns1-p7-dwyer.pdf).
- [SpecRL- Reinforcement Learning with Test-Based Completeness Rewards for Formal Specification Synthesis, Zhechong Huang, Zhao Zhang, Zeyu Sun, Huifeng Sun, Yingfei Xiong, arXiv, 2026](</hdd1/sichanghe/paper_collection/SpecRL- Reinforcement Learning with Test-Based Completeness Rewards for Formal Specification Synthesis, Zhechong Huang, Zhao Zhang, Zeyu Sun, Huifeng Sun, Yingfei Xiong, arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2604.05820).
- [Supporting Stakeholder Requirements Expression with LLM Revisions- An Empirical Evaluation, Michael Mircea, Emre Gevrek, Elisa Schmid, Kurt Schneider, arXiv, 2026](</hdd1/sichanghe/paper_collection/Supporting Stakeholder Requirements Expression with LLM Revisions- An Empirical Evaluation, Michael Mircea, Emre Gevrek, Elisa Schmid, Kurt Schneider, arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2601.16699).
- [TLA+ Chapter in Software Specification Methods, Leslie Lamport, Hermes, 2006](</hdd1/sichanghe/paper_collection/TLA+ Chapter in Software Specification Methods, Leslie Lamport, Hermes, 2006/paper.pdf>) — [download source](https://lamport.org/pubs/spec-book-chap.pdf).
- [TLA+-Bench- An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA+ Specification Generation, Arslan Bisharat et al., arXiv, 2026](</hdd1/sichanghe/paper_collection/TLA+-Bench- An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA+ Specification Generation, Arslan Bisharat et al., arXiv, 2026/paper.pdf>) — [download source](https://arxiv.org/pdf/2607.23425).
- [Trustworthy Specifications of ARM v8-A and v8-M System Level Architecture, Alastair Reid, FMCAD, 2016](</hdd1/sichanghe/paper_collection/Trustworthy Specifications of ARM v8-A and v8-M System Level Architecture, Alastair Reid, FMCAD, 2016/paper.pdf>) — [download source](https://alastairreid.github.io/papers/fmcad2016-trustworthy.pdf).
- [Who Guards the Guards- Formal Validation of the Arm v8-M Architecture Specification, Alastair Reid, OOPSLA, 2017](</hdd1/sichanghe/paper_collection/Who Guards the Guards- Formal Validation of the Arm v8-M Architecture Specification, Alastair Reid, OOPSLA, 2017/paper.pdf>) — [download source](https://alastairreid.github.io/papers/oopsla2017-whoguardstheguards.pdf).
- [nl2spec- Interactively Translating Unstructured Natural Language to Temporal Logics with Large Language Models, Matthias Cosler et al., CAV, 2023](</hdd1/sichanghe/paper_collection/nl2spec- Interactively Translating Unstructured Natural Language to Temporal Logics with Large Language Models, Matthias Cosler et al., CAV, 2023/paper.pdf>) — [download source](https://arxiv.org/pdf/2303.04864).
