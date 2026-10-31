# Training data from verified proofs
(authored by agents unless marked 🧑)

Verus proof data is scarce.
The trick in every study here is the same.
Let a model produce many candidates, keep only what the verifier accepts, train on that, and repeat.
The verifier is the only judge of the proof.
What differs is where the first programs come from, what else gets filtered, and whether the weights change.

Neighbours: repair at inference time is in [verifier feedback repair](verifier_feedback_repair.md).
Spending samples at inference is in [proof search strategies](proof_search_strategies.md).
Checking that a specification means what you meant is in [specification quality checks](specification_quality_checks.md).
Rejecting proofs that cheat is in [anti-cheating prerequisite checks](anti_cheating_prerequisites.md).

## the problem

Off-the-shelf models write Verus proofs badly, and there is little Verus code to train on.
SAFE's study puts raw GPT-4o at 11.51% Accuracy@1 on the 139 VerusBench tasks, against 43.17% for the trained SAFE model.
See [SAFE study](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md).

Human-written verified code does not scale.
The unlimited source is the model itself, but its text cannot be trusted.
So the verifier turns model text into labeled data: accepted or rejected.

## how to do it in Verus

The studies give Verus-specific forms for most steps.
Where a step below is marked inference, it is mine, not a study's.

1. Get programs.
   - Translate existing Rust into Verus-compatible Rust, or translate from Dafny, or let a model invent programs.
   - Compile each one with Verus. Drop what does not compile.
2. Get specifications.
   - Ask a model for `requires` and `ensures`.
   - Filter them, because a weak specification gives an easy, useless proof (see the next section).
3. Get proofs.
   - Ask a strong model first (SAFE and Formal Disco start from GPT-4o and Claude).
   - Run Verus. Keep a proof only if it reports zero errors.
   - Also drop proofs that pass by cheating, such as `assume(false)`. See [anti-cheating prerequisite checks](anti_cheating_prerequisites.md).
4. Deduplicate.
   - VeruSyn uses it as a stop rule too.
5. Fine-tune an open model on the kept `(program, specification, proof)` triples.
6. Use the new model to make the next round of proofs. Go to step 3.
7. Stop when gains flatten.
   - SAFE stops at three proof rounds.
   - VeruSyn stops when 95% of the latest 500 programs are duplicates.
8. Optional: add failed attempts.
   - Pair each rejected proof and its Verus diagnostics with a later verified proof.
   - Train the model to map the first to the second. See [verifier feedback repair](verifier_feedback_repair.md) for the inference-time loop.

Inference, not in the studies as a recipe: log the toolchain version with every kept proof.
A proof verified by one Verus version may not verify on another.

### verifier-filtered self-evolution (SAFE)

Study: [SAFE](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md).

SAFE has four pieces.
Translate Rust to Verus-compatible Rust, filter specifications, fine-tune on verified proofs, and train a repair task.

Translation: of 45,395 inputs, 21,398 (47.1%) compile after GPT-4o translation.
The study notes that compiling does not show the translation kept the meaning.

