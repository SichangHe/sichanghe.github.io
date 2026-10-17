# Fresh Masking Makes NTT Pipelines Composable: Machine-Checked Proofs for Arithmetic Masking in PQC Hardware
(authored by agents unless marked 🧑)
Tag: `iskander2026fresh`, [paper](https://doi.org/10.5281/zenodo.19705451)

## what the paper proves

The paper formalizes arithmetic masking for Cooley--Tukey NTT pipelines over `ZMod q` in Lean 4 with Mathlib. Its three central results are: an r-bearing bridge from value-independence to constant marginal histograms; per-context uniformity of every masked butterfly output; and composition of any k-stage pipeline with fresh masks at every stage. The results quantify over every positive modulus, not only the ML-KEM modulus 3329 and ML-DSA modulus 8380417. The paper also proves a counterexample to pointwise value-independence, which is the wrong property for butterfly outputs.

The formal artifact has nine theorems (the Section 8 table lists seven), about 580 lines, 1,738 build jobs, zero `sorry`, zero `admit` and zero unverified axioms, using Lean 4.30.0-rc1 and a pinned Mathlib commit (Section 8, p. 12). The full mutual-information equation is an observation rather than a formal theorem because Mathlib lacks entropy definitions. The full marginal over all randomness is not formalized for any k: the paper states the summation over contexts, and `single_stage_full_marginal` (k=1) proves only that, for fixed input shares, the mask count is 1 for both secrets (Section 6.4, pp. 11--12). The full summation is described as standard but not mechanized.

## technique: arithmetic masking and the ISW probing model

What it is: represent a secret `s` in `Z_q` as shares `(s0,s1)` with `s0+s1=s (mod q)`, where `s1` is uniformly random. In the first-order probing model, an adversary observes one wire per clock cycle and may choose stages adaptively. Fresh inter-stage randomness prevents information accumulation across cycles.

When to use it: use this model for first-order side-channel analysis of masked NTT hardware. It does not cover second-order probing (the paper notes that probing wires 0 and 2 together reveals `a' - b'` because the output pair shares one mask, Section 6.4, p. 11), glitch or transition leakage, timing leakage, or random-probing variants.

How to do it: (1) sample a fresh share; (2) compute the complementary share; (3) implement each arithmetic stage on shares; (4) inject fresh output and re-masking randomness at every stage boundary; (5) define security as distributional independence of any one observed wire from the secret. The paper states, “For first-order security (t = 1), any single wire must have a distribution independent of the secret.” (Section 2.1, p. 3)

Verus form: Inference: represent shares and randomness in a ghost model with `spec fn`s for share-sum and distributions; prove share-sum preservation with `ensures` on each transition. Verus can verify deterministic arithmetic and finite-count arguments, but a probability distribution and adaptive-probe semantics need a separately specified model.

Evidence and limits: the paper's scope is the standard ISW first-order model. It explicitly excludes robust probing, transition leakage and random probing (Section 2.4, p. 4; timing is excluded in Section 10 (iii), p. 13). Inference: a product claim about physical leakage would exceed this model unless hardware timing and intermediate signals are also verified.

## technique: r-bearing value-independence bridge

What it is: extend a wire function with a fresh-randomness parameter `r : Fin rho`. `ValueIndependentR` requires that, for every input share and randomness value, changing the secret leaves the wire output unchanged. Theorem 4.1 proves that the marginal histogram over `(s1,r)` is constant in the secret, for every positive q, rho, wire function and output type.

How to do it: (1) define `WireFunctionR q rho beta`; (2) define the value-independence predicate; (3) define a histogram by filtering all `(s1,r)` pairs that produce output `v`; (4) rewrite the filter predicate using value-independence; (5) use congruence to show the filtered sets, and hence cardinalities, are equal; (6) define `MutualInfoZero` as constant marginal and derive it as a corollary. The artifact's five-line proof uses `congr 1`, extensionality over pairs, and rewriting by the hypothesis.

Verus form: Inference: define a finite histogram as a `spec fn` over a sequence of share/randomness pairs; require a `ValueIndependentR` predicate and prove equal filtered sets with sequence extensionality. A `proof fn` can establish constant counts, while the information-theoretic interpretation remains a separately stated lemma.

Evidence and limits: The paper says, “The full version with fresh randomness r follows by the law of total probability. This bridging step is not formalized here.” (Section 4.1, p. 6, quoting the prior limitation). This work formalizes the histogram bridge but treats equivalence to Shannon mutual information as Observation 4.1 because Mathlib lacks entropy (Section 4.3, pp. 6--7). Inference: the proxy is useful for finite counting, but it is not a formal proof of `I(x;w)=0` in this artifact.

## technique: reject pointwise value-independence for butterflies

What it is: pointwise value-independence asks whether a wire's value stays fixed when secrets change and masks are held fixed. The paper formally proves this property false only for the instance q=5, twiddle 1 (Theorem 5.1), with a decide-friendly witness: zero inputs and masks, changing `a` from 0 to 1, so wire 0 changes from 0 to 1. For any q>1 and any twiddle it states the generalization in prose (wire 0 depends on `a` when `m` is fixed); that general statement is not a Lean theorem in the paper.

When to use it: use this counterexample as a diagnostic warning. A solver reporting pointwise failure for a butterfly has found a false alarm, not a side-channel proof.

How to do it: (1) define the pointwise predicate; (2) instantiate q=5 and twiddle 1; (3) supply the concrete shares and masks; (4) evaluate wire 0 for two secrets; (5) derive contradiction from unequal residues. The paper's prose gives the reason: wire 0 is `a + tw*b - m`, so it depends on `a` when `m` is fixed.

Verus form: Inference: encode the predicate as a `spec fn` and prove its negation with a concrete `assert` witness in a `proof fn`. Use this only to prevent an incorrect verification criterion; it is not a security proof.

Evidence and limits: Theorem 5.1 is named `butterfly_vi_pointwise_false` (Section 5.1, p. 7). The authors warn that ignoring such failures for affine stages could cause designers to dismiss real failures in nonlinear components. Inference: the warning depends on the exact wire model and does not address physical leakage from unmodeled internal signals.

## technique: per-context butterfly uniformity

What it is: define `ButterflyMarginalVI` by counting, for every output wire and target value, the masks `m` that produce that value while input shares and secrets vary. Theorem 5.4 proves the count is exactly one for every wire, modulus q>0, twiddle factor, input shares and target value. Wires 0 and 2 have form `c-m`; wires 1 and 3 expose `m`.

How to do it: (1) define the butterfly outputs and wire selector; (2) fix all secrets, input shares and target value; (3) filter `ZMod q` masks by equality to the target; (4) split on the wire index with `fin_cases`; (5) use the singleton solution `m=c-v` for `c-m=v` or `m=v` for direct wires; (6) close with `Finset.card_singleton`; (7) conclude both secret contexts have count one. The paper's Lean code unfolds the selector, splits four cases and applies `filter_sub_eq_singleton` or `filter_eq_singleton`.

Verus form: Inference: implement a finite mask domain and prove a unique-solution lemma for affine equations. Use `requires` for q>0 and `ensures` that the filtered support has cardinality one. The proof needs modular arithmetic lemmas; it does not need a probabilistic solver once uniform sampling is specified.

Evidence and limits: The theorem is universal over composite moduli such as q=6 as well as prime PQC moduli (Section 5.3, p. 8). The paper states, “The key insight is that both sides equal 1.” (Section 5.2, p. 8). Inference: this is per-context uniformity, not yet the full marginal over all randomness or a physical side-channel guarantee.

## technique: compose a fresh-masked NTT pipeline

What it is: model a pipeline as `Fin k -> ButterflyStage q`. Each stage has a fresh butterfly mask and two fresh re-masking values for the a and b paths. Re-masking maps `(a0,a1,b0,b1)` to `(a0-rA,a1+rA,b0-rB,b1+rB)`, preserving each share sum. `PipelineUniform` requires that, with all randomness except the observed stage's butterfly mask fixed, exactly one mask yields each output value.

How to do it: (1) define stage randomness and recursive `pipelineStateAt`; (2) at stage 0 apply the butterfly; (3) at stage n+1 re-mask the previous output then apply the next butterfly; (4) prove `pipelineStateAt_update_future`, that changing a later mask cannot affect an earlier state; (5) induct on the observed stage; (6) use the butterfly singleton theorem at the selected stage. At stage 0, `update_self` exposes the selected mask; at later stages, `update_of_ne` plus the invariance lemma does the same.

Verus form: Inference: represent pipeline states and per-stage randomness as finite sequences; define recursive state computation as a `spec fn`. Prove a stage-indexed `invariant` that future randomness does not alter prior states, then prove unique-mask output counts by induction. Use `ensures` to state share-sum preservation and `old(...)` for pre-state values.

Evidence and limits: Theorem 6.2 proves the composition property for all q>0 and k>=0 (Section 6.3, p. 10). The paper's proof suite includes `pipelineStateAt_update_future` and `ntt_pipeline_composition`. Full marginalization over all `q^(3k)` random assignments is not formalized for general k (the paper cites the size of the `Fintype` instance); for k=1, `single_stage_full_marginal` covers only the per-context count for fixed input shares, and the sum over `(a_1,b_1)` contexts is not formalized (Section 6.4, pp. 11--12). Inference: the theorem's formal scope is per-context uniformity, from which the authors explain the full first-order result by a finite sum.

## technique: diagnose an implementation against the fresh-mask hypothesis

What it is: compare an RTL architecture's random-mask schedule with the theorem's assumptions. The paper reports that Adams Bridge masks only INTT round 0; later rounds lack fresh inter-stage masks. Therefore the theorem does not apply.

How to do it (Inference: this procedure is derived from the paper's diagnosis, not a method the paper states): (1) inspect the control signal and stage registers; (2) identify whether each stage receives an independent fresh mask; (3) compare the implementation with the pipeline model; (4) if a stage boundary violates the hypothesis, withhold the composition guarantee; (5) use structural dependency or empirical analysis to investigate the resulting exposure. The paper distinguishes intra-stage share combination (`u10_combined = s_0 + s_1` in `ntt_mlkem_masked_butterfly1x2.sv`, lines 89-92) from this inter-stage failure; the RTL findings are the authors' claims, which I did not check against the Adams Bridge source.

Verus form: Inference: represent the mask schedule and stage transition in a specification; make fresh-mask availability an explicit `requires` condition on a verified pipeline constructor. Prove that an RTL extraction or configuration satisfies this condition before applying the uniformity lemma.

Evidence and limits: Section 7 reports `masking_en_ctrl` active only when `rounds_count == 0`, with rounds 1--3 unmasked (Section 7.1, pp. 11--12; the paper cites `ntt_ctrl.sv` lines 264-272). The paper says this violates Theorem 6.2's hypothesis; it does not provide a new quantitative leakage denominator for Adams Bridge here. Inference: the theorem identifies a root cause but does not by itself measure attack success.

## what remains outside the proof

The paper explicitly limits itself to affine butterfly operations, first-order standard probing, four butterfly output wires, and per-context counts. It does not formalize intermediate re-masking wires, full entropy, higher-order security, robust probing, transition leakage, timing, or nonlinear arithmetic such as Barrett reduction and masked multiplication. It cites companion manuscripts for PF-PINI results, but those are not this paper's proofs. The artifact build is reproducible under the pinned Lean and Mathlib versions and reports 1,738 jobs with zero errors and warnings.

Inference: the proved invariant gives a strong compositional contract for linear arithmetic stages. Threat to agent-written verified Rust is high for the narrow property if a design omits fresh masks, but lower for the modeled first-order output-wire property when the mask schedule and arithmetic implementation satisfy the contract. Inference: VL should reuse the explicit-hypothesis pattern—make randomness freshness, stage independence and leakage model preconditions—and should not claim protection against higher-order or physical leakage from this result alone. The paper has already supplied the affine composition proof; repeating it without connecting to a concrete Rust or RTL implementation would add little.

## techniques for the catalog

- r-bearing bridge — add fresh randomness to value-independence and prove constant marginal histograms by finite-set equality
- pointwise-VI counterexample — reject the false fixed-mask criterion with a concrete butterfly witness
- butterfly uniformity — prove each output value has exactly one fresh-mask preimage over every positive modulus
- fresh-mask pipeline composition — use future-mask invariance and induction to lift per-stage uniformity to k stages
- mask-schedule auditing — compare an implementation's stage-boundary randomness with theorem preconditions
- explicit proof-scope accounting — separate per-context results from unformalized full marginal, higher-order and physical claims
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The NTT butterfly is the arithmetic analog of XOR: a linear operation that trivially preserves uniformity."): I read the whole paper text and the whole study and checked the quotations, numbers (nine theorems, about 580 lines, 1,738 jobs, Lean 4.30.0-rc1, q values), section and page references, and each technique's steps against Sections 2 and 4 to 10. I changed: the claim that full summation is proved for one stage (the paper formalizes only the per-context count even for k=1), the claim that pointwise value-independence is proved false for every butterfly (formal proof only for q=5, twiddle 1), several page references (Section 2.4 p. 4, Section 5.1 p. 7, Theorem 6.2 p. 10), the note that the Section 8 table lists seven of the nine theorems, and the labeling of the audit procedure as Inference. The link is the Zenodo DOI of the artifact snapshot given in Section 9 of the paper, not a paper landing page; the repository name in the paper mentions arXiv 2604.20793, which I did not verify. I did not check the Lean artifact, the Adams Bridge RTL, the cited references, or the companion manuscripts.
