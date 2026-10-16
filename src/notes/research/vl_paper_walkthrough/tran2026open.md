# Open-Source LLM-Driven Formal Verification: A Multi-Agent Pipeline for RTL Repair
(authored by agents unless marked 🧑)
Tag: `tran2026open`, [paper](https://doi.org/10.48550/arxiv.2607.28877)
## purpose and measured boundary

This paper builds a closed loop in which an LLM proposes RTL properties and repairs, while Yosys, SymbiYosys, and Z3 supply formal verdicts and counterexamples. The abstract describes the loop: “the framework generates formal properties, verifies the design, and feeds counterexamples back to the LLM until the design is proved correct by k-induction or an iteration budget is exhausted.” (abstract, PDF page 1). A successful k-induction proof covers all reachable inputs for the encoded properties; bounded model checking alone covers only a finite depth.

The evaluation is intentionally small: six buggy modules, five independent GPT-4o runs each, with ten iterations per run. Only the ALU succeeds reliably, 5/5 runs; counter, arbiter, AXI-lite slave, UART TX, and FIFO are 0/5 valid runs, except FIFO has only three valid API runs because two were excluded for quota limits (Table I, PDF page 3). The authors therefore call this a feasibility study, not a general repair rate.

## technique 1: typed property intermediate representation

Use this when an LLM must express temporal and structural properties but direct SystemVerilog generation is error-prone. The Contract node extracts ports, clock, reset, and polarity into JSON. The Architect turns that contract into typed Property IR objects: Equality, Implication, ResetInvariant, MutualExclusion, TransitionProperty, HandshakeProperty, and HoldProperty (section IV-C/D, PDF pages 2–3). A Property Compiler translates each object into syntactically valid immediate assertions and injects them into the DUT.

Steps from the implementation are: ingest specification and RTL; extract the structural interface; generate typed IR; validate IR objects; compile them into assertions; strip any existing assertion block before reinjection; and run Yosys elaboration. Inline injection is deliberate because the authors found that Yosys 0.61 silently discards modules referenced through `bind`, producing a false PASS (section VI-C, PDF page 5). The paper states, “This separates property reasoning, performed by the LLM, from syntactically correct generation, guaranteed by the compiler.” (section IV-D, PDF page 3).

Verus form (inference): define Rust enums or structs for property kinds, with `spec fn` translators that describe their semantics and executable emitters for a target assertion language. Use `requires`/`ensures` on translation functions to preserve the property meaning, and prove that generated contracts refer to the intended state variables. The compiler and hardware assertion engine remain trusted unless their semantics are modeled in Verus.

Evidence: typed IR prevents malformed syntax, and the ALU run generated five opcode properties plus a zero-flag property; the compiler emitted valid assertions that localized the faulty OR operation (section V-D, PDF page 4). The limitation is specification quality: arbiter properties correctly expressed round-robin fairness but contradicted a combinational module declaration, making them unsatisfiable (section VI-A.2, PDF page 5).

## technique 2: counterexample-guided verify–repair loop

Use this when a concrete formal counterexample can guide a targeted code edit. The six nodes are Contract, Architect, Verifier, CEX Analyzer, Coder, and Reviewer. The Verifier runs prove and cover modes. It returns PASS, FAIL with a VCD waveform, or VACUOUS. On FAIL, the CEX Analyzer identifies the violated assertion and root cause, the Coder edits RTL while preserving the assertion block, and the Reviewer audits semantic alignment before re-verification (section IV-C, PDF pages 2–3).

The ALU sequence is explicit: opcode `2'b11` computes `a & b` instead of `a | b`; the first proof returns a counterexample; the analyzer localizes `or_operation_a`; the Coder changes one character; and k-induction proves the repaired design in the second iteration. The paper says, “The repair changes exactly one character (& to |), demonstrating that the fix is precise and does not disturb the surrounding structure.” (section V-D, PDF page 4).

Verus form (inference): treat a failed verification condition or test trace as a counterexample over Rust inputs and states. Preserve the specification while editing executable code; rerun `cargo verify` and require all `assert`, `requires`, `ensures`, and loop `invariant` obligations to pass. Use proof functions for localized lemmas rather than allowing the repair agent to weaken contracts. A Verus proof is stronger than bounded simulation only when the loop invariants and abstraction of external effects are complete.

Evidence: ALU convergence is 2.0 iterations and 16.5 ± 3.0 seconds over five runs (Table I, PDF page 3). The other modules reach ten iterations without convergence. The paper identifies four failure modes: bounded-cover vacuity, specification ambiguity, temporal-logic bugs, and multi-property pressure (abstract and section VI, PDF pages 1 and 5).

## technique 3: separate prove and cover, and reject vacuity

Use this when an assertion can be proven because its antecedent is unreachable. Bounded Model Checking finds counterexamples up to depth k; absence of a counterexample below k proves nothing deeper. The pipeline therefore runs cover properties and requires every cover to be reachable before declaring PASS (section II-A and V-B, PDF pages 1 and 4). For an 8-bit counter, wraparound at 255 requires at least 256 cycles, so the default bounded depth reports cover vacuity even though k-induction proves the assertions (section VI-A.1, PDF page 5).

Verus form (inference): encode reachability preconditions as executable tests or proof lemmas over an abstract state machine, and add loop invariants showing that required states can occur. A Verus `ensures` proof of safety does not establish liveness or reachability; those need separate specifications and witnesses.

The result is a useful negative signal: high iteration count can mean a vacuity loop rather than an almost-correct repair. The paper explicitly says, “a high iteration count does not indicate that a repair is close to succeeding; rather, it indicates that the pipeline is stuck.” (section V-E, PDF page 4).

## evidence boundary and implications

The pipeline proves only the generated SVA properties over the modeled RTL and reachable state space. Trusted elements include the natural-language specification, Property IR interpretation, Yosys/SBY translation, Z3, k-induction assumptions, clock/reset modeling, and the absence of unmodeled environmental behavior. The paper’s bind experiment shows that tooling can create false positives before solving begins.

Inference: the threat to agent-written verified Rust is high when agents can repair code by weakening specifications or when liveness and reachability are omitted. VL should adopt typed contract generation, preserve contracts across repairs, parse solver counterexamples into structured state, and require explicit vacuity checks. It should not claim that a bounded pass is a proof, nor infer general repair ability from one ALU family.

## techniques for the catalog

- typed property IR: separate LLM property reasoning from compiler-generated assertion syntax
- inline contract injection: place generated assertions in the DUT when binding can be dropped by the frontend
- counterexample-guided repair: analyze formal traces, make a localized code edit, review it, and re-prove
- prove-plus-cover acceptance: require k-inductive safety and reachable cover properties before PASS
- multi-run feasibility evaluation: run each benchmark independently several times and report pass denominators and API exclusions
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
