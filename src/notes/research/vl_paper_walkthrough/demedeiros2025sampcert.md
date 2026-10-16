# Verified Foundations for Differential Privacy
(authored by agents unless marked 🧑)
Tag: `demedeiros2025sampcert`, [paper](https://doi.org/10.1145/3729294)

## scope and result

SampCert is a Lean 4 development that connects differential-privacy proofs to executable random samplers. It provides a generic privacy interface, verified discrete Laplace and Gaussian samplers, a small probabilistic language, and extraction to deployed code. The paper reports more than 12,000 lines of Lean proof and AWS deployment of the sampling primitives.

The abstract says: “SampCert is written in Lean with over 12,000 lines of proof.” (PDF p. 1). It claims: “SampCert’s verified algorithms power the DP offerings of Amazon Web Services, demonstrating its real-world impact.” (p. 1). Inference: the latter is author-reported deployment evidence, not an independently audited guarantee about all AWS privacy code.

## technique 1: parameterize proofs over an abstract privacy interface

What it is. Instead of committing every mechanism proof to pure DP, zCDP, or Rényi DP, SampCert defines a one-parameter `AbstractDP` interface. An instance supplies a privacy proposition and proofs of monotonicity, adaptive composition, postprocessing, a constant base case, and a reduction to approximate DP (Listing 2, pp. 6–8).

When to use it. Use this pattern when many mechanisms share composition and postprocessing arguments but differ in the privacy definition and parameter meaning. A single mechanism proof can then be instantiated for several definitions.

How to do it. (1) Define `Mechanism T U := List T → PMF U`. (2) Define `prop : Mechanism T Z → NNReal → Prop`. (3) Prove `prop_mono`. (4) Prove additive `adaptive_compose_prop`. (5) Prove `postprocess_prop` and `const_prop`. (6) Supply `of_app_dp` and `prop_app_dp` to connect the abstract bound to approximate DP. These fields and their intended meanings are listed directly below Listing 2 (pp. 6–8). Instantiate the class once for pure DP and once for zCDP.

Verus form. Inference: represent the shared interface as a trait-like specification layer or a collection of `spec fn` predicates and proof lemmas. Each privacy variant supplies lemmas for composition, postprocessing, and constants. Rust traits are executable mechanisms whereas Verus specifications are erased; keep the privacy relation in `spec fn`s and prove each implementation-specific theorem with `proof fn`s. Verus has no probability monad in its standard core, so the distribution model and measure lemmas must be imported or developed.

Evidence and limits. The generic histogram proof is under 50 lines of proof after the interface is instantiated (Section 2.3, p. 10). The zCDP instantiation itself is around 3000 lines because it formalizes Rényi divergence, integrals, infinite sums, and Jensen's inequality (Section 2.5, p. 11). Inference: abstraction shortens repeated mechanism proofs but does not eliminate the cost of establishing a new mathematical privacy model.

## technique 2: abstract noise and sensitivity contracts

What it is. `DPNoise` separates a query's sensitivity from the noise distribution and the privacy-parameter arithmetic. A `noise` operation takes a query, sensitivity Δ, and rational numerator/denominator parameters; `noise_priv` states how those parameters imply a target privacy amount; `noise_prop` turns sensitivity plus that arithmetic fact into the abstract privacy proposition (Listing 3, p. 8).

How to do it. (1) Prove `sensitivity q Δ` for a query. (2) Prove `noise_priv` for the chosen mechanism parameters. (3) Apply `noise_prop` to obtain the privacy bound. The paper warns that the function arguments do not always equal the privacy parameter: for Gaussian noise they imply `(γₙ/(2γ_d))²`-zCDP (p. 8). It therefore avoids floating-point arithmetic and asks the prover to establish the parameter inequality.

Verus form. Inference: define sensitivity as a `spec fn` over adjacent abstract databases, and expose a proof lemma that bounds output differences. Encode rational privacy parameters as integers with nonzero denominators and prove the arithmetic relation in a `proof fn`. The executable sampler can remain generic over a noise implementation if its contract states the distributional property; the distribution theorem remains a trusted mathematical library boundary unless formalized in Verus.

## technique 3: compose a private histogram by induction

What it is. The case study builds a histogram by privately counting each bin. Each count gets γ/nBins privacy; sequential composition yields γ for the whole histogram, and postprocessing writes each noisy count into the result.

How to do it. (1) Define `exactBinCount` and prove sensitivity 1 (`exactBinCount_sensitivity`, Listing 5, p. 10). (2) Apply `noise_prop` to show each noisy bin is γ/nBins-private (`privNoisedBinCount_DP`). (3) Define the recursive histogram with `privCompose` and `privPostProcess` (Listing 4, p. 9). (4) Prove the recursive bound by induction: the empty histogram uses `const_prop`; the successor case composes the current bin with the induction hypothesis and then postprocesses (Listing 6, p. 10). (5) Discharge the final arithmetic equality to obtain γ privacy (`privNoisedHistogram_DP`, Listing 7, p. 10).

The paper states: “This completes the privacy proof for the private histogram, giving us a result that applies to any AbstractDP instantiation in fewer than 50 lines of proof.” (Section 2.3, p. 10). Inference: the line count is for this displayed proof and its abstract framework; it does not include the entire library or the zCDP instance.

Verus form. Inference: write a recursive or iterative Rust histogram with a loop invariant expressing accumulated privacy budget. Use `invariant!` for the count bound and privacy-budget arithmetic, `requires` for a sensitivity assumption, and `ensures` for the final abstract DP predicate. Distribution-valued postconditions are not ordinary executable Verus values, so a practical Verus integration would need a ghost model of probability mass or an external theorem interface.

## technique 4: use unnormalized mass functions for executable probabilistic loops

What it is. PMF values are convenient for stating privacy but noncomputable and do not describe an executable sampler. SampCert introduces SLang, a shallowly embedded language into an unnormalized mass-function monad. It has `probPure`, `probBind`, `probUniformByte`, and `probWhile`; terms may have mass other than one until a separate normalization theorem is proved (Section 3.1, pp. 12–14).

Why it works. The paper explains: “The principal issue arises when attempting to verify the posterior mass distribution of programs which include loops and recursion.” (p. 13). Unnormalized mass avoids carrying a changing normalization factor through every loop invariant. The final program is promoted to a PMF only after proving total mass 1.

How to do it. Define each primitive as a mass function into extended nonnegative reals. Define bind as the sum of the continuation mass times the input mass. Define `probWhileCut` for a finite number of unrollings, then define `probWhile` as the supremum over all cuts (Fig. 3, p. 14). Prove functional distribution facts first; prove normalization afterward with closed-form sums.

Verus form. Inference: model an unnormalized mass function as a ghost map from outcomes to nonnegative weights and define bind and finite loop cuts as `spec fn`s. Prove executable sampler behavior against that model with lemmas. Verus does not directly support real-valued infinite sums, supremums, or measure theory, so this technique would require a specialized mathematical model and trusted library axioms or a different theorem prover.

## technique 5: prove loop distributions by cut reachability and stability

What it is. For each output value v, SampCert proves (a) a finite cut reaches the desired mass and (b) every larger cut preserves it. The supremum of the eventually constant, monotone sequence is therefore the desired closed form.

How to do it. (1) Define a cut function F(k, initial, final) for at most k loop unrollings. (2) Prove cut reachability: for each output n, calculate a cut kₙ (for the geometric sampler, n+1) whose mass equals the target distribution. (3) Prove cut stability: adding iterations after kₙ leaves that output's mass unchanged. (4) Prove monotonicity of cuts and conclude that the supremum equals the target mass. These are the two named lemmas and the conclusion “Stability + Reachability = Correctness” in Section 3.2 (pp. 14–16).

The geometric sampler illustrates the exact argument. The implementation repeatedly samples a Boolean trial and increments a counter (Listing 8, p. 15). For output n, the paper proves that truncating to n+1 iterations suffices, then proves that all later cuts have the same mass (p. 16).

Verus form. Inference: for bounded loops, encode a cut-indexed ghost function and prove reachability and stability by induction. For unbounded probabilistic loops, Verus alone lacks the analytic supremum and convergence machinery used here; a finite abstraction or a separately verified theorem is required.

## technique 6: build exact discrete Laplace and Gaussian samplers

What it is. SampCert avoids rounded floating-point noise and proves exact integer-valued distributions. The discrete Laplace sampler uses a geometric draw, a Bernoulli sign, and rejection of the duplicate zero. Two implementations are verified: one based on Diffprivlib and another based on Canonne et al.; the second separates integral and fractional geometric parts and is faster for large scale (Listings 9–10, pp. 16–17).

The paper states: “By using discrete mechanisms rather than rounded floating-point approximations we can go beyond proofs of their privacy and provide foundational proofs of their correctness, describing their posterior distribution exactly.” (Section 3, p. 12). After proving the closed-form PMF, the privacy proof uses the standard Laplace argument rather than re-reasoning about loop internals (p. 17).

The discrete Gaussian sampler repeatedly samples from Laplace and accepts with a Bernoulli probability (Listing 11, p. 18). Correctness follows from a `probUntil` lemma and a normalizing constant. Its zCDP proof bounds Rényi divergence; the key mathematical step uses Fourier analysis and the Poisson summation formula from Mathlib (p. 18).

Verus form. Inference: implement integer-only samplers and prove arithmetic invariants and a ghost distribution relation. Exact PMF equality and Rényi-divergence theorems exceed ordinary Verus automation; retain them as separately verified lemmas or a trusted interface. Do not silently replace them with floating-point approximations, because the paper identifies floating-point sampling bugs as a source of privacy vulnerabilities.

## technique 7: extract through a small trusted interface and benchmark alternatives

What it is. SLang's four primitives map to imperative operations. SampCert extracts either through Lean's C++ FFI or through Dafny-to-Python translation. The FFI has five external functions and 57 lines of C++ (Section 4.1, pp. 18–20). The random byte primitive reads `/dev/urandom`; uniform integer construction is verified in Lean.

The authors state: “Lean guarantees that external definitions will not affect the soundness of the logic (and hence, our library of verified DP results), it can make no formal guarantees about the runtime behavior of the compiled binary.” (Section 4.1, p. 19). This cleanly separates theorem soundness from runtime trust.

How to do it. Keep external definitions minimal. Define the mathematical sampler in Lean/SLang, prove it, map each primitive to a small external function, and test extracted code against reference implementations. The paper compares three SampCert Gaussian variants with Canonne et al.'s `sample_dgauss` and Diffprivlib over varying σ (Section 4.2, Fig. 4, p. 20). It reports “more than a 2x difference in runtime” against Canonne et al. over the plotted range (p. 20), but gives no numeric denominator or machine configuration in the text.

Verus form. Inference: treat FFI, OS randomness, and foreign libraries as `external_body` or external specifications only at a deliberate boundary, and document the assumptions. Verus proofs establish the modeled function's contract; they do not prove arbitrary C++ or OS behavior. A VL deployment should include an executable conformance test for the extracted boundary and preserve the exact binary/toolchain metadata.

## what is proved, trusted, and still missing

Proved components include the generic DP laws, pure-DP and zCDP instantiations, histogram privacy, exact discrete sampler distributions, and the sampler-to-privacy theorems. The artifact is a 12,000-plus-line Lean development using Mathlib. The authors' limitations are explicit: all mechanisms use countable domains; realistic database types and group privacy are not supported; floating-point foundational proofs are difficult; `AbstractDP` has one real parameter; and timing side channels are future work (Section 6, p. 22).

Trusted components include Lean's kernel and Mathlib theorem library, the small extraction/FFI code, `/dev/urandom`, the correctness of the Lean-to-target compiler, and the chosen adjacency relation and privacy specification. Inference: the AWS deployment claim does not remove these trust boundaries. The paper says the DP query implementations themselves were not deployed because integrating them into large-scale libraries was harder (Section 4, p. 19).

Threat to VL. Inference: high threat to any product that claims verified probabilistic or privacy-sensitive Rust without modeling randomness and extraction. SampCert demonstrates that verified primitives can reach production, but also shows the engineering cost: the zCDP foundation is about 3000 lines and the external runtime boundary remains trusted. For VL, the reusable lesson is to separate abstract privacy contracts, exact mathematical models, executable samplers, and a minimal foreign boundary.

What VL should not redo. Inference: VL should not redo generic DP composition or exact-sampler mathematics without a concrete Rust need; SampCert already provides a mature Lean artifact and deployment pattern. It should instead measure whether Verus can connect Rust implementations to a similarly explicit probability model, and report all trusted extraction and randomness components.

## techniques for the catalog

- abstract privacy interface — parameterize mechanism proofs over monotonicity, composition, postprocessing, constants, and an approximate-DP reduction
- sensitivity/noise contracts — separate query sensitivity from noise implementation and prove parameter arithmetic explicitly
- compositional histogram proof — prove per-bin sensitivity and privacy, then lift by induction and postprocessing
- unnormalized probabilistic language — represent executable loops as mass functions and delay normalization
- cut reachability and stability — prove loop distributions by a finite reaching cut plus invariance of later cuts
- exact discrete samplers — verify Laplace and Gaussian algorithms over integers with closed-form distributions
- minimal extraction boundary — deploy verified code through a small FFI while stating runtime trust explicitly

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
