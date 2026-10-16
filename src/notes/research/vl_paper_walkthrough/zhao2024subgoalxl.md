# SubgoalXL: Subgoal-based Expert Learning for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zhao2024subgoalxl`, [paper](http://arxiv.org/abs/2408.11172v1)

## what the paper builds

SubgoalXL trains an Isabelle proof generator from two data sources: informal problems/proofs and formal statements/proofs. Its central change is to replace free-form informal explanations with subgoal annotations that correspond to intermediate Isabelle goals, then use expert learning to sample better statements, proofs, and subgoals. The paper states: “SubgoalXL addresses two critical challenges: the scarcity of specialized mathematics and theorem-proving data, and the need for improved multi-step reasoning abilities in LLMs.” (Abstract, p. 1). The output is still accepted only when Isabelle verifies the generated formal proof; this is a proof-search and data-training method, not a new kernel soundness theorem.

Inference: the direct Verus lesson is to train a generator to propose intermediate `requires`/`ensures` obligations or lemma targets, while Verus remains the final checker. Isabelle's HOL syntax and tools do not carry over; the decomposition and feedback loop do.

## subgoal-based proof annotation

The paper first manually chooses miniF2F validation examples and creates verified formal proofs. It prompts GPT-4o with the informal statement, formal statement, and formal proof to generate a sequence of subgoals. The design requirements are that subgoals are autoregressive, stylistically consistent, and each corresponds to a formal intermediate Isabelle goal (Section 3.2, p. 3). The appendix's prompt says: “To generate a subgoal-based proof from an informal statement and informal proof, systematically decompose the informal proof into smaller logical steps (subgoals), then prove each subgoal to logically build towards proving the main theorem.” (Appendix A, p. 13).

The worked remainder example is operational. Given `n mod 7 = 5` and target `(5*n) mod 7 = 4`, the annotation says: substitute 5 for n; calculate `25 mod 7 = 4`; then simplify the target to 4. Its Isabelle proof uses `have`, `using h0`, `simp`, and a final `show ?thesis` (Figure 1a, p. 2; Appendix A, p. 13). To apply the technique:

1. write a formal statement with explicit variables and assumptions
2. obtain or write a verified proof
3. break the proof into ordered intermediate claims
4. ensure each claim matches a pending Isabelle goal
5. place the explanations as inline comments or subgoal data
6. use the resulting examples as in-context demonstrations for annotation (Section 3.2, p. 3)

Inference: for Verus, a subgoal record could name an intermediate invariant, lemma, or postcondition and include the Rust expression it should establish. A generator can propose `assert`/`ensures` targets, but only Verus's verifier can establish them. The paper does not define a Verus syntax, so any mapping of Isabelle `have` to Verus proof code is an inference.

## expert-learning loop

Three trainable generators are used: a formal-statement generator `p_fsg(S|s)`, formal-proof generator `p_fpg(P|s,S,g)`, and subgoal generator `p_sg(g|s,S)`. A posterior subgoal generator `p_psg(g|s,S,P)` scores whether a generated proof reconstructs useful subgoals (Section 3.3, pp. 3–4). Initialization annotates both datasets with in-context learning, retains only Isabelle-verified formal proofs, and fine-tunes all components. The posterior generator is fixed during expert learning.

At each iteration, the method estimates an optimal sampling distribution. For proof generation, it rewards samples by the posterior generator's log likelihood and constrains deviation from the previous distribution with a KL penalty β. The paper gives the objective: “Given the uncertainty in the quality of generated statements and proofs, we employ probabilistic modeling to compute the reward for each component.” (Section 3.3, p. 4). The corresponding optimum reweights the previous distribution by `exp(reward/β)` and normalizes; analogous equations update statement and subgoal distributions (Equations 1–4, pp. 4 and 14–15).

Algorithm 1 gives the concrete loop:

1. initialize four datasets for statement, proof, subgoal, and posterior-subgoal generators
2. annotate informal examples, remove proof inline comments for posterior training, and add formal examples
3. fine-tune initial generators
4. for each iteration and each informal example, sample a formal statement and a `(statement, proof)` pair from their optimal distributions
5. for each formal example, sample a subgoal and add it with its proof
6. fine-tune statement, proof, and subgoal generators on the accumulated data
7. use only the formal-proof generator at test time (Algorithm 1, pp. 5–6)

The implementation intentionally increases diversity. Four proof generators combine two prompt templates and two proof lengths; proof lengths 1, 2, and 3 are dropped at rates 0.8, 0.6, and 0.4 for one training variant. Each expert-learning iteration reinitializes components from Llama-3-8B rather than continuing from the preceding checkpoint (Section 3.3, p. 5). Inference: reinitialization and diversity are engineering choices that VL could test for proof generation, not formal guarantees.

