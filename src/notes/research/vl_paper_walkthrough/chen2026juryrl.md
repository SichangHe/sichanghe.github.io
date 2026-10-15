# JURY-RL: Votes Propose, Proofs Dispose for Label-Free RLVR
(authored by agents unless marked 🧑)
Tag: `chen2026juryrl`, [paper](http://arxiv.org/abs/2604.25419v1)

JURY-RL separates cheap candidate proposal from expensive proof-gated reward disposal. Multiple model rollouts vote for a plurality answer; one formal verifier checks only that answer. Verified supporters receive positive reward. If verification is inconclusive, ResZero assigns a zero-mean, variance-preserving signal to residual answers instead of rewarding an unverified consensus. The abstract describes the central rule: “votes from model rollouts propose a candidate answer, and a formal verifier determines whether that candidate can receive positive reward” (Abstract, p. 1). The system is implemented with Lean; Verus mappings below are inferences.

## techniques

### vote once, verify the plurality

What it is: sample `G` rollouts for a prompt, parse each answer, compute vote shares, and select plurality answer `â`. Query the verifier once on `â`; do not verify every distinct answer. The paper says, “This design choice avoids the prohibitive cost of formally verifying every unique answer” (Section 1, p. 2).

How to do it: (1) sample `y_i ~ π_old(.|x)`; (2) parse answer `a_i`; (3) compute `v(a)` and `â = arg max_a v(a)`; (4) call `δ = verify(x, â)` once; (5) if `δ=1`, set `r_i = I[a_i = â]`; (6) otherwise use ResZero; (7) compute group-normalized advantages and update with GRPO. These are the ten lines of Algorithm 1 (Appendix B.1, p. 17).

Inference: for Verus, roll out candidate Rust/Verus proofs or patches, choose the plurality patch, and run Verus once on that patch. A successful run can gate reward for matching rollouts. This saves verifier calls but risks rejecting a correct minority patch when the plurality is wrong.

### ResZero fallback reward

What it is: when `δ=0`, discard the unverified plurality and distribute reward over residual answers using leave-one-out support. The construction subtracts a penalty from majority rollouts, gives residuals support-weighted rewards, and adds a global recentering term so rewards sum to zero. The paper states, “By construction, the total reward sums to zero” (Appendix A.2/B.2, pp. 16–17).

How to do it: let `M` be majority indices, `R` residual indices, `α=|M|/G`; compute each residual’s leave-one-out support `z_i` and residual mean `ū`; choose penalty `c`; set majority reward to `−cα + γ`, residual reward to `α(z_i−ū)+γ`, with `γ=cα²`; verify that `Σ_i r_i=0`; normalize advantages by group standard deviation; apply GRPO with clipped ratios and KL penalty. In the worked example, `G=8`, `|M|=4`, `α=0.5`, `c=0.1`, and rewards sum exactly to zero (Appendix B.2, p. 17).

Inference: a Verus agent can use this fallback when candidate verification fails or times out. Residual support can be based on syntactic patch clusters or shared proof obligations, but that clustering is not in the paper. Zero mean prevents a learning update from reinforcing an unchecked contract; it does not identify which residual is semantically correct.

### cascaded formal verifier

What it is: the Lean verifier has three components: an autoformalizer translating natural-language question/answer pairs into Lean specifications, a consistency checker comparing formalization to the original text, and a prover synthesizing a Lean proof. The paper states, “The architecture of this verification system ... is a cascaded, modular pipeline” (Appendix C.1, p. 18).

How to do it: generate up to eight formalizations; consistency-check them and select one; sample up to 16 proof attempts; accept `δ=1` only when a proof verifies. The setting uses Goedel-Formalizer-V2-32B, QwQ-32B, and Goedel-Prover-V2-32B at temperature 0.7 and maximum 32,768 tokens (Appendix C.2, p. 18).

Inference: for Verus, autoformalize a requirement into Rust specifications, run a consistency checker against the requirement, then ask a prover to synthesize Verus proof code and invoke Verus. This introduces a semantic translation trust boundary: Verus proves the generated specification, not that the specification faithfully captures prose.

### cached proof-gated reward

What it is: cache verification results so repeated question-answer pairs bypass expensive formal checking. The paper reports that “These cached results can be retrieved almost instantly” (Appendix C.4, p. 20).

How to do it: key cache entries by normalized prompt, formal specification, candidate answer, verifier version, and configuration; reuse only exact keys; invalidate on specification or verifier changes. Inference: a Verus cache should include Rust and dependency hashes plus the contract text, because changing either can invalidate a prior proof.

## evidence and boundaries

Main training uses 7,500 MATH training problems, 5,000 MATH5000 validation problems, batch 128, `G=8` rollouts, eight NVIDIA A100 GPUs, learning rate `3×10⁻6`, and KL coefficient `β=0.005` (Section 5.1, p. 5). Table 2 reports average pass@k and pass@1 over AIME, MATH500, GSM8K, and AMC; `k=16` for AIME, `k=4` for MATH/GSM8K, and `k=8` for AMC. JURY-RL average pass@k is 59.41, 48.48, and 64.04 for Qwen3-1.7B, Llama-3.2-3B, and Qwen2.5-7B, respectively, compared with GT-reward 55.36, 45.46, and 62.48 (Table 2, p. 7). These are benchmark averages, not proof-validity rates.

Verifier component evidence is explicit: the autoformalizer produced syntactically valid, type-checkable Lean statements for 477/500 MATH500 problems (95.4%); the consistency checker has 85.3% accuracy, 94.9% recall, and 91.1% F1 on MATH500 (Appendix C.3, p. 19). Held-out consistency F1 is 86.6% on ReformBench-859 and 84.9% on CriticleanBench; autoformalizer success ranges from 97.1% on miniF2F to 66.7% on AIME 2025 (Tables 6–7, p. 19). Failures conservatively produce `δ=0`, but lower coverage reduces reward density.

The Lean Prover@16 setting has 87.6% accuracy, 93.4% F1, and 324.31 seconds on MATH500; Prover@64 reaches 91.1% accuracy at 655.80 seconds; an LLM-as-judge baseline is 87.2% at 290.30 seconds (Table 8, p. 20). Cold-start JURY-RL adds about 200 seconds per 128-question step to a 100-second training step; caching reduces later cost (Appendix C.4, p. 20). The paper claims Lean prover false-positive rate 0%, but this is within its formalization and prover setup, not evidence that the autoformalizer preserves every requirement.

## what VL should reuse and threat

VL should reuse one-check-per-rollout-group scheduling, explicit inconclusive handling, zero-mean fallback rewards, cache keys that include specification and tool versions, and component-wise evaluation of requirement translation. It should not redo Lean-specific model names or math benchmark comparisons. Inference: threat to agent-written verified Rust is high at reward design and specification fidelity: plurality voting can reinforce a common but wrong contract unless Verus gates it, while a failed Verus run can be safely treated as inconclusive. The approach does not prove product requirements, external dependencies, or unsafe behavior; those remain trusted outside the checker.

## techniques for the catalog

- plurality proposal with one verifier call — vote among rollouts, then formally check only the plurality candidate
- ResZero fallback — penalize unverified consensus and redistribute a zero-mean signal over residual answers
- cascaded autoformalization verifier — translate, consistency-check, and prove before granting reward
- proof-result caching — reuse exact verifier outcomes with configuration-aware keys
Checked 2026-10-15 against paper chen2026juryrl: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
