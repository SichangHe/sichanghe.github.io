# Formally Verified EVM Block-Optimizations
(authored by agents unless marked 🧑)
Tag: `albert2023evm`, [paper](https://doi.org/10.1007/978-3-031-37709-9_9)

## problem and approach
The paper verifies that optimized, jump-free EVM opcode blocks preserve behavior. Its abstract says, “We reconcile efficiency and security by providing the verification technology to formally prove the correctness of EVM block-optimizations on smart contracts using the Coq proof assistant.” The method is translation validation: check each original/optimized pair with a verified checker rather than verify an optimizer. The paper argues for this because EVM compilers evolve continuously, EVM optimizers use external SMT solvers that would be a daunting effort to verify, and the checker aims at generality (Section 6, pp.186–187).

A block is a list of instructions operating on a stack. A stack-operation map supplies each opcode’s implementation, arity, and commutativity flag (Section 3, pp.179–180). The scope is jump-free blocks of stack operations only (Section 1, p.177). The concrete interpreter returns `Some state` on successful execution and `None` for stack overflow; it does not model gas (Section 3, p.180). The paper states, “Our implementation follows the EVM semantics [38], considering the simplicity of the supported operations, the concrete interpreter is a minimal trusted computing base” (Section 3, p.180).

## technique: define semantic equivalence and a sound checker
What it is: for initial stack size `k`, require both blocks to succeed and produce the same final state for every initial stack of that size. The formal `sem_eq_blocks` definition quantifies over input states and requires an equal successful output (Section 4, p.180). Returning `None` for both is not enough because failures could have different causes.

How to apply it:
1. Define the instruction subset and a valid operation map (`valid_stack_op_map`): the claimed properties such as commutativity hold, and applying an operation to the right number of arguments does not return `None` (Section 3, pp.179–180).
2. Define concrete execution for each candidate block (Section 3, p.180).
3. Fix the statically known initial stack size `k`; do not report equivalence if execution of either block under that size leads to stack underflow or overflow (Section 4, pp.180–181).
4. Implement a Boolean checker and prove `checker = true → sem_eq_blocks` (Section 4, p.181).

Inference: in Verus, a translation validator could execute two Rust functions over a bounded abstract state and prove equal post-state with `requires`/`ensures`, while the verified checker itself would be a `proof fn` or executable function whose soundness is a lemma. Verus does not provide Coq’s inductive interpreter automatically; the state model and operation assumptions must be encoded explicitly.

## technique: symbolic execution with fresh expression variables
What it is: execute each block over an initial symbolic stack and represent the final stack as constants, input variables, and fresh variables mapped to expressions. Fresh variables avoid deeply nested terms. The paper’s Example 2 compares `PUSH1 0x5 SWAP2 MUL ADD` with `PUSH1 0x0 ADD MUL PUSH1 0x5 ADD` for `k=3` (Section 4.1, p.182).

How to apply it:
1. Build the symbolic initial stack of size `k` (the paper writes `[s0, . . . , sk]`; in Example 2 with `k=3` the variables are `s0`, `s1`, `s2`).
2. Execute instructions, introducing fresh IDs for compound expressions and recording their definitions in a map (a list of pairs of id and definition) (Section 4.1, p.181).
3. Require every fresh variable used in a definition to have a smaller index (`valid_sstate`, Section 4.1, p.182).
4. Define evaluation of a symbolic state under a concrete initial state.
5. Prove `sym_exec_snd`: a successful symbolic result is valid and evaluates to the concrete interpreter’s output for every input stack of size `k` (Section 4.1, p.182).

Inference: Verus can represent symbolic expressions as enums and prove an interpreter correspondence lemma with recursive `proof fn`s. The paper’s Coq `Inductive` syntax and theorem statements do not carry over verbatim.

## technique: sound simplification rules
What it is: rewrite symbolic states to equivalent simpler states, such as replacing `E + 0` or `0 + E` by `E`. An optimization function never fails; it returns a state and a Boolean saying whether it changed anything (Section 4.2, p.183).

How to apply it:
1. Implement one rewrite over valid symbolic states.
2. State `optim_snd`: for a valid input state, the result is valid, and whenever the input state evaluates to `Some st'` the result evaluates to the same `st'` (Section 4.2, p.183).
3. Prove each rule, such as `optimize_add_zero_snd`.
4. Compose rules into strategies, which are also functions of type `optim`. The paper lists three: apply each function in turn as many times as it applies; apply each once in some order and repeat while anything applies; or use the simplifications the external optimizer used (passed as hints) (Section 4.2, p.183).

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
The Coq implementation contains “more than 180 proofs in ∼7000 lines of Coq code” and 15 simplification rules (Section 5, p.185). For Solidity compiler benchmarks, it checked 1,280 blocks from the solc semantic test suite and proved 1,045; the paper says the failures are due to optimization rules not yet implemented, and that obtaining these blocks needed human intervention to disable intra-block optimizations (Section 5, p.185). For GASOL, benchmarks contained 147,798 blocks from 96 contracts. For the sets where GASOL did not apply simplification rules, both CHKR and CHKRs proved all blocks. For the sets where it did, CHKRs succeeded on 99%; CHKR ranged from 63% for GAS to 99% for SIZE. CHKRs checked all 147,798 in 50.61 seconds on an Intel i7-4790, 3.60 GHz, 16 GB RAM (Section 5, pp.185–186). The paper reports CHKRs as 3–5 times slower than CHKR, and says the checker found a bug in GASOL’s parsing component that treated the `SGT` bytecode as `GT` (Section 5, p.186).

Trusted assumptions include the concrete interpreter, which the paper calls a minimal trusted computing base and plans to test with the EVM test suite (Section 3, p.180), and the valid operation-map claims. Gas is not modeled (Section 3, p.180); memory, storage, and cross-block optimizations are not handled, and memory/storage support is ongoing work (Section 6, p.186). Inference: the Coq kernel is also trusted, though the paper does not say so. Inference: a Verus version must state which Rust machine model, arithmetic overflow behavior, and external calls are included. VL should reuse translation validation for optimizer-generated Rust, but should not claim full-program equivalence from a bounded or simplified state model.

## techniques for the catalog
- translation validation — prove each original/optimized pair equivalent with a verified checker instead of verifying the optimizer
- symbolic execution — execute both programs on symbolic inputs and prove correspondence to concrete execution
- sound rewrites — simplify symbolic states only with individually proved semantics-preserving rules
- checker soundness — use recursive syntactic comparison as a sound but incomplete approximation to semantic equivalence
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Note that the checker can be easily extended with new optimization functions, simply by providing a corresponding implementation and a soundness proof."): read the paper text start to end and compared every quotation, number, section and page reference, and technique step in the study; changed page citations for Sections 3 and 4, the wording of the benchmark results (which sets had no GASOL simplification), the optimization-strategy step, the soundness statement, and the trusted-base paragraph (marked the Coq kernel point as inference), and added the translation-validation rationale and the solc human-intervention caveat; did not check the extended version [10] (appendices), the Coq source or artifact, or the PDF layout beyond the text.
