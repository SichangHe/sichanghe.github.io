# Goedel-Prover: A Frontier Model for Open-Source Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `lin2025goedelprover`, [paper](https://arxiv.org/abs/2502.07640)

Audit: audited 2026-10-13 against the paper; checked every number in Tables 1 to 8, 10 and 11, the quotations, page references, the steps of techniques 1 to 7 against Sections 3 to 5 and Appendices A, B, D, E, F; corrected the run-to-run claim for the plus-minus 0.7, the 3-point lead, the 508K denominator, the SymPy 0.8%, the claims on Lean exits and on the hand-made benchmark, the leaderboard and cost claim in the threat paragraph, and marked the volume confound, the unaudited judge and the iter-0 split as inference; Verus statements were not checked beyond the study's own Inference marks.

source: Lin, Tang, Lyu, Wu, Lin, Yang, Li, Xia, Chen, Arora and Jin, arXiv:2502.07640v3 (19 Apr 2025), technical report, 21 pages with appendices A to F. The filed studies of APOLLO and of reward-oracle MCTS use this prover as a component and do not describe how it was built; this one does.

## what the paper is about

Goedel-Prover is a language model that, given a Lean 4 theorem statement, writes the whole proof in one pass with no feedback from Lean. The paper is a data recipe. It has two halves: turn natural-language maths problems into Lean statements at scale (1.64 million of them), then grow a proof corpus by letting each trained prover prove what it can and training the next prover on the pile. Lean checks every proof that enters the training data and every proof counted in a result. No statement is checked by anything stronger than an LLM judge. The headline measurement is 57.6% of miniF2F problems solved with 32 samples per problem.

Programs are absent from this paper: no code, no specifications of code, only competition mathematics. Every Verus form below is therefore an inference, and is marked so.

## technique 1: two formalizers trained on different sources

what it is: two fine-tuned models translate each informal problem into a formal statement, and they are trained on statement pairs of different origin so that they write in different styles.

when to use: when formal statements are the scarce input and a prover trained on one author's style of statement may not transfer to another's.

steps (Section 3.1, p.4 to 5; Appendix A.2, p.14):
1. Formalizer A: fine-tune Qwen2.5-Coder-32B on formal and informal statement pairs from Lean Workbook
2. Formalizer B: have Claude-sonnet-3.5 formalize 230K Numina statements, keep the 170K that compile in Lean, and fine-tune the same base model on those pairs
3. generate: “For each informal statement in Numina, we generate eight formalized statements from each formalizer, resulting in 16 formalized statements per problem.” (p.14)
4. run the two tests of technique 2 on every candidate
5. select: “We then randomly select one valid statement from each formalizer.” (p.14); a formalizer with no valid candidate contributes nothing for that problem

Result of the five steps (Section 3.1, p.5): of 928K informal statements (860K open Numina plus a private 68K from Art of Problem Solving), 760K got a valid statement from both formalizers and 123K from one. That is 2 × 760K + 123K = 1.64M statements, and 45K problems with none. Adding Lean Workbook's 140K gives the 1.78M set the provers were run on.

evidence that style matters. Table 6 (p.14) shows one problem, an even-function exercise, formalized both ways: the final prover proves Formalizer A's version in 14 of 16 samples and Formalizer B's in 0 of 16; on a second problem it is 0 of 16 against 5 of 16. Table 3 (p.9; iter-8 provers trained on proofs from the iter-7 prover; Pass@32): statements from A only give miniF2F 56.5%, ProofNet 13.8%, NuminaTest 59.6%; from B only 56.2%, 15.2%, 60.0%; from both 57.6%, 15.2%, 61.2%. The paper's conclusion: “We find that a prover trained on a mixture of styles—combining statements produced by both Formalizer A and Formalizer B—outperforms provers trained on a single formalization style.” (Section 5, p.8)

limits: Inference: Table 3's both-formalizer row may also have more statements than a single-formalizer row (the paper does not give the sizes of the three sets), and Figure 5 shows separately that more statements help; if so, the table does not separate style from volume. The differences are about one point on miniF2F, in single runs, against the 57.6% ± 0.7% of Table 1 (the paper does not say what the ± measures).

Verus form. Inference: the input is a natural-language description of a function and the output is a Rust signature with `requires` and `ensures`, plus the `spec fn` definitions the contract needs. Table 6's lesson has an exact Verus counterpart: a contract that states a property inline and one that routes it through a helper `spec fn` are the same promise, yet differ in what the solver must unfold, so a proof agent can succeed on one and fail on the other. Generating the contract from two differently trained or differently prompted writers and keeping both as separate training items is the transfer. For a product task the two contracts must also be shown equivalent, which this paper never needs because it uses the statements only as training material.

