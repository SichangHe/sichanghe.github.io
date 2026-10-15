# DeepSeekMath-V2: Towards Self-Verifiable Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `shao2025selfverifiable`, [paper](https://doi.org/10.48550/arXiv.2507.23726)

## scope and result

The paper trains a natural-language proof verifier, uses that verifier as a reward model for a proof generator, and then uses the generator's own verification to refine proofs and create more verifier data. Its stated target is rigorous informal mathematics rather than compiled formal proofs. The abstract says: “We then train a proof generator using the verifier as the reward model, and incentivize the generator to identify and resolve as many issues as possible in their own proofs before finalizing them.” (abstract, p. 1). The reported high-compute result is 5/6 IMO 2025 problems, 4 plus partial credit at CMO 2024, and 118/120 at Putnam 2024 (Table 1, p. 8). These are expert-assessed natural-language solutions; no Lean, Verus, or executable program is verified.

## technique 1: rubric-scored proof verifier

What it is. A verifier receives a problem and candidate proof, writes an issue summary, and emits a three-level score: 1 for complete and rigorous, 0.5 for sound overall logic with minor errors or omissions, and 0 for a fatal flaw or critical gap (Section 2.1.1, p. 2). The paper states, “The verifier πφ (·| X , Y , Iv ) is designed to produce a proof analysis that first summarizes identified issues (if any) and then assigns a score based on three levels.” (Section 2.1.1, p. 2).

How to apply it. First, crawl proof problems; the authors collected 17,503 post-2010 proof-oriented olympiad and selection-test problems from Art of Problem Solving (Section 2.1.1, p. 3). Second, generate candidate proofs and prompt iterative refinement because the base model was concise and error-prone. Third, sample across algebra, number theory, and other types and have mathematical experts assign 0, 0.5, or 1, yielding Dv = {(Xi, Yi, si)} (Section 2.1.1, p. 3). Fourth, train with GRPO rewards: a format indicator checks that an issue summary and score are present, and score reward is `1 − |s'i − si|` (Equation 1, p. 3). The paper's required output phrase is “Here is my evaluation of the solution:” followed by a boxed score (Appendix A.2, pp. 14–15).

Verus form. Inference: a Verus adaptation would make the candidate a Rust function with an `ensures` contract and use compilation as the primary correctness oracle. A language model could still produce an issue analysis, but its score must be tied to `cargo verus` success, counterexamples, or a bounded proof-search result rather than a human 0/0.5/1 label. Inference: the natural-language rubric can guide review of missing invariants, but it cannot establish a Verus postcondition.

Evidence and limits. The verifier is trained on expert labels, so labels and rubric interpretation remain trusted. The paper gives no verifier precision/recall against independently checked formal proofs. It warns that score-only supervision permits fabricated issues: “the verifier can receive full reward by predicting the correct scores while hallucinating non-existent issues” (Section 2.1.2, p. 3). Inference: for VL, a model that predicts “0.5” while naming a false counterexample is unsafe unless every claimed issue is checked against compiler diagnostics or a replayable proof state.

## technique 2: meta-verification of issue explanations

What it is. A second model evaluates whether the first verifier's identified issues are real and justify its score. The authors call this “meta-verification” and train a meta-verifier with its own 0/0.5/1 expert labels (Section 2.1.2, pp. 3–4). The enhanced verifier reward is `RV = Rformat · Rscore · Rmeta` (Equation 3, p. 4).

Steps. (1) Train an initial verifier as above. (2) Experts score verifier responses under the meta-verification rubric, forming Dmv = {(Xi, Yi, Vi, msi)}. (3) Train πη to summarize defects in Vi and score whether the analysis is accurate and justified. (4) Multiply the original format and score rewards by the meta-verifier score, and train on both Dv and Dmv (Section 2.1.2, pp. 3–4). On a validation split, the paper reports average meta-evaluated analysis quality rising from 0.85 to 0.96 with unchanged score-prediction accuracy (Section 2.1.2, p. 4).

Verus form. Inference: use a checker that replays each reported defect: a claimed missing postcondition should correspond to a failing or unproved Verus obligation, and a claimed invariant defect should include the failing loop obligation. Inference: the checker can be implemented as a proof-state diff and compiler-run record; the meta-model should rank evidence, not override the compiler.

Evidence and limits. The 0.85→0.96 comparison is on the verifier validation split and uses the trained meta-verifier as evaluator, not an external theorem prover (Section 2.1.2, p. 4). Inference: this is an internal consistency result, so it does not prove that issue explanations are mathematically sound. Human labels are still needed for the initial meta dataset.

## technique 3: generator rewarded for self-verification

