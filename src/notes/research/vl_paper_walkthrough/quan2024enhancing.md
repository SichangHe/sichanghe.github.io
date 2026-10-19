# Enhancing Ethical Explanations of Large Language Models through Iterative Symbolic Refinement
(authored by agents unless marked 🧑)
Tag: `quan2024enhancing`, [paper](http://arxiv.org/abs/2402.00745v1)

## framework
Logic-Explainer generates an explanation and a moral-violation hypothesis for an ethical statement, then checks and repairs them with a differentiable Prolog solver. The formal target is `E_i ∪ {s_i} |= v_j`, where `s_i` is the statement, `E_i` its facts, and `v_j` a moral violation (Section 2, p. 2). An explanation is valid and non-redundant when all facts are necessary and sufficient for the entailment. Compared with Chain-of-Thought, Logic-Explainer after three refinement iterations raises solver-assessed logical validity from 22.9% to 65.1% on 166 easy statements and from 10.3% to 55.2% on 145 hard statements. The corresponding Logic-Explainer baselines at zero iterations are 40.4% and 31.7% (Tables 1–2, p. 6). All page references below count PDF pages from the title page.

## technique 1: semantic prompting and autoformalisation

The first stage prompts GPT-3.5-turbo with semantic roles extracted by AllenNLP's semantic-role labeller. The prompt includes rules for moral foundations, annotated examples, and the new statement. A sentence such as “I crushed the frog” becomes a Neo-Davidsonian form with an event, agent, and patient: `∃e(crushed(e) ∧ Agent(I,e) ∧ Patient(the frog,e))` (Section 3.1, pp. 3–4). The LLM then emits natural-language facts and a violation hypothesis.

The second stage translates facts, semantic roles, and moral principles into Prolog clauses. A rule such as `violate_care_physical(X,Y) :- physical_harm(X),animal(Y).` encodes a moral principle; generated facts become clauses such as `animal(X) :- frog(X).` (Section 3.2, p. 4).

How to apply it.
1. Extract agents, actions, patients, and other roles from the statement.
2. Prompt the LLM with moral-principle rules and examples to produce facts and a candidate violation.
3. Convert every fact and principle into a Prolog atom or implication clause.
4. Use the action and patient roles to ground the solver goals; Section 3.2 describes `X` as typically representing actions and `Y` the patient.
5. Pass the resulting clauses to the symbolic solver.

The paper says: “Autoformalization in this context consists on the use of the Neo-Daviasonian parsing as mechanism to explicitly guide the formalisation, together with the injection of high-level prompt constraints about abstract moral principles, to guide the LLM to ground its reasoning within a set of well defined ethical frameworks.” (Section 3.2, p. 4). Inference: a Verus analogue would make semantic roles ghost predicates and generate a lemma specification from them; the LLM text is only a candidate until Verus checks the resulting predicates. Inference: these ethical implication rules do not by themselves model Rust arithmetic or ownership.

## technique 2: weak-unification backward chaining

The paper states: “The solver used in the validation step is NLProlog (Weber et al., 2019).” NLProlog recursively proves each possible moral-violation goal by backward chaining. Unlike ordinary Prolog, it uses cosine similarity between predicate embeddings for weak unification. The solver multiplies unification scores along a proof chain and returns the chain with highest overall score (Section 3.2, p. 4; Algorithm 2, p. 15). The implementation uses GloVe embeddings, a weak-unification threshold of 0.5, and a proof-score threshold of 0.13 (Section 4.1, p. 5).

How to apply it.
1. Enumerate moral-violation goals such as `violate_care_physical` and `violate_liberty`.
2. For each goal, unify it with rule heads using exact or embedding-similar predicates.
3. Recursively add subgoals for each rule body.
4. Multiply cosine similarities for the selected unifications.
5. Keep the highest-scoring non-empty proof chain above the proof-score threshold and return its goal as the derived violation.
6. Compare that violation with the LLM hypothesis. Classify the original explanation as valid and non-redundant only when they agree and all generated facts occur in the proof; otherwise Algorithm 1 can prune unused facts before returning it.

Inference: Verus proof search should use exact typed predicates and lemmas rather than embedding similarity; weak unification is useful as a proposal heuristic but cannot be part of a sound proof. A failed or low-score chain should become an explicit proof obligation, not an accepted approximation.

## technique 3: abductive and deductive iterative repair

When no proof is found or the derived violation differs from the hypothesis, the LLM proposes missing premises by abduction, using the hypothesis and explanatory facts from the previous proof, if any. It then deduces a revised violation hypothesis from the updated explanation and checks the new pair in the next iteration (Section 3.3, p. 5). Section 3 describes selecting proof facts and refining invalid or redundant explanations. Algorithm 1 is more specific: when the hypotheses agree, it removes unused facts if necessary and stops; it does not require another abductive step solely because facts were unused (p. 14, lines 15–27).

How to apply it.
1. Compare the violation derived by the solver with the proposed hypothesis.
2. If they agree, retain the proof facts, remove unused facts, and return the explanation and hypothesis.
3. Otherwise, prompt the LLM for missing premises using the existing proof context and hypothesis.
4. Add those premises and prompt the LLM to derive a revised hypothesis.
5. Re-run autoformalisation and backward chaining until agreement or the iteration limit.

The case study starts with “Prison is an institution of authority.” and fails because a premise linking unauthorized departure to disobedience is missing; abduction adds that premise, after which redundant facts are removed and the explanation becomes valid and non-redundant (Section 4.5, p. 7; Table 5, p. 8). Inference: a Verus repair loop can regenerate missing lemma assumptions, but only a final checked lemma should be emitted as a product artifact. Inference: cap iterations because the paper observes diminishing gains after two to three iterations.

## evidence, trust, and limits

Tables 1 and 2 assess validity over 166 easy and 145 hard ETHICS statements. Easy validity rises from 40.4% at zero iterations to 65.1% at three; among valid explanations, non-redundancy rises from 13.4% to 95.4%. Hard validity rises from 31.7% to 55.2%; among valid explanations, non-redundancy rises from 21.7% to 93.8% (Section 4.2, p. 5; Tables 1–2, p. 6). Table 3 reports moral-foundation macro-F1, despite the surrounding prose calling it accuracy. Compared with Chain-of-Thought, the easy score rises from 54.5 to 57.6 at three iterations; the hard score rises from 54.1 to 59.1 at one or two iterations, then falls to 58.6 at three (p. 6). Human evaluation samples 30% of statements for each moral violation; the paper reports that 82.1% of invalid explanations on average have missing plausible premises (Section 4.4, p. 7). ExplainEthics contains 311 statements. Its construction supplies the human-annotated correct moral foundation to the model; 247 explanations were solver-verified within at most four iterations, and the remaining examples received manually added explanatory sentences (Section 5, p. 8).

Inference: solver validity depends on the generated formalisation, similarity scores, semantic-role extraction, and supplied moral rules; it does not independently establish their correctness. The paper notes that its differentiable solver uses implication rules such as `p1(X,Y) ⇐ p2(X),p3(Y)` and lacks a complete logical-linguistic representation for more complex ethical reasoning (Limitations, p. 9). Inference: the product threat to agent-written verified Rust is medium: diagnostic proof repair and fact pruning transfer well, but approximate predicate matching cannot certify Rust behavior. Inference: VL should reuse the abductive/deductive loop and require exact Verus lemmas for acceptance; it need not reproduce the ethical corpus or embedding scorer.

## techniques for the catalog
- semantic-role autoformalisation: convert statements to event/agent/patient predicates before symbolic checking
- weak-unification backward chaining: search rule proofs with embedding similarity and retain the highest-scoring chain
- abductive repair: add premises suggested from failed proof context
- deductive hypothesis revision: regenerate the target violation from repaired facts and repeat bounded verification
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Thus, a broader inter-annotator study reflecting diverse cultural perspectives is also desirable for evaluating ethical statements in future work."): read the full paper text and study; checked quotations, numbers, PDF page and section references, technique steps, tag, and arXiv identifier; corrected page references, the Chain-of-Thought comparison, conditional non-redundancy denominators, macro-F1 iteration counts, repair stopping behavior, and corpus construction; did not inspect implementation code or reproduce experiments. The mid-paper quote is from Limitations, PDF p. 9.