## technique 2: two filters on a formal statement, compile and judge

what it is: a syntax filter and a meaning filter applied to each candidate statement before any proof is attempted.

steps (Section 3.1, p.5; Appendix A.2, p.14):
1. Compiling Correctness (CC) test: the statement must compile in Lean with the proof replaced by the placeholder `:= by sorry`
2. Faithfulness and Completeness (FC) test, the requirement: “Second, the formalized statement must accurately capture the original informal problem, incorporating all assumptions, conditions, and implicit definitions.” (p.5)
3. FC test, the mechanism: Qwen2.5-72B-Instruct judges each statement four independent times with the prompt of Figure 7; the score is the share of the four that answer Appropriate
4. threshold: “We filter out formalized statements with an FC score less than 0.5.” (p.14)

evidence (Table 7, p.15; the paper labels the rows Pass@1 and Pass@8 and does not define them further):
- CC test: Formalizer A 76.74% and 95.93%; Formalizer B 88.48% and 98.59%
- FC test: A 48.06% and 88.01%; B 80.42% and 97.22%
- both tests: A 45.72% and 82.33%; B 76.41% and 95.78%

limits: Inference: the FC judge is itself unchecked. I found no human audit of passed statements in the paper, so the rate of wrong statements in the 1.64M is unknown. Footnote 1 (p.3) shows that mis-formalization happens even in a published benchmark: “However, after discussing with the authors of PutnamBench, we discovered that one of the problems was mis-formalized.” A wrong statement that is provable still yields a Lean-checked proof, so it enters training without any alarm. Figure 7 is an image; its prompt text is not in the extracted text and is not reproduced here.

Verus form. Inference: the CC test is running Verus on the signature and contract with the body left as a hole. For a `proof fn` the hole is `assume(false)` as the body; the file must then be marked unfinished so the hole is never counted as a proof. The FC test is an LLM vote on whether `requires` and `ensures` say what the task text says. Two cheap mechanical checks exist in Verus that Lean statements lack and that I would add before the vote; they are not in the paper: reject a contract whose `requires` is unsatisfiable (prove `false` from it), and reject one whose `ensures` a trivial body satisfies.

## technique 3: expert iteration with whole proofs, retraining from the base each round

what it is: a loop in which the current prover attempts every statement, the checker keeps the correct proofs, and a new prover is trained on all proofs found so far.

when to use: when statements are plentiful, proofs are not, and a mechanical checker can label proofs for free.

steps (Section 3.2, p.5 to 6; Appendix B, p.14 to 15):
1. round 0 uses an existing prover: DeepSeek-Prover-V1.5-RL generates 16 proofs per statement
2. Lean verifies every proof
3. keep one proof per solved statement: “If at least one proof solves the statement, we retain one proof per statement.” and “In cases where multiple proofs are available, we randomly sample one solution.” (p.6)
4. fine-tune DeepSeek-Prover-V1.5-Base on the kept proofs; that is the iter-1 prover
5. repeat: the iter-k prover generates, correct solutions are added to the cumulative pile, and the iter-(k+1) prover is again trained from DeepSeek-Prover-V1.5-Base, not from iter-k
6. the statement pool grows by stages (Appendix B and Table 8): Claude-formalized statements over the first rounds, Formalizer B's from iter-4, Formalizer A's from iter-7, and 104K Mathlib4 items in training from iter-6

Settings: learning rate 1e-4 or 5e-5, 1 or 2 epochs, batch size 8 with packing. Cost per round as given in Section 3.2: about 12 hours on 4 H100 GPUs for one training epoch, 6 hours on 64 H100 GPUs to sample 16 proofs for the 1.78M statements, and 10 hours on 8,000 CPUs to verify them.

evidence:
- growth of the pile (Table 8, p.15): solved formalized statements go 72.4K, 128.7K, 161.2K, 425.8K, 436.5K, 443.2K, 887.7K, 915.7K, 928.2K from iter-1 to iter-9; solved Lean Workbook statements go from 20.6K to 30.3K of 140K
- miniF2F (Table 1, p.7; whole-proof generation): Goedel-Prover-SFT 57.6% ± 0.7% at Pass@32, against DeepSeek-Prover-V1.5-RL 50.0% ± 0.5%; 62.7% against 54.9% at Pass@3200; 64.7% against 58.5% at 4 × 6400
- PutnamBench (Table 2, p.8): 7 of 644 solved at Pass@512, and 6 at Pass@32
- scale (Figure 5, p.8): the average of miniF2F, ProofNet and NuminaTest at Pass@32 rises steadily as the training statement set grows from 10^4 to 10^6; the figure gives no table of values

