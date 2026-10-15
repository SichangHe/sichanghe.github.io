# GAR: Generative Adversarial Reinforcement Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `wang2025gar`, [paper](https://arxiv.org/abs/2510.11769)

## scope and result
GAR trains a Lean 4 prover and a statement fuser together. Its central claim is an implicit curriculum: the fuser makes statements harder while keeping them solvable, and the prover learns to solve medium and hard statements. The paper reports 74.18% pass@32 on MiniF2F-Test for GAR on DeepSeek-Prover-V2-7B, versus 70.49% for that base model, and 80.33% for GAR on Goedel-Prover-V2-8B, versus 77.87% for the listed base. On ProofNet-Test (186 Lean 4 problems), GAR on DeepSeek-Prover-V2 reaches 25.81% pass@32 versus 22.58% for the base. The abstract states: “GAR introduces an implicit curriculum learning mechanism, which aligns task difficulty with the prover’s evolving capability.” (Abstract, PDF p.1)

## technique 1: statement fusion as an adaptive curriculum

what it is and when to use it
The fuser generates a single, harder natural-language theorem from two existing statements, then an autoformalizer turns it into Lean. Use this when a fixed theorem set leaves training examples too easy, too hard, or stale as the prover improves. The source repository has 793,243 NL statements from Lean-Workbook and Numina-Math (Method §2.1.1, PDF p.3). The paper’s summary is precise: “This process generates harder statements from existing ones.” (Method §2.1.1, PDF p.3)

how to do it
1. Sample two NL statements from the repository: `s_base=(s1_NL,s2_NL) ~ D_stat` (§2.1.1, p.3)
2. Ask the previous-iteration fuser to combine key ideas into one multi-step, solvable statement, `s_NL = Fuser_{i-1}(s_base)` (§2.1.1, p.3)
3. For thinking models, restart reasoning with the dedicated `<analysis>` indicator; the paper says direct native long-CoT use can overthink and degrade statement quality (§2.1.1, p.3)
4. Autoformalize `s_NL` to `s_FL`, then compile it with Lean 4. Discard grammatical or uncompilable statements (§2.1.1, p.3)
5. Generate 16 candidate proofs from the prior prover and run each through Lean. Compute empirical pass rate `p=n_pass/n` (§2.1.2, p.4)

The supplied fuser prompt explicitly requires analysis of overlapping knowledge, at least two key components from each problem, multi-step reasoning, solvability, and one proof problem in an MD code block (Figure 2, p.4). These are paper steps; the particular prompt must be adapted to Verus syntax if used there.

Verus form
Inference: represent the fuser’s output as a Rust/Verus theorem specification and ask a model to combine two existing specification statements into one. Autoformalization becomes generation of a Verus function signature with `requires` and `ensures`; compile-checking becomes Verus verification. Candidate proofs should be proof functions or executable functions whose contracts are checked, and failed verification should be discarded. Verus does not use Lean theorem syntax or Lean’s checker, so the NL fusion and adaptive-difficulty loop carry over, while the exact formalizer and proof language do not. The Verus reference documents `requires`, `ensures`, `spec fn`, and `proof fn`; it does not establish that an arbitrary generated Rust program is safe.

evidence and limits
GAR’s main table uses pass@32. MiniF2F-Test has 244 Lean 4 statements (§3.1.1, p.6); therefore 74.18% is a pass fraction over 244 benchmark statements under 32 samples per statement, not a fraction of training examples. ProofNet-Test’s reported 25.81% uses the paper’s benchmark setting; elsewhere the paper describes the Lean 4 translation as 186 problems (§4.1 in EconProver is a different paper, so GAR’s own dataset description should be checked when reproducing). The generation reward is `r_stat=(1-p)(1-m) I{p≠0}`, where `m` is the statement-modification rate (GAR §2.2.1, p.5). Thus unsolvable (`p=0`) statements receive zero reward, and modifications are softly penalized. The fuser trains with N=1024 generated statements per step and GRPO; the prover excludes statements with `p=0` or `p>0.5` (too easy) (§2.2.2, p.5). Figure 1 describes the verifier-mediated rewards: “The prover is rewarded for producing correct proofs on medium and high-difficulty statements, while the statement fuser is rewarded for generating harder but solvable problems.” (Figure 1 caption, p.2)

The paper’s own example shows generated Lean theorem statements and model proof plans, but those case studies do not prove that every generated statement is semantically meaningful beyond Lean compilation. Inference: a Verus deployment must define how to detect statement mutation, because Lean’s paper-specific modification signal has no automatic equivalent for arbitrary Rust text. Inference: reward hacking remains possible if a model changes the specification, invokes an overly permissive external contract, or exploits an autoformalizer bug.

## technique 2: adversarial GRPO co-training

what it is and when to use it
The fuser and prover optimize opposite objectives over the same verifier feedback. This is useful when one wants training pressure concentrated around the prover’s current frontier rather than random difficulty.

how to do it
1. Fuser: generate N=1024 statements; calculate each pass rate `p`, modification rate `m`, reward, normalized advantage, and GRPO clipped objective with a KL penalty to a reference fuser (§2.2.1, pp.4–5)
2. Prover: for each statement generate n=16 proofs; reward each as `1-0.5*m_proof`, normalize advantages, and optimize a separate GRPO objective (§2.2.2, p.5)
3. Filter prover training to `0<p≤0.5`; update fuser and prover, then repeat Algorithm 1 for T iterations (§2.3, p.6)

Verus form
Inference: use a Rust-side generator for theorem statements, compile each candidate with Verus, and use verification success as the binary reward. Keep fuser and prover models separate. The GRPO mathematics and KL regularization are training infrastructure, not Verus constructs; the Verus portion is only the generated contract/proof checked by Verus.

evidence, trust, and threat
Table 1 reports GAR’s relative MiniF2F gains and the ProofNet increase. The paper also reports an average relative improvement of 4.20% in the abstract, but the table contains model-specific absolute percentages; the denominator and baseline must be retained when quoting either. Trusted components remain the Lean kernel/checker, autoformalizer, reward instrumentation, base datasets, and the semantic correctness of statements. Inference: for VL, the technique threatens proof-generation cost and model differentiation, but does not remove the need for Verus specifications, trusted libraries, and human review of generated contracts. Existing VL should not redo generic adversarial curriculum mechanics without measuring a Verus-specific benchmark and mutation policy.

## techniques for the catalog

- statement fusion — combine two existing NL problems, autoformalize the result, compile-check it, and retain harder solvable statements

- verifier-rewarded co-training — train a statement fuser to lower prover pass rate while training the prover to raise it, filtering by verifier outcomes

- soft statement-modification penalty — penalize but do not ban model changes to a formal statement, balancing self-correction against reward hacking
Checked 2026-10-15 against paper wang2025gar: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
