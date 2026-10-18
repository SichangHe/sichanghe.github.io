# Reliable Natural Language Understanding with Large Language Models and Answer Set Programming
(authored by agents unless marked 🧑)
Tag: `rajasekharan2023reliable`, [paper](https://doi.org/10.4204/EPTCS.385.27)

## central architecture

STAR (Semantic-parsing Transformer and ASP Reasoner) splits language understanding into a learned extraction stage and a symbolic reasoning stage. An LLM maps text to predicates; Answer Set Programming (ASP) stores commonsense facts and rules; the goal-directed s(CASP) engine answers a query and emits a proof tree. The abstract states: “Goal-directed ASP is then employed to reliably reason over this knowledge.” (Abstract, p. 274.) The paper applies the architecture to qualitative reasoning, algebra word problems, and a restaurant concierge bot.

The execution boundary is explicit: “The query is executed on the s(CASP) goal-directed ASP system against the LLM-generated predicates and ASP-coded commonsense knowledge to generate a response.” (Introduction, p. 275.)

For VeruLaw (VL), the transferable technique is a trust boundary: an agent proposes structured facts or specifications, while a deterministic verifier derives consequences and explanations. Inference: this is useful for extracting Rust preconditions, postconditions, and invariants from prose, but ASP's nonmonotonic semantics and s(CASP) are not substitutes for Verus's Rust ownership and solver semantics.

## technique: split semantic parsing from symbolic reasoning

What it is. The LLM is used for semantic parsing, “converting sentences to predicates that capture their semantics,” while ASP handles reasoning (Introduction, p. 275). The authors fine-tune or use in-context learning with text–predicate examples, encode commonsense knowledge in advance, and execute a query against generated predicates plus rules.

How to apply it.

1. Choose a predicate vocabulary for the domain, e.g. `has/4`, `transfer/5`, `total/4` for algebra (Section 4, p. 280) or six E2E restaurant predicates (Section 5.1, p. 283).
2. Supply demonstrations or fine-tuning pairs mapping text to predicates (Sections 3.2, 5.1).
3. Parse each input with the LLM; in QuaRel an `<EOS>` token cuts off generation (Section 3.2, p. 278), and for the concierge bot the authors renamed the E2E predicates so GPT-3 better understands them (Section 5.2, p. 283). Inference: validating or normalizing generated predicates is a step the paper does not describe; it only says integrity constraints "help in checking the consistency of the information extracted" (Section 2, p. 277).
4. Encode domain facts, default rules, integrity constraints, and possible worlds in ASP (Section 2, pp. 276–277).
5. Assert the observation or conversation state and execute a goal-directed query in s(CASP) (Sections 3.3, 5.2).
6. Return the answer and the generated proof tree (Section 2, p. 277; example in Section 4.1, p. 281).

Verus form. Inference: an LLM can propose a Rust specification record from prose, but a Verus proof must then establish the record's relation to executable code. Use `requires`, `ensures`, loop `invariant`, and `proof fn` constructs for the checked part; do not treat generated predicates as proofs. Inference: the ASP layer can organize candidate facts and rule dependencies before emitting Verus source, while Verus remains the final checker.

Evidence and limits. The paper reports that predicates make failures inspectable and proof trees explain answers (Sections 3.4, 4.1, 6). It does not prove that generated predicates are always faithful. Inference: wrong extraction remains a soundness boundary unless the downstream specification checker rejects it.

## technique: encode defaults, constraints, and alternative worlds

What it is. s(CASP) represents commonsense knowledge using default rules, integrity constraints, and multiple possible worlds. The paper's default example is `flies(X) :- bird(X), not abnormal_bird(X).` with `abnormal_bird(X) :- penguin(X)`. Its integrity constraint is `false :- person(X), sit(X), stand(X).` (Section 2, p. 277.) These constructs model exceptions, impossible combinations, and assumption-based alternatives.

When to use it. Use default rules for defeasible assumptions, integrity constraints for explicit safety invariants, and possible worlds when a fact is uncertain or alternatives must be explored.

Verus form. Inference: defaults should become explicit preconditions or case splits in Verus, because a Rust proof cannot silently assume a defeasible rule. Integrity constraints correspond to predicates that must be preserved by every verified transition, often expressed as loop invariants or state-machine invariants. Inference: multiple worlds require an explicit ghost state or enum of cases; each case must satisfy its own contracts.

## technique: compile qualitative reasoning into predicates and rules

The QuaRel example translates an observation and two answer choices into `qrel` predicates. The paper gives the logical form `qrel(distance, higher, world1) → qrel(friction, higher, world2) ; qrel(friction, higher, world1)` (Section 3.1, p. 278). The LLM is fine-tuned on prompts containing the question, answer options, and world descriptions; it emits an observation and conclusion in a fixed format with an EOS token (Section 3.2, p. 278). ASP grounds 19 properties, records positive and negative correlations, handles opposite worlds and values, and checks entailment of each answer (Section 3.3, pp. 278–279).

Verus form. Inference: the same pattern can turn prose requirements into a finite Rust enum of states and relations, then prove that each transition preserves the relation. The paper's fixed predicate grammar suggests constraining model output before verification; however, Verus requires typed Rust/specification terms rather than untyped ASP atoms.

Evidence. Table 1 reports Curie-STAR accuracies of 86.2, 85.2, 87.9, and 85.9 on QuaRel Dev, Test, QuaRel F Dev, and QuaRel F Test, respectively; denominators are the corresponding dataset splits, but the table gives percentages only. Davinci-STAR reports 90.6, 90.5, 90.6, and 93.5 in the same columns. Davinci-Direct exceeds Davinci-STAR on QuaRel Dev (93.1 versus 90.6), showing that the symbolic split is not uniformly better (Section 3.4, pp. 279–280). The authors attribute some errors to out-of-domain predicate generation, such as “smoke” instead of “heat” (Section 3.4, p. 279).

## technique: represent algebra word problems with typed predicate roles

What it is. The paper defines `has(entity, quantity, timestamp, k/q)`, `transfer(entity1, entity2, quantity, timestamp, k/q)`, and `total(entity, quantity, timestamp, k/q)` (Section 4, p. 280). The final argument distinguishes known facts (`k`) from a query placeholder (`q`). An LLM emits these predicates; hand-written s(CASP) rules compute the answer.

How to apply it. Encode entities, quantities, temporal order, and unknowns separately; parse the text; execute the query; and inspect the justification tree. For the Joan example, the tree contains `43 #= 70-27` and derives `transfer(joan,sam,43,1,q)` (Section 4.1, p. 281).

Evidence and limits. The paper reports 91 problems, a final context of 24 problems, and a test set of 67 problems (Section 4.1, p. 281). Both text-davinci-003-Direct and STAR report 1.00 accuracy on all 67 test problems (Table 2, p. 281). The authors state that the problems were simple enough for the baseline and expect differences on harder problems (p. 282). Inference: the 67/67 result demonstrates explainability more than a reasoning advantage.

## technique: make a conversational agent a checked state machine

What it is. The concierge bot converts each user utterance into predicates, adds them to conversational memory, derives preferences, checks which required predicates are missing, asks for one missing item, and queries the restaurant database when complete (Section 5.2, pp. 283–284). The paper says this logic “can be thought of as a state machine and has been referred to as a conversational knowledge template (CKT) by Basu et al.” GPT-3 generates natural-language responses only after s(CASP) has chosen the state transition or recommendation.

Verus form. Inference: model a Rust service as an explicit state machine whose state contains user constraints and whose transition function has preconditions and postconditions. A Verus transition proof can preserve the properties that recorded preferences are respected and recommendation fields come from the database. Inference: this separation prevents a language model from mutating trusted data during response generation, but the parser and database contracts still need verification.

Evidence. On 500 E2E examples, predicate generation accuracy is 89.33% using 11 selected demonstrations (Section 5.1, p. 283). In the direct GPT-3 baseline, a restaurant's price was changed to satisfy the user although the database said it was cheap; the STAR bot remained faithful to the database (Section 5.3, pp. 284–285). The 89.33% figure is predicate-and-argument accuracy on the first 500 training-set examples, not end-to-end recommendation accuracy.

## what is proved, trusted, and left open

The paper's symbolic conclusions are checked by s(CASP) and accompanied by proof trees; its empirical claims are the task accuracies above. The LLM extraction stage, hand-written rules, predicate vocabulary, database, and selected contexts remain trusted or manually authored. Inference: in VL, Verus would strengthen the final executable-state proof, but it would not automatically validate that an LLM extracted the right requirement from prose.

The authors already describe the neuro-symbolic split, proof-tree explanations, query-driven reasoning, and state-machine conversation pattern. VL should not redo these at a generic level. Inference: a useful extension is to measure whether predicate extraction into Verus contracts catches contradictory or underspecified Rust requirements.

## threat to agent-written verified Rust

Inference: the threat is medium to high at the specification-extraction boundary. An agent can produce a well-typed, fully verified Rust implementation of an incorrectly extracted predicate. The paper's proof trees expose reasoning dependencies and the paper says integrity constraints help check the consistency of extracted information (Section 2, p. 277) but reports no experiment on this. Inference: these features could reduce but not eliminate this risk. Inference: require a human- or checker-audited mapping from prose to Verus contracts, preserve parser confidence and alternatives, and report extraction accuracy separately from proof success.

## techniques for the catalog

- semantic parser plus symbolic checker — use an LLM for predicate extraction and a deterministic reasoner for entailment
- defaults and integrity constraints — encode exceptions, impossible states, and alternative worlds explicitly
- fixed predicate grammar — constrain model output to typed domain relations before reasoning
- proof-tree explanations — return the facts and rules that justify each answer
- state-machine conversation — store predicates as state, ask for missing fields, and query trusted data
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Following the STAR approach, we convert the knowledge in the chosen algebraic problem to the predicates defined above using an LLM."): read the whole paper (pp. 274-287) and checked every quotation, table number (Tables 1 and 2), count (91, 24, 67, 500, 11, 89.33%), section and page reference, and the technique steps against it. Changed: link now the DOI printed in the paper (the arXiv link was not in the paper text); corrected the page of the "smoke" example (p. 279, not 280); fixed section/page references for the proof tree, predicate vocabulary, algebra example and concierge state machine; replaced an unsupported "validate or normalize" step with what the paper says and marked it as Inference; marked the 67/24 split as the paper reports it; softened "establish" and the integrity-constraint claim, which the paper describes but does not evaluate. Did not check: the Verus/VeruLaw applicability statements (marked Inference, my own judgment), the arXiv version differences, or the cited external works.
