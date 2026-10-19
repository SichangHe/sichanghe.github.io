# A framework for assessing the capabilities of code generation of constraint domain-specific languages with large language models
(authored by agents unless marked 🧑)
Tag: `delgado2026framework`, [paper](https://arxiv.org/abs/2603.05278)

## paper's problem and contribution
The paper evaluates language-model generation of constraint code, focusing on OCL and Alloy and comparing them with Python. Its automatic evaluation separates parser-based well-formedness from LLM-judged specification compliance. The abstract says generated code is assessed “from the perspectives of well-formedness and correctness.” (§Abstract, PDF p. 1). The implementation supports different prompts, models, validators, and repair policies, then measures how those choices affect outcomes

The framework's four stages are prompt construction, generation and extraction, well-formedness checking, and correctness checking (§3, PDF pp. 6–7). The authors describe the purpose directly: “This framework supports the customization of a code generation process, its execution using the selected prompts and LLMs and the evaluation of the generated code.” (§3, PDF p. 6)

The authors report 30 domain models, 182 constraints, four generation LLMs, three target languages, nine prompt templates, two task-delivery methods, two repair settings, and 98,397 generation tasks (§5.3, PDF p. 18): “As a whole, a total of 98,397 code generation tasks were evaluated as part of these experiments.” Table 3 instead lists 15 DS1 domains and 13 DS2 domains, with 86 and 96 constraints respectively (PDF p. 18). Inference: The reported domain total is inconsistent with that table; the study cannot resolve the discrepancy

## technique 1: modular prompt construction for constraint code

what it is

Inputs may include a natural-language coding task, a natural-language domain description, and a domain model (§3, PDF p. 7; §3.1, PDF p. 8). Prompt templates vary two orthogonal dimensions: augmentation (including chain-of-reasoning and generated domain explanations/models) and task-oriented prompting (§3.1, PDF pp. 7–8). The basic instruction is “Code the following constraint in {LANGUAGE}:” followed by the task (§3.1, PDF p. 7)

how to do it

1. Supply the constraint task and, when available, a domain description and domain model (§3, PDF p. 7)
2. Choose a prompt template combining domain description, formal or natural-language model, and optional model explanation or generated model (§3.1, Table 1, PDF pp. 7–8)
3. Encode the components as concatenated JSON messages (§3.1, PDF p. 8)
4. For multiple constraints choose batch delivery, chained sequential delivery, or isolated delivery (§3.1, PDF pp. 8–9). Only batch and isolated delivery are compared in the reported experiments (§5.3, PDF p. 18)
5. Extract one code fragment per task from the model response (§3.2, PDF p. 9)

The authors report no general prompt-template winner: “This implies that we cannot draw any conclusions regarding which is the best prompt template (or whether providing the context information helps or not).” (§5.3.3, PDF p. 22). They recommend PT1 for token cost on that page, but Table 4 lists PT1 at 178.60 and PT2 at 175.39 (PDF p. 21). Inference: The table does not support their claim that PT1 uses the least tokens. Batch delivery is preferred after considering integration consistency and cost: “batch submission would be the preferred strategy.” (§5.3.4, PDF p. 23). Isolated delivery has an OCL advantage in the plotted experiment (§5.3.4, PDF p. 23)

what transfers to Verus

Inference: A Verus-oriented prompt should include the Rust data model, required `requires`/`ensures` contracts, and the exact specification task, then ask for executable Rust plus proof functions. Inference: Task batching should keep constraints sharing one domain model together so generated field names, types, and invariants agree. Inference: The paper's prompt-template results do not establish a best template for Verus

## technique 2: separate well-formedness validation from semantic correctness

what it is

The first validator checks whether generated code obeys the target language grammar. The paper defines the criterion: “A code snippet is considered well-formed when it follows the syntactic rules of the language it is generated.” (§3.3, PDF p. 9). The validator can be a parser or compiler, and language-specific tools may detect some semantic errors as well

The second validator runs only on well-formed snippets. A correct snippet must execute and comply with the natural-language specification (§3.4, PDF p. 10). The framework allows unit tests, formal verification tools, or custom correctness checkers (§3.4, PDF p. 10)

how to do it

1. Parse or compile the generated snippet with the language-specific well-formedness tool (§3.3, PDF p. 9)
2. For the manual reference evaluation, additionally execute or analyze syntactically valid code in USE OCL, Alloy Analyzer, or Python 3.9 (§4.1 and §5.1, PDF pp. 11, 14). The large-scale automatic well-formedness check uses only a parser (§5.1, PDF p. 15)
3. For automatic correctness evaluation in this instantiation, give GPT-4o-mini the generated code, natural-language coding task, and domain description (§4.2, PDF pp. 11–12). The paper states: “We used the same LLM (GPT-4o-mini) to assess every correctness evaluation for every target language, to obtain comparable results.” The framework also permits other validators (§3.4, PDF p. 10)
4. Record syntax and correctness separately, so a syntactically valid but semantically wrong constraint is not counted as correct (§3.4, PDF p. 10)

what transfers to Verus

Inference: `verus` compilation is a natural well-formedness and proof prerequisite check for Rust syntax, types, and proof obligations, while executable tests or a specification checker can test behavior. Inference: A Verus pass proves only the stated contracts for supported code; it is not equivalent to the paper's natural-language correctness judgment. Inference: The two-stage split helps diagnose whether an agent failed to write valid Verus syntax or wrote a valid but inadequate contract

evidence and trusted parts

The manual reference evaluation covered 1,512 snippets: “56 coding tasks, generated with 9 different prompt templates for 3 target languages: OCL, Alloy and Python.” (§5.1, PDF p. 14). One author performed the manual labeling using criteria discussed by all three co-authors. Manual well-formedness used ANTLR parsing followed by target-tool execution; manual correctness was assessed only for well-formed code (§5.1, PDF p. 14). In contrast, “The automatic evaluation of well-formedness implemented in the framework relies solely on a parser and checks only syntactic correctness” (§5.1, PDF p. 15). Table 2 reports precision/recall against the manual reference: Python well-formedness 1.000/1.000, Alloy well-formedness 0.574/0.504, and GPT-4o-mini Python correctness 0.770/0.834 (PDF p. 16). These are evaluation-comparison results, not performance over all 98,397 generation tasks. Precision divides true positives by automatic positive predictions; recall divides true positives by manual positives (§5.1, Equations 3–4, PDF pp. 14–15)

Inference: The manual labels, parser semantics, execution tools, and domain models are trusted reference layers in this evaluation. Inference: An LLM-as-judge can scale screening but should not be treated as a proof oracle for agent-written verified Rust

## technique 3: one-pass error-feedback repair

what it is

Failed code is sent back with validator feedback. For well-formedness, the model first explains the error and a second model generates repaired code; the repaired code is validated again (§3.3, PDF pp. 9–10). The paper states: “Code snippets that fail the well-formedness check undergo a single-pass code repair process.” (§3.3, PDF p. 9). For correctness failures, the LLM receives faulty code and correctness feedback and directly generates a repair; a separate explanation step is not specified (§3.4, Figure 3, PDF p. 10)

how to do it

1. For well-formedness failure, provide faulty code and parser feedback to an LLM to explain the error (§3.3, PDF pp. 9–10)
2. Use that explanation with a second LLM to generate fixed code; the authors also allow one LLM and one prompt (§3.3, PDF p. 10)
3. For correctness failure, provide faulty code and correctness feedback to an LLM to generate fixed code directly (§3.4, PDF p. 10)
4. Re-run the corresponding validator (§3.3–3.4, PDF p. 10)
5. Stop after one repair round for that stage if its validator still fails (§3.3–3.4, PDF p. 10)

The authors report: “There is an increase of 10-20% in the number of correctly generated tasks when applying a single round of code repair.” (§5.3.5, PDF p. 24). Inference: The wording does not specify relative percent versus percentage points; it should not be interpreted as a quantified Verus proof-repair gain

what transfers to Verus

Inference: Feed Verus diagnostics, failed postconditions, and counterexamples back to the code-generation model, then rerun Verus and tests. Inference: A bounded repair loop should preserve the original specification and reject repairs that weaken contracts merely to pass. Inference: The paper's one-pass policy is an experimental choice, not evidence that one pass is adequate for proof repair

## technique 4: multiple attempts and pass@k

The framework permits repeated generations and reports pass@k: “When using multiple code generation attempts, pass@k evaluates the probability that at least one of the k generated samples is correct.” (§3.4, PDF p. 11). Equation 1 is 1 − C(n−c,k)/C(n,k), where C is the combination function; the authors describe n as the total number of input examples and c as the number of correct samples. Accuracy is first-attempt correctness and equals pass@1 (§3.4, Equations 1–2, PDF p. 11). The experiments use k=3 (§5.3, PDF p. 18). Increasing attempts raises success with diminishing returns and linear LLM-call cost (§5.3.5, PDF p. 24)

Inference: For Verus, pass@k should count a candidate only after Verus verification and the same behavioral checks; a compiling candidate with a vacuous contract must not count. Inference: Sampling and repair can be combined, but each attempt must preserve a fixed specification to make the metric meaningful

## what is proved, measured, and trusted

The large-scale experiments measure parser-based well-formedness, LLM-judged correctness, first-attempt accuracy, and pass@k up to k=3 (§5.3–5.3.5, PDF pp. 18–25). Automatic validators are compared with manual labels using precision and recall (§5.1, PDF pp. 14–16). Inference: These measurements do not prove that natural-language descriptions are complete, domain models match production systems, or LLM judgments are sound. The authors limit generalization across languages, LLMs, and datasets (§5.5, PDF pp. 25–26), and warn of synthetic domain descriptions: “This may affect external validity, limiting our ability to generalize these results to other domains with human-created textual specifications.” (PDF p. 26)

Inference: The threat to a verified-Rust product is primarily workflow and evaluation design: generated contracts can be syntactically valid and solver-accepted while underspecifying behavior. Inference: The framework is directly reusable as an experiment harness for measuring Verus generation, but its reported OCL/Alloy/Python results should not be presented as Verus performance

## techniques for the catalog

- modular prompt assembly — combine task, domain description, model, and optional generated explanations through explicit templates
- staged validation — check well-formedness before assessing specification correctness
- validator-feedback repair — send faulty code and diagnostics through one bounded repair round
- multiple-attempt generation — sample k candidates and measure pass@k and first-attempt accuracy
- judge calibration — compare automatic parser or LLM judgments with manual labels using precision and recall
