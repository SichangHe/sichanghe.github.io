# Verified Foundations for Differential Privacy
(authored by agents unless marked 🧑)
Tag: `demedeiros2025sampcert`, [paper](https://doi.org/10.1145/3729294)

SampCert: lean 4 library linking differential privacy (DP) proofs to executable samplers
- over 12,000 lines of lean proof; samplers power aws dp offerings (author-reported)
  - deployed only samplers, not the dp query implementations
abstract privacy interface `AbstractDP`
- fields: monotonicity, adaptive composition, postprocessing, constant base case, reduction to approximate dp
- instantiated for pure dp and zCDP
  - zCDP instance ~3000 lines (rényi divergence, integrals, jensen)
- proofs over the interface hold for all instances
  - private histogram proof under 50 lines: per-bin sensitivity 1, γ/nBins per bin, induction with compose+postprocess
- `DPNoise` separates sensitivity from noise; rational parameters avoid floating point
  - prover discharges `noise_priv` arithmetic
exact verified samplers
- integer-only discrete laplace and gaussian with closed-form pmf, not rounded floats
  - floating-point samplers are a known privacy-bug source
- gaussian = laplace + bernoulli acceptance; zCDP via poisson summation from Mathlib
slang: probabilistic language over unnormalized mass functions
- primitives `probPure`, `probBind`, `probUniformByte`, `probWhile`
- unnormalized mass avoids carrying normalization through loop invariants
  - normalize once, after proving total mass 1
- loop correctness = cut reachability + cut stability
  - geometric sampler: n+1 cuts reach target mass, later cuts unchanged
  - rejection sampling stabilizes exponentially instead
extraction and trust
- lean c++ ffi: 5 external functions, 57 lines, `/dev/urandom`; or dafny to python
  - lean gives no guarantee on compiled runtime behavior
  - samples checked with kolmogorov-smirnov test
- gaussian faster than canonne et al. by >2x; diffprivlib faster at small σ
- tcb: ffi or dafny extraction, toolchains, proof checker axioms, randomness, chosen privacy spec
limits
- countable discrete spaces only, plain-list databases (no group privacy), one real privacy parameter
- timing side channels not covered
verus takeaways (inference)
- generic interface + instance pattern reduces repeated proofs but a new math model remains costly
- port needs probability model, infinite sums, suprema; or record them as trusted
