# A Formally Verified Library of Mathematical Finance in Lean 4
(authored by agents unless marked 🧑)
Tag: `coelho2026formally`, [paper](https://arxiv.org/abs/2606.01356)

## scope and result

The paper presents a Lean 4 library with 330 theorems over roughly 52,300 lines. Its abstract says: “We describe a library of mathematical finance built in the Lean 4 proof assistant, on top of Mathlib and the BrownianMotion package.” The reported scope is eleven areas, from continuous-time stochastic calculus through derivatives, portfolios, fixed income, risk and DeFi (abstract, p. 1). The paper says, “As of writing this is 330 theorems (298 classified full, 18 library_wrapper, 14 reduced_core) over roughly 52,300 lines of Lean, all sorry-free” (§1, p. 2).

The paper's central engineering result is an audit around formal statements. It says: “every result is classified by how its Lean statement relates to the mathematics it claims, and a build-enforced gate pins the axioms each proof actually uses” (abstract, p. 1). The four classifications are full, library_wrapper, reduced_core, and placeholder; only full and library_wrapper count as delivery claims (§2, p. 2; Table 2, p. 6). The build gate records each load-bearing theorem's `#print axioms` output in `AxiomAudit.lean`; an unexpected axiom or `sorryAx` fails the build (§2, p. 2; §4, p. 4).

Inference: for VeruLaw, the reusable lesson is to audit both the truth of each specification and the proof's trusted axioms. Passing a verifier does not by itself establish that the specification expresses the intended financial requirement.

## technique 1: classify theorem faithfulness and pin axioms

What it is. Every theorem receives a tier describing how closely its Lean proposition matches the claimed mathematics. A full theorem is the claim itself; a library_wrapper re-exports an upstream theorem; reduced_core proves the claim only with an added hypothesis or axiomatized sub-step; placeholder is unfinished. The paper calls the audit “the most transferable contribution” (§2, p. 2).

When to use it. Use this when a project has many proofs assembled from libraries, assumptions, wrappers, or abstractions and users need to know which results are actually established. It is especially useful at release time, because the paper's table reports 298 full, 18 wrappers, 14 reduced-core, and zero placeholders out of 330 (§7, Table 2, p. 6).

How to do it (paper's method). (1) Maintain a coverage report listing every benchmark theorem and its tier (§2, p. 2; §7, p. 6). (2) For each load-bearing theorem, record Lean's exact `#print axioms` output in `AxiomAudit.lean` (§2, p. 2). (3) Compile the library from the pinned repository image; the audit file is part of the build (§7, p. 6). (4) Fail the build if a promoted theorem acquires an unexpected axiom or `sorryAx` (§2, p. 2). (5) Publish the counts and identify where reduced cores cluster; here they cluster in continuous-time and discrete-process benchmarks (§7, p. 6).

Verus form. Inference: create a per-function or per-lemma manifest recording whether a postcondition is the intended claim, a wrapper around an upstream contract, or conditional on an explicit assumption. Keep assumptions in `requires` clauses and executable behavior in ordinary Rust functions; use `ensures` on executable functions and `proof fn`/`spec fn` only for proof facts. Inference: a CI script can run `cargo verus` and reject an audited item when its expected dependency or external-body assumption changes, but this is a project convention rather than a built-in Verus tier system.

Evidence and limits. The evidence is the paper's pinned Lean v4.31.0, Mathlib commit `fabf563a`, BrownianMotion commit `bdf5ea0c`, a Docker image, and a plain `lake build` ending in the audit (§7, p. 6). The paper says: “AxiomAudit.lean is that gate ... its compilation is machine-checked evidence that the audited results are sorry-free and rest only on Lean’s three standard axioms (propext, Classical.choice, Quot.sound)” (§7, p. 6). This does not prove that the tier labels are correctly assigned; the author must classify the relation between code and mathematics.

## technique 2: build reusable principle bridges

What it is. Instead of proving every instrument independently, the library derives results from three reusable principles: a non-negative linear pricing functional, the Garman normal form, and a Brownian-motion grounding bridge (§4, p. 4). The paper states: “The library stays coherent by deriving results from a few reusable principles rather than re-proving each instrument from scratch” (§4, p. 4).

When to use it. Use this when many APIs share algebraic structure and independent proofs would duplicate assumptions. In the paper, linearity and non-negativity yield put-call parity, forward price, and call convexity; the Garman form instantiates call, put, digital, power, exchange, dividend, and foreign-rate variants (§4, p. 4).

How to do it. (1) Define the shared abstraction in a foundational module (`StatePrices.lean`, `PricingKernel.lean`, `ConvexPricingFunctional.lean`) (§4, p. 4). (2) Prove structural laws once, such as linearity and non-negativity (§4, p. 4). (3) Define the Garman normal form in `BlackScholes/GarmanNormalForm.lean` and instantiate parameters for each product (§4, p. 4). (4) State pricing hypotheses marginally, then connect them to Brownian motion through `BSCallHypFromBrownian.l` and `PricingFromBrownian.lean` (§4, p. 4). (5) Add cross-domain bridge lemmas and let the prover certify identities between independently developed modules (§4, p. 4).

Verus form. Inference: represent a shared pricing abstraction as a Rust trait or spec-level function, with `requires` for non-negativity and linearity assumptions and `ensures` for each derived law. Prove each concrete instrument's postcondition by calling proof lemmas over the shared spec. Verus can express mathematical reals and quantifier-based contracts, but the Lean module and theorem names do not carry over; executable pricing code still needs a concrete representation and numerical error policy.

Evidence and limits. The paper gives two certified bridge examples: `portfolioVarN_diag_eq_herfindahl` and `survivalFromForce_eq_hazardSurvival` (§4, p. 4). Inference: these identities show reuse can expose equivalences, but they do not establish new financial theory. The paper explicitly says the contribution is “methodological and infrastructural” rather than a new financial result (abstract, p. 1).

## technique 3: construct the continuous L2 Itô integral

What it is. The paper constructs, rather than assumes, a continuous Itô integral as a bounded linear map on L2. It starts with a Wiener integral for deterministic integrands, proves the adapted Itô isometry for random integrands, and extends from simple adapted processes using density and a norm-preserving extension (§5, p. 4). The paper names `ItoIntegralBrownian.lean` as the worked capstone (§5, p. 4).

When to use it. Use this staged construction when a later theorem needs integration over continuous adapted processes and the upstream library only has discrete or deterministic integration. The paper contrasts this with earlier work that leaves the continuous integral structurally verified (§5, p. 4).

How to do it. (1) Establish the deterministic Wiener L2 isometry in `WienerIntegralL2.lean` (§5, p. 4). (2) For simple adapted processes, prove cross terms vanish using the weak Markov property of Brownian increments; this is the adapted Itô isometry in `ItoIsometryAdapted.lean` (§5, p. 4). (3) Use a π–λ density argument to make simple adapted processes dense (§5, p. 4). (4) Apply `LinearMap.extendOfNorm` to obtain a norm-preserving bounded linear map on L2 in `ItoIntegralL2.lean` and `ItoIntegralCLM.lean` (§5, p. 4). (5) Prove the Brownian worked example in `ItoIntegralBrownian.lean` (§5, p. 4). (6) Add quadratic variation, martingale, Itô-formula, localization, and Feynman–Kac layers around the integral (§5, p. 4).

Verus form. Inference: model an L2 integrand and integral as mathematical spec values, with a `spec fn` for the integral and proof lemmas for linearity and an isometry relation. A Rust implementation can expose a finite approximation or sampled process; its `ensures` can prove algebraic identities for that representation. Inference: Verus does not provide Lean's measure-theoretic `LinearMap.extendOfNorm`; the density and completeness argument would need to be encoded as axioms, a separately verified library, or a finite discretization, and such an assumption must be marked in the faithfulness audit.

Evidence and limits. The paper reports the surrounding stochastic-calculus core as axioms-clean (§5, p. 4) and classifies the hard continuous-time frontier as reduced_core (§7, p. 6). It does not provide theorem counts for each stochastic submodule, so those module-level claims cannot be converted into finer denominators. The general progressively measurable Girsanov theorem and several continuous-time results remain open (§8, p. 7).

## technique 4: derive a risk-neutral measure instead of assuming one

What it is. `GaussianGirsanov.lean` uses a static Girsanov change of measure with an Esscher density to derive the lognormal terminal law needed for Black–Scholes. The paper says: “So BSCallHyp (the hypothesis that the terminal asset is lognormal under Q, which the Black–Scholes section takes as input) is itself a theorem (BSCallHyp.exists_of_physical)” (§6, p. 5).

When to use it. Use this when pricing proofs currently take an equivalent martingale measure as an unchecked premise and the model supplies a physical Gaussian driver from which that measure can be constructed.

How to do it. (1) Start from the physical Gaussian law (§6, p. 5). (2) Define the Esscher density and the changed measure in `GaussianGirsanov.lean` (§6, p. 5). (3) Prove the terminal asset has the required lognormal law under the new measure, establishing `BSCallHyp.exists_of_physical` (§6, p. 5). (4) Prove the discounted geometric Brownian motion is a martingale (`discountedGBM_isMartingale`) (§6, p. 5). (5) Lift the construction to dynamic Girsanov for constant, simple, continuous-adapted, and bounded-predictable drifts (`GirsanovConstantTheta.lean` through `GirsanovPredictableTheta.lean`) (§6, p. 5). (6) Use `isEMM_noArbitrageSimple` to derive no-arbitrage for simple predictable strategies (§6, p. 5).

Verus form. Inference: encode the density, probability-law assumptions, and martingale invariant as spec functions and `requires`; prove the finite-state or discretized change-of-measure equations with `ensures`. A Verus proof can check algebraic normalization and preservation of a model's abstract invariant, but a trustworthy continuous probability model would require a verified measure library or an explicit trusted axiom. Inference: the Verus version should therefore classify the probability foundation as trusted unless it is independently verified.

Evidence and limits. The paper reports the payoff `bs_call_formula_of_physical` and says Margrabe's exchange-option formula follows from the same change of numéraire (§6, p. 5). It also reports finite-state Hahn–Banach separation and one-period convex-potential constructions, while calling the general multi-period case an open rung (§6, p. 5). The result is a derivation under the paper's Gaussian assumptions, not a proof for arbitrary market models.

## what is proved, trusted, and relevant to VL

The build proves the classified Lean propositions and checks their recorded axiom sets. The paper reports 316 of 330 theorem entries as full or library_wrapper (298 + 18; denominator 330), while 14 are reduced_core and zero placeholders (Table 2, p. 6). The trusted base includes Lean's `propext`, `Classical.choice`, and `Quot.sound`, pinned dependencies, and the correctness of the Lean kernel and build environment (§7, p. 6). Inference: a Verus project should publish the analogous dependency, solver, external-library, and specification assumptions rather than presenting “verified” as a binary label.

The paper's conclusion is explicit: “Machine-checking classical financial mathematics yields certified unification of known results, not new financial theory” (§8, p. 7). Inference: VL should not redo generic theorem-prover library engineering or claim novelty merely from translating classical formulas. Its product threat is moderate: the faithfulness gate and reusable bridge pattern directly threaten any workflow that reports verified Rust without auditing assumptions; the Lean stochastic-measure proofs threaten only if VL targets comparable mathematical finance. The paper does not measure agent-written code, repair effort, or Verus success, so product-threat magnitude is an inference rather than an evaluated result.

## techniques for the catalog

- faithfulness tiers and axiom gate — classify every theorem against its claimed mathematics and fail the pinned build when recorded axioms change
- principle-based bridge library — derive many instruments from shared pricing, normal-form, and Brownian-grounding abstractions
- staged continuous Itô construction — extend deterministic and simple adapted L2 integrals by isometry, density, and norm-preserving extension
- derived risk-neutral measure — construct an Esscher/Girsanov measure and prove the pricing hypothesis instead of assuming it
Checked 2026-10-15 against paper coelho2026formally: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
