# Never the Number: Structural Abstention for AI Systems Whose Answers Are Consumed as Fact
(authored by agents unless marked 🧑)
Tag: `wu2026number`, [paper](https://arxiv.org/abs/2608.13926)

## invariant and scope
Wu proposes a deployment architecture for fact-consumed systems: a generative shell may interpret language and phrase results, while a deterministic kernel alone decides the confirmed question, query, and returned value. The abstract states the invariant precisely: “a component that can fabricate may influence which question the system answers, never which value it returns.” (abstract, p. 1) The pattern is intended for cases where users or downstream agents cannot inspect generated SQL and wrong values are costly relative to refusal (sections 1 and 3.5, pp. 1–8).

The four roles are interpreter, elicitor, grounder, and compiler. Grounder must be total—every state yields an answerable question or a failure—and compiler must be a mathematical function from a grounded question to one query (section 3.1, p. 6). The architecture’s guarantees are bounded: no generative value, query recoverability from the confirmed question, visible failure by refusal, and semantic confirmation before execution (section 3.4, p. 7). It does not guarantee that a user assents to the intended meaning, that authored templates are semantically correct, or that coverage is complete (section 3.4, p. 7).

Inference: the direct Verus lesson is to separate an untrusted language-producing front end from a small, deterministic specification kernel. A model may propose a function/lemma target, but only a verified Rust function and Verus proof obligations may produce a value used by another agent.

## technique: explicit partial state and exhaustive dialogue loop
Use a state representation that makes incompleteness and contradiction explicit rather than passing raw text between turns. The paper requires three operations: completeness testing, gap enumeration, and consistency testing (section 3.2, p. 6). Algorithm 1’s loop is exhaustive because Grounder is total:

1. initialize state from the user profile
2. interpret the utterance into the state, extracting only determinate information
3. if inconsistent, name the conflict and wait for correction
4. else, if grounding succeeds, display the confirmed question and wait for assent
5. after assent, execute the deterministic compiler and render the result
6. else, if the state is progressing, elicit a missing element
7. otherwise disclose nearest answerable questions (Algorithm 1, p. 6)

The final refusal branch matters: when elicitation cannot converge, the system says what it can answer instead of guessing (section 3.3, p. 7). The paper calls this structural abstention because unanswerable requests are unrepresentable; statistical confidence is unnecessary for that refusal (section 3.6, p. 8).

## technique: five design decisions for a bounded kernel
Before implementation, answer five questions (section 4.1, pp. 8–9):

1. define the enumerable unit of answerability, such as typed question templates
2. choose a partial-request representation supporting completeness, gaps, and consistency
3. make question-to-answer compilation a deterministic function to SQL, an API, or a report
4. show a confirmation sentence in vocabulary the user can evaluate
5. specify refusal behavior: nearest questions, human handoff, or visible fallback

The authors instantiate these decisions in retail analytics, ward operations, and cost-centre reporting (Table 2, p. 9). Two decisions are domain-dependent—answerable unit and partial state—but the invariant does not vary (section 4.2, p. 9).

Inference: a Verus product can use a bounded kernel of verified operations and lemmas, a typed partial request for missing arguments/invariants, a confirmation of the exact theorem or postcondition, and a refusal when no verified operation matches. This is an architectural inference; the paper does not implement Verus.

## technique: deterministic compilation through an intermediate tree
Once a question is grounded, the implementation extracts entities, matches a template, builds an intermediate parse tree, and emits SQL by depth-first traversal (section 7.1–7.2, pp. 15–16). Algorithm 2 recursively renders leaves with dictionary-resolved table/column/literal values, renders children, then renders the parent node. Primitive nodes represent `SELECT`, `FROM`, `WHERE`, `GROUP BY`, `HAVING`, comparisons, conjunctions, thresholds, ratios, and rankings; the same traversal supports different table grains without asking a model to compute arithmetic (section 7.1–7.2, pp. 15–16).

Inference: Verus can play the kernel role by compiling a grounded request to a fixed verified function or lemma invocation. The compiler should be a pure/specification-level mapping where possible, with `ensures` proving that the returned value corresponds to the request. The intermediate tree is useful for auditability, but SQL generation details do not carry over.

## technique: state-machine guidance and visible conflict handling
The deployed guidance engine represents dialogue state as a point in an embedding space projected onto a finite set of entity configurations. The next state combines current state, an entity vector, conversation/profile embeddings, and an attention matrix, then selects the nearest discrete state (section 6.2, pp. 13–14). A pushdown automaton allows a partially specified question to be suspended while a sub-question is resolved and then resumed (section 6.2, p. 13). Next-entity prediction chooses the most likely missing slot rather than a fixed slot order; the LLM only renders a prompt between two known states (section 6.3, p. 14).

The paper’s conflict example uses overlapping store classes: asking for sales across both classes has no unambiguous answer because aggregation can double-count. Grounder therefore narrows the request and asks the user to choose one class, rather than emitting a plausible query (section 6.4, pp. 14–15). The author writes, “The claim is not that the constrained design handles this case more gracefully. The claim is that it is capable of noticing, because it holds an explicit representation of what it can and cannot express.” (section 6.4, p. 15)

Inference: in verified Rust, analogous checks should reject incompatible predicates, aliasing assumptions, or underspecified resource ownership before proof search. A state machine can guide an agent toward missing invariants, while Verus remains the authority for consistency.

## evidence, trust, and limits
The case study is a bilingual conversational analytics system operated for roughly two years (section 5, p. 10). The paper reports no controlled user study: “The central claim of this report has not been tested directly.” (section 13, p. 20) It also states that coverage is bounded by manually authored templates, elicitation costs turns, and personalization has a cold start (section 13, p. 20). The deployed implementation is therefore an existence proof and design case, not a measured accuracy or formal-soundness result.

Trust is moved to template authors, entity dictionaries, compiler code, the governed query engine, and the user’s confirmation; it is not removed (section 3.4, p. 7).

## techniques for the catalog
- trusted-kernel invariant — let generative components choose or phrase questions but never compute returned values
- explicit partial-state dialogue — represent completeness, missing fields, and inconsistency as machine-checkable state
- deterministic intermediate compilation — map confirmed requests through a typed tree to a fixed query/function
- structural abstention — refuse requests outside the enumerable answer space instead of estimating confidence
- confirmation perimeter — require the user to read and assent to the exact grounded question before execution
