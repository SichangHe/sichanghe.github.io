# Formal Verification of a Token Sale Launchpad: A Compositional Approach in Dafny
(authored by agents unless marked 🧑)
Tag: `ukhanov2025token`, [paper](http://arxiv.org/abs/2510.24798v1)

## result and architecture

Ukhanov reports verification of the pure business logic of a NEAR token-sale launchpad in Dafny. The method is bottom-up: “The verification effort is structured around a compositional, bottom-up approach, which is crucial for managing complexity [8, 9].” (Section 2, p.2). Five layers are used: MathLemmas; AssetCalculations and Discounts; Config and Investments; Deposit/Withdraw/Claim/Distribution workflows; and the Launchpad state machine (Section 2, p.2). Critical operations separate specifications from implementations: “For most critical operations, a function ending in ...Spec defines the pure mathematical contract.” (Section 2, p.2).

Inference: reuse this architecture when arithmetic and workflow proofs would otherwise be entangled. Define pure specifications and reusable arithmetic lemmas, compose them in workflow proofs, then prove state updates against workflow results. The paper describes the top-level proof boundary explicitly: “Instead, they focus solely on proving that the global state fields are updated correctly based on the outputs from the already-proven workflow functions.” (Section 5.5, p.5).

## technique: first-principles integer arithmetic lemmas

The MathLemmas layer supplies explicit proof guidance for non-linear multiplication and division. For natural numbers with x>0, k>0, y≥k, it proves `floor((x*y)/k) ≥ x`; strengthening y≥k to y≥2k gives `floor((x*y)/k) > x`. For natural x and positive y, it proves `floor(x/y)*y ≤ x` and `0 ≤ x-floor(x/y)*y < y` (Section 3, pp.2–3; Appendix A, pp.8–10).

The division-monotonicity proof assumes the opposite inequality and derives a contradiction using Euclidean division. The scaling proof then invokes division monotonicity on `x*y ≥ x*k`. The truncation proof asserts `x == (x / y) * y + (x % y)` and uses the remainder bounds (Appendix A, Lemmas 1, 2, and 6, pp.8,10). The intended reuse is explicit: “These foundational lemmas abstract away the complexities of integer arithmetic, allowing higher-level modules to reason about calculations in terms of simple inequalities.” (Section 3, p.3).

## technique: round-trip conversion and discount safety

Asset conversion is `C(w,dT,sT)=floor((w*sT)/dT)` and reverse conversion is `R(a,dT,sT)=floor((a*dT)/sT)`, with positive price terms dT and sT (Appendix B.1, p.11). For positive w, the favorable-price lemma proves `C(w,dT,sT) ≥ w` when sT≥dT; this is a non-decrease guarantee relative to w. Separately, reverse conversion is monotone in its input (Appendix B.2.1, p.11; B.4.1, p.12).

For positive w,dT,sT and `C(w,dT,sT)>0`, the round-trip lemma proves `R(C(w,dT,sT),dT,sT) ≤ w` and `(w-R(C(w,dT,sT),dT,sT))*sT < dT+sT` (Appendix B.4.3, p.13). Its helper first proves that scaled loss equals the sum of the two division remainders. Bounding each remainder by its divisor gives the strict loss bound (Appendix B.4.2–B.4.3, pp.12–13).

Discounts use MULTIPLIER=10000. A valid discount has `0 < percentage ≤ MULTIPLIER` and `startDate < endDate`; it is active on `[startDate,endDate)`. Non-overlap requires, for every i<j, either `Di.endDate ≤ Dj.startDate` or `Dj.endDate ≤ Di.startDate`. The uniqueness proof assumes two distinct discounts are active and contradicts non-overlap (Section 4.2, p.3; Appendix C.1, p.14; C.4, p.15).

At the configuration level, weighting applies the active discount or returns the unchanged amount. Reversion uses the same configuration and time. For valid configuration and positive amount a, the composite round-trip satisfies `a-1 ≤ Original(Weighted(a,t),t) ≤ a`. The proof splits on whether a discount is active; the active case uses truncation and division-lower-bound lemmas (Appendix D.2–D.3, pp.16–18).

## technique: compositional refund proof

`DepositFixedPriceSpec` weights the deposit, converts it to sale assets, and compares existing sold tokens plus those assets against the sale cap. If the cap would be exceeded, it reverse-converts the excess assets and reverses the discount to obtain the refund (Appendix E.2, p.19).

`Lemma_RefundIsSafe` proves `refund ≤ amount`. Its stated assumptions include a valid configuration, positive deposit, weighted amount and price terms, and excess assets no larger than total assets. The proof chains reverse-conversion monotonicity, asset round-trip safety, original-amount monotonicity, and discount round-trip safety:

`refund = Original(R(excess)) ≤ Original(R(assets)) ≤ Original(weighted) ≤ amount`

The functions here use the same configuration, time, and price terms throughout (Section 5.1, p.4; Appendix E.4, p.20). The paper describes the composition directly: “It does not attempt to prove the property from first principles but instead constructs a deductive chain using previously verified lemmas from other modules.” (Appendix E.4, p.20). The separate amount-conservation lemma proves `retained amount + refund = deposit amount` from the fixed-price workflow definition (Appendix E.3, p.19).

Inference: reuse the explicit intermediate inequalities to make each dependency and precondition visible. The refund upper bound uses the non-value-creation parts of the round-trip contracts; the numerical loss bounds provide additional guarantees.

## technique: state-machine lifecycle proofs

The Launchpad datatype stores financial totals, distributed accounts, and vesting claims. Status computation supplies prerequisites for transitions: deposits require Ongoing; withdrawals require Failed, Locked, or Ongoing with PriceDiscovery; claims require Success and a positive unclaimed amount; distributions require Success and pending recipients. Transition postconditions connect global updates to the lower workflow results (Section 5.5, p.5; Appendix I.4, pp.26–27).

The displayed lifecycle formulas are narrower than the surrounding prose. They prove that, for a fixed state Σ, an Ongoing status persists at a later time before endDate; Ongoing and Success cannot hold together; and Success persists as time advances. The prose additionally names Failed and Locked as terminal states (Appendix I.3, p.25). Inference: these displayed formulas should not be treated as proofs of every pairwise status exclusion or preservation across arbitrary transactions. Section 6.3 lists a global invariant over any transaction sequence as future work (pp.6–7).

## evidence, trust, and limits

The paper reports proofs of arithmetic, conversion, discounts, refund safety, withdrawals, allocation, vesting monotonicity, distributions, and lifecycle transitions. It gives proof descriptions rather than runtime benchmarks. Its production-code limitation is direct: “For the proofs to apply to the production system, there is a critical, implicit step: a human expert must manually audit the Rust implementation to ensure it is a faithful and precise translation of the verified Dafny specification.” (Section 6.1, p.6).

The model excludes asynchronous cross-contract calls, gas mechanics, out-of-gas failures, and potential reentrancy vulnerabilities. The author notes a withdrawal reentrancy issue discovered during development as an example outside the abstract logic's coverage (Section 6.2, p.6). Global validity across transaction sequences, liveness including liquidity, and fidelity between recorded assets and actual controlled assets remain future work (Section 6.3, pp.6–7).

Section 6.1 proposes verified code generation or specifications and proofs directly in Rust, including Verus, as future approaches. Inference: using Verus in production Rust could reduce the manual correspondence burden, but blockchain scheduling and gas would still need explicit models. The paper does not establish a detailed Verus translation or a verified deployed Rust implementation.

## techniques for the catalog

- layered specification architecture — separate arithmetic, financial primitives, workflows, and state transitions so upper proofs reuse lower lemmas
- integer truncation lemmas — prove monotonicity and bounded loss for multiplication/division once, then instantiate them for asset and discount calculations
- round-trip safety — bound conversion and discount reversal with explicit inequalities that compose into refund safety
- lifecycle state-machine proof — require valid statuses for transitions and prove the stated temporal and exclusion properties