limits:
- the big jumps in Table 8 happen when new statements arrive (161.2K to 425.8K at iter-4, 443.2K to 887.7K at iter-7). Within a fixed pool the pile grows by a few percent per round (425.8K, 436.5K, 443.2K). Inference: on this evidence most of the gain comes from more statements, and iterating on a fixed pool saturates within two or three rounds.
- the prover's style is solver-heavy. Appendix F (p.20) says its proofs lean on tactics such as `nlinarith` and `simp_all` that do several steps internally, and adds: “Whether this style of proof is sufficient for complex reasoning remains an important area for exploration.”
- no feedback at inference: one pass, no repair with error messages.
- Lean Workbook counts are on training statements: “Notably, the problem set from Lean Workbook is included in this training, which is consistent with DeepSeek-Prover-V1.5 (Xin et al., 2024a) and InternLM2.5-StepProver (Wu et al., 2024).” (p.6)

Verus form. Inference: a statement is a Rust function with its contract and an unproved body; a proof is the same file with `invariant` and `decreases` clauses, `assert` statements and `proof fn` lemmas added; the checker is Verus. Three things change. The acceptance test must also scan for `assume`, `admit` and `#[verifier::external_body]`, because Verus accepts a file that uses them and Lean has its own exits (`sorry`, user-declared `axiom`) that a Lean scan must also reject. The acceptance test must compare the contract and the executable code with the original, since a Verus answer can pass by editing either. And the scale does not carry over: the loop here ran on 1.78M statements, and a Verus pool would be built from code with far fewer independent functions, so step 6's staged growth is the part to plan first. What carries over unchanged: keeping one random proof per statement, which stops easy statements with sixteen proofs from dominating, and retraining from the base model each round.

## technique 4: a held-out slice of your own data, and correlations across test sets

what it is: two diagnostics for whether training is helping on the intended kind of problem.

steps (Sections 4 and 5, p.6 and p.8):
1. sample 250 statements at random from the formalized Numina set and never train on them; call this NuminaTest
2. at every round and every hyperparameter setting, record the score on each test set
3. compute the correlation of those scores between each pair of test sets
4. read a negative correlation as a sign that two test sets want different training data, and confirm with an ablation that adds the suspected data

evidence: “We observe that the model performance on ProofNet is negatively correlated with the performance on miniF2F, Lean Workbook, and NuminaTest.” (Section 5, p.8). Figure 6 gives the coefficients: ProofNet against miniF2F is -0.51, against Lean Workbook -0.32, against NuminaTest -0.20, while miniF2F against Lean Workbook is 0.86. The ablation is Table 4 (p.10; iter-6 prover, Pass@32): trained on iter-5 proofs, miniF2F 56.6%, ProofNet 13.3%, NuminaTest 59.2%; with Mathlib4 added, 54.1%, 15.6%, 58.8%. The authors kept Mathlib4 in from iter-6 anyway, to widen coverage.

Verus form. Inference: the two populations for a Verus prover are textbook-style algorithm tasks (the public benchmarks) and system code that leans on project-specific `spec fn` definitions and lemmas, which is the Mathlib-like side. The paper's result predicts that training on one can cost points on the other, so scores must be tracked separately per population and a single averaged number hides the trade.

limits: the number of rounds and settings behind each coefficient is not stated, so the correlations rest on an unknown and probably small number of points.

## technique 5: preference and reinforcement training on top, with guards against shortcuts

what it is: after supervised training, further training that rewards proofs Lean accepts. The paper tries offline DPO and online GRPO, finds a failure, and adds guards.

steps for DPO (Appendix E.1, p.17):
1. run the supervised prover 16 times on each problem; keep problems solved 1 to 4 times of 16 (pass ratio in (0, 1/4]); 30K problems qualified from 508K sampled proved problems
2. build one pair per problem from a random correct and a random wrong proof among the 16
3. train two epochs at learning rate 5e-6
4. guard: “Specifically, when multiple correct answers are available for a given statement, we select the one with the shortest length.” (p.17)

