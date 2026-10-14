# TLA-Prover: Verifiable TLA+ Specification Synthesis via Preference-Optimized Low-Rank Adaptation
(authored by agents unless marked 🧑)
Tag: `spencer2026tla`, [paper](http://arxiv.org/abs/2606.06133v5)
## paper and earlier coverage

The paper presents TLA-Prover, a 20-billion-parameter model trained to produce TLA+ specifications accepted by SANY and TLC. An earlier audit, `review_b_tla_prover_20261007.md`, already records the headline result, the 30-problem holdout, the mutation idea, and a repository mismatch. This study adds the paper's complete training and grading procedure, its ablations, and the implications for Verus-oriented generation.

The paper's abstract states: “Training combines supervised fine-tuning (SFT) on verified examples with repair-based group-relative policy optimization (GRPO).” It also states: “TLC provides the reward signal directly, with no learned reward model.” (Abstract, PDF p. 1.)

## technique 1: a four-tier verifier ladder

What it is and when to use it. Every generated module is graded in increasing tiers: Bronze (SANY parse), Silver (SANY passes but TLC does not), Gold (SANY and exhaustive TLC pass), and Diamond (Gold plus mutation sensitivity). Use the ladder whenever a generator is optimized against a formal checker, so syntax, model checking, and anti-triviality are separately visible.

How the paper does it. First run SANY. A parse failure is Bronze. For a parsed module, run TLC with a finite `.cfg`; a load failure, timeout, or rejected specification is Silver. A run that exhausts the reachable state space with all declared invariants holding is Gold. For Gold, apply one AST mutation to the invariant and rerun TLC. The paper lists three uniformly sampled operators: negate a top-level conjunct; flip a relational operator such as `=` to `≠` or `≤` to `≥`; or replace a named constant with a random alternative of the same syntactic class. TLC must return a counterexample. The paper's exact description is: “Diamond. Gold and the invariant is mutation-sensitive. We apply an automated AST-level mutation to the invariant predicate and rerun TLC on the mutated specification; the mutation must cause a TLC counterexample.” (Section 3, “Four-Tier Validation Hierarchy,” PDF p. 3.)

Verus form. Inference: implement Bronze as Rust/Verus parsing and ordinary compilation, and Gold as `verus` verification of `requires`/`ensures` and loop invariants. Inference: implement Diamond by generating a controlled mutation of a postcondition or invariant, rerunning Verus, and requiring a proof failure that identifies a counterexample or unsatisfied obligation; Verus has no TLC state-space enumerator, so the mutation harness must construct bounded tests or a finite model separately. Verus `invariant` clauses belong on loops or quantified proof contexts, not as a function call.

Evidence and limits. On the held-out suite, the final repair-GRPO checkpoint reached 9/30 Gold and 9/30 Diamond (30% each); the denominator is 30 problems, greedy decoding (`T=0`, `K=1`). Table 1 reports 30.0% for both columns. The DPO ablation reached 23.3% Gold and 20.0% Diamond, so one of 30 Gold outputs failed mutation. The paper says: “Tautological invariants such as TypeOK == TRUE fail this check by construction.” (Section 3, PDF p. 3.) This catches the stated always-true-invariant hack, but the authors caution that semantically weak, non-tautological invariants can remain.

## technique 2: diamond-curated SFT data

What it is and when to use it. Curate training examples by the same four-tier grader and retain only Diamond survivors. Use this when a large corpus contains syntactically valid but vacuous specifications.

Steps in the paper. Seed from 205 TLA+ Foundation specifications and the `tlaplus/examples` repository. The latter has 316 modules: 129 TLC-targeted, 34 TLAPS-targeted, and the remainder utilities or drafts. A trained generator creates candidates from natural-language descriptions. The four-tier grader checks each candidate, while a frozen LLM judge scores parsing, model checking, non-trivial invariants, unused variables, descriptive operator names, and formatting. Keep only Diamond rows, upsample them 2×, deduplicate, and obtain 1,053 rows. Hold out 30 problems with disjoint module names. Manual regrading of 60 random rows agreed with the judge on 93%; disagreements were concentrated in Silver/Gold timeout cases. Table 4's scratch SFT runs compare 4,210 silver-and-above rows (2/30 = 6.7%), 1,890 gold-and-above (3/30 = 10.0%), and 1,053 diamond-only (4/30 = 13.3%).

Verus form. Inference: generate Rust/Verus candidates, compile and verify them, mutate contract predicates, and retain only candidates whose original proof succeeds and whose mutation fails. Inference: replace the frozen LLM judge's informal quality checks with structural checks over `spec fn`, `requires`, `ensures`, and executable examples; human review remains needed for whether the contract states the intended behavior.

Limits. The paper reports a mislabeled corpus: a directory labeled TLAPS-targeted contained only 66 genuine proof rows out of 3,271, the paper reports: “The unintentional 98% spec / 2% proof composition meant the model trained on this corpus learned no prover capability.” Content-level auditing, rather than path labels, is the stated fix. This is a data curation failure, not a verifier theorem.

## technique 3: repair-based GRPO with dense tier rewards

What it is and when to use it. Standard GRPO has zero advantage when every sample receives the same failure reward. Repair-based GRPO starts from broken specifications and trains the model to repair them using TLC errors, producing reward variance.

Steps. Collect broken/fixed pairs from earlier attempts and keep trajectories whose input score lies in the learnable interval 0.10–0.80. The paper retained 42 pairs from 133 trajectories. For each of 160 updates, sample a pair, grade its broken input, generate `K=4` repairs at temperature `T=0.5`, and grade each repair. Give tier-transition weights 0.1 (Bronze→Silver), 0.3 (Silver→Gold), and 0.6 (Gold→Diamond). Normalize each reward within the group, add a KL penalty βKL=0.02 to the SFT policy, and update the LoRA policy. Algorithm 1 gives the exact loop and states: “Repair-GRPO checkpoint πθ” and “Update θ by gradient step on L.” (Section 3, Algorithm 1, PDF p. 5.)

Training details. Stage 1 applies rank-8, alpha-16 LoRA with dropout 0 to attention q/k/v/o; the MoE experts and router are not targeted. The base model is dequantized from MXFP4 to BF16, trained with AdamW at 2×10⁻⁵, sequence length 3072, per-device batch size 1, accumulation 8, one epoch on two 48-GB RTX 8000 GPUs. Stage 2 uses AdamW at 3×10⁻⁶ with linear decay and takes about 1.7 hours. The paper reports the SFT stage as 4–5 hours.

Verus form. Inference: feed a failed Verus verification diagnostic plus the candidate Rust/Verus text back to the generator; grade repairs by moving from parse/type-check to verified postconditions and mutation-sensitive contracts. Inference: normalize rewards across candidates and retain a KL anchor to the SFT policy; these are optimization choices, not Verus constructs.

Evidence and limits. Repair-GRPO reached 30% Diamond versus 20% for same-base DPO on 30 held-out problems. The paper attributes the difference to a continuous reward whenever a repair improves tier. It also records failure from token truncation: all samples received the same Bronze reward, σr collapsed to zero, and no gradient flowed. The authors recommend monitoring reward variance. TLC costs 1–60 seconds per run, limiting training throughput to about K=4 on the reported hardware.

## technique 4: inference-time sampling and feedback

The headline uses one greedy decode. Best-of-8 uses `T=0.5`, `K=8`; the union of greedy and best-of-8 is an upper bound; three-shot TLC-feedback repair retries a rejected specification. Table 5 reports 9/30 (30%) greedy, 11/30 (37%) best-of-8, 13/30 (43%) union, and 9/30 (30%) three-shot repair. These denominators are all the same 30 held-out problems. The paper says: “Use best-of-K sampling (K ≥ 4) when the goal is a single usable candidate specification.” (Section 4, Practitioner Guidance, PDF p. 9.) Inference: for Verus, use greedy decoding for reproducible benchmarks and bounded best-of-k for a usable draft, while recording every verifier run and its contract mutation.

## what is proved, trusted, and unresolved

The paper proves only that generated TLA+ text passes the stated SANY/TLC checks and, at Diamond, that one sampled mutation triggers a TLC counterexample. It does not prove that a generated specification matches a natural-language requirement, refines an implementation, or establishes liveness. TLC, SANY, the mutation implementation, finite `.cfg` constants, the frozen judge, and the training data remain trusted. The paper explicitly calls generated specifications “checkable first drafts, not verified designs.” (Section 4, Practitioner Guidance, PDF p. 9.)

The paper's Table 3 lists ten domains with three problems each, although nearby prose calls the suite “six application domains”; this is an internal description mismatch. Table 1 compares TLA-Prover's 30-problem suite with a FormaLLM baseline averaged over 25 models and 26 specifications (650 runs per cell), so the 3.5× comparison to 8.6% is not a matched model and denominator. The earlier audit also found the public repository's validator differs from the paper's AST mutation description. Inference: these discrepancies make the headline useful as a paper-reported result, but insufficient as a reproducibility claim without pinning code, checkpoint, grader, and benchmark files.

## implications for VeruLaw

Inference: the strongest transferable idea is to make contract generation verifier-driven while explicitly testing for reward hacks and checking contract mutation. Inference: a product using agent-written verified Rust is threatened by the same proxy problem: a Verus proof can certify a weak postcondition. The product should therefore score contract strength against a requirement and run mutation tests, not only accept a verifier-success bit. Inference: TLA-Prover's narrow template bias (simple `TypeOK` state predicates) suggests measuring domain coverage and requiring message-case, ownership, and temporal behaviors in the benchmark. The paper reports 0/3 Diamond in communication, concurrency, puzzles, and transactions, versus 2/3 in mutual exclusion, scheduling, and workflows (Table 3); each denominator is three problems.

## techniques for the catalog

- four-tier verifier ladder — grade syntax, model checking, and mutation sensitivity as separate Bronze, Silver, Gold, and Diamond gates
- mutation-sensitive anti-triviality check — mutate a passing invariant and require TLC to expose a counterexample
- diamond-curated corpus — retain only verifier-passing, mutation-sensitive examples for supervised training
- repair-based GRPO — train on failed specifications with dense tier-transition rewards and verifier feedback
- reward-variance monitoring — detect GRPO collapse when all sampled repairs receive the same score
- best-of-k verifier sampling — use repeated checked candidates to raise usable-specification yield while preserving a greedy benchmark
Checked 2026-10-13: audit record spencer2026tla; paper-study comparison complete; gate executed; experiments not rerun
