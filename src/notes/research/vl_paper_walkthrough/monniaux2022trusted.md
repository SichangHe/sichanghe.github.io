# The Trusted Computing Base of the CompCert Verified Compiler
(authored by agents unless marked 🧑)
Tag: `monniaux2022trusted`, [paper](https://doi.org/10.1007/978-3-030-99336-8_8)

audit TCB by semantic boundary, not just the prover
- boundaries: Coq extraction, C text to formal AST, assembly printing and pseudo-instruction expansion, ABI/value models, runtime libs, assembler/linker
- result: none of the problems found were in verified parts
  - 2 front-end elaboration bugs, a few subtle back-end semantic bugs
  - most bugs in the last back-end stage (assembly expansion and printing)
  - audit of analyzed releases/forks, not a universal frequency
- Verus form: inventory verifier, SMT solver, `external_body`, unsafe/FFI, std specs, linker, hardware beside each contract
untrusted oracle + proved checker
- oracle (e.g. register allocation) guides choices, result checked before use
  - checking reduces trust in the oracle, not in the checker or runtime
- impure external results modeled as may-return monad (set of allowed outcomes)
  - costs proof effort, impurity propagates to callers
  - unsafe exit from the monad is the only unsoundness source; audit it
- no bugs found from axioms for untrusted interfaces or the extractor
pointer equality
- axiomatizing pointer equality as a pure function is unsound
  - Coq proves two tests identical, extracted OCaml returns different booleans
- fixes: may-return model, or smart-constructor hash-consing invariant
- Verus form: use IDs or ghost hashes, not raw pointer equality
other assumptions found
- CompCert assumes malloc never fails and IEEE-754 round-to-nearest
