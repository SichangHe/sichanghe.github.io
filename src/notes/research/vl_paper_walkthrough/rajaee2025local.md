# Local Look-Ahead Guidance via Verifier-in-the-Loop for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `rajaee2025local`, [paper](http://arxiv.org/abs/2503.09730v2)

source: Rajaee, Pratik, Cesa, Behboodi (University of Amsterdam; Qualcomm AI Research), arXiv:2503.09730v2, 24 Jun 2025; main text pp.1-10, appendices A-C pp.14-18

## what is measured and what stays trusted

LeanListener fine-tunes ReProver, a tactic generator for Lean 4 (a ByT5 encoder-decoder with premise retrieval, Section 3.2.2, p.7), with a reward computed from what Lean says about one tactic applied to one proof state. The paper reports empirical results rather than a correctness theorem for the method. Three things are measured: how many of the sampled tactics Lean accepts at a proof state (Table 1, p.7), the share of test theorems proved (Table 2, p.8; Table 4, p.17), and time and proof length (Figures 2 and 3, pp.8-9).

The paper's claim in one sentence: “At each step, our framework, called LeanListener, obtains feedback on the generated tactics directly via its interaction with the Lean software, and performs policy optimization with a reward that is designed based on Lean feedback.” (Section 1, p.2)

Inference: Lean and the LeanDojo interface remain responsible for checking tactics and completed proofs; the reward guides the generator. Section 1 (p.1) says, “The proof terminates when all the goals are proven.”

Terms used below, as the paper defines them in Section 3.1 (p.4): a proof state `s_t` is the set of goals still unproved; a tactic `a_t` is one proof step; `G(s)` is the number of goals in state `s`; applying a tactic can raise, lower or keep `G`.

## technique 1: one-step reward from the change in open goals

what it is: score a candidate proof step by how many open goals it closes in the very next state, with no rollout to the end of the proof.

Inference: this reward is a candidate when a verifier reports progress after individual steps and full proof rollouts are expensive.

steps for one candidate, from Section 3.2 on p.5:
1. apply the candidate tactic to the current state in Lean
2. if Lean rejects it (syntax error, not applicable, timeout), the reward is 0
3. otherwise the reward is `softplus(G(s_t) − G(s_{t+1}))`, where `softplus(x, β) = (1/β) ln(1 + e^{βx})`
4. the paper gives no value for the softplus `β`

The two rules in the paper's words: “We invariably score the invalid tactics with a score of 0.” and “We choose softplus over a naive linear delta to prevent negative reward values, since the number of intermediate sub-goals may temporarily increase before the proof is completed.” (both Section 3.2, p.5)

Inference: softplus is positive for every input, so an accepted tactic that opens more goals than it closes still scores above a rejected one. With a delta of −1, 0, +1 and β = 1 the rewards are about 0.31, 0.69 and 1.31.

Verus form (Inference; untested proposal): score candidate proof edits by `softplus(errors before − errors after)`, and score parse or type failures 0. This would require checking whether error counts reliably measure progress. The paper evaluates Lean goal counts, not Verus errors.

evidence: the reward is tested only together with technique 3; see there.

where it fails: the authors read their own proof-length figure this way: “Since LeanListener is trained with a one-step look-ahead process, it excels at proving theorems that can be solved in a single step.” and “We observe that the number of failed proofs increases for theorems requiring more than one proof step.” (both Section 4, Proof Length, p.9)

## technique 2: building the candidate group for a state

what it is: the set of tactics that gets scored at each training state.

steps, from Section 3.2.1 on p.6 and Algorithm 1 on p.17:
1. walk the human-written proofs of the LeanDojo training split, state by state
2. retrieve premises for the state
3. sample `w = 8` tactics by beam search and sort them by the sampling model's likelihood
4. if the human tactic for that state is not among them, append it as a ninth, lowest-ranked candidate
5. apply each candidate separately to the state in Lean and record accept or reject (and, for technique 1, the goal count)
6. move to the next state along the human proof, not along the model's own tactic

