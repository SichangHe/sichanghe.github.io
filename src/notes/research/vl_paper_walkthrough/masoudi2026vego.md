# VeGo: Direct Deductive Formal Verification of Go Programs for Computer Science Education
(authored by agents unless marked 🧑)
Tag: `masoudi2026vego`, [paper](http://arxiv.org/abs/2608.22630v1)

vego: deductive verification of Go with specs in `//@` comments
- files stay valid Go, compile with standard toolchain
- pipeline: comment preprocessing, cfg + ssa, weakest-precondition vcs, native HM[X] solver with Fourier-Motzkin arithmetic
- claim: all CLRS, Kleinberg-Tardos, Okasaki, Knuth suite programs verify under `vegop --strict`
  - paper's own benchmark claim, no independent proof of tool
- targets education
spec features
- `Requires`, `Ensures`, `Exsures` (impossible state, checked by assuming it and deriving contradiction)
- every loop needs `Invariant` and an integer `Variant` (bounded below by 0, strictly decreasing)
  - recursion uses `Measure`
- primed variables relate pre/post state, one prime per mutation, one-to-one with ssa versions
- `Preserves` asserts a property across a nested block
- inductive predicates define partial results, e.g. `sumTo(A,i,s)`
contract precision
- checks declared contract against principal pair: wp(C,Q) and sp(P,C), detects weak or vacuous contracts
- sorting example: `sorted(A)` is satisfied by all zeros
  - add `multiset(A) == multiset(A')` to force permutation
- inference for Verus: no automatic adequacy checker, needs review
workflow
- `.vgos` headers for external contracts, lsp diagnostics, `vegop compile` with runtime assertion gate, transpile to plain `.go`
