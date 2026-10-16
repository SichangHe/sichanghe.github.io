# Are LLMs Rigorous Logical Reasoners? Empowering Natural Language Proof Generation by Stepwise Decoding with Contrastive Learning
(authored by agents unless marked 🧑)
Tag: `su2023condec`, [paper](https://doi.org/10.48550/arxiv.2311.06736)

## result and boundary

Su, Liu, and Guo study natural-language proof generation for entailment trees. Their ConDec method trains a generator to produce one reasoning step at a time and uses contrastive learning with hard negative proof steps to reduce repetition and invalid entailment. It is a language-generation method, not a machine-checked proof system. The abstract reports, “Additionally, our further analysis reveals that even larger LLMs still struggle to generate rigorous logical chains.” (abstract, p. 1)

The target task is to derive a proof tree from a hypothesis and supporting facts. A tree contains leaf facts, intermediate conclusions, and reasoning steps whose premises entail a conclusion (§3, pp. 3–4). The method is relevant to VL as a proposal generator or explanation assistant. Inference: Verus must remain the independent checker because ConDec’s natural-language entailment and BLEURT metrics do not establish Rust semantics.

## technique: represent a proof as a sequence of entailment steps

when to use it

Use stepwise generation when a final answer alone is insufficient and each intermediate conclusion must be inspectable.

paper procedure

1. Represent a proof tree as `T = (h, Ĉ, U, S)`, with hypothesis `h`, selected leaf facts `Ĉ`, intermediate nodes `U`, and steps `S` (§3, p. 4).
2. Let each step contain premises from facts or earlier intermediate nodes and one new intermediate conclusion.
3. Concatenate the hypothesis, fact set, and previous steps into the next input sequence.
4. Train the generator to maximize the conditional likelihood of the next step, token by token (Equations 1–3, p. 4).
5. At evaluation, compare leaves, structural steps, intermediate conclusions, and overall tree correctness using F1 and AllCorrect; intermediate text uses BLEURT > 0.28 (§5.2, pp. 6–7).

The paper states, “Proof generation providing rationals along with the predicted answer for emulating formal reasoning is further proposed to increase the explanability.” (§2.1, p. 3)

Verus form

Inference: represent a Rust proof plan as a ghost sequence of lemma applications. Each step should name premises and a conclusion that a Verus `proof fn` establishes. The natural-language plan can guide generation, but `requires`, `ensures`, and `invariant` clauses plus Verus checking must validate every step. BLEURT similarity cannot replace logical entailment.

evidence and limits

EntailmentBank has 1,840 multi-step trees, average 6.6 nodes and 2.7 entailment steps, split 1,313/187/340 into train/validation/test (§5.1, p. 6). Task 1 has only gold leaves; Task 2 adds 15–20 distractors; Task 3 retrieves from a 12K-sentence corpus (§5.1, p. 6). These denominators define the benchmark, not general proof ability.

## technique: contrastive stepwise decoding

when to use it

Use contrastive training when a generator selects relevant premises but repeats them or produces a conclusion that does not follow.

paper procedure

1. Encode the input context and decode the gold next step.
2. Pool encoder and decoder hidden states after a projection layer into latent vectors `z_x` and `z_s` (Equations 4–5, p. 5).
3. Use a contrastive loss that increases similarity for the source/gold pair and decreases similarity to other batch samples (Equation 6, p. 5).
4. Combine maximum-likelihood loss and hard-negative contrastive loss as `L = L_MLE + α L_cont-hard` (Equation 8, p. 5).
5. Train for 10 alternating epochs of MLE and contrastive losses after generator fine-tuning (§5.3, p. 7).

The paper says, “ConDec leverages carefully constructed hard negatives – outputs that are deceivingly similar in form yet differ semantically – to refine generation precision.” (abstract, p. 1)

Verus form

Inference: contrastive training can rank candidate proof plans, but it has no direct Verus construct. Use it before verification to propose lemma sequences; then pass each candidate to Verus and rank only candidates whose obligations close. A `proof fn` cannot be accepted because a learned embedding is similar to a correct proof.

## technique: vanilla hard negatives for repetition

when to use it

Use this negative when the model copies a premise instead of deriving a new conclusion.

paper procedure

1. Select a gold proof step and one of its premises.
2. Replace the gold conclusion with that premise’s context, preserving the step’s surface format.
3. Pair the altered sequence with the gold sequence as a contrastive negative (§4.2.1, p. 5).
4. Fine-tune the generator so it separates the copied premise from the entailed conclusion.

The paper identifies the error pair as “1) repetition(the entailed conclusion simply repeats one of the input sentences); 2) invalid entailment(the entailed conclusion does not follow from input sentences).” (§4.2, p. 5)

Verus form

Inference: create adversarial proof-plan candidates that call an existing lemma without deriving the requested postcondition. Require Verus to expose the missing entailment. The negative-generation heuristic is useful for training an agent but is not itself a correctness argument.

## technique: enhanced hard negatives with a reasoner and checker

when to use it

Use enhanced negatives when simple premise substitution is too easy and the model needs examples that are fluent but semantically wrong.

paper procedure