Step 5 in the paper's words: “The next step involves accruing feedback from the Lean framework by individual application of each proposed tactic on the current proof state.” (Section 3.2.1, p.6). Step 6 is from the Figure 1 caption (p.3): “The loop continues using the steps from the human-annotated tactics until proof termination.”

Inference: steps 3–5 require 8 or 9 candidate-verification calls per state, apart from any work needed to obtain the human proof states. The model never has to find a whole proof during training, so states deep in a hard proof still get training signal.

Verus form (Inference; untested proposal): start with a verified function, remove proof annotations in a chosen order, and use the resulting partial proofs as training states. Sample 8 candidate edits and append the removed annotation when absent. Unlike the human tactic sequence in this paper, the edit sequence would depend on the chosen removal order.

cost: “The overall fine-tuning process in the LeanListener framework requires approximately 40 A100 GPU-days, with over 80% of the time spent on interactions with Lean, which are CPU-bound.” (Section 3.2.2, p.7). Training is 10k steps, AdamW, learning rate 2.25e−6, batch size 16 (same section).

## technique 3: group-relative policy update (GRPO) on the step rewards

what it is: a policy-gradient update that needs no learned critic. Each candidate's advantage is its reward normalised inside its own group.

steps, from Equations 2 and 3 of Section 3.2 on pp.5-6:
1. for a state, take the rewards `r_1 … r_w` of the candidates from technique 2
2. advantage of candidate i is `(r_i − mean(r)) / std(r)`
3. maximise the clipped ratio objective of Equation 2 (ratio of new to old policy probability per output token, clipped to `[1 − ε, 1 + ε]`, times the advantage)
4. subtract `β` times a KL term that keeps the policy near the reference model, estimated by Equation 3
5. the pre-trained ReProver generator is both the reference model and the starting policy
6. `ε` and `β` are not given in the paper

Inference: because of step 2 a rejected tactic, reward 0, gets a negative advantage whenever any candidate in the group was accepted. This reconciles two statements that otherwise disagree: the introduction says “The reward consists of a negative return for invalid tactics, a positive one for applicable tactics, and a return based on the number of remaining unsolved goals.” (Section 1, p.2), while Section 3.2 sets the reward of invalid tactics to 0. Inference: equal candidate rewards make std(r) zero, so the stated normalization is undefined; the paper does not specify how this case is handled. Table 1’s 12.74% of states with no valid top-8 tactic is an evaluation statistic, not a training-group statistic: training appends the gold tactic when absent.

Verus form (Inference; untested proposal): GRPO could train a generator using rewards from Verus. Selecting an edit by its immediate reward without training would be a separate method; this paper does not evaluate it.

evidence, Table 2 (p.8), Pass@1 in percent, LeanDojo benchmark; Table 2 does not state the test-set sizes:
- random split: LeanListener with GRPO 53.21, ReProver* 52.76 (the re-released pre-trained model, evaluated by the authors), ReProver as published 51.2
- novel premises split: LeanListener 41.11, ReProver* 40.86, ReProver as published 26.3
- Inference: subtraction gives gains of 0.45 and 0.25 percentage points over ReProver*

Inference: the cells of Figure 3(a) (p.9) sum to 1,992 theorems; LeanListener fails on 932 of them and ReProver on 941, which gives 1,060/1,992 = 53.21% and 1,051/1,992 = 52.76%, the Table 2 figures for the random split. So the gain on that split is 9 theorems net: LeanListener proves 33 that ReProver misses and misses 24 that ReProver proves.

evidence, Table 1 (p.7), step-level, base model against online GRPO: valid tactics among the top 8 rise from 40.77% to 51.01%; states with no valid tactic fall from 12.74% to 7.44%; mean length of valid tactics falls from 18.08 to 16.26 tokens.

evidence on speed: “As can be observed, LeanListener proves more theorems in up to 20% less time for both random and novel premises splits.” (Section 4, Inference time, p.9). The Figure 2 caption (p.8) limits this: “While the overall number of theorems proved within 10 minutes by the two models is comparable, we see LeanListener is consistently faster, which means, it takes significantly less time to solve the same number of theorems (see the purple lines for example).”

