# Local Look-Ahead Guidance via Verifier-in-the-Loop for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `rajaee2025local`, [paper](http://arxiv.org/abs/2503.09730v2)

source: Rajaee, Pratik, Cesa, Behboodi (University of Amsterdam; Qualcomm AI Research), arXiv:2503.09730v2, 24 Jun 2025; main text pp.1-10, appendices A-C pp.14-18

## what is measured and what stays trusted

LeanListener fine-tunes ReProver, a tactic generator for Lean 4 (a ByT5 encoder-decoder with premise retrieval, Section 3.2.2, p.7), with a reward computed from what Lean says about one tactic applied to one proof state. Nothing is proved about the method. Three things are measured: how many of the sampled tactics Lean accepts at a proof state (Table 1, p.7), the share of test theorems proved (Table 2, p.8; Table 4, p.17), and time and proof length (Figures 2 and 3, pp.8-9).

The paper's claim in one sentence: “At each step, our framework, called LeanListener, obtains feedback on the generated tactics directly via its interaction with the Lean software, and performs policy optimization with a reward that is designed based on Lean feedback.” (Section 1, p.2)

Trusted: Lean as the judge of each tactic and of each finished proof, and the LeanDojo toolkit that runs it. The reward is never trusted for correctness; it only shapes which tactics the model ranks first. A proof counts only when Lean has no goals left.

Terms used below, as the paper defines them in Section 3.1 (p.4): a proof state `s_t` is the set of goals still unproved; a tactic `a_t` is one proof step; `G(s)` is the number of goals in state `s`; applying a tactic can raise, lower or keep `G`.

## technique 1: one-step reward from the change in open goals

what it is: score a candidate proof step by how many open goals it closes in the very next state, with no rollout to the end of the proof.

when to use: the verifier answers per step and reports how much is left to prove, and a full proof attempt is too costly to run for every candidate.

steps for one candidate, from Section 3.2 on p.5:
1. apply the candidate tactic to the current state in Lean
2. if Lean rejects it (syntax error, not applicable, timeout), the reward is 0
3. otherwise the reward is `softplus(G(s_t) − G(s_{t+1}))`, where `softplus(x, β) = (1/β) ln(1 + e^{βx})`
4. the paper gives no value for the softplus `β`

The two rules in the paper's words: “We invariably score the invalid tactics with a score of 0.” and “We choose softplus over a naive linear delta to prevent negative reward values, since the number of intermediate sub-goals may temporarily increase before the proof is completed.” (both Section 3.2, p.5)

Inference: softplus is positive for every input, so an accepted tactic that opens more goals than it closes still scores above a rejected one. With a delta of −1, 0, +1 and β = 1 the rewards are about 0.31, 0.69 and 1.31.

Verus form (Inference, the paper is about Lean only): Verus has no tactic state, so the nearest quantity is the number of errors the verifier reports for one function. A step is one edit to the proof text of that function: a loop `invariant` line, a `decreases` clause, an `assert(...)`, an `assert(...) by { ... }` block, or a call of a `proof fn`. The reward of an edit is softplus(errors before − errors after), and 0 when the file no longer parses or type-checks. Two things do not carry over. First, a Lean tactic that is accepted cannot make a false goal disappear, whereas in Verus an edit containing `assume(false)` or `admit()` removes every error; such edits have to be scored 0 by a separate textual check. Second, a parse or type error in Verus hides all later errors, so the error count is a noisier measure than Lean's goal count.

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

Inference: step 6 is what keeps the cost at 8 or 9 verifier calls per state. The model never has to find a whole proof during training, so states deep in a hard proof still get training signal.

Verus form (Inference): take a function that already verifies, delete its proof annotations one at a time in reverse order of insertion to get a chain of partial proofs, and at each partial proof sample 8 next edits plus the deleted human annotation. Each candidate costs one Verus run on that function. What changes: Verus proofs have no canonical order of steps, so the chain is an artefact of the deletion order.

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

Inference: because of step 2 a rejected tactic, reward 0, gets a negative advantage whenever any candidate in the group was accepted. This reconciles two statements that otherwise disagree: the introduction says “The reward consists of a negative return for invalid tactics, a positive one for applicable tactics, and a return based on the number of remaining unsolved goals.” (Section 1, p.2), while Section 3.2 sets the reward of invalid tactics to 0. Inference: when all candidates of a state are rejected, std(r) is 0 and the advantage is undefined; the paper does not say what is done then, and Table 1 puts such states at 12.74% for the base model.

