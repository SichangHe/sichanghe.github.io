# ATA: A Neuro-Symbolic Approach to Implement Autonomous and Trustworthy Agents
(authored by agents unless marked 🧑)
Tag: `peer2025ata`, [paper](https://arxiv.org/abs/2510.16381)

## architecture
Autonomous Trustworthy Agents (ATA) separates offline policy formalization from online input encoding and symbolic decision-making. The authors write, “The first block, knowledge ingestion, is responsible for translating an informal problem specification into a formal, symbolic knowledge base.” (Sec. 1, p.2) Experts can inspect and correct this knowledge base before runtime inputs are processed.

The demonstration is insurance claims processing using many-sorted first-order logic. A policy supplies the rules, and each claim supplies facts. The paper states, “The T&C document represents the informal specification while the claim is the input that needs to be processed.” (Sec. 1, p.3) The prover checks whether the rules and extracted facts entail coverage; a counterexample means coverage is not entailed.

## technique 1: one-time formalization of a policy
The paper's formalization procedure is:

1. Define sorts for domain entities and predicates for the policy. The offline signature contains no function symbols or constants; claim-specific constants are added online (Sec. 3.2, p.6; Sec. 3.2.1, pp.6–7).
2. Partition predicates into conditions and goals. Give each condition predicate a symbolic name and precise natural-language definition, including any contract-specific meaning. Goals such as `is_covered` represent outcomes (Sec. 3.2.1, p.7).
3. Encode policy rules as universally quantified implications. Each antecedent is a disjunction of conjunctions of condition literals; the consequent is a goal literal (Sec. 3.2.1, p.7).
4. Optionally have humans compare the formalization against the original policy and correct errors before processing claims. The authors write, “This one-time formalization step can optionally include verification and correction by human experts.” (Sec. 3, p.5)

The transpiler uses `gemini-2.5-pro` with a dynamic reasoning budget (Sec. 4.1, p.8). The correction experiment was conducted by the authors, who compared policy rules against their formalization without using dataset examples. They describe it as a proof of concept (Sec. 4.3, p.11).

Evidence: Table 3 (p.11) reports travel accuracy increasing from 72.94% to 87.17%, a 14.23 percentage-point gain. Its correction categories are missing clauses (+4.71), missing predicates (+4.82), and redefined ambiguous predicates (+4.70). Section 4.1 (p.8) describes 130 travel claims, but the paper does not explain how the reported percentages relate to that count or provide confidence intervals.

Limits: the authors acknowledge that automatic formalization may contain errors or hallucinations (Sec. 3.2.1, p.7). Human correction is optional, rather than an explicit requirement.

Inference: in Verus, policy predicates could become specification functions and rules could become proof lemmas over typed values. A reviewed policy module would separate reusable rules from request data. Proving consequences of that module would not establish that it faithfully represents the original policy.

## technique 2: typed claim axiomization
The input encoder uses the policy's existing sorts and predicates:

1. Run named entity recognition separately for each sort. Add a constant for each recognized entity; the paper's example creates `ALICE:Person` and `BOB:Person` (Sec. 3.2.2, p.7).
2. Run relation extraction separately for each predicate. Represent the claim as a conjunction of literal facts, such as `is_sister(ALICE, BOB)` (Sec. 3.2.2, p.7).
3. Use `gemini-2.5-flash` without reasoning for both tasks (Sec. 3.2.2, p.8).

The authors explain the intended isolation: “NER is executed for each sort individually in order to reduce the impact of changes i.e. if a sort is changed, added or removed, there is provably no impact on any other sort.” (Sec. 3.2.2, p.7) Relation extraction is similarly performed per predicate (p.7).

Evidence: Section 4.1 (p.8) describes travel, electronics, and dental datasets containing 130, 240, and 230 claims, respectively, with policy documents of 20–50 pages. Table 1 (p.9) reports uncorrected ATA accuracy of 72.94 ± 0.0%, 74.00 ± 0.0%, and 88.64 ± 0.0%, respectively. The reasoning `gemini-2.5-flash` baseline scores 65.88 ± 1.18%, 73.13 ± 1.9%, and 91.5 ± 0.35%. ATA therefore has higher reported accuracy on travel and electronics, and lower accuracy on dental.

Limits: the paper describes claims with inconsistent, missing, or misspelled information (Sec. 1, p.3). It also explicitly preserves a fairness limitation: “In our approach, this risk is still present at the axiomization step, where an LLM is used to perform NER and RE on unstructured claim data.” (Sec. 4.7, p.13)

Inference: in Verus, an input encoder could produce typed Rust records or enums for a fixed policy interface. Separate encoders per sort or predicate could reduce interactions between changes. Proofs over those records would still depend on whether the encoder extracted the intended facts.

## technique 3: theorem-prover decision with proof explanations
The decision procedure is:

1. Instantiate a goal predicate with claim constants, such as `is_covered(ALICE)` (Sec. 3.2.3, p.8).
2. Check satisfiability of the policy theory together with the claim facts and the negated goal (Sec. 3.2.3, p.8).
3. If unsatisfiable, coverage follows. If satisfiable, return a model in which the policy and claim facts hold but coverage does not (Sec. 3.2.3, p.8).
4. For an entailed goal, use an unsat core to identify policy rules and claim facts supporting the result. The authors describe a minimal core and propose human-review triggers based on proof-relevant predicates or rules (Sec. 3.2.3, p.8; Sec. 4.4, p.12).

The paper states, “Most SMT solvers check for satisfiability. Therefore, to check the T -validity of a goal we need to check the T -unsatisfiability of the negated goal instead.” (Sec. 3.2.3, p.8)

Inference: a satisfiable counterexample establishes that coverage is not entailed; it does not establish that noncoverage is entailed. Likewise, the explanation depends on the formalized policy and extracted facts. The paper's description of a minimal unsat core should not be treated as an independently checked guarantee about default solver behavior.

Evidence: Table 2 (p.10) compares `gemini-2.5-flash`, `gemini-2.5-pro`, `gpt-4.1`, and `gpt-5`. Across these backbones, reported accuracy averages are 71.09 ± 1.07% for uncorrected ATA, 83.92 ± 2.49% for corrected ATA, and 68.66 ± 4.89% for the end-to-end LLM. Corrected ATA with `gemini-2.5-flash` reaches 87.17%, compared with 76.50% for end-to-end reasoning `gemini-2.5-pro`.

Inference: in Verus, policy lemmas could derive coverage from typed facts. A failed verification attempt would need diagnosis; it should not automatically be interpreted as a proof of noncoverage. Explicit proof dependencies and diagnostics could support explanations, but this paper does not establish how to implement that interface in Verus.

## technique 4: isolation, stability, and oversight controls
The authors distinguish repeated identical inputs at temperature zero, semantically equivalent paraphrases, and changes of the underlying LLM (Sec. 4.2, pp.9–10). Table 1 (p.9) reports zero standard deviation for ATA in its repeated-input evaluation. For the paraphrase test, the authors generate three paraphrases per travel claim using `gemini-2.5-pro`. Accuracy standard deviation changes from 1.18 to 1.47 for the reasoning baseline and from 0.0 to 0.15 for ATA (Sec. 4.2, p.10). Across substituted models, Table 2 (p.10) reports standard deviations of 1.07 for ATA, 2.49 for corrected ATA, and 4.89 for the LLM baseline.

Human oversight uses configurable triggers, including invalid claims or proof-relevant critical predicates. The authors give this example: “E.g. a human can be triggered whenever the predicate is_seriously_injured is proof relevant.” (Sec. 4.3, p.11) Formal rules, facts, unsat cores, and counterexamples are proposed as aids to review (Secs. 4.3–4.4, pp.11–12).

The security discussion is an architectural argument, not a reported attack evaluation. The authors claim immunity to prompt injection because online LLM output is constrained to predefined sorts and predicates, and the prover returns a Boolean decision. They also concede, “Consequently, even if an attacker were able to manipulate the LLM’s output, they could at worst alter the factual data fed to the prover.” (Sec. 4.5, p.12)

Inference: fixed policy rules limit what injected text can change, but manipulated facts can still change a coverage decision. Zero observed variance in the reported tests does not establish determinism for every possible input or model execution. A Verus service could adopt fixed policy modules, typed encoders, and explicit review triggers, while separately evaluating extraction errors and adversarial inputs.

## what is proved, measured, and trusted
The prover checks entailment relative to the formal theory and claim axioms (Sec. 3.2.3, p.8). The evaluation reports classification accuracy, repeat/paraphrase/model stability, and gains from manual formalization corrections (Secs. 4.2–4.3, pp.9–11). Explainability, security, accountability, and fairness are discussed qualitatively (Secs. 4.4–4.7, pp.12–13).

Privacy is a proposed deployment benefit. Section 4.5 (p.12) reports 76.19% accuracy for corrected ATA using `gemini-2.5-flash-lite`, compared with 76.50% for end-to-end `gemini-2.5-pro`. Fine-tuning and on-premise or on-device deployment remain future work. The datasets are unavailable: “Due to data privacy constraints, these datasets are not publicly available at the time of writing.” (Sec. 4.1, p.8)

## techniques for the catalog
- one-time policy formalization: translate a reusable natural-language specification into a typed formal theory with optional human correction
- typed claim axiomization: extract constants and literal facts using the policy's existing sorts and predicates
- prover decision with explanations: check the negated goal for unsatisfiability and explain the result with an unsat core or counterexample
- stability and oversight controls: test repeated inputs, paraphrases, and model substitutions, and trigger human review on configured conditions