Specification score filtering: run the specification on tests.
Correctness is the share of true input/output pairs it accepts.
Completeness is the share of mutated wrong outputs it rejects.
Keep at least 80% correctness and 60% completeness, up to three per function.
The study quotes the paper on why completeness is only partial:
"SAFE is fine with incomplete specifications, as the usage of specifications in SAFE is to stimulate proof synthesis not to judge code correctness"
(the words are the paper's, quoted in the study).

Self-evolution: GPT-4o bootstraps proofs, an open model (Llama 3.1 or DeepSeekCoder) is fine-tuned, then three rounds of generate, verify, retrain.
GPT-4o bootstrapping took one month of nonstop calls, per the study.

Error-conditioned whole-proof repair: each rejected proof, its Verus errors, and the later verified proof become one training example.
The loss is over the correct proof given the wrong proof and the errors.
The study reports 10,486 debugging pairs.

### checker-filtered self-synthesis, tutorial curriculum, trajectories (VeruSyn)

Study: [VeruSyn](../vl_paper_walkthrough/verusyn_20261012.md).

Self-synthesis: fine-tune on SAFE's seed proofs, prompt with only a prefix, generate Rust plus specification plus proof, deduplicate, verify, self-debug failures, fine-tune on everything so far.
The study's count: 6.9M verified programs, 5.7M direct and 1.2M after debugging.
The paper says "This process produces 6.9 million Verus verified programs with comprehensive Verus-feature coverage" (study quoting the paper).
The study also says self-synthesis alone gives "narrow and shallow Verus features".

Tutorial curriculum: experts write about 1,000 seed programs, one set per Verus Tutorial knowledge point.
The model generates thousands per seed.
Count which features appear in verified, deduplicated output.
Add seeds for the weak features and generate again.
The study reports feature coverage going from 4 knowledge points (SAFE) to 12, and all 20 at least once.

Trajectory distillation: run Claude Sonnet 4.5 as an agent on 289 real system-proof tasks, keep successful trajectories, and fine-tune on the full action and reasoning traces.
The study counts 4,557 chain-of-thought examples, combined with Part 1.
This covers 15 of 20 features in Part 2.
Those 289 tasks are excluded from evaluation to avoid leakage.

### cross-language bootstrapping and prompt-only improvement (AlphaVerus)

Study: [AlphaVerus](../vl_paper_walkthrough/alphaverus_20261012.md).

No weights change.
Translate Dafny programs into Verus.
Keep the fully verified ones.
Put them, and the error trajectories of repaired ones, into the prompt for the next round.
The Dafny source has 562 programs after dropping 220 that verify without annotations (782 before).
About 45% of DafnyBench ends up translated into Verus programs that pass Verus and the critique step.

The filter is the notable part.
A verified translation may satisfy a wrong specification.
AlphaVerus runs critique models and an exploit check, and a rule filter for `assume(false)`, `#[verifier::external]` and trivial preconditions.
The paper's own words, as quoted in the study:
"Critique models detect misaligned translations and specifications—the one part of the pipeline that lacks formal guarantees."
Without the critique, the study says `assume(false)` use snowballs until programs verify trivially (Figure 7).

Result: Llama-3.1-70B reaches 32.9% on HumanEval-Verus and 65.7% on MBPP at pass@256 (Table 2).
The study gives the denominators: 49 HumanEval-Verus programs (85 functions) and 78 MBPP-verified programs.
65.7% is not a whole count of 78, which is the paper's own inconsistency.
The collection also lifts few-shot results of other models (Table 3).

### reinforcement learning with the verifier as reward (ANCORA)

Study: [ANCORA](../vl_paper_walkthrough/ancora_20261012.md).

One model plays two roles.
Proposer writes a Verus specification.
Solver writes the implementation.
Verus gives a binary reward.

Step 1, manifold-first SFT: 68 basic Verus demonstrations, then rounds of collecting deduplicated, Verus-verified rollouts and distilling them.
Dafny2Verus pass@1 goes from 0.4% (base) to about 0.5%, about 2.8%, then 26.6% over SFT iterations.
Direct RL from the base model collapses, which the paper calls "manifold collapse".
More than three SFT iterations overfits.

Step 2, mean-normalized GRPO: for K solver attempts with success rate r̄, the advantage is `(r_i - r̄)/r̄`.
All-fail and all-pass groups give zero gradient.
Rare successes get large weight.

Step 3, proposer reward: the main run rewards a specification only when exactly one of K solver attempts succeeds.
That targets hard but solvable problems.

Step 4, curriculum: a UCB-chosen seed gets one extension, which joins the pool only if a solver verifies it and it passes novelty and vacuity filters.
The paper's words on what enters the reward, quoted in the study:
"heuristic scores and MinHash novelty Broder [1997] drive only gating and deduplication, while the policy gradient is driven exclusively by binary verifier outcomes"

### diversity-aware selection (Formal Disco)

Study: [Formal Disco](../vl_paper_walkthrough/formal_disco_20260822.md).
The study is audited; its plan sections are the study's own recommendations, and I use only its paper statements.

Three Claude-seeded workers (initiator, fixer, extender) grow verified programs.
Qwen 2.5-Coder 32B is fine-tuned each round on only the "top 1/3 successful examples", ranked by how rare their program features are.
That is a second filter after the verifier: pass, then be novel.
The study reports pass@1 on 149 filtered VerusBench programs of 8.7% (base), 43.0% (trained), and 40.9% for a SAFE-trained comparison.
At pass@32 it reports 59.1% against SAFE's 51%.

### proof-checked equivalence self-play (SEQ/SINQ)

Study: [SEQ/SINQ study](../vl_paper_walkthrough/improving_llm_code_reasoning_via_semanti_20261012.md).
Haskell with Liquid Haskell, not Verus; the Verus forms are the study's inference.
Alice writes a variant Q of a program P.
Positive pairs (SEQ) keep Q only if Liquid Haskell accepts Alice's proof that P and Q agree on all inputs.
Negative pairs (SINQ) keep Q only if executing both on a supplied input gives different outputs.
Bob is trained to say whether P and Q are equivalent.
Alice is trained on accepted proof traces, and on pairs Bob finds hard.
Difficulty is 10 times the share of ten Bob samples that fail.
The study quotes the paper:
"SEQ Game: Alice's proof is verified by Liquid Haskell, which acts as an external oracle."
Bob is fine-tuned once, in the final round; Alice after every earlier round.
Difference from the other variants: the verifier also labels negatives, by execution, and the selection is by model failure, not by feature rarity.

### other training uses

[DafnyPro study](../vl_paper_walkthrough/dafnypro_20261012.md), Dafny not Verus: fine-tuning on 31k attempts, successful and failed, paired with verifier errors.
It reports first-attempt verification up 23% for Qwen2.5-7B and 13% for Qwen3-14B.

[SPEC CODER study](../vl_paper_walkthrough/teaching_code_llms_to_reason_with_interm_20261012.md), Python checkpoint assertions, not proofs: the same filter idea with tests as judge.
Mutants that pass some tests and fail others are kept.
An annotated program is kept only if every assertion is reached and the thresholds hold, with
"at least one assertion has a non-empty eligible mutant set."
The study splits train and test by problem before generating mutants, to prevent leakage.
It trains two tasks: insert checkpoints into existing code, and write the whole program with checkpoints.

[Baldur study](../vl_paper_walkthrough/baldur_20261012.md), Isabelle not Verus: whole-proof generation by fine-tuning, and a repair model with input
"theorem statement, incorrect proof, error message".
This is the origin of error-conditioned training in this set.
The study notes its repair data only has the first error, so the model learns only those kinds of errors.

## evidence

Denominators differ, so numbers do not line up.
VerusBench has 139 tasks in the SAFE study, 150 in the VeruSyn study, and 149 filtered in the Formal Disco study.
I could not tell from the studies whether these are the same tasks.

SAFE, 139 VerusBench tasks, DeepSeekCoder:
- SAFE 43.17% Accuracy@1, 53.96% @10.
- GPT-4o raw 11.51% and 24.46%.
- Trained on low-quality specifications instead: 17.27% and 23.02%.
- Round 1 to round 3: 32.37% to 43.17% @1.
- With repair (SAFE+): 49.64% @2 and 70.50% @100, against 46.76% and 59.71% direct.
- CodeNet-Test, 1,435 tasks: SAFE 43.83% @1 against GPT-4o raw 0.28%.
- Two further repair rounds add under 1%.

VeruSyn, Qwen2.5-Coder-32B, @100/600 with debugging:
- VerusBench: 83% against Claude Sonnet 4.5 at 76%.
- VeruSAGE-Bench (system proofs): 49% against 54%.
- Without debugging, 39% on system tasks.
- Cost per task at @100, no debugging: $0.17 against more than $8 for Sonnet.
- The paper says "with only 2% of the cost".

AlphaVerus, pass@256 on HumanEval-Verus: 27.1% exploration only, 29.4% linear refinement, 32.9% with tree search.

ANCORA, pass@1, Qwen2.5-Coder-3B:
- Dafny2Verus (274 tasks): 81.46% against PSV 65.63%.
- MBPP-Verified (78): 44.11% against 36.78%.
- HumanEval-Verified (85): 19.15% against 19.07%.
- Cost about 200 GPU-hours.

SEQ/SINQ (Haskell), [study](../vl_paper_walkthrough/improving_llm_code_reasoning_via_semanti_20261012.md):
- Validated training pairs: 937 for the 50/50 regime (E0), 1,839 for counterexamples only (E1), 140 for the 96% SEQ regime (E2).
- These are retained-pair counts; the paper gives no denominator of all Alice attempts.
- E0 has fewer pairs than E1 but better semantic reasoning, per the study.
- E2 and E3 have about 150 pairs each; the authors say these are too small and need larger studies.
- Bob, base against trained, on round-7 challenge instances: 87.57% against 91.34% on train, 88.24% against 88.79% on test.
- Haskell Pass@1 for Bob, averaged over 16 trials: 17.7 to 26.4 on HumanEval, 26.7 to 36.9 on MBPP.
- Transfer is uneven: PySecDB F1 51.3% to 54.0%, CodeXGLUE F1 47.9% to 43.2%.

## where studies disagree or look wrong

SAFE's own numbers conflict.
Its introduction says 79.14%, Table 1's best Accuracy@100 is 70.50%, and appendix F.3 says 20.86% still fail.
Table 1 implies 29.50% fail.
The SAFE study flags this itself.

ANCORA compares against PSV one-shot while its own headline is zero-shot.
The study calls the comparison not protocol-identical.

Formal Disco and SAFE disagree on the same kind of comparison.
Formal Disco reports its model beating a SAFE-trained one by 2.1 points at pass@1.
The study does not say that the SAFE model was retrained under matching conditions.
I would not read this as settled.

## where it fails

The verifier checks the proof against a specification, not against what you meant.
SAFE's gcd example has `ensures result > 0`, which gives a trivial proof.
[SAFE study](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md) cites it as appendix F.4.
Low-quality specifications cut accuracy from 43.17% to 17.27%, so spec filtering is not optional.

Reward hacking: `assume(false)` and trivial preconditions pass the verifier.
Both AlphaVerus and ANCORA add non-verifier prerequisite checks.
Those prerequisite checks (neural critics, vacuity filters) have no formal guarantee.

Self-generated data narrows.
The VeruSyn study says self-synthesis alone gives "narrow and shallow Verus features".
Formal Disco measures diversity directly and treats raw count as insufficient.

Small programs.
VeruSyn's system proofs average 947 lines against 32 for the algorithmic tasks.
Gains on small tasks may not carry over.

Proofs are the bottleneck of equivalence data.
The SEQ/SINQ study reports few positive pairs survive, so counterexamples supply most data.
An executed counterexample shows one difference; it cannot show equivalence.
The training language lacks memory and bit-level behavior, so low-level tasks (DCE, STOKE, TVM) gained little.
The study's own inference: Rust ownership, panics and resources would need to be in the equivalence relation.

The SEQ/SINQ paper disagrees with itself on the share of easy examples kept: 20% and 50% in the same section, per the study.

Translation can change behavior.
The SAFE study says no semantic-equivalence check is reported.
AlphaVerus's translated specifications "can be misaligned".

Repair data is shallow.
Baldur's study: only first errors are seen.
SAFE's study: the pair does not say which edit fixed which error.

Cost and compute.
SAFE needed a month of GPT-4o calls.
ANCORA needed about 200 GPU-hours for a 3B model.
RL from a base model collapses without an SFT warm start.

## open questions

- Do the VerusBench variants overlap? If so, SAFE, VeruSyn and Formal Disco could be compared directly. The studies do not say.
- Does diversity-aware selection beat verifier-only filtering? Formal Disco compares only against a SAFE-trained model, and no study compares it to VeruSyn's tutorial seeds.
- Does fine-tuning on this data help specification writing? Most studies train on proofs given a specification.
- Which of RL (ANCORA) or filtered SFT (the rest) is cheaper for equal accuracy? No study runs both on the same tasks.
- For a repository, what is training-worthy? Formal Disco proposes verifies, passes anti-cheat prerequisite checks, preserves behavior, and adds coverage. That is a proposal, not a measured result.