Inference: a Verus adaptation would store generated candidates with a proof-check result and a subgoal-reconstruction score. A checker can reject candidates that fail Verus, then use successful candidates to train the next round. The paper's probabilistic optimum is not itself a proof of correctness; it only changes which examples are sampled.

## verification setup and evidence

The formal environment is Isabelle 2021/2022 with Sledgehammer. Sledgehammer translates Isabelle/HOL goals to first-order or other solver logics, invokes E, CVC4, Z3, Vampire, or SPASS, then reconstructs a proof with certified Isabelle provers such as `metis`, `meson`, or `smt` (Section 4.1, p. 6). The evaluation uses miniF2F: 488 problems, split into 244 validation and 244 test problems. A proof counts only when it contains no cheating keywords such as `sorry` or `oops` and verifies in Isabelle; pass rate is the metric (Section 4.2, p. 6).

The training corpus contains 18k informal pairs and 195k formal pairs after filtering problems with more than 10% 3-gram overlap with miniF2F. Initialization generated 27k verified informal-dataset quadruples and 174k verified formal-dataset quadruples. Expert learning retained 11k informal and 10k formal problems, used `Kmax = 3` and sample size `m = 2`, and generated 3,156, 3,592, and 4,117 verified proofs in the three iterations. Together with 27k initialization proofs, the total was 38k verified proofs (Section 4.4, p. 7). Inference: the 38k denominator is generated verified proofs, whereas miniF2F percentages below use 244-problem splits; these quantities must not be compared as if they measured the same population.

The main result is 56.1% on miniF2F-test (the denominator is 244 test problems), and 61.9% on miniF2F-valid (244 validation problems), using Llama-3-8B, 38k theorems, and 16,384 inference attempts (Table 1, p. 7). The paper reports 41 AMC12, 9 AIME, and 3 IMO problems solved (Abstract, p. 1). The table's strongest Isabelle baselines include LEGO-Prover at 50.0% test and Lyra at 51.2%; SubgoalXL's absolute improvement over the previous best is 4.9 percentage points (Table 1, p. 7). The inference budget is 16,384 attempts: 8,192 with and 8,192 without human-written informal proofs, run on four SN40 nodes; verification used 2,048 CPUs and accepted either Isabelle version (Section 4.4, p. 7).

Ablation isolates subgoals with a search budget of 64. The full model reaches 46.3% valid and 39.3% test, while removing subgoals reaches 34.8% valid and 36.5% test (Table 2, p. 8). At search budget 8,192, no informal proof reaches 59.4% valid and 52.5% test, while including informal proofs reaches 57.8% and 52.1% (Table 3, p. 8). Thus the reported run does not show a benefit from human informal proofs in this configuration. Across three expert-learning iterations, overall validation rises from 58.20% to 61.89%, and overall test from 51.23% to 56.15%; synthetic-proof pass rate rises from 32.18% to 41.98% over iterations 1–3 (Sections 5.3–5.4, p. 9). Inference: these are benchmark pass rates, not probabilities that an arbitrary generated Verus proof is correct.

## what stays trusted and what fails

The Isabelle kernel and certified proof reconstruction are trusted to reject invalid formal proofs. The generators, GPT-4o annotations, model training, informal-to-formal translations, data filtering, and benchmark representativeness remain outside the formal proof. The paper itself attributes gains to data utility and subgoal guidance; it does not prove that generated subgoals are mathematically complete before Isabelle checking. Inference: a Verus product should keep the verifier as the acceptance boundary and treat subgoal generation as an optimization layer whose failures cost search time, not soundness, provided no unverified output is executed.

The paper is Isabelle-specific and uses high-school mathematics; it does not measure Rust compilation, Verus verification time, concurrency, unsafe code, or agent-written systems. Inference: threat to VL is medium for proof-planning quality and low for kernel soundness. The main reusable idea is to mine successful proofs into structured intermediate obligations and iteratively resample from verifier-scored data. VL should not redo generic Isabelle comparisons; it should test whether subgoal schemas for Rust invariants, ownership, and state transitions transfer to Verus and whether solver feedback gives a useful posterior score.

## techniques for the catalog

- subgoal-based proof annotation — align each natural-language reasoning step with a formal intermediate goal and verified proof command
- verifier-filtered expert iteration — sample candidate statements, proofs, and subgoals from reward-reweighted distributions, retaining only checker-verified artifacts
- posterior subgoal scoring — score a formal proof by the likelihood that a fixed posterior generator reconstructs its subgoal sequence
- diversity through prompt and length variants — train multiple proof generators and reinitialize each iteration to widen the candidate pool
- proof-assistant acceptance gate — count a theorem only after cheating-keyword filtering and Isabelle kernel verification

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
