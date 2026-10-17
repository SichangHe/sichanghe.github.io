# A Proof-of-Concept for Explainable Disease Diagnosis Using Large Language Models and Answer Set Programming
(authored by agents unless marked 🧑)
Tag: `gemou2025mccoy`, [paper](http://arxiv.org/abs/2512.23932v1)

## what McCoy does

McCoy translates medical literature into Answer Set Programming (ASP), adds patient facts, and asks an ASP solver for stable models and explanations. The abstract describes it as follows: “McCoy orchestrates an LLM to translate medical literature into ASP code, combines it with patient data, and processes it using an ASP solver to arrive at the final diagnosis.” (Abstract, PDF p. 1) This is a proof of concept on three selected diseases, not a clinical validation study.

## technique: constrained LLM-to-logic translation

Use this when natural-language domain knowledge must become an executable, inspectable rule base. The paper's workflow is:

1. Collect literature relevant to the target diseases (Section 4, Architecture, PDF p. 3).
2. Construct a prompt that specifies the output format, facts to encode, alternatives, and symptom links (Section 4, Prompt Construction, pp. 3–5).
3. Ask the LLM to emit Clingo/ASP facts and rules. The effective pneumonia prompt requests `has(symptom(x))` structure, alternative diagnoses, and propagation rules (Figure 4, PDF p. 5).
4. Add patient symptoms and indicators as `has(...)` facts to the generated knowledge base (Section 4, Architecture, p. 3; Equation 3, p. 4).
5. Ground the ASP program, solve it with Clingo, and interpret stable models as diagnoses (Section 2, PDF p. 2; Figure 1, p. 3).

The paper explicitly contrasts a poor prompt that produces one monolithic diagnosis rule with the effective prompt that decomposes the output into multiple rules (Figures 3–4, pp. 4–5). Figure 3's caption says the poor output "does not decompose the disease diagnosis into discrete rules." It says: “The LLM output is structured into multiple rules that aid explainability and can result in partial diagnoses.” (Figure 4 caption, PDF p. 5)

Verus form (Inference): use the LLM to propose Rust data types and `spec fn` predicates for symptoms, indicators, and diagnosis rules, then have Verus prove each rule's contract. A generated rule is a candidate specification; Verus checking replaces ASP stable-model solving only for properties expressible in the chosen Rust model. Preserve the separation between natural-language extraction, structured rule representation, and checked inference.

## technique: rules, propagation, incomplete information, and minimization

The paper's logical construction starts with `symptom(s)` and `indicator(i)` facts, represents patient observations as `has(x)`, and derives diagnoses through conjunctions such as `diagnosis(d1) :- has(x1), has(x2), ...` (Equations 1–6, PDF pp. 4–5). It adds relation rules such as `has(symptom(S2)) :- has(symptom(S1)), linked_symptom(S1,S2)` for clinically associated symptoms (Equation 7, p. 5).

When data are incomplete, a choice rule `{add(symptom(S)) : symptom(S)}` introduces possible symptoms (Equation 10, PDF p. 5). An integrity constraint requires at least one diagnosis, and `#minimize{1,S : add(symptom(S))}` penalizes assumptions, favoring diagnoses grounded in observed data (Equations 11–12, p. 6). The authors state: “This formulation guarantees that at least one diagnosis is produced, relying as much as possible on available clinical data rather than hypothetical assumptions.” (Section 4, PDF p. 6)

Verus form (Inference): represent known observations and optional assumptions with explicit Rust enums or sets; define diagnosis predicates as `spec fn`s; prove that each accepted result satisfies a postcondition and that assumption counts are bounded. Verus has no ASP stable-model semantics or optimization directive in this paper, so a separate verified search or an external solver contract is needed. A `requires` clause should state which patient facts are trusted; `ensures` should expose the diagnosis and any assumptions.

## technique: solver-produced explanations

Use a symbolic trace to make each conclusion auditable. The paper says the tool xclingo "enables the visualization of justifications for results produced by the clingo solver" and that McCoy leverages it (Section 4, PDF p. 6). The explanation tree links a root diagnosis to direct patient facts, propagated symptoms, and relation facts (Listing 1 and Section 5, PDF p. 7). For chickenpox, the reported tree explains itching, fatigue, lethargy, high fever, and linked symptom relations rather than returning only a label; the paper notes the listing is "slightly modified for clarity" (Listing 1 caption, p. 7). Section 4 says of a separate toy logic program and its causal graph: “This structure supports the interpretability of conclusions derived by a symbolic logic solver.” (Section 4, Diagnostic Explainability, PDF p. 6)

Verus form (Inference): emit a proof-carrying diagnostic record containing the selected rule, input facts, and `proof fn` lemmas establishing each edge. A Verus proof establishes the modeled relation, while a product explanation layer must still map symbols to clinician-readable text. Do not claim that an explanation proves medical validity beyond the encoded rules.

## evidence, limits, and inconsistencies

Evaluation uses a public Kaggle disease-symptom dataset. A prediction counts as correct when the solver's disease matches the dataset label (Section 5, PDF p. 6). Table 1 reports Chickenpox: 66 logical terms and 95% accuracy; Pneumonia: 75 terms and 100%; Common Cold: 44 terms and 100% (Table 1, p. 6). The paper does not say which LLM produced the ASP programs (GPT-5 appears only as a background example in Section 2), and gives no sample count per disease, train/test split, confidence interval, repeated runs, or comparator, so the denominators for these percentages are missing. “Preliminary results show McCoy has strong performance on small-scale disease diagnosis tasks.” (Abstract, PDF p. 1) The exact scope is therefore the selected diseases and unspecified dataset records, not clinical deployment.

Inference: trusted components include the source literature, LLM extraction, prompt design, generated ASP, symptom dataset labels, Clingo/grounder/solver, and the assumption that encoded rules capture medical knowledge. The paper's future work names "formalizing the pipeline to enable auditability and pluggability" and "additional guardrails" (Section 6, PDF p. 7). Inference: threat to agent-written verified Rust is high for extraction and specification errors, moderate for the checked inference core, and unchanged for unmodeled clinical judgment. VL can reuse staged translation, explicit rule schemas, assumption minimization, and explanation traces; it should not redo generic LLM-to-rule architecture without a Verus-specific contribution.

## techniques for the catalog

- constrained translation — prompt an LLM with an exact rule schema, alternatives, and propagation requirements before emitting logic
- staged symbolic inference — ground generated rules, combine them with input facts, solve, and interpret stable models
- incomplete-data handling — represent optional facts explicitly, require a result, and minimize added assumptions
- explanation traces — retain solver justifications linking each conclusion to facts and rule applications
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This formulation guarantees that at least one diagnosis is produced, relying as much as possible on available clinical data rather than hypothetical assumptions."): read all of the paper text; checked every quotation, equation, table value, figure and listing reference, and the page numbers of cited sections; changed page references (Section 4 workflow steps are on pp. 3-4, Equation 10 is on p. 5), corrected one misquoted sentence ("derived by", and its context is a toy causal-graph example, not the chickenpox tree), added the missing-LLM-identity limitation and the "slightly modified for clarity" caveat, and marked the trusted-components sentence as inference; kept the arXiv link, which matches the paper's arXiv:2512.23932v1 stamp. Not checked: cited works, the Kaggle dataset contents, and the Verus-form suggestions (the study's own inference).