1. Train a separate reasoner on premise sets and gold conclusions using conditional likelihood (Equation 9, p. 6).
2. Sample an unseen combination of supporting premises.
3. Ask the reasoner to generate a conclusion for that combination.
4. Use Vera, a T5-11B plausibility checker, to score the generated step with a sigmoid score (Equation 10, p. 6).
5. Keep low-score or filtered negatives; the filtering threshold is 0.9 (Table 2, p. 6).
6. Jointly sample vanilla and enhanced negatives for generator training (§5.3, p. 7).

The paper explains, “The enhanced strategy uses a reasoner and a checker to generate hard negatives.” (Figure 1 caption, p. 4)

Verus form

Inference: replace the learned checker with Verus when the target is Rust: mutate premises or omit a required lemma, compile the candidate, and retain candidates that fail a specified obligation as training negatives. Use a trusted proof checker, not a language plausibility model, to label semantic failure.

evidence and limits

Table 2 reports 47,386 Task-1 and 104,665 Task-2 enhanced negatives, filtered to 16,371 and 21,948 respectively, from 8,819 proof steps; the filter threshold is 0.9 (p. 6). These are generated examples, not independent correctness proofs. The checker’s plausibility score can accept a fluent but invalid conclusion.

## technique: evaluate proof structure, not only final answers

when to use it

Use multi-dimensional metrics when a system may reach a correct answer with an invalid or redundant explanation.

paper procedure

1. Compare predicted and gold leaves with F1 and AllCorrect.
2. Align structural proof steps and score exact step correctness.
3. Score intermediate conclusions with BLEURT, counting a match above 0.28.
4. Mark overall success only when leaves, steps, and intermediates are all correct (§5.2, pp. 6–7).
5. Report each denominator and task separately.

Verus form

Inference: use two independent checks: the final Rust contract and each proof lemma’s obligation. A function that happens to satisfy postconditions while its proof plan is redundant may still be acceptable, but an unexplained `external_body` or weakened contract should fail VL review. Keep proof coverage and trusted assumptions as additional metrics.

evidence and limits

On Task 2 test data, ConDec with vanilla negatives reports Leaves F1 91.0, Steps F1 50.2, Intermediates F1 70.3, and Overall AllCorrect 34.1; combining vanilla and enhanced negatives reports 91.1, 50.7, 70.7, and 34.7 respectively (Table 3, p. 7). The denominators are the Task-2 test trees. Intermediate and overall scores remain low, so improved premise selection does not establish rigorous chains.

## evidence: benchmark, ablation, and cost findings

The paper trains Flan-T5-Large for 500 epochs on Task 1 and 600 on Task 2; average running time is 18 hours for Task 1 and 24 hours for Task 2 on an A800 (§5.3, p. 7). On Task 2, the ablation table reports Overall AllCorrect 33.5 for stepwise Flan-T5-Large, 32.4 after contrastive loss alone, 34.1 with vanilla negatives, and 34.7 with both negative types (Table 5, p. 8). On the validation split, ConDec with both negatives reaches Overall AllCorrect 41.2, versus GPT-4 five-shot 21.9 and GPT-4 chain-of-thought 22.5 (Table 6, p. 8). These are validation metrics on Task 2, not machine-checked proof success.

The authors report that ConDec is one-stage at inference and reduces inference time compared with two- and three-stage methods (Table 4, p. 7). They also find that larger models do not solve the problem: Flan-T5-XL has similar performance to Flan-T5-Large, and LLaMA-3.2-1B is much worse in the ablation (Table 5, p. 8). The conclusion is explicit: “Proof planning requires a higher level of understanding of deductive reasoning over multi-hops.” (§6.3, p. 8)

## what remains trusted and threat to VL

ConDec proves only that a training objective and negative construction improve benchmark metrics. The learned generator, Vera checker, BLEURT metric, dataset annotations, tokenization, optimizer, and evaluation scripts remain trusted. The authors’ own results show a large gap between leaf correctness and overall proof-tree correctness. Inference: natural-language proof generation can help an agent draft a Verus proof plan or explanatory text, but accepting it as proof creates a severe soundness risk. VL should independently verify every generated Rust proof with Verus and reject contract weakening, unsupported axioms, and proof steps that do not map to checked lemmas.

Already done that VL should reuse: stepwise decomposition, hard-negative generation, separate candidate generation and checking, and metrics that score intermediate reasoning rather than final answers alone. Inference: VL should adapt enhanced negatives by constructing near-miss Rust implementations and invalid invariants, then use Verus failures as labels. This is a proposed adaptation, not a result in the paper.

## techniques for the catalog

- proof-tree decomposition — represent a conclusion as ordered entailment steps over facts and prior intermediates
- contrastive stepwise decoding — train latent representations to separate gold steps from semantically wrong alternatives
- vanilla hard negatives — replace a conclusion with a premise to suppress repetition
- enhanced hard negatives — recombine premises, generate a fluent conclusion, and filter it with a checker
- independent candidate checking — use a separate verifier or checker rather than trusting the generator
- structural proof metrics — score leaves, steps, intermediate conclusions, and overall correctness separately
- multi-stage versus one-stage tradeoff — compare search and verifier cost against a single contrastive generator
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
