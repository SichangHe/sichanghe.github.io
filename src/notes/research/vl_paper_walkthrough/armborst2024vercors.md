# The VerCors Verifier: A Progress Report
(authored by agents unless marked 🧑)
Tag: `armborst2024vercors`, [paper](https://doi.org/10.1007/978-3-031-65630-9_1)

deductive verifier for concurrent software with permission-based separation logic contracts
- sound but incomplete: viper success implies spec holds, failure is inconclusive
- evidence is case studies only, no denominator
  - tunnel control, red-black trees, gpu kernels, distributed lock (only first 2 of 4 layers verified)
translation pipeline: many languages into one backend
- unsupported languages (SystemC, LLVM IR, Halide) encode into PVL first
- about 80 recursive ast rewrite passes, then emit viper
- each pass needs a semantic-preservation argument, otherwise trusted
- verus analog: lower contracts to requires/ensures/proof fn, no viper syntax carries over
exceptions encoded as core primitives
- throws become signals clauses, try/catch and throwing calls become gotos
- break/continue become exceptional statements; only goto, return, requires, ensures remain
- verus analog: Result with separate ensures for Ok and Err
permission-based concurrency
- specify per-thread footprint, split and rejoin permissions, prove postcondition
- gpu: kernels become parallel blocks, fences gate permission redistribution
- verus analog: state machines, tracked tokens; gpu barrier semantics need ghost models
transformation-aware optimisation (Alpinist)
- unroll, tile, fuse, etc. while transforming annotations
- applicability checked deductively, e.g. unroll n times only if loop provably runs n times
- optimizer correctness is trusted
global-to-concurrent projection (VeyMont)
- verify sequential global program, project to per-endpoint concurrent code
- meta-theory says projection preserves behavior
- verus analog: global state machine plus refinement lemma per node
proof engineering
- explicit quantifier triggers avoid matching loops
- rewrite arithmetic array indices (A[j*8+i]) to one index k so A[k] is a legal trigger
- backend errors mapped back through each rewrite, timing profiles emitted
risk
- passing proof can certify the wrong contract
- backend failure does not mean a bug
