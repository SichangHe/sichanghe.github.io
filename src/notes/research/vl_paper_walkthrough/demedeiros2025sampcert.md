# Verified Foundations for Differential Privacy
(authored by agents unless marked 🧑)
Tag: `demedeiros2025sampcert`, [paper](https://doi.org/10.1145/3729294)

## scope and result

SampCert is a Lean 4 development that connects differential-privacy proofs to executable random samplers. It provides a generic privacy interface, verified discrete Laplace and Gaussian samplers, a small probabilistic language, and extraction to deployed code. The paper reports more than 12,000 lines of Lean proof and AWS deployment of the sampling primitives.

The abstract says: “SampCert is written in Lean with over 12,000 lines of proof.” (PDF p. 1). It claims: “SampCert’s verified algorithms power the DP offerings of Amazon Web Services, demonstrating its real-world impact.” (p. 1). Inference: the latter is author-reported deployment evidence, not an independently audited guarantee about all AWS privacy code.

## technique 1: parameterize proofs over an abstract privacy interface

What it is. Instead of committing every mechanism proof to pure DP, zCDP, or Rényi DP, SampCert defines a one-parameter `AbstractDP` interface. An instance supplies a privacy proposition and proofs of monotonicity, adaptive composition, postprocessing, a constant base case, and a reduction to approximate DP (Listing 2, pp. 6–8).

When to use it. Inference: use this pattern when many mechanisms share composition and postprocessing arguments but differ in the privacy definition and parameter meaning. A single mechanism proof can then be instantiated for several definitions.

How to do it. (1) Define `Mechanism T U := List T → PMF U`. (2) Define `prop : Mechanism T Z → NNReal → Prop`. (3) Prove `prop_mono`. (4) Prove additive `adaptive_compose_prop`. (5) Prove `postprocess_prop` and `const_prop`. (6) Supply `of_app_dp` and `prop_app_dp` to connect the abstract bound to approximate DP. These fields and their intended meanings are listed directly below Listing 2 (pp. 6–8). Instantiate the class once for pure DP and once for zCDP.

Verus form. Inference: represent the shared interface with specification predicates and proof lemmas. Require each privacy variant to supply composition, postprocessing, and constant-mechanism proofs. A port would also need a probability model and the mathematical results used by those proofs; this paper does not establish their availability in Verus.

Evidence and limits. The generic histogram proof applies to any instance, rather than requiring a separate proof after each instantiation: “This completes the privacy proof for the private histogram, giving us a result that applies to any AbstractDP instantiation in fewer than 50 lines of proof.” (Section 2.3, p. 10). The zCDP instantiation itself is around 3000 lines because it formalizes Rényi divergence, integrals, infinite sums, and Jensen's inequality (Section 2.5, p. 11). Inference: abstraction shortens repeated mechanism proofs but does not eliminate the cost of establishing a new mathematical privacy model.

## technique 2: abstract noise and sensitivity contracts

What it is. `DPNoise` separates a query's sensitivity from the noise distribution and the privacy-parameter arithmetic. A `noise` operation takes a query, sensitivity Δ, and rational numerator/denominator parameters; `noise_priv` states how those parameters imply a target privacy amount; `noise_prop` turns sensitivity plus that arithmetic fact into the abstract privacy proposition (Listing 3, p. 8).

How to do it. (1) Prove `sensitivity q Δ` for a query. (2) Prove `noise_priv` for the chosen mechanism parameters. (3) Apply `noise_prop` to obtain the privacy bound. The arguments need not equal the privacy parameter. Use the explicit theorem `privNoisedQuery_zCDP`, whose bound is `(1/2) * (ρ₁/ρ₂)^2` (Section 2.5, p. 11). The parenthetical Gaussian example in Section 2.2 instead prints `(γₙ/(2γ_d))²` (p. 8). Inference: these displayed bounds differ by a factor of two, so that parenthesis should not be treated as a restatement of the theorem. The paper explains its arithmetic choice: “This setup avoids the use of any floating-point arithmetic, instead requiring that the prover either manually or programmatically ensure that their noise parameters satisfy the appropriate noise_priv bound.” (Section 2.2, p. 8).

Verus form. Inference: define sensitivity as a `spec fn` over adjacent abstract databases, and expose a proof lemma that bounds output differences. Encode rational privacy parameters as integers with nonzero denominators and prove the arithmetic relation in a `proof fn`. Require a proof of the sampler's distributional contract, or explicitly record that contract as an assumption.

## technique 3: compose a private histogram by induction

What it is. The case study builds a histogram by privately counting each bin. Each count gets γ/nBins privacy; sequential composition yields γ for the whole histogram, and postprocessing writes each noisy count into the result.

How to do it. (1) Define `exactBinCount` and prove sensitivity 1 (`exactBinCount_sensitivity`, Listing 5, p. 10). (2) Apply `noise_prop` to show each noisy bin is γ/nBins-private (`privNoisedBinCount_DP`). (3) Define the recursive histogram with `privCompose` and `privPostProcess` (Listing 4, p. 9). (4) Prove the recursive bound `(n+1) * (γ/nBins)` by induction. At `n=0`, compose the noisy count for bin 0 with an empty constant histogram, using `const_prop`, composition, and postprocessing. In the successor case, compose the current bin with the induction hypothesis and postprocess (Listing 6, p. 10). (5) Discharge the final arithmetic equality to obtain γ privacy (`privNoisedHistogram_DP`, Listing 7, p. 10).

Inference: the reported fewer-than-50-line count concerns the histogram privacy proof, not the abstract framework or its concrete DP instantiations.

Verus form. Inference: use recursion or a loop invariant to track the accumulated privacy budget. State sensitivity as a precondition and the final abstract DP predicate as a postcondition, with a ghost probability model connecting these contracts to the sampler.

## technique 4: use unnormalized mass functions for executable probabilistic loops

What it is. PMF values are convenient for stating privacy but noncomputable and do not describe an executable sampler. SampCert introduces SLang, a shallowly embedded language into an unnormalized mass-function monad. It has `probPure`, `probBind`, `probUniformByte`, and `probWhile`; terms may have mass other than one until a separate normalization theorem is proved (Section 3.1, pp. 12–14).

Why it works. The paper explains: “The principal issue arises when attempting to verify the posterior mass distribution of programs which include loops and recursion.” (p. 13). Unnormalized mass avoids carrying a changing normalization factor through every loop invariant. The final program is promoted to a PMF only after proving total mass 1.

How to do it. Define each primitive as a mass function into extended nonnegative reals. Define bind as the sum of the continuation mass times the input mass. Define `probWhileCut` for a finite number of unrollings, then define `probWhile` as the supremum over all cuts (Fig. 3, p. 14). Prove functional distribution facts first; prove normalization afterward with closed-form sums.

Verus form. Inference: model an unnormalized mass function as a ghost map from outcomes to nonnegative weights and define bind and finite loop cuts as `spec fn`s. Prove executable sampler behavior against that model with lemmas. A port would need definitions and proofs for the infinite sums and supremums used here, or an explicit interface to results established elsewhere.

## technique 5: prove loop distributions by cut reachability and stability

What it is. Section 3.2 presents cut reachability and cut stability: calculate each output's mass at a cut, then characterize later cuts (pp. 14–16). For the geometric sampler, a finite cut reaches the target mass and all later cuts preserve it. The supremum of this eventually constant, monotone sequence is the desired closed form. This finite stabilization is not universal: for rejection sampling, “in the stability part of the proof the mass has an exponential relationship to the cut value, rather than constant.” (Section 3.2.2, p. 16).

How to do it for the geometric sampler. (1) Define a cut function F(k, initial, final) for at most k loop unrollings. (2) Prove cut reachability: for each output n, calculate a cut kₙ (for the geometric sampler, n+1) whose mass equals the target distribution. (3) Prove cut stability: adding iterations after kₙ leaves that output's mass unchanged. (4) Prove monotonicity of cuts and conclude that the supremum equals the target mass. These are the two named lemmas and the conclusion “Stability + Reachability = Correctness” in Section 3.2 (pp. 14–16).

The geometric sampler illustrates the exact argument. The implementation repeatedly samples a Boolean trial and increments a counter (Listing 8, p. 15). For output n, the paper proves that truncating to n+1 iterations suffices, then proves that all later cuts have the same mass (p. 15); normalization follows separately (p. 16).

Verus form. Inference: for bounded loops, encode a cut-indexed ghost function and prove reachability and stability by induction. For unbounded probabilistic loops, a port would also need the supremum and convergence results that connect finite cuts to the whole loop.

## technique 6: build exact discrete Laplace and Gaussian samplers

What it is. SampCert avoids rounded floating-point noise and proves exact integer-valued distributions. The discrete Laplace sampler uses a geometric draw, a Bernoulli sign, and rejection of the duplicate zero. Two implementations are verified: one based on Diffprivlib and another based on Canonne et al.; the second separates integral and fractional geometric parts and is faster for large scale (Listings 9–10, pp. 16–17).

The paper states: “By using discrete mechanisms rather than rounded floating-point approximations we can go beyond proofs of their privacy and provide foundational proofs of their correctness, describing their posterior distribution exactly.” (Section 3, p. 12). After proving the closed-form PMF, the privacy proof uses the standard Laplace argument rather than re-reasoning about loop internals (p. 17).

The discrete Gaussian sampler repeatedly samples from Laplace and accepts with a Bernoulli probability (Listing 11, p. 18). Correctness follows from a `probUntil` lemma and a normalizing constant. Its zCDP proof bounds Rényi divergence; the key mathematical step uses Fourier analysis and the Poisson summation formula from Mathlib (p. 18).

Verus form. Inference: implement integer-only samplers and prove arithmetic invariants and a ghost distribution relation. Establish exact PMF equality and Rényi-divergence bounds as explicit mathematical proof obligations; if imported as assumptions, record them as trusted. Do not silently replace them with floating-point approximations, because the paper identifies floating-point sampling bugs as a source of privacy vulnerabilities.

## technique 7: extract through a small trusted interface and benchmark alternatives

What it is. SLang's four primitives map to imperative operations. SampCert extracts either through Lean's C++ FFI or through Dafny-to-Python translation. The FFI has five external functions and 57 lines of C++ (Section 4.1, pp. 18–20). The random byte primitive reads `/dev/urandom`; uniform integer construction is verified in Lean.

The authors state: “While Lean guarantees that external definitions will not affect the soundness of the logic (and hence, our library of verified DP results), it can make no formal guarantees about the runtime behavior of the compiled binary.” (Section 4.1, p. 19). Inference: theorem soundness alone does not establish the compiled sampler's runtime behavior.

How to do it. Keep external definitions minimal. Define the mathematical sampler in Lean/SLang, prove it, map each primitive to a small external function, and check the generated samples. Appendix C reports: “We did, however, check the distributions of the generated samples using a Kolmogorov–Smirnov test.” (footnote 10, p. 34). Separately, benchmark alternatives. The paper compares three SampCert Gaussian variants with Canonne et al.'s `sample_dgauss` and Diffprivlib over varying σ (Section 4.2, Fig. 4, p. 20). It reports “more than a 2x difference in runtime” against Canonne et al. over the plotted range (p. 20). This comparison uses the extracted Python samplers. The authors also state: “The diffprivlib sampler is faster than ours for smaller values of the standard deviation.” (Section 4.2, p. 20).

Verus form.

## what is proved, trusted, and still missing

The paper establishes the abstract privacy laws for pure-DP and zCDP instances, generic histogram privacy, exact discrete sampler distributions, and the sampler-to-privacy theorems (Sections 2–3). It also proves pure DP for a non-adaptive sparse vector technique, obtains zCDP through the conversion from ε-DP to `(ε²/2)`-zCDP, and extends the interface with parallel composition (Appendices A–B, pp. 26–32). Parallel composition uses the maximum of the component bounds for disjoint partitions; the paper instantiates this extension for pure DP and reduces histogram noise by a factor of nBins (Appendix B, pp. 31–32).

The abstract reports “over 12,000 lines of proof” (p. 1). The limitations include countable domains, plain-list databases that cannot express group privacy, difficulty proving floating-point samplers, and one real privacy parameter (Section 6, p. 22). The authors state: “All mechanisms and mass functions in SampCert take place in discrete probability spaces over countable types.” (Section 6, p. 22). Timing side channels are future work in the conclusion (Section 7, p. 22).

The authors state: “In both cases, we rely on some trusted computing base, either the FFI implementation or the Dafny extraction, and all the toolchains needed to compile their respective output.” (Appendix C, p. 34). Section 4.1 additionally identifies `/dev/urandom` as the random-byte source (p. 19). Inference: trust also depends on the proof checker, its axioms, the randomness model, and the selected privacy specification; the AWS deployment report does not independently validate those assumptions. Deployment covers samplers: “While SampCert’s differentially private query implementations are also executable, we have not yet deployed them, in part because integrating these queries directly into existing, large-scale applications and libraries for differential privacy would be more challenging.” (Section 4, p. 18).

## techniques for the catalog

- abstract privacy interface — parameterize mechanism proofs over monotonicity, composition, postprocessing, constants, and an approximate-DP reduction
- sensitivity/noise contracts — separate query sensitivity from noise implementation and prove parameter arithmetic explicitly
- compositional histogram proof — prove per-bin sensitivity and privacy, then lift by induction and postprocessing
- unnormalized probabilistic language — represent executable loops as mass functions and delay normalization
- cut reachability and stability — calculate mass at finite cuts and its later behavior; the geometric sampler stabilizes, while rejection sampling uses exponential convergence
- exact discrete samplers — verify Laplace and Gaussian algorithms over integers with closed-form distributions
- minimal extraction boundary — deploy verified code through a small FFI while stating runtime trust explicitly
