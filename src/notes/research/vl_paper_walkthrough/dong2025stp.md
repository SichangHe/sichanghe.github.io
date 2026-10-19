# STP: Self-play LLM Theorem Provers with Iterative Conjecturing and Proving
(authored by agents unless marked 🧑)
Tag: `dong2025stp`, [paper](https://arxiv.org/abs/2502.00212v4)

## what the paper does and measures

Self-play Theorem Prover (STP) trains one language model in two roles: a conjecturer generates related formal statements and a prover attempts to prove them. Correct proofs train the prover; conjectures that are correct, elegant, relevant, and difficult but still approachable train the conjecturer (Abstract and Sections 1, 3, pp. 1–6). The paper's central claim is data-efficient self-improvement: “The conjecturer is trained iteratively on previously generated conjectures that are barely provable by the current prover, which incentivizes it to generate increasingly challenging conjectures over time.” (Abstract, p. 1).

The Lean run uses 48 iterations, 3.6 million generated conjectures, 241 million generated proofs, and 51.3 billion generated tokens (Section 4.2, p. 7). On LeanWorkbook, STP's cumulative pass rate reaches 28.5% of statements, compared with 13.2% for the prior expert-iteration result (Abstract and Section 1, pp. 1, 3). The denominator is the LeanWorkbook statement set; the paper notes that some statements are unprovable. Manual review of 20 randomly selected unproved statements found 16 accurate translations and only 7 provable statements, yielding a 95% confidence interval of 38.7%–68.5% for the best possible pass rate (Section 4.2, p. 7).

On held-out benchmarks, the final STP model obtains 65.0% miniF2F-test pass@3200, 23.9% ProofNet-test pass@3200, and 8/644 PutnamBench problems at 3,200 samples (Abstract, p. 1; Table 1 and Section 4.2, pp. 8–9). Pass@k means the percentage of statements for which at least one of k independent proofs verifies; the denominators are the benchmark sizes, with PutnamBench explicitly 644. The Isabelle study disables expensive tactics and uses different timeouts (Section 4.1, p. 7). Inference: its results are not directly interchangeable with Lean.

The formal verifier selects correct generated proofs (Section 3.2, pp. 5–6).

## technique 1: initialize prover and conjecturer with supervised proof data

what it is: fine-tune a generic language model on proof-library statement–proof pairs for the prover, and on lemma–seed-theorem–proof–conjecture tuples for the conjecturer (Section 3.1, pp. 4–5). The conjecturer receives a lemma used by the seed proof so its output is related by a concrete proof idea.

when to use it: Inference: use this when a model needs both syntax competence and a mechanism for proposing nearby but novel goals. The paper describes the design as: “We design the Self-play Theorem Prover (STP) that simultaneously takes on two roles, conjecturer and prover, each providing training signals to the other.” (Abstract, p. 1). It also states: “We evaluate STP with both Lean and Isabelle formal versifiers.” (Abstract, p. 1).

how to apply it:

1. extract statement/proof pairs and train next-token loss only on the proof for the prover (Section 3.1, pp. 4–5)
2. extract tuples where a lemma precedes two ordered theorems in one file and is used in both proofs (Section 3.1, p. 5)
3. train the conjecturer on a system prompt, lemma, seed statement and proof, with the later theorem as target (Section 3.1, p. 5)
4. optionally use a trivial lemma to broaden conjecture generation (Section 3.1, p. 5)

Verus form: Inference: build prover examples from Rust/Verus functions and verified `proof fn`s, and conjecturer examples from a lemma, a seed contract, and a related verified contract. Compute loss on proof outputs for the prover and conjecture outputs for the conjecturer, treating their prompts as input. The model's output remains untrusted until Verus compiles it.

evidence and limits: Lean uses DeepSeek-Prover-V1.5-SFT as its base, while Isabelle starts from Llemma-7b (Sections 4.2–4.3, pp. 7–9). The paper does not isolate the contribution of each SFT source through a full ablation.

## technique 2: generate related conjectures and proofs with a controlled sample budget

what it is: each iteration extracts seed lemmas from existing generated proofs, de-duplicates by seed statement and lemma, generates conjectures, and samples K independent proofs for both conjectures and unproved dataset statements (Section 3.2, pp. 5–6). The retained conjecture count is capped at the number of remaining unproved statements. Each receives the same number of proof samples. Inference: the conjecture share of proof sampling is therefore at most half.

when to use it: Inference: use this when fixed theorem data produces sparse successful proofs and a curriculum of nearby goals can provide denser feedback.

how to apply it:

1. collect seed inputs from statements with existing generated proofs and extract a used lemma through the verifier (Section 3.2, p. 5)
2. remove duplicate seed/lemma inputs and overrepresented lemmas (Section 3.2, p. 5)
3. generate conjectures and randomly retain no more than the count of unproved source statements (Section 3.2, p. 5)
4. combine retained conjectures with unproved statements and sample K proofs independently for each; STP uses K=32 (Sections 3.2 and 4.1, pp. 5, 7)
5. verify every proof and carry correctness, lemma usage, and timing metadata forward (Sections 3.2 and 4.1, pp. 5, 7)

Verus form: Inference: seed conjectures from verified Rust lemmas and contracts, generate related obligations, and allocate a fixed compile budget between source obligations and generated ones. Use Verus diagnostics as the correctness oracle; do not train on unverified proof text as if it were a successful example.

evidence and limits: STP generated 241M proofs and 3.6M conjectures in Lean (Section 4.2, p. 7). STP uses K=32 proofs per target, compared with K=64 for expert iteration and parallel sampling (Section 4.1, p. 7). Inference: this controls proof-sample counts, but does not establish equal total compute or an optimal budget for Verus.

## technique 3: select barely provable conjectures with explicit rewards

what it is: estimate each conjecture's empirical pass rate from K samples, retain correct proofs whose pass rate lies in (0, 1/4], require that the seed lemma is used, remove duplicate conjectures, and apply an elegance filter based on proof length divided by conjecture length (Section 3.2, pp. 5–6). The paper gives the exact selection rule: “To decide whether a conjecture c is challenging, we use the (empirical) pass rate of the prover estimated by the K independently generated proofs:” (Section 3.2, p. 5).

when to use it: Inference: use this to target goals that are hard enough to teach new skills but not so hard that almost all samples fail.

how to apply it:

1. form records containing seed theorem, seed proof, used lemma, conjecture, and generated proof (Section 3.2, p. 5)
2. compute pass rate as correct verified proofs divided by all sampled proofs for that conjecture (Section 3.2, p. 5)
3. retain records with a correct proof, pass rate in (0, 1/4], and the seed lemma used in that proof (Section 3.2, p. 5)
4. discard the conjecture proofs from these records and remove duplicate conjectures (Section 3.2, p. 6)
5. discard conjectures whose minimum correct proof length divided by conjecture length is in the lowest 20% of the remaining examples, then reweight the retained records as described below (Section 3.2, p. 6; Algorithm 2, p. 17)

Verus form: Inference: estimate difficulty from verified Rust proof samples, select obligations with a small positive success rate, and require dependency evidence that the intended lemma was used. Replace textual proof-length heuristics with a documented metric over Rust proof blocks and verifier time.

evidence and limits: in the Isabelle ablation, at a checkpoint with 11.4% cumulative pass rate, only 131 of 2.5 million generated proofs for 79,000 unproved statements are correct (Figure 4 and Section 4.4, p. 9). The paper reports: “In contrast, at least 47% of the generated conjectures in STP training are successfully proved because the conjecturer is trained to generate more approachable statements thanks to the design of its reward (see Fig. 4 (Right)).” (Section 1, p. 3). Inference: 131/2.5M is approximately 0.0052%; its denominator is sampled proofs, whereas the 47% figure counts conjectures.

## technique 4: preserve topical diversity with Wasserstein reweighting

what it is: prevent the conjecturer from collapsing to one kind of goal by choosing a distribution over selected conjectures that minimizes Wasserstein distance to the uniform distribution over unproved statements. The matching cost is negative cosine similarity between model embeddings (Section 3.2, p. 6). The intended effect is to preserve multiple topics such as algebra, number theory, and calculus.

when to use it: Inference: use this when reward selection favors a narrow family of easy or highly represented proofs.

how to apply it:

1. define the selected conjecture set after pass-rate and elegance filtering (Section 3.2, p. 6)
2. define target distribution Q as uniform over unproved source statements (Section 3.2, p. 6)
3. embed conjectures and statements with the current model and set matching cost to negative cosine similarity (Section 3.2, p. 6)
4. solve for distribution P over selected conjectures minimizing Wasserstein distance to Q (Section 3.2, p. 6)
5. train the conjecturer with the resulting weights; the practical algorithm limits large weights and permits nonuniform matching weights for source statements (Section 3.2, p. 6; Appendix A.5, pp. 20–21)

Verus form:

evidence and limits: the paper reports better scaling and dense conjecture signals in the Isabelle ablation, but does not provide a standalone ablation removing Wasserstein reweighting. Inference: topic preservation depends on representation quality. Appendix A.5 specifies sequence-averaged last-layer embeddings and increases miniF2F-valid and ProofNet-valid matching weights from 1 to 128 after the first 24 Lean iterations (pp. 19–20).

## technique 5: train the prover on hard correct proofs with replay and length/time penalties

what it is: keep correct proofs for statements or conjectures with empirical pass rate below 1/2, deduplicate by exact match, and train from a replay buffer containing the last three iterations (Section 3.2, p. 6). Weighted cross entropy is reciprocal to the number of verified proofs for each target. A length penalty γ^L favors shorter proofs; Lean additionally uses a verification-time penalty β^T. The reported factors are γ=exp(-0.001) and β=exp(-0.01) (Section 4.1, p. 7).

when to use it: Inference: use this when easy proofs would dominate the training set and when replay is needed to avoid forgetting.

how to apply it:

1. retain only correct proofs whose target pass rate is below 1/2 and deduplicate exact matches (Section 3.2, p. 6)
2. place selected proofs from the latest three iterations in the replay buffer (Section 3.2, p. 6)
3. weight examples inversely to the number of verified proofs for their target (Section 3.2, p. 6)
4. optimize weighted cross entropy with length and, for Lean, verifier-time penalties (Section 3.2, p. 6)
5. periodically refresh from the base model on previously generated correct proofs, following a procedure similar to final retraining, and reset the buffer (Section 4.1, p. 7)

Verus form: Inference: weight verified proof examples by target difficulty, penalize oversized Rust proof blocks only after measuring readability and verifier cost, and retain recent proof data in a bounded replay buffer. Refresh from a pinned base checkpoint to reduce catastrophic forgetting.

evidence and limits: the paper reports 28.5% cumulative LeanWorkbook pass rate and improved held-out pass@3200, but those outcomes combine all STP components (Sections 4.2 and Table 1, pp. 7–9). The Lean verifier timeout is 200 seconds with a 15 GB memory limit; Isabelle uses 10 seconds per step and 360 seconds per proof (Section 4.1, p. 7). Inference: timing penalties are system-specific.

## technique 6: final retraining and evaluation with verified proofs

what it is: after self-play, retrain a fresh model from the pre-SFT base on the original SFT data plus all correct generated proofs whose target pass rate is at most 1/4, retaining at most 16 distinct proofs per target (Section 3.3, p. 6). Evaluate with independent samples and count only proofs accepted by the formal verifier.

when to use it: Inference: use this to stabilize a model trained on a moving distribution and to avoid carrying transient self-play artifacts into deployment.

how to apply it:

1. collect every correct generated proof with target pass rate ≤1/4 (Section 3.3, p. 6)
2. retain at most 16 distinct proofs for each statement or conjecture (Section 3.3, p. 6)
3. restart from the base pre-SFT checkpoint and combine original SFT and self-play proof data (Section 3.3, p. 6)
4. periodically repeat refresh during long runs, resetting replay after each refresh (Section 4.1, p. 7)
5. sample k independent proofs at inference and count a target solved only when at least one proof verifies (Sections 4.2–4.3, pp. 7–9)

Verus form: Inference: deploy a separately retrained model only after compiling every retained Rust proof with the target Verus version. Report pass@k with the benchmark denominator and keep generated source for audit.

evidence and limits: Table 1 reports miniF2F-test pass@3200 of 65.0% ± 0.5% and ProofNet-test pass@3200 of 23.9% ± 0.6% (p. 8). PutnamBench is 8/644 at 3,200 samples (Section 4.2, p. 9; Table 3, p. 23). The paper does not isolate final retraining alone. Its retraining ablation compares inclusion versus omission of generated conjectures: miniF2F-test pass@128 is 61.2% ± 0.6% versus 58.3% ± 0.7%, and ProofNet-test is 19.5% ± 0.7% versus 17.4% ± 0.4% (Table 2, p. 22).

## techniques for the catalog

- dual-role self-play — train a conjecturer and prover from each other's verifier-filtered outputs
- supervised role initialization — teach proof syntax and lemma-conditioned conjecturing from library data
- barely-provable reward — select correct conjectures with empirical pass rate in (0, 1/4]
- diversity reweighting — match selected-goal embeddings to the distribution of outstanding tasks
- hard-proof replay — train on difficult verified proofs with inverse-count, length, and time weights
- final retraining with verified proofs — refresh from a base model and count only verifier-accepted proofs
