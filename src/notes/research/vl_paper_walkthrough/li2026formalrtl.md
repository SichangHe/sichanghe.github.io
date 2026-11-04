# FormalRTL: Verified RTL Synthesis at Scale
(authored by agents unless marked 🧑)
Tag: `li2026formalrtl`, [paper](https://arxiv.org/abs/2603.08738)

multi-agent pipeline: C/C++ reference model + spec -> RTL, checked by hw-cbmc C/RTL equivalence
- reference model is the executable golden spec
- agents: planning, initializing, debugging; Clang static analysis for partitioning
- eval: 16-bit SoftFloat ops + manual 8-bit Hifloat8, 20 runs per module, 20-iteration repair cap
  - failed run counts as 40 iterations
  - FSR 100% for most leaves, 70-95% for larger/sequential modules
decompose by AST dependency graph, verify bottom-up
- partition top function into subfunctions, one targeted spec each
- topological order; verified dependent RTL passed as context
- f16_add (1130 lines): 0% for spec-only monolithic baseline, 95% FSR for FormalRTL
  - baseline repair budget 5-30 iterations, close to decomposed total
  - covers datapath-heavy modules only, control logic deferred
generate implementation and equivalence harness together
- harness assumes identical inputs, asserts equal outputs
- sequential spec: agent fixes exact cycle count, enables transactional equivalence
  - sequential Hifloat8 add/mul FSR 70%/80%, hardest cases
counterexample-guided repair beats pass/fail feedback
- bug locator for syntax errors, counterexample simplifier for mismatches
- `normalize` ablation, FSR / avg iterations
  - full: 95% / 6.40
  - no locator: 80% / 14.15
  - no simplifier: 90% / 9.55
  - no counterexample guidance: 55% / 21.30
limits
- equivalence = functional agreement with the C model, not PPA optimality
  - hifloat8_mul: 1015 um^2, 3.29 ns vs engineer 743 um^2, 1.78 ns
- trusts C reference, harness, Clang, hw-cbmc
- refs and specs manually prepared
Verus transfer (inference)
- verify leaf `proof fn`/functions first, callers assume their contracts
- repair agent must never weaken `requires`/`ensures`/invariants
- report first-pass and bounded-repair success separately, with denominators
