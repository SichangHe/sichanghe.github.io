# Structured Decomposition for LLM Reasoning: Cross-Domain Validation and Semantic Web Integration
(authored by agents unless marked 🧑)
Tag: `sadowski2026structured`, [paper](https://arxiv.org/abs/2601.01609)

## central architecture
The paper separates interpretation from rule execution. Its abstract states: “LLMs serve as ontology population engines, translating unstructured text into ABox assertions according to expert-authored TBox specifications, while SWRL-based reasoners apply rules with deterministic guarantees.” (Abstract, p. 1). TBox is the ontology's terminological part (classes, properties, and their relationships); ABox holds the individuals and property assertions extracted from an input (§2.4, p. 4). In this framework the SWRL rules are part of the task ontology (§3.4, p. 8). The tested tasks are legal hearsay, scientific method application, and clinical-trial eligibility. Each has 94 test instances, and 11 models are evaluated (Table 3 and §5.1, pp. 11–12).

## technique 1: ontology-driven entity identification

### what and when
Use an ontology to tell an LLM what entities to extract from text. It is the first of the paper’s three steps. The paper’s three-step pipeline is “entity identification extracts individuals from text according to class definitions; assertion extraction determines which properties hold for those individuals; rule application uses an OWL reasoner to infer classifications based on SWRL rules” (§3.1, p. 6).

### procedure from the paper
1. Domain experts define OWL classes in the task TBox and attach natural-language entity descriptions and OWL-class mappings; each entity type has a name, a description guiding extraction, and an OWL class mapping (§3.2, p. 7; §3.1, p. 6).
2. Prompt the LLM with the input text and these specifications. It identifies spans, assigns individual identifiers and classes, and explains each extraction (§3.2, p. 7).
3. Convert each extracted individual and class membership into an ABox assertion (§3.2, p. 7).
4. Preserve the span and explanation for review. The authors note that boundary errors and implicit entities require interpretation, and explanations that fail to justify an extraction coherently signal potential errors for human review (§3.2, p. 7).

### Verus form
Inference: represent recognized entities as a ghost/spec sequence and the ontology’s class-membership relation as a `spec fn`. A verified parser wrapper can state with `ensures` that every emitted span is within the input and every class is allowed by the schema. LLM extraction remains an external, untrusted input; Verus can check shape and consistency, not semantic truth of a natural-language explanation.

### evidence and limits
The ABox keeps every extraction as an inspectable record (§3.5, p. 8). Entity boundaries and implicit references remain failure points (§3.2, p. 7). The study uses English-language and binary-classification tasks only (§7.7, pp. 19–20), so multilingual or multi-class extraction is unmeasured.

## technique 2: assertion extraction with explicit complementary predicates

### what and when
After identifying entities, ask the LLM whether each ontology-defined property holds and require evidence. The paper defines assertion specifications with an assertion name, related entity types, description, and OWL class or object-property mapping (§3.3, p. 7). Complementary predicates add an explicit positive and negative assertion to address OWL’s open-world assumption, under which missing information means “unknown” rather than false (§3.3, p. 7).

### procedure from the paper
1. Supply identified entities and assertion specifications to the LLM (§3.3, p. 7).
2. For every specification, obtain a Boolean determination and a natural-language justification citing text (§3.3, p. 7).
3. Map unary determinations to class assertions and binary determinations to object-property assertions in the ABox (§3.3, p. 7).
4. When evaluating the complementary-predicate condition, include paired assertions such as `FunctionalConn` and `NoFunctionalConn`; otherwise use the standard predicate set (§5.2, p. 13).

### Verus form
Inference: encode each assertion as a typed enum or Boolean relation, and prove that the final rule consumes only schema-declared predicates. A `requires` clause can enforce that a complementary pair is mutually exclusive; an `ensures` clause can require that every required predicate has an explicit value. The text justification should be stored as audit data, not treated as proof.

### evidence and limits
Complementary predicates hurt this evaluation by 5.0 F1 points overall (p = 0.001) and by 10.3 points on clinical eligibility (§7.3, p. 19). The authors therefore recommend minimal predicate sets and empirical validation. This contradicts their earlier work, where the pattern helped some models (o1 +14.5pp F1, o3-mini +13.7pp) but not others (Claude 3.7 Sonnet -1.3pp) (§7.3, p. 19). The authors attribute the reversal partly to model dependence and to weaker confirmation bias in newer models; this explanation is theirs and was not tested separately.

## technique 3: deterministic SWRL verification and inspectable ABox

### what and when
Encode the decision boundary as SWRL rules and let an OWL reasoner derive the classification. The paper says this applies when authoritative rules fully determine the classification and the predicates can be extracted from text (§4.1, pp. 8–9). Each task’s ontology holds classes and properties; the target class is inferred from a conjunction of class-membership tests and property assertions (§3.4, p. 8).

### procedure from the paper
1. Create the task ontology in OWL 2, with TBox classes, object properties, domain/range restrictions, and prompt metadata as annotations (§3.4, pp. 7–8).
2. Encode each classification rule as an SWRL antecedent-consequent rule (§3.4, p. 8).
3. Populate the ABox from entity and assertion extraction (§3.2–3.3, p. 7).
4. Invoke Pellet to perform consistency checking, classification, and SWRL execution (§3.5, p. 8).
5. Record the inferred class and retain the populated ABox. Query it with SPARQL to inspect entities and assertions (§3.5, p. 8).

The authors write: “Because the symbolic reasoner always produces the same output for a given set of assertions, any variability in the framework’s behaviour stems solely from the LLM-based extraction steps.” (§3.5, p. 8).

### Verus form
Inference: translate a finite subset of the ontology into `spec fn` predicates and proof functions whose postconditions derive the target predicate from the antecedents. Use Rust data types for entities and relations, and prove that rule application is deterministic. OWL’s open-world and richer description-logic semantics do not automatically carry over; the supported fragment and handling of unknown predicates must be stated explicitly.

### evidence and limits
Across 33 model-task combinations, SD averages 79.8% F1 versus 75.2% few-shot and 74.1% chain-of-thought; the 4.6-point gain is significant (t(32)=2.88, p=0.007, d=0.50), with nine of 11 models improving (§7, p. 17; §6.7 repeats “nine of eleven” but then lists three models that degraded, an inconsistency in the paper). Replacing SWRL with an extra LLM call that picks the final class from the extracted predicates (SD-Direct) lowers F1 by 9.7 points overall (t(32)=3.71, p=0.001, d=0.65); clinical eligibility falls from 74.5% to 54.6% (§6.2, p. 15; Table 7 prints 74.4 and 54.5). Per task, SD beats few-shot by +7.3pp on method application (p=.034 in Table 8, p=0.008 in §6.5), +3.6pp on clinical eligibility (p=.104) and +2.8pp on hearsay (p=.402); only method application is significant (Table 8, p. 17). Hearsay’s SD/SD-Direct difference is only 0.7 points (75.9% vs 75.2%); the authors read this as extraction dominating performance (§6.2, p. 15). Inference: this means verification cannot repair incorrect extraction. Negative control: on URTI diagnosis (DDXPlus), which lacks a rule-expressible boundary, SD scored 0.145 F1 versus 0.979 for few-shot (§4.1, p. 9). Setup caveat: 94 test instances per task and 4–5 few-shot examples (Table 3, p. 11).

## what is proved, trusted, and relevant to VL
The symbolic reasoner provides deterministic rule application conditional on the ABox. The experiment measures classification F1, accuracy, precision, recall, and paired statistical tests; it does not formally prove that an LLM extracted the right entity or predicate. Trust remains in ontology authors, natural-language specifications, parser/LLM outputs, Pellet, and dataset labels. Rules are simple conjunctions: hearsay has five conditions, method application four, and eligibility three (§7.2, p. 18). The paper says benefits for disjunctions, negation or nested quantifiers are “unknown”, multi-class classification, ranking and extraction tasks are “untested”, and performance in other languages is “unknown” (§7.7, pp. 19–20).

Inference: VL can reuse the architecture by having an LLM propose typed facts and letting Verus proofs derive safety properties from those facts. The Verus specification and checker must be protected from agent edits; otherwise extraction or specification gaming can yield a valid proof of the wrong property. VL should not redo this paper’s generic binary-classification benchmark; it needs Rust/Verus tasks and a trusted specification corpus.

## techniques for the catalog
- ontology-driven entity extraction — define classes in a TBox, extract spans and typed individuals, and retain explanations in an ABox
- assertion extraction with explicit polarity — evaluate each schema predicate with evidence, optionally adding complementary positive and negative facts
- SWRL or Verus rule verification — apply deterministic formal rules to the populated facts and retain the complete reasoning trace for inspection
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We constrain test set sizes to 94 instances per task, determined by the smallest available dataset (hearsay)."): read the whole paper text (abstract to conclusion; references only skimmed) and the whole study; checked every quotation, number, section and page reference, and the procedure steps against §§3.1-3.5, 5.2, 6.2, 7.2, 7.3 and 7.7; changed several page references (§3.2 is on p. 7, §7.7 spans pp. 19-20), the model-dependence sentence (the paper gives it as an explanation, not a listed limitation), the "unknown" claim in the trust paragraph, and added the per-task significance results, the URTI negative control, the SD-Direct definition, and two internal inconsistencies of the paper (nine-of-eleven count, p-value .034 vs 0.008); marked the hearsay reading as the authors' and the follow-on as Inference; the Verus forms and VL relevance are unchecked Inference, not from the paper; did not check the cited references, the supplementary repositories, the figures beyond their captions, or the datasets.
