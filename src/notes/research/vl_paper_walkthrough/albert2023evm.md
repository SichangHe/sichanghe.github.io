# Formally Verified EVM Block-Optimizations
(authored by agents unless marked 🧑)
Tag: `albert2023evm`, [paper](https://doi.org/10.1007/978-3-031-37709-9_9)

## problem and approach
The paper verifies that optimized, jump-free EVM opcode blocks preserve behavior. Its abstract says, “We reconcile efficiency and security by providing the verification technology to formally prove the correctness of EVM block-optimizations on smart contracts using the Coq proof assistant.” The method is translation validation: check each original/optimized pair with a verified checker rather than verify an optimizer that may change.

A block is a list of instructions operating on a stack. A stack-operation map supplies each opcode’s implementation, arity, and commutativity claim. The concrete interpreter returns `Some state` on successful execution and `None` for stack overflow; it does not model gas (Section 3, p.180). The paper states, “Our implementation follows the EVM semantics [38], considering the simplicity of the supported operations, the concrete interpreter is a minimal trusted computing base” (Section 3, p.180).

## technique: define semantic equivalence and a sound checker
What it is: for initial stack size `k`, require both blocks to succeed and produce the same final state for every initial stack of that size. The formal `sem_eq_blocks` definition quantifies over input states and requires an equal successful output (Section 4, p.180). Returning `None` for both is not enough because failures could have different causes.

How to apply it:
1. Define the instruction subset and a valid operation map, including commutativity and successful arity behavior (Section 3, p.180).
2. Define concrete execution for each candidate block (Section 3, p.180).
3. Fix the statically known initial stack size `k`; reject underflow/overflow cases rather than reporting equivalence (Section 4, p.180).
4. Implement a Boolean checker and prove `checker = true → sem_eq_blocks` (Section 4, p.181).

Inference: in Verus, a translation validator could execute two Rust functions over a bounded abstract state and prove equal post-state with `requires`/`ensures`, while the verified checker itself would be a `proof fn` or executable function whose soundness is a lemma. Verus does not provide Coq’s inductive interpreter automatically; the state model and operation assumptions must be encoded explicitly.

## technique: symbolic execution with fresh expression variables
What it is: execute each block over an initial symbolic stack and represent the final stack as constants, input variables, and fresh variables mapped to expressions. Fresh variables avoid deeply nested terms. The paper’s Example 2 compares `PUSH1 0x5 SWAP2 MUL ADD` with `PUSH1 0x0 ADD MUL PUSH1 0x5 ADD` for `k=3` (Section 4.1, p.182).

How to apply it:
1. Build `[s0,…,s(k−1)]` as the symbolic initial stack.
2. Execute instructions, introducing fresh IDs for compound expressions and recording their definitions in an ordered map.
3. Require every fresh variable used in a definition to have a smaller index (`valid_sstate`, Section 4.1, p.182).
4. Define evaluation of a symbolic state under a concrete initial state.
5. Prove `sym_exec_snd`: a successful symbolic result is valid and evaluates to the concrete interpreter’s output for every input stack of size `k` (Section 4.1, p.182).

Inference: Verus can represent symbolic expressions as enums and prove an interpreter correspondence lemma with recursive `proof fn`s. The paper’s Coq `Inductive` syntax and theorem statements do not carry over verbatim.

## technique: sound simplification rules
What it is: rewrite symbolic states to equivalent simpler states, such as replacing `E + 0` or `0 + E` by `E`. An optimization function never fails; it returns a state and a Boolean saying whether it changed anything (Section 4.2, p.183).

How to apply it:
1. Implement one rewrite over valid symbolic states.
2. State `optim_snd`: validity is preserved and concrete evaluation is unchanged.
3. Prove each rule, such as `optimize_add_zero_snd`.
4. Compose rules into an iterative strategy, applying each as often as possible (Section 4.2, p.183).

Inference: encode the rewrite as a pure Rust function and prove an `ensures` relation between pre- and post-evaluation. Do not use `modifies`; the rewrite should be pure unless state mutation is actually needed.

## technique: syntactic equivalence modulo commutativity
What it is: recursively compare final symbolic stacks. Constants and input variables must match; operations must match and their arguments recursively match, allowing declared commutative operations to swap arguments (Section 4.3, p.184). This is a computable approximation to semantic equivalence.

How to apply it:
1. Dereference fresh-variable definitions until reaching a basic value or operation.
2. Compare stack positions recursively.
3. For commutative operations, compare arguments modulo order.
4. Prove that checker success implies semantic equality (`eq_sstate_chkr_snd`, Section 4.3, p.184).
5. Apply simplification to both blocks before checking; otherwise equivalent shapes may differ syntactically (Section 4.3, p.184).

The checker may produce false negatives when equivalent expressions have different syntax. The paper’s Example 4 fails before simplifying `0+s0` to `s0`, then succeeds afterward (Section 4.3, p.184). Inference: Verus can prove soundness of a recursive comparator, but completeness should not be claimed.

## evidence and trusted base
The Coq implementation contains “more than 180 proofs in ∼7000 lines of Coq code” and 15 simplification rules (Section 5, p.185). For Solidity compiler benchmarks, it checked 1,280 blocks and proved 1,045; failures used rules not implemented by the checker (Section 5, p.185). For GASOL, benchmarks contained 147,798 blocks from 96 contracts. With no simplification, both checkers proved all instances. With simplification, CHKRs succeeded on 99%; CHKR ranged from 63% for GAS to 99% for SIZE. CHKRs checked all 147,798 in 50.61 seconds on an Intel i7-4790, 3.60 GHz, 16 GB RAM (Section 5, pp.185–186). The paper reports CHKRs as 3–5 times slower than CHKR and found a GASOL parser bug (Section 5, p.186).

Trusted assumptions include the concrete interpreter, valid operation-map claims, the EVM subset, and the Coq kernel. Gas, memory, storage, and cross-block optimizations are omitted; future work must extend the interpreter and symbolic state (Section 6, p.186). Inference: a Verus version must state which Rust machine model, arithmetic overflow behavior, and external calls are included. VL should reuse translation validation for optimizer-generated Rust, but should not claim full-program equivalence from a bounded or simplified state model.

## techniques for the catalog
- translation validation — prove each original/optimized pair equivalent with a verified checker instead of verifying the optimizer
- symbolic execution — execute both programs on symbolic inputs and prove correspondence to concrete execution
- sound rewrites — simplify symbolic states only with individually proved semantics-preserving rules
- checker soundness — use recursive syntactic comparison as a sound but incomplete approximation to semantic equivalence
Checked 2026-10-15 against paper albert2023evm: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
