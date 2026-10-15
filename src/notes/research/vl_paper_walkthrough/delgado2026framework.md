# A framework for assessing the capabilities of code generation of constraint domain-specific languages with large language models
(authored by agents unless marked 🧑)
Tag: `delgado2026framework`, [paper](https://doi.org/10.1007/978-3-031-72781-8_2)

## paper's problem and contribution
The paper evaluates language-model generation of constraint code, focusing on OCL and Alloy and comparing them with Python. Its framework separates syntax from specification compliance. The abstract says generated code is assessed “from the perspectives of well-formedness and correctness.” (§Abstract, PDF p. 1). The implementation supports different prompts, models, validators, and repair policies, then measures how those choices affect outcomes

The framework's four stages are prompt construction, generation and extraction, well-formedness checking, and correctness checking (§3, PDF pp. 6–7). The authors describe the purpose directly: “This framework supports the customization of a code generation process, its execution using the selected prompts and LLMs and the evaluation of the generated code.” (§3, PDF p. 6)

The validation covers 30 domain models, 182 constraints, four LLMs, three target languages, nine prompt templates, two task-delivery methods, two repair settings, and 98,397 generation tasks (§5.3, PDF p. 18)

## technique 1: modular prompt construction for constraint code

what it is

Inputs may include a natural-language coding task, a natural-language domain description, and a formal or natural-language domain model (§3, PDF p. 6). Prompt templates vary two orthogonal dimensions: augmentation (including chain-of-reasoning and generated domain explanations/models) and task-oriented prompting (§3.1, PDF pp. 7–8). The basic instruction is “Code the following constraint in {LANGUAGE}:” followed by the task (§3.1, PDF p. 7)

how to do it

1. Supply the constraint task and, when available, a domain description and domain model (§3, PDF p. 6)
2. Choose a prompt template combining domain description, formal or natural-language model, and optional model explanation or generated model (§3.1, Table 1, PDF pp. 7–8)
3. Encode the components as concatenated JSON messages (§3.1, PDF p. 8)
4. For multiple constraints choose batch delivery, chained sequential delivery, or isolated delivery (§3.1, PDF p. 8)
5. Extract one code fragment per task from the model response (§3.2, PDF p. 9)

The authors report no clear prompt-template winner; PT1 is recommended in their discussion because it uses the fewest tokens when model language competence is already strong (§5.3.3, PDF pp. 20–21). Batch delivery is preferred after considering integration consistency and cost, even though isolated delivery can help OCL in the plotted experiment (§5.3.4, PDF pp. 22–23)

what transfers to Verus

Inference: A Verus-oriented prompt should include the Rust data model, required `requires`/`ensures` contracts, and the exact specification task, then ask for executable Rust plus proof functions. Inference: Task batching should keep constraints sharing one domain model together so generated field names, types, and invariants agree. Inference: The paper's prompt-template results do not establish a best template for Verus

## technique 2: separate well-formedness validation from semantic correctness

what it is

The first validator checks whether generated code obeys the target language grammar. The paper defines the criterion: “A code snippet is considered well-formed when it follows the syntactic rules of the language it is generated.” (§3.3, PDF p. 9). The validator can be a parser or compiler, and language-specific tools may detect some semantic errors as well

The second validator runs only on well-formed snippets. A correct snippet must execute and comply with the natural-language specification (§3.4, PDF p. 10). The framework allows unit tests, formal verification tools, or custom correctness checkers (§3.4, PDF p. 10)

how to do it

1. Parse or compile the generated snippet with the language-specific well-formedness tool (§3.3, PDF p. 9)
2. If it passes, execute or analyze it in the target environment: USE OCL, Alloy Analyzer, or Python 3.9 in the paper (§4.1 and §5.1, PDF pp. 11, 14)
3. Run a correctness validator against the task specification and domain model (§3.4, PDF p. 10)
4. Record syntax and correctness separately, so a syntactically valid but semantically wrong constraint is not counted as correct (§3.4, PDF p. 10)

what transfers to Verus

Inference: `verus` compilation is a natural well-formedness-and-proof gate for Rust syntax, types, and proof obligations, while executable tests or a specification checker can test behavior. Inference: A Verus pass proves only the stated contracts for supported code; it is not equivalent to the paper's natural-language correctness judgment. Inference: The two-stage split helps diagnose whether an agent failed to write valid Verus syntax or wrote a valid but inadequate contract

evidence and trusted parts

Manual evaluation covered 1,512 snippets from 56 tasks, nine templates, and three languages (§5.1, PDF p. 14). Automatic well-formedness used ANTLR parsers and then target execution; correctness was manually assessed only for well-formed code (§5.1, PDF pp. 14–15). Table 2 reports automatic-vs-manual precision and recall. For example, Python well-formedness is 1.000 precision and 1.000 recall, whereas Alloy is 0.574 and 0.504; these denominators are the manually labeled snippets for each language, not all 98,397 generation tasks (Table 2, PDF p. 16). Correctness judging has model-specific precision/recall, such as GPT-4o-mini on Python at 0.770/0.834 (§5.1, Table 2, PDF p. 16)

Inference: The manual labels, parser semantics, execution tools, and domain models are trusted reference layers in this evaluation. Inference: An LLM-as-judge can scale screening but should not be treated as a proof oracle for agent-written verified Rust

## technique 3: one-pass error-feedback repair

what it is

Failed code is sent back with validator feedback. For well-formedness, the model first explains the error and a second model generates repaired code; the repaired code is validated again (§3.3, PDF pp. 9–10). The paper states: “Code snippets that fail the well-formedness check undergo a single-pass code repair process.” (§3.3, PDF p. 9). Correctness failures use the same one-round pattern (§3.4, PDF p. 10)

how to do it

1. Save faulty code and parser/compiler or correctness-validator error (§3.3–3.4, PDF pp. 9–10)
2. Prompt an LLM with the code and error to explain the failure (§3.3, PDF p. 9)
3. Give that explanation to an LLM to produce a fixed fragment (§3.3, PDF p. 10)
4. Re-run the corresponding validator (§3.3–3.4, PDF pp. 9–10)
5. Stop after one repair round if the validator still fails (§3.3–3.4, PDF pp. 10)

In experiments, a single repair round increases correctly generated tasks by 10–20%; the exact percentage depends on target language and plotted setting (§5.3.5, PDF p. 24). Inference: These percentages are correctness gains in the paper's DSL/Python benchmark and do not quantify Verus proof repair

what transfers to Verus

Inference: Feed Verus diagnostics, failed postconditions, and counterexamples back to the code-generation model, then rerun Verus and tests. Inference: A bounded repair loop should preserve the original specification and reject repairs that weaken contracts merely to pass. Inference: The paper's one-pass policy is an experimental choice, not evidence that one pass is adequate for proof repair

## technique 4: multiple attempts and pass@k

The framework samples k independent generations and reports pass@k, defined as the probability that at least one of k samples is correct (§3.4, PDF p. 10). Its formula is 1 − C(n−c,k)/C(n,k), where n is the number of samples and c the number correct. Accuracy is first-attempt correctness and equals pass@1 (§3.4, PDF p. 10). The experiments use k=3 (§5.3, PDF p. 18). Increasing attempts raises success with diminishing returns and linear LLM-call cost (§5.3.5, PDF p. 24)

Inference: For Verus, pass@k should count a candidate only after Verus verification and the same behavioral checks; a compiling candidate with a vacuous contract must not count. Inference: Sampling and repair can be combined, but each attempt must preserve a fixed specification to make the metric meaningful

## what is proved, measured, and trusted

The paper measures parser well-formedness, executable correctness, precision/recall of automatic judges, first-attempt accuracy, and pass@3. It does not prove that natural-language task descriptions are complete, that domain models match production systems, or that LLM judges are sound. The authors warn that results depend on three languages, four models, model training exposure, context windows, and the chosen validators (§5.5, PDF pp. 25–26)

Inference: The threat to a verified-Rust product is primarily workflow and evaluation design: generated contracts can be syntactically valid and solver-accepted while underspecifying behavior. Inference: The framework is directly reusable as an experiment harness for measuring Verus generation, but its reported OCL/Alloy/Python results should not be presented as Verus performance

## techniques for the catalog

- modular prompt assembly — combine task, domain description, model, and optional generated explanations through explicit templates
- staged validation — gate generated code on well-formedness before testing specification correctness
- validator-feedback repair — send faulty code and diagnostics through one bounded repair round
- multiple-attempt generation — sample k candidates and measure pass@k and first-attempt accuracy
- judge calibration — compare automatic parser or LLM judgments with manual labels using precision and recall
Checked 2026-10-14 against the paper by a Codex agent: audit record delgado2026framework; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
