# Formal Verification of a Token Sale Launchpad: A Compositional Approach in Dafny
(authored by agents unless marked 🧑)
Tag: `ukhanov2025token`, [paper](http://arxiv.org/abs/2510.24798v1)

## result and architecture

Ukhanov verifies the pure business logic of a NEAR token-sale launchpad in Dafny. The method is bottom-up: “The verification effort is structured around a compositional, bottom-up approach, which is crucial for managing complexity.” (Section 2, p.2). Five layers are used: MathLemmas; AssetCalculations and Discounts; Config and Investments; Deposit/Withdraw/Claim/Distribution workflows; and the Launchpad state machine (Section 2, p.2). Critical operations use Specification-Implementation Separation: “a function ending in ...Spec defines the pure mathematical contract” (Section 2, p.2).

Use this architecture when arithmetic and workflow proofs would otherwise be entangled. First define pure specifications and prove reusable lemmas; then make workflow specifications call those lemmas; finally prove state transitions only update fields according to already-proven workflow results. The paper's top-level transitions do not re-prove financial arithmetic; they prove orchestration over lower-layer contracts (Section 5.5, p.5).

Verus form (inference): put executable Rust and `spec fn` contracts in one module, with `requires` and `ensures` on executable functions and `proof fn` lemmas for arithmetic. A pure `...Spec` maps naturally to a `spec fn`; a runtime `...Spec` function would be wrong because proof-only functions cannot be called at runtime. State transitions can use ghost views of the contract state and `ensures` relating old and new fields. The Dafny-to-Rust correspondence is not automatic (inference).

## technique: first-principles integer arithmetic lemmas

The MathLemmas layer proves multiplication/division facts that SMT solvers do not discover reliably. For x>0, k>0, y≥k, it proves `(x*y)/k ≥ x`; for y≥2k it proves strict increase `(x*y)/k > x`; and for y>0 it proves bounded truncation `floor(x/y)*y ≤ x` and `x-floor(x/y)*y < y` (Section 3, pp.2–3). Apply them by stating the arithmetic preconditions, proving the lemma once, and invoking it in financial calculations. The paper explicitly says: “These foundational lemmas abstract away the complexities of integer arithmetic, allowing higher-level modules to reason about calculations in terms of simple inequalities.” (Section 3, p.3).

Verus form (inference): write each as a `proof fn` with integer `requires` and `ensures`, splitting multiplication and Euclidean division into solver-friendly assertions. Call the proof lemma from later proofs; keep the arithmetic theorem independent of token-sale state. The exact Dafny names do not carry over, but the contract structure does.

## technique: round-trip conversion and discount safety

Asset conversion is `CalculateAssetsSpec(amount,dT,sT)=(amount*sT)/dT`. Prove monotonicity by instantiating the first arithmetic lemma when sT≥dT. Then prove round-trip safety: `Revert(Assets(w)) ≤ w` and `(w-Revert(Assets(w)))*sT < dT+sT` (Section 4.1, p.3). The second inequality bounds loss caused by truncation. Discounts use a multiplier of 10000 and a non-overlap predicate: for every i<j, either `Di.endDate ≤ Dj.startDate` or the reverse (Section 4.2, p.3). Dafny proves this implies a unique active discount and proves applying then reverting a discount loses at most one minimal unit.

Verus form (inference): encode discounts as a `Seq` view and the pairwise condition in a `spec fn`; prove uniqueness with a quantified `proof fn`. Use `ensures` for the two round-trip inequalities and call arithmetic lemmas. Quantifier instantiation and sequence indexing need explicit bounds; this is a proof-engineering obligation absent from the paper's Dafny presentation.

## technique: compositional refund proof

`DepositFixedPriceSpec` handles a hard cap and partial refunds. `Lemma_RefundIsSafe` proves `refund ≤ amount` by chaining four previously proved facts: reverted excess assets are no larger than reverted total assets; asset round-trip is bounded; reverting a discount is monotone; and discount round-trip loses at most one unit (Section 5.1, pp.4–5). The paper calls this “The paramount safety property for this entire system” (Section 5.1, p.4). Apply it by proving each inequality with explicit intermediate variables, then let transitivity establish the final bound.

Verus form (inference): make each inequality a separate `proof fn` lemma with narrow `requires`; in the refund proof, introduce ghost values for weighted amount, assets, reverted assets, and original amount, then call lemmas in chain order. Keep `ensures refund <= amount` on the executable deposit function. This localizes solver failures and makes denominator/rounding assumptions visible.

## technique: state-machine lifecycle invariants

The Launchpad datatype stores financial totals, distributed accounts, and vesting claims. Pure status computation supports three lemmas: mutual exclusion of statuses, forward movement with time, and terminality of Success/Failed/Locked (Section 5.5, p.5). Each transition has state guards: deposits require Ongoing; withdrawals require Failed, Locked, or valid price discovery; claims require Success; distributions require post-success. Apply by proving each transition's precondition, delegating calculations to workflow modules, and proving only the changed fields are updated.

Verus form (inference): define a ghost state view and status `spec fn`; put guards in `requires`, state updates in `ensures`, and lifecycle facts in `proof fn` lemmas. A transition proof must account for Rust ownership and mutable references, which the pure Dafny model does not address.

## evidence, trust, and limits

The paper reports proofs of arithmetic, conversion, discounts, refund safety, withdrawals, allocation, vesting monotonicity, distributions, and lifecycle transitions, but no runtime benchmark or independent deployed-code correspondence. Its own limitation is direct: “a human expert must manually audit the Rust implementation to ensure it is a faithful and precise translation of the verified Dafny specification.” (Section 6.1, p.6). The model abstracts away asynchronous cross-contract calls, gas, out-of-gas failure, and reentrancy (Section 6.2, p.6). Liveness and fidelity remain future work (Section 6.3, p.7). Thus the trusted base includes Dafny, the specification, arithmetic model, and manual Rust translation. Inference: product threat is high if VL proves only a model while deploying separately written Rust; using Verus contracts in the production Rust artifact directly addresses that correspondence gap, but does not model blockchain scheduling or gas automatically. Existing work already demonstrates layered financial safety proofs; VL should reuse the decomposition rather than invent a monolithic contract proof.

## techniques for the catalog

- layered specification architecture — separate arithmetic, financial primitives, workflows, and state transitions so upper proofs reuse lower lemmas
- integer truncation lemmas — prove monotonicity and bounded loss for multiplication/division once, then instantiate them for asset and discount calculations
- round-trip safety — bound conversion and discount reversal with explicit inequalities that compose into refund safety
- lifecycle state-machine proof — guard transitions by status and prove mutual exclusion, temporal progress, and terminal states
Checked 2026-10-15 against paper ukhanov2025token: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
