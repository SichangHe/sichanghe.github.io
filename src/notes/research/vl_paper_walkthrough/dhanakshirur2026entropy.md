# Entropy Regularization: A Free Correction to Cross-Entropy for Verified Demonstrations
(authored by agents unless marked 🧑)
Tag: `dhanakshirur2026entropy`, [paper](https://arxiv.org/abs/2609.30572)

## problem and formal result
The paper studies training from one verified demonstration when several outputs may be accepted. Cross-entropy rewards probability on the observed answer, whereas verifier risk also penalizes probability assigned to wrong outputs. Its counterexample uses X=N, Y={1,2,3}, a true hypothesis u assigning (1/2,1/2,0), and hypotheses that assign 5/8 to the observed label plus 1/8 elsewhere. On every distinct sample, empirical CE chooses the over-support hypothesis even though u is true (section 3.2, pp. 4–5). The paper states: “The empirical cross-entropy minimizer ACE fails to PAC-learn H” (Proposition 3.2, p. 5).

The proposed loss is entropy-regularized cross-entropy (ER-CE): −log p(y) + λ Sα(p), where Sα is a differentiable Rényi/Shannon-entropy proxy for support size (Definition 4.4 and Theorem 4.5, pp. 6–7). Under finite induced support class |R_H|<∞ and a nonzero probability floor η, λm increasing to infinity and αm decreasing to zero yield PAC learning. The theorem’s assumptions matter: the probability floor is justified for finite vocabulary and maximum sequence length in the LLM-verifier setting (Assumption 4.3). The proof explains, “This transformation is crucial because even though H may be infinite and cross-entropy may overfit to the sample, the class of functions LH is finite and will generalize as the sample size increases” (proof sketch, p. 8).

Inference: for VL, this is a training-objective technique for making generated Rust concentrate probability on verifier-accepted programs; it does not itself verify Rust or establish that the verifier specification is correct.

## technique 1: diagnose CE/support mismatch
When to use: use when demonstrations are correct but non-unique and the downstream checker accepts a set of outputs. The paper’s counterexample shows CE can prefer a hypothesis that puts positive mass on an extra wrong answer because the sampled answer receives higher probability.

How to apply:
1. Define verifier risk over probabilities assigned outside the accepted support (section 3.1).
2. Compare it with CE, which sees only p(y) for observed y (section 3.2).
3. Construct or test whether an empirical CE minimizer enlarges support; in the example, h_g gives 5/8 to each sampled answer versus u’s 1/2 (Proposition 3.2).
4. If enlarged support causes verifier loss, add a support-sensitive penalty.

Verus form: Inference: this diagnostic can be applied to a corpus of candidate Rust programs by defining the accepted set through a Verus verification result and measuring probability on candidates that fail. Verus does not expose a differentiable policy loss; training remains outside Rust, while verified contracts remain the acceptance criterion.

## technique 2: ER-CE with a support proxy
What it is: add λSα(p) to token-level CE. S0 equals support size; S1 is exp(Shannon entropy); intermediate α gives a differentiable proxy (Definition 4.4).

How to apply:
1. Choose a hypothesis class with finite induced support class and a probability floor η (Assumptions 4.2–4.3).
2. During fine-tuning, compute −log probability of each demonstrated token plus λ times entropy proxy over the response distribution (section 5 and Appendix D).
3. Increase λ with sample size and decrease α toward zero as in Theorem 4.5; a concrete corollary sets λm=m and αm=1/m (Corollary 4.6, p. 8).
4. Tune λ empirically because excessive penalty over-sharpens the policy (MBPP results, section 5.2).

Verus form: Inference: use ER-CE only to select candidate implementations, then run Verus on generated Rust and retain only candidates whose `requires`/`ensures` contracts verify. The loss’s entropy math would need an external training implementation; Verus can verify a fixed-point or bounded implementation, not gradient updates.

Evidence: theory gives PAC learnability under the stated assumptions, with a Hoeffding sample bound depending on |R|, η, ε, and δ (proof sketch, p. 8). Experiments use Qwen2.5-1.5B-Instruct with LoRA. GSM8K Pass@1 rises from 0.4912±0.0154 at λ=0 across five seeds to 0.5816±0.0161 at λ=8 (Table 1, section 5.1), an absolute difference 0.0904. MBPP greedy Pass@1 rises from 0.5270±0.0103 to 0.5710±0.0058 at λ=1 across five seeds, +0.0440 (Table 2, section 5.2). MATH uses Qwen2.5-7B-Instruct, three seeds: 0.4200±0.0071 baseline to 0.4717±0.0118 at λ=4, +0.0517 (Table 3, section 5.3). These denominators and models are setting-specific; they are not proof of universal gains.

## technique 3: execute against a verifier and evaluate accepted outputs
The MBPP experiment evaluates generated Python by dynamic execution against hidden assertions (section 5.2). MATH uses symbolic equivalence rather than string equality (section 5.3). The workflow is:
1. Fine-tune on one demonstration per problem with CE or ER-CE.
2. Generate one greedy response.
3. Execute code or check symbolic answer with the task verifier.
4. Report Pass@1 across seeds and penalty values.

Inference: for VL, replace execution with Verus verification of Rust contracts, and report the denominator (problems, seeds, model, and λ). A failed compile or failed proof is a rejected candidate; do not infer semantic correctness from text similarity.

## trusted boundary, contradictions, and threat
The theorem trusts the finite support class, η floor, and realizability assumptions; it proves a learning guarantee for a surrogate, not that a real verifier accepts the intended behavior. The empirical section says “At its peak, ER-CE outperforms standard CE by around 9%” (section 5.1), matching 0.5816−0.4912=0.0904, but “around” is rounded. MATH’s +5.17% is 0.4717−0.4200=0.0517. Inference: product threat is objective misalignment—an agent may imitate one verified example while emitting many unverified variants. ER-CE may improve candidate quality but cannot replace a sound verifier or specification review. The paper’s future work notes that selecting regularization strength is still difficult.

## techniques for the catalog
- support-mismatch diagnosis — compare CE’s observed-label objective with verifier risk over rejected support
- entropy-regularized CE — add λ times differentiable support proxy and schedule λ upward, α downward
- verifier-based evaluation — execute or symbolically check outputs and report Pass@1 with model, seeds, and denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
