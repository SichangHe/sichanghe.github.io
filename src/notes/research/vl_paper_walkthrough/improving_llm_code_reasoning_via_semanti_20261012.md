# Improving LLM Code Reasoning via Semantic Equivalence Self-Play with Formal Verification
(authored by agents unless marked 🧑)
Tag: `nok2026improving`, [paper](https://doi.org/10.18653/v1/2026.findings-acl.1615)

Audit: audited 2026-10-13 against the paper; checked numbers, steps, quotations and Verus forms; fixed the last step of technique 3 (Bob is fine-tuned once, in the final round, with no further rounds), the tau value (5 is the example in Section 3.4.1, 3 is used in Appendix E.2), the purpose of the ablation, the PLE condition in SEQ step 3, and marked unmarked inferences.

## paper and scope

Poon and Miceli Barone train two models in a self-play game about Haskell program equivalence. Alice generates a variant; Bob judges whether it is equivalent. Liquid Haskell proves positive equivalence examples, while execution checks a supplied counterexample for negative examples. The study’s useful lesson for Verus is a training architecture: use a verifier as a reward gate, retain only validated traces, and make the generator produce harder cases over rounds. The paper is about Haskell and model training, not Rust or Verus; all Verus mappings here are inferences. The paper’s dataset is released as OpInstruct-HSx (about 28,000 validated functions).

## technique 1: semantic-equivalence (SEQ) game with proof-gated positives

what it is and when to use it

SEQ creates positive training pairs whose equivalence is certified by a machine-checkable proof. Use it when tests are too weak to establish that a transformation preserves all inputs.

how to do it

1. Choose a reference function P.
2. Ask Alice to produce Q and a Liquid Haskell proof of pointwise equality, `∀x ∈ X . P(x) = Q(x)`.
3. Run Liquid Haskell. Retain the pair and proof only if Liquid Haskell accepts the proof (Section 3.3, Step 3). The Limitations section says the verification process depends on reflection and proof by logical evaluation (PLE); the study's reading that acceptance requires PLE is an inference.
4. Give Bob only P and Q, and train Bob to classify their semantic relation.
5. Use the accepted proof trace as supervised data for Alice in later rounds, together with the generated code.

The paper’s method says: “In the SEQ task, the generator model is asked to produce a functionally identical variant of a given Haskell program, along with a formal proof certifying its equivalence.” It describes the gate explicitly: “SEQ Game: Alice’s proof is verified by Liquid Haskell, which acts as an external oracle.”

Verus form (inference)

For Rust, define equivalence as a shared `ensures` relation over all permitted inputs, typically `old(input) == output` or equality of an abstract model function. Alice would generate a transformed Rust function plus Verus proof functions; `verus` is the acceptance gate. The proof may use `requires`, `ensures`, `decreases`, `forall`, and `assert`/`reveal` lemmas. Unlike pure Haskell, ownership, mutation, panic behavior, allocation, and termination must be included in the relation. A proof that only matches tested inputs is insufficient.

evidence, limits, and trust

Inference: the positive proof gate is sound only relative to Liquid Haskell, its reflection/PLE fragment, and the stated specification. The authors report that SEQ proof production is the bottleneck: few positive examples survive. In the controlled experiment, the mixed E0 regime yielded 937 validated training pairs, while pure SINQ E1 yielded 1,839. Regime E2, with 96% SEQ attempts, produced only N=140 verified pairs. These are pair counts, not proof success probabilities over all Alice attempts; the paper does not provide that denominator.

## technique 2: semantic-inequivalence (SINQ) game with executable counterexamples

what it is and when to use it

SINQ supplies negative examples cheaply: a candidate Q need only differ from P on one input. Use it to produce abundant adversarial data when universal equivalence proofs are difficult.

how to do it

1. Choose P and ask Alice for Q and an input xa.
2. Require `P(xa) ≠ Q(xa)`.
3. Compile and execute both functions on xa. Retain the pair only when the observed outputs differ.
4. Train Bob to classify P and Q as inequivalent. Sample Bob’s correctness repeatedly to estimate difficulty.

The paper states the condition exactly: “SINQ task requires generating a function that diverges from the original program on at least one input.” It also says, “SINQ Game: The candidate xa is tested by an execution: If P(xa) ≠ Q(xa), the instance is accepted.”

Verus form (inference)

Generate a counterexample input satisfying Rust’s input type and preconditions, run both implementations in a trusted executable harness, and retain only an observed mismatch. For stronger assurance, use a Verus lemma proving the mismatch for that input; execution alone is a falsification signal, not a universal proof. Rust undefined behavior, panics, nondeterminism, and resource effects must be controlled because they can create false differences.

evidence and limits

SINQ supplied hundreds of accepted pairs per round, versus single-digit SEQ pairs in most rounds. The paper’s difficulty protocol samples Bob N=10 times and defines `d̂ = 10 × (1 − Nsuccess/N)`. This makes a low Bob success rate a hard example. Inference: the score depends on model sampling variance and on the correctness of the labels. Inference: SINQ cannot establish equivalence; it only exhibits one distinguishing input.

## technique 3: difficulty-aware adversarial self-play

what it is and when to use it

Alice is trained to generate examples Bob finds difficult; Bob is trained on correctly labeled pairs. Alternating generation, verification, scoring, and LoRA fine-tuning forms a curriculum without hand-labeling every new pair.

how to do it

1. Select P and choose SEQ or SINQ with probability 0.5 in the base regime.
2. Generate Q plus either a Liquid Haskell proof or a diverging input; reject failed validation.
3. Ask Bob to classify P and Q ten times and calculate difficulty from his success fraction.
4. Keep all hard examples above threshold τ and 20% as many easy examples sampled round-robin across integer bins (Section 3.4.1). The paper gives τ=5 as an example and sets τ=3 in its experiments (Appendix E.2); it also says easy examples make up 50% of the subset, which disagrees with the 20% in the same section.
5. Build three Alice examples per validated pair: generation at target difficulty 10, self-predicted difficulty, and (for SEQ) the complete proof trace.
6. Fine-tune Alice with LoRA on those examples. Bob is fine-tuned once, in the final round, on his correct evaluations (Section 3.4.2 and Figure 1); only Alice is fine-tuned after each earlier round.

The paper’s high-level claim is: “The self-play loop alternates between program generation, verification through proofs or counterexamples, difficulty scoring, and fine-tuning of both agents.” It reports Alice’s mean difficulty rising from 0.50 in round 1 to 1.18 in round 7 under a fixed untrained Bob.

Verus form (inference)

Use a Rust transformation corpus and a Verus checker to label positive pairs; use a deterministic Rust harness or proof for negative pairs. Store proof scripts, compiler versions, and exact preconditions with each example. A difficulty score can be the fraction of verifier-backed judgments a critic model gets wrong, but the critic must never replace Verus as the acceptance oracle. LoRA adapters can train the proposal and judging models while the production verifier remains fixed.

evidence and limits

Base versus trained Bob on challenge instances from the round-7 Alice over OpInstruct-HSx (Table 2) is 87.57% versus 91.34% on train and 88.24% versus 88.79% on test. Haskell zero-shot Pass@1 rises for Bob from 17.7 to 26.4 on HumanEval and from 26.7 to 36.9 on MBPP, averaged over 16 trials. Transfer is uneven: PySecDB F1 rises 51.3% to 54.0%, while CodeXGLUE F1 falls 47.9% to 43.2%. Low-level DCE, STOKE, and TVM tasks show little benefit because the training language lacks memory and bit-level behavior.

## technique 4: controlled SEQ/SINQ ablation

The four regimes isolate the effect of SEQ supervision from data volume (Section 5.4): E0 (50/50, 500 references), E1 (0/100, 500), E2 (96/4, 500), and E3 (0/100, 40, volume-matched to E2). E0 has fewer validated pairs than E1 (937 versus 1,839) but better semantic reasoning. E2 and E3 each have about 150 pairs; including SEQ in E2 improves structural reasoning over pure SINQ. Inference: this is evidence that formal equivalence proofs contribute information beyond negative examples, but the authors caution that E2/E3 sample sizes are small and need larger studies.

Verus form (inference)

Run the same ablation with fixed Rust reference programs, fixed model budgets, and a denominator that includes every attempted generation, every verifier rejection, and every retained proof. Compare proof-backed transformations with counterexample-only data at equal retained-pair counts. Report both verifier pass rates and downstream correctness; otherwise a high yield from weak counterexamples can hide low proof quality.

## what is proved, trusted, and threatening to VL

The paper proves or checks each retained SEQ pair with Liquid Haskell and each retained SINQ pair by execution. It measures model accuracy and transfer, not the semantic correctness of arbitrary generated code. Inference: trusted components include Liquid Haskell’s refinement checker, GHC compilation/execution, the input generator, Bob’s labels, and the chosen function specification. Nontermination, partial functions, reflection limits, state, memory, side effects, and bit-level behavior remain outside much of the formal fragment; the authors explicitly identify these as limitations.

Opinion (the study's own): VL should not redo the generic idea of verifier-gated self-training. The work to adapt is the proof-trace dataset schema, hard-example selection, and controlled separation of positive proofs from negative counterexamples. The product threat is high for an agent that learns transformations from tests alone: it may preserve common cases while changing edge behavior. A Verus-backed SEQ gate could train agents toward proof-producing edits, but the threat remains high where specifications omit ownership, resource, panic, or concurrency semantics. This threat assessment is an inference from the paper’s low-level transfer failures and the differences between Haskell and Rust.

## techniques for the catalog

- proof-gated equivalence generation — retain generated program variants only when a refinement checker proves pointwise equality
- counterexample-backed inequivalence — validate negative pairs by executing both programs on a generated distinguishing input
- difficulty-aware verifier self-play — score critic mistakes, select hard pairs, and LoRA-fine-tune generator and evaluator in rounds
- proof-versus-counterexample ablation — control retained data volume to measure the unique value of formal equivalence supervision
