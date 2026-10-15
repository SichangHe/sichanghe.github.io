# A Task-Centric Ontology and Deterministic Domain Rules as a Verifiable Core for AI-Assisted Chemistry Problem Solving
(authored by agents unless marked 🧑)
Tag: `abduchaborov2026taskcentric`, [paper](http://arxiv.org/abs/2608.26164v1)

## scope and result

The paper presents ChemOntoRule, a bounded symbolic chemistry core. Its evaluated artifact is a JSON and RDF/Turtle ontology plus deterministic Python procedures and a separate fallback map. The proposed language-model translator is not evaluated. The paper states: “The central design choice is task-centric ontology engineering: the ontology is constructed around the concepts, properties, relations, and executable procedures required by a defined collection of chemistry problems, rather than as a universal representation of chemistry.” (abstract, p. 1)

The collection has 300 human-authored, manually validated school-level problems. The collection both defined requirements and served as the test set, so the evidence is internal coverage and consistency. It is not independent generalization. Selection-sequence questions dominate: 291/300. The artifact routes 269/300 to reusable ontology rules (89.67%) and 31/300 to expert-coded fallbacks. It matches 296/300 references overall (98.67%), 266/269 rule cases (98.88%), and 30/31 fallback cases (96.77%). All 300 outputs pass structural checks, but those checks do not establish chemical correctness. The reported Wilson intervals are descriptive and do not remove design-set dependence (Sections 4, 7–9, Table 2, pp. 4, 7–8).

## technique 1: derive a task-centric ontology from competency requirements

What it is. Start from a bounded task collection, identify the concepts and relations needed by each recurring problem family, and represent only that executable slice. The paper’s five required items are “the entities and values explicitly present in the question;” “the target relation, classification, or ordering;” “the chemical properties required to reach the target;” “the conditions under which a rule is applicable;” and “the output format and available structural checks.” (Section 5.1, p. 5)

When to use it. Use this when a system must solve a defined family of tasks and needs an inspectable core quickly. It deliberately avoids building a universal domain ontology before solving any task. The paper’s competency examples ask which elements have a specified outer-level electron count, which oxidation states fit an oxide, which elements should be ordered by a trend, and which ion-electron transformation gives a stable shell (Section 5.1, p. 5).

How to do it, from the paper. (1) Inspect recurring problem families. (2) List entities, values, requested relation, applicability conditions, and output checks for each family (Section 5.1). (3) Declare ontology classes and relation groups. This implementation declares four classes—Element, PeriodicTrend, OxidationStateRule, and ManualReactionPattern—and eight task-relevant relation groups (Section 5.3, p. 6). (4) Add instances and derived attributes for the task space: 52 elements and approximately 1,029 RDF triples, including 17 datatype properties (Section 5.3). (5) Keep executable procedures separate from the graph when that is practical; the paper explicitly calls this an “ontology-backed external rule engine, not a pure OWL reasoner” (Section 5.3, p. 6).

Verus form (Inference: the paper uses Python/RDF, not Verus). Represent the normalized task frame and ontology facts as Rust structs with explicit invariants. A `spec fn` can define applicability and a result relation; an executable function can have `requires` for a valid frame and `ensures` tying its returned result to the specification. A `proof fn` can establish that each declared task family has the required properties. A loop that iterates over task requirements can carry an `invariant` annotation. RDF serialization, parsing, and external chemistry data remain assumptions unless separately modeled and verified; Verus proves the stated contracts, not that the ontology is chemically complete.

Evidence and limits. The implementation has four classes, eight relation groups, 52 element individuals, and 1,029 approximate triples (Table 5, p. 14). It routes 269/300 tasks to reusable rules. Because requirements and evaluation share the same collection, the paper says the rates “do not estimate performance on an independent unseen distribution.” (Section 4, p. 4) A lightweight graph with procedural Python leaves most logical behavior outside OWL/SHACL, and selection-sequence imbalance limits conclusions about calculations and derivations (Section 13, pp. 11–12).

## technique 2: separate reusable rules from expert-coded fallbacks

What it is. Every solution receives a method label: `ontology_rule` for a reusable deterministic procedure linked to ontology data, or `manual_expert` for a task-specific coded answer. The distinction prevents a fallback from being counted as general inference and supplies an expansion path: model its entities, applicability conditions, transformations, and validation independently of task identifiers (Section 6, p. 6).

When to use it. Use this routing when coverage is incomplete but a system must still answer known task families. Report the two populations separately; merging them obscures whether a reusable method works.

How to do it. (1) Parse a task into a recognized family. (2) Route it to a general rule if its entities and conditions are represented. (3) Otherwise route to a named fallback. (4) Record answer, linked concepts, trace, and method label. (5) When a fallback recurs, extract its entities, preconditions, transformation, and checks into a general rule, then remove the task-specific mapping (Sections 6–7).

Verus form (Inference). Define an enum for `OntologyRule` and `ManualExpert`, and return the method label with the answer. Give each branch a contract. For the general branch, a `requires` clause states the frame is represented; an `ensures` clause states the result satisfies the rule specification. For a fallback, a contract must state exactly which finite task keys are accepted. A `proof fn` can prove that routing is exclusive and that every returned answer satisfies its branch contract. Do not mark a runtime function `external_body` merely to bypass proof; that would leave the core unverified.

Evidence and limits. Of 300 tasks, 269 use rules and 31 use fallbacks. Rule matching is 266/269; fallback matching is 30/31 (Table 2, p. 7). The paper reports four total mismatches and classifies them as missing semantic scope, incomplete applicability conditions, oversimplified transition-metal heuristics, and task-specific arithmetic (Section 10, pp. 8–9). Fallback performance must remain separate because it is not evidence of reusable ontology inference.

## technique 3: execute a six-stage deterministic pipeline with traces and structural validation

What it is. The instrumentation models each solution as six stages: “task intake;” “condition parsing;” “solver routing;” “ontology-context lookup;” “answer production;” and “result validation.” (Section 7, p. 7) Each record stores a final answer, linked concepts, a short solution trace, and a method label (Section 6, p. 6).

When to use it. Use this decomposition when failures must be localized to parsing, mapping, applicability, execution, or validation. It also gives a stable interface for an AI translator: the translator emits a normalized frame, while the core selects and executes a rule.

How to do it. (1) Intake the task. (2) Parse conditions and requested output. (3) Route to a solver. (4) Look up ontology context. (5) Produce an answer and trace. (6) Validate answer presence, non-empty selections, plausible selection length, and option-index range (Section 7). Distinguish structural validity from reference matching: structural validity only checks format; reference matching compares normalized output to a human-validated answer (Section 7).

Verus form (Inference). Define a pure specification for each stage and an executable pipeline function with `requires` on the input frame and `ensures` that the returned trace records all six stages in order and that validation predicates hold. Use `assert` and small `proof fn`s for stage-preservation facts. A loop over stages can use an `invariant` annotation describing the prefix already processed. The reference answer and its chemical correctness are external assumptions unless encoded as a verified specification.

Evidence and limits. The run produced 1,800 stage records and 1,800 event logs for 300 tasks (six per task), but dashboard durations are visualization values, not wall-clock measurements (Section 7, p. 7). All 300 outputs passed structural checks, while only 296 matched references. Thus format validation is weaker than domain correctness. Exact normalized matching can also disagree because of rounding or ambiguity (Section 13, p. 12).

## technique 4: normalized task frames and asymmetric LLM integration

What it is. The proposed architecture assigns language understanding to an LLM and chemistry reasoning to explicit rules. Figure 1 labels the AI translation layer “proposed; not evaluated” (p. 2). The translator emits a compact frame with fields such as `task_family`, `entities`, `requested_relation`, `constraints`, and `output_schema`; the symbolic core computes the answer, trace, and validation status (Sections 5.2 and 11, pp. 5, 10).

When to use it. Use this split when natural-language variation is broad but domain rules can be made deterministic. It localizes errors: parsing, ontology mapping, applicability, execution, and validation can be inspected separately (Section 11, p. 10).

How to do it. (1) Receive a natural-language request. (2) Translate it to a normalized frame. (3) Select an applicable deterministic rule. (4) Execute it against ontology context. (5) Record the trace and validation status. (6) Optionally verbalize the trace. The paper gives a JSON frame with atomic-structure family, five element entities, an outer-electron relation, a ground-state constraint, and a two-option output schema (Section 11, p. 10).

Verus form (Inference). Treat the frame as a Rust datatype with a closed task-family enum. Verify a parser contract only for the subset of language forms modeled; use `requires` to reject missing entities or unsupported constraints. The rule executor gets `ensures` relating the output to the frame and ontology. Keep natural-language generation outside the proof boundary, or verify only a structured trace-to-text correspondence. The translator itself is an untrusted input producer: a valid proof of the core does not prove that an LLM translated the user’s intent correctly.

Evidence and limits. The translator was not implemented or evaluated. The paper makes no claim of out-of-distribution generalization, controlled LLM superiority, reduced inference cost, or measured token savings (Sections 3 and 11, pp. 3, 10). Its proposed future comparison includes LLM-only, retrieval, ontology context, and translator-plus-symbolic execution, measuring tokens or cost per correct solution (Section 12.3, p. 11). The stored LLM file matched 300/300, but model, prompts, decoding, token counts, retries, and post-processing were not preserved, so it is excluded from central claims (Sections 8 and 13, pp. 7, 11–12).

## technique 5: explicit mismatch analysis and rule repair

What it is. Analyze every reference mismatch by semantic failure class, then repair the reusable abstraction rather than patching one task. The four reported cases include a bad calculation, failure to model stable-shell formation after losing three electrons, confusion between aggregate and same-level subshell counts, and an inadequate transition-metal trend heuristic (Table 4, p. 9).

When to use it. Use this after a deterministic core has high but imperfect reference matching. The goal is to make scope and applicability explicit so that the next task can reuse the repair.

How to do it. (1) Compare normalized output with the validated reference. (2) Locate the failing stage and rule. (3) State the missing semantic distinction or precondition. (4) Replace task arithmetic with a reusable equation and tolerance checks, bind electron counts to the same principal level, or replace a generic trend score with an appropriate domain relation (Sections 10 and Table 4). (5) Re-run the full collection and report denominators for each subset.

Verus form (Inference). Encode each repaired distinction in the specification: for example, a stable-shell predicate can require that electron loss yields the specified shell count; a same-level predicate can quantify over one principal level rather than aggregate subshells. Prove the repaired predicate implies the output condition with a `proof fn`; use `assert` for arithmetic equalities and explicit preconditions for tolerances. Do not claim proof of chemical truth unless the chemical model itself is formalized.

Evidence and limits. The system’s four mismatches are 4/300; family rates are 100% for oxidation states, expert reactions, organic chemistry, and extended equations, but 98.04% (100/102) for atomic structure, 99.01% (100/101) for periodic trends, and 75% (3/4) for calculations (Table 3, p. 9). These denominators matter because the dominant selection tasks make the overall rate insensitive to sparse calculation failures. The paper’s own diagnosis is engineering evidence, not a proof that the revised rules generalize.

## what is proved, measured, and trusted

Measured: routing counts, exact normalized reference matches, descriptive Wilson intervals, stage-record counts, ontology size, and mismatch categories. Structural validation passed all 300 outputs. Not measured: real latency, token usage, cost, independent generalization, or a controlled LLM comparison. The ontology and rules were developed from the same collection used for evaluation. The Python implementation, RDF serialization, reference answers, and manual validation are trusted inputs; the paper does not provide a formal proof of chemical correctness. Inference: a Verus implementation could reduce bugs in routing, arithmetic, and trace consistency, but it would still trust the modeled chemistry, parser assumptions, ontology facts, external libraries, and the Verus toolchain unless those boundaries were separately verified.

## what VL should reuse and threat to a product

Inference: VL should reuse the translator-to-normalized-frame boundary, explicit rule applicability, separate fallback accounting, six-stage traces, and mismatch-driven rule repair. These are concrete interface and verification patterns already demonstrated in this bounded prototype. VL should not redo the paper’s claim that a task-centric symbolic core can be inspectable; it should instead test whether the same separation works for agent-written Rust and Verus contracts, with independent tasks and measured repair effort. Inference: the product threat is moderate at the architecture level—another system shows a credible way to constrain an LLM to translation while keeping domain execution deterministic—but low as evidence of a competing verified-Rust product, because no Verus proof, independent test set, deployed translator, or product-scale system is reported.

## techniques for the catalog

- task-centric ontology derivation — derive classes, relations, applicability conditions, and output checks from a bounded task collection

- rule/fallback separation — label reusable ontology procedures separately from task-specific expert mappings and report each denominator

- six-stage deterministic pipeline — intake, parse, route, look up context, produce a traced answer, and validate output structure

- normalized-frame translation — have an LLM emit a constrained task frame while deterministic code performs domain reasoning

- mismatch-driven rule repair — classify each disagreement by semantic scope, applicability, heuristic, or arithmetic failure and repair the reusable rule
Checked 2026-10-15 against paper abduchaborov2026taskcentric: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
