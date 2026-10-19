# GAR: Generative Adversarial Reinforcement Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `wang2025gar`, [paper](https://arxiv.org/abs/2510.11769)

## scope and result
The supplied paper is arXiv:2510.11769v2, dated 1 March 2026 and published at ICLR 2026 (PDF p.1). GAR trains a Lean 4 prover and a statement fuser together. Its central claim is an implicit curriculum: the fuser makes statements harder while keeping them solvable, and the prover learns to solve medium and hard statements. The paper reports 74.18% pass@32 on MiniF2F-Test for GAR on DeepSeek-Prover-V2-7B, versus 70.49% for that base model, and 80.33% for GAR on Goedel-Prover-V2-8B, versus 77.87% for the listed base. On ProofNet-Test (186 Lean 4 problems), GAR on DeepSeek-Prover-V2 reaches 25.81% pass@32 versus 22.58% for the base. The abstract states: “GAR introduces an implicit curriculum learning mechanism, which aligns task difficulty with the prover’s evolving capability.” (Abstract, PDF p.1)

## technique 1: statement fusion as an adaptive curriculum

what it is and when to use it
The fuser generates a single, harder natural-language theorem from two existing statements, then an autoformalizer turns it into Lean. Inference: use this when a fixed theorem set leaves training examples too easy, too hard, or stale as the prover improves. The source repository has 793,243 NL statements from Lean-Workbook and Numina-Math (Method §2.1.1, PDF p.3). The paper’s summary is precise: “This process generates harder statements from existing ones.” (Method §2.1.1, PDF p.3)

how to do it
1. Sample two NL statements from the repository: `s_base=(s1_NL,s2_NL) ~ D_stat` (§2.1.1, p.3)
2. Ask the previous-iteration fuser to combine key ideas into one multi-step, solvable statement, `s_NL = Fuser_{i-1}(s_base)` (§2.1.1, p.3)
3. For thinking models, restart reasoning with the dedicated `<analysis>` indicator; the paper says direct native long-CoT use can overthink and degrade statement quality (§2.1.1, p.3)
4. Autoformalize `s_NL` to `s_FL`, then compile it with Lean 4. Discard grammatical or uncompilable statements (§2.1.1, p.3)
5. Generate 16 candidate proofs from the prior prover and run each through Lean. Compute empirical pass rate `p=n_pass/n` (§2.1.2, p.4)

The supplied fuser prompt requires analysis of overlapping or complementary knowledge, at least two key components from each problem, multi-step reasoning, solvability, and one proof problem in an MD code block. It also says: “Also, your combined problem should have no non-trivial extension.” (Figure 2, p.4) Inference: a Verus adaptation would need a different autoformalizer and proof checker.

Verus form
Inference: represent the fuser’s output as a Rust/Verus theorem specification and ask a model to combine two existing specification statements into one. Autoformalization would produce a Verus specification, followed by candidate proof functions checked by Verus. Record both failed and successful proof attempts to estimate difficulty and assign rewards. The NL fusion and adaptive-difficulty loop could carry over, but the paper does not evaluate Verus.

evidence and limits
GAR’s main table uses pass@32: a theorem counts as proved if at least one of 32 candidate proofs passes verification (Appendix B.1, p.13). MiniF2F-Test has 244 statements (§3.1.1, pp.6–7); ProofNet-Test has 186 (§3.1.1, p.7). The evaluation limits reasoning to 16,384 tokens, versus 40,960 in the original DeepSeek-Prover-V2 and Goedel-Prover-V2 papers (§3.1.2 and footnote 1, p.7). The implementation states (§3.2, pp.7–8):

> In verification, any proof involving statement modification or relying on the “sorry” or “admit” tactic is counted as incorrect to ensure fairness.

The generation reward is `r_stat=(1-p)(1-m) I{p≠0}`, where `m` is the fraction of candidate proofs that attempt to modify that statement (GAR §2.2.1, p.5). This differs from the dataset-level modification rate in Appendix B.3 (p.13), which counts theorems with at least one modification across 16 proofs. Thus unsolvable (`p=0`) statements receive zero reward, and modifications are softly penalized. The fuser trains with N=1024 generated statements per step and GRPO; the prover excludes statements with `p=0` or `p>0.5` (too easy) (§2.2.2, p.6). Figure 1 describes the verifier-mediated rewards: “The prover is rewarded for producing correct proofs on medium and high-difficulty statements, while the statement fuser is rewarded for generating harder but solvable problems.” (Figure 1 caption, p.2)

Inference: Lean compilation alone does not establish that the formalized statement matches the intended NL problem; the case studies in Appendix D.5 (pp.15–35) do not establish that correspondence for all generated statements. Inference: a Verus deployment must define how to detect statement mutation, because Lean’s paper-specific modification signal has no automatic equivalent for arbitrary Rust text. Inference: reward hacking remains possible if a model changes the specification, invokes an overly permissive external contract, or exploits an autoformalizer bug.

## technique 2: adversarial GRPO co-training

what it is and when to use it
The fuser and prover optimize opposite objectives over the same verifier feedback. Inference: this is useful when training should track the prover’s changing capability.

how to do it
1. Fuser: generate N=1024 statements; calculate each pass rate `p`, modification rate `m`, reward, normalized advantage, and GRPO clipped objective with a KL penalty to a reference fuser (§2.2.1, pp.4–5)
2. Prover: for each statement generate n=16 proofs; Equation 7 prints the reward as `1-0.5*m_proof`, where `m_proof` indicates statement modification. Normalize advantages and optimize a separate GRPO objective (§2.2.2, pp.5–6). Inference: this equation alone is insufficient to reconstruct the correctness reward, because it contains no explicit correctness indicator, although Figure 1 describes a reward for correct proofs
3. Filter prover training to `0<p≤0.5` (§2.2.2, p.6); update fuser and prover, then repeat Algorithm 1 for T iterations (§2.3, p.6). The reported main training uses three iterations for Goedel-Prover-V2 and five for DeepSeek-Prover-V2, around 140 H100 hours for each training (§3.2, p.7)

Verus form
Inference: use a Rust-side generator for theorem statements, compile each candidate with Verus, and use verification success as the binary reward. Keep fuser and prover models separate. The GRPO mathematics and KL regularization are training infrastructure, not Verus constructs; the Verus portion is only the generated contract/proof checked by Verus.

evidence, trust, and threat
Table 1 (p.7) reports the MiniF2F and ProofNet pass@32 values above. The paper also reports an average relative improvement of 4.20% in the abstract, but the table contains model-specific absolute percentages; the denominator and baseline must be retained when quoting either.

## techniques for the catalog

- statement fusion — combine two existing NL problems, autoformalize the result, compile-check it, and retain harder solvable statements

- verifier-rewarded co-training — train a statement fuser to lower prover pass rate while training the prover to raise it, filtering by verifier outcomes

- soft statement-modification penalty — penalize but do not ban model changes to a formal statement, balancing self-correction against reward hacking
