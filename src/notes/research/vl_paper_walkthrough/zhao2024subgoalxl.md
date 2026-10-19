# SubgoalXL: Subgoal-based Expert Learning for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zhao2024subgoalxl`, [paper](https://arxiv.org/abs/2408.11172v1)

## what the paper builds

SubgoalXL trains an Isabelle proof generator from two data sources: informal problems/proofs and formal statements/proofs. Its central change is to replace free-form informal explanations with subgoal annotations that correspond to intermediate Isabelle goals, then use expert learning to sample better statements, proofs, and subgoals. The paper states: “SubgoalXL addresses two critical challenges: the scarcity of specialized mathematics and theorem-proving data, and the need for improved multi-step reasoning abilities in LLMs.” (Abstract, p. 1). The evaluation accepts a formal sketch only if it avoids cheating keywords and verifies in Isabelle (Section 4.2, p. 6). Inference: this is a proof-search and training method, not a new kernel soundness theorem.

Inference: the direct Verus lesson is to train a generator to propose intermediate `requires`/`ensures` obligations or lemma targets, while Verus remains the final checker. Isabelle's HOL syntax and tools do not carry over; the decomposition and feedback loop do.

## subgoal-based proof annotation

The paper first manually chooses miniF2F validation examples and creates verified formal proofs. It prompts GPT-4o with the informal statement, formal statement, and formal proof to generate a sequence of subgoals. The design requirements are that subgoal-based proofs are produced by autoregressive models, have a consistent style, and match each subgoal to a formal intermediate Isabelle goal (Section 3.2, p. 3). The appendix's prompt says: “To generate a subgoal-based proof from an informal statement and informal proof, systematically decompose the informal proof into smaller logical steps (subgoals), then prove each subgoal to logically build towards proving the main theorem.” (Appendix A, p. 13).

The worked remainder example is operational. Given `n mod 7 = 5` and target `(5*n) mod 7 = 4`, the annotation says: substitute 5 for n; calculate `25 mod 7 = 4`; then simplify the target to 4. Its Isabelle proof uses `have`, `using h0`, `simp`, and a final `show ?thesis` (Figure 1a, p. 2; Appendix A, p. 13). To apply the technique:

1. write a formal statement with explicit variables and assumptions
2. obtain or write a verified proof
3. break the proof into ordered intermediate claims
4. match each subgoal to a formal intermediate Isabelle goal
5. place the explanations as inline comments or subgoal data
6. use the resulting examples as in-context demonstrations for annotation (Section 3.2, p. 3)

Inference: for Verus, a subgoal record could name an intermediate invariant, lemma, or postcondition and include the Rust expression it should establish. A generator can propose `assert`/`ensures` targets, but only Verus's verifier can establish them. The paper does not define a Verus syntax, so any mapping of Isabelle `have` to Verus proof code is an inference.

## expert-learning loop

Three trainable generators are used: a formal-statement generator `p_fsg(S|s)`, formal-proof generator `p_fpg(P|s,S,g)`, and subgoal generator `p_sg(g|s,S)`. A posterior subgoal generator `p_psg(g|s,S,P)` scores generated statements and proofs by the likelihood of reconstructing the supplied subgoal-based proof (Section 3.3, pp. 3–4). Initialization annotates both datasets with in-context learning, retains only Isabelle-verified formal proofs, and fine-tunes all components. The posterior generator is fixed during expert learning.

At each iteration, the method estimates an optimal sampling distribution. For proof generation, it rewards samples by the posterior generator's log likelihood and constrains deviation from the previous distribution with a KL penalty β. The paper explains the reward modeling: “Given the uncertainty in the quality of generated statements and proofs, we employ probabilistic modeling to compute the reward for each component.” (Section 3.3, p. 4). The corresponding optimum reweights the previous distribution by `exp(reward/β)` and normalizes; analogous equations update statement and subgoal distributions (Equations 1–4, pp. 4 and 14–15).

Algorithm 1 gives the concrete loop:

1. initialize four datasets for statement, proof, subgoal, and posterior-subgoal generators
2. annotate informal examples, remove proof inline comments for posterior training, and add formal examples
3. fine-tune initial generators
4. for each iteration and each informal example, sample a formal statement and a `(statement, proof)` pair from their optimal distributions
5. for each formal example, sample a subgoal and add it with its proof
6. fine-tune statement, proof, and subgoal generators on initialization data plus samples from the current iteration (Algorithm 1, p. 5)
7. use only the formal-proof generator at test time (Section 3.3, p. 4)

The implementation intentionally increases diversity. Four proof generators combine two prompt templates and two proof lengths; proof lengths 1, 2, and 3 are dropped at rates 0.8, 0.6, and 0.4 for one training variant. Each expert-learning iteration reinitializes components from Llama-3-8B rather than continuing from the preceding checkpoint (Section 3.3, p. 5). Inference: reinitialization and diversity are engineering choices that VL could test for proof generation, not formal guarantees.

