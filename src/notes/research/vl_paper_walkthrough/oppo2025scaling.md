# Scaling Test-time Compute for LLM Agents
(authored by agents unless marked 🧑)
Tag: `oppo2025scaling`, [paper](https://arxiv.org/abs/2506.12928) (arXiv:2506.12928v1 is printed on the paper's first page; the earlier link, a Zenodo DOI, is the paper's reference [18], the OpenManus software record, not this paper)

## purpose and result
This paper (OPPO AI Agent Team, June 2025) studies test-time scaling (TTS) for language agents: spend more inference computation by sampling, revising, verifying, merging, or diversifying rollouts. It evaluates parallel sampling, sequential reflection, verifier/merge choices, and heterogeneous rollout models. The abstract reports: “Among different verification and result merging approaches, the list-wise method performs best.” (Abstract, p. 1). All experiments use the GAIA validation set, which the paper says has “165 data samples across three different difficulty levels” (Section 3.3, p. 5). The baseline is the SmoLAgents framework reduced to a CodeAgent that calls tools directly, with GPT-4.1 as the base model for most experiments (Section 3.2, p. 4). The benchmark table (Table 1, p. 6) reports average, Level 1, Level 2, and Level 3 scores but its caption does not state the number of tasks.

## technique 1: parallel candidate search
Inference: Use this when a single agent trajectory is unreliable and extra inference budget can produce alternatives. The paper defines four strategies (Section 2.1, pp. 2–3):

- Best-of-N (BoN) samples N independent responses `{R1, ..., RN} = BoN(Q)` and selects the best answer with a verifying model
- step-wise BoN (BoN-wise) samples N responses at each step from the preceding thoughts and selects the best response as the thought at time t
- beam search generates N responses for each leaf node and keeps the K most suitable ones
- DVTS divides the search into K subtrees, each an independent beam search, to get more diverse search under the same computational budget

The experiments also include a "Tree search" variant (Sections 3.1 and 4.3, Table 4) that Section 2.1 does not define. Settings: sampling width 4, and beam size 2 for beam search and tree search (Section 3.1, p. 4).

Inference: a Verus wrapper can prove candidate-index bounds, beam-size limits, and that a selected result belongs to the candidate set. It cannot prove that the LLM verifier selected the semantically correct trajectory; that verifier is an external assumption. The paper's wording for beam search continues from the previous page: “Most promising partial solutions at each generation step. This algorithm prunes less promising candidates early in the generation process” (Section 2.1, p. 3).

## technique 2: threshold-triggered sequential reflection
Inference: Use this when reflection can correct errors but frequent interruption may damage a coherent trajectory. At time t, a reflection model summarizes prior thoughts, `Sum_t = RefM(T1,...,Tt−1)`. A verify model scores each step of the agent. The paper says that if and only if the model action score is less than the threshold, Sum_t is added into the LLM that generates the responses for time t (Section 2.2, p. 3).

Steps (the order of scoring and generation is Inference; the paper does not give an algorithm listing):

1. The verify model scores the agent's step.
2. If the score is below the threshold, summarize the previous thoughts with RefM and add the summary to the LLM input that generates the response at time t.
3. Otherwise generate without the summary.

The paper compares step-based reflection (every step) with score-based reflection at thresholds <8, <5, and <2, called frequent, moderate, and selective (Section 3.1, p. 4). The score scale is not stated. Table 2 (p. 7) reports: baseline 55.76, reflection at every step 55.15, threshold <8 53.33, <5 52.12, <2 56.36. The text of Section 4.2 gives 53.66 for <8, which disagrees with Table 2's 53.33. The text also says <2 is best “across all levels”, but in Table 2 the baseline is higher at Level 2 (58.14 vs 55.81) and every-step reflection ties at Level 1 (71.7). The table does not state the task count. Inference: implement the threshold and “summary included” state as a Rust enum and prove that reflection occurs exactly when the recorded score is below threshold; Verus does not establish score calibration or summary usefulness.

## technique 3: process verifiers and list-wise merging
Inference: Use this when candidates need comparison during generation or final aggregation. The scoring process reward model (PRM) uses an LLM as reward model to score each thought at step t. The list-wise PRM gives all N candidate actions to the LLM and asks it to select the optimal trajectory (Section 2.3, pp. 3–4). Result merging compares majority voting, direct scoring, and list-wise selection (Section 2.3, p. 4). Figure 2 (p. 5) shows a judge agent merging the answers of several rollouts.

Table 3 (p. 8) reports, for BoN, voting 56.8, scoring 59.39, and list-wise 63.03; for Beam-Search, 54.55, 53.94, and 56.97. The text of Section 4.3 also mentions Tree Search for the merge comparison, but Table 3 has no Tree-Search row. Table 4 (p. 8) reports list-wise over scoring as verifier for BoN-wise (58.79 vs 56.36), Beam-Search (56.97 vs 53.94), and Tree-Search (55.76 vs 50.91), on the same GAIA validation set. Inference: in Verus, prove that the selected index is in range and that a merge preserves candidate metadata; if a verifier emits a score, record the score and model identity as trusted input. A proof function is specification-time and cannot be called as runtime model inference.

## technique 4: diversify rollouts
Inference: Use this when independent candidates are too correlated. The paper notes that temperature and top_p are the usual way LLMs generate diverse candidates, and its own addition is to use different LLMs as rollout models, because models have different strengths such as coding or tool use (Section 2.4, p. 4). It also varies the sampling width (Figure 3, p. 8, widths 1, 2, and 4, BoN and BoN-wise) and measures pass@1, pass@2, and pass@4 for rollout models combined with GPT-4.1 (Section 4.4, pp. 8–9). Table 5 (p. 9): pass@1 GPT-4.1 55.76, Claude-3-5 42.42, Claude-3-7 50.30, Gemini-2.5-Pro 41.82. At pass@2, GPT-4.1 only scores 60.49 and the three GPT-4.1 plus one other pairs score 62.42 to 64.24. At pass@4, GPT-4.1 only scores 69.14 and the four-model mix scores 74.55 (the only pass@4 mix reported). The paper does not say how pass@K is computed from the 165 tasks. Inference: some Table 5 sub-scores for “GPT-4.1 only” (for example Level 1 70.59 and 82.35) are not multiples of 1/53, so the denominators for those rows are unclear. Inference: Verus can prove rollout quotas and uniqueness of model identifiers, but diversity and pass@K correctness remain empirical.

## techniques for the catalog
- parallel TTS search: sample independent, step-wise, beam, or diverse-verifier-tree trajectories and retain candidates with a verifier
- thresholded reflection: invoke a summary model only when a step score falls below a configured threshold
- list-wise verification and merging: compare all candidates jointly and select a trajectory instead of relying on scalar scores or votes
- heterogeneous rollout diversification: vary sampling controls and model families to increase candidate diversity under a fixed budget
