# Towards Reliable Generation of Executable Workflows by Foundation Models
(authored by agents unless marked 🧑)
Tag: `masoumzadeh2026towards`, [paper](https://arxiv.org/abs/2509.25117v2)

## what the paper establishes

The paper studies natural-language-to-domain-specific-language workflow synthesis. Its abstract states: “We introduce a framework that leverages static analysis feedback to enable FMs to detect and repair defects in the DSL-based workflows they generate.” The WorkflowDSL is a strict JSON language with inputs, outputs, task nodes, conditionals, switch cases, and loops; tasks invoke native, semantic, model, or workflow skills. The generation pipeline first refines vague scenarios into requirements and step-by-step instructions, then a Converter Agent maps declarations, conditions, case distinctions, and iterations to corresponding DSL nodes and a Skill Chooser assigns available skills.

The authors generate 385 workflows: 200 from simulated scenarios and 185 from OpenAGI scenarios, using GPT-4o-mini-2024-07-18 at temperature 0.7 (Section 3.1, pp. 7–9). Open coding of 65 workflows yields 15 observed defect categories; literature and observations of synthesizer behavior motivate five additional categories. The final 20-category taxonomy groups defects into data errors, logical errors, and mismatches between instructions and workflows. In those 65 workflows, 58 contain at least one defect, or 89.23%; the mean is 14.65 defects (rounded to 15) and the maximum is 24. The most frequent incidences are skills with defective parameters (528), unreachable variables (204), and unused variables (110). The five added categories have zero observed incidences in this sample (Section 3.2, Figure 4, pp. 9–12).

Timon detects nine categories without executing workflows: unparsable JSON, invalid DSL, unreachable variables, unused variables, incorrect data-type propagation, hallucinated skills, defective skill parameters, malformed expressions, and incorrect outputs (Section 4.1, pp. 12–14). Pumbaa feeds Timon's reports back to a foundation model for repair, one defect category at a time, with up to ten attempts. On 40 simulated workflows, Timon’s overall precision/recall is 56%/80%; on ten OpenAGI workflows it is 67%/87% (Table 2, p. 19). GPT-4o with feedback repairs 286 of 990 detected incidences at pass@10 (28.89%), compared with 45/990 (4.55%) when GPT-4o is asked to detect and repair directly without Timon feedback (Table 3, p. 19). Table 4 (p. 21) reports an OpenAGI aggregate of 34/84 repaired incidences (40.48%). Inference: Table 4 is internally inconsistent: its category rows sum to 39 repairs and 87 detections, so the reported aggregate cannot be reconciled with those rows. These are incidence-level counts, not percentages of all generated workflows.

## technique: build a defect taxonomy before automating detection

What it is: systematically label generated programs against their scenario, refined requirements, and step-by-step instructions, then supplement observed categories with known language defects. The paper's RQ1 asks what defects occur before designing a detector.

Inference: use this when a new DSL or verifier-backed agent lacks a stable defect vocabulary. A taxonomy makes detector coverage and blind spots explicit.

How to do it:

1. Generate diverse scenarios across personas, expertise, domains, and real-world datasets (Section 3.1).
2. Refine scenarios into requirements and natural-language instruction steps with a requirements agent (Section 3.1).
3. Generate DSL workflows from those artifacts using the NL-2-DSL pipeline (Section 3.1).
4. Independently open-code an initial stratified sample; each inspector records defect type and exact task-node location (Section 3.1).
5. Calculate inter-rater agreement, reconcile disagreements, continue sampling until no new categories appear, and test categories on a separate real-world slice (Section 3.1).
6. Add plausible categories absent from the sample based on prior language research and observed synthesizer behavior, marking their observed prevalence as zero (Section 3.1).

Evidence: ten initial simulated workflows give Cohen’s κ=0.55; after reconciliation and continued labeling, 55 simulated workflows give κ=0.89 and saturation at 15 emergent types. Ten OpenAGI workflows add no new type, yielding 15 observed categories; five additional categories produce the final 20-category taxonomy (Section 3.1, pp. 8–9). Section 3.2 (p. 11) reports, “The taxonomy of defects in FM-generated DSL workflows comprises 20 categories, sorted into three distinct groups.”

Failure and assumptions: open coding depends on inspector judgment and the generated scenarios are synthetic or dataset-derived. The authors call the taxonomy initial, not complete.

## technique: validate structure before deeper static analysis

What it is: Timon first parses the generated string as JSON, then validates the object against the WorkflowDSL grammar with Pydantic. If either step fails, it records unparsable JSON or invalid DSL and stops deeper analysis.

Inference: use this ordering whenever later analyses require a well-formed intermediate representation.

How to do it:

1. Accept the FM output as a string (Section 4.1).
2. Parse JSON; record an unparsable-JSON defect on failure (Structure Validator A.1).
3. Instantiate and type-check the JSON against the DSL grammar; record invalid DSL on failure (A.2).
4. Only valid programs continue to intermediate representation construction and defect detection (Sections 4.1 and 4.3).
5. After repair, rerun the structure validator before continuing.

Evidence: on 40 simulated workflows, Timon reports 100% precision and recall for invalid DSL; injected unparsable JSON and malformed-expression fixtures also receive 100%/100%. On ten OpenAGI workflows, invalid DSL is likewise 100%/100%. Table 2’s denominators are defect incidences in the stated workflow samples, not all possible malformed outputs.

Failure and assumptions: structure validation does not detect semantic omissions, over-engineering, infeasible paths, or concurrency violations. Discussing runtime-dependent paths in Section 5, Implication 2 (p. 23), the authors state, “Therefore, sole static analysis cannot confidently detect whether any defect exists.”

## technique: construct a control-flow IR with use-def and def-use chains

What it is: Timon lowers a valid workflow into a control-flow graph (CFG), then builds use-def and def-use chains. Detectors query this IR for dataflow and expression properties.

Inference: use this for DSLs with branches, loops, variable assignments, and skill outputs where local syntax checks cannot determine reachability or data consistency.

How to do it:

1. Parse the validated DSL into a CFG representing regular tasks, branches, switches, and loops (Intermediate Representation Constructor B.1).
2. Build use-def and def-use chains over the CFG (B.2).
3. For each used variable, check whether a prior node defines it; flag unreachable/undefined use (C.1).
4. For each defined variable, check whether a later node uses it; flag unused definitions (C.2).
5. Check consistency of primitive types between variable definitions and uses (C.3). Incorrect type casting is a separate taxonomy category outside Timon's nine detectable types.
6. Parse loop and switch expressions into ASTs and add their variables to dataflow chains (C.4).

Evidence: across simulated workflows, unreachable-variable detection has 50% precision and 71% recall; unused-variable detection 75% precision and 100% recall; incorrect type propagation 37% precision and 72% recall. On OpenAGI, unreachable variables are 33%/58% and unused variables 53%/89%. Overall Timon recall is 80% simulated and 87% OpenAGI, with precision 56% and 67% respectively (Table 2).

Inference: A Verus implementation can model workflow state and variable maps with Rust structs and prove dataflow invariants using `invariant` clauses on CFG traversal loops. `requires` can state that a variable is defined before use; `ensures` can state that accepted transitions preserve type consistency. Inference: Verus proof obligations do not automatically solve feasibility of arbitrary runtime branches; SMT-backed path reasoning or explicit abstractions remain necessary.

Failure and assumptions: conditions depending on runtime values create infeasible-path uncertainty. Timon may miss a defect or report a false positive when it cannot decide whether a path executes.

## technique: compare generated actions and parameters with an authoritative skill database

What it is: detect hallucinated skills by comparing every task action against the available-skill database, then validate input and output parameters for existing skills. The output field is separately checked against the user’s required format.

Inference: use this at tool-call boundaries where an agent can invent action names or omit parameters; type propagation requires the separate dataflow checks.

How to do it:

1. Enumerate each task-corresponding action in the IR (C.5).
2. Look it up in the execution environment’s available-skill database; mark absent actions as hallucinated (C.5).
3. For existing actions, compare supplied input/output parameters to the skill declaration and mark defective parameters (C.6).
4. Check the workflow outputs field against the predefined format supplied as a user instruction (C.7). Requiring only final-task outputs is an example requirement in Section 3.2, not a universal rule.

Evidence: Timon has 100% precision and recall for hallucinated skills, defective skill parameters, and incorrect outputs in the 40 simulated workflows. On OpenAGI, each of those categories also reaches 100%/100% (Table 2). The 40-workflow evaluation is selected from 55 open-coded simulated workflows; the OpenAGI denominator is ten workflows.

Failure and assumptions: a registry comparison cannot detect a semantically wrong but valid skill, inefficient choice, or over-engineered workflow. Those categories require human judgment.

## technique: repair with structured analyzer feedback and category-specific prompts

What it is: Pumbaa sends Timon’s localized defect report to an FM and asks it to repair one category at a time. Prompts add category-specific grammar, output-format, or available-skill context, then use clarity edits, few-shot examples, and in-context learning.

Inference: use this when a generated program is close enough to analyze and a detector can identify defects and their locations. The paper's no-feedback baseline asks the FM to analyze and repair defects with defect definitions and few-shot examples as context (Section 4.3, p. 17).

How to do it:

1. If JSON or DSL validation fails, send the workflow to Pumbaa; if repair succeeds, rerun Timon, otherwise mark it incomprehensible and stop (Section 4.3).
2. For each detected category, append the relevant analyzer report and category-specific instructions (Section 4.2).
3. Include DSL grammar for invalid DSL, required output format for incorrect outputs, and the available skill list for hallucinated or parameter defects (Section 4.2).
4. Prompt the selected FM repeatedly, up to ten attempts, until the category’s incidences are repaired or attempts are exhausted (Section 4.3).
5. Re-run Timon after every attempt so newly introduced detectable defects are localized and fed back (Section 4.3).
6. Evaluate each category independently from the original defective workflow to avoid confounding repairs of other categories (Section 4.3).

Evidence: on 40 simulated workflows, GPT-4o with Timon feedback repairs 286/990 incidences at pass@10 (28.89%); Llama repairs 71/990 (7.17%) and Qwen 41/990 (4.14%). The GPT-4o baseline without Timon feedback repairs 45/990 (4.55%), an 84.25% relative deficit versus feedback. GPT-4o repairs all 31/31 incorrect-output and 3/3 hallucinated-skill incidences, but only 12/55 incorrect-type-propagation and 160/516 defective-parameter incidences (Table 3, p. 19). Table 4 (p. 21) reports OpenAGI repairs of 15/15 hallucinated skills, 12/12 defective parameters, and 4/4 incorrect outputs; its aggregate is inconsistent with its category rows, as noted above.

The iterative curve saturates by pass@6 for the simulated set: 27.07%, 28.08%, 28.59%, 28.59%, and 28.69% of all incidences are repaired at passes 1–5, and 28.89% at pass 6 (Section 4.4, p. 20; Figure 7, p. 21). The authors write, “Given the saturation of repair performance at pass@6 and the ever-increasing token usage and corresponding costs, we recommend setting Pumbaa’s maximum repair attempt count to six in practical settings.” Inference: this recommendation is specific to the evaluated setup, not a universal optimum.

Inference: In Verus, analyzer feedback can be a structured diagnostic containing source span, failed obligation, expected contract, and exact code hash. A proof repair function can consume that diagnostic and return a candidate, while a separate verifier reruns the proof before acceptance. The paper’s result does not establish that an LLM repair preserves already-proved properties; the re-verification step is essential.

Failure and assumptions: Pumbaa cannot repair invalid DSL in the simulated set (0/3 for all models), and FM repair may introduce new defects. Timon detects only nine of 20 categories; omissions, concurrency violations, over-engineering, and semantic skill quality require other analyses or human review.

## technique: use dynamic or SMT support for path feasibility

What it is: supplement CFG/use-def static checks with dynamic execution or satisfiability modulo theories (SMT) to decide whether branch conditions can occur. The paper’s Listing 1 has variables `p` and `q` defined on different branches and used later; determining whether a use is reachable requires solving constraints over `x` and `y`.

Inference: use this whenever dataflow warnings depend on mutually exclusive conditions, runtime loop bounds, or values unavailable statically.

Inference: a possible implementation, beyond what the paper implements:

1. Extract branch and loop predicates from the CFG.
2. Encode a candidate defect, such as a variable use on a path where its definition has not executed, together with variable bounds and path conditions.
3. Ask an SMT solver whether that defect condition is satisfiable. A feasible path alone does not establish a defect; an unknown solver result remains unresolved.
4. Combine the result with the static report before repair.

Evidence: the paper does not report an SMT implementation or accuracy number; it presents SMT as a suggested extension after observing Timon’s path-feasibility limits. This distinction matters: the 80%/87% recall numbers are for current Timon, not a hypothetical SMT-enhanced detector.

Inference: dynamic analysis may miss paths; SMT models can be incomplete or expensive. Concurrency constraints require execution or a concurrency model.

## what is proved, measured, and trusted

Inference: the paper provides empirical detector/repair measurements, not a formal proof that repaired workflows meet user requirements. Its evaluation depends on the WorkflowDSL grammar, scenario and requirement annotations, skill database, open-coded ground truth, and FM behavior; model-generated repairs are re-examined by Timon. The 89.23% prevalence is from 65 open-coded workflows, not all 385 generated workflows (Section 3.2). Table 2’s precision/recall measurements use defect incidences in 40 simulated and ten OpenAGI workflows, including injected JSON and expression defects in simulated workflows. Table 3’s repair denominators are Timon detections in 40 simulated workflows. Invalid DSL has 3 detected incidences in that table. Inference: the 0/3 result provides limited evidence about repair success beyond this sample.

## techniques for the catalog

- taxonomy-first auditing — open-code generated DSL programs against requirements and build a defect vocabulary before detector design
- structure validation before analysis — parse JSON and validate the DSL schema before constructing deeper representations
- CFG/dataflow analysis — build control-flow, use-def, and def-use chains to detect reachability, usage, and type propagation defects
- skill-registry checking — compare generated actions and parameters with an authoritative available-skill database
- verifier-feedback repair — feed localized static-analysis reports and category-specific context to an FM repairer
- iterative rechecking — rerun the analyzer after every repair to catch both unresolved and newly introduced defects
- path-feasibility support (proposed extension) — add dynamic execution or SMT solving when static dataflow cannot decide runtime reachability