Inference: a Verus adaptation would store generated candidates with a proof-check result and a subgoal-reconstruction score. A checker can reject candidates that fail Verus, then use successful candidates to train the next round. The paper's probabilistic optimum is not itself a proof of correctness; it only changes which examples are sampled.

## verification setup and evidence

The formal environment is Isabelle 2021/2022 with Sledgehammer. Sledgehammer translates Isabelle/HOL goals to first-order or other solver logics, invokes E, CVC4, Z3, Vampire, or SPASS, then reconstructs a proof with certified Isabelle provers such as `metis`, `meson`, or `smt` (Section 4.1, p. 6). The evaluation uses miniF2F: 488 problems, split into 244 validation and 244 test problems. A proof counts only when it contains no cheating keywords such as `sorry` or `oops` and verifies in Isabelle; pass rate is the metric (Section 4.2, p. 6).

The paper reports collecting 18k informal pairs and 195k formal pairs, then filtering out problems with more than 10% 3-gram overlap with miniF2F. Initialization yielded 27k informal-dataset quadruples and 174k formal-dataset quadruples. Expert learning retained 11k informal and 10k formal problems, used `Kmax = 3` and sample size `m = 2`, and generated 3,156, 3,592, and 4,117 verified proofs in the three iterations. Together with 27k initialization proofs, the total was 38k verified proofs (Section 4.4, p. 7).

The main result is 56.1% on miniF2F-test (the denominator is 244 test problems), and 61.9% on miniF2F-valid (244 validation problems), using Llama-3-8B (Table 1, p. 7). Table 4 lists 38k synthetic theorems and a search budget of 16,384 (p. 16). The paper reports 41 AMC12, 9 AIME, and 3 IMO problems solved (Abstract, p. 1). The table's strongest Isabelle baselines include LEGO-Prover at 50.0% test and Lyra at 51.2%; SubgoalXL's absolute improvement over the previous best is 4.9 percentage points (Table 1, p. 7). The inference budget is 16,384 attempts per problem across 16 models: each model generates 512 samples with and 512 without human-written informal proofs. Inference ran on four SN40 nodes; verification used 2,048 CPUs and accepted a proof if either Isabelle 2021 or Isabelle 2022 verified it (Section 4.4, pp. 7–8).

Ablation isolates subgoals with a search budget of 64. The full model reaches 46.3% valid and 39.3% test, while removing subgoals reaches 34.8% valid and 36.5% test (Table 2, p. 8). At search budget 8,192, no informal proof reaches 59.4% valid and 52.5% test, while including informal proofs reaches 57.8% and 52.1% (Table 3, p. 8). Inference: the reported run does not show a benefit from human informal proofs in this configuration. Across three expert-learning iterations, overall validation rises from 58.20% to 61.89%, and overall test from 51.23% to 56.15%; synthetic-proof pass rate rises from 32.18% to 41.98% over iterations 1–3 (Sections 5.3–5.4, p. 9). Inference: these are benchmark pass rates, not probabilities that an arbitrary generated Verus proof is correct.

## what stays trusted and what fails

Section 4.1 describes kernels as “carefully checking each theorem to ensure it is correctly recognized by the ITP” (p. 6). Inference: kernel verification establishes the formal theorem; it does not establish that a generated formal statement faithfully captures the informal problem, or validate the annotations, training, filtering, or benchmark representativeness. The paper provides no theorem that generated subgoals are complete before Isabelle checking. Inference: a Verus product should keep the verifier as the acceptance boundary and treat subgoal generation as an optimization layer whose failures cost search time, not soundness, provided no unverified output is executed.

The evaluation uses Isabelle and miniF2F high-school mathematics (Section 4.2, p. 6); the paper reports no measurements of Rust compilation, Verus verification time, concurrency, unsafe code, or agent-written systems. Inference: threat to VL is medium for proof-planning quality and low for kernel soundness. The main reusable idea is to align proofs with structured intermediate obligations and resample data using generator likelihood scores, with Isabelle checking formal proofs. VL should not redo generic Isabelle comparisons; it should test whether subgoal schemas for Rust invariants, ownership, and state transitions transfer to Verus and whether solver feedback gives a useful posterior score.

## techniques for the catalog

- subgoal-based proof annotation — align each natural-language reasoning step with a formal intermediate goal and verified proof command
- subgoal-based expert learning — sample statements, proofs, and subgoals from distributions reweighted by generator likelihood scores, then retrain on the sampled data plus initialization data
- posterior subgoal scoring — score a formal proof by the likelihood that a fixed posterior generator reconstructs its subgoal sequence
- diversity through prompt and length variants — train multiple proof generators and reinitialize each iteration to widen the candidate pool
- proof-assistant prerequisite check — count a theorem only after cheating-keyword filtering and Isabelle verification

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Overall validation performance increased consistently from 58.20% in iteration 0 to 61.89% in iteration 3."): checked all quotations, numbers, section and page references, and technique steps; corrected annotation wording, iteration data reuse, dataset-count ordering, inference details, citations, and unsupported claims; did not check the implementation, reproduce experiments, or independently validate cited papers.