steps for GRPO (Appendix E.2, p.18 to 19):
1. choose problems with pass ratio in (0, 1/2]
2. generate 16 proofs per problem and compile them; reward +8 for a correct proof, -8 for an incorrect one
3. give a timeout the same reward as a failure
4. learning rate 5e-6, KL penalty weight 0.003, batch size 256, one epoch

evidence (Table 5, p.10; miniF2F; Pass@32, Pass@3200, average proof length, average count of the tactic `try` per proof):
- SFT: 57.5%, 62.7%, 298, 1.50
- DPO: 60.3%, 64.6%, 486, 10.89
- length-penalized DPO: 59.8%, 63.1%, 308, 1.11
- GRPO: 60.5%, 63.1%, 355, 5.16

Difficulty band (Table 10, p.19; GRPO; miniF2F accuracy): pass ratio (0, 1/4] 58.2; (0, 1/2] 60.4; (0, 3/4] 59.8; (0, 1] 59.2. Timeout reward (Table 11, p.20): reward 0 gives 58.7% accuracy with 4.5% of test outputs timing out; -8 gives 60.2% and 1.7%; -16 gives 59.2% and 0.8%. The paper's summary: “The results in Table 11 demonstrates that setting the reward for timeouts to be the same as that for failures results in improved performance across these experiments.” (p.19)

where it fails, in the paper's words:
- the shortcut. Lean's `try` runs a tactic and carries on whether or not it worked. “The RL-trained model begins to excessively favor this pattern, ultimately impairing its reasoning and generalization capabilities.” (Section 5, p.10)
- less to gain from more samples. The lead over SFT at Pass@32 (3.0 points for GRPO, 2.3 for length-penalized DPO) shrinks to 0.4 points at Pass@3200 for both. “This indicates that RL training may reduce output diversity, leading to less efficient inference-time scaling.” (p.10)
- the reward is not the metric. Training reward kept rising while Pass@16 flattened after about 20 steps (Figure 12). The reason offered: “In contrast, the Pass@N metric only considers whether a problem is solved at least once, irrespective of how many successful attempts occur.” (p.19)

Verus form. Inference: the reward is whether Verus accepts the file. Verus has nothing shaped like `try`, since a failed `assert` fails the function. The shortcuts available to a Verus policy are different and worse: `assume`, a weakened `ensures`, an added `requires`, or piles of redundant `assert` lines and `by (nonlinear_arith)` hints that cost solver time. So the guards are a forbidden-construct scan and a contract comparison inside the reward, the shortest-correct-proof rule for pairs, and the failure reward for solver give-ups. The two monitors carry over directly: track average proof length and the count of a few named constructs per proof at every checkpoint.

## technique 6: sketch, then prove subgoals (reported as a failure)

what it is: a strong general model writes a proof outline, and the specialized prover fills in each piece.

steps (Appendix D, p.16 to 17):
1. prompt o1-preview for a step-by-step proof in which every step is a `have` naming its subgoal
2. delete the body of each `have`, keeping the outline; put the outline through Lean to extract each subgoal with its hypotheses as a separate problem
3. run DeepSeek-Prover-V1.5-RL on each subproblem, 32 attempts each; if all are proved, splice them back

evidence: on the 244 miniF2F validation problems the pipeline solved 76, against 158 for DeepSeek-Prover-V1.5-RL alone, and only one of the 76 was new. “However, this pipeline turned out to be ineffective in practice.” (Section 5, p.9). The stated guess at the cause: “This might due to the fact that this pipeline is overly complicated, since failure of each subproblem might lead to the failure for the entire problem.” (p.17)

Verus form. Inference: the outline is a body made of `assert` statements, or helper `proof fn` lemmas with `assume(false)` bodies that the main proof calls; each lemma is then a separate task. The filed APOLLO study reports a later repair-based variant of this idea that does help the same prover, so the lesson from this appendix is narrow: a one-shot outline with all-or-nothing assembly loses to plain sampling.

## technique 7: computer algebra on the statement (tried, left out)

Appendix F (p.20 to 21): parse goals of the form A = B, build A − B in SymPy and simplify. It closes 9.4% of miniF2F outright by reducing the goal to 0 = 0; the paper adds that it “solves 0.8% of the problems in miniF2F that were unsolved by Goedel-Prover-SFT with Pass@32, but did not improve Goedel-Prover-SFT with Pass@3200”. “Thus, SymPy simplification is not part of any of our reported results.” (p.21). Inference: for Verus the analogue is handing arithmetic side goals to a dedicated solver mode before asking a model, and the paper's numbers say the gain vanishes once the model is sampled enough.

## what is proved, what is measured, what stays trusted

