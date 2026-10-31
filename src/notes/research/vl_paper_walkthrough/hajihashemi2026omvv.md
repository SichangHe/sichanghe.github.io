# Online Verification of Language Model Responses Under Cost Constraints
(authored by agents unless marked 🧑)
Tag: `hajihashemi2026omvv`, [paper](http://arxiv.org/abs/2610.02632v1)

## what the paper proves or measures
Inference: Hajihashemi and Shen study an online stream of candidate answers where a costly oracle gives ground truth, while cheaper weak verifiers have different accuracy and costs.  OMVV routes each round to one weak verifier, escalates uncertain answers to the oracle, adapts thresholds from oracle feedback, and learns routing weights with exponential updates.  The paper proves finite-horizon error bounds and sublinear expected regret, then evaluates the tradeoff on four datasets.

Quote (abstract, p. 1): “We introduce OMVV (Online Multi-Verifier Verification), an algorithm that maintains a pool of K candidate weak verifiers with differing cost and verification performance, and adaptively routes each round’s decision to a verifier selected via an online score combiner and an exponential-weights routing policy.”

## technique 1: two-threshold selective verification
Inference: Use this policy when accepting a wrong answer and rejecting a right answer have separate target rates and oracle calls are expensive.  For each verifier k, maintain a lower reject threshold τR and upper accept threshold τA with τR ≤ τA.  Compute a confidence score; reject when it is at or below τR, accept when it is above τA, and query the oracle in the interval.  Keep a separate pair because verifier scores have different scales (§4.1, pp. 4–5).

Inference: Add exploration: query the oracle with probability PA in the accept region and PR in the reject region even when the decision is already made.  This supplies feedback for thresholds that otherwise would never be labeled.  When feedback arrives, update τA on incorrect accepted answers toward target αI and τR on correct rejected answers toward αII, divide the update by the query probability qt for unbiased partial feedback, and use max/min projections to preserve τR ≤ τA (Equations 6–8, p. 5).

Quote (§4.1, p. 5): “The action taken at round t follows directly from this region: in the Accept region the response is accepted, in the Reject region it is rejected, and in the Uncertain region, the oracle is queried and its label gt determines the action.”

Inference: In Verus, this maps to a trusted-oracle boundary around a verified predicate: prove that the accept branch satisfies its postcondition, prove that the reject branch establishes a countercondition, and call an external checker for the uncertain branch.  This is an inference because Verus does not provide an online threshold primitive.  The oracle result must enter a specification or trusted contract; merely branching on an unchecked runtime score does not make Rust verified.

## technique 2: combine verifier confidence and candidate agreement
Inference: For each query, generate M candidate responses, then compute the fraction at of the other candidates that agree with the current response.  Combine this agreement with verifier k's raw score uk,t by fitting a verifier-specific logistic regression, sk,t = σ(β0 + β1uk,t + β2at), on that verifier's oracle-labeled history (§4.1, p. 4).  Refit as more labels arrive.

Quote (§4.1, p. 4): “In addition to the raw score, we also use agreement as a second signal of correctness, computed from the generator’s own outputs and independent of any verifier’s judgment.”

Inference: In a Verus system, agreement can prioritize which candidate implementation to verify, but it is evidence for scheduling, not a proof premise.  A sound design keeps the generated Rust and its specification as the verification input and treats model agreement as an untrusted heuristic.

## technique 3: exponential-weights routing under partial feedback
Inference: Initialize each of K verifiers with weight 1/K, normalize weights to a sampling distribution, sample one verifier, and observe its score only when it is selected.  Define loss as λ(score − oracle label)^2 + (1−λ)cost.  Use an importance-weighted estimate for the sampled verifier and queried-oracle event, add the known cost for every verifier, and update every weight multiplicatively with exp(−ηH loss estimate) (§4.1, Equations 9–10, p. 5).

Inference: This is a bandit-feedback method: querying every verifier would destroy the savings, while the fixed cost term is full information.  The paper's Algorithm 1 (p. 6) therefore routes, scores, tests the region, optionally queries, updates the selected thresholds, and then updates all routing weights in that order.

Quote (§4.1, p. 5): “The routing weights are updated separately, and every round, for every verifier, not only the sampled one.”

Inference: A Verus implementation would keep routing outside the proof-critical path and verify each selected candidate separately.  The proof obligation should quantify over any route chosen by the scheduler; routing weights cannot be a trusted assumption about program correctness.

## evidence and limits
Inference: Theorem 1 states that with probability at least 1−δ, pooled false-accept and false-reject rates are each bounded by their targets plus finite-sample slack terms (§5, p. 6).  The paper says this holds "with no assumption on the stream, the generator, or the verifiers" (§5, p. 6); the slack terms are given in Appendix A.1, whose Lemma 1 requires exploration probabilities PA, PR > 0 (so qmin > 0), and the slack shrinks as per-verifier sample counts grow.  Theorem 2 gives expected regret O(√(T log K · (λ²K/qmin + 1−λ²))) against the best fixed verifier in hindsight under the loss of Equation 4; qmin is "the smallest probability, over the whole horizon, with which the oracle is queried" and the bound is O(√T) for fixed K, λ, qmin > 0 (§5, p. 6).

Quote (§5, p. 6): “Theorem 1 (Error control). Fix a horizon T ≥ 1. For any δ ∈ (0, 1), with probability at least 1 − δ, ErrI (T ) ≤ αI + ∆Ipool (T, δ), ErrII (T ) ≤ αII + ∆II pool (T, δ).”

Inference: Main experiments use K=2 weak verifiers, Qwen2-1.5B and Qwen2.5-3B, with normalized costs 0.10 and 0.20 against oracle cost 1.0. GPT-4o is the oracle for MATH and TriviaQA; deterministic graders are used for Zebra Logic and DeepMind Mathematics. Each problem has M=5 generated responses. Table 1 pools easy and hard subsets at αI=αII=0.2: OMVV accuracy/cost are 0.7325/0.3080 on MATH, 0.8550/0.3659 on Zebra Logic, 0.8325/0.2778 on TriviaQA, and 0.9667/0.2627 on DeepMind Math. The problem counts in §6 (p. 7) are 400 for MATH, 200 for Zebra Logic, 400 for TriviaQA and 600 for DeepMind Mathematics.  ErrI is the fraction of rounds with gt=0 that were accepted, and ErrII the fraction of rounds with gt=1 that were rejected (Equations 2–3, pp. 3–4), so neither is an accuracy complement; the paper defines accuracy as "the fraction of problems solved correctly" (§6, p. 7).  Table 1 is on p. 8.

Inference: On MATH, the single-verifier baselines have false-accept rates 0.7655 and 0.5848, while OMVV reports 0.1649 and false-reject 0.1919; these are Table 1's pooled easy/hard settings. In the nonstationary MATH experiment, block size B=1 alternates difficulty every problem; OMVV reports accuracy 0.7250, average error 0.1493, oracle frequency 0.1250, and cost 0.2383 (Table 2, p. 9; text on p. 8). The paper also reports that the probability of routing to the cheaper verifier (Qwen2-1.5B) falls from 0.551 on easy MATH problems to 0.190 on hard ones (Figure 1, p. 7; §6.1, p. 8).

Inference: The oracle itself is GPT-4o for two datasets, so those results inherit an LLM judge's errors; normalized grader cost 1.0 is an author-defined comparability convention.  The evaluation has two weak verifiers and fixed candidate-generation budgets, and does not test compiler-checked code, adversarial route manipulation, specification mistakes, or dependence on external libraries.  The theoretical bounds control realized rates with slack; they do not guarantee zero errors.

Inference: For agent-written verified Rust, the remaining product exposure is moderate: OMVV can schedule checks cheaply, yet a selected low-cost route may still pass a wrong program or an underspecified contract.  Verus should remain the final verifier, with the oracle modeled as an explicit trusted boundary and with all accepted candidates compiled and proved.  The routing regret result does not transfer automatically to proof validity.

## techniques for the catalog
- two-threshold selective verification — accept above an upper score, reject below a lower score, and escalate the uncertain interval with exploration feedback
- agreement-augmented scoring — combine verifier confidence with agreement among independently generated candidates
- partial-feedback exponential routing — sample one verifier, importance-weight its observed loss, and update all routing weights with exponential weights
- finite-horizon error and regret analysis — bound false accepts/rejects with slack and compare routing cost to the best fixed verifier
