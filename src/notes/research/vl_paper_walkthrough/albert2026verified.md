# Towards Formally Verified Smart Contracts Compilation
(authored by agents unless marked 🧑)
Tag: `albert2026verified`, [paper](https://doi.org/10.1007/978-3-032-26220-2_13)

## what the paper proves and measures

The paper develops FORYU, a Rocq formalization of YUL intermediate code, and a verified checker for the Solidity compiler's liveness-analysis output. YUL is modeled in CFG-SSA form so that optimizers and analyses can be reasoned about at the representation they consume. The authors report more than 100 proofs in roughly 9,000 lines of Rocq code (Coq 8.20.1). On 1,550 Solidity semantic-test-suite contracts, every liveness result was accepted. Contracts range from 2 to 562 CFG blocks, average 44.06 blocks. The compiled checker took 3.576 seconds total: 78% of contracts completed in 2 ms, 20% in 3 ms, and the remaining 2% in 4–11 ms (Section 5, p. 10). Three test-suite contracts using unsupported experimental solc features were omitted (footnote, p. 10).

The main formal result is the equivalence of the executable checker and the semantic liveness predicate: “Our liveness checker is a function liveness chk that takes a smart contract and corresponding liveness analysis results, and returns true if the results are a solution to the equation in (1).” (Section 4.2, p. 9) A separate lemma proves that variables absent from a live-in set are dead under the paper's operational semantics. These are proofs about liveness and checker soundness, not proofs that Solidity source compilation, EVM semantics, or all solc analyses are correct. The implementation trusts the Rocq kernel, the modeled EVM dialect, the JSON translation from solc, and the interpretation of liveness results.

## technique: parameterized CFG-SSA semantics

What it is: define YUL syntax, contracts, functions, blocks, instructions, exits, φ-functions, and execution state as Rocq modules parameterized by a dialect. A dialect supplies value and opcode types, dialect state, truth/equality tests, and `execute_op_code`. The paper says, “The core type for YUL states is State.t, and it encapsulates a call stack, the status of the execution, and a dialect state that is entirely managed by the dialect D” (Section 3.2, p. 4).

When to use it: use a parameterized semantics when several target platforms share control-flow structure but differ in values, opcodes, and storage. CFG-SSA is appropriate when compiler analyses operate on basic blocks, variable definitions, and φ-renaming.

How to do it:

1. Define a `DIALECT` interface with `value_t`, `opcode_t`, `dialect_state`, and opcode execution (Section 3.1, p. 3).
2. Define `SmartContract`, `Function`, and `Block` records with unique names/IDs and validity predicates.
3. Represent instructions as input expressions, output variables, and either function calls, dialect opcodes, or assignments.
4. Represent exits as conditional jumps, jumps, returns, or termination; represent φ-functions as predecessor-indexed assignments.
5. Represent state as a call stack, execution status, and dialect state.
6. Define `step` for one instruction or block finish and `eval` as repeated `step` for `n` steps (Section 3.2, p. 4).

Verus form: Inference: model the CFG and machine state with Rust structs and enums, and write `spec fn` relations for instruction execution and state transitions. Use `requires`/`ensures` to enforce unique block IDs, valid φ-edges, and preservation of state invariants. Verus can prove finite-step simulation lemmas, but Rocq's inductive/coinductive propositions are not Rust syntax and would need an explicit encoding.

Evidence and limits: the formalization supports an EVM dialect and is designed to host analyses and optimizations. It models CFG-SSA rather than source-level Solidity, so correctness of the source-to-YUL translation is outside this paper's theorems. The dialect's `execute_op_code` is an abstract parameter until instantiated.

## technique: semantic definition of dead variables

What it is: define a variable as dead at a program point when changing only that variable cannot change any future execution outcome relevant to the next accessed variables. The definition compares two states equivalent except at the candidate variable and quantifies over every execution length.

When to use it: use this semantic definition to prove that a liveness analysis's complement is safe. It handles loops and nontermination because the quantification is over arbitrary `n`, not a fixed unrolling bound.

How to do it:

1. Define `same_pp` requiring equal function, block, and program-counter fields.
2. Define frame equivalence up to variable `v`, requiring equal values for all variables other than `v`.
3. Define state equivalence up to `v`, including status, dialect state, top-frame equivalence, and identical deeper call-stack frames.
4. Define `accessed_vars` from the next instruction's inputs or a block's conditional/return expressions.
5. Define `equiv_top_frame` requiring equal values for all immediately accessed variables.
6. Define `dead_variable` by requiring that evaluating either equivalent state for any `n` yields a state with equivalent top frames (Section 4.1, pp. 5–6).

Verus form: Inference: express state equivalence and accessed-variable sets as `spec fn`s over ghost state. A proof function can show that changing an unused variable leaves the next-step observation unchanged; loop invariants are required to extend that result across iterations. Quantifying over all executions may need finite-state abstractions or induction lemmas rather than executable Rust.

Evidence and limits: the paper's `live_in_out_snd` lemma proves that any variable absent from a live-in set satisfies `dead_variable` (Section 4.2, p. 8). The authors exclude nondeterministic programs from their formalization because determinism is essential for blockchain execution (Section 4.1, p. 6).

## technique: coinductive liveness equations for cyclic CFGs

What it is: encode standard live-in/live-out equations as mutually `CoInductive` Rocq predicates. For a return block, OUT is returned variables; for a nonterminal block, OUT is the union of successor IN sets after inverse φ-renaming. IN is backward propagation through instructions, removing defined variables and adding used variables. The paper gives the backward equation as “BKW(l, s) = if l = i :: l then BKW(l , (s \\ def(i)) ∪ used(i)) else s” (Section 4.2, p. 7).

When to use it: use coinduction when CFG loops create infinite dependencies such as OUT(b) → IN(successor) → OUT(successor) → OUT(b). An ordinary inductive derivation would require a finite base case and cannot represent this cyclic relation.

How to do it:

1. Define `VarSet` operations and program points `(function, block, pc)`.
2. Define OUT for terminal blocks as returned variables.
3. Define OUT for branches as the φ-inverse-renamed union of successor IN sets.
4. Define IN by adding jump condition variables and applying backward transfer through instructions.
5. Use mutually `CoInductive live_out` and `live_in` predicates to admit cyclic derivations.
6. Prove `live_in_out_snd`: the complement of live-in is a safe under-approximation of dead variables (Section 4.2, pp. 7–8).

Verus form: Inference: represent a finite CFG's liveness solution as a ghost `Map` and prove a fixed-point invariant with recursive proof functions or explicit bounded iteration. Verus does not provide Rocq `CoInductive`; a faithful unbounded coinductive encoding would require a separately justified abstraction. For practical Rust optimization, proving a conservative superset of live variables is safer than requiring exact equality.

Evidence and limits: the paper notes that replacing equality by superset `⊇` permits correct but less precise over-approximations and is straightforward to adapt (Section 4.2, p. 9). Its current checker rejects nonoptimal solutions, so a valid conservative analysis may be rejected even though it is sound.

## technique: verified executable checker

What it is: define `liveness_info_snd` to require that each supplied block's live-in and live-out sets satisfy the semantic predicates. Define `liveness_chk` as an executable Boolean checker of the equations, then prove soundness and completeness of the Boolean result.

When to use it: use a verified checker when an untrusted compiler analysis should be accepted only after a small proof-carrying validation pass. The checker can be run after compilation without rerunning a full proof assistant interactively.

How to do it:

1. Parse the compiler's per-function, per-block live-in/live-out result into Rocq data.
2. Verify that each referenced function and block exists and that sets satisfy the CFG equations.
3. Compile the Rocq definitions and `liveness_chk` to a static OCaml binary.
4. Execute the binary on each contract's representation.
5. Rely on `liveness_chk_snd_cmp` to connect `true` to semantic soundness (Section 4.2, p. 9).

Verus form: Inference: implement the checker as executable Rust and specify its Boolean result with `ensures` stating that `true` implies a liveness predicate. A proof function can establish checker completeness for finite CFGs. Verus can verify the checker implementation, but the semantic model and source parser remain trusted unless separately specified.

Evidence and limits: the four-step pipeline compiles solc output to JSON, translates JSON to a Rocq `SmartContract(EVMDialect)`, compiles the checker, and executes it (Section 5, p. 10). All 1,550 included contracts pass. The authors currently compile a separate binary per contract; they plan one extracted checker binary to remove Rocq from end-user execution (Section 5, p. 10).

## technique: pipeline validation against a compiler corpus

What it is: validate a verified checker at scale against real solc output rather than hand-written examples. The benchmark uses solc's semantic test suite and records contract block counts and checker time.

When to use it: use this to test that a formal checker handles compiler-produced IR and to measure deployment cost. The benchmark should state exclusions, compiler version, hardware, and whether compilation time is included.

How to do it:

1. Compile each Solidity contract with official solc to YUL-IR CFG-SSA JSON.
2. Translate JSON into the formal contract representation.
3. Compile the formal checker without optimizer inlining or partial evaluation of the contract.
4. Run the static checker binary and record verdict and time.
5. Report all contracts, omitted features, hardware, and denominator (Section 5, p. 10).

Verus form: Inference: use a Rust harness to parse the same JSON and invoke a Verus-verified checker. Keep benchmark measurements separate from proof claims: passing 1,550 compiler outputs demonstrates coverage of that corpus, not all valid YUL programs.

Evidence and limits: 100% of the 1,550 included contracts pass, with 3 omitted unsupported contracts. The experiment measures step-4 OCaml checking time after representation generation; it does not include solc compilation or JSON translation. The paper reports this scope explicitly (Section 5, p. 10).

## what remains trusted and threat to VeruLaw

Inference: FORYU's trust base includes the Rocq kernel and extraction/compiler chain, the YUL-to-Rocq JSON translator, solc's CFG-SSA output, the instantiated EVM dialect, and the correspondence between dialect opcodes and EVM behavior. The theorem proves checker soundness relative to these definitions; it does not prove Solidity compiler correctness or EVM execution. For VeruLaw, the threat is low for the specific pattern of verified static-analysis checking and medium for smart-contract compilation as a whole. The reusable idea is a small, verified validator for an untrusted analysis result. Verus can implement analogous validators for Rust IR and compiler diagnostics, but coinductive liveness and compiler-to-model translation need additional formalization.

## techniques for the catalog

- parameterized CFG-SSA semantics — model dialect-independent YUL control flow and EVM-specific operations in Rocq modules
- small-step execution — define `step` and bounded `eval` over call stacks, blocks, variables, and dialect state
- semantic deadness — characterize dead variables by equivalence of all future executions up to next observations
- coinductive liveness — encode cyclic live-in/live-out equations with mutually coinductive predicates
- verified analysis checker — prove a Boolean checker equivalent to the semantic liveness predicate
- proof-carrying compiler pipeline — translate solc output, run the extracted checker, and validate a 1,550-contract corpus

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
