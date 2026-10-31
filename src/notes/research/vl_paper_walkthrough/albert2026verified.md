# Towards Formally Verified Smart Contracts Compilation
(authored by agents unless marked 🧑)
Tag: `albert2026verified`, [paper](https://doi.org/10.1007/978-3-032-26220-2_13)

## what the paper proves and measures

The paper develops FORYU, a Rocq formalization of YUL intermediate code, and a verified checker for the Solidity compiler's liveness-analysis output. YUL is modeled in CFG-SSA form so that optimizers and analyses can be reasoned about at the representation they consume. The authors report more than 100 proofs in roughly 9,000 lines of Rocq code (Coq 8.20.1). On 1,550 Solidity semantic-test-suite contracts, every liveness result was accepted. Contracts range from 2 to 562 CFG blocks, average 44.06 blocks. The compiled checker took 3.576 seconds total: 78% of contracts completed in 2 ms, 20% in 3 ms, and the remaining 2% in 4–11 ms (Section 5, pp. 270–271). Three test-suite contracts using unsupported experimental solc features were omitted (footnote 4, p. 270).

For structurally valid contracts, `liveness_chk_snd_cmp` equates checker acceptance with `liveness_info_snd`, which requires the supplied sets to satisfy the coinductive liveness predicates (Section 4.2, p. 270). The checker is described as follows: “Our liveness checker is a function liveness chk that takes a smart contract and corresponding liveness analysis results, and returns true if the results are a solution to the equation in (1).” (Section 4.2, pp. 269–270) A separate lemma proves that variables absent from a live-in set are dead under the paper's operational semantics. These are proofs about liveness and checker soundness, not proofs that Solidity source compilation, EVM semantics, or all solc analyses are correct. Inference: using the theorem for compiler output also requires trusting the Rocq kernel, the executable compilation chain, and the correspondence between the compiler output, its JSON-to-Rocq translation, and the modeled dialect.

## technique: parameterized CFG-SSA semantics

What it is: define YUL syntax, contracts, functions, blocks, instructions, exits, φ-functions, and execution state as Rocq modules parameterized by a dialect. A dialect supplies value and opcode types, dialect state, truth/equality tests, and `execute_op_code`. The paper says, “The core type for YUL states is State.t, and it encapsulates a call stack, the status of the execution, and a dialect state that is entirely managed by the dialect D.” (Section 3.2, p. 263)

When to use it: Inference: use a parameterized semantics when several target platforms share control-flow structure but differ in values, opcodes, and storage. CFG-SSA is appropriate when compiler analyses operate on basic blocks, variable definitions, and φ-renaming.

How to do it:

1. Define a `DIALECT` interface with `value_t`, `opcode_t`, `dialect_state`, and opcode execution (Section 3.1, pp. 260–262).
2. Define `SmartContract`, `Function`, and `Block` records; contract validity requires valid functions with unique names, and function validity requires unique block IDs (Section 3.1, pp. 261–262).
3. Represent instructions as input expressions, output variables, and either function calls, dialect opcodes, or assignments.
4. Represent exits as conditional jumps, jumps, returns, or termination; represent φ-functions as predecessor-indexed assignments.
5. Represent state as a call stack, execution status, and dialect state.
6. Define `step` for one instruction or block finish and `eval` as repeated `step` for `n` steps (Section 3.2, pp. 263–264).

Verus form: Inference: model the CFG and machine state with Rust structs and enums, and write `spec fn` relations for instruction execution and state transitions. Use `requires`/`ensures` to enforce unique block IDs, valid φ-edges, and preservation of state invariants. A port would need proofs of finite-step simulation and an explicit representation of Rocq's inductive/coinductive propositions.

Evidence and limits: the formalization supports an EVM dialect and is designed to host analyses and optimizations. It models CFG-SSA rather than source-level Solidity, so correctness of the source-to-YUL translation is outside this paper's theorems. The dialect's `execute_op_code` is an abstract parameter until instantiated.

## technique: semantic definition of dead variables

What it is: define a variable as dead at a program point when changing only that variable preserves the program point and values immediately accessed after any equal number of execution steps. The definition compares two states equivalent except at the candidate variable and quantifies over every execution length.

When to use it: Inference: use this semantic definition to prove that a liveness analysis's complement is safe. It handles loops and nontermination because the quantification is over arbitrary `n`, not a fixed unrolling bound.

How to do it:

1. Define `same_pp` requiring equal function, block, and program-counter fields.
2. Define frame equivalence up to variable `v`, requiring equal values for all variables other than `v`.
3. Define state equivalence up to `v`, including status, dialect state, top-frame equivalence, and identical deeper call-stack frames.
4. Define `accessed_vars` from the next instruction's inputs or a block's conditional/return expressions.
5. Define `equiv_top_frame`: both call stacks must be empty, or their top frames must have the same program point and agree on all immediately accessed variables.
6. Define `dead_variable` by requiring that evaluating either equivalent state for any `n` yields a state with equivalent top frames (Section 4.1, pp. 264–267).

Verus form: Inference: express state equivalence and accessed-variable sets as `spec fn`s over ghost state. Prove preservation of the next-step observation for every finite execution length, using induction lemmas or suitable loop invariants. Any abstraction would need a proof that it preserves the observations in the definition.

Evidence and limits: the paper's `live_in_out_snd` lemma proves that any variable absent from a live-in set satisfies `dead_variable` (Section 4.2, p. 269). The authors exclude nondeterministic programs from their formalization because determinism is essential for blockchain execution (Section 4.1, pp. 266–267).

## technique: coinductive liveness equations for cyclic CFGs

What it is: encode standard live-in/live-out equations as mutually `CoInductive` Rocq predicates. For a return block, OUT is returned variables; for a nonterminal block, OUT is the union of successor IN sets after inverse φ-renaming. IN is backward propagation through instructions after adding any conditional jump variable. Each transfer removes defined variables and adds used variables (Section 4.2, p. 267).

When to use it: Inference: use coinduction when CFG loops create infinite dependencies such as OUT(b) → IN(successor) → OUT(successor) → OUT(b). An ordinary inductive derivation would require a finite base case and cannot represent this cyclic relation.

How to do it:

1. Define `VarSet` operations and program points `(function, block, pc)`.
2. Define OUT for terminal blocks as returned variables.
3. Define OUT for branches as the φ-inverse-renamed union of successor IN sets.
4. Define IN by adding jump condition variables and applying backward transfer through instructions.
5. Use mutually `CoInductive live_out` and `live_in` predicates to admit cyclic derivations.
6. Prove `live_in_out_snd`: the complement of live-in is a safe under-approximation of dead variables (Section 4.2, pp. 267–269).

Verus form: Inference: represent a finite CFG's liveness solution as a ghost `Map` and prove a fixed-point invariant with recursive proof functions or explicit bounded iteration. A port must justify how this finite representation corresponds to the paper's coinductive predicates. A checker that accepts supersets would require modified checks and a soundness proof for those checks.

Evidence and limits: the paper notes that replacing equality by superset `⊇` permits correct but less precise over-approximations and is straightforward to adapt (Section 4.2, pp. 269–270). The current checker requires equality in the equations. Inference: a conservative result that fails those equalities can therefore be rejected despite being semantically sound.

## technique: verified executable checker

What it is: define `liveness_info_snd` to require that each supplied block's live-in and live-out sets satisfy the semantic predicates. Define `liveness_chk` as an executable Boolean checker of the equations, then prove soundness and completeness of the Boolean result.

When to use it: Inference: use a verified checker to validate the output of an untrusted compiler analysis. The checker can be run after compilation without rerunning a full proof assistant interactively.

How to do it:

1. Represent results with `fun_live_info_t`, mapping block IDs to optional IN/OUT pairs, and `sc_live_info_t`, mapping function names to optional function results.
2. Define `liveness_info_snd` to require that each supplied result for an existing block satisfies `live_in` and `live_out`.
3. Define `liveness_chk` to check the equations.
4. Prove `liveness_chk_snd_cmp`: for a valid contract, `liveness_info_snd p r` holds exactly when `liveness_chk p r = true`.
5. Combine this theorem with `live_in_out_snd` to obtain semantic deadness for variables absent from accepted live-in sets (Section 4.2, pp. 269–270).

Verus form: Inference: implement the checker as executable Rust and specify its Boolean result with `ensures` stating that `true` implies a liveness predicate. Prove soundness against the chosen semantics and completeness relative to the specified equations. The proof would still need an argument relating parsed input to that model.

Evidence and limits: the four-step pipeline compiles solc output to JSON, translates JSON to a Rocq `SmartContract(EVMDialect)`, compiles the checker, and executes it (Section 5, pp. 270–271). All 1,550 included contracts pass. The authors currently compile a separate binary per contract; they plan one extracted checker binary to remove Rocq from end-user execution (Section 5, pp. 270–271). Inference: the stated theorem constrains supplied entries for existing blocks; its displayed definition does not itself require results for every block.

## technique: pipeline validation against a compiler corpus

What it is: validate a verified checker at scale against real solc output rather than hand-written examples. The benchmark uses solc's semantic test suite and records contract block counts and checker time.

When to use it: Inference: use this to test that a formal checker handles compiler-produced IR and to measure deployment cost. For a similar benchmark, state exclusions, compiler version, hardware, and which pipeline stages are timed; Section 5 does not specify an exact solc version.

How to do it:

1. Compile each Solidity contract with official solc to YUL-IR CFG-SSA JSON.
2. Translate JSON into the formal contract representation.
3. Compile the Rocq file with the checker to a static OCaml executable, ensuring the OCaml compiler applies no inlining or partial evaluation of the contract.
4. Run the static checker binary and record verdict and time.
5. Report all contracts, omitted features, hardware, and denominator (Section 5, pp. 270–271).

Verus form: Inference: use a Rust harness to parse the same JSON and invoke a Verus-verified checker. Keep benchmark measurements separate from proof claims: passing 1,550 compiler outputs demonstrates coverage of that corpus, not all valid YUL programs.

Evidence and limits: 100% of the 1,550 included contracts pass, with 3 omitted unsupported contracts. The experiment measures step-4 OCaml checking time after representation generation; it does not include solc compilation or JSON translation. The paper reports this scope explicitly (Section 5, pp. 270–271).

## techniques for the catalog

- parameterized CFG-SSA semantics — model dialect-independent YUL control flow and EVM-specific operations in Rocq modules
- small-step execution — define `step` and bounded `eval` over call stacks, blocks, variables, and dialect state
- semantic deadness — preserve program points and immediately accessed values after every finite execution length
- coinductive liveness — encode cyclic live-in/live-out equations with mutually coinductive predicates
- verified analysis checker — for valid contracts, prove a Boolean checker equivalent to the coinductive liveness predicates
- translation-validation pipeline — translate solc output, run the extracted checker, and validate a 1,550-contract corpus
