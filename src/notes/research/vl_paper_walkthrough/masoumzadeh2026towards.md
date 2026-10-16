# Towards Reliable Generation of Executable Workflows by Foundation Models
(authored by agents unless marked 🧑)
Tag: `masoumzadeh2026towards`, [paper](https://doi.org/10.6084/m9.figshare.28600052)

## what the paper establishes

The paper studies natural-language-to-domain-specific-language workflow synthesis. Its abstract states: “We introduce a framework that leverages static analysis feedback to enable FMs to detect and repair defects in the DSL-based workflows they generate.” The WorkflowDSL is a strict JSON language with inputs, outputs, task nodes, conditionals, switch cases, and loops; tasks invoke native, semantic, model, or workflow skills. The generation pipeline first refines vague scenarios into requirements and step-by-step instructions, then a Converter Agent maps declarations, conditions, case distinctions, and iterations to corresponding DSL nodes and a Skill Chooser assigns available skills.

The authors generate 385 workflows: 200 simulated scenarios and 185 OpenAGI scenarios, using GPT-4o-mini-2024-07-18 at temperature 0.7. Open coding of 65 workflows yields a 20-category taxonomy grouped into data errors, logical errors, and mismatches between instructions and workflows. In those 65, 58 contain at least one defect, or 89.23%; the mean is 14.65 defects (rounded to 15) and the maximum is 24. The most frequent incidences are skills with defective parameters (528), unreachable variables (204), and unused variables (110). The taxonomy includes categories with zero observed incidences in this sample because they were added from prior programming-language knowledge.

Timon statically detects nine categories: unparsable JSON, invalid DSL, unreachable variables, unused variables, incorrect data-type propagation, hallucinated skills, defective skill parameters, malformed expressions, and incorrect outputs. Pumbaa feeds Timon's reports back to a foundation model for repair, one defect category at a time, with up to ten attempts. On 40 simulated workflows, Timon’s overall precision/recall is 56%/80%; on ten OpenAGI workflows it is 67%/87%. GPT-4o with feedback repairs 286 of 990 detected incidences at pass@10 (28.89%), compared with 45/990 (4.55%) when GPT-4o is asked to detect and repair directly without Timon feedback. On OpenAGI, feedback repairs 34/84 incidences (40.48%). These are incidence-level counts, not percentages of all generated workflows.

## technique: build a defect taxonomy before automating detection

What it is: systematically label generated programs against their scenario, refined requirements, and step-by-step instructions, then supplement observed categories with known language defects. The paper's RQ1 asks what defects occur before designing a detector.

When to use it: use this when a new DSL or verifier-backed agent lacks a stable defect vocabulary. A taxonomy makes detector coverage and blind spots explicit.

How to do it:

1. Generate diverse scenarios across personas, expertise, domains, and real-world datasets (Section 3.1).
2. Refine scenarios into requirements and natural-language instruction steps with a requirements agent (Section 3.1).
3. Generate DSL workflows from those artifacts using the NL-2-DSL pipeline (Section 3.1).
4. Independently open-code an initial stratified sample; each inspector records defect type and exact task-node location (Section 3.1).
5. Calculate inter-rater agreement, reconcile disagreements, continue sampling until no new categories appear, and test categories on a separate real-world slice (Section 3.1).
6. Add plausible categories absent from the sample when prior language research supports them, marking their observed prevalence as zero (Section 3.1).

Evidence: ten initial simulated workflows give Cohen’s κ=0.55; after reconciliation and continued labeling, 55 simulated workflows give κ=0.89 and saturation at 15 emergent types. Ten OpenAGI workflows add no new type, yielding 15 observed categories; five additional categories produce the final 20-category taxonomy. The paper reports, “The taxonomy of defects in FM-generated DSL workflows comprises 20 categories, sorted into three distinct groups.”

Inference: For VL, construct a taxonomy covering malformed Rust/Verus syntax, missing specifications, invalid proof calls, stale evidence, unreachable proof states, and incorrect contracts before building an automatic repair loop. Keep observed and literature-derived categories separate so zero observations are not mistaken for zero risk.

Failure and assumptions: open coding depends on inspector judgment and the generated scenarios are synthetic or dataset-derived. The authors call the taxonomy initial, not complete.

## technique: validate structure before deeper static analysis

What it is: Timon first parses the generated string as JSON, then validates the object against the WorkflowDSL grammar with Pydantic. If either step fails, it records unparsable JSON or invalid DSL and stops deeper analysis.

When to use it: use this fail-fast ordering whenever later analyses require a well-formed intermediate representation.

How to do it:

1. Accept the FM output as a string (Section 4.1).
2. Parse JSON; record an unparsable-JSON defect on failure (Structure Validator A.1).
3. Instantiate and type-check the JSON against the DSL grammar; record invalid DSL on failure (A.2).
4. Only valid programs continue to intermediate representation construction and defect detection (Sections 4.1 and 4.3).
5. After repair, rerun the structure validator before continuing.

Evidence: on 40 simulated workflows, Timon reports 100% precision and recall for invalid DSL; injected unparsable JSON and malformed-expression fixtures also receive 100%/100%. On ten OpenAGI workflows, invalid DSL is likewise 100%/100%. Table 2’s denominators are defect incidences in the stated workflow samples, not all possible malformed outputs.

Inference: In Verus, run the compiler and Verus verifier as a structural gate before invoking proof repair. A Rust enum or schema can represent only parsed action forms; a proof function can establish postconditions only after parsing succeeds. Verus supports a subset of Rust, so unsupported syntax still needs compiler-level handling.

Failure and assumptions: structure validation does not detect semantic omissions, over-engineering, infeasible paths, or concurrency violations. The authors state, “sole static analysis cannot confidently detect whether any defect exists” for runtime-dependent paths.

## technique: construct a control-flow IR with use-def and def-use chains

What it is: Timon lowers a valid workflow into a control-flow graph (CFG), then builds use-def and def-use chains. Detectors query this IR for dataflow and expression properties.

When to use it: use this for DSLs with branches, loops, variable assignments, and skill outputs where local syntax checks cannot determine reachability or data consistency.

How to do it:

1. Parse the validated DSL into a CFG representing regular tasks, branches, switches, and loops (Intermediate Representation Constructor B.1).
2. Build use-def and def-use chains over the CFG (B.2).
3. For each used variable, check whether a prior node defines it; flag unreachable/undefined use (C.1).
4. For each defined variable, check whether a later node uses it; flag unused definitions (C.2).
5. Propagate primitive types along definitions and uses; flag inconsistent assignments or lossy casts (C.3).
6. Parse loop and switch expressions into ASTs and add their variables to dataflow chains (C.4).

Evidence: across simulated workflows, unreachable-variable detection has 50% precision and 71% recall; unused-variable detection 75% precision and 100% recall; incorrect type propagation 37% precision and 72% recall. On OpenAGI, unreachable variables are 33%/58% and unused variables 53%/89%. Overall Timon recall is 80% simulated and 87% OpenAGI, with precision 56% and 67% respectively (Table 2).

Inference: A Verus implementation can model workflow state and variable maps with Rust structs and prove dataflow invariants using `invariant` clauses on CFG traversal loops. `requires` can state that a variable is defined before use; `ensures` can state that accepted transitions preserve type consistency. Inference: Verus proof obligations do not automatically solve feasibility of arbitrary runtime branches; SMT-backed path reasoning or explicit abstractions remain necessary.

Failure and assumptions: conditions depending on runtime values create infeasible-path uncertainty. Timon may miss a defect or report a false positive when it cannot decide whether a path executes.

## technique: compare generated actions and parameters with an authoritative skill database

What it is: detect hallucinated skills by comparing every task action against the available-skill database, then validate input and output parameters for existing skills. The output field is separately checked against the user’s required format.

When to use it: use this at tool-call boundaries where an agent can invent action names, omit parameters, or connect outputs with wrong types.

How to do it:

1. Enumerate each task-corresponding action in the IR (C.5).
2. Look it up in the execution environment’s available-skill database; mark absent actions as hallucinated (C.5).
3. For existing actions, compare supplied input/output parameters to the skill declaration and mark defective parameters (C.6).
4. Check the workflow outputs field against the required format and final-task outputs (C.7).

Evidence: Timon has 100% precision and recall for hallucinated skills, defective skill parameters, and incorrect outputs in the 40 simulated workflows. On OpenAGI, each of those categories also reaches 100%/100% (Table 2). The 40-workflow evaluation is selected from 55 open-coded simulated workflows; the OpenAGI denominator is ten workflows.

Inference: For VL, maintain a hash-locked registry of allowed Verus proof helpers, executable tools, and dependency contracts. A proof-oriented API can make impossible calls unrepresentable, while a verifier checks parameter and module compatibility. This registry and external tool behavior remain trusted unless formally modeled.

Failure and assumptions: a registry comparison cannot detect a semantically wrong but valid skill, inefficient choice, or over-engineered workflow. Those categories require human judgment.

## technique: repair with structured analyzer feedback and category-specific prompts

What it is: Pumbaa sends Timon’s localized defect report to an FM and asks it to repair one category at a time. Prompts add category-specific grammar, output-format, or available-skill context, then use clarity edits, few-shot examples, and in-context learning.

When to use it: use this when a generated program is close enough to analyze and a detector can provide precise, machine-readable feedback. Feedback must identify the defect and location; generic “fix your code” self-correction is the baseline to avoid.

How to do it:

1. If JSON or DSL validation fails, send the workflow to Pumbaa; if repair succeeds, rerun Timon, otherwise mark it incomprehensible and stop (Section 4.3).
2. For each detected category, append the relevant analyzer report and category-specific instructions (Section 4.2).
3. Include DSL grammar for invalid DSL, required output format for incorrect outputs, and the available skill list for hallucinated or parameter defects (Section 4.2).
4. Prompt the selected FM repeatedly, up to ten attempts, until the category’s incidences are repaired or attempts are exhausted (Section 4.3).
5. Re-run Timon after every attempt so newly introduced detectable defects are localized and fed back (Section 4.3).
6. Evaluate each category independently from the original defective workflow to avoid confounding repairs of other categories (Section 4.3).

Evidence: on 40 simulated workflows, GPT-4o with Timon feedback repairs 286/990 incidences at pass@10 (28.89%); Llama repairs 71/990 (7.17%) and Qwen 41/990 (4.14%). The direct-feedback-free GPT-4o baseline repairs 45/990 (4.55%), an 84.25% relative deficit versus feedback. GPT-4o repairs all 31/31 incorrect-output and 3/3 hallucinated-skill incidences, but only 12/55 incorrect-type-propagation and 160/516 defective-parameter incidences. On OpenAGI, it repairs 34/84 (40.48%), including 15/15 hallucinated skills, 12/12 defective parameters, and 4/4 incorrect outputs.

The iterative curve saturates by pass@6 for the simulated set: 27.07%, 28.08%, 28.59%, 28.59%, and 28.69% of all incidences are repaired at passes 1–5, and 28.89% at pass 6. The paper therefore recommends a six-attempt practical cap because token cost rises linearly after saturation; this is a recommendation based on this setup, not a universal optimum.

Inference: In Verus, analyzer feedback can be a structured diagnostic containing source span, failed obligation, expected contract, and exact code hash. A proof repair function can consume that diagnostic and return a candidate, while a separate verifier reruns the proof before acceptance. The paper’s result does not establish that an LLM repair preserves already-proved properties; the re-verification step is essential.

Failure and assumptions: Pumbaa cannot repair invalid DSL in the simulated set (0/3 for all models), and FM repair may introduce new defects. Timon detects only nine of 20 categories; omissions, concurrency violations, over-engineering, and semantic skill quality require other analyses or human review.

## technique: use dynamic or SMT support for path feasibility

What it is: supplement CFG/use-def static checks with dynamic execution or satisfiability modulo theories (SMT) to decide whether branch conditions can occur. The paper’s Listing 1 has variables `p` and `q` defined on different branches and used later; determining whether a use is reachable requires solving constraints over `x` and `y`.

When to use it: use this whenever dataflow warnings depend on mutually exclusive conditions, runtime loop bounds, or values unavailable statically.

How to do it:

1. Extract branch and loop predicates from the CFG (Section 5, Listing 1).
2. Encode variable bounds and path conditions for each candidate use/definition.
3. Ask an SMT solver whether the conjunction is satisfiable; classify an actually feasible path as a real defect and an unsatisfiable path as a false warning.
4. Combine solver results with Timon’s static report before repair.

Inference: Verus already discharges SMT-backed proof obligations when contracts and invariants are explicit. A VL analyzer can expose the same path predicates as `requires` facts and use proof functions to show a path is impossible. Inference: solver success still depends on the abstraction and specification; it does not prove unmodeled workflow effects.

Evidence: the paper does not report an SMT implementation or accuracy number; it presents SMT as a suggested extension after observing Timon’s path-feasibility limits. This distinction matters: the 80%/87% recall numbers are for current Timon, not a hypothetical SMT-enhanced detector.

Failure and assumptions: dynamic analysis may miss paths; SMT models can be incomplete or expensive. Concurrency constraints still require execution or a concurrency model.

## what is proved, measured, and trusted

The paper demonstrates static-analysis conformance and empirical detector/repair performance; it does not formally prove that repaired workflows meet user requirements. Trusted artifacts include the WorkflowDSL grammar, scenario and requirement annotations, skill database, open-coded ground truth, FM APIs, and model-generated repairs. The 89.23% prevalence is from 65 open-coded workflows, not all 385 generated workflows. Table 2’s precision/recall denominators are category incidences in 40 simulated and ten OpenAGI workflows; Table 3’s repair denominators are Timon detections in 40 simulated workflows. Invalid DSL has 3 detected incidences in that table, so a 0/3 result is sparse.

## implications for VeruLaw

Inference: VL should place a verifier-in-the-loop after every agent-generated Rust/Verus patch: parse and compile; construct a proof/dataflow IR; run Verus; emit structured diagnostics; repair one defect class; and re-run all checks. Hash the source, dependency environment, and diagnostic so stale proof errors cannot be applied to a new code state.

Inference: the paper’s static/dynamic split maps directly to VL. CFG and use-def checks can catch undefined proof facts, unused lemmas, type mismatches, invalid verifier constructs, and unreachable branches; Verus proofs and SMT reasoning can discharge path-specific obligations; executable tests or model checking are needed for runtime and concurrency behavior. Threat to agent-written verified Rust is high for generated plumbing around proofs, tools, and APIs: syntactic validity and a passing local check do not cover omitted logic, wrong contracts, or unsupported environmental behavior.

Inference: VL should report detection precision/recall and repair success by defect category, with denominators, rather than one pass rate. Existing VL work should not redo generic self-correction without external verifier feedback; this paper's baseline repairs 45/990 incidences (4.55%) versus 286/990 (28.89%) with Timon reports, while the latter still leaves most defects unresolved.

## techniques for the catalog

- taxonomy-first auditing — open-code generated DSL programs against requirements and build a defect vocabulary before detector design
- structure-gated analysis — parse JSON and validate the DSL schema before constructing deeper representations
- CFG/dataflow analysis — build control-flow, use-def, and def-use chains to detect reachability, usage, and type propagation defects
- skill-registry checking — compare generated actions and parameters with an authoritative available-skill database
- verifier-feedback repair — feed localized static-analysis reports and category-specific context to an FM repairer
- iterative rechecking — rerun the analyzer after every repair to catch both unresolved and newly introduced defects
- path-feasibility support — add dynamic execution or SMT solving when static dataflow cannot decide runtime reachability
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
