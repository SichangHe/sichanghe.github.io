# More Claims, Less Evidence: Bounded Verification of AI-Generated Digital Knowledge Artifacts
(authored by agents unless marked 🧑)
Tag: `banka2026claims`, [paper](http://arxiv.org/abs/2610.05547v1)

## scope and result

Bańka and Chudziak study what a successful check of only some claims tells a receiver about an entire generated artifact. The paper models an artifact with `n` auditable claims, a uniformly sampled audit of `b` claims, prior probability `p` that the artifact is reliable, and (for a bad artifact) `f` false or unsupported claims. Its central measure is the Predictive Value of Pass (PVP), the posterior probability that the artifact is reliable after every audited claim passes. The authors state: “The central question is therefore what a successful partial check implies about the reliability of the complete artifact when its size grows but the verification budget does not.” (Abstract, p. 1)

The paper's main formal result is that, with fixed `b` and `f`, PVP weakly decreases as `n` increases. The mechanism is that a fixed number of errors is diluted among more claims. The authors summarize the operational consequence: “A partial audit should not be treated as proof that the whole object is reliable: its value depends on object size, audit budget, and whether errors are sparse.” (Section 5, p. 8) This is a receiver-side model: it does not claim to improve a verifier's ability to establish an individual claim.

## technique 1: predictive value of pass (PVP)

definition

The audit passes when none of the `b` sampled claims is false or unsupported. For a bad object, the paper defines the probability of this event as `q(n,f;b) = C(n-f,b)/C(n,b)`. For a good object, pass probability is one. Bayes' rule gives `PVP(n,f;b) = p / (p + (1-p)q(n,f;b))`. PVP is evidence strength after a pass, not the pass rate itself. The paper explicitly warns: “An artifact can become more likely to pass as it grows, while the fact that it passed becomes less informative about its reliability.” (Section 3.1, p. 4)

when to use it

Use PVP when a reviewer can inspect only a bounded sample and must decide whether the whole object is reliable enough for release or downstream use. Set the prior `p`, the object size `n`, the assumed number of problematic claims `f`, and the audit budget `b`; calculate the posterior after a clean sample. The model assumes uniform sampling without replacement and binary reliable/bad types.

how to apply it

1. Count the auditable claims (`n`) and choose the number inspected (`b`).
2. Specify a prior `p` for a reliable object and a bad-object error count `f`.
3. Compute `q` as the hypergeometric probability that all sampled claims come from the `n-f` non-errors.
4. Compute PVP with Bayes' formula.
5. Compare PVP with the release threshold. If accepting a reliable artifact gives value `V` and accepting an unreliable one gives loss `L`, the paper derives threshold `τ = L/(V+L)` and says acceptance after a pass is justified only when PVP is at least `τ` (Section 3.2, p. 5).

evidence and limits

This is an analytic model, not an empirical estimate of LLM error. Its evidence is the derivation of the hypergeometric probability and Bayes' rule. The authors restrict the main interest to sparse errors, writing: “We focus on sparse-error settings, where f ≪ n, since a small number of problematic claims may then be hidden inside a large output.” (Section 3.1, p. 4) Unequal claim importance, correlated errors, non-uniform inspection, imperfect verification, and natural generated objects are outside the evaluation (Section 5, p. 8).

Verus form (Inference: the paper is not about Verus)

Inference: represent an audit result as a Rust/Verus value containing `n`, `f`, and `b`, and define a pure `spec fn` for the combinatorial probability or an integer-safe equivalent. State `requires` bounds such as `1 <= b <= n` and `1 <= f <= n`; state `ensures` for the posterior formula or monotonicity. Use `assert` and `proof fn` lemmas to discharge algebraic properties. Do not treat a `proof fn` as runtime computation: a production review tool would calculate an approximation outside proof code and use the proof only to establish its stated bounds. This inference preserves the paper's assumptions but does not prove that generated claims are actually independent or uniformly sampled.

## technique 2: evidentiary dilution and monotonicity

purpose and trigger

The paper's Proposition 1 proves that PVP weakly decreases as artifact size grows while `b` and `f` stay fixed. It rewrites the bad-pass probability as a product, `q = product(j=0..b-1) (n-f-j)/(n-j)`, once `n-f >= b`; every factor increases with `n`, so `q` increases and PVP decreases. This technique is useful for a capacity policy: it shows that a fixed review budget cannot preserve the evidentiary meaning of a pass as outputs grow.

steps

1. Hold `b` and `f` constant and ensure `n >= max(b,f)` (Section 3.2, p. 4).
2. If `n-f < b`, set `q=0`, because every sample must contain an error.
3. Otherwise use the product form and show each factor is nondecreasing in `n`.
4. Substitute the resulting nondecreasing `q` into the PVP formula; posterior reliability therefore weakly decreases.
5. For sparse errors, use the paper's approximation `q ≈ exp(-bf/n)` and budget rule `b ≈ (n/f) log(1/q0)` to scale audit effort (Section 3.2, p. 5).

evidence

The proposition is a mathematical proof. The paper's practical inverse calculation reports, for `p=0.5` and `f=2`, PVP at least 0.8 requires checking 5 of 10 claims but 40 of 80; PVP at least 0.9 requires 7 and 53 respectively (Section 3.3, p. 5). These denominators are the artifact sizes, not numbers of objects.

Verus form (Inference)

Inference: encode the product or its integer combinatorial cross-multiplication as `spec fn`; prove monotonicity with a `proof fn` whose `requires` state the bounds and whose `ensures` relates `pvp(n+1,f,b)` to `pvp(n,f,b)`. this result is pure mathematics and needs no mutable-state invariant. Floating-point logarithms should remain outside the proof unless replaced with rational bounds.

## technique 3: controlled bounded-audit experiment

experimental recipe

The authors construct benchmark-derived artifacts so capacity effects are separated from verifier accuracy. Supported claims are reliable; refuted and not-enough-information claims are false or unsupported. They use FEVEROUS for structured evidence and FEVER as a text-only robustness check. Configurations are `n ∈ {10,20,40,80}`, `f ∈ {1,2,5}`, `b ∈ {3,5,10}`, and `p=0.5`; for each latent type and configuration they construct 1,000 objects and run 20 independent audits per object with a fixed random seed (Section 4.2, p. 6). Each audit samples uniformly without replacement and passes only if all sampled claims are supported.

The principal true-claim-padding result uses FEVEROUS, `b=5`, `f=2`: increasing `n` from 10 to 80 raises the bad-pass rate from 0.220 to 0.880, lowers PVP from 0.820 to 0.532, and raises overall pass rate from 0.610 to 0.940; coverage falls from 50% to 6.25% (Section 4.3, p. 7). With `f=5`, bad-pass rate changes from 0.003 to 0.720 and PVP from 0.997 to 0.581. For budget sensitivity at `n=80,f=5`, increasing `b` from 3 to 10 changes bad-pass rate from 0.819 to 0.500 and PVP from 0.550 to 0.667 (Section 4.3, p. 7). For sparse versus proportional errors, `f=2` gives PVP 0.817 to 0.531 as `n` goes 10 to 80, whereas `f=ceil(0.20n)` gives 0.819 to 0.761 (p. 8). The reported fractions and percentages are internally consistent for the stated coverage values.

Verus form (Inference)

Inference: a Verus model can represent a finite `Vec<bool>` of support labels, specify that an audit index set has distinct indices and length `b`, and prove that a pass means every selected label is supported. A `forall` specification over indices and a loop `invariant` can connect an executable sampler to the abstract set, but random sampling and Wilson confidence intervals are trusted runtime experiment code unless separately modeled. Verus can prove the deterministic audit predicate; it cannot, from this paper alone, prove the empirical frequencies.

## what is proved, trusted, and still missing

The paper proves the PVP formula, the dilution proposition, and the budget relation; its experiments measure simulated pass rates against gold labels. Trusted elements include the prior, the bad-object error count, uniform sampling, perfect labels for sampled claims, and the benchmark label pools. The authors state: “It separates the effect of verification capacity from verifier error but does not evaluate real objects generated by LLMs or human fact-checking.” (Section 5, p. 8)

Inference: for VeruLaw, the direct threat is calibration failure: a verified Rust component may pass selected checks while unverified generated specifications or surrounding claims remain wrong. The paper does not measure agent-written Rust, compiler soundness, or proof completeness. Existing VL work should therefore reuse the paper's distinction between a checked sample and whole-artifact reliability, but should not redo this exact Bayesian derivation; it should instantiate it with code obligations, claim criticality, and evidence from Verus runs. The method's product threat is high when review budgets stay fixed while generated code, specs, and lemmas grow, and lower when release gates scale checks with artifact size or require full verification of safety-critical obligations.

## techniques for the catalog

- PVP posterior: compute the posterior reliability of an artifact after a bounded, clean sample using the paper's hypergeometric bad-pass probability and Bayes' rule

- evidentiary-dilution proof: prove that fixed-budget, fixed-error audits become weaker as artifact size grows, then derive a budget that preserves a target PVP

- benchmark bounded-audit experiment: construct labeled objects, vary size, error count, and audit budget, and compare empirical bad-pass rate and PVP with the exact model
Checked 2026-10-15 against paper banka2026claims: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