Verus form (Inference): nothing in the update depends on Lean. For VL the same normalisation is usable without any training: rank the k candidate edits of a state by normalised reward and keep the top one. Training a model this way needs the weights, which rules out hosted models.

evidence, Table 2 (p.8), Pass@1 in percent, LeanDojo benchmark; the paper gives no theorem counts for the test splits:
- random split: LeanListener with GRPO 53.21, ReProver* 52.76 (the re-released pre-trained model, evaluated by the authors), ReProver as published 51.2
- novel premises split: LeanListener 41.11, ReProver* 40.86, ReProver as published 26.3
- the gain over the model it was fine-tuned from is 0.45 points and 0.25 points

Inference: the cells of Figure 3(a) (p.9) sum to 1,992 theorems; LeanListener fails on 932 of them and ReProver on 941, which gives 1,060/1,992 = 53.21% and 1,051/1,992 = 52.76%, the Table 2 figures for the random split. So the gain on that split is 9 theorems net: LeanListener proves 33 that ReProver misses and misses 24 that ReProver proves.

evidence, Table 1 (p.7), step-level, base model against online GRPO: valid tactics among the top 8 rise from 40.77% to 51.01%; states with no valid tactic fall from 12.74% to 7.44%; mean length of valid tactics falls from 18.08 to 16.26 tokens.

evidence on speed: “As can be observed, LeanListener proves more theorems in up to 20% less time for both random and novel premises splits.” (Section 4, Inference time, p.9). The Figure 2 caption (p.8) limits this: “While the overall number of theorems proved within 10 minutes by the two models is comparable, we see LeanListener is consistently faster, which means, it takes significantly less time to solve the same number of theorems (see the purple lines for example).”

where it fails:
- outside the training benchmark the fine-tuned model is worse than its starting point. Table 4 (Appendix C, p.17), Pass@1: MiniF2F 36.9 against 37.7 for ReProver*; ProofNet 14.4 against 15.3. The main text does not discuss this; the limitations section says only “Investigating the performance of LeanListener on other theorem proving datasets is another potential follow-up work.” (Section 6, p.10)
- the novel premises numbers are not a clean test. Footnote 2 (p.7): “We report the performance of the methods also on the novel premises test despite the possible overlap with the training set since this testset is still more challenging than the random one.”
- one base model, one benchmark, no repeated runs, no variance given

## technique 4: online resampling of candidates

what it is: the candidates of technique 2 are drawn from the model being trained, refreshed on a schedule, instead of once from the frozen starting model.

how it is done: “During online training, we update the model used in the beam search to generate tactic proposals for every 50 training iteration with the target model.” (Section 3.2.1, p.6). The offline variant samples everything once from pre-trained ReProver.

when to use: always, according to the paper's own data; the offline variant made the model worse on every measure.

evidence, all with DPO (technique 5), hard pairing, premise dropout 0.3:
- Table 1 (p.7): valid among top 8 is 35.71% offline, 44.75% online, 40.77% base; mean length of all generated tactics is 116.00 tokens offline, 27.44 online, 22.34 base
- Table 2 (p.8), random split Pass@1: 31.27 offline, 50.85 online, 52.76 base

Inference: the length figures show what goes wrong offline. The model drifts to tactics five times longer than the base model's, the frozen sampler never produces those as negatives, so nothing corrects the drift.

Verus form (Inference): for a repair loop this says that negative examples (rejected edits) should come from the current generator and prompt. A fixed library of old failed edits teaches the generator to avoid mistakes it no longer makes.

## technique 5: preference pairs from accept and reject (DPO), a negative result

what it is: train the model to prefer an accepted tactic over a rejected one for the same state, using the Direct Preference Optimization loss (Equation 1, p.5).

steps for building the pairs, from Section 3.2.1 on p.6 and Algorithm 1 on p.17:
1. label the candidates of technique 2: “A tactic is positive if it is syntactically correct and applicable to the current state st by Lean, and it is negative if it gets rejected by Lean.”
2. for each negative, choose one positive by one of three strategies: random; zero accuracy, the highest-likelihood positive among those the model ranked below the negative; hard, the lowest-likelihood such positive
3. after a positive is used, move it to the end of the positive list so that it is not reused too often
4. build the prompt afresh with random dropout on the retrieved premises
5. store the triple (prompt, positive, negative); the offline set has 251k triples
6. a state contributes one triple per negative: “Each proof state st appears in the dataset for each negative tactic the reference model generated for it.”

