# STP: Self-play LLM Theorem Provers with Iterative Conjecturing and Proving
(authored by agents unless marked 🧑)
Tag: `dong2025stp`, [paper](https://www.semanticscholar.org/paper/f9e701ac5d025581f519eae1216e26475e56462b)

## what the paper does and measures

Self-play Theorem Prover (STP) trains one language model in two roles: a conjecturer generates related formal statements and a prover attempts to prove them. Correct proofs train the prover; conjectures that are correct, elegant, relevant, and difficult but still approachable train the conjecturer (Abstract and Sections 1, 3, pp. 1–6). The paper's central claim is data-efficient self-improvement: “The conjecturer is trained iteratively on previously generated conjectures that are barely provable by the current prover.” (Abstract, p. 1).

The Lean run uses 48 iterations, 3.6 million generated conjectures, 241 million generated proofs, and 51.3 billion generated tokens (Section 4.2, p. 7). On LeanWorkbook, STP's cumulative pass rate reaches 28.5% of statements, compared with 13.2% for the prior expert-iteration result (Abstract and Section 4.2, pp. 1, 7). The denominator is the LeanWorkbook statement set; the paper notes that some statements are unprovable. Manual review of 20 randomly selected unproved statements found 16 accurate translations and only 7 provable statements, yielding a 95% confidence interval of 38.7%–68.5% for the best possible pass rate (Section 4.2, p. 7).

On held-out benchmarks, the final STP model obtains 65.0% miniF2F-test pass@3200, 23.9% ProofNet-test pass@3200, and 8/644 PutnamBench problems at 3,200 samples (Abstract, pp. 1–2; Table 1 and Section 4.2, pp. 8–9). Pass@k means the percentage of statements for which at least one of k independent proofs verifies; the denominators are the benchmark sizes, with PutnamBench explicitly 644. The Isabelle study disables expensive tactics and uses different timeouts, so its results are not directly interchangeable with Lean (Section 4.1, p. 7).

The formal verifier checks accepted Lean or Isabelle proofs. Model training, conjecture quality, benchmark correctness, translation quality, reward filters, and the theorem specifications remain trusted. Inference: for VL, STP is a training strategy rather than a proof certificate; Verus must verify every generated Rust proof.

## technique 1: initialize prover and conjecturer with supervised proof data

what it is: fine-tune a generic language model on proof-library statement–proof pairs for the prover, and on lemma–seed-theorem–proof–conjecture tuples for the conjecturer (Section 3.1, pp. 4–5). The conjecturer receives a lemma used by the seed proof so its output is related by a concrete proof idea.

when to use it: use this when a model needs both syntax competence and a mechanism for proposing nearby but novel goals. The paper describes the design as: “We design the Self-play Theorem Prover (STP) that simultaneously takes on two roles, conjecturer and prover, each providing training signals to the other.” (Section 1, p. 2). It also states: “We evaluate STP with both Lean and Isabelle formal versifiers.” (Abstract, p. 1).

how to apply it:
1. extract statement/proof pairs and train next-token loss only on the proof for the prover (Section 3.1, p. 4)
2. extract tuples where a lemma is used in the proofs of two ordered theorems in one file (Section 3.1, p. 5)
3. train the conjecturer on a system prompt, lemma, seed statement and proof, with the later theorem as target (Section 3.1, p. 5)
4. optionally use a trivial lemma to broaden conjecture generation (Section 3.1, p. 5)

Verus form: Inference: build prover examples from Rust/Verus functions and verified `proof fn`s, and conjecturer examples from a lemma, a seed contract, and a related verified contract. Keep training loss on generated proof text while treating specifications as input. The model's output remains untrusted until Verus compiles it.

evidence and limits: Lean uses DeepSeek-Prover-V1.5-SFT as its base, while Isabelle starts from Llemma-7b (Sections 4.2–4.3, pp. 7–9). The paper does not isolate the contribution of each SFT source through a full ablation.

## technique 2: generate related conjectures and proofs under equal compute

what it is: each iteration extracts seed lemmas from existing generated proofs, de-duplicates by seed statement and lemma, generates conjectures, and samples K independent proofs for both conjectures and unproved dataset statements (Section 3.2, pp. 5–6). The number of generated conjectures is capped at the number of remaining unproved statements, splitting prover compute equally.

when to use it: use this when fixed theorem data produces sparse successful proofs and a curriculum of nearby goals can provide denser feedback.

how to apply it:
1. collect seed inputs from statements with existing generated proofs and extract a used lemma through the verifier (Section 3.2, p. 5)
2. remove duplicate seed/lemma inputs and overrepresented lemmas (Section 3.2, p. 5)
3. generate conjectures and randomly retain no more than the count of unproved source statements (Section 3.2, p. 5)
4. combine retained conjectures with unproved statements and sample K proofs independently for each; STP uses K=32 (Sections 3.2 and 4.1, pp. 5, 7)
5. verify every proof and carry correctness, lemma usage, and timing metadata forward (Sections 3.2 and 4.1, pp. 5, 7)

Verus form: Inference: seed conjectures from verified Rust lemmas and contracts, generate related obligations, and allocate a fixed compile budget between source obligations and generated ones. Use Verus diagnostics as the correctness oracle; do not train on unverified proof text as if it were a successful example.

evidence and limits: STP generated 241M proofs and 3.6M conjectures in Lean, a 64:1 proof-to-conjecture ratio (Section 4.2, p. 7). This large compute run is evidence of scale, not evidence that the same ratio is optimal for Verus.

## technique 3: select barely provable conjectures with explicit rewards

what it is: estimate each conjecture's empirical pass rate from K samples, retain correct proofs whose pass rate lies in (0, 1/4], require that the seed lemma is used, remove duplicate conjectures, and apply an elegance filter based on proof length divided by conjecture length (Section 3.2, pp. 5–6). The paper gives the exact selection rule: “To decide whether a conjecture c is challenging, we use the (empirical) pass rate of the prover estimated by the K independently generated proofs:” (Section 3.2, p. 5).

when to use it: use this to target goals that are hard enough to teach new skills but not so hard that almost all samples fail.

how to apply it:
1. form records containing seed theorem, seed proof, used lemma, conjecture, and generated proof (Section 3.2, p. 5)
2. compute pass rate as correct verified proofs divided by all sampled proofs for that conjecture (Section 3.2, p. 5)
3. retain only correct proofs with pass rate in (0, 1/4] and with the seed lemma used in the proof (Section 3.2, p. 6)
4. discard conjectures whose minimum-proof-length/conjecture-length ratio is in the lowest 20% of the remaining examples (Section 3.2, p. 6)
5. remove duplicate conjectures and use the selected records as conjecturer training data (Section 3.2, p. 6)

Verus form: Inference: estimate difficulty from verified Rust proof samples, select obligations with a small positive success rate, and require dependency evidence that the intended lemma was used. Replace textual proof-length heuristics with a documented metric over Rust proof blocks and verifier time.

evidence and limits: in the Isabelle ablation, at a checkpoint where the dataset pass rate is 11.4%, only 131 of 2.5 million generated proofs for 79,000 unproved statements are correct, whereas at least 47% of STP conjectures are successfully proved (Section 4.3 and Figure 4, pp. 9–10). The 131/2.5M fraction is approximately 0.0052%; the paper uses it to explain sparse rewards. The 47% denominator is generated conjectures in that checkpoint, not all dataset statements.

## technique 4: preserve topical diversity with Wasserstein reweighting

what it is: prevent the conjecturer from collapsing to one kind of goal by choosing a distribution over selected conjectures that minimizes Wasserstein distance to the uniform distribution over unproved statements. Similarity is negative cosine distance between model embeddings (Section 3.2, p. 6). This preserves multiple topic modes such as algebra, number theory, and calculus.

when to use it: use this when reward selection favors a narrow family of easy or highly represented proofs.

how to apply it:
1. define the selected conjecture set after pass-rate and elegance filtering (Section 3.2, p. 6)
2. define target distribution Q as uniform over unproved source statements (Section 3.2, p. 6)
3. embed conjectures and statements with the current model and set matching cost to negative cosine similarity (Section 3.2, p. 6)
4. solve for distribution P over selected conjectures minimizing Wasserstein distance to Q (Section 3.2, p. 6)
5. train the conjecturer with P rather than raw selected counts (Section 3.2, p. 6)

Verus form: Inference: compute embeddings of Rust contracts or proof-obligation descriptors and reweight selected examples toward the topic distribution of outstanding VL tasks. This controls training coverage; it does not prove semantic similarity or correctness.

evidence and limits: the paper reports better scaling and dense conjecture signals in the Isabelle ablation, but does not provide a standalone ablation removing Wasserstein reweighting. Its distance is model-embedding similarity, so topic preservation depends on representation quality.

## technique 5: train the prover on hard correct proofs with replay and length/time penalties

what it is: keep correct proofs for statements or conjectures with empirical pass rate below 1/2, deduplicate by exact match, and train from a replay buffer containing the last three iterations (Section 3.2, p. 6). Weighted cross entropy is reciprocal to the number of verified proofs for each target. A length penalty γL favors shorter proofs; Lean additionally uses a verification-time penalty βT. The reported factors are γ=exp(-0.001) and β=exp(-0.01) (Section 4.1, p. 7).

when to use it: use this when easy proofs would dominate the training set and when replay is needed to avoid forgetting.

how to apply it:
1. retain only correct proofs whose target pass rate is below 1/2 and deduplicate exact matches (Section 3.2, p. 6)
2. place selected proofs from the latest three iterations in the replay buffer (Section 3.2, p. 6)
3. weight examples inversely to the number of verified proofs for their target (Section 3.2, p. 6)
4. optimize weighted cross entropy with length and, for Lean, verifier-time penalties (Section 3.2, p. 6)
5. periodically refresh from the base model on all accumulated correct proofs and reset the buffer (Section 4.1, p. 7)

Verus form: Inference: weight verified proof examples by target difficulty, penalize oversized Rust proof blocks only after measuring readability and verifier cost, and retain recent proof data in a bounded replay buffer. Refresh from a pinned base checkpoint to reduce catastrophic forgetting.

evidence and limits: the paper reports 28.5% cumulative LeanWorkbook pass rate and improved held-out pass@3200, but those outcomes combine all STP components (Sections 4.2 and Table 1, pp. 7–9). The Lean verifier timeout is 200 seconds with a 15 GB memory limit; Isabelle uses 10 seconds per step and 360 seconds per proof (Section 4.1, p. 7), so timing penalties are system-specific.

## technique 6: final retraining and verifier-gated evaluation

what it is: after self-play, retrain a fresh model from the pre-SFT base on the original SFT data plus all correct generated proofs whose target pass rate is at most 1/4, retaining at most 16 distinct proofs per target (Section 3.3, p. 6). Evaluate with independent samples and count only proofs accepted by the formal verifier.

when to use it: use this to stabilize a model trained on a moving distribution and to avoid carrying transient self-play artifacts into deployment.

how to apply it:
1. collect every correct generated proof with target pass rate ≤1/4 (Section 3.3, p. 6)
2. retain at most 16 distinct proofs for each statement or conjecture (Section 3.3, p. 6)
3. restart from the base pre-SFT checkpoint and combine original SFT and self-play proof data (Section 3.3, p. 6)
4. periodically repeat refresh during long runs, resetting replay after each refresh (Section 4.1, p. 7)
5. sample k independent proofs at inference and count a target solved only when at least one proof verifies (Sections 4.2–4.3, pp. 7–9)

Verus form: Inference: deploy a separately retrained model only after compiling every retained Rust proof with the target Verus version. Report pass@k with the benchmark denominator and keep generated source for audit.

evidence and limits: STP reaches 65.0% (65/100 implied by the percentage) miniF2F-test pass@3200 and 23.9% ProofNet-test pass@3200 in Table 1; uncertainty intervals are shown for lower sample budgets and the exact benchmark sizes are those named in the table. PutnamBench is 8/644 at 3,200 samples (Section 4.2, p. 9). The paper does not show that final retraining alone causes these gains; its ablation reports an additional 2–3 percentage-point pass@128 benefit from including generated conjectures (Section 4.4, p. 10).

## what remains trusted and what VL should take

STP's verifier filters make proof correctness observable, but conjecture translation, statement validity, reward design, model training, embedding similarity, and benchmark denominators remain assumptions. The paper's own LeanWorkbook audit found 13/20 sampled statements unprovable, so cumulative pass rate cannot be interpreted as model failure alone (Section 4.2, p. 7). Inference: VL should maintain a clean separation between generated training tasks and product obligations, and should reject any Rust proof not accepted by Verus under a pinned environment.

Existing expert iteration, formal conjecturing, and self-play baselines are explicitly compared; VL should reuse their lessons rather than redo a generic Lean training pipeline. Inference: the threat to agent-written verified Rust is primarily specification and data quality: a model can learn to satisfy weak contracts or exploit generated obligations. Verus compilation reduces proof-level risk, while contract review, difficulty sampling, replay provenance, and denominator-aware evaluation address the remaining system risk.

## techniques for the catalog

- dual-role self-play — train a conjecturer and prover from each other's verifier-filtered outputs
- supervised role initialization — teach proof syntax and lemma-conditioned conjecturing from library data
- barely-provable reward — select correct conjectures with empirical pass rate in (0, 1/4]
- diversity reweighting — match selected-goal embeddings to the distribution of outstanding tasks
- hard-proof replay — train on difficult verified proofs with inverse-count, length, and time weights
- final verifier-gated retraining — refresh from a base model and count only independently verified proofs

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
