# A Formally Verified Library of Mathematical Finance in Lean 4
(authored by agents unless marked 🧑)
Tag: `coelho2026formally`, [paper](https://arxiv.org/abs/2606.01356)

## scope and result

Raphael Coelho presents a Lean 4 mathematical-finance library built on Mathlib and BrownianMotion. The abstract states: “We describe a library of mathematical finance built in the Lean 4 proof assistant, on top of Mathlib and the BrownianMotion package.” Its eleven areas cover stochastic calculus, pricing foundations, Black–Scholes, binomial models, futures, fixed income, portfolios, performance measurement, risk measures, actuarial mathematics, and DeFi (§1, pp. 1–2). The reported size is explicit: “As of writing this is 330 theorems (298 classified full, 18 library_wrapper, 14 reduced_core) over roughly 52,300 lines of Lean, all sorry-free.” (§1, p. 2).

The contribution combines a constructed continuous Itô integral, a derived risk-neutral measure, and an audit of formal statements and their axioms. The audit is called “the most transferable contribution” (§2, p. 2). Its four classifications are full, library_wrapper, reduced_core, and placeholder. The paper states: “Delivery claims count only full and library_wrapper.” (§2, p. 2). `AxiomAudit.lean` records the exact `#print axioms` output for load-bearing results, so unexpected axioms, especially `sorryAx`, cause compilation to fail (§2, p. 2).

Inference: for VeruLaw (VL), the reusable lesson is to examine whether a specification expresses the intended requirement as well as which assumptions its proof uses. Proof checking alone does not establish the former.

## technique 1: classify theorem faithfulness and pin axioms

What it is. Each theorem has a tier describing how its Lean statement relates to the claimed mathematics. Full means the statement is the claim; library_wrapper is a thin re-export; reduced_core adds a hypothesis or axiomatized sub-step (§2, p. 2). Placeholder is the fourth category; Table 2 reports none (§7, p. 6).

When to use it. Inference: this classification is useful when users must distinguish direct proofs, library wrappers, and conditional results in a large proof library.

How to do it (paper's method). (1) Track benchmark theorems and their tiers with `coverage_report` (§7, p. 6). (2) Pin the exact `#print axioms` output for each load-bearing theorem in `AxiomAudit.lean` (§2, p. 2). (3) Include that file in the pinned library build (§7, p. 6). (4) Reject unexpected axioms, particularly `sorryAx` (§2, p. 2). (5) Report the counts and remaining reduced cores: 298 full, 18 library_wrapper, 14 reduced_core, and zero placeholder, totaling 330. The reduced cores cluster in continuous-time and discrete-process benchmarks (§7, Table 2, p. 6).

Verus form. Inference: a VL project could maintain a per-function or per-lemma record of whether a contract is the intended claim, a wrapper, or conditional on additional assumptions. It could check changes to trusted dependencies in its build. This is a proposed adaptation; the paper supplies neither a Verus implementation nor evidence that Verus exposes an equivalent axiom-reporting mechanism.

Evidence and limits. The paper reports that `lake build` compiles approximately 250 modules, ending with `AxiomAudit.lean` and `Examples.lean`. It names Lean v4.31.0, Mathlib commit `fabf563a`, BrownianMotion commit `bdf5ea0c`, and the Docker image `ghcr.io/raphaelrrcoelho/mathfin-verify`. It describes the audited results as resting on Lean's three standard axioms, `propext`, `Classical.choice`, and `Quot.sound` (§7, p. 6). Inference: checking an axiom list does not by itself establish that a human assigned the correct faithfulness tier.

## technique 2: build reusable principle bridges

What it is. The library organizes pricing around a non-negative linear pricing functional, the Garman normal form, and a Brownian-motion grounding bridge. The paper states: “The library stays coherent by deriving results from a few reusable principles rather than re-proving each instrument from scratch.” (§4, p. 4).

When to use it. Inference: this approach suits APIs whose contracts share mathematical structure and would otherwise repeat assumptions and proofs.

How to do it (paper's method). (1) Model pricing as a non-negative linear functional on payoffs, using `Foundations/StatePrices.lean`, `PricingKernel.lean`, `ConvexPricingFunctional.lean`, and `NoArbitrageDerivations.lean`. Linearity and non-negativity yield put-call parity, the forward price, and call-price convexity in the strike. (2) Express Black–Scholes-family prices in the Garman form, A·Φ(d1) − K·DF·Φ(d2), where DF is the discount factor. Instantiate A, DF, and effective volatility for particular instruments. (3) State marginal pricing hypotheses, such as a lognormal terminal asset under Q, and connect them to pre-Brownian motion through the grounding modules. (4) Prove identities between definitions developed in different modules (§4, p. 4). The extracted text truncates the first grounding filename after `BSCallHypFromBrownian.l`; it also names `PricingFromBrownian.lean`.

Verus form. Inference: VL could define a common mathematical pricing model, prove its structural laws once, and reuse those lemmas for concrete contracts. An executable implementation would additionally need a representation and an account of numerical error. These are adaptation proposals, not results evaluated in the paper.

Evidence and limits. The paper names `portfolioVarN_diag_eq_herfindahl`, equating diagonal-covariance N-asset Markowitz variance with the Herfindahl index scaled by the common variance. It also names `survivalFromForce_eq_hazardSurvival`, identifying actuarial and reduced-form credit survival functions by `rfl` (§4, p. 4). The paper describes such results as certified unifications of independently developed definitions, rather than new financial theory (§1, p. 2).

## technique 3: construct the continuous L2 Itô integral

What it is. The library constructs a continuous Itô integral as a bounded linear isometry, starting with deterministic and simple adapted integrands (§2, pp. 2–3; §5, p. 4).

When to use it. Inference: the staged construction is relevant when later proofs require continuous stochastic integration and existing foundations only supply deterministic or discrete objects.

How to do it (paper's method). (1) Establish the deterministic Wiener L2 isometry in `WienerIntegralL2.lean`. (2) Prove the adapted Itô isometry in `ItoIsometryAdapted.lean`: cross terms vanish through the weak Markov property of Brownian increments. (3) Use a π–λ density argument for simple adapted processes. (4) Apply the norm-preserving extension `LinearMap.extendOfNorm` to construct the continuous integral in `ItoIntegralL2.lean` and `ItoIntegralCLM.lean`. (5) Prove the worked Brownian integral identity in `ItoIntegralBrownian.lean` (§5, p. 4). (6) Develop quadratic variation, the integral's continuous L2 martingale property, Itô formulas, localization, pathwise local martingales, and a Feynman–Kac/heat-equation link (§5, p. 5).

Verus form. Inference: a finite approximation could support a smaller executable model whose algebraic properties are proved separately. A continuous version would require formal counterparts of the density, completeness, and measure-theoretic arguments. The paper establishes these constructions in Lean; it does not establish their availability in Verus.

Evidence and limits. The paper says of the surrounding stochastic-calculus core: “All are axioms-clean.” (§5, p. 5). It also draws an important dependency boundary: “The continuous integral is foundational infrastructure, and the pricing modules reach the continuous-time world through the marginal grounding bridge of Section 4, not by integrating against itoIntegralCLM_T.” (§5, p. 5). Thus construction of the integral does not mean that every pricing proof uses it directly. The reduced_core benchmark entries cluster partly in continuous-time work, but the paper does not identify all fourteen individually (§7, p. 6).

## technique 4: derive a risk-neutral measure instead of assuming one

What it is. `GaussianGirsanov.lean` uses an Esscher density for a static Girsanov change of measure. Starting with the physical Gaussian law, it derives the terminal lognormal law needed by the pricing formulas. The paper states: “So BSCallHyp (the hypothesis that the terminal asset is lognormal under Q, which the Black–Scholes section takes as input) is itself a theorem (BSCallHyp.exists_of_physical), and the discounted asset is a proven Q-martingale (ContinuousFTAP.lean, discountedGBM_isMartingale).” (§6, p. 5).

When to use it. Inference: this construction is relevant when pricing proofs assume a suitable probability measure and the physical model supplies enough structure to derive it.

How to do it (paper's method). (1) Start from the physical law of the Gaussian driver. (2) Change measure with an Esscher density in `GaussianGirsanov.lean`. (3) Establish `BSCallHyp.exists_of_physical` and prove the discounted geometric Brownian motion is a Q-martingale. (4) Compose the measure construction with pricing to obtain `bs_call_formula_of_physical` (§6, p. 5).

The paper also reports dynamic Girsanov results for constant, simple, continuous-adapted, and bounded-predictable drifts, in `GirsanovConstantTheta.lean` through `GirsanovPredictableTheta.lean`. Separately, `isEMM_noArbitrageSimple` proves that an equivalent martingale measure excludes arbitrage against simple predictable strategies. These establish the forward half of the first fundamental theorem in continuous time; the Delbaen–Schachermayer converse is outside the library (§6, p. 5). The paper does not give enough detail to treat these separate results as a single implementation recipe.

Verus form. Inference: VL could first target a finite-state change of measure and prove normalization and preservation of the intended pricing equations. A continuous model would need explicit probability foundations and an audit of any unproved assumptions. This is a proposed application, not a tested Verus translation.

Evidence and limits. The paper reports Margrabe's formula through the same change of numéraire. It also reports finite-state multi-period FTAP by Hahn–Banach separation, and general one-period FTAP for one or d assets by minimizing a smooth convex softplus potential whose logistic weight is the density (§6, p. 5). The general multi-period case and fully general progressively measurable Girsanov remain open (§8, p. 6).

## what is proved, trusted, and relevant to VL

The reported full and library_wrapper entries total 316 of 330; fourteen are reduced_core and none are placeholders (§7, Table 2, p. 6). These are the paper's reported benchmark and build results, not an independently reproduced build. Inference: trust also depends on the Lean kernel and build environment, and VL should make its own specification and proof assumptions visible.

The conclusion states: “Machine-checking classical financial mathematics yields certified unification of known results, not new financial theory; the contribution is methodological and infrastructural, a verified foundation for mathematical finance.” (§8, p. 6). Inference: the audit and shared-principle techniques are relevant to VL's reporting and reuse of proofs. The paper does not evaluate agent-written code, repair effort, Verus success, or competitive impact, so it cannot support a measured product-threat rating.

## techniques for the catalog

- faithfulness tiers and axiom checks — classify theorem statements and fail the pinned build on unexpected recorded axioms (§2, p. 2; §7, p. 6)
- principle-based bridge library — derive instruments from shared pricing, normal-form, and Brownian-grounding abstractions (§4, p. 4)
- staged continuous Itô construction — extend simple adapted integrals through isometry, density, and norm-preserving extension (§5, p. 4)
- derived risk-neutral measure — construct an Esscher/Girsanov measure and prove the pricing hypothesis (§6, p. 5)

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The library stays coherent by deriving results from a few reusable principles rather than re-proving each instrument from scratch."): read the entire paper and study; checked quotations, counts, section and printed-page references, construction steps, title, author, year, and arXiv link; corrected page references, replaced an abbreviated quotation, distinguished separate measure-theoretic results, and removed unsupported Verus capability and product-threat claims; did not reproduce the Lean build, inspect the artifact, or verify Verus adaptations.
