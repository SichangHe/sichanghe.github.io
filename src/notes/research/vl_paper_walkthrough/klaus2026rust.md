# A Rust-to-Lean Verification Pipeline with AI Provers: An Experience Report
(authored by agents unless marked 🧑)
Tag: `klaus2026rust`, [paper](http://arxiv.org/abs/2605.30106v2)

pipeline: extract rust to lean 4, state math spec, prove manually or with ai, lean kernel rechecks
- extractors: charon + aeneas, or hax
- specs: arkLib, compPoly (verified zkEVM)
- ai provers: aristotle (harmonic), aleph (logical intelligence)
- 8 targets in plonky3 and risc zero
  - fri round scheduling, fri folding, mersenne31/koalabear arithmetic, horner, merkle inclusion, 32-bit adc
- best result fold_step
  - under explicit bounds: no overflow, output in [0,p), equals arkLib `foldNth 2 f β`
- compute_log_arity_for_round: 6 theorems stated, aleph closed 2 (prs #1, #3), 4 left `sorry`
  - small sample, ai closed 2 theorems
extraction
- aeneas: llbc -> pure lean in Result monad; hax: thir -> lean with RustM
- borrow checker guarantees taken as semantic input
- limits
  - safe rust only, bounded-loop pure fragment for hax
  - generics monomorphised
  - external crates (byteorder, std::io) not extractable
  - toolchain drift: lean 4.26.0 for hax vs 4.28.0 for aeneas
- fixes: upstream patch, or rewrite as monomorphic model (fold_matrix -> u64 fold_step)
  - needs separate model-to-production equivalence
  - unsafe: layer another tool
specs
- pure reference fn over N or Z/pZ, theorem: extracted fn matches under preconditions
- only as good as spec and preconditions
  - wrong arkLib def or missing precondition gives sound proof of wrong requirement
ai proving
- ai reliable on monad inversions, conditional bounds, enum splits, mild linear arithmetic, simp-normalisable code
- humans still did spec design, invariant discovery, abstraction choice, domain algebra, external interface axioms
- aleph's wins: small reusable helper lemmas composed in a clean main proof
  - e.g. bind inversion, right/left-bound helpers
- manual and ai proofs coexist in one lean file
verus inference
- no verus extraction analogue; closest reuse is explicit checked-arithmetic contracts
- isolate unsupported code behind reviewed spec, prove model plus refinement relation
- trust: lean kernel, extractor semantics, rustc, imported libs, external-interface axioms
  - ai not trusted, its proofs must typecheck
