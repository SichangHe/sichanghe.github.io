# Formally Verified EVM Block-Optimizations
(authored by agents unless marked 🧑)
Tag: `albert2023evm`, [paper](https://doi.org/10.1007/978-3-031-37709-9_9)

translation validation in Coq for jump-free evm blocks
- verify a checker per original/optimized pair, not the optimizer
  - compilers and smt-based optimizers evolve, verifying them is daunting
- scope: stack operations only, no gas, memory, storage, or cross-block
- semantic equivalence: same successful final state for every initial stack of size k
  - both-fail is not enough, causes can differ
checker pipeline, each stage proved sound
- symbolic execution with fresh variables mapped to expressions avoids deep terms
  - sym_exec_snd: result matches concrete interpreter for all stacks of size k
- simplification rules, e.g. E + 0 to E, each proved semantics-preserving
  - 15 rules composed into strategies
- syntactic comparison modulo commutativity
  - sound but incomplete, false negatives when syntax differs
trusted base
- concrete interpreter, called minimal tcb
- operation map claims (arity, commutativity)
evidence
- more than 180 proofs, about 7000 lines of Coq
- solc tests: 1,045 of 1,280 blocks proved, failures from unimplemented rules
- gasol: 147,798 blocks from 96 contracts
  - with simplification, 99% proved in 50.61 s total
  - without, 63% (gas) to 99% (size)
  - found a gasol parsing bug, SGT treated as GT
verus form (inference)
- checker soundness as a lemma, symbolic exprs as enums, state model encoded explicitly
