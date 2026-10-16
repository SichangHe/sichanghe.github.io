# LLM-as-a-Verifier: A General-Purpose Verification Framework
(authored by agents unless marked 🧑)
Tag: `kwok2026llmverifier`, [paper](http://arxiv.org/abs/2607.05391v2)

## core method

LLM-as-a-Verifier turns a language model's scoring-token probabilities into a continuous reward for each candidate trajectory. The paper's prompt asks for two candidates and integer scores in `<score_A>` and `<score_B>` tags, but it keeps the full logit distribution instead of selecting only the most likely token. It defines the reward as the average expected score over C criteria, K repeated evaluations, and G ordered score tokens: “Rather than collapsing each distribution to a single discrete score, we approximate the reward of a trajectory as:” followed by Eq. 3.1 (section 3.2, p. 5). The reward is normalized to [0,1] and converted to a pairwise preference with a Bradley–Terry logistic model (Eq. 3.2).

The framework names its central distinction: “By definition, a judge is one who forms an overall opinion and assigns a decision, whereas a verifier is one who confirms the truth or correctness of something and requires more detailed evaluations.” (section 3.2, p. 5) Use this when a generator can produce several candidate solutions and a verifier must rank them with a limited budget. The method is training-free and uses the same protocol across coding, robotics, and medical tasks. The authors summarize the motivation: “This probabilistic formulation substantially reduces tie rates when comparing complex solutions and enables verification to scale along multiple dimensions: (1) score granularity, (2) repeated evaluation, and (3) criteria decomposition.” (abstract, p. 1)

## technique 1: score-token expectation instead of a discrete judge

how to do it

1. Choose ordered score tokens Vscore and a scalar mapping φ; the paper's template uses a 1–20 correctness scale (section 3.2, p. 5).
2. Prompt the model with task x, criterion c, and trajectories A/B, requiring tagged scores (section 3.2, p. 5).
3. Extract conditional probabilities for each score token from the model's logits.
4. Compute the mean expected score over C criteria and K evaluations, normalize it, and compare candidates with Eq. 3.2.
5. Prefer the candidate with the larger probability or normalized aggregate score.

The paper's Terminal-Bench pairwise evaluation uses 200 randomly sampled trajectories. Accuracy rises from 73.1% at G=1 to 77.5% at G=20; SNR rises from 0.775 to 0.799 (section 4.1, pp. 7–8). In a 100-run query-optimize case, the discrete 1–5 judge ties 88/100 times; continuous G=5 ranks correctly 69/100, and G=20 ranks correctly 77/100 (Table 2, p. 8). These denominators are repeated evaluations of one trajectory pair, not benchmark tasks.

Verus form

Inference: Ask a Verus-aware model to score candidate Rust proofs or repair patches using ordered tokens such as fail, weak, plausible, and verified, then use expected scores to rank candidates. The model's score cannot establish a proof; run `verus` on the selected candidate and retain the verifier result as the acceptance signal. If logits are unavailable, use the paper's two-stage workaround (appendix B.6), but treat its calibration as an empirical question.

## technique 2: repeated evaluation and criteria decomposition

Repeated evaluation averages K independent rewards, reducing variance as O(1/K) while leaving bias unchanged (section 4.2, p. 9). On Terminal-Bench, pairwise accuracy rises from 74.7% at K=1 to 77.5% at K=16; gains diminish because correlated hard-example bias remains. Criteria decomposition replaces one monolithic correctness question with Specification, Output, and Errors for code-agent trajectories. Each criterion is scored separately and expected rewards are averaged. A single criterion reaches 75.2–76.4%; the three-criterion ensemble reaches 78.3% on the 200-trajectory Terminal-Bench evaluation (section 4.3, p. 9).

Inference: For Verus, separate criteria for contract satisfaction, compilation/checker success, and absence of unsafe or external assumptions. Repeat scoring with independent prompt order or sampling, but preserve a fixed denominator and report verifier failures. Criteria cannot repair an incorrect specification; they only reduce judgment noise.

## technique 3: probabilistic pivot tournament under a budget

A full round robin over N candidates costs O(N²) comparisons. The paper's Probabilistic Pivot Tournament (PPT) reduces this to O(Nk), k much smaller than N (section 3.2, pp. 6–7):

1. Sample a uniformly random Hamiltonian cycle and score its N adjacent pairs; every candidate appears once in each prompt slot, canceling positional bias.
2. Rank candidates by ring-pass mean preference and choose the top k as pivots.
3. Score every non-pivot against every pivot and every pivot pair.
4. Aggregate win masses and counts, normalize by each candidate's comparison count, and return the highest normalized score.

The paper curates 20 trajectories per task and reports a budget–accuracy tradeoff in Table 9 (section 3.2, p. 7). The selection algorithm assumes pairwise scores are meaningful and that top ring-pass candidates are plausible leaders; it does not prove that the selected trajectory is correct.

Verus form

Inference: Generate N candidate Verus patches, ring-score them, then spend checker or model budget on k pivots. Always run the actual Verus checker on the final selected candidate; a model tournament can prioritize candidates but cannot substitute for proof checking. A cheap first pass may use compile errors and failed obligations as criteria, while full verification is reserved for finalists.

## evidence across domains and what remains trusted

With G=20, K=8, and three criteria, the framework reports 86.5% on Terminal-Bench V2 (N=5 candidates; Pass@1 83.1%, oracle 92.1%), 78.2% on SWE-Bench Verified (N=3; Pass@1 76.1%, oracle 84.4%), and 73.3% on MedAgentBench (Table 3, p. 10). RoboRewardBench uses 500 randomly sampled trajectory pairs; the VLM verifier reaches 87.4% preference accuracy versus 70.8% for a discrete judge and MAE 0.72 versus 1.11 against human labels (section 5.3, pp. 11–12). These are benchmark-specific denominators and models.

The framework also supplies progress scores and dense RL rewards. On 500 Terminal-Bench trajectories, Spearman value-order correlation is 0.848 for successful and 0.769 for failed trajectories (Table 6, p. 13). In LIBERO, verifier rewards let DSRL-SAC reach a matched success rate with approximately 1.8× fewer environment steps; GRPO reasoning rewards give approximately 1.1× sample-efficiency improvement on MATH (section 7, pp. 14–15).

The paper's limitations include requiring scoring-token logits for the main method, possible bias from hand-designed criteria, and experiments limited to single-turn RL; it also notes that score scaling does not add information to the trajectory. All empirical gains rely on the chosen verifier model, prompts, candidate pools, and benchmark labels. Inference: VL should use this as candidate ranking and progress telemetry around Verus, while treating the checker, compiler, specifications, libraries, and environment assumptions as trusted boundaries.

## techniques for the catalog

- score-token expectation — average the model's probability-weighted ordered scores instead of an argmax judge
- repeated verification — average independent evaluations to reduce variance while reporting the unchanged bias
- criteria decomposition — score specification, output, and error criteria separately and ensemble them
- probabilistic pivot tournament — use a ring pass and k pivots to reduce N-candidate comparisons from quadratic to O(Nk)
- checker-gated ranking — use model scores for triage but require the formal checker for acceptance

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