where it fails:
- on the two additional benchmarks, the fine-tuned model has lower reported Pass@1 than ReProver*. Table 4 (Appendix C, p.17), Pass@1: MiniF2F 36.9 against 37.7 for ReProver*; ProofNet 14.4 against 15.3. The main text does not discuss this; the limitations section says only “Investigating the performance of LeanListener on other theorem proving datasets is another potential follow-up work.” (Section 6, p.10)
- Inference: possible training overlap limits interpretation of the novel premises results. Footnote 2 (p.7): “We report the performance of the methods also on the novel premises test despite the possible overlap with the training set since this testset is still more challenging than the random one.”
- one base model, evaluated on LeanDojo, MiniF2F and ProofNet; no repeated-run results or variance estimates are reported

## technique 4: online resampling of candidates

what it is: the candidates of technique 2 are drawn from the model being trained, refreshed on a schedule, instead of once from the frozen starting model.

how it is done: “During online training, we update the model used in the beam search to generate tactic proposals for every 50 training iteration with the target model.” (Section 3.2.1, p.6). The offline variant samples everything once from pre-trained ReProver.

Inference: prefer online sampling for this setup. All reported offline DPO variants lower top-8 validity and theorem success relative to ReProver*, but not every step-level metric worsens: offline zero-accuracy DPO raises MAP from 59.85 to 60.75 (Table 1).

evidence, all with DPO (technique 5), hard pairing, premise dropout 0.3:
- Table 1 (p.7): valid among top 8 is 35.71% offline, 44.75% online, 40.77% base; mean length of all generated tactics is 116.00 tokens offline, 27.44 online, 22.34 base
- Table 2 (p.8), random split Pass@1: 31.27 offline, 50.85 online, 52.76 base

Inference: a fixed candidate set may become less representative as the policy changes. The longer offline tactics are consistent with that possibility, but the paper does not isolate this mechanism.

Verus form (Inference; untested proposal): collect rejected edits from the current generator when training a repair loop, rather than relying only on a fixed library of older failures.

## technique 5: preference pairs from accept and reject (DPO), a negative result

what it is: train the model to prefer an accepted tactic over a rejected one for the same state, using the Direct Preference Optimization loss (Equation 1, p.5).

steps for building the pairs, from Section 3.2.1 on p.6 and Algorithm 1 on p.17:
1. label the candidates of technique 2: “A tactic is positive if it is syntactically correct and applicable to the current state st by Lean, and it is negative if it gets rejected by Lean.”
2. for each negative, choose one positive by one of three strategies: random; zero accuracy, the highest-likelihood positive among those the model ranked below the negative; hard, the lowest-likelihood such positive
3. in Algorithm 1’s zero-accuracy procedure, move a used positive to the end of the positive list to reduce reuse
4. build the prompt afresh with random dropout on the retrieved premises
5. store the triple (prompt, positive, negative); the offline set has 251k triples
6. the prose describes one triple per negative, subject to the pairing condition below: “Each proof state st appears in the dataset for each negative tactic the reference model generated for it.”

Algorithm 1 (zero accuracy) adds a triple only when the negative has higher likelihood than the positive; negatives already ranked below every positive add nothing. Its move-to-end heuristic changes the order of later positive selections, so these need not always be the highest-likelihood eligible positives.

evidence, Table 2 (p.8), random split Pass@1 against 52.76 for the base model: offline 35.99 (random), 33.18 (zero accuracy), 31.27 (hard); online 50.25, 50.90, 50.85. Every DPO variant proves fewer theorems than the model it started from, even online DPO, which raises valid tactics among the top 8 from 40.77% to 44.75% (Table 1).

The authors' explanation: “We believe that there is a spurious correlation between the low-ranked valid tactics and their length in the paired samples in DPO training, which leads to a bias toward generating longer and not necessarily useful tactics.” (Section 4, Performance evaluation, p.8). Inference: this is an explanation proposed by the authors, not a mechanism isolated by an experiment in the paper.