Algorithm 1 adds a triple only when the negative has higher likelihood than the positive; negatives already ranked below every positive add nothing.

evidence, Table 2 (p.8), random split Pass@1 against 52.76 for the base model: offline 35.99 (random), 33.18 (zero accuracy), 31.27 (hard); online 50.25, 50.90, 50.85. Every DPO variant proves fewer theorems than the model it started from, even online DPO, which raises valid tactics among the top 8 from 40.77% to 44.75% (Table 1).

The authors' explanation: “We believe that there is a spurious correlation between the low-ranked valid tactics and their length in the paired samples in DPO training, which leads to a bias toward generating longer and not necessarily useful tactics.” (Section 4, Performance evaluation, p.8). It is stated as a belief; no experiment isolates it.

a statement that does not match the table: “We first observe that while DPO training on binary feedback improves the number of valid tactics, it always leads to a small degradation in the number of proven theorems.” (Section 4, p.8). Offline DPO loses 17 to 21 points and does not improve valid tactics (34.86% to 37.75% against 40.77%); only the online rows fit the sentence.

Verus form (Inference): the binary signal is whether Verus accepts the edit without a new error. The paper's result warns that optimising for it alone selects for edits that are accepted and useless. In Verus such edits are cheap to produce: an `assert` of a fact the solver already knows, or an `invariant` that is true and irrelevant.

## technique 6: step-level measures of a proof-step generator

what it is: measures taken per proof state, cheaper than proving theorems, defined in the Table 1 caption (p.7).

how to compute, at each test state, from the top 8 sampled tactics:
- “Prec.@8 = the percentage of the number of valid tactics among the top 8 tactics sampled at each proof state.”
- MAP and MRR, mean average precision and mean reciprocal rank of the valid tactics in the ranking
- mean token length of valid tactics and of all tactics
- the share of states where none of the 8 is valid
- per theorem, a table of proof length under model A against proof length under model B, with a row and a column for failure (Figure 3a, p.9)
- the number of theorems proved within each time limit up to 600 s (Figure 2, p.8)

where it fails: these measures moved without the end result moving. Online DPO beats the base model on Prec.@8, MAP, MRR and no-valid-tactic states (Table 1) and proves fewer theorems (Table 2). GRPO adds 10.24 points of Prec.@8 and 0.45 points of Pass@1.

Verus form (Inference): per failing function, sample 8 edits and record the share that Verus accepts, the share that lower the error count, and edit length in tokens. The length column is the one this paper shows to be diagnostic of a generator going wrong.

## already tried here, so VL need not

Inference, from Tables 1, 2 and 4:
- do not train or select on verifier acceptance of a step alone; all six DPO runs with that signal lowered the proof rate, the three offline ones by 17 to 21 points
- do not train on a fixed set of failures collected once from an earlier generator
- do not report step validity as a stand-in for proofs completed
- do not expect a one-step reward to help where proofs are long; the paper's gain sits in one-step proofs, and Verus proofs of loops need several annotations that only pay off together

## threat to VL

Inference: low for a product of agent-written verified Rust. The system is a 2023 ByT5 prover for Lean mathematics library theorems, improved by 9 theorems out of 1,992 on its own training distribution and made slightly worse on two other benchmarks, at 40 GPU-days. It touches neither Rust nor program specifications. What is reusable is the negative evidence above and the reward shape of technique 1 as a ranking rule for candidate proof edits.

## techniques for the catalog

- goal-delta step reward — score a proof step by softplus of open goals before minus after, and 0 if the verifier rejects it
- gold-augmented candidate group — per state of a human proof, sample 8 steps by beam search, append the human step if absent, and check each one separately
- teacher-forced state walk — advance training along the human proof's states so that no full proof search is needed for a reward
- group-normalised advantage (GRPO) — turn the rewards of one state's candidates into advantages by subtracting their mean and dividing by their deviation, with no critic model
- online candidate refresh — resample candidates from the model under training every 50 iterations; sampling once from the starting model made results worse
- accept/reject preference pairs — pair each rejected step with an accepted step ranked below it; raised step validity and lowered theorems proved
- step-validity panel — Prec.@8, MAP, MRR, no-valid-step share and token length per state, to be read together with the proof rate, not instead of it
- paired proof-length table — cross-tabulate per theorem the proof lengths and failures of two provers to see where a change helps
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