Checked by Lean: every proof in the training pile and every solved benchmark problem. Measured: the scores above. Trusted (Inference, the study's own list): Lean 4 and Mathlib (the paper names Lean 4.9.0 only for miniF2F and ProofNet); the benchmark statements; the LLM judge for the 1.64M generated statements; that solved-by-sampling at Pass@3200 is a meaningful budget.

## numbers that do not agree

- Number of rounds. Section 1 (p.3): “We conduct a total of 8 iterations and observe a consistent improvement starting from the first iteration.” Table 8 and Figure 4 run from iter-0 to iter-9. The 29.7K Lean Workbook figure in the abstract is Table 8's iter-8 row; iter-9 has 30.3K.
- The abstract says the solved set has proofs for over 800K statements; Table 8 has 915.7K at iter-8 and 928.2K at iter-9. This is loose, not contradictory.
- 29.7K against the prior 15.7K. Table 8's iter-0 row already lists 20.6K solved Lean Workbook statements, before any Goedel prover was trained. Inference: 4.9K of the 14.0K gain (20.6K minus 15.7K) predates the Goedel provers, and 9.1K (29.7K minus 20.6K) comes after; the paper does not say what produced the iter-0 20.6K.
- Goedel-Prover-SFT at Pass@32 on miniF2F is 57.6% in Table 1 and Table 3, and 57.5% in Table 5.
- GRPO problem count: Appendix E.2 says 80K statements with pass ratio in (0, 1/2]; Table 10 lists 62K for that band. GRPO's accuracy is 60.5% in Table 5, 60.4 in Table 10 and 60.2% in Table 11.
- The abstract's “by 7.6%” is 7.6 percentage points (57.6 against 50.0), a relative gain of 15%.
- miniF2F has 244 validation and 244 test problems; Table 1 does not say which half its scores are on.
- Section 5 says the two RL variants reach a 3% improvement at Pass@32; Table 5 gives 3.0 points for GRPO and 2.3 for length-penalized DPO.

## already done, and threat to VL

Done here and not worth repeating: the demonstration that expert iteration over autoformalized statements, with plain supervised training, beats an RL-trained predecessor; the comparison of DPO and GRPO against it with the shortcut and diversity findings; the failed one-shot sketch pipeline.

Not done here: anything about programs; any audit of statement faithfulness; use of checker feedback during generation.

Threat. Inference: none directly, since this is a mathematics prover that writes Lean tactics and cannot read Rust. Indirectly it shows the cost of entry. The paper reached first place on the PutnamBench leaderboard (Table 2) with open base models, Claude-sonnet-3.5 annotations, a private 68K problem set, about 430 GPU-hours per round (12 h on 4 GPUs plus 6 h on 64 GPUs, my sum from Section 3.2), and 8,000 CPUs for checking. The same recipe pointed at Verus needs a million statements, which this paper made with two trained formalizers. Whoever assembles a large pool of Rust functions with contracts can run this loop, and VL's own agent runs, if every verified function and every failed attempt is kept, are such a pool.

## techniques for the catalog

- dual-style autoformalization — train two statement formalizers on pairs from different sources and keep one valid output from each per problem, so the prover sees more than one style of the same statement
- compile-with-hole statement check — accept a generated statement only if it compiles with its proof replaced by a placeholder
- four-judgment score for faithfulness — have an LLM judge each formal statement four times against its informal source and drop those with fewer than two approvals
- expert iteration from the base model — each round sample 16 whole proofs per statement, keep one random checked proof per solved statement, add to a cumulative set, and retrain from the original base model
- staged statement pool — enlarge the pool of statements between rounds, which in this paper accounts for the large jumps in solved count
- held-out slice plus cross-benchmark correlation — hold out a random sample of the generated statements and correlate scores across test sets over rounds to detect that two test sets need different training data
- pass-ratio band for RL problems — train with reinforcement only on problems the current model solves sometimes, here in at most half of 16 samples
- shortest-correct-proof preference pairs — when building preference pairs choose the shortest correct proof as the positive, which largely removed the growth in proof length and in `try` use (Table 5: 308 against 486 for plain DPO, and 1.11 against 10.89 `try` per proof)
- timeout equals failure reward — give a checker timeout the same negative reward as a wrong proof
- shortcut monitors — track average proof length and the count of permissive tactics per proof across training to catch reward hacking
- outline then subgoals — have a general model write a `have` outline and a prover fill each subgoal; with all-or-nothing assembly this solved fewer problems than sampling alone
