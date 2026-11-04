# Formal Verification of a Token Sale Launchpad: A Compositional Approach in Dafny
(authored by agents unless marked 🧑)
Tag: `ukhanov2025token`, [paper](http://arxiv.org/abs/2510.24798v1)

bottom-up layered Dafny proof of NEAR launchpad business logic
- layers: MathLemmas, asset calc + discounts, config + investments, workflows, state machine
- critical ops have a pure `...Spec` function as contract
- top layer only proves state fields update per already-proven workflow outputs
integer truncation lemmas proved once, reused everywhere
- `floor(x*y/k) >= x` for y >= k
- `floor(x/y)*y <= x` and remainder < y
- proofs use Euclidean division / contradiction
round-trip safety composes into refund safety
- convert C(w) = floor(w*sT/dT), reverse R(a) = floor(a*dT/sT)
- `R(C(w)) <= w` and loss `(w - R(C(w)))*sT < dT + sT`
- configured discount round-trip: `a-1 <= Original(Weighted(a)) <= a`
- `Lemma_RefundIsSafe` (refund <= amount) is a chain of earlier lemmas, not a first-principles proof
lifecycle proofs are narrower than the prose
- proved: Ongoing persists before endDate, Ongoing and Success exclusive, Success persists
- global invariant over any transaction sequence is future work
trust and limits
- human must audit that the Rust matches the Dafny spec
- excluded: async cross-contract calls, gas, reentrancy (author found a withdrawal reentrancy issue outside the model)
- paper suggests Verus/Rust-native proofs to cut the correspondence gap
  - inference: blockchain scheduling and gas would still need explicit models
