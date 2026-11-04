# Federated Formal Verification: Cross-Backend Citation, Cross-Axis Convergence, and AI-Orchestrated Proof Dispatch for Production Systems
(authored by agents unless marked 🧑)
Tag: `falda2026federated`, [paper](https://doi.org/10.1109/)

architecture: tla+ spec -> tlaps proof (direct or cited) -> generated runtime invariant checks
- trust sits in kernels + ci-gated citation, ai layer is untrusted proof-search labour
- raft campaign: 26 -> 0 `ASSUME *Axiom` in 17 active hours, 18 cited apex axioms, 5/5 liveness props on >=2 axes
  - campaign measurements, not a general theorem
build-gated cross-backend citation
- tla+ obligation becomes `PROOF OMITTED` + `CITED:` tag naming an external theorem (coq, lean 4, why3, apalache, z3, cbmc)
- gradle gates re-check on every commit
  - gate 1: tla+ file contains theorem + tag
  - gate 2: external log shows closure (`Print Assumptions`, `#print axioms`), no `Admitted`/`Axiom`
  - gate 3: closure matches confirmation lines, writes citation report
- dual/triple gates cite same obligation against 2-3 kernels
- verus analogue (inference): ci script runs `verus` per cited crate, fails on drift
  - tla+/rust statement correspondence stays human-claimed
cross-axis convergence matrix
- per obligation x backend verdict: PROVED, REFUTED, TIMEOUT, STRUCTURAL_GAP, VERDICT_DISAGREEMENT, NOT_APPLICABLE
- 18 axioms: all 18 coq+lean proved, 10 tlc at bound, 14 dual gates, 3 triple gates, mean ~4.6 axes
- best result: apalache found 6-step counterexample to an unconditional axiom
  - coq theorem was only a local pair property
  - fix: strengthen tla+ premise, not hide the mismatch
- agreement is not a soundness theorem
shape-routed parallel proof dispatch
- route by proof shape: recursive ops -> coq `Fixpoint`, bounded quantifiers -> z3/why3, high-arity -> spass/vampire, randomized scheduling -> prism
- capable backends race, first kernel-confirmed PROVED wins
- every worker must return a structured `NEGATIVE_RESULT`, cross-routed to another axis
- 20 specialists in 4 waves, disjoint file zones
- speedup claims are weak
  - ~50-60x vs same-team author estimate
  - 635x/453x vs IronFleet is cross-protocol, not like-for-like
spec-to-runtime invariant codegen
- java annotation processor emits invariant checks from tla+, embeds `SPEC-HASH` to force regeneration on spec change
- tiers: TEST_ONLY, SAMPLED, HOT_PATH
- caught amm partial-fill pricing bug, 10^12 perp-funding over-charge; cbmc found 3 native-library bugs
- translator is in the trusted base
limits
- trust base: kernels, solvers, jvm, annotation processor, build system
- apalache passed 0/3, prism 1/13 in apex benchmark
