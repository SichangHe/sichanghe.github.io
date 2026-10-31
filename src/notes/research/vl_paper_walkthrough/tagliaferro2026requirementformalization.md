# Towards an Agentic LLM-based Approach to Requirement Formalization from Unstructured Specifications
(authored by agents unless marked 🧑)
Tag: `tagliaferro2026requirementformalization`, [paper](https://arxiv.org/abs/2604.18228)

## problem and pipeline

This paper turns informal natural-language specifications into verification-ready temporal properties through a staged LLM workflow. The evaluation uses three human-robot interaction (HRI) scenarios represented in the LIrAs domain-specific language, which generates Stochastic Hybrid Automata (SHA) models for UPPAAL Statistical Model Checking (SMC). The stages are requirement extraction, verifiability classification, and formal translation. The paper emphasizes semantic alignment, not merely grammar: “Syntactic correctness can be checked automatically by validating models against a grammar, compiling them, or verifying well-formedness constraints defined by modeling guidelines.” (Section 1, p. 2). It immediately warns that such checks do not show that a property matches natural-language intent.

The target data contain 71 ground-truth requirements, 52 labelled verifiable, and 72 ground-truth queries across SC1 Coffee_Delivery, SC2 User_Guided_Transport, and SC3 Factory_Pipeline (Table 1, p. 6). Evaluation runs each stage independently against manually constructed ground truth to prevent cascading errors. The authors use gemini-3.1-pro-preview at temperature 0.1 and constrain outputs to application/json (Section 5.1, p. 7).

## technique 1: extract atomic requirements into a traceable representation

what it is

Stage 1 converts unstructured specifications into atomic natural-language requirements with identifiers, concentrating on functional and safety constraints. The output is normalized JSON so later stages can process each requirement. The paper describes the purpose as “isolating functional and safety constraints embedded in the system description, while using the standard requirements syntax (e.g., ‘The system must...’, ‘The human agent has to...’, ‘The robot shall...’).” (Section 4, p. 5).

when to use it

Use this stage at the boundary between prose and formal modeling, before asking an LLM to emit temporal logic. Extraction should preserve the specification’s entities, dynamics, operational constraints, and abstraction level. It should not invent plausible domain facts.

how to do it

1. Provide the informal specification to an extraction LLM (Section 4, p. 5).
2. Instruct it to identify relevant entities, system dynamics, physical dynamics, safety aspects, and agent roles (Section 5.1, p. 7).
3. Require a strict JSON schema with an identifier and one atomic requirement per record (Section 4, p. 5; Section 5.1, p. 7).
4. Use two-shot examples: the hand-crafted requirements for the other two scenarios are supplied as assistant examples (Section 5.1, p. 7).
5. Compare generated and ground-truth lists with an LLM judge allowing many-to-many matches. The judge labels Match, Partial, or NoMatch and gives a confidence score, justification, and missed ground-truth items (Section 5.1, p. 7).

The paper reports 24 exact matches, 21 partial matches, and 10 no matches among 55 generated requirements, or 43.6%, 38.2%, and 18.2% respectively (Table 2, p. 8). Recall of ground-truth requirements is 60.6%, with 28 of 71 unmapped. The reported combined exact-plus-partial rate is 81.8% of generated requirements (45/55); the denominator is generated requirements, not all ground-truth requirements.

Verus form

Inference: Store extracted requirements as a reviewable manifest, then map each accepted record to a Verus contract. A requirement about input assumptions becomes `requires`; an output guarantee becomes `ensures`; a state-dependent loop condition becomes a loop `invariant`. Keep the JSON identifier as traceability metadata. Extraction alone is not proof and should not be treated as a specification until a human or independent artifact confirms its meaning. The paper does not discuss Rust or Verus.

limits and assumptions

The model omitted strict logical prerequisites, task-completion guarantees, and failure detection, and it introduced unstated constraints such as employee identification and safe following distances (Section 5.2, pp. 8–9). It also decomposed high-level transport operations into excessively granular steps. Thus an 81.8% semantic-match figure does not guarantee complete or faithful requirements.

## technique 2: classify formal verifiability before translation

what it is

Stage 2 is a formal gatekeeper. It removes requirements that cannot be expressed or observed in the target SHA model, including unobservable variables, qualitative design intentions, and model-external phenomena. This lets extraction seek completeness without prematurely biasing toward model limitations.

how to do it

1. Provide each requirement, the informal specification, and the model’s semantic boundaries to a classification LLM (Section 5.1, p. 7).
2. State assumptions explicitly, including memorylessness, no physical-damage detection, and stationary machines with infinite resources and zero processing delay (Section 5.1, p. 7).
3. Require a strict JSON array with “Yes” or “No” and a concise justification (Section 5.1, p. 7).
4. Compare predictions with manually labelled verifiability ground truth (Section 5.1, p. 7).
5. Pass only “Yes” requirements to formal translation (Section 4, p. 5).

The confusion matrix has TP=49, FN=3, FP=5, TN=14, totaling 71 requirements (Table 3, p. 9). Accuracy is 63/71 = 88.7%; precision is 49/(49+5) = 90.7%; recall is 49/(49+3) = 94.2%. These fractions reconcile with the reported percentages. The authors say the gate reduces downstream failures and token use by excluding inexpressible requirements, but five false positives remain and are expected to be caught later.

Verus form

Inference: Implement this as a pre-verification review that checks whether each candidate contract refers only to modeled state and supported types. A “No” result should block translation; a “Yes” result authorizes drafting but does not prove correctness. In Verus, unobservable state should not be smuggled into `requires` or `ensures`; model assumptions belong in explicit preconditions or trusted environmental axioms. These are mappings inferred from the gate design.

limits and assumptions

The classifier itself is an LLM and can misclassify requirements. The paper’s model-specific assumptions mean the 88.7% result may not transfer to another formalism or richer system model. The gate checks expressibility, not whether the requirement is desirable or complete.

## technique 3: translate filtered requirements with grammar and model mappings

what it is

Stage 3 translates each verifiable requirement into a UPPAAL SMC query. The prompt supplies a compact BNF grammar and explicit mappings between LIrAs syntax and the generated UPPAAL model. Queries can then be checked by the UPPAAL verification engine.

how to do it

1. Provide only requirements surviving Stage 2 (Section 4, p. 5).
2. Include the target query grammar in BNF and mapping rules from LIrAs entities to UPPAAL model variables (Section 5.1, p. 7).
3. Generate one or more temporal queries per requirement; the ground truth contains 72 queries for 52 verifiable requirements (Table 1, p. 6).
4. Run every query through the UPPAAL `verifyta` compiler; reject syntax failures (Section 5.1, p. 7).
5. For compiled queries, check exact textual equality with ground truth (Section 5.1, p. 7).
6. For compiled but textually different queries, ask an LLM judge to apply explicit equivalence rules: logical commutativity, implication equivalence, spatial symmetry, and tolerance for simulation-time bounds; penalize reachability/safety confusion (Section 5.1, pp. 7–8).

The three-level validation is stated directly: “Syntax Check: First, we evaluate the syntactic validity of the queries by passing them through the UPPAAL verifyta compiler.” (Section 5.1, p. 7). Table 4 reports 69/72 compiled (95.8%), 25/72 exact matches (34.7%), and 31 additional valid queries among the 44 compiled non-exact queries. The resulting semantic accuracy is (25+31)/72 = 56/72 = 77.8%. Scenario denominators are SC1 15 queries (15 compiled, 8 exact, 3 additional; 11/15=73.3%), SC2 23 (22 compiled, 10 exact, 3 additional; 13/23=56.5%), and SC3 34 (32 compiled, 7 exact, 25 additional; 32/34=94.1%).

Verus form

Inference: Translate each accepted requirement into a Verus function contract, then run Verus as the syntax and proof checker. Logical equivalence should be discharged by proof obligations or lemmas, rather than an LLM judge silently declaring two contracts equivalent. For a temporal property, represent state-machine transitions explicitly and use `invariant` on loops; retain the source requirement and mapping rationale beside the contract. The paper’s BNF/UPPAAL details do not carry over directly to Rust.

limits and assumptions

Exact string matching underestimates semantic equivalence, but the relaxed judge is itself an LLM and can accept an invalid equivalence. The paper reports that SC3’s 20.6% exact-match rate became 94.1% after semantic judging, illustrating sensitivity to abstraction. The overall 77.8% is therefore a judged-equivalence metric, not a theorem that all 56 queries satisfy the intended requirements.

## what is proved, measured, and trusted

The paper demonstrates an agentic pipeline on three synthetic or literature-inspired HRI scenarios, not a soundness theorem for LLM translation. It measures extraction agreement, verifiability classification, compiler acceptance, exact match, and judged semantic equivalence. Ground truth is manually constructed, and stage-wise independence prevents one stage’s errors from inflating another’s score. The trusted artifacts are the LIrAs/SHA model, hand-crafted ground truth, UPPAAL compiler, and evaluation prompts; the extraction and semantic judges remain probabilistic.

## techniques for the catalog

- atomic requirement extraction — normalize prose into identified JSON requirements before formal translation
- verifiability gate — filter properties outside the target model’s observable and semantic boundaries
- grammar-constrained translation — generate formal queries under an explicit BNF and model mapping
- three-level validation — apply compilation, exact comparison, and carefully justified semantic-equivalence checking
