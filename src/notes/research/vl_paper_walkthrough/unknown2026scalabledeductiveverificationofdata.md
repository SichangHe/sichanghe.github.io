# Scalable Deductive Verification of Data-Level Parallel Programs
(authored by agents unless marked 🧑)
Tag: `unknown2026scalabledeductiveverificationofdata`, [paper](http://arxiv.org/abs/2605.13616v1)

4 techniques make GPU-kernel verification in VerCors (→ Viper → SMT) faster
- result: average 9x less verification time, outliers up to 150x
  - benchmarks: CLBlast kernels, Halide programs, Radio Telescope pipeline
  - setup: 10 runs averaged, 1h total timeout, 60s assertion timeout
  - 9x average, 8.5x (level 1) and 10.8x (level 2) cover different subsets, don't combine
quantifier inverse rewriting
- problem: arithmetic index like `A[k*i]` is illegal as a Viper trigger, so solver can't instantiate
- fix: rewrite `forall x1..xk. R(A[f(x)])` to `forall x. Y(x) ==> R(A[x], f^-1(x))`
  - `A[x]` is now a plain trigger
  - 4 side conditions on the linear index (nonzero coefficients, consistent signs, bounded sum, nk > 0)
- equivalence proved in about 2500 lines of Lean 4
  - VerCors, Viper, SMT, and the specs stay trusted
- without it the benchmarks don't verify at all
  - `gemm_3` still fails: modulo pattern unsupported
  - nonlinear modulo/multiplication in the new domain may still need lemmas
immutable pointer qualifier
- never-written arrays modeled as math sequences, not heap cells
  - avoids heap snapshots and permission-chunk comparisons
- up to 10x faster on CLBlast level 1/2
- unsound if the annotation is wrong
uniqueness numbers `unique<i>`
- only same-number pointers may alias
  - Viper puts each class in its own field, so snapshot comparison skips non-aliasing chunks
- Halide: total time down more than 1.9x
- Radio Telescope: 3 cases verify only with qualifiers
- not a cure for nonlinear arithmetic: some variants still time out
kernel-body extraction
- verify the body under its own contract, so the solver sees less context
- always helps (`xscal` difference not significant)
  - with qualifiers gives largest gains, e.g. `xger` 150x
Verus takeaways (inference)
- state index maps and inverses as `spec fn` plus `proof fn` lemmas, put the normalized form in `ensures` and invariants
- split big functions into helpers with tight `requires`/`ensures`
- trigger syntax is version-specific, no direct `unique`/`Perm` equivalent