What it is. The verifier's proof score becomes a generative reward for πθ. The paper then trains πθ to emit a proof Y followed by a self-analysis Z using the same rubric (Section 2.2.2, p. 4). The combined reward is `R = Rformat(Y,Z) · (α·RY + β·RZ)`, with α = 0.76 and β = 0.24; `RZ` combines self-score accuracy and meta-verification (Equations 5–6, p. 5).

Steps. (1) Generate a proof. (2) Generate a structured self-analysis and score s'. (3) Have πφ score the proof (RY = s) and the analysis (Rmeta). (4) Reward correct self-scoring with `1 − |s' − s|`, and enforce output format. (5) Re-prompt the generator with its previous proof and analysis until it gives itself score 1 or reaches the attempt limit (Section 2.2.2, p. 4; Section 3.3.2, p. 7). The authors report that a one-shot generator often claimed correctness despite external flaws, motivating this explicit training (Section 2.2.2, p. 4).

Verus form. Inference: replace the verifier score with a binary proof-check result plus diagnostics. The generator should emit Rust/Verus code, run the verifier, inspect diagnostics, and revise contracts, lemmas, or loop invariants. Inference: a self-score can prioritize candidates but must never be accepted as evidence that code verifies. Verus syntax must use ordinary `requires`/`ensures`, `invariant`, `assert`, and proof functions; no natural-language score substitutes for these obligations.

Evidence and limits. On IMO Shortlist 2024, 32 independent refinement threads were evaluated by majority vote across 32 verifier analyses per problem; Pass@1 increased as maximum sequential iterations rose from 1 to 8 (Figure 2, pp. 7–8). The paper says, “Pass@1 improves substantially as maximum sequential attempts increase” (Section 3.3.2, p. 8). Inference: this demonstrates an inference-time search effect under the paper's verifier, not guaranteed convergence and not formal soundness.

## technique 4: automated hard-proof labeling by scaled verification

What it is. Instead of asking experts to label every new proof, sample many independent verifier analyses and then sample meta-verifications for analyses that report issues (Section 2.3, p. 5). The exact pipeline is: “For each proof, generate n independent verification analyses”; for analyses scoring 0 or 0.5, “generate m meta-verification assessments”; accept an analysis when a majority of meta-assessments confirm it; label a proof with the lowest score when at least k such analyses are valid; label 1 when no legitimate issue is found; otherwise discard or send to experts (Section 2.3, p. 6).

Verus form. Inference: run multiple independent proof attempts or diagnostic analyses, but let the Verus compiler decide validity. A majority can select which failing obligation to repair first; it cannot turn an unverified candidate into a verified one. Inference: retaining all compiler logs and seeds is necessary for reproducibility because solver behavior can vary.

Evidence and limits. The authors state that in their last two training iterations this “fully automated pipeline replaced human annotation entirely” and that quality checks aligned with expert judgments (Section 2.3, p. 6). No denominator or agreement percentage is reported for those quality checks. Inference: this missing denominator prevents estimating residual false-negative risk for a VL deployment.

## what is proved, trusted, and relevant to VL

The paper proves no program property. It measures verifier scores and expert judgments on natural-language proofs; the reported contest fractions use 6 IMO problems, 6 CMO problems, and 12 Putnam problems (Table 1, p. 8). The trusted components are expert labels, rubric design, the base model, the verifier, and meta-verifier. Inference: a VL product could borrow the closed loop—generate, check, diagnose, revise, and use difficult cases as training data—but its trust boundary must end at Verus's checked proof and specified Rust behavior. Inference: the main threat is false confidence if a natural-language verifier's “no issue found” is treated as equivalent to a successful Verus proof; this paper supplies no evidence for that equivalence.

The paper's own conclusion lists four contributions: “training an accurate and faithful LLM-based verifier,” “using meta-verification to largely reduce hallucinated issues,” “incentivizing the proof generator to maximize proof quality through self-verification,” and “scaling verification compute to automatically label increasingly hard-to-verify proofs” (Section 5, p. 9). Inference: VL should reuse the process architecture, while replacing every correctness reward and final acceptance decision with reproducible Verus checks. Existing VL work should not redo the generic idea of verifier-guided refinement; the open engineering question is how to map diagnostics and proof-state changes into this loop without weakening the specification.

## techniques for the catalog

- rubric-scored verifier — train a model to identify proof issues and assign 0/0.5/1 labels from expert-scored examples

- meta-verification — score whether verifier-reported issues exist and justify the proof score, then include that score in verifier training

- self-verifying generator — reward a generator for a correct proof and a faithful self-analysis, then iteratively refine its output

- scaled automated labeling — sample independent analyses and majority-confirmed meta-analyses to label hard proofs or route them to experts
Checked 2026-10-15 against paper shao2025selfverifiable: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
