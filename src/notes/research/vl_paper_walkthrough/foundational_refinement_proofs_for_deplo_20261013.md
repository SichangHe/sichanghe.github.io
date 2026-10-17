# Foundational Refinement Proofs for Deployed Bytecode, at the Price of Tokens
(authored by agents unless marked 🧑)
Tag: `lazaropoulos2026foundational`, [paper](https://arxiv.org/abs/2607.26306v1)

## paper's question and architecture

The paper asks whether LLM agents can construct foundational, machine-checked refinement proofs for deployed EVM bytecode after deployment. Its abstract describes the target precisely: “We study this in the context of the Ethereum Virtual Machine (EVM), a low-level virtual machine that executes smart contracts on the Ethereum blockchain.” EqiVM is a Lean framework with an executable EVM semantics, the Sol− specification language, and a refinement relation. A contract's bytecode can come from any compiler or handwritten assembly; the proof relates the deployed bytes directly to a human-readable specification.

The key guarantee is per message call: from any EVM state and calldata, bytecode either agrees with a Sol− execution on account state and return bytes, both reject an unmatched entry point, or runs out of gas. External calls are modeled through EVM call semantics, so unknown callee code is part of the semantics. The authors emphasize the design goal: “In principle, the framework gives everything at once: compiler independence, replayable proof certificates, and interoperation with code of unknown provenance.” The proof is a Lean theorem checked by the kernel; the LLM is a proof producer, not a trusted component.

## technique 1: executable low-level semantics plus a specification language

what it is

EqiVM models the EVM as total Lean functions (transaction Υ, message call Θ, creation Λ, code execution Ξ, instruction iterator X, exceptional-halt check Z, and one-opcode transformer `step`) (Section 3, Figure 3). Sol− is an imperative, Solidity-like specification language whose storage semantics uses the same flat EVM map. The paper states: “Sol− is a specification language, not an implementation language: no code is ever generated from a Sol− program and it is not tied to any particular source language or compiler.”

when to use it

Inference: use this architecture when deployed artifacts must be checked independently of their source compiler, or when source is unavailable or untrusted. Write the intended behavior at a readable level, while retaining the machine's concrete state representation so the two executions can be related without converting between state representations (Section 4.2).

how to do it

1. Formalize the target machine's state, including accounts, storage, calldata, memory, stack, gas, calls, and exceptional halts (Section 3; Figure 2).
2. Define a specification language with ABI types, storage references, assignments, control flow, calls, and environment reads (Section 4.1; Figure 4).
3. Give the language big-step semantics over the same EVM storage and environment; parameterize it by a storage layout (Section 4.2).
4. Define a refinement relation that compares bytecode execution Ξ with a specification execution for every initial state, calldata, and gas value (Section 5; Figure 9).
5. Supply per-contract configuration: storage layout, deployment scheme, selector facts, and the Sol− contract.

Verus form

Inference: the analogue is a Verus model of the concrete Rust API plus a ghost or specification model of intended state transitions, connected by `ensures` and proof lemmas. Inference: unlike Sol−, Verus specifications coexist with executable Rust and are erased, so the implementation remains Rust; the specification must still mention the concrete representation when abstraction boundaries are otherwise unproved. Use only supported Verus constructs such as `spec fn`, `proof fn`, `requires`, `ensures`, `invariant`, `assert`, and `assert_by`; do not treat Verus specifications as executable code.

evidence

The model extends Nethermind's EVMYulLean, which the paper describes as validated against 99.99% of the official conformance suite; the extension retains the conformance-test harness (Section 3). The authors proved 23 real-world contracts end to end; 19 benchmark contracts were complete and two partial at the time of writing (Section 6). Inference: the paper does not reconcile 23 with these counts; Table 1 has 8 complete exploratory examples besides the partial UniswapV2Pair, which would give 27 with the 19. Exploratory examples included contracts from Solidity documentation, OpenZeppelin, UniswapV2Pair, and a Vyper ERC20 (Table 1). Inference: conformance testing supports the model's correspondence to the tested suite, but does not prove the full EVM model correct.

assumptions and limits

Sol− omits or abstracts some EVM state, including gas and parts of substate. The relation therefore allows vacuous equivalence when executions run out of gas, and termination is a separate obligation (Section 5). The specification language supports most ABI and storage structures but omits ABI function-pointer types and fixed-point types (Section 4.1).

## technique 2: compositional reach-invariant proof library

what it is

A whole-run proof of Ξ is too large to unfold directly. EqiVM instead proves reusable lemmas for instruction segments using a cursor and a reach invariant (Section 5.1, Figures 10–11). The cursor exposes program counter, stack, memory and active-word count, return data, and world state. The invariant says that execution either exhausts gas or reaches a cursor after a counted number of steps with the remaining run preserved. The paper explains: “In effect, the proof performs forward symbolic execution of the bytecode, one opcode at a time.”

when to use it

Inference: use this for long straight-line code, branches, loops, storage writes, calls, and repeated compiler-generated sequences. It keeps intermediate machine states existentially hidden and composes local opcode lemmas by transitivity.

how to do it

1. Define a cursor containing exactly the machine components that later instructions can inspect (Section 5.1).
2. Establish the reach invariant at the segment's initial state, including gas as an explicit disjunct.
3. Apply an opcode combinator: Push1 advances the program counter and stack; JumpiT/JumpiNT select the branch by the concrete condition value, with jump targets checked against the code's jump-destination set; Sstore updates the world; Return produces a terminal result (Figure 11).
4. For calls, package the callee effect as an instance of Θ and couple it to the identical Sol− external-call rule (Section 5.1).
5. For loops, supply an abstraction, invariant, and decreasing variant; use the coupled loop rule when bytecode and specification execute in lockstep (Section 5.1).
6. Chain segment lemmas until the top-level refinement cases R-Exec, R-NoDispatch, R-NoDecode, and R-OutOfGas are discharged (Figure 9).
7. Reuse the library's word, memory, storage-map, ABI-decoder-evaluation, and dispatch lemmas; code that solc emits identically in every contract (prologue, non-payable guard, calldata-size check, selector ladder) is proved once generically, while shared routines such as the ABI decoders are proved once per contract as segment lemmas (Section 5.1).

Verus form

Inference: represent a Rust loop with a Verus `invariant` and a `decreases` clause, and expose a ghost state that summarizes the concrete cursor. Prove small lemmas for each state transition, then compose them into the function's `ensures`. Inference: Verus does not use EqiVM's Lean reach relation or EVM gas ledger; the reusable pattern is the same—hide concrete intermediate states, preserve a relational invariant, and chain verified steps. Inference: for external calls, model the callee contract with an explicit trusted/specification contract and prove the caller's postcondition against that model.

evidence

Table 1 reports 1,522 (Pausable) to 29,911 (BlindAuction) Lean proof lines for the eight complete exploratory examples; ERC20, with 35 source lines and a 2,708-byte runtime, took 7,172 proof lines and 260 seconds to check, while the unfinished UniswapV2Pair proof had 103,247 lines and an 817-second check. These figures are per contract; the caption defines Proof as the non-blank, non-comment Lean lines of the contract's proof development. Inference: the numbers show substantial proof overhead relative to bytecode size, not a universal ratio for other machines.

assumptions and limits

The library still needs per-contract selector facts and a jump-table fact (Sections 5.1 and 5.2) and a storage layout (Section 4.2); the loop rule needs a prover-supplied abstraction, invariant, and variant (Section 5.1). Inference: the method does not eliminate specification or model construction.

## technique 3: refinement proof for all entry points and unknown code

what it is

The runtime theorem quantifies over every machine state, calldata, and gas value. Dispatch either selects a Sol− transition or rejects; successful bytecode and specification runs must agree on persistent account state and ABI-encoded return data. Calls to unknown bytecode are interpreted by the same EVM Θ relation on both sides (Sections 4.2 and 5.1).

when to use it

Inference: use this when a contract interacts with arbitrary deployed code, proxies, or external systems and source-level compiler assumptions are unavailable. The theorem is attached to immutable deployed bytes, so it remains applicable after deployment.

how to do it

1. Specify each externally callable transition (Sections 4.1 and 4.3); its ABI decoder comes from the configuration (Section 4.2).
2. Prove dispatch and no-dispatch cases, including malformed calldata and revert behavior (Figure 9).
3. Relate storage references to concrete slots using the supplied layout (Section 4.2).
4. Couple each external call to Θ, preserving returned bytes, success flags, and world updates (Section 5.1).
5. Prove the top-level theorem for arbitrary initial account maps satisfying the stated relation and protocol preconditions.

Verus form

Inference: this corresponds to a Rust API contract whose postcondition quantifies over allowed inputs and whose external effects are represented by a trait/spec model. Verus can prove the caller against that model, but the model remains a trusted assumption unless the external implementation is also verified. Inference: arbitrary unknown Rust/FFI code is therefore a larger trust boundary than EqiVM's modeled EVM calls.

evidence

The benchmark includes MakerDAO's cooperating contracts, WETH9, and the Nouns auction house, with compiler versions 0.5.16, 0.6.12, and 0.8.23 (Table 2). Nineteen contracts were complete; Clipper covered 26/29 functions and Auction 18/20 when runs stopped (Table 2). Inference: these function counts are contract-specific coverage denominators, not a claim that all deployed contracts are tractable.

assumptions and limits

The relation intentionally underspecifies gas and some substate. Dynamic-array copying exposed a semantic mismatch: EVM bytecode can wrap a byte count outside UInt256, while Sol− did not. The authors added a well-formed-storage hypothesis requiring the array's byte size to fit UInt256 (Section 6). Inference: this is an explicit assumption, not a proof of behavior for oversized arrays.

## technique 4: LLM proof development with telemetry and human escalation

what it is

The agent receives bytecode, a Sol− specification, and the top-level theorem, then uses the reusable proof templates and library to write Lean proofs. The paper's evaluation asks whether agents can produce complete proofs, at what token/time/human cost, and where scaling fails (Section 6). The paper says roughly half of the completed contracts were proved from the goal prompt alone and the rest received a handful of further inputs, mostly administrative (Section 6). Inference: Table 2 shows Prompts equal to 1 for 6 of its 16 completed rows, so roughly half is generous.

when to use it

Inference: use an agent for repetitive combinator application and diagnosis after the semantic framework and proof library are stable. Escalate to a human when the agent reports a specification mismatch, an unmodeled semantic case, or a build/resource problem.

how to do it

1. Prepare the machine semantics, specification, top-level refinement theorem, and reusable proof library.
2. Prompt the agent with the contract bytecode, Sol− specification, and proof-organization directions (Section 6).
3. Let it fill proof obligations and check them with Lean (the paper says the kernel checks the result; how often the agents ran Lean is not in the paper).
4. Record prompts, tokens, active proof time, proof size, and Lean check time (Table 2, which excludes cache reads; the breakdown is in Appendix B).
5. If a mismatch is reported, decide whether to correct the specification or strengthen the relation (the paper did both: Flipper and Auction had specification corrections authorized, Clipper and Cure got the well-formed-storage hypothesis); Inference: do not silently add axioms. The Cure run initially used trusted non-aliasing axioms, then two follow-up sessions proved aliasing cases and removed them (Section 6).
6. Inference: stop or resume when build memory, proof time, or remaining functions exceed a resource budget; the paper reports End's memory exhaustion and Auction's stall on build times.

Verus form

Inference: the same workflow can drive an LLM to edit Verus proof blocks and rerun `verus`, while logging diagnostics, token usage, proof time, and changed obligations. Inference: human approval is needed for specification changes and new `external_body` assumptions; generated code must never be treated as verified solely because the model claims success.

evidence

The largest completed benchmark run, Vat, used 69.2 million fresh input, 1,735.5 million cached input, and 5.6 million output tokens, with 100 hours 44 minutes of active proof time and 84,382 Lean proof lines (Table 2 and Section 6). At the listed gpt-5.5 prices, the paper estimates roughly $1,380, with cache reads dominant. Cat was the most supervised completed run, receiving 16 mid-proof inputs over 64 hours (Section 6). Clipper and Auction were still running after 81 and 94 hours, at 26/29 and 18/20 functions, when results were collected; the authors write that they are not aware of a fundamental obstacle in either, and that Auction is stalled on huge build times (Section 6).

assumptions and limits

The cost study used subscriptions rather than metered API credits, so prices are approximate. Opus 4.8 generally used more time and tokens than gpt-5.5 on similarly sized benchmarks (Section 6). Lean compilation exhausted memory for End until swap space was increased. The exploratory examples co-evolved the library and proofs and were not systematically monitored, so they are evidence of feasibility rather than a controlled comparison.

## what is proved, measured, and trusted

A finished certificate is a Lean theorem. The authors state: “Because proofs are validated by the kernel, the LLM agent, tactics, macros, and the proof combinators are not trusted for soundness.” The trusted base includes the Lean kernel, standard axioms, the correctness of the EVM model, the refinement relation, the official conformance test suite, the Lean compiler used by test execution, and EVMYulLean test runners (Section 5.2). Keccak is an opaque foreign function, so selector facts are trusted per contract. `native_decide` introduces evaluator axioms for decoding, gas/memory checks, ABI decoding, and jump-table membership (Section 5.2). Inference: these are material trusted components even though the LLM itself is outside the soundness base.

Table 2 reports no percentages; its partial function counts (Clipper 26/29, Auction 18/20) are per contract, and a timeout mark in the Check column means that check timed out (Auction's cell is blank in the text). The relation permits vacuous out-of-gas equivalence and does not bound gas consumption (Section 5.2). Inference: a deployment that needs resource-bounded correctness requires a separate termination/gas theorem.

## techniques for the catalog

- post hoc bytecode refinement — relate deployed low-level execution directly to a high-level specification without trusting its compiler provenance
- compositional reach invariants — chain cursor-based opcode and loop lemmas while threading gas exhaustion through one invariant
- unknown-code call coupling — model external calls with the same semantic relation on implementation and specification sides
- agentic certificate production — have an LLM fill reusable proof obligations, replay every result in the kernel, and log cost and human intervention
