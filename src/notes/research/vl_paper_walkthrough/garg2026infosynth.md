# InfoSynth: Information-Guided Benchmark Synthesis for LLMs
(authored by agents unless marked 🧑)
Tag: `garg2026infosynth`, [paper](https://arxiv.org/abs/2601.00575)

## purpose and result
InfoSynth generates Python coding benchmarks whose problems are meant to be novel, diverse, executable, and difficult. The abstract calls it “a scalable, self-verifying pipeline for constructing high-quality, challenging coding benchmarks for LLMs.” (Abstract, p. 1). It combines information-theoretic novelty/diversity metrics (§3, pp. 2–3), genetic mutation and crossover with k-farthest-neighbor filtering (§4.1, pp. 4–5), executable solution/test feedback (§4.1, p. 4), MinHash deduplication, and postprocessing (§4.1, p. 5). Six generated Python datasets have initial sizes of 991–1007 problems (Table 1, p. 6). Table 1 reports human-verified correctness of 96–98% and test coverage of 99–100% for the six datasets (p. 6). The paper says that for each benchmark it samples 100 problems and manually verifies solutions and tests (§5, p. 5), so these are sample-based figures. The abstract says the method “generates accurate test cases and solutions to new problems 97% of the time” (Abstract, p. 1). Table 3 (§5.7, p. 8) reports test-taker pass rates on InfoSynth of 42.33–49.08% for four models, against 51.00–80.00% on KodCode, GeneticInstruct, AutoCodeBench, and OpenCodeInstruct (lower means harder). The paper notes that the AutoCodeBench and OpenCodeInstruct pass rates "partly reflect quality issues" (§5.7, p. 8).

## technique 1: information-guided novelty and diversity measurement

### what and when
Estimate how different a candidate benchmark is from a seed dataset, and how spread out it is, without running test-takers. The paper embeds problem statements in R^768 with `all-mpnet-base-v2`, projects with UMAP, renormalizes so distances correspond to cosine similarity, and applies a k-NN KL-divergence estimator (novelty, Wang et al. 2009) and the Kozachenko-Leonenko k-NN estimator (diversity, differential entropy) (§3.1–3.2, pp. 2–3). It recommends k≈4 for KL, k/N in [0.02, 0.04] for entropy, and projection dimension d in [8, 12] (§3.3, p. 3).

### procedure from the paper
1. Embed every problem statement; any datasets to be compared must share a single UMAP call so relative geometry is preserved (§3.2, p. 3).
2. Novelty of Y given X is KL(q‖p) estimated from k-NN distances (Eq. 1, 3); diversity is the differential entropy estimated by Eq. 4 (§3.1, pp. 2–3).
3. Entropy estimates shrink as dataset size grows, so the paper samples N points per dataset without replacement many times and averages (§3.2.2, p. 3: N=150 over 250 trials, k=4 for Leetcode vs. MBPP; N=800 over 250 trials, k=21 for Codeforces). UMAP uses 80 neighbors and min-distance 0.1; the novelty validation uses 10 runs and k=4 (§3.2, p. 3).
4. Validation: Figure 1 (novelty) and Figure 2 (entropy), with 95% confidence intervals, show datasets expected to be more novel or diverse score higher (§3.2, p. 4). Appendix A reports ablations over k, UMAP n_neighbors, and min_dist (Appendix A, Figure 6, p. 12), and Appendix B tests other embedding models (Figure 7, p. 14).
5. The paper uses these metrics to compare generated datasets with their seeds (§5.1, Figure 4, pp. 5–7). The pipeline's own filter is the cosine-similarity k-farthest-neighbor selection of technique 2, not these estimators.

### Verus form
Inference: use this as an off-chain corpus-analysis metric. A Verus harness can verify that each candidate has a bounded embedding record and that a stored threshold is respected, but it cannot prove that neural embeddings represent semantic novelty. The metric is a ranking heuristic, not a correctness proof.

### evidence and limits
The authors say the metrics “should be interpreted as stable surrogate measures for relative comparison rather than absolute Shannon entropy or KL-divergence in the original space.” (§7 Limitations, p. 9). They add: “While we do not have formal theoretical guarantees, we observe empirically that rankings induced by these metrics remain stable across embedding choices and hyperparameter settings” (§7, p. 9). The KL estimator can go negative even though KL is nonnegative; the authors say this does not occur in useful comparisons (§3.2.1, p. 3). On trade-offs: the paper says k-farthest-neighbor filtering and postprocessing improve novelty and diversity but yield easier problems (§5.1, p. 7), and that highly novel datasets "concentrate around low-density regions in the seed-embedding distribution, which increases novelty but reduces diversity" (§5.1, p. 7). The paper's Figure 4c/4d captions say the Guided (filtered) datasets show higher diversity but reduced novelty relative to the -New datasets, which sits uneasily with the text's claim that filtering improves both; the paper does not reconcile the two.

## technique 2: mutation, crossover, and k-farthest-neighbor filtering

### what and when
Generate new tasks from seed tasks while controlling difficulty and avoiding near duplicates. The mutation “modifies an existing problem in three difficulty variations: easier, equally difficult, and harder” (§4.1, p. 4); crossover prompts combine existing questions into new ones (§4.1, p. 4). The paper compares runs with and without k-farthest-neighbor selection (§4.2, p. 5).

### procedure from the paper
1. Each colony samples a seed batch (size Bs) from the seed data. In each iteration the operation is mutation or crossover with probability 0.5 each (Algorithm 1, Appendix C, p. 12).
2. Mutation: produce easy, medium, and hard variants and, with k-farthest-neighbor selection enabled, retain “the two of three with lowest similarity to the seed and generated set” (§4.1, p. 4).
3. Crossover: “we likewise generate three problems and keep the two least similar to the dataset” (§4.1, p. 4). Appendix C lists a per-crossover problem count C of 1–3 and a crossover batch size Bc of 4–5 (Appendix C, p. 12); the paper does not explain how C relates to the three problems in the §4.1 text.
4. Deduplicate with MinHash + LSH, 250 permutations and a 0.75 similarity threshold (§4.1, p. 5). Figure 3 shows deduplication within each colony (p. 5).
5. Problems that fail self-verification are excluded from the final dataset but still serve as seeds for the next round (§4.1, p. 5). Colony outputs are merged and deduplicated into the final dataset (Figure 3, p. 5; Algorithm 1, p. 12).

### Verus form
Inference: represent each generated task and its tags in a Rust record; prove that the deduplication result contains no pair above the chosen similarity threshold only if similarity is a trusted, deterministic function. The semantic validity of a mutation still requires executable tests and independent review.

### evidence and limits
The datasets use 10 colonies and 3 iterations (the Guided datasets) or 5 iterations (the -New and -Hard datasets); exact N, Bs, C, Bc, and Nit are in Appendix C (p. 12). On MBPP, hard-only mutation gives scores 8%-15% lower than MBPP-Original across most models, with “reduced diversity and novelty as the problems tend to be concentrated around fewer, but more challenging topics” (§5.2, p. 7). Inference: genetic generation alone does not establish correctness; the paper relies on technique 3 for that.

## technique 3: iterative executable code feedback

### what and when
Self-verify each generated problem by generating a solution and tests, executing them in isolation, and feeding the results back to the model. Use this when a benchmark item has an executable oracle and a judge model would be unreliable. The introduction says a judge LLM “may not reliably solve the generated problems” (§1, p. 1).

### procedure from the paper
1. For each new problem, the model generates a Python solution and test cases (§4.1, p. 4; prompts in Appendix F.3, F.4).
2. Candidate solutions are executed in an isolated environment (§4.1, p. 4).
3. The model refines solution and tests until all tests pass or a maximum number of iterations is reached; the entire feedback history is fed in at each step (§4.1, pp. 4–5; Algorithm 1, p. 12).
4. Problems failing self-verification are excluded from the final dataset but still serve as seeds for the next generation round (§4.1, p. 5).
5. Passing solution-test pairs increase by 20% over 5 feedback iterations, and “Three iterations are typically ideal; further iterations yield marginal gains not worth the extra inference cost.” (§5.3, p. 7; Appendix D, p. 12: “more than 3 feedback iterations provide minimal gains in pass rate”).

The paper states: “Candidate solutions are executed in an isolated environment, and the results are fed back to the model, which iteratively refines its solution and tests until all tests pass or a maximum number of iterations is reached.” (§4.1, p. 4).

### Verus form
Inference: for Verus tasks, compile and verify candidate Rust against a fixed harness after each edit. Accept an item only when `verus` succeeds and independent tests exercise the intended behavior. Store the verifier output as evidence, while protecting the specification and test harness from the model; otherwise the model could change the property instead of fixing code. The paper's loop lets the model modify both tests and solution, which is the weakness this protection addresses.

### evidence and limits
Table 1 reports human-correct percentages of 96–98% and coverage of 99–100% for the six datasets (p. 6), from 100 sampled problems per benchmark (§5, p. 5). Table 1 also reports 163–570 filtered problems per dataset. Postprocessing gives 5–15% accuracy gains across most test-taker models, and manual verification of 100 problems per dataset finds 100% correctly reformatted without altering the core question (§5.5, p. 7). These are sampled checks, not proof of every generated item. The limitations section says a significant fraction of candidate problems fail self-verification and that “InfoSynth is biased toward short-horizon reasoning problems” because of its filtration step (§7, p. 9). Appendix E says the most frequently filtered problems are deep crossover compositions and numerically sensitive problems, and notes failure modes such as correct solutions paired with wrong test outputs (Appendix E, p. 12).

## technique 4: ambiguity postprocessing

### what and when
Rewrite a generated problem so edge cases in the statement match its tests. The paper's example of an omission: “should we return None or -1 on an empty array input?” (§4.1, p. 5).

### procedure from the paper
1. For each problem-test pair, the model is prompted to rephrase the question to incorporate details on handling obscure edge-cases (§4.1, p. 5; prompt in Appendix F.5). The prompt tells the model to output only the rewritten problem and not include test cases.
2. The paper reports no automatic acceptance rule for the rewrite. It reports a manual check of 100 problems per dataset, finding 100% correctly reformatted without altering the core question (§5.5, p. 7). It also reports 5–15% accuracy gains across most models, which it reads as post-processing reducing ambiguity (§5.5, p. 7).
3. Table 2 reports results on postprocessed versions only, because MBPP contains vague/misleading problems (§5, p. 5).

### Verus form
Inference: treat the specification as immutable input and permit only documentation edits that preserve the verified postconditions. A Verus proof can show equivalence of a machine-readable contract before and after rewriting; prose equivalence itself remains a human judgment.

## what is proved, trusted, and relevant to VL
The paper measures executable pass/fail, human correctness samples, test coverage, novelty/diversity surrogates, and test-taker pass rates. It states it has no formal theoretical guarantees for the metrics (§7, p. 9). It does not formally prove that generated statements capture the intended task or that tests are complete; this is an inference from the absence of such a claim. Inference: trusted components include the generator LLM (GPT-4o, §4.2, p. 5), the Python sandbox, the test-generation prompts, the MinHash/LSH implementation, UMAP and the embedding model, and the manual reviewers. Inference: InfoSynth offers VL a way to generate varied Verus tasks, but every item needs a fixed specification, verifier run, and adversarial test review. VL should reuse executable feedback and filtering, while treating model-written specifications and tests as untrusted until independently checked.

## techniques for the catalog
- information-guided measurement — compare benchmark candidates with seeds using embedding-based novelty and entropy estimates
- evolutionary task generation — mutate or cross over seeds, then keep distant candidates and deduplicate with MinHash/LSH
- executable feedback loop — run generated solutions and tests, feed failures back, and discard items that never verify
- specification postprocessing — rewrite ambiguous statements to match edge-case behavior while preserving the tested contract
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Importantly, we observe that higher rejection rates correlate with increased final benchmark difficulty, suggesting the filtering step is not merely discarding noise but actively shaping a more challenging problem distribution."): read the whole paper text and the study; checked every quotation, number, technique step, and section/page reference against the 22-page arXiv v2 PDF; changed all page references (the earlier ones pointed to nonexistent pages 10–23), moved the metric caveats from the Conclusion to §7 Limitations, corrected the crossover step (three problems, keep two), the colony step (sampled, not partitioned), the information-guided step (metrics are analysis, the pipeline filter is cosine k-farthest), the postprocessing acceptance step (manual check only), added Table 3 and the unreconciled novelty/diversity caption conflict, and marked trusted-component claims as Inference. Did not check: cited papers, the prompts and worked examples in Appendices F–J beyond skimming, the figure curves, the project page, or the paper's released code and data.
