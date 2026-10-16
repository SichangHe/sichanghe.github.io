# Accessible Smart Contracts Verification: Synthesizing Formal Models with Tamed LLMs
(authored by agents unless marked 🧑)
Tag: `corazza2025accessible`, [paper](http://arxiv.org/abs/2501.12972v1)

## scope and result
The paper automates construction of Quint model-based tests from CosmWasm Rust contracts. Its central claim is a three-phase split: “we first transpile the code into model stubs; then we ‘fill in the blanks’ using a large language model (LLM); finally, we iteratively repair the generated model” (abstract, p.1). The model is an abstraction, not a proof of the Rust implementation. Model traces are replayed through a generated Rust adapter, and state mismatches expose bugs. The benchmark has 23 target functions from five CosmWasm CTF contracts, five independent runs, and five I/O examples per function (two exposed during generation, three held out; §5.1, p.17).

## technique 1: mechanically frame a model and adapter

What it is. `cosmwasm-to-quint` uses Rust compiler callbacks (`rustc_plugin`) to inspect a whole Cargo project and emit a Quint model skeleton plus a Rust adapter test. The paper says the stub “captures interleavings of different actions, but does not capture the actions’ semantics” (overview, p.3). Mechanical generation finds `cw_storage_plus` `Map::new` and `Item::new` constants, translates their generic key/value types, puts them in a `ContractState` record, and initializes `contract_state` and `init_contract_state` (§4.1, pp.8–10). It recognizes functions carrying `Deps`/`DepsMut` as actions, emits pure definitions that return updated state, and creates nondeterministic inputs, sender, denomination, amount, time, bank, and last result (§4.1, pp.10–11). Bank messages are processed as later transitions; general inter-contract messages are unsupported (§4.1, p.11).

How to apply it. (1) Compile the Rust project through the plugin so project configuration and definitions are available (§4.1, p.9). (2) Identify storage constants and emit typed `ContractState` fields (§4.1, pp.9–10). (3) Emit action wrappers and pure-function stubs for entry points (§4.1, p.10). (4) Emit nondeterministic execution metadata and bank transitions (§4.1, pp.10–11). (5) Emit the adapter that reads Quint JSON traces and replays them with `cw_multi_test`; compare state after every execution (§4.1, p.11).

Verus form. Inference: the analogous VL scaffold would retain executable Rust functions and add Verus contracts (`requires`, `ensures`) around state transitions; a `spec fn` can describe pure state interpretation, and `proof fn` lemmas can connect an abstract state to concrete fields. Quint nondeterminism and generated trace replay do not carry over as Verus proof constructs; they become explicit quantified specifications or separate Rust tests. `invariant` belongs as a loop invariant clause, not a function call. External crates, message delivery, and adapter behavior remain assumptions unless separately specified.

Evidence and limits. The authors state: “If the trace can be reproduced successfully, and the states after each execution match, it is evidence that the set of behaviors defined by Quint model is also defined in the implementation” (§4.1, p.11). This is evidence from sampled traces, not exhaustive equivalence. The generator cannot resolve external crates automatically and cannot yet handle general contract-to-contract communication (§4.1, p.9; §6, p.21).

## technique 2: factor each semantic stub into few-shot LLM synthesis

What it is. Each pure stub is generated independently from the Rust source, generated signatures and types, a natural-language description, and two input-output examples. Algorithm 1 calls `GeneratePrompt`, invokes the LLM, extracts and replaces the named stub, then calls `TestAndRepair` (§4.2, p.12). Prompts include a Quint cheatsheet, recursively collected type definitions, the corresponding Rust message handler, imports/constants, and few-shot CTF-01 examples (§4.2, pp.12–14). The model uses temperature 0.6 and top-p 0.7 (§4.2, p.12).

How to apply it. (1) For each stub, collect the source handler and generated signature (§4.2, pp.11–14). (2) Add the user description and two I/O examples (§4.2, p.11). (3) Add demonstrations whose answers are hand-written Quint functions (§4.2, pp.12–13). (4) Require a functional pure definition with immutable arguments (Listing 1.3, p.13). (5) Insert the returned function and test it (§4.2, p.12).

Verus form. Inference: use the same decomposition for Rust functions, but request a Verus executable `fn` with `requires`/`ensures` and separately generated `proof fn` lemmas. I/O examples can become `assert` checks or proof lemmas over concrete inputs; they are tests and do not establish universal postconditions. A Verus `spec fn` may express the abstract transition, while executable code must still satisfy its contract.

## technique 3: ordered static, runtime, and semantic repair

What it is. Errors are classified by earliest detection: “static errors (e.g., incorrect Quint syntax)”, runtime errors such as nonexistent methods, and semantic errors where output disagrees with an I/O specification (§4.3, p.15). The loop gives each category a budget of three, at most nine extra LLM calls (§4.3, p.15). Algorithm 2 checks type correctness, then crashes on supplied inputs, then mismatched outputs; each failure supplies tool output to a repair prompt and replaces the stub (Appendix B.1, pp.27–28).

How to apply it. (1) Type-check the whole filled model; on failure, give compiler diagnostics to the LLM (§4.3, p.16; Algorithm 2). (2) Execute every supplied input; on a crash, give runtime output and repair (§4.3, pp.17, 27–31). (3) Compare each returned value with its expected value; send incorrect pairs to semantic repair (§4.3, pp.16–17). (4) Decrement the category budget and repeat until fixed or exhausted (Algorithm 2, pp.27–28). The runtime example replaces a missing-map-key `get` with `getOrElse(..., { amount: 0 })` (Listings 1.10–1.12, pp.27–30).

Verus form. Inference: compile failures map to verifier diagnostics and trigger contract edits; runtime failures map to Rust tests or executable precondition violations; semantic mismatches map to failed `ensures` or counterexample tests. Verus proofs should be rerun after each change. A repair loop cannot make an incorrect specification correct, and bounded examples cannot prove all inputs.

## technique 4: LLM-generated state comparison and trace fuzzing

The adapter has a mechanical trace runner and an LLM-generated `compare_state` function (§4.2, p.14; Appendix D). The function queries balances and contract state, then asserts equality with model state (Listings 1.16–1.18, pp.32–35). In the end-to-end case study, traces found a CTF-02 panic after two steps and an overflow vulnerability after 14 steps when `cargo test --release` disabled overflow checks (Appendix A, pp.24–26). Across five runs, adapters all worked and required two repair rounds total (Table 5, p.35). Inference: this is a practical differential-testing harness for VL, but every ignored panic and every query not compared is trusted.

## evidence, trust, contradictions, and VL risk
The main benchmark reports unseen-test pass rates over three held-out examples per function and five runs: CTF-04 `mint` 90% (1.2 average repairs), `burn` 100%, and CTF-09 `deposit` 73%, `withdraw` 73%, `increase_reward` 100%, `claim_rewards` 80% (Table 1, p.18). The full benchmark has 23 functions; CTF-02 `unstake` is only 50% despite zero average repairs (Table 3, p.40), showing that repair count is not correctness. The case study generated six authorization functions: four were immediately correct and two needed syntactic repair; the model exposed the authorization bug (§5.2, pp.20–21). The paper explicitly says, “While the proposed method does not guarantee correctness, our evaluation shows that it works well in practice” (§6, p.21).

Inference: threat to an agent-written verified-Rust product is high at the specification boundary. The method can produce useful abstract tests and repair candidates, but it trusts user I/O examples, model structure, generated adapters, sampled traces, and external-library semantics. VL should reuse the separation of mechanical frame, constrained generation, and ordered feedback, while treating Verus proofs and independently reviewed contracts as the acceptance gate. Existing work already provides the model-based testing workflow; VL should not redo a generic Rust-to-model transpiler without handling Rust dependencies and communication.

## techniques for the catalog
- mechanical contract-to-model stubs: compiler-driven extraction emits typed abstract state, transitions, and an adapter while leaving core semantics as stubs
- few-shot pure-function synthesis: an LLM fills each semantic stub from source context, descriptions, examples, and demonstrations
- bounded ordered repair: static, runtime, and semantic checks feed diagnostics back in separate finite repair budgets
- differential trace adapter: generated Rust tests replay model traces and compare queried implementation state after each step
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
