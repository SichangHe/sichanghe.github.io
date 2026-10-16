# Enhancing Ethical Explanations of Large Language Models through Iterative Symbolic Refinement
(authored by agents unless marked 🧑)
Tag: `quan2024enhancing`, [paper](http://arxiv.org/abs/2402.00745v1)

## framework
Logic-Explainer generates an explanation and a moral-violation hypothesis for an ethical statement, then checks and repairs them with a differentiable Prolog solver. The formal target is `E_i ∪ {s_i} |= v_j`, where `s_i` is the statement, `E_i` its facts, and `v_j` a moral violation (Section 2, p. 2). An explanation is valid and non-redundant when all facts are necessary and sufficient for the entailment. The paper reports that iterative refinement raises logical validity from 22.9% to 65.1% on 166 easy statements and from 10.3% to 55.2% on 145 hard statements after three iterations (Tables 1–2, p. 5).

## technique 1: semantic prompting and autoformalisation

The first stage prompts GPT-3.5-turbo with semantic roles extracted by AllenNLP's semantic-role labeller. The prompt includes rules for moral foundations, annotated examples, and the new statement. A sentence such as “I crushed the frog” becomes a Neo-Davidsonian form with an event, agent, and patient: `∃e(crushed(e) ∧ Agent(I,e) ∧ Patient(the frog,e))` (Section 3.1, p. 3). The LLM then emits natural-language facts and a violation hypothesis.

The second stage translates facts, semantic roles, and moral principles into Prolog clauses. A rule such as `violate_care_physical(X,Y) :- physical_harm(X),animal(Y).` encodes a moral principle; generated facts become clauses such as `animal(X) :- frog(X).` (Section 3.2, pp. 3–4).

How to apply it.
1. Extract agents, actions, patients, and other roles from the statement.
2. Prompt the LLM with moral-principle rules and examples to produce facts and a candidate violation.
3. Convert every fact and principle into a Prolog atom or implication clause.
4. Retain event arguments so that the formalization preserves who acted on whom.
5. Pass the resulting clauses to the symbolic solver.

The paper says: “Autoformalization in this context consists on the use of the Neo-Daviasonian parsing as mechanism to explicitly guide the formalisation” (Section 3.2, p. 3). Inference: a Verus analogue would make semantic roles ghost predicates and generate a lemma specification from them; the LLM text is only a candidate until Verus checks the resulting predicates. Prolog's open-world and unification behavior do not automatically match Rust's arithmetic or ownership semantics.

## technique 2: weak-unification backward chaining

NLProlog recursively proves each possible moral-violation goal by backward chaining. Unlike ordinary Prolog, it uses cosine similarity between predicate embeddings for weak unification. The solver multiplies unification scores along a proof chain and returns the chain with highest overall score (Section 3.2, pp. 4–5). The implementation uses GloVe embeddings, a weak-unification threshold of 0.5, and a proof-score threshold of 0.13 (Section 4.1, p. 5).

How to apply it.
1. Enumerate moral-violation goals such as `violate_care_physical` and `violate_liberty`.
2. For each goal, unify it with rule heads using exact or embedding-similar predicates.
3. Recursively add subgoals for each rule body.
4. Multiply cosine similarities for the selected unifications.
5. Keep the highest-scoring non-empty proof chain and derive its terminal violation.
6. Accept the explanation only if the derived violation equals the LLM's hypothesis and all generated facts occur in the proof.

Inference: Verus proof search should use exact typed predicates and lemmas rather than embedding similarity; weak unification is useful as a proposal heuristic but cannot be part of a sound proof. A failed or low-score chain should become an explicit proof obligation, not an accepted approximation.

## technique 3: abductive and deductive iterative repair

If no proof is found, the derived violation differs from the hypothesis, or some facts are unused, Logic-Explainer keeps proof facts, drops irrelevant facts, and asks the LLM for missing premises by abduction. It then asks the LLM to infer a new violation hypothesis deductively from the revised facts. The new pair is checked in the next iteration. The paper defines abduction as searching for missing facts “such that Ei ∪ {hi } |= vj” (Section 3.3, p. 4).

How to apply it.
1. Compare the solver's proof (if any) with the proposed hypothesis.
2. Retain facts appearing in the proof and discard unused facts.
3. Prompt the LLM to add premises that could connect retained facts to a violation.
4. Prompt it to derive a revised hypothesis from the revised explanation.
5. Re-run autoformalisation and backward chaining for a fixed iteration budget.

The case study starts with “Prison is an institution of authority” and fails because a premise linking unauthorized departure to disobedience is missing; abduction adds that premise, after which redundant facts are removed and the explanation becomes valid and non-redundant (Table 5, pp. 9–10). Inference: a Verus repair loop can regenerate missing lemma assumptions, but only a final checked lemma should be emitted as a product artifact. Inference: cap iterations because the paper observes diminishing gains after two to three iterations.

## evidence, trust, and limits

Tables 1 and 2 use denominators of 166 easy and 145 hard ETHICS statements. Easy validity rises 40.4% at zero iterations to 65.1% at three; non-redundancy rises 13.4% to 95.4%. Hard validity rises 31.7% to 55.2%; non-redundancy rises 21.7% to 93.8% (Tables 1–2, p. 5). Compared with Chain-of-Thought, Logic-Explainer improves moral-foundation macro-F1 from 0.545 to 0.576 on easy and 0.541 to 0.591 on hard after refinement (Table 3, p. 6). A human sample classifies 82.1% of invalid explanations as missing plausible premises (Section 4.4, p. 7). The released ExplainEthics corpus contains 311 statements; 247 were verified by the solver within at most four iterations, and remaining examples were manually supplemented (Section 5, p. 10).

The solver, GloVe embeddings, similarity thresholds, GPT-3.5 autoformalisation, semantic-role labeller, moral-principle rules, and human annotations remain trusted or heuristic. The paper explicitly limits its differentiable solver to implication rules such as `p1(X,Y) ⇐ p2(X),p3(Y)` and says it lacks a complete logical-linguistic representation for more complex forms (Limitations, p. 11). Inference: the product threat to agent-written verified Rust is medium: diagnostic proof repair and fact pruning transfer well, but approximate predicate matching cannot certify Rust behavior. Inference: VL should reuse the abductive/deductive loop and require exact Verus lemmas for acceptance; it need not reproduce the ethical corpus or embedding scorer.

## techniques for the catalog
- semantic-role autoformalisation: convert statements to event/agent/patient predicates before symbolic checking
- weak-unification backward chaining: search rule proofs with embedding similarity and retain the highest-scoring chain
- abductive repair: add premises suggested from failed proof context
- deductive hypothesis revision: regenerate the target violation from repaired facts and repeat bounded verification
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