Inference: the following statement fits the online rows, but not the offline rows: “We first observe that while DPO training on binary feedback improves the number of valid tactics, it always leads to a small degradation in the number of proven theorems.” (Section 4, p.8). Inference: offline DPO loses approximately 17 to 21 percentage points and does not improve valid tactics (34.86% to 37.75% against 40.77%); only the online rows fit the sentence.

Verus form (Inference; untested proposal): compare binary edit acceptance with rewards for progress toward a completed proof. The DPO results show that increased tactic validity can accompany lower theorem success; they do not establish which Verus edits would be selected.

## technique 6: step-level measures of a proof-step generator

what it is: per-state measures defined in the Table 1 caption (p.7), complemented by per-theorem proof-length and timing comparisons.

per-state measures, from the top 8 sampled tactics:
- “Prec.@8 = the percentage of the number of valid tactics among the top 8 tactics sampled at each proof state.”
- MAP and MRR, mean average precision and mean reciprocal rank of the valid tactics in the ranking
- mean token length of valid tactics and of all tactics
- the share of states where none of the 8 is valid

per-theorem comparisons:
- a table of proof length under model A against proof length under model B, with a row and a column for failure (Figure 3a, p.9)
- the number of theorems proved within each time limit up to 600 s (Figure 2, p.8)

Inference: improved step-level measures do not guarantee improved theorem success. Online DPO beats the base model on Prec.@8, MAP, MRR and no-valid-tactic states (Table 1) and proves fewer theorems (Table 2). GRPO adds 10.24 points of Prec.@8 and 0.45 points of Pass@1.

Verus form (Inference; untested proposal): per failing function, sample 8 edits and record acceptance, error-count changes and edit length, together with the final verification success rate. The paper’s offline DPO results suggest monitoring length, without establishing it as a general diagnostic.

## already tried here, so VL need not

Inference, from Tables 1, 2 and 4:
- binary acceptance alone did not improve proof success in these DPO runs; all six lowered the proof rate, the three offline ones by approximately 17 to 21 percentage points
- prefer online candidate refresh in this tested setup; the paper does not establish that all fixed failure datasets are ineffective
- do not report step validity as a stand-in for proofs completed
- treat longer proofs as an unresolved limitation: the authors report more failures as required proof length increases, but do not establish that one-step rewards cannot help longer proofs

## threat to VL

Inference: this paper provides limited direct evidence about a product for agent-written verified Rust. It fine-tunes a ByT5-based Lean prover, gains 9 net theorems among 1,992 random-split test theorems, and reports lower Pass@1 on MiniF2F and ProofNet than ReProver*. Training takes approximately 40 A100 GPU-days. Applying its goal-count reward or online sampling method to Verus would require separate evaluation.

## techniques for the catalog

- goal-delta step reward — score a proof step by softplus of open goals before minus after, and 0 if the verifier rejects it
- gold-augmented candidate group — per state of a human proof, sample 8 steps by beam search, append the human step if absent, and check each one separately
- teacher-forced state walk — advance training along the human proof's states so that no full proof search is needed for a reward
- group-normalised advantage (GRPO) — turn the rewards of one state's candidates into advantages by subtracting their mean and dividing by their deviation, with no critic model
- online candidate refresh — resample candidates from the model under training every 50 iterations; sampling once from the starting model made results worse
- accept/reject preference pairs — use random, zero-accuracy or hard pairing; online DPO raised step validity but all DPO settings lowered theorem success
- step-validity panel — Prec.@8, MAP, MRR, no-valid-step share and token length per state, to be read together with the proof rate, not instead of it
- paired proof-length table — cross-tabulate per theorem the proof lengths and failures of two provers to see where a change helps
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Since LeanListener is trained with a one-step look-ahead process, it excels at proving theorems that can be solved in a single step."): checked all paper text, quotations, numerical results, section and page references, technique steps, and Figure 3(a) in the PDF; corrected the all-metrics offline claim, benchmark scope, zero-variance discussion and pairing details, and qualified unsupported generalizations and Verus proposals; did not reproduce experiments, inspect implementation code, or validate Verus proposals.
